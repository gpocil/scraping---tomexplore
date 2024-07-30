import { Request, Response } from 'express';
import * as InstagramController from './util/InstagramController';
import * as GoogleController from './util/GoogleController';
import * as FileController from './FileController';
import * as UnsplashController from './util/UnsplashController';
import * as WikimediaController from './util/WikimediaController';
import * as WikipediaController from './util/WikipediaController';


import Country from '../../models/Country';
import City from '../../models/City';
import Place from '../../models/Place';
import Image from '../../models/Image';

interface ImageResultBusiness {
    urls: string[];
    count: number;
    error?: string;
}

export async function getPhotosBusiness(req: Request, res: Response): Promise<void> {
    const {
        id_tomexplore,
        name_en,
        name_fr,
        link_maps: google_maps_link,
        instagram_username,
        address: address,
        city: cityName,
        country: countryName
    } = req.body;

    if (!id_tomexplore || !countryName || !cityName || !address || !name_en) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    let instagramImages: ImageResultBusiness = { urls: [], count: 0 };
    let googleImages: ImageResultBusiness = { urls: [], count: 0 };
    let errors: string[] = [];
    let location_full_address = name_en + " " + address + " " + cityName + " " + countryName;
    console.log("location full adress : " + location_full_address)
    try {
        // Check if Country exists, otherwise create it
        let country = await Country.findOne({ where: { name: countryName } });
        if (!country) {
            country = await Country.create({ name: countryName });
        }

        // Check if City exists, otherwise create it
        let city = await City.findOne({ where: { name: cityName, country_id: country.id } });
        if (!city) {
            city = await City.create({ name: cityName, country_id: country.id });
        }



        // Fetch Instagram Images if username is provided
        if (instagram_username) {
            try {
                instagramImages = await InstagramController.fetchInstagramImages({ body: { username: instagram_username } } as Request);
                if (instagramImages.error) errors.push(instagramImages.error);
            } catch (error: any) {
                console.error(`Error fetching Instagram images: ${error.message}`);
                errors.push(`Error fetching Instagram images: ${error.message}`);
                instagramImages.error = `Error fetching Instagram images: ${error.message}`;
            }
        }

        // Fetch Google Images
        try {
            googleImages = await GoogleController.fetchGoogleImgsFromBusinessPage({ body: { location_full_address } } as Request);
            if (googleImages.error) errors.push(googleImages.error);
        } catch (error: any) {
            console.error(`Error fetching Google images: ${error.message}`);
            errors.push(`Error fetching Google images: ${error.message}`);
            googleImages.error = `Error fetching Google images: ${error.message}`;
        }

        if (instagramImages.urls.length === 0 && googleImages.urls.length === 0) {
            res.status(500).json({ error: 'Failed to fetch images from both Instagram and Google', details: errors });
            let place = await Place.findOne({ where: { id_tomexplore, city_id: city.id } });
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
                    instagram_link: "https://instagram.com/" + instagram_username,
                    wikipedia_link: '',
                    details: errors.toString()
                });
            }
            return;
        }

        try {
            const result = await FileController.downloadPhotosBusiness(name_en, id_tomexplore, instagramImages, googleImages);
            res.json({
                downloadDir: result.downloadDir.replace(/\\/g, '/'),
                imageCount: result.imageCount,
                instagramError: instagramImages.error,
                googleError: googleImages.error,
                errors: errors.length > 0 ? errors : undefined
            });
            // Check if Place exists, otherwise create it
            let place = await Place.findOne({ where: { id_tomexplore, city_id: city.id } });
            if (!place) {
                place = await Place.create({
                    id_tomexplore,
                    name_eng: name_en,
                    name_fr,
                    type: 'Business', // Assuming 'type' is a required field, set to 'Business'
                    city_id: city.id,
                    checked: false, // Assuming 'done' is a required field, set to false by default
                    folder: id_tomexplore,
                    google_maps_link,
                    instagram_link: "https://instagram.com/" + instagram_username,
                    wikipedia_link: '',
                });
            }

            // Save images in the database with the generated names
            const saveImage = async (url: string, source: string, generatedName: string) => {
                return Image.create({
                    image_name: generatedName,
                    source,
                    place_id: place.id_tomexplore
                });
            };

            await Promise.all(
                result.imageNames.map((generatedName, index) => {
                    const source = index < instagramImages.urls.length ? 'Instagram' : 'Google';
                    const url = index < instagramImages.urls.length ? instagramImages.urls[index] : googleImages.urls[index - instagramImages.urls.length];
                    return saveImage(url, source, generatedName);
                })
            );
        } catch (error: any) {
            console.error(`Error downloading photos: ${error.message}`);
            res.status(500).json({ error: `Error downloading photos: ${error.message}`, details: errors });
        }
    } catch (error: any) {
        console.error(`Error handling business photos: ${error.message}`);
        res.status(500).json({ error: `Error handling business photos: ${error.message}` });
    }
}





interface ImageResultTourist {
    urls: [string, string, string][];
    count: number;
    error?: string;
    link?: string;
}

