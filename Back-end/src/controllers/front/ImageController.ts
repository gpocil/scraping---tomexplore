import { Request, Response } from 'express';
import path from 'path';
import Country from '../../models/Country';
import City from '../../models/City';
import Place from '../../models/Place';
import Image from '../../models/Image';
import { deleteImages } from '../scraping/FileController';

interface ImageResponse {
    image_name: string;
    id: number;
    url: string;
}

interface PlaceResponse {
    place_id: number;
    place_name: string;
    wikipedia_link: string;
    google_maps_link: string;
    images: ImageResponse[];
    checked: Boolean;
    needs_attention: Boolean | undefined;
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
}

export const getPlacesWithImages = async (req: Request, res: Response) => {
    try {
        const places = await Place.findAll({
            include: [
                {
                    model: Image,
                    as: 'images',
                    attributes: ['image_name', 'id']
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

        const response: ResponseStructure = { checked: {}, unchecked: {} };

        places.forEach(place => {
            const city = place.getDataValue('city');
            const country = city ? city.getDataValue('country') : null;
            const images = place.getDataValue('images') || [];
            const checkedStatus: 'checked' | 'unchecked' = place.getDataValue('checked') ? 'checked' : 'unchecked';

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
                        wikipedia_link: place.wikipedia_link || '',
                        google_maps_link: place.google_maps_link || '',
                        images: images.map((image: { image_name: string; id: number }) => ({
                            id: image.id,
                            image_name: image.image_name,
                            url: `http://37.187.35.37:3000/images/${encodeURIComponent(place.folder)}/${image.image_name}`
                        })),
                        checked: place.checked,
                        needs_attention: place.needs_attention
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
        // Set top = 0 for all images with the given place_id
        await Image.update({ top: 0 }, { where: { place_id: placeId } });

        // Update top attribute for the selected images
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
    const { place_id } = req.body;

    if (!place_id) {
        return res.status(400).json({ error: 'Place ID is required' });
    }

    try {
        const place = await Place.findByPk(place_id);
        if (place) {
            place.needs_attention = true;
            place.checked = false;
            await place.save();
            console.log(`Place with ID ${place_id} set to needing attention.`);
            res.status(200).json({ message: 'Place set to needing attention successfully' });
        } else {
            return res.status(404).json({ error: 'Place not found' });
        }
    } catch (error) {
        console.error('Error setting place to needing attention:', error);
        res.status(500).json({ error: 'An error occurred while setting place to needing attention' });
    }
};
