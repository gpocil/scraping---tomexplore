import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import axios from 'axios';
import * as InstagramController from './util/InstagramController';
import * as GoogleController from './util/GoogleController';
import * as UnsplashController from './util/UnsplashController';
import * as WikimediaController from './util/WikimediaController';
import * as WikipediaController from './util/WikipediaController';
import * as ProxyController from './ProxyController';
import Country from '../../models/Country';
import City from '../../models/City';
import Place from '../../models/Place';
import Image from '../../models/Image';
import sequelize from '../../sequelize';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

let cityCache: Record<string, any> = {};
let countryCache: Record<string, any> = {};

// ── Image download helpers (string folder) ──────────────────────────

async function fetchWithRetry(url: string, retries = 3, delay = 2000): Promise<Buffer | null> {
    const isWikimedia = url.includes('wikimedia.org') || url.includes('wikipedia.org');
    if (isWikimedia) delay = Math.max(delay, 2000);

    for (let i = 0; i < retries; i++) {
        const proxy = ProxyController.getNextProxy();
        const startTime = Date.now();
        try {
            const headers: Record<string, string> = {
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            };
            if (isWikimedia) {
                headers['User-Agent'] = 'TomexploreBot/1.0 (tourism image aggregator; https://tomexplore.com)';
            } else {
                headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            }
            const axiosConfig: any = {
                responseType: 'arraybuffer',
                headers,
                httpsAgent: ProxyController.getCachedAgent(proxy.address || undefined),
            };
            const response = await axios.get(url, axiosConfig);
            const latency = Date.now() - startTime;
            if (proxy.address) ProxyController.reportSuccess(proxy.address, latency);
            return Buffer.from(response.data);
        } catch (error: any) {
            if (proxy.address) ProxyController.reportFailure(proxy.address);
            if ((error.response?.status === 429 || error.response?.status === 403) && i < retries - 1) {
                console.warn(`[RETRY ${i + 1}/${retries - 1}] ${error.response?.status} for ${url.substring(0, 80)}..., waiting ${delay}ms`);
                await sleep(delay);
                delay *= 2;
            } else if (i === retries - 1) {
                console.error(`[FAILED] Could not download after ${retries} attempts: ${url.substring(0, 80)}...`);
                return null;
            }
        }
    }
    return null;
}

async function downloadPhotos(
    folder: string,
    imageUrls: { url: string; source: string; author?: string | null; license?: string | null }[],
    concurrency = 5,
    delayBetweenBatches = 0
): Promise<{ downloadDir: string; imageCount: number; imageNames: { filename: string; source: string; author: string | null; license: string | null }[] }> {
    const downloadDir = path.join(__dirname, '../../../dist', 'temp', folder);
    fs.mkdirSync(downloadDir, { recursive: true });

    const results: { filename: string; source: string; author: string | null; license: string | null }[] = [];
    let downloaded = 0;
    let failed = 0;
    let counter = 0;

    for (let i = 0; i < imageUrls.length; i += concurrency) {
        const batch = imageUrls.slice(i, i + concurrency);
        const batchResults = await Promise.all(batch.map(async (item) => {
            const imageBuffer = await fetchWithRetry(item.url);
            if (imageBuffer) {
                const filename = `${folder}_${Date.now()}_${counter++}_${Math.floor(Math.random() * 100000)}.jpg`;
                const outputPath = path.join(downloadDir, filename);
                await sharp(imageBuffer).toFile(outputPath);
                downloaded++;
                console.log(`[${downloaded + failed}/${imageUrls.length}] Downloaded from ${item.source}`);
                return { filename, source: item.source, author: item.author || null, license: item.license || null };
            } else {
                failed++;
                console.log(`[${downloaded + failed}/${imageUrls.length}] Failed from ${item.source}`);
                return null;
            }
        }));
        results.push(...batchResults.filter((r): r is NonNullable<typeof r> => r !== null));

        if (delayBetweenBatches > 0 && i + concurrency < imageUrls.length) {
            await sleep(delayBetweenBatches);
        }
    }

    console.log(`Download complete: ${results.length}/${imageUrls.length} successful → ${downloadDir}`);
    return { downloadDir, imageCount: results.length, imageNames: results };
}