export async function getPhotosTouristAttraction(req: Request, res: Response): Promise<void> {
    const {
        id_tomexplore,
        famous,
        name_en,
        name_fr,
        link_maps: google_maps_link,
        address,
        city: cityName,
        country: countryName
    } = req.body;

    if (!id_tomexplore || !name_en || !cityName || !countryName || famous === undefined) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    let wikiMediaResult: ImageResultTourist = { urls: [], count: 0 };
    let wikipediaUrl: string = '';
    let unsplashResult: ImageResultTourist = { urls: [], count: 0, link: '' };
    let errors: string[] = [];

    try {
        // Check if Country exists, otherwise create it
        let country = await Country.findOne({ where: { name: countryName } });
        if (!country) {
            country = await Country.create({ name: countryName });
        }

        // Check if City exists, otherwise create it
        let city = await City.findOne({ where: { name: cityName, country_id: country.id } });
        if (!city) {
            city = await City.create({ name: cityName, country_id: country.id });
        }



        // Fetch Wikimedia Images
        try {
            wikiMediaResult = await WikimediaController.wikiMediaSearch({ body: { name: name_en } } as Request);
            wikipediaUrl = await WikipediaController.findWikipediaUrl({ body: { name: name_en } } as Request);

            if (wikiMediaResult.error) errors.push(wikiMediaResult.error);
        } catch (error: any) {
            console.error(`Error fetching Wikimedia images: ${error.message}`);
            errors.push(`Error fetching Wikimedia images: ${error.message}`);
            wikiMediaResult.error = `Error fetching Wikimedia images: ${error.message}`;
        }

        // Fetch Unsplash Images if famous is true
        if (famous === true) {
            try {
                unsplashResult = await UnsplashController.unsplashSearch({ body: { name: name_en } } as Request);
                if (unsplashResult.error) errors.push(unsplashResult.error);
            } catch (error: any) {
                console.error(`Error fetching Unsplash images: ${error.message}`);
                errors.push(`Error fetching Unsplash images: ${error.message}`);
                unsplashResult.error = `Error fetching Unsplash images: ${error.message}`;
            }
        } else if (famous !== false) {
            res.status(400).json({ error: 'Field "famous" must be "true" or "false"' });
            return;
        }



        // Check if both calls failed
        if (wikiMediaResult.urls.length === 0 && unsplashResult.urls.length === 0) {
            res.status(500).json({ error: 'Failed to fetch images from both Wikimedia and Unsplash', details: errors });
            let place = await Place.findOne({ where: { id_tomexplore, city_id: city.id } });
            if (!place) {
                place = await Place.create({
                    id_tomexplore,
                    name_eng: name_en,
                    name_fr,
                    type: 'Tourist Attraction',
                    city_id: city.id,
                    checked: false,
                    needs_attention: true,
                    folder: id_tomexplore,
                    google_maps_link,
                    unsplash_link: unsplashResult.link,
                    wikipedia_link: wikipediaUrl,
                    details: errors.toString()
                });
            }

            return;
        }

        try {
            const result = await FileController.downloadPhotosTouristAttraction(name_en, id_tomexplore, wikiMediaResult, unsplashResult);
            res.json({
                downloadDir: result.downloadDir.replace(/\\/g, '/'),
                imageCount: result.imageCount,
                wikiMediaError: wikiMediaResult.error,
                unsplashError: unsplashResult.error,
                errors: errors.length > 0 ? errors : undefined
            });
            // Check if Place exists, otherwise create it
            let place = await Place.findOne({ where: { id_tomexplore, city_id: city.id } });
            if (!place) {
                place = await Place.create({
                    id_tomexplore,
                    name_eng: name_en,
                    name_fr,
                    type: 'Tourist Attraction',
                    city_id: city.id,
                    checked: false,
                    folder: id_tomexplore,
                    google_maps_link,
                    unsplash_link: unsplashResult.link,
                    wikipedia_link: wikipediaUrl
                });
            }
            // Save images in the database with the generated names
            const saveImage = async (url: string, source: string, author: string, license: string, generatedName: string) => {
                return Image.create({
                    image_name: generatedName,
                    original_url: url,
                    source,
                    author,
                    license,
                    place_id: place.id_tomexplore
                });
            };

            await Promise.all(
                result.imageNames.map((generatedName, index) => {
                    const source = index < wikiMediaResult.urls.length ? 'Wikimedia' : 'Unsplash';
                    const url = index < wikiMediaResult.urls.length ? wikiMediaResult.urls[index][0] : unsplashResult.urls[index - wikiMediaResult.urls.length][0];
                    const author = index < wikiMediaResult.urls.length ? wikiMediaResult.urls[index][1] : unsplashResult.urls[index - wikiMediaResult.urls.length][1];
                    const license = index < wikiMediaResult.urls.length ? wikiMediaResult.urls[index][2] : unsplashResult.urls[index - wikiMediaResult.urls.length][2];

                    return saveImage(url, source, author, license, generatedName);
                })
            );
        } catch (error: any) {
            console.error(`Error downloading photos: ${error.message}`);
            res.status(500).json({ error: `Error downloading photos: ${error.message}`, details: errors });
        }
    } catch (error: any) {
        console.error(`Error handling tourist attraction photos: ${error.message}`);
        res.status(500).json({ error: `Error handling tourist attraction photos: ${error.message}` });
    }
}
