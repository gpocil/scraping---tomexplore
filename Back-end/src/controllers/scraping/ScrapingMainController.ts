import { Request, Response } from 'express';
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
                    let place = await Place.findOne({ where: { id_tomexplore, city_id: city.id }, transaction });
                    if (!place) {
                        place = await Place.create({
                            id_tomexplore,
                            name_eng: name_en,
                            name_fr,
                            type: 'Business',
                            city_id: city.id,
                            checked: false,
                            needs_attention: true,
                            folder: id_tomexplore,
                            google_maps_link,
                            instagram_link: instagram_username && instagram_username !== "" ? "https://instagram.com/" + instagram_username : null,
                            wikipedia_link: '',
                            details: errors.join(', '),
                            last_modification: new Date()
                        }, { transaction });
                    } else {
                        await place.update({
                            needs_attention: true,
                            details: errors.join(', '),
                            last_modification: new Date()
                        }, { transaction });
                    }

                    return { error: 'Failed to fetch images from both Instagram and Google', details: errors, placeData };
                }

                const result = await FileController.downloadPhotosBusiness(id_tomexplore, instagramImages, googleImages);

                // Check if Place exists, otherwise create it
                let place = await Place.findOne({ where: { id_tomexplore, city_id: city.id }, transaction });
                if (!place) {
                    place = await Place.create({
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
                }

                // Save images in the database with the generated names
                const saveImage = async (url: string, source: string, generatedName: string) => {
                    return Image.create({
                        image_name: generatedName,
                        original_url: source,
                        place_id: place.id_tomexplore
                    }, { transaction });
                };

                await Promise.all(
                    result.imageNames.map((generatedName, index) => {
                        const source = index < instagramImages.urls.length ? 'Instagram' : 'Google';
                        const url = index < instagramImages.urls.length ? instagramImages.urls[index] : googleImages.urls[index - instagramImages.urls.length];
                        return saveImage(url, source, generatedName);
                    })
                );

                return {
                    downloadDir: result.downloadDir.replace(/\\/g, '/'),
                    imageCount: result.imageCount,
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

                // Fetch Wikimedia Images
                try {
                    originalName = await GoogleController.getOriginalName({ body: { location_full_address } } as Request);
                    if (originalName !== '') { // Recherche avec nom original si possible
                        wikiMediaResult = await WikimediaController.wikiMediaSearch({ body: { name: originalName, city: cityName } } as Request);
                        wikiMediaResult.source = 'Wikimedia';
                        wikipediaUrl = await WikipediaController.findWikipediaUrl({ body: { name: originalName, country: countryName, city: cityName } } as Request);
                    } else {
                        wikiMediaResult = await WikimediaController.wikiMediaSearch({ body: { name: placeName, city: cityName } } as Request);
                        wikipediaUrl = await WikipediaController.findWikipediaUrl({ body: { name: placeName, country: countryName, city: cityName } } as Request);
                    }

                    if (wikiMediaResult.error) errors.push(wikiMediaResult.error);
                } catch (error: any) {
                    console.error(`Error fetching Wikimedia images: ${error.message}`);
                    errors.push(`Error fetching Wikimedia images: ${error.message}`);
                    wikiMediaResult.error = `Error fetching Wikimedia images: ${error.message}`;
                }
  // Fetch Google Images
  try {
    googleImages = await GoogleController.fetchGoogleImgsFromBusinessPage({ body: { location_full_address } } as Request);
    googleImages.source = 'Google';
    if (googleImages.error) errors.push(googleImages.error);
} catch (error: any) {
    console.error(`Error fetching Google images: ${error.message}`);
    errors.push(`Error fetching Google images: ${error.message}`);
    googleImages.error = `Error fetching Google images: ${error.message}`;
}
                // Fetch Instagram Images if username is provided
                if (instagram_username && instagram_username !== "") {
                    try {
                        instagramImages = await InstagramController.fetchInstagramImages({ body: { username: instagram_username } } as Request);
    instagramImages.source = 'Instagram';

                        if (instagramImages.error) errors.push(instagramImages.error);
                    } catch (error: any) {
                        console.error(`Error fetching Instagram images: ${error.message}`);
                        errors.push(`Error fetching Instagram images: ${error.message}`);
                        instagramImages.error = `Error fetching Instagram images: ${error.message}`;
                    }
                }

                // Fetch Unsplash Images if famous is true
                if (famous === true) {
                    try {
                        unsplashResult = await UnsplashController.unsplashSearch({ body: { name: placeName } } as Request);
                        unsplashResult.source = 'Unsplash';

                        if (unsplashResult.error) errors.push(unsplashResult.error);
                    } catch (error: any) {
                        console.error(`Error fetching Unsplash images: ${error.message}`);
                        errors.push(`Error fetching Unsplash images: ${error.message}`);
                        unsplashResult.error = `Error fetching Unsplash images: ${error.message}`;
                    }
                } else if (famous !== false) {
                    return { error: 'Field "famous" must be "true" or "false"', placeData };
                }

                // Recherche en anglais SN
                if (wikiMediaResult.urls.length + unsplashResult.urls.length + instagramImages.urls.length < 10 && originalName) {
                    const additionalWikiResults = await WikimediaController.wikiMediaSearch({ body: { name: placeName, city: cityName } } as Request);
                    wikiMediaResult.urls = wikiMediaResult.urls.concat(additionalWikiResults.urls);
                    if (famous) {
                        const additionalUnsplashResults = await UnsplashController.unsplashSearch({ body: { name: originalName, city: cityName } } as Request);
                        unsplashResult.urls = unsplashResult.urls.concat(additionalUnsplashResults.urls);
                    }
                }

                // Check if both calls failed
                if (wikiMediaResult.urls.length === 0 && unsplashResult.urls.length === 0 && instagramImages.urls.length === 0) {
                    let place = await Place.findOne({ where: { id_tomexplore, city_id: city.id }, transaction });
                    if (!place) {
                        place = await Place.create({
                            id_tomexplore,
                            name_eng: name_en || name_fr,
                            name_fr: name_fr || name_en,
                            name_original: originalName !== '' ? originalName : null,
                            type: 'Tourist Attraction',
                            city_id: city.id,
                            checked: false,
                            needs_attention: true,
                            folder: id_tomexplore,
                            google_maps_link,
                            unsplash_link: unsplashResult.link,
                            wikipedia_link: wikipediaUrl,
                            instagram_link: instagram_username && instagram_username !== "" ? "https://instagram.com/" + instagram_username : null,
                            details: errors.toString(),
                            last_modification: new Date()
                        }, { transaction });
                    }
                    return { error: 'Failed to fetch images from both Wikimedia, Unsplash and Instagram', details: errors, placeData };
                }

                const result = await FileController.downloadPhotosTouristAttraction(
                    id_tomexplore, 
                    { ...wikiMediaResult, source: wikiMediaResult.source ?? 'Unknown' },
                    { ...unsplashResult, source: unsplashResult.source ?? 'Unknown' },
                    { ...instagramImages, source: instagramImages.source ?? 'Instagram' },
                    { ...googleImages, source: googleImages.source ?? 'Google' }
                );
                
                // Check if Place exists, otherwise create it
                let place = await Place.findOne({ where: { id_tomexplore, city_id: city.id }, transaction });
                if (!place) {
                    place = await Place.create({
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
                }
                // Save images in the database with the generated names
                const saveImage = async (source: string, author: string | null, license: string | null, generatedName: string) => {
                    return Image.create({
                        image_name: generatedName,
                        original_url: source,
                        author: author || null,
                        license: license || null,
                        place_id: place.id_tomexplore
                    }, { transaction });
                };

                await Promise.all(
                    result.imageNames.map((generatedName, index) => {
                        let author: string | null = null;
                        let license: string | null = null;
                        if (index < wikiMediaResult.urls.length && wikiMediaResult.source) {
                            author = wikiMediaResult.urls[index][1];
                            license = wikiMediaResult.urls[index][2];
                        } 
                        else if (index < wikiMediaResult.urls.length + unsplashResult.urls.length && unsplashResult.source) {
                            const unsplashIndex = index - wikiMediaResult.urls.length;
                            author = unsplashResult.urls[unsplashIndex][1];
                            license = unsplashResult.urls[unsplashIndex][2];
                        } 
                        return saveImage(generatedName.source, author, license, generatedName.filename);

                    })
                );

                return {
                    downloadDir: result.downloadDir.replace(/\\/g, '/'),
                    imageCount: result.imageCount,
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

        const saveImage = async (url: string, generatedName: string, source: string) => {
            console.log(`Saving image: ${generatedName}`);
            return Image.create({
                image_name: generatedName,
                url,
                original_url: source,
                place_id: place!.id_tomexplore,

            });
        };

        await Promise.all(
            result.imageNames.map((generatedName, index) => {
                const source = 'Instagram';
                const url = instagramImages.urls[index];
                return saveImage(url, generatedName, source);
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

        const saveImage = async (url: string, generatedName: string) => {
            console.log(`Saving image: ${generatedName}`);
            return Image.create({
                image_name: generatedName,
                url,
                place_id: place!.id_tomexplore
            });
        };

        await Promise.all(
            result.imageNames.map((generatedName, index) => {
                const url = googleMapsImages.urls[index];
                return saveImage(url, generatedName);
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
