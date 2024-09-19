import { Request, Response } from 'express';
import path from 'path';
import Country from '../../models/Country';
import City from '../../models/City';
import Place from '../../models/Place';
import Image from '../../models/Image';
import { deleteFolderRecursiveHelper, deleteImages } from '../scraping/FileController';
import fs from 'fs';
import * as ScrapingMainController from '../scraping/ScrapingMainController';

interface ImageResponse {
    image_name: string;
    id: number;
    url: string;
}

interface PlaceResponse {
    place_id: number;
    place_name: string;
    place_name_original?: string;
    wikipedia_link?: string;
    google_maps_link: string;
    instagram_link?: string;
    unsplash_link?: string;
    images: ImageResponse[];
    checked: Boolean;
    needs_attention: Boolean | undefined;
    details?: string;
    type?: string
}

interface CityResponse {
    [placeName: string]: PlaceResponse[];
}

interface CountryResponse {
    [cityName: string]: CityResponse;
}

interface ResponseStructure {
    checked: { [countryName: string]: CountryResponse };
    unchecked: { [countryName: string]: CountryResponse };
    needs_attention: { [countryName: string]: CountryResponse };
    to_be_deleted: { [countryName: string]: CountryResponse };


}

export const getPlacesWithImages = async (req: Request, res: Response) => {
    try {
        const places = await Place.findAll({
            include: [
                {
                    model: Image,
                    as: 'images',
                    attributes: ['image_name', 'id'],
                    required: false,
                },
                {
                    model: City,
                    as: 'city',
                    attributes: ['name', 'country_id'],
                    include: [
                        {
                            model: Country,
                            as: 'country',
                            attributes: ['name']
                        }
                    ]
                }
            ]
        });

        if (!places.length) {
            return res.status(404).json({ error: 'No places found' });
        }

        const response: ResponseStructure = { checked: {}, unchecked: {}, needs_attention: {}, to_be_deleted: {} };

        places.forEach(place => {
            const city = place.getDataValue('city');
            const country = city ? city.getDataValue('country') : null;
            const images = place.getDataValue('images') || [];
            const checked = place.getDataValue('checked');
            const needsAttention = place.getDataValue('needs_attention');
            const toBeDeleted = place.getDataValue('to_be_deleted');

            let checkedStatus: 'checked' | 'unchecked' | 'needs_attention' | 'to_be_deleted';
            if (toBeDeleted) {
                checkedStatus = 'to_be_deleted';
            } else if (checked) {
                checkedStatus = 'checked';
            } else if (needsAttention) {
                checkedStatus = 'needs_attention';
            } else {
                checkedStatus = 'unchecked';
            }

            if (country) {
                if (!response[checkedStatus][country.name]) {
                    response[checkedStatus][country.name] = {};
                }

                if (city) {
                    if (!response[checkedStatus][country.name][city.name]) {
                        response[checkedStatus][country.name][city.name] = {};
                    }

                    const placeResponse: PlaceResponse = {
                        place_id: place.id_tomexplore,
                        place_name: place.name_eng,
                        place_name_original: place.name_original,
                        wikipedia_link: place.wikipedia_link || '',
                        google_maps_link: place.google_maps_link || '',
                        instagram_link: place.instagram_link || '',
                        unsplash_link: place.unsplash_link || '',
                        images: images.map((image: { image_name: string; id: number }) => ({
                            id: image.id,
                            image_name: image.image_name,
                            url: `https://monblogdevoyage.com/images/${encodeURIComponent(place.folder)}/${image.image_name}`
                        })),
                        checked: place.checked,
                        needs_attention: place.needs_attention,
                        details: place.details,
                        type: place.type
                    };

                    if (!response[checkedStatus][country.name][city.name][place.name_eng]) {
                        response[checkedStatus][country.name][city.name][place.name_eng] = [];
                    }

                    response[checkedStatus][country.name][city.name][place.name_eng].push(placeResponse);
                }
            }
        });

        res.json(response);
    } catch (error) {
        console.error('Error fetching places with images:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


export const getImagesByPlaceId = async (req: Request, res: Response) => {
    const placeId = req.params.placeId;
    console.log(`Received request to fetch images for place ID: ${placeId}`);

    try {
        // Récupérer le dossier associé au placeId depuis la base de données
        const place = await Place.findByPk(placeId);
        if (!place) {
            console.error(`Place not found for ID: ${placeId}`);
            return res.status(404).json({ error: 'Place not found' });
        }

        const folderPath = place.folder; // Chemin du dossier
        const folderName = encodeURIComponent(path.basename(folderPath));
        console.log(`Folder path for place ID ${placeId}: ${folderPath}`);

        // Récupérer toutes les images associées à ce place_id
        const images = await Image.findAll({ where: { place_id: placeId } });

        if (!images.length) {
            console.error(`No images found for place ID: ${placeId}`);
            return res.status(404).json({ error: 'No images found for this place' });
        }

        // Créer les URLs des images
        const imageUrls = images.map((image: Image) => `http://37.187.35.37:3000/images/${folderName}/${image.image_name}`);
        console.log(`Image URLs for place ID ${placeId}: ${JSON.stringify(imageUrls)}`);

        res.json(imageUrls);
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
export const deleteImagesUser = async (req: Request, res: Response) => {
    const { imageIds } = req.body;

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({ error: 'A list of image IDs is required' });
    }

    try {
        await deleteImages(imageIds);
        res.status(200).json({ message: 'Images deleted successfully and place set to checked' });
    } catch (error) {
        console.error('Error deleting images or updating place:', error);
        res.status(500).json({ error: 'An error occurred while deleting images or updating place' });
    }
};

const updateTopAttributes = async (imageIds: number[], placeId: number) => {
    try {
        await Image.update({ top: 0 }, { where: { place_id: placeId } });

        for (let i = 0; i < imageIds.length; i++) {
            const image = await Image.findByPk(imageIds[i]);
            if (image) {
                image.top = i + 1;
                await image.save();
            }
        }
    } catch (error) {
        console.error('Error updating top attributes:', error);
        throw new Error('Failed to update top attributes');
    }
};

export const setTopAndSetChecked = async (req: Request, res: Response) => {
    const { imageIds, place_id } = req.body;

    if (!Array.isArray(imageIds) || imageIds.length > 3) {
        return res.status(400).json({ error: 'A list of exactly 3 image IDs is required' });
    }

    if (!place_id) {
        return res.status(400).json({ error: 'Place ID is required' });
    }

    try {
        // Update the top attributes for the given images
        await updateTopAttributes(imageIds, place_id);

        // Update the place to set checked to true
        const place = await Place.findByPk(place_id);
        if (place) {
            place.checked = true;
            place.needs_attention = false;
            place.last_modification = new Date();
            await place.save();
            console.log(`Place with ID ${place_id} set to checked.`);
        } else {
            return res.status(404).json({ error: 'Place not found' });
        }

        res.status(200).json({ message: 'Images updated successfully and place set to checked' });
    } catch (error) {
        console.error('Error updating images or place:', error);
        res.status(500).json({ error: 'An error occurred while updating images or place' });
    }
};



export const setPlaceNeedsAttention = async (req: Request, res: Response) => {
    const { place_id, details } = req.body;

    if (!place_id) {
        return res.status(400).json({ error: 'Place ID is required' });
    }

    try {
        const place = await Place.findByPk(place_id);
        if (place) {
            place.needs_attention = true;
            place.checked = false;
            place.last_modification = new Date();

            if (details && typeof details === 'string') {
                place.details = details;
            }

            await place.save();
            console.log(`Place with ID ${place_id} set to needing attention with details: ${details}`);
            res.status(200).json({ message: 'Place set to needing attention successfully' });
        } else {
            return res.status(404).json({ error: 'Place not found' });
        }
    } catch (error) {
        console.error('Error setting place to needing attention:', error);
        res.status(500).json({ error: 'An error occurred while setting place to needing attention' });
    }
};



export const uploadPhotos = async (req: Request, res: Response) => {
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('Request params:', req.params);

    const { place_id } = req.params; // Get place_id from URL params
    let files: Express.Multer.File[] = [];

    if (Array.isArray(req.files)) {
        files = req.files;
    } else if (req.files) {
        for (const key in req.files) {
            if (req.files.hasOwnProperty(key)) {
                files = files.concat(req.files[key] as Express.Multer.File[]);
            }
        }
    }

    if (!place_id || files.length === 0) {
        return res.status(400).json({ error: 'Place ID and files are required' });
    }

    try {
        const place = await Place.findByPk(place_id);
        if (!place) {
            return res.status(404).json({ error: 'Place not found' });
        }

        const images = [];
        for (const file of files) {
            const image = await Image.create({
                image_name: file.filename,
                source: 'Upload',
                place_id: place_id
            });
            images.push(image);
        }

        res.status(200).json({ message: 'Photos uploaded successfully', images });
    } catch (error: any) {
        console.error('Error uploading photos:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        for (const file of files) {
            fs.unlink(path.join('uploads', file.filename), (err) => {
                if (err) console.error('Error removing file:', file.filename);
            });
        }
    }
};


export const setPlaceToBeDeleted = async (req: Request, res: Response) => {
    const { place_id, details } = req.body;

    if (!place_id) {
        return res.status(400).json({ error: 'Place ID is required' });
    }

    try {
        const place = await Place.findByPk(place_id);
        if (!place) {
            return res.status(404).json({ error: 'Place not found' });
        }

        place.to_be_deleted = true;
        place.checked = false;
        place.needs_attention = false;
        place.details = details;
        await place.save();

        const images = await Image.findAll({ where: { place_id: place_id } });
        const imageIds = images.map(image => image.id);

        await deleteImages(imageIds);

        const folderPath = path.join(__dirname, '../..', 'temp', place.folder);
        if (fs.existsSync(folderPath)) {
            deleteFolderRecursiveHelper(folderPath);
            console.log('Dossier supprimé');
        }
        else {
            console.log('dossier non trouvé ' + folderPath);
        }
        res.status(200).json({ message: 'Place set to be deleted and all associated images removed' });
    } catch (error) {
        console.error('Error setting place to be deleted:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


export const updateInstagram = async (req: Request, res: Response) => {
    const { place_id, instagram_link } = req.body;

    if (!place_id || !instagram_link) {
        console.log('Missing place_id or instagram_link');
        return res.status(400).json({ error: 'Place ID and Instagram link are required' });
    }

    try {
        const place = await Place.findByPk(place_id);
        if (!place) {
            console.log(`Place not found for ID: ${place_id}`);
            return res.status(404).json({ error: 'Place not found' });
        }

        place.instagram_link = instagram_link;
        place.instagram_updated = true;
        await place.save();

        console.log(`Updated Instagram link for place ID: ${place_id}`);

        // Appeler scrapeInstagramAfterUpdate pour récupérer les nouvelles images Instagram
        const usernameMatch = instagram_link.match(/(?:http[s]?:\/\/)?(?:www\.)?instagram\.com\/([^\/\?\&]+)/);
        const instagram_username = usernameMatch ? usernameMatch[1] : '';

        const scrapeRequest = {
            body: {
                id_tomexplore: place.id_tomexplore,
                instagram_username // Utiliser le nom d'utilisateur extrait
            }
        } as Request;

        const scrapeResponse: any = {
            json: (data: any) => {
                console.log('Scrape response data:', data);
                return data;
            },
            status: (statusCode: number) => {
                console.log('Scrape response status:', statusCode);
                return scrapeResponse;
            }
        } as unknown as Response;

        console.log(`Starting Instagram scraping for place ID: ${place_id} with username: ${instagram_username}`);
        const scrapeResult = await ScrapingMainController.scrapeInstagramAfterUpdate(scrapeRequest, scrapeResponse);

        console.log(`Completed Instagram scraping for place ID: ${place_id}`);

        // Envoyer la réponse seulement après l'appel de scrapeInstagramAfterUpdate
        res.status(200).json({ message: 'Instagram link updated successfully', place, scrapeResult });
    } catch (error) {
        console.error('Error updating Instagram link:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


export const updateWikimedia = async (req: Request, res: Response) => {
    const { place_id, query } = req.body;

    if (!place_id || !query) {
        console.log('Missing place_id or query');
        return res.status(400).json({ error: 'Place ID and query are required' });
    }

    try {
        const place = await Place.findByPk(place_id);
        if (!place) {
            console.log(`Place not found for ID: ${place_id}`);
            return res.status(404).json({ error: 'Place not found' });
        }

        const scrapeRequest = {
            body: {
                id_tomexplore: place.id_tomexplore,
                query
            }
        } as Request;

        const scrapeResponse: any = {
            json: (data: any) => {
                console.log('Scrape response data:', data);
                return data;
            },
            status: (statusCode: number) => {
                console.log('Scrape response status:', statusCode);
                return scrapeResponse;
            }
        } as unknown as Response;

        console.log(`Starting Wikimedia scraping for place ID: ${place_id} with username: ${query}`);
        const scrapeResult = await ScrapingMainController.scrapeWikimediaAfterUpdate(scrapeRequest, scrapeResponse);

        console.log(`Completed Wikimedia scraping for place ID: ${place_id}`);
        res.status(200).json({ message: 'Wikimedia images scraped successfully', place, scrapeResult });
    } catch (error) {
        console.error('Error updating Wikimedia images:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};



export const updateGoogleMaps = async (req: Request, res: Response) => {
    const { place_id } = req.body;

    if (!place_id) {
        console.log('Missing place_id or query');
        return res.status(400).json({ error: 'Place ID and query are required' });
    }

    try {
        const place = await Place.findByPk(place_id);
        if (!place) {
            console.log(`Place not found for ID: ${place_id}`);
            return res.status(404).json({ error: 'Place not found' });
        }

        const scrapeRequest = {
            body: {
                id_tomexplore: place.id_tomexplore,

            }
        } as Request;

        const scrapeResponse: any = {
            json: (data: any) => {
                console.log('Scrape response data:', data);
                return data;
            },
            status: (statusCode: number) => {
                console.log('Scrape response status:', statusCode);
                return scrapeResponse;
            }
        } as unknown as Response;

        console.log(`Starting Google maps scraping for place ID: ${place_id}`);
        const scrapeResult = await ScrapingMainController.scrapeGoogleMapsAfterUpdate(scrapeRequest, scrapeResponse);

        console.log(`Completed Google maps scraping for place ID: ${place_id}`);
        res.status(200).json({ message: 'Google maps images scraped successfully', place, scrapeResult });
    } catch (error) {
        console.error('Error updating Google maps images:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

