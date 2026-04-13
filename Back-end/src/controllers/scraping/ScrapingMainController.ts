import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import * as InstagramController from './util/InstagramController';
import * as GoogleController from './util/GoogleController';
import * as FileController from './FileController';
import Country from '../../models/Country';
import City from '../../models/City';
import Place from '../../models/Place';
import Image from '../../models/Image';
import * as UnsplashController from './util/UnsplashController';
import * as WikimediaController from './util/WikimediaController';
import * as WikipediaController from './util/WikipediaController';
import sequelize from '../../sequelize';

interface ImageResultBusiness {
    urls: string[];
    count: number;
    error?: string;
    source?:string;
}

let cityCache: Record<string, any> = {};
let countryCache: Record<string, any> = {};

/**
 * Delete an existing place: removes associated images from DB, 
 * deletes the files folder, then deletes the place record.
 */
async function deleteExistingPlace(id_tomexplore: number, transaction: any): Promise<void> {
    const existingPlace = await Place.findOne({ where: { id_tomexplore }, transaction });
    if (existingPlace) {
        console.log(`Place ${id_tomexplore} already exists, deleting it and its data before re-scraping...`);
        // Delete associated images from DB
        await Image.destroy({ where: { place_id: id_tomexplore }, transaction });
        // Delete files folder
        const folderPath = path.join(__dirname, '../../../dist', 'temp', id_tomexplore.toString());
        if (fs.existsSync(folderPath)) {
            FileController.deleteFolderRecursiveHelper(folderPath);
            console.log(`Deleted folder: ${folderPath}`);
        }
        // Delete the place record
        await existingPlace.destroy({ transaction });
        console.log(`Deleted place ${id_tomexplore} from DB`);
    }
}

