import { Request, Response } from 'express';
import * as InstagramController from './scraping/InstagramController';
import * as GoogleController from './scraping/GoogleController';
import * as FileController from './FileController';
// import * as WikipediaController from './scraping/WikipediaController';
import * as UnsplashController from './scraping/UnsplashController';
import * as WikimediaController from './scraping/WikimediaController'

export async function getPhotosBusiness(req: Request, res: Response): Promise<void> {
    const { username, location_full_address } = req.body;
    if (!username || !location_full_address) {
        res.status(400).json({ error: 'Username and Google URL are required' });
        return;
    }
    try {
        const instagramImages = await InstagramController.fetchInstagramImages({ body: { username } } as Request);
        const googleImages = await GoogleController.fetchGoogleImgsFromBusinessPage({ body: { location_full_address: location_full_address } } as Request);
        const result = await FileController.downloadPhotosBusiness(username, instagramImages, googleImages);
        res.json({ downloadDir: result.downloadDir, imageCount: result.imageCount });
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
        const wikiMediaResult = await WikimediaController.wikiMediaSearch({ body: { name } } as Request);
        let result, downloadDir, imageCount;

        if (famous === "true") {
            const unsplashResult = await UnsplashController.unsplashSearch({ body: { name } } as Request);
            result = await FileController.downloadPhotosTouristAttraction(name, wikiMediaResult, unsplashResult);
        } else if (famous === "false") {
            result = await FileController.downloadPhotosTouristAttraction(name, wikiMediaResult);
        } else {
            res.status(400).json({ error: 'Field "famous" must be "true" or "false' });
            return;
        }

        downloadDir = result.downloadDir;
        imageCount = result.imageCount;

        res.json({ downloadDir: downloadDir.replace(/\\/g, '/'), imageCount });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}
