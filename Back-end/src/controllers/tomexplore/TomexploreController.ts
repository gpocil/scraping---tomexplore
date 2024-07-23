import { Request, Response } from 'express';
import Country from '../../models/Country';
import City from '../../models/City';
import Place from '../../models/Place';
import Image from '../../models/Image';


export const getCheckedPlacesByCity = async (req: Request, res: Response) => {
    const cityName = req.params.name;

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
                    original_url: image.original_url
                })),
                city_name: city ? city.name : '',
                country_name: country ? country.name : ''
            };
        });

        res.json(response);
    } catch (error) {
        console.error('Error fetching checked places by city:', error);
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

        const response = images.map((image: { image_name: string; author: string; license: string; top: number; original_url: string }) => ({
            image_name: image.image_name,
            url: `http://localhost:3000/images/${encodeURIComponent(place.folder)}/${image.image_name}`,
            author: image.author,
            license: image.license,
            top: image.top,
            original_url: image.original_url
        }));

        res.json(response);
    } catch (error) {
        console.error('Error fetching images by place ID:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