export async function getPhotosBusiness(req?: Request, res?: Response): Promise<any> {
    const places = req ? req.body : [];

    if (!Array.isArray(places) || places.length === 0) {
        const error = 'Expected an array of places';
        console.log(error);
        if (res) {
            res.status(400).json({ error });
        }
        return { error };
    }

    const results = await sequelize.transaction(async (transaction) => {
        const tasks = places.map(async (placeData) => {
            const {
                id_tomexplore,
                name_en,
                name_fr,
                link_maps: google_maps_link,
                instagram_username,
                address,
                city: cityName,
                country: countryName
            } = placeData;

            // Use name_fr as fallback if name_en is empty
            const placeName = name_en || name_fr;
            
            if (!id_tomexplore || !countryName || !cityName || !placeName) {
                return { error: 'Missing required fields (need either name_en or name_fr)', placeData };
            }

            let instagramImages: ImageResultBusiness = { urls: [], count: 0 };
            let googleImages: ImageResultBusiness = { urls: [], count: 0 };
            let errors: string[] = [];
            let location_full_address = google_maps_link || `${placeName} ${address ? address + ' ' : ''}${cityName} ${countryName}`;
            console.log("location full address : " + location_full_address);

            try {
                // Delete existing place and all associated data before re-scraping
                await deleteExistingPlace(id_tomexplore, transaction);

                let country, city;

                // Check for country in cache or database
                if (countryCache[countryName.trim()]) {
                    country = countryCache[countryName.trim()];
                } else {
                    country = await Country.findOne({ where: { name: countryName.trim() }, transaction, lock: transaction.LOCK.UPDATE });
                    if (!country) {
                        country = await Country.create({ name: countryName.trim() }, { transaction });
                    }
                    countryCache[countryName.trim()] = country;
                }

                // Check for city in cache or database
                const cityKey = `${cityName.trim()}_${country.id}`;
                if (cityCache[cityKey]) {
                    city = cityCache[cityKey];
                } else {
                    city = await City.findOne({ where: { name: cityName.trim(), country_id: country.id }, transaction, lock: transaction.LOCK.UPDATE });
                    if (!city) {
                        city = await City.create({ name: cityName.trim(), country_id: country.id }, { transaction });
                    }
                    cityCache[cityKey] = city;
                }

                // Fetch Instagram and Google Images in parallel
                const [instagramResult, googleResult] = await Promise.all([
                    // Instagram fetch (only if username provided)
                    (async () => {
                        if (instagram_username && instagram_username !== "") {
                            try {
                                const result = await InstagramController.fetchInstagramImages({ body: { username: instagram_username } } as Request);
                                if (result.error) errors.push(result.error);
                                return result;
                            } catch (error: any) {
                                console.error(`Error fetching Instagram images: ${error.message}`);
                                errors.push(`Error fetching Instagram images: ${error.message}`);
                                return { urls: [], count: 0, error: `Error fetching Instagram images: ${error.message}` };
                            }
                        }
                        return { urls: [], count: 0 };
                    })(),
                    // Google fetch
                    (async () => {
                        try {
                            const result = await GoogleController.fetchGoogleImgsFromBusinessPage({ body: { location_full_address } } as Request);
                            if (result.error) errors.push(result.error);
                            return result;
                        } catch (error: any) {
                            console.error(`Error fetching Google images: ${error.message}`);
                            errors.push(`Error fetching Google images: ${error.message}`);
                            return { urls: [], count: 0, error: `Error fetching Google images: ${error.message}` };
                        }
                    })()
                ]);

                instagramImages = instagramResult;
                googleImages = googleResult;

                if (instagramImages.urls.length === 0 && googleImages.urls.length === 0) {
                    return { error: 'Failed to fetch images from both Instagram and Google', details: errors, placeData };
                }

                const result = await FileController.downloadPhotosBusiness(id_tomexplore, instagramImages, googleImages);

                // Create the Place (any existing one was already deleted before scraping)
                const place = await Place.create({
                    id_tomexplore,
                    name_eng: name_en || name_fr,
                    name_fr: name_fr || name_en,
                    type: 'Business',
                    city_id: city.id,
                    checked: false,
                    folder: id_tomexplore,
                    google_maps_link,
                    instagram_link: instagram_username && instagram_username !== "" ? "https://instagram.com/" + instagram_username : null,
                    wikipedia_link: '',
                    last_modification: new Date()
                }, { transaction });

                // Save images in the database with the generated names
                await Promise.all(
                    result.imageNames.map((generatedName, index) => {
                        const source = index < instagramImages.urls.length ? 'Instagram' : 'Google';
                        return Image.create({
                            image_name: generatedName,
                            original_url: source,
                            place_id: place.id_tomexplore
                        }, { transaction });
                    })
                );

                // Build accessible image URLs
                const imageUrls = result.imageNames.map(imageName => `/images/${id_tomexplore}/${imageName}`);

                return {
                    downloadDir: result.downloadDir.replace(/\\/g, '/'),
                    imageCount: result.imageCount,
                    imageUrls,
                    instagramError: instagramImages.error,
                    googleError: googleImages.error,
                    errors: errors.length > 0 ? errors : undefined,
                    placeData
                };
            } catch (error: any) {
                console.error(`Error downloading photos: ${error.message}`);
                return { error: `Error downloading photos: ${error.message}`, details: errors, placeData };
            }
        });

        return Promise.all(tasks);
    });

    if (res) {
        res.json(results);
    }
    return results;
}


interface ImageResultTourist {
    urls: [string, string, string][];
    count: number;
    error?: string;
    link?: string;
    source?:string;
}

