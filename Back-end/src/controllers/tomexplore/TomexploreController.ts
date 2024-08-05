import { Request, Response } from 'express';
import fs from 'fs';
import Country from '../../models/Country';
import City from '../../models/City';
import Place from '../../models/Place';
import Image from '../../models/Image';
import * as FileController from '../scraping/FileController'
import path from 'path';

export const getCheckedPlacesByCity = async (req: Request, res: Response) => {
    const cityName = req.params.cityName;

    try {
        const places = await Place.findAll({
            where: { checked: true },
            include: [
                {
                    model: Image,
                    as: 'images',
                    attributes: ['image_name', 'author', 'license', 'top', 'original_url']
                },
                {
                    model: City,
                    as: 'city',
                    where: { name: cityName },
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
            return res.status(404).json({ error: 'No checked places found for this city' });
        }

        const response = places.map(place => {
            const city = place.getDataValue('city');
            const country = city ? city.getDataValue('country') : null;
            const images = place.getDataValue('images') || [];

            return {
                place_id: place.id_tomexplore,
                place_name: place.name_eng,
                wikipedia_link: place.wikipedia_link || '',
                google_maps_link: place.google_maps_link || '',
                folder: place.folder,
                images: images.map((image: { image_name: string; author: string; license: string; top: number; original_url: string }) => ({
                    image_name: image.image_name,
                    url: `http://localhost:3000/images/${encodeURIComponent(place.folder)}/${encodeURIComponent(image.image_name)}`,
                    author: image.author,
                    license: image.license,
                    top: image.top,
                    original_url: image.original_url,

                })),
                city_name: city ? city.name : '',
                country_name: country ? country.name : '',
                ...(place.instagram_updated && { instagram_link: place.instagram_link }),
                instagram_updated: place.instagram_updated

            };
        });

        res.json(response);
    } catch (error) {
        console.error('Error fetching checked places by city:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


export const getAllCheckedPlaces = async (req: Request, res: Response) => {

    try {
        const places = await Place.findAll({
            where: { checked: true },
            include: [
                {
                    model: Image,
                    as: 'images',
                    attributes: ['image_name', 'author', 'license', 'top', 'original_url']
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
            return res.status(404).json({ error: 'No checked places found' });
        }

        const response = places.map(place => {
            const city = place.getDataValue('city');
            const country = city ? city.getDataValue('country') : null;
            const images = place.getDataValue('images') || [];

            return {
                place_id: place.id_tomexplore,
                place_name: place.name_eng,
                wikipedia_link: place.wikipedia_link || '',
                google_maps_link: place.google_maps_link || '',
                folder: place.folder,
                images: images.map((image: { image_name: string; author: string; license: string; top: number; original_url: string }) => ({
                    image_name: image.image_name,
                    url: `http://localhost:3000/images/${encodeURIComponent(place.folder)}/${encodeURIComponent(image.image_name)}`,
                    author: image.author,
                    license: image.license,
                    top: image.top,
                    original_url: image.original_url,

                })),
                city_name: city ? city.name : '',
                country_name: country ? country.name : '',
                ...(place.instagram_updated && { instagram_link: place.instagram_link }),
                instagram_updated: place.instagram_updated

            };
        });

        res.json(response);
    } catch (error) {
        console.error('Error fetching checked places:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


export const getAllCheckedImagesByPlaceId = async (req: Request, res: Response) => {
    const placeId = req.params.placeId;

    try {
        const place = await Place.findByPk(placeId, {
            include: [{
                model: Image,
                as: 'images',
                attributes: ['image_name', 'author', 'license', 'top', 'original_url']
            }]
        });

        if (!place) {
            return res.status(404).json({ error: 'Place not found' });
        }

        if (!place.checked) {
            return res.status(400).json({ error: 'Place has not been checked yet' });
        }

        const images = place.getDataValue('images') || [];

        const response = {
            place_id: place.id_tomexplore,
            place_name: place.name_eng,
            wikipedia_link: place.wikipedia_link || '',
            google_maps_link: place.google_maps_link || '',
            folder: place.folder,
            ...(place.instagram_updated && { instagram_link: place.instagram_link }),
            instagram_updated: place.instagram_updated,
            images: images.map((image: { image_name: string; author: string; license: string; top: number; original_url: string }) => ({
                image_name: image.image_name,
                url: `http://localhost:3000/images/${encodeURIComponent(place.folder)}/${encodeURIComponent(image.image_name)}`,
                author: image.author,
                license: image.license,
                top: image.top,
                original_url: image.original_url
            }))
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching images by place ID:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};




export const deleteCheckedPlacesByCity = async (req: Request, res: Response) => {
    const cityName = req.params.cityName;
    console.log(`Received request to delete checked places and their images for city: ${cityName}`);

    try {
        const places = await Place.findAll({
            where: { checked: true },
            include: [
                {
                    model: City,
                    as: 'city',
                    where: { name: cityName },
                    attributes: ['name']
                }
            ]
        });

        if (!places.length) {
            console.log(`No checked places found for city: ${cityName}`);
            return res.status(404).json({ error: 'No checked places found for this city' });
        }

        for (const place of places) {
            console.log(`Processing place: ${place.name_eng} - ${place.id_tomexplore}`);

            const folderPath = path.join(__dirname, '../..', 'temp', place.folder);

            try {
                if (!fs.existsSync(folderPath)) {
                    console.log(`Folder does not exist: ${folderPath}`);
                    throw new Error(`Folder does not exist: ${folderPath}`);
                }

                console.log(`Folder exists: ${folderPath}`);
                FileController.deleteFolderRecursiveHelper(folderPath);
                console.log(`Deleted folder: ${folderPath}`);

                await Image.destroy({
                    where: { place_id: place.id_tomexplore }
                });
                console.log(`Deleted images for place ID: ${place.id_tomexplore}`);

                await Place.destroy({
                    where: { id_tomexplore: place.id_tomexplore }
                });
                console.log(`Deleted place with ID: ${place.id_tomexplore}`);
            } catch (error) {
                console.error('Error deleting files for place ID:', place.id_tomexplore, error);
                return res.status(500).json({ error: 'Internal server error while deleting files' });
            }
        }

        res.status(200).json({ message: 'Checked places and their images successfully deleted for the city.' });
    } catch (error) {
        console.error('Error deleting checked places and their images by city:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


export const deleteCheckedPlacesByIds = async (req: Request, res: Response) => {
    const { placeIds } = req.body;
    console.log(`Received request to delete places and their images for place IDs: ${placeIds}`);

    if (!Array.isArray(placeIds) || placeIds.length === 0) {
        return res.status(400).json({ error: 'placeIds must be a non-empty array' });
    }

    try {
        for (const placeId of placeIds) {
            const place = await Place.findByPk(placeId);
            console.log(`Place found: ${place ? place.name_eng : 'Not found'}`);

            if (!place) {
                console.log(`Place not found for ID: ${placeId}`);
                continue;
            }
            const folderPath = path.join(__dirname, '../..', 'temp', place.folder);
            console.log(`Folder path for place ID ${placeId}: ${folderPath}`);

            try {
                if (fs.existsSync(folderPath)) {
                    console.log(`Folder exists: ${folderPath}`);
                    FileController.deleteFolderRecursiveHelper(folderPath);
                    console.log(`Deleted folder: ${folderPath}`);
                } else {
                    console.log(`Folder does not exist: ${folderPath}`);
                }

                await Image.destroy({
                    where: { place_id: place.id_tomexplore }
                });
                console.log(`Deleted images for place ID: ${place.id_tomexplore}`);

                await Place.destroy({
                    where: { id_tomexplore: place.id_tomexplore }
                });
                console.log(`Deleted place with ID: ${place.id_tomexplore}`);
            } catch (error) {
                console.error(`Error deleting files for place ID: ${placeId}`, error);
                return res.status(500).json({ error: `Internal server error while deleting files for place ID: ${placeId}` });
            }
        }

        res.status(200).json({ message: 'Places and their images successfully deleted.' });
    } catch (error) {
        console.error('Error deleting places and their images by IDs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};



export const getAllPlacesToBeDeleted = async (req: Request, res: Response) => {
    try {
        const places = await Place.findAll({
            where: { to_be_deleted: true },
        });
        if (!places.length) {
            return res.status(404).json({ error: 'No places to be deleted found' });
        }
        const response = places.map(place => {
            return {
                place_id: place.id_tomexplore,
            };
        });

        res.json(response);
    } catch (error) {
        console.error('Error fetching places to be deleted:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getAllPlacesNeedingAttention = async (req: Request, res: Response) => {
    try {
        const places = await Place.findAll({
            where: { needs_attention: true },
        });
        if (!places.length) {
            return res.status(404).json({ error: 'No places to be deleted found' });
        }
        const response = places.map(place => {
            return {
                place_id: place.id_tomexplore,
            };
        });

        res.json(response);
    } catch (error) {
        console.error('Error fetching places to be deleted:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
