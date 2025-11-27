import express, { Request, Response } from 'express';
import { Queue, Place, Country, City } from '../../models';
import * as ScrapingMainController from './ScrapingMainController'
import { Op } from 'sequelize';


export const launchScraping = async (req: Request, res: Response) => {
    console.log('\n\n========================================');
    console.log('LAUNCH SCRAPING CALLED');
    console.log('========================================');
    const { count } = req.query;
    console.log('Query params:', req.query);

    const entriesCount = parseInt(count as string, 10);
    console.log('Parsed count:', entriesCount);
    if (isNaN(entriesCount) || entriesCount <= 0) {
        console.log('ERROR: Invalid count parameter');
        return res.status(400).json({ error: 'The count parameter must be a positive integer.' });
    }
    console.log('Count validation passed');

    try {
        const oldestEntries = await getOldestQueueEntries(entriesCount);
        console.log(`\n=== SCRAPING STARTED ===`);
        console.log(`Requested count: ${entriesCount}`);
        console.log(`Entries retrieved: ${oldestEntries?.length || 0}`);

        if (!oldestEntries) {
            console.log('No entries found in queue');
            return res.status(204).json({ message: 'No entries found in the queue.' });
        }

        // Création des villes et pays avant le scraping
        await createCitiesAndCountries(oldestEntries);
        console.log('Cities and countries created/verified');

        const sortedEntries = sortQueueByType(oldestEntries);
        const businessEntries = sortedEntries.business;
        const touristAttractionEntries = sortedEntries.tourist_attraction;

        console.log(`\nSorted entries:`);
        console.log(`- Business: ${businessEntries.length}`);
        console.log(`- Tourist Attractions: ${touristAttractionEntries.length}`);
        
        if (businessEntries.length > 0) {
            console.log('Business entries:', businessEntries.map(e => ({ id: e.id_tomexplore, name: e.name_en, type: e.type })));
        }
        if (touristAttractionEntries.length > 0) {
            console.log('Tourist entries:', touristAttractionEntries.map(e => ({ id: e.id_tomexplore, name: e.name_en, type: e.type })));
        }

        if (businessEntries.length === 0 && touristAttractionEntries.length === 0) {
            console.log('ERROR: No entries after type filtering!');
            return res.status(400).json({ error: 'No valid entries found after type filtering' });
        }

        try {
            console.log('\n=== STARTING SCRAPING CALLS ===');
            console.log('Calling getPhotosBusiness with', businessEntries.length, 'entries');
            console.log('Calling getPhotosTouristAttraction with', touristAttractionEntries.length, 'entries');
            
            const businessPromise = ScrapingMainController.getPhotosBusiness({ body: businessEntries } as Request);
            const touristPromise = ScrapingMainController.getPhotosTouristAttraction({ body: touristAttractionEntries } as Request);
            
            console.log('Waiting for scraping promises to resolve...');
            const results = await Promise.all([businessPromise, touristPromise]);
            console.log('Scraping promises resolved');
            
            console.log('\n=== SCRAPING RESULTS ===');
            console.log('Business results type:', typeof results[0]);
            console.log('Business results is array:', Array.isArray(results[0]));
            console.log('Business results length:', results[0]?.length);
            console.log('Business results:', JSON.stringify(results[0], null, 2));
            console.log('\nTourist results type:', typeof results[1]);
            console.log('Tourist results is array:', Array.isArray(results[1]));
            console.log('Tourist results length:', results[1]?.length);
            console.log('Tourist results:', JSON.stringify(results[1], null, 2));

            const updateProcessedEntries = async (entries: Queue[]) => {
                console.log(`\nMarking ${entries.length} entries as processed`);
                await Promise.all(entries.map(async (entry) => {
                    console.log(`✓ Marking as processed: ${entry.id_tomexplore} (${entry.name_en || entry.name_fr})`);
                    await Queue.update(
                        {
                            processed: true,
                            updatedAt: new Date(),
                        },
                        {
                            where: { id: entry.id },
                        }
                    );
                }));
            };

            console.log('\n=== UPDATING PROCESSED STATUS ===');
            await updateProcessedEntries(businessEntries);
            await updateProcessedEntries(touristAttractionEntries);
            console.log('All entries marked as processed');
            console.log('\n=== SCRAPING COMPLETED SUCCESSFULLY ===\n');
            return res.status(200).json({ message: 'Scraping process completed successfully', results });
        } catch (error: any) {
            console.error('\n!!! ERROR DURING SCRAPING !!!');
            console.error('Error type:', error?.constructor?.name);
            console.error('Error message:', error?.message);
            console.error('Error stack:', error?.stack);
            return res.status(500).json({ error: 'Internal server error during scraping', details: error?.message });
        }
    } catch (error: any) {
        console.error('\n!!! ERROR LAUNCHING SCRAPING !!!');
        console.error('Error type:', error?.constructor?.name);
        console.error('Error message:', error?.message);
        console.error('Error stack:', error?.stack);
        return res.status(500).json({ error: 'Internal server error', details: error?.message });
    }
};