export async function getPhotosTouristAttraction(req?: Request, res?: Response): Promise<any> {
    const places = req ? req.body : [];

    if (!Array.isArray(places) || places.length === 0) {
        const error = 'Expected an array of places';
        console.log(error);
        if (res) {
            res.status(400).json({ error });
        }
        return { error };
    }

    const results = await sequelize.transaction(async (transaction) => {
        const tasks = places.map(async (placeData) => {
            const {
                id_tomexplore,
                famous,
                name_en,
                name_fr,
                address,
                link_maps: google_maps_link,
                city: cityName,
                instagram_username,
                country: countryName
            } = placeData;

            // Use name_fr as fallback if name_en is empty
            const placeName = name_en || name_fr;
            
            if (!id_tomexplore || !placeName || !cityName || !countryName || famous === undefined) {
                return { error: 'Missing required fields (need either name_en or name_fr)', placeData };
            }
            let googleImages: ImageResultBusiness = { urls: [], count: 0 };
            let wikiMediaResult: ImageResultTourist = { urls: [], count: 0, link: '' };
            let unsplashResult: ImageResultTourist = { urls: [], count: 0, link: '' };
            let instagramImages: ImageResultBusiness = { urls: [], count: 0 };
            let wikipediaUrl: string = '';
            let originalName: string = '';
            let errors: string[] = [];
            let location_full_address = google_maps_link || `${placeName} ${address ? address + ' ' : ''}${cityName} ${countryName}`;

            try {
                // Delete existing place and all associated data before re-scraping
                await deleteExistingPlace(id_tomexplore, transaction);

                let country, city;

                // Check for country in cache or database
                if (countryCache[countryName.trim()]) {
                    country = countryCache[countryName.trim()];
                } else {
                    country = await Country.findOne({ where: { name: countryName.trim() }, transaction, lock: transaction.LOCK.UPDATE });
                    if (!country) {
                        country = await Country.create({ name: countryName.trim() }, { transaction });
                    }
                    countryCache[countryName.trim()] = country;
                }

                // Check for city in cache or database
                const cityKey = `${cityName.trim()}_${country.id}`;
                if (cityCache[cityKey]) {
                    city = cityCache[cityKey];
                } else {
                    city = await City.findOne({ where: { name: cityName.trim(), country_id: country.id }, transaction, lock: transaction.LOCK.UPDATE });
                    if (!city) {
                        city = await City.create({ name: cityName.trim(), country_id: country.id }, { transaction });
                    }
                    cityCache[cityKey] = city;
                }

                if (famous !== true && famous !== false) {
                    return { error: 'Field "famous" must be "true" or "false"', placeData };
                }

                // Fetch Wikimedia Images
                try {
                    originalName = await GoogleController.getOriginalName({ body: { location_full_address } } as Request);
                    const searchName = originalName || placeName;
                    wikiMediaResult = await WikimediaController.wikiMediaSearch({ body: { name: searchName, city: cityName } } as Request);
                    wikiMediaResult.source = 'Wikimedia';
                    wikipediaUrl = await WikipediaController.findWikipediaUrl({ body: { name: searchName, country: countryName, city: cityName } } as Request);
                    if (wikiMediaResult.error) errors.push(wikiMediaResult.error);
                } catch (error: any) {
                    console.error(`Error fetching Wikimedia images: ${error.message}`);
                    errors.push(`Error fetching Wikimedia images: ${error.message}`);
                    wikiMediaResult.error = `Error fetching Wikimedia images: ${error.message}`;
                }

                // Fetch Google, Instagram, Unsplash in parallel
                const [googleRaw, instagramRaw, unsplashRaw] = await Promise.all([
                    // Google
                    (async () => {
                        try {
                            const result = await GoogleController.fetchGoogleImgsFromBusinessPage({ body: { location_full_address } } as Request);
                            if (result.error) errors.push(result.error);
                            return result;
                        } catch (error: any) {
                            console.error(`Error fetching Google images: ${error.message}`);
                            errors.push(`Error fetching Google images: ${error.message}`);
                            return { urls: [] as string[], count: 0, error: `Error fetching Google images: ${error.message}` };
                        }
                    })(),
                    // Instagram
                    (async () => {
                        if (instagram_username && instagram_username !== "") {
                            try {
                                const result = await InstagramController.fetchInstagramImages({ body: { username: instagram_username } } as Request);
                                if (result.error) errors.push(result.error);
                                return result;
                            } catch (error: any) {
                                console.error(`Error fetching Instagram images: ${error.message}`);
                                errors.push(`Error fetching Instagram images: ${error.message}`);
                                return { urls: [] as string[], count: 0, error: `Error fetching Instagram images: ${error.message}` };
                            }
                        }
                        return { urls: [] as string[], count: 0 };
                    })(),
                    // Unsplash
                    (async () => {
                        if (famous === true) {
                            try {
                                const result = await UnsplashController.unsplashSearch({ body: { name: placeName } } as Request);
                                if (result.error) errors.push(result.error);
                                return result;
                            } catch (error: any) {
                                console.error(`Error fetching Unsplash images: ${error.message}`);
                                errors.push(`Error fetching Unsplash images: ${error.message}`);
                                return { urls: [] as [string, string, string][], count: 0, error: `Error fetching Unsplash images: ${error.message}`, link: '' };
                            }
                        }
                        return { urls: [] as [string, string, string][], count: 0, link: '' };
                    })()
                ]);

                googleImages = { ...googleRaw, source: 'Google' };
                instagramImages = { ...instagramRaw, source: 'Instagram' };
                unsplashResult = { ...unsplashRaw, source: 'Unsplash' };

                // Fallback: additional searches if not enough images
                if (wikiMediaResult.urls.length + unsplashResult.urls.length + instagramImages.urls.length < 10 && originalName) {
                    const additionalWikiResults = await WikimediaController.wikiMediaSearch({ body: { name: placeName, city: cityName } } as Request);
                    wikiMediaResult.urls = wikiMediaResult.urls.concat(additionalWikiResults.urls);
                    if (famous) {
                        const additionalUnsplashResults = await UnsplashController.unsplashSearch({ body: { name: originalName, city: cityName } } as Request);
                        unsplashResult.urls = unsplashResult.urls.concat(additionalUnsplashResults.urls);
                    }
                }

                // Check if all sources failed
                if (wikiMediaResult.urls.length === 0 && unsplashResult.urls.length === 0 && instagramImages.urls.length === 0 && googleImages.urls.length === 0) {
                    return { error: 'Failed to fetch images from all sources (Wikimedia, Unsplash, Instagram, Google)', details: errors, placeData };
                }

                const result = await FileController.downloadPhotosTouristAttraction(
                    id_tomexplore, 
                    { ...wikiMediaResult, source: wikiMediaResult.source ?? 'Unknown' },
                    { ...unsplashResult, source: unsplashResult.source ?? 'Unknown' },
                    { ...instagramImages, source: instagramImages.source ?? 'Instagram' },
                    { ...googleImages, source: googleImages.source ?? 'Google' }
                );
                
                // Create the Place (any existing one was already deleted before scraping)
                const place = await Place.create({
                    id_tomexplore,
                    name_eng: name_en || name_fr,
                    name_fr: name_fr || name_en,
                    name_original: originalName !== '' ? originalName : null,
                    type: 'Tourist Attraction',
                    city_id: city.id,
                    checked: false,
                    folder: id_tomexplore,
                    google_maps_link,
                    unsplash_link: unsplashResult.link,
                    instagram_link: instagram_username && instagram_username !== "" ? "https://instagram.com/" + instagram_username : null,
                    wikipedia_link: wikipediaUrl,
                    last_modification: new Date()
                }, { transaction });
                // Save images in the database — author/license now comes from download metadata
                await Promise.all(
                    result.imageNames.map((img) => {
                        return Image.create({
                            image_name: img.filename,
                            original_url: img.source,
                            author: img.author || null,
                            license: img.license || null,
                            place_id: place.id_tomexplore
                        }, { transaction });
                    })
                );

                // Build accessible image URLs with author/license when available
                const images = result.imageNames.map((img) => {
                    const image: any = { url: `/images/${id_tomexplore}/${img.filename}` };
                    if (img.author) image.author = img.author;
                    if (img.license) image.license = img.license;
                    return image;
                });

                return {
                    downloadDir: result.downloadDir.replace(/\\/g, '/'),
                    imageCount: result.imageCount,
                    images,
                    wikiMediaError: wikiMediaResult.error,
                    unsplashError: unsplashResult.error,
                    errors: errors.length > 0 ? errors : undefined,
                    placeData
                };
            } catch (error: any) {
                console.error(`Error downloading photos: ${error.message}`);
                return { error: `Error downloading photos: ${error.message}`, details: errors, placeData };
            }
        });

        return Promise.all(tasks);
    });

    if (res) {
        res.json(results);
    }
    return results;
}



