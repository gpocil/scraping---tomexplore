import { Request, Response } from 'express';
import path from 'path';
import Country from '../../models/Country';
import City from '../../models/City';
import Place from '../../models/Place';
import Image from '../../models/Image';

interface ImageResponse {
    image_name: string;
    original_url: string;
    url: string;
}

interface PlaceResponse {
    place_id: number;
    place_name: string;
    wikipedia_link: string;
    google_maps_link: string;
    images: ImageResponse[];
}

interface CityResponse {
    [placeName: string]: PlaceResponse[];
}

interface CountryResponse {
    [cityName: string]: CityResponse;
}

interface ResponseStructure {
    [countryName: string]: CountryResponse;
}

export const getUncheckedPlacesWithImages = async (req: Request, res: Response) => {
    try {
        const places = await Place.findAll({
            where: { checked: false },
            include: [
                {
                    model: Image,
                    as: 'images',
                    attributes: ['image_name', 'original_url']
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
            return res.status(404).json({ error: 'No unchecked places found' });
        }

        const response: ResponseStructure = {};

        places.forEach(place => {
            const city = place.getDataValue('city');
            const country = city ? city.getDataValue('country') : null;
            const images = place.getDataValue('images') || [];

            if (country) {
                if (!response[country.name]) {
                    response[country.name] = {};
                }

                if (city) {
                    if (!response[country.name][city.name]) {
                        response[country.name][city.name] = {};
                    }

                    const placeResponse: PlaceResponse = {
                        place_id: place.id_tomexplore,
                        place_name: place.name_eng,
                        wikipedia_link: place.wikipedia_link || '',
                        google_maps_link: place.google_maps_link || '',
                        images: images.map((image: { image_name: string; original_url: string; }) => ({
                            image_name: image.image_name,
                            original_url: image.original_url,
                            url: `http://localhost:3000/images/${encodeURIComponent(place.folder)}/${image.image_name}`
                        }))
                    };

                    if (!response[country.name][city.name][place.name_eng]) {
                        response[country.name][city.name][place.name_eng] = [];
                    }

                    response[country.name][city.name][place.name_eng].push(placeResponse);
                }
            }
        });

        res.json(response);
    } catch (error) {
        console.error('Error fetching unchecked places with images:', error);
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
        const imageUrls = images.map((image: Image) => `http://localhost:3000/images/${folderName}/${image.image_name}`);
        console.log(`Image URLs for place ID ${placeId}: ${JSON.stringify(imageUrls)}`);

        res.json(imageUrls);
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