// ── Country / City helpers ──────────────────────────────────────────

async function findOrCreateCountry(countryName: string, transaction: any) {
    const key = countryName.trim();
    if (countryCache[key]) return countryCache[key];
    let country = await Country.findOne({ where: { name: key }, transaction, lock: transaction.LOCK.UPDATE });
    if (!country) country = await Country.create({ name: key }, { transaction });
    countryCache[key] = country;
    return country;
}

async function findOrCreateCity(cityName: string, countryId: number, transaction: any) {
    const key = `${cityName.trim()}_${countryId}`;
    if (cityCache[key]) return cityCache[key];
    let city = await City.findOne({ where: { name: cityName.trim(), country_id: countryId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!city) city = await City.create({ name: cityName.trim(), country_id: countryId }, { transaction });
    cityCache[key] = city;
    return city;
}

// ── Route handlers ──────────────────────────────────────────────────

interface ImageResult { urls: string[]; count: number; error?: string; source?: string }

export async function getPhotosBusiness(req?: Request, res?: Response): Promise<any> {
    const places = req ? req.body : [];

    if (!Array.isArray(places) || places.length === 0) {
        const error = 'Expected an array of places';
        if (res) res.status(400).json({ error });
        return { error };
    }

    const results = await sequelize.transaction(async (transaction) => {
        return Promise.all(places.map(async (placeData) => {
            const {
                uuid,
                name_en, name_fr,
                link_maps: google_maps_link,
                instagram_username,
                address,
                city: cityName,
                country: countryName
            } = placeData;

            const placeName = name_en || name_fr;
            if (!uuid || !countryName || !cityName || !placeName) {
                return { error: 'Missing required fields (uuid, name, city, country)', placeData };
            }

            let instagramImages: ImageResult = { urls: [], count: 0 };
            let googleImages: ImageResult = { urls: [], count: 0 };
            let errors: string[] = [];
            let location_full_address = google_maps_link || `${placeName} ${address ? address + ' ' : ''}${cityName} ${countryName}`;

            try {
                const country = await findOrCreateCountry(countryName, transaction);
                const city = await findOrCreateCity(cityName, country.id, transaction);

                const [instagramResult, googleResult] = await Promise.all([
                    (async () => {
                        if (instagram_username && instagram_username !== "") {
                            try {
                                const result = await InstagramController.fetchInstagramImages({ body: { username: instagram_username } } as Request);
                                if (result.error) errors.push(result.error);
                                return result;
                            } catch (error: any) {
                                errors.push(`Instagram: ${error.message}`);
                                return { urls: [], count: 0 };
                            }
                        }
                        return { urls: [], count: 0 };
                    })(),
                    (async () => {
                        try {
                            const result = await GoogleController.fetchGoogleImgsFromBusinessPage({ body: { location_full_address } } as Request);
                            if (result.error) errors.push(result.error);
                            return result;
                        } catch (error: any) {
                            errors.push(`Google: ${error.message}`);
                            return { urls: [], count: 0 };
                        }
                    })()
                ]);

                instagramImages = instagramResult;
                googleImages = googleResult;

                if (instagramImages.urls.length === 0 && googleImages.urls.length === 0) {
                    return { error: 'Failed to fetch images from both Instagram and Google', details: errors, placeData };
                }

                // Download images using UUID as folder
                const allUrls = [
                    ...instagramImages.urls.map(url => ({ url, source: 'Instagram', author: null, license: null })),
                    ...googleImages.urls.map(url => ({ url, source: 'Google', author: null, license: null }))
                ];
                const result = await downloadPhotos(uuid, allUrls, 5, 500);

                // Create Place with auto-increment id, folder = uuid
                const place = await Place.create({
                    uuid,
                    name_eng: name_en || name_fr,
                    name_fr: name_fr || name_en,
                    type: 'Business',
                    city_id: city.id,
                    checked: false,
                    folder: uuid,
                    google_maps_link,
                    instagram_link: instagram_username && instagram_username !== "" ? "https://instagram.com/" + instagram_username : null,
                    wikipedia_link: '',
                    last_modification: new Date()
                }, { transaction });

                await Promise.all(
                    result.imageNames.map((img) =>
                        Image.create({
                            image_name: img.filename,
                            original_url: img.source,
                            place_id: place.id_tomexplore
                        }, { transaction })
                    )
                );

                const imageUrls = result.imageNames.map(img => `/images/${uuid}/${img.filename}`);

                return {
                    downloadDir: result.downloadDir.replace(/\\/g, '/'),
                    imageCount: result.imageCount,
                    imageUrls,
                    errors: errors.length > 0 ? errors : undefined,
                    placeData
                };
            } catch (error: any) {
                console.error(`Error downloading photos: ${error.message}`);
                return { error: `Error downloading photos: ${error.message}`, details: errors, placeData };
            }
        }));
    });

    if (res) res.json(results);
    return results;
}

export async function getPhotosTouristAttraction(req?: Request, res?: Response): Promise<any> {
    const places = req ? req.body : [];

    if (!Array.isArray(places) || places.length === 0) {
        const error = 'Expected an array of places';
        if (res) res.status(400).json({ error });
        return { error };
    }

    const results = await sequelize.transaction(async (transaction) => {
        return Promise.all(places.map(async (placeData) => {
            const {
                uuid,
                famous,
                name_en, name_fr,
                address,
                link_maps: google_maps_link,
                city: cityName,
                instagram_username,
                country: countryName
            } = placeData;

            const placeName = name_en || name_fr;
            if (!uuid || !placeName || !cityName || !countryName || famous === undefined) {
                return { error: 'Missing required fields (uuid, name, city, country, famous)', placeData };
            }

            let errors: string[] = [];
            let location_full_address = google_maps_link || `${placeName} ${address ? address + ' ' : ''}${cityName} ${countryName}`;

            try {
                const country = await findOrCreateCountry(countryName, transaction);
                const city = await findOrCreateCity(cityName, country.id, transaction);

                let originalName = '';
                let wikiMediaResult: { urls: [string, string, string][]; count: number; source: string; error?: string; link?: string } = { urls: [], count: 0, source: 'Wikimedia' };
                let unsplashResult: { urls: [string, string, string][]; count: number; source: string; error?: string; link?: string } = { urls: [], count: 0, source: 'Unsplash', link: '' };
                let wikipediaUrl = '';

                // Wikimedia
                try {
                    originalName = await GoogleController.getOriginalName({ body: { location_full_address } } as Request);
                    const searchName = originalName || placeName;
                    wikiMediaResult = await WikimediaController.wikiMediaSearch({ body: { name: searchName, city: cityName } } as Request);
                    wikiMediaResult.source = 'Wikimedia';
                    wikipediaUrl = await WikipediaController.findWikipediaUrl({ body: { name: searchName, country: countryName, city: cityName } } as Request);
                    if (wikiMediaResult.error) errors.push(wikiMediaResult.error);
                } catch (error: any) {
                    errors.push(`Wikimedia: ${error.message}`);
                }

                // Google, Instagram, Unsplash in parallel
                const [googleRaw, instagramRaw, unsplashRaw] = await Promise.all([
                    (async () => {
                        try {
                            const r = await GoogleController.fetchGoogleImgsFromBusinessPage({ body: { location_full_address } } as Request);
                            if (r.error) errors.push(r.error);
                            return r;
                        } catch (e: any) { errors.push(`Google: ${e.message}`); return { urls: [] as string[], count: 0 }; }
                    })(),
                    (async () => {
                        if (instagram_username && instagram_username !== "") {
                            try {
                                const r = await InstagramController.fetchInstagramImages({ body: { username: instagram_username } } as Request);
                                if (r.error) errors.push(r.error);
                                return r;
                            } catch (e: any) { errors.push(`Instagram: ${e.message}`); return { urls: [] as string[], count: 0 }; }
                        }
                        return { urls: [] as string[], count: 0 };
                    })(),
                    (async () => {
                        if (famous === true) {
                            try {
                                const r = await UnsplashController.unsplashSearch({ body: { name: placeName } } as Request);
                                if (r.error) errors.push(r.error);
                                return r;
                            } catch (e: any) { errors.push(`Unsplash: ${e.message}`); return { urls: [] as [string, string, string][], count: 0, link: '' }; }
                        }
                        return { urls: [] as [string, string, string][], count: 0, link: '' };
                    })()
                ]);

                const googleImages: ImageResult = { ...googleRaw, source: 'Google' };
                const instagramImages: ImageResult = { ...instagramRaw, source: 'Instagram' };
                unsplashResult = { ...unsplashRaw, source: 'Unsplash' };

                // Fallback
                if (wikiMediaResult.urls.length + unsplashResult.urls.length + instagramImages.urls.length < 10 && originalName) {
                    const extra = await WikimediaController.wikiMediaSearch({ body: { name: placeName, city: cityName } } as Request);
                    wikiMediaResult.urls = wikiMediaResult.urls.concat(extra.urls);
                    if (famous) {
                        const extraU = await UnsplashController.unsplashSearch({ body: { name: originalName, city: cityName } } as Request);
                        unsplashResult.urls = unsplashResult.urls.concat(extraU.urls);
                    }
                }

                if (wikiMediaResult.urls.length === 0 && unsplashResult.urls.length === 0 && instagramImages.urls.length === 0 && googleImages.urls.length === 0) {
                    return { error: 'Failed to fetch images from all sources', details: errors, placeData };
                }

                // Build unified image list
                const allUrls = [
                    ...wikiMediaResult.urls.map(([url, author, license]) => ({ url, source: 'Wikimedia', author: author || null, license: license || null })),
                    ...unsplashResult.urls.map(([url]) => ({ url, source: 'Unsplash', author: null, license: null })),
                    ...instagramImages.urls.map(url => ({ url, source: 'Instagram', author: null, license: null })),
                    ...googleImages.urls.map(url => ({ url, source: 'Google', author: null, license: null }))
                ];

                const result = await downloadPhotos(uuid, allUrls, 10, 200);

                const place = await Place.create({
                    uuid,
                    name_eng: name_en || name_fr,
                    name_fr: name_fr || name_en,
                    name_original: originalName !== '' ? originalName : null,
                    type: 'Tourist Attraction',
                    city_id: city.id,
                    checked: false,
                    folder: uuid,
                    google_maps_link,
                    unsplash_link: unsplashResult.link,
                    instagram_link: instagram_username && instagram_username !== "" ? "https://instagram.com/" + instagram_username : null,
                    wikipedia_link: wikipediaUrl,
                    last_modification: new Date()
                }, { transaction });

                await Promise.all(
                    result.imageNames.map((img) =>
                        Image.create({
                            image_name: img.filename,
                            original_url: img.source,
                            author: img.author || null,
                            license: img.license || null,
                            place_id: place.id_tomexplore
                        }, { transaction })
                    )
                );

                const images = result.imageNames.map((img) => {
                    const image: any = { url: `/images/${uuid}/${img.filename}` };
                    if (img.author) image.author = img.author;
                    if (img.license) image.license = img.license;
                    return image;
                });

                return {
                    downloadDir: result.downloadDir.replace(/\\/g, '/'),
                    imageCount: result.imageCount,
                    images,
                    errors: errors.length > 0 ? errors : undefined,
                    placeData
                };
            } catch (error: any) {
                console.error(`Error downloading photos: ${error.message}`);
                return { error: `Error downloading photos: ${error.message}`, details: errors, placeData };
            }
        }));
    });

    if (res) res.json(results);
    return results;
}