export async function scrapeInstagramAfterUpdate(req: Request, res: Response) {
    const placeData = req.body;
    const { id_tomexplore, instagram_username } = placeData;

    if (!id_tomexplore || !instagram_username) {
        console.log('Missing required fields:', placeData);
        return { error: 'Missing required fields', placeData };
    }

    let instagramImages: any = { urls: [], count: 0 };
    let errors: string[] = [];

    try {
        if (instagram_username && instagram_username !== "") {
            try {
                console.log(`Fetching Instagram images for username: ${instagram_username}`);
                instagramImages = await InstagramController.fetchInstagramImages({ body: { username: instagram_username } } as Request);
                if (instagramImages.error) errors.push(instagramImages.error);
            } catch (error: any) {
                console.error(`Error fetching Instagram images: ${error.message}`);
                errors.push(`Error fetching Instagram images: ${error.message}`);
                instagramImages.error = `Error fetching Instagram images: ${error.message}`;
            }
        }

        if (instagramImages.urls.length === 0) {
            console.log('No Instagram images found:', errors);
            return { error: 'Failed to fetch images from Instagram', details: errors, placeData };
        }

        console.log(`Downloading Instagram photos for place ID: ${id_tomexplore}`);
        const result = await FileController.downloadPhotosBusiness(id_tomexplore, instagramImages, { urls: [], count: 0 });

        let place = await Place.findOne({ where: { id_tomexplore } });
        if (place) {
            await place.update({
                instagram_link: "https://instagram.com/" + instagram_username,
                last_modification: new Date()
            });
            console.log(`Updated place with new Instagram link: ${place.id_tomexplore}`);
        }

        await Promise.all(
            result.imageNames.map((generatedName) => {
                console.log(`Saving image: ${generatedName}`);
                return Image.create({
                    image_name: generatedName,
                    original_url: 'Instagram',
                    place_id: place!.id_tomexplore,
                });
            })
        );

        console.log(`Downloaded and saved ${result.imageCount} images for place ID: ${id_tomexplore}`);

        return {
            downloadDir: result.downloadDir.replace(/\\/g, '/'),
            imageCount: result.imageCount,
            instagramError: instagramImages.error,
            errors: errors.length > 0 ? errors : undefined,
            placeData
        };
    } catch (error: any) {
        console.error(`Error downloading photos: ${error.message}`);
        return { error: `Error downloading photos: ${error.message}`, details: errors, placeData };
    }
}

