import { Request, Response } from 'express';
import * as InstagramController from './scraping/InstagramController';
import * as GoogleController from './scraping/GoogleController';
import * as FileController from './FileController';
import * as WikipediaController from './scraping/WikipediaController'


export async function getPhotosBusiness(req: Request, res: Response): Promise<void> {
    const { username, location_full_address } = req.body;
    if (!username || !location_full_address) {
        res.status(400).json({ error: 'Username and Google URL are required' });
        return;
    }
    try {
        const instagramImages = await InstagramController.fetchInstagramImages({ body: { username } } as Request);
        const googleImages = await GoogleController.fetchGoogleImgsFromBusinessPage({ body: { location_full_address: location_full_address } } as Request);
        const downloadDir = await FileController.downloadPhotosBusiness(username, instagramImages, googleImages);
        res.json({ downloadDir });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}
export async function getPhotosTouristAttraction(req: Request, res: Response): Promise<void> {
    const { name } = req.body;
    if (!name) {
        res.status(400).json({ error: 'Name required' });
        return;
    }
    try {
        const wikipediaUrls = await WikipediaController.googleSearch({ body: { name } } as Request);
        // const unsplashUrls = await WikipediaController.googleSearch({ body: { name } } as Request);
        const downloadDir = await FileController.downloadPhotosTouristAttraction(name, wikipediaUrls, wikipediaUrls);

        res.json({ downloadDir: downloadDir.replace(/\\/g, '/') });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}