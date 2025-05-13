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
export interface PlaceWithCity extends Place {
    city?: City;
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
    type?: string;
    has_needed_attention: Boolean | undefined;
    photos_deleted: Boolean | undefined;
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

interface CountResponse {
    place_count: number;
    image_count: number;
}

interface CityCountResponse {
    [placeName: string]: CountResponse;
}

interface CountryCountResponse {
    [cityName: string]: CityCountResponse;
}

interface PreviewResponseStructure {
    checked: { [countryName: string]: CountryCountResponse };
    unchecked: { [countryName: string]: CountryCountResponse };
    needs_attention: { [countryName: string]: CountryCountResponse };
    to_be_deleted: { [countryName: string]: CountryCountResponse };
}

export const getPreview = async (req: Request, res: Response) => {
    try {
        const isAdmin = req.query.admin === 'true';
        console.log('Getting preview with admin =', isAdmin);

        // Condition pour exclure les lieux "checked" si l'utilisateur n'est pas admin
        const whereCondition = isAdmin ? {} : { checked: false };

        const places = await Place.findAll({
            where: whereCondition,
            include: [
                {
                    model: Image,
                    as: 'images',
                    attributes: ['id'],
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

        const response: PreviewResponseStructure = { checked: {}, unchecked: {}, needs_attention: {}, to_be_deleted: {} };

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

                    if (!response[checkedStatus][country.name][city.name][place.name_eng]) {
                        response[checkedStatus][country.name][city.name][place.name_eng] = {
                            place_count: 0,
                            image_count: 0
                        };
                    }

                    // Increment the place count
                    response[checkedStatus][country.name][city.name][place.name_eng].place_count += 1;

                    // Add image count
                    response[checkedStatus][country.name][city.name][place.name_eng].image_count += images.length;
                }
            }
        });

        res.json(response);
    } catch (error) {
        console.error('Error fetching places preview:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getPlacesWithImages = async (req: Request, res: Response) => {
    try {
        const isAdmin = req.query.admin === 'true';
        console.log(isAdmin);

        // Condition pour exclure les lieux "checked" si l'utilisateur n'est pas admin
        const whereCondition = isAdmin ? {} : { checked: false };

        const places = await Place.findAll({
            where: whereCondition,
            include: [
                {
                    model: Image,
                    as: 'images',
                    attributes: ['image_name', 'id', 'original_url'],
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
                        images: images.map((image: { image_name: string; id: number, original_url: string }) => ({
                            id: image.id,
                            image_name: image.image_name,
                            url: `https://monblogdevoyage.com/images/${encodeURIComponent(place.folder)}/${image.image_name}`,
                            source: image.original_url,
                        })),
                        checked: place.checked,
                        needs_attention: place.needs_attention,
                        has_needed_attention: place.has_needed_attention,
                        details: place.details,
                        type: place.type,
                        photos_deleted: place.photos_deleted
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



export const getSinglePlace = async (req: Request, res: Response) => {
    const placeId = req.params.id;
    try {
        // Récupère le lieu avec la ville associée
        const place = await Place.findByPk<PlaceWithCity>(placeId, {
            include: [{ model: City, as: 'city' }]
        });
        if (!place) {
            console.error(`Place not found for ID: ${placeId}`);
            return res.status(404).json({ error: 'Place not found' });
        }

        const folderPath = place.folder;
        const folderName = encodeURIComponent(path.basename(folderPath));
        console.log(`Folder path for place ID ${placeId}: ${folderPath}`);

        // Récupère les images associées au lieu
        const images = await Image.findAll({ where: { place_id: placeId } });
        const imageData = images.map((image: Image) => ({
            id: image.id,
            url: `https://monblogdevoyage.com/images/${folderName}/${image.image_name}`,
            top: image.top
        }));
        console.log(`Image data for place ID ${placeId}: ${JSON.stringify(imageData)}`);

        // Structure la réponse avec les informations de la ville
        const response = {
            place,
            city: place.city,
            images: imageData
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}


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

        // Créer les URLs des images avec les ID
        const imageData = images.map((image: Image) => ({
            id: image.id,  // Ajoute l'ID de l'image
            url: `https://monblogdevoyage.com/images/${folderName}/${image.image_name}`
        }));
        console.log(`Image data for place ID ${placeId}: ${JSON.stringify(imageData)}`);

        res.json(imageData);
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
export const deleteImagesUser = async (req: Request, res: Response) => {
    console.log(`[DELETE] Received request to delete images`);
    console.log(`[DELETE] Request body: ${JSON.stringify(req.body)}`);

    const { imageIds } = req.body;

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
        console.log(`[DELETE] Invalid image IDs provided: ${JSON.stringify(imageIds)}`);
        return res.status(400).json({ error: 'A list of image IDs is required' });
    }

    console.log(`[DELETE] Processing deletion request for image IDs: ${JSON.stringify(imageIds)}`);

    try {
        // Query images before deletion for comparison
        console.log(`[DELETE] Querying images before deletion`);
        const imagesToDelete = await Image.findAll({
            where: { id: imageIds },
            include: [{ model: Place, as: 'associatedPlace', attributes: ['id_tomexplore', 'folder'] }]
        });

        console.log(`[DELETE] Found ${imagesToDelete.length} out of ${imageIds.length} requested images`);
        console.log(`[DELETE] Image details before deletion: ${JSON.stringify(imagesToDelete.map(img => ({
            id: img.id,
            name: img.image_name,
            placeId: img.getDataValue('associatedPlace')?.id_tomexplore,
            placeFolder: img.getDataValue('associatedPlace')?.folder
        })))}`);

        await deleteImages(imageIds);

        // Verify database state after deletion
        console.log(`[DELETE] Verifying database state after deletion`);
        const remainingImages = await Image.findAll({
            where: { id: imageIds }
        });

        console.log(`[DELETE] Remaining images after deletion: ${remainingImages.length}`);
        if (remainingImages.length > 0) {
            console.log(`[DELETE] Warning: Some images still exist in database: ${JSON.stringify(remainingImages.map(img => img.id))}`);
        }

        res.status(200).json({
            message: 'Images deleted successfully',
            deletedCount: imageIds.length,
            deletedIds: imageIds
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[DELETE] Error in deleteImagesUser:`, error);
        res.status(500).json({
            error: 'An error occurred while deleting images',
            details: errorMessage
        });
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
        await updateTopAttributes(imageIds, place_id);

        const place = await Place.findByPk(place_id);
        if (place) {
            if (place.needs_attention === true) {
                place.has_needed_attention = true;
            }
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
        if (images.length > 0) {
            const imageIds = images.map(image => image.id);

            await deleteImages(imageIds);

            const folderPath = path.join(__dirname, '../..', 'temp', place.folder);
            if (fs.existsSync(folderPath)) {
                deleteFolderRecursiveHelper(folderPath);
                console.log('Dossier supprimé');
            } else {
                console.log('Dossier non trouvé : ' + folderPath);
            }
        } else {
            console.log('Aucune image trouvée pour le lieu, uniquement le lieu sera supprimé.');
        }

        res.status(200).json({ message: 'Place set to be deleted. Images removed if present.' });
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

        const usernameMatch = instagram_link.match(/(?:http[s]?:\/\/)?(?:www\.)?instagram\.com\/([^\/\?\&]+)/);
        const instagram_username = usernameMatch ? usernameMatch[1] : '';

        const scrapeRequest = {
            body: {
                id_tomexplore: place.id_tomexplore,
                instagram_username
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

export const getUncheckedPlacesByCity = async (req: Request, res: Response) => {
    const cityName = req.params.cityName;
    console.log(`[IMAGECONTROLLER] Fetching unchecked places for city: ${cityName}`);

    if (!cityName) {
        return res.status(400).json({ error: 'City name is required' });
    }

    try {
        // Find city by name first
        const city = await City.findOne({
            where: { name: cityName },
            include: [
                {
                    model: Country,
                    as: 'associatedCountry',
                    attributes: ['name']
                }
            ]
        });

        if (!city) {
            return res.status(404).json({ error: `City not found: ${cityName}` });
        }

        // Find all unchecked places for this city
        const places = await Place.findAll({
            where: {
                city_id: city.id,
                checked: false,
                to_be_deleted: false,
                needs_attention: false
            },
            include: [
                {
                    model: Image,
                    as: 'images',
                    attributes: ['id', 'image_name', 'original_url']
                }
            ]
        });

        if (!places.length) {
            return res.status(404).json({ error: `No unchecked places found for city: ${cityName}` });
        }

        // Format the response
        const response = places.map(place => {
            const images = place.getDataValue('images') || [];

            return {
                place_id: place.id_tomexplore,
                place_name: place.name_eng,
                place_name_original: place.name_original,
                wikipedia_link: place.wikipedia_link || '',
                google_maps_link: place.google_maps_link || '',
                instagram_link: place.instagram_link || '',
                unsplash_link: place.unsplash_link || '',
                type: place.type,
                needs_attention: place.needs_attention,
                details: place.details,
                images: images.map((image: { id: number, image_name: string, original_url: string }) => ({
                    id: image.id,
                    image_name: image.image_name,
                    url: `https://monblogdevoyage.com/images/${encodeURIComponent(place.folder)}/${image.image_name}`,
                    source: image.original_url
                }))
            };
        });

        const countryName = city.getDataValue('associatedCountry')?.name || 'Unknown';

        res.json({
            city: cityName,
            country: countryName,
            places: response
        });
    } catch (error) {
        console.error('Error fetching unchecked places by city:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getAllPlacesNeedingAttention = async (req: Request, res: Response) => {
    console.log('Fetching all places needing attention');

    try {
        // Find all places marked as needing attention
        const places = await Place.findAll({
            where: {
                needs_attention: true,
                checked: false        // Only include places that haven't been checked yet
            },
            include: [
                {
                    model: Image,
                    as: 'images',
                    attributes: ['id', 'image_name', 'original_url']
                },
                {
                    model: City,
                    as: 'city',
                    attributes: ['name'],
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
            return res.status(404).json({ error: 'No places needing attention found' });
        }

        // Format the response to include city and country info
        const response = places.map(place => {
            const images = place.getDataValue('images') || [];
            const city = place.getDataValue('city');
            const country = city ? city.getDataValue('country') : null;

            return {
                place_id: place.id_tomexplore,
                place_name: place.name_eng,
                place_name_original: place.name_original,
                wikipedia_link: place.wikipedia_link || '',
                google_maps_link: place.google_maps_link || '',
                instagram_link: place.instagram_link || '',
                unsplash_link: place.unsplash_link || '',
                type: place.type,
                details: place.details,
                city_name: city ? city.name : '',
                country_name: country ? country.name : '',
                images: images.map((image: { id: number, image_name: string, original_url: string }) => ({
                    id: image.id,
                    image_name: image.image_name,
                    url: `https://monblogdevoyage.com/images/${encodeURIComponent(place.folder)}/${image.image_name}`,
                    source: image.original_url
                }))
            };
        });

        res.json(response);
    } catch (error) {
        console.error('Error fetching places needing attention:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