export async function scrapeGoogleMapsAfterUpdate(req: Request, res: Response) {
    const placeData = req.body;
    const { id_tomexplore, name_en, address, cityName, countryName, link_maps } = placeData;

    if (!id_tomexplore) {
        console.log('Missing required fields:', placeData);
        return { error: 'Missing required fields', placeData };
    }

    let googleMapsImages: any = { urls: [], count: 0 };
    let errors: string[] = [];
    let location_full_address = link_maps || `${name_en} ${address ? address + ' ' : ''}${cityName} ${countryName}`;

    try {
        try {
            googleMapsImages = await GoogleController.fetchGoogleImgsFromBusinessPage({ body: { location_full_address } } as Request);
            if (googleMapsImages.error) errors.push(googleMapsImages.error);
        } catch (error: any) {
            console.error(`Error fetching Google Maps images: ${error.message}`);
            errors.push(`Error fetching Google Maps images: ${error.message}`);
            googleMapsImages.error = `Error fetching Google Maps images: ${error.message}`;
        }


        if (googleMapsImages.urls.length === 0) {
            console.log('No Google Maps images found:', errors);
            return { error: 'Failed to fetch images from Google Maps', details: errors, placeData };
        }

        console.log(`Downloading Google Maps photos for place ID: ${id_tomexplore}`);
        const result = await FileController.downloadPhotosBusiness(id_tomexplore, googleMapsImages, { urls: [], count: 0 });

        let place = await Place.findOne({ where: { id_tomexplore } });
        if (place) {
            await place.update({
                google_maps_link: link_maps || location_full_address,
                last_modification: new Date()
            });
            console.log(`Updated place with new Google Maps link: ${place.id_tomexplore}`);
        }

        await Promise.all(
            result.imageNames.map((generatedName) => {
                console.log(`Saving image: ${generatedName}`);
                return Image.create({
                    image_name: generatedName,
                    original_url: 'Google',
                    place_id: place!.id_tomexplore
                });
            })
        );

        console.log(`Downloaded and saved ${result.imageCount} images for place ID: ${id_tomexplore}`);

        return {
            downloadDir: result.downloadDir.replace(/\\/g, '/'),
            imageCount: result.imageCount,
            googleMapsError: googleMapsImages.error,
            errors: errors.length > 0 ? errors : undefined,
            placeData
        };
    } catch (error: any) {
        console.error(`Error downloading photos: ${error.message}`);
        return { error: `Error downloading photos: ${error.message}`, details: errors, placeData };
    }
}