const createCitiesAndCountries = async (entries: Queue[]) => {
    console.log('\n--- Creating cities and countries ---');
    console.log('Processing', entries.length, 'entries');
    const cityCountryPairs = entries.map(entry => ({
        city: entry.city,
        country: entry.country,
    }));
    console.log('City-Country pairs:', cityCountryPairs);

    for (const { city, country } of cityCountryPairs) {
        console.log(`Processing: ${city}, ${country}`);
        let countryRecord = await Country.findOne({ where: { name: country } });
        if (!countryRecord) {
            console.log(`Creating new country: ${country}`);
            countryRecord = await Country.create({ name: country });
        } else {
            console.log(`Country exists: ${country} (ID: ${countryRecord.id})`);
        }

        let cityRecord = await City.findOne({ where: { name: city, country_id: countryRecord.id } });
        if (!cityRecord) {
            console.log(`Creating new city: ${city}`);
            await City.create({ name: city, country_id: countryRecord.id });
        } else {
            console.log(`City exists: ${city} (ID: ${cityRecord.id})`);
        }
    }
    console.log('Cities and countries processing complete');
};

const getOldestQueueEntries = async (count: number) => {
    console.log('\n--- Getting oldest queue entries ---');
    console.log('Requested count:', count);
    try {
        const oldestEntries = await Queue.findAll({
            where: {
                processed: false,
            },
            order: [['createdAt', 'ASC']],
            limit: count,
        });
        console.log('Found', oldestEntries.length, 'unprocessed entries');
        if (oldestEntries.length > 0) {
            console.log('First entry:', {
                id: oldestEntries[0].id,
                id_tomexplore: oldestEntries[0].id_tomexplore,
                name_en: oldestEntries[0].name_en,
                type: oldestEntries[0].type,
                city: oldestEntries[0].city,
                country: oldestEntries[0].country
            });
        }

        if (oldestEntries.length === 0) {
            console.log('No unprocessed entries found');
            return null;
        }

        return oldestEntries;
    } catch (error: any) {
        console.error('!!! ERROR retrieving oldest queue entries !!!');
        console.error('Error message:', error?.message);
        console.error('Error stack:', error?.stack);
    }
};

const sortQueueByType = (entries: Queue[]) => {
    console.log('\n--- Sorting queue by type ---');
    console.log('Total entries to sort:', entries.length);
    console.log('Entry types:', entries.map(e => ({ id: e.id_tomexplore, type: e.type })));
    
    const businessEntries = entries.filter(entry => entry.type === 'business');
    const touristAttractionEntries = entries.filter(entry => entry.type === 'tourist_attraction');
    
    console.log('After filtering:');
    console.log('- Business entries:', businessEntries.length);
    console.log('- Tourist attraction entries:', touristAttractionEntries.length);

    return {
        business: businessEntries,
        tourist_attraction: touristAttractionEntries,
    };
};
export const checkProcessedEntries = async (req: Request, res: Response) => {
    const places: Queue[] = []
    try {
        const processedEntries = await Queue.findAll({
            where: {
                processed: true,
            },
        });

        for (const entry of processedEntries) {
            const placeExists = await Place.findOne({
                where: { id_tomexplore: entry.id_tomexplore },
            });

            if (!placeExists) {
                await Queue.update(
                    { processed: false },
                    { where: { id_tomexplore: entry.id_tomexplore } }
                );
                console.log(`Processed entry with ID ${entry.id_tomexplore} reset to false because the corresponding place was not found.`);
                places.push(entry);
            }
        }
        console.log('Check for processed entries completed.');
        return res.status(200).json(places);
    } catch (error) {
        console.error('Error checking processed entries:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const checkAndResetErrorPlaces = async (req: Request, res: Response) => {
    try {
        const errorPlaces = await Place.findAll({
            where: {
                details: {
                    [Op.like]: '%Navigation timeout of 30000 ms exceeded%'
                }
            }
        });

        if (errorPlaces.length === 0) {
            return res.status(204).json({ message: 'No places found with the specified errors.' });
        }

        const errorPlaceIds = errorPlaces.map(place => place.id_tomexplore);

        await Queue.update(
            { processed: false },
            {
                where: {
                    id_tomexplore: {
                        [Op.in]: errorPlaceIds
                    }
                }
            }
        );

        await Place.destroy({
            where: {
                id_tomexplore: {
                    [Op.in]: errorPlaceIds
                }
            }
        });

        console.log(`Processed entries reset and places with errors deleted: ${errorPlaceIds.length} entries.`);

        return res.status(200).json({
            message: `${errorPlaceIds.length} places with errors were processed and deleted.`, errorPlaces
        });

    } catch (error) {
        console.error('Error processing places with errors:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
