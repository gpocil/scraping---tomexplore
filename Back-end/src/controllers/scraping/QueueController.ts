import express, { Request, Response } from 'express';
import { Queue } from '../../models';
import * as ScrapingMainController from './ScrapingMainController'


export const launchScraping = async (req: Request, res: Response) => {
    const { count } = req.query;

    const entriesCount = parseInt(count as string, 10);
    if (isNaN(entriesCount) || entriesCount <= 0) {
        return res.status(400).json({ error: 'The count parameter must be a positive integer.' });
    }

    try {
        const oldestEntries = await getOldestQueueEntries(entriesCount);

        if (!oldestEntries) {
            return res.status(204).json({ message: 'No entries found in the queue.' });
        }

        const sortedEntries = sortQueueByType(oldestEntries);
        const businessEntries = sortedEntries.business;
        const touristAttractionEntries = sortedEntries.tourist_attraction;

        try {
            await Promise.all([//Permet de faire tourner simultanément les 2
                ScrapingMainController.getPhotosBusiness({ body: businessEntries } as Request),
                ScrapingMainController.getPhotosTouristAttraction({ body: touristAttractionEntries } as Request)
            ]);

            const updateProcessedEntries = async (entries: Queue[]) => {
                await Promise.all(entries.map(async (entry) => {
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

            await updateProcessedEntries(businessEntries);
            await updateProcessedEntries(touristAttractionEntries);
            return res.status(200).json({ message: 'Scraping process completed successfully' });
        } catch (error) {
            console.error('Error during scraping:', error);
            return res.status(500).json({ error: 'Internal server error during scraping' });
        }
    } catch (error) {
        console.error('Error launching scraping:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const getOldestQueueEntries = async (count: number) => {
    try {
        const oldestEntries = await Queue.findAll({
            where: {
                processed: false,
            },
            order: [['createdAt', 'ASC']],
            limit: count,
        });

        if (oldestEntries.length === 0) {
            return null;
        }

        return oldestEntries;
    } catch (error) {
        console.error('Error retrieving oldest queue entries:', error);
    }
};

const sortQueueByType = (entries: Queue[]) => {
    const businessEntries = entries.filter(entry => entry.type === 'business');
    const touristAttractionEntries = entries.filter(entry => entry.type === 'tourist_attraction');

    return {
        business: businessEntries,
        tourist_attraction: touristAttractionEntries,
    };
};