export async function scrapeWikimediaAfterUpdate(req: Request, res: Response) {
    const placeData = req.body;
    const { id_tomexplore, query } = placeData;

    if (!id_tomexplore || !query) {
        console.log('Missing required fields:', placeData);
        return { error: 'Missing required fields', placeData };
    }

    let wikiImages: any = { urls: [], count: 0 };
    let errors: string[] = [];

    try {
        if (query && query !== "") {
            try {
                console.log(`Fetching Wikimedia images for username: ${query}`);
                wikiImages = await WikimediaController.wikiMediaSearch({ body: { name: query } } as Request);
                if (wikiImages.error) errors.push(wikiImages.error);
            } catch (error: any) {
                console.error(`Error fetching wikimedia images: ${error.message}`);
                errors.push(`Error fetching wikimedia images: ${error.message}`);
                wikiImages.error = `Error fetching wikimedia images: ${error.message}`;
            }
        }

        if (wikiImages.urls.length === 0) {
            console.log('No wikimedia images found:', errors);
            return { error: 'Failed to fetch images from wikimedia', details: errors, placeData };
        }

        console.log(`Downloading wikimedia photos for place ID: ${id_tomexplore}`);
        const result = await FileController.downloadPhotosTouristAttraction(
            id_tomexplore, 
            wikiImages, 
            { urls: [], count: 0, source: 'Wikimedia' } 
        );
        
        let place = await Place.findOne({ where: { id_tomexplore } });
        if (place) {
            await place.update({
                last_modification: new Date()
            });
        }

        const saveImage = async (source: string, author: string | null, license: string | null, generatedName: string) => {
            return Image.create({
                image_name: generatedName,
                original_url: source,
                author: author || null,
                license: license || null,
                place_id: place!.id_tomexplore
            });
        };

        await Promise.all(
            result.imageNames.map((generatedName, index) => {
                let author: string | null = null;
                let license: string | null = null;

                if (index < wikiImages.urls.length) {
                    author = wikiImages.urls[index]?.[1] || null;
                    license = wikiImages.urls[index]?.[2] || null;
                }

                console.log('Saving image:', {
                    generatedName,
                    author,
                    license
                });

                return saveImage(
                    'Wikimedia',
                    author,
                    license,
                    generatedName.filename
                );
            })
        );



        console.log(`Downloaded and saved ${result.imageCount} images for place ID: ${id_tomexplore}`);

        return {
            downloadDir: result.downloadDir.replace(/\\/g, '/'),
            imageCount: result.imageCount,
            wikiMediaError: wikiImages.error,
            errors: errors.length > 0 ? errors : undefined,
            placeData
        };
    } catch (error: any) {
        console.error(`Error downloading photos: ${error.message}`);
        return { error: `Error downloading photos: ${error.message}`, details: errors, placeData };
    }
}
