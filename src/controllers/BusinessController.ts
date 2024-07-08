import { Request, Response } from 'express';
import * as InstagramController from './InstagramController';
import * as GoogleController from './GoogleController';
import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export async function getPhotos(req: Request, res: Response): Promise<void> {
    const { username, googleUrl } = req.body;

    if (!username || !googleUrl) {
        res.status(400).json({ error: 'Username and Google URL are required' });
        return;
    }

    try {
        const instagramImages = await InstagramController.fetchInstagramImages({ body: { username } } as Request);
        const googleImages = await GoogleController.fetchGoogleImgsFromBusinessPage({ body: { url: googleUrl } } as Request);

        const imageUrls = [...instagramImages.map(url => ({ url, prefix: 'i_' })), ...googleImages.map(url => ({ url, prefix: 'g_' }))];

        if (imageUrls.length > 0) {
            const downloadDir = path.join(__dirname, '..', 'temp', username);
            fs.mkdirSync(downloadDir, { recursive: true });

            await Promise.all(imageUrls.map(async ({ url, prefix }, index) => {
                try {
                    const response = await axios.get(url, { responseType: 'arraybuffer' });
                    const imageBuffer = Buffer.from(response.data);
                    const outputPath = path.join(downloadDir, `${prefix}${username}_${index}.jpg`);

                    // Delete the file if it already exists
                    if (fs.existsSync(outputPath)) {
                        fs.unlinkSync(outputPath);
                    }

                    await sharp(imageBuffer).toFile(outputPath);
                } catch (error) {
                    console.error(`Failed to download image at ${url}:`, error);
                }
            }));

            res.json({ downloadDir });
        } else {
            res.status(404).json({ error: 'No image URLs found' });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}
