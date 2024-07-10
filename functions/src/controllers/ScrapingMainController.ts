import { Request, Response } from 'express';
import * as InstagramController from './scraping/InstagramController';
import * as GoogleController from './scraping/GoogleController';
import * as FileController from './FileController';
import * as WikipediaController from './scraping/WikipediaController';
import * as UnsplashController from './scraping/UnsplashController';


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
    const { name, famous } = req.body;
    if (!name) {
        res.status(400).json({ error: 'Name required' });
        return;
    }
    if (!famous) {
        res.status(400).json({ error: 'Field "famous" required' });
        return;
    }
    try {
        const wikipediaUrls = await WikipediaController.googleSearch({ body: { name } } as Request);
        if (famous === "true") {
            const unsplashUrls = await UnsplashController.unsplashSearch({ body: { name } } as Request);
            const downloadDir = await FileController.downloadPhotosTouristAttraction(name, wikipediaUrls, unsplashUrls);
            res.json({ downloadDir: downloadDir.replace(/\\/g, '/') });
        }
        else if (famous === "false") {
            const downloadDir = await FileController.downloadPhotosTouristAttraction(name, wikipediaUrls);
            res.json({ downloadDir: downloadDir.replace(/\\/g, '/') });
        }
        else {
            res.status(400).json({ error: 'Field "famous" must be "true" or "false' });
            return;
        }

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}