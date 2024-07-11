import { Request, Response } from 'express';
import * as InstagramController from './scraping/InstagramController';
import * as GoogleController from './scraping/GoogleController';
import * as FileController from './FileController';
// import * as WikipediaController from './scraping/WikipediaController';
import * as UnsplashController from './scraping/UnsplashController';
import * as WikimediaController from './scraping/WikimediaController'

interface ImageResultBusiness {
    urls: string[];
    count: number;
    error?: string;
}
interface ImageResultTourist {
    urls: [string, string][];
    count: number;
    error?: string;
}
export async function getPhotosBusiness(req: Request, res: Response): Promise<void> {
    const { username, location_full_address } = req.body;
    if (!username || !location_full_address) {
        res.status(400).json({ error: 'Username and Google URL are required' });
        return;
    }

    let instagramImages: ImageResultBusiness = { urls: [], count: 0 };
    let googleImages: ImageResultBusiness = { urls: [], count: 0 };
    let errors: string[] = [];

    try {
        instagramImages = await InstagramController.fetchInstagramImages({ body: { username } } as Request);
        if (instagramImages.error) errors.push(instagramImages.error);
    } catch (error: any) {
        console.error(`Error fetching Instagram images: ${error.message}`);
        errors.push(`Error fetching Instagram images: ${error.message}`);
        instagramImages.error = `Error fetching Instagram images: ${error.message}`;
    }

    try {
        googleImages = await GoogleController.fetchGoogleImgsFromBusinessPage({ body: { location_full_address: location_full_address } } as Request);
        if (googleImages.error) errors.push(googleImages.error);
    } catch (error: any) {
        console.error(`Error fetching Google images: ${error.message}`);
        errors.push(`Error fetching Google images: ${error.message}`);
        googleImages.error = `Error fetching Google images: ${error.message}`;
    }

    if (instagramImages.urls.length === 0 && googleImages.urls.length === 0) {
        res.status(500).json({ error: 'Failed to fetch images from both Instagram and Google', details: errors });
        return;
    }

    try {
        const result = await FileController.downloadPhotosBusiness(username, instagramImages, googleImages);
        res.json({
            downloadDir: result.downloadDir,
            imageCount: result.imageCount,
            instagramError: instagramImages.error,
            googleError: googleImages.error,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error: any) {
        console.error(`Error downloading photos: ${error.message}`);
        res.status(500).json({ error: `Error downloading photos: ${error.message}`, details: errors });
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

    let wikiMediaResult: ImageResultTourist = { urls: [], count: 0 };
    let unsplashResult: ImageResultTourist = { urls: [], count: 0 };
    let errors: string[] = [];

    try {
        wikiMediaResult = await WikimediaController.wikiMediaSearch({ body: { name } } as Request);
        if (wikiMediaResult.error) errors.push(wikiMediaResult.error);
    } catch (error: any) {
        console.error(`Error fetching Wikimedia images: ${error.message}`);
        errors.push(`Error fetching Wikimedia images: ${error.message}`);
        wikiMediaResult.error = `Error fetching Wikimedia images: ${error.message}`;
    }

    if (famous === "true") {
        try {
            unsplashResult = await UnsplashController.unsplashSearch({ body: { name } } as Request);
            if (unsplashResult.error) errors.push(unsplashResult.error);
        } catch (error: any) {
            console.error(`Error fetching Unsplash images: ${error.message}`);
            errors.push(`Error fetching Unsplash images: ${error.message}`);
            unsplashResult.error = `Error fetching Unsplash images: ${error.message}`;
        }
    } else if (famous !== "false") {
        res.status(400).json({ error: 'Field "famous" must be "true" or "false"' });
        return;
    }

    // Check if both calls failed
    if (wikiMediaResult.urls.length === 0 && unsplashResult.urls.length === 0) {
        res.status(500).json({ error: 'Failed to fetch images from both Wikimedia and Unsplash', details: errors });
        return;
    }

    try {
        const result = await FileController.downloadPhotosTouristAttraction(name, wikiMediaResult, unsplashResult);
        res.json({
            downloadDir: result.downloadDir.replace(/\\/g, '/'),
            imageCount: result.imageCount,
            wikiMediaError: wikiMediaResult.error,
            unsplashError: unsplashResult.error,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error: any) {
        console.error(`Error downloading photos: ${error.message}`);
        res.status(500).json({ error: `Error downloading photos: ${error.message}`, details: errors });
    }
}
