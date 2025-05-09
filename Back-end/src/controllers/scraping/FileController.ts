import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import axios from 'axios';
import sharp from 'sharp';
import { Image } from '../../models';
import { Place } from '../../models';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { promisify } from 'util';

export function deleteFolderRecursive(req: Request, res: Response): void {
    const name = req.params.name;

    if (!name) {
        res.status(400).json({ error: 'Folder name is required' });
        return;
    }

    const folderPath = path.join(__dirname, '..', 'temp', name);

    try {
        if (fs.existsSync(folderPath)) {
            fs.readdirSync(folderPath).forEach((file) => {
                const currentPath = path.join(folderPath, file);

                if (fs.lstatSync(currentPath).isDirectory()) {
                    // Recursively delete subdirectory
                    deleteFolderRecursiveHelper(currentPath);
                } else {
                    // Delete file
                    fs.unlinkSync(currentPath);
                }
            });

            // Delete the now-empty folder
            fs.rmdirSync(folderPath);
            console.log(`Deleted folder: ${folderPath}`);
            res.status(200).json({ message: `Folder '${name}' and all its contents have been deleted.` });
        } else {
            res.status(404).json({ error: `Folder not found: ${folderPath}` });
        }
    } catch (error: any) {
        console.error(`Error deleting folder '${name}': ${error.message}`);
        res.status(500).json({ error: `Error deleting folder '${name}': ${error.message}` });
    }
}

export function deleteFolderRecursiveHelper(folderPath: string): void {
    fs.readdirSync(folderPath).forEach((file) => {
        const currentPath = path.join(folderPath, file);

        if (fs.lstatSync(currentPath).isDirectory()) {
            // Recursively delete subdirectory
            deleteFolderRecursiveHelper(currentPath);
        } else {
            // Delete file
            fs.unlinkSync(currentPath);
        }
    });

    // Delete the now-empty folder
    fs.rmdirSync(folderPath);
}
export async function deleteImagesByID(imageIds: number[]): Promise<void> {

    await Image.destroy({ where: { id: imageIds } });   



}


interface Url {
    url: string;
    generatedName: string;
}

export async function downloadPhotosBusiness(id_tomexplore: number, instagramImages: { urls: string[], count: number }, googleImages: { urls: string[], count: number }): Promise<{ downloadDir: string, imageCount: number, imageNames: string[] }> {
    const imageUrls: Url[] = [
        ...instagramImages.urls.map(url => ({ url, generatedName: `${id_tomexplore}_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg` })),
        ...googleImages.urls.map(url => ({ url, generatedName: `${id_tomexplore}_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg` }))
    ];

    if (imageUrls.length > 0) {
        const downloadDir = path.join(__dirname, '../../../dist', 'temp', id_tomexplore.toString());
        fs.mkdirSync(downloadDir, { recursive: true });

        await Promise.all(imageUrls.map(async ({ url, generatedName }) => {
            try {
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                const imageBuffer = Buffer.from(response.data);
                const outputPath = path.join(downloadDir, generatedName);

                // Delete the file if it already exists
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
                await sharp(imageBuffer).toFile(outputPath);
            } catch (error) {
                console.error(`Failed to download image at ${url}:`, error);
            }
        }));

        console.log('download dir : ' + downloadDir);
        return { downloadDir, imageCount: imageUrls.length, imageNames: imageUrls.map(({ generatedName }) => generatedName) };
    }
    return { downloadDir: '', imageCount: 0, imageNames: [] };
}

interface ImageUrl {
    url: string;
    license?: string;
    author?: string;
    generatedName: string;
    source?:string;
}

const sleep = promisify(setTimeout);

async function fetchWithRetry(url: string, retries = 3, delay = 2000): Promise<Buffer | null> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            return Buffer.from(response.data);
        } catch (error: any) {
            if (error.response?.status === 429 && i < retries - 1) {
                console.warn(`429 error, retrying in ${delay}ms...`);
                await sleep(delay);
                delay *= 2; // Exponential backoff
            } else {
                console.error(`Failed to download image from ${url}: ${error.message}`);
                return null;
            }
        }
    }
    return null;
}

export async function downloadPhotosTouristAttraction(
    id_tomexplore: number,
    wikiMediaUrls: { urls: [string, string, string][]; count: number, source: string },
    unsplashUrls: { urls: [string, string, string][]; count: number, source: string },
    instagramImages: { urls: string[], count: number, source: string } = { urls: [], count: 0, source: "Instagram" },
    googleImages: { urls: string[], count: number, source: string } = { urls: [], count: 0, source: "Google" }
): Promise<{
    downloadDir: string, imageCount: number, imageNames: { filename: string, source: string }[]
}> {
    const downloadDir = path.join(__dirname, '../../../dist', 'temp', id_tomexplore.toString());
    fs.mkdirSync(downloadDir, { recursive: true });

    const imageUrls = [
        ...wikiMediaUrls.urls.map(([url, license, author]) => ({ url, source: wikiMediaUrls.source })),
        ...unsplashUrls.urls.map(([url]) => ({ url, source: unsplashUrls.source })),
        ...instagramImages.urls.map(url => ({ url, source: instagramImages.source })),
        ...googleImages.urls.map(url => ({ url, source: googleImages.source }))
    ];

    const imageNames: { filename: string, source: string }[] = [];
    for (const { url, source } of imageUrls) {
        console.log("retrying");
        const imageBuffer = await fetchWithRetry(url);
        if (imageBuffer) {
            const filename = `${id_tomexplore}_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
            const outputPath = path.join(downloadDir, filename);
            await sharp(imageBuffer).toFile(outputPath);
            imageNames.push({ filename, source });
        }
    }

    console.log(`Download directory: ${downloadDir}`);
    return { downloadDir, imageCount: imageNames.length, imageNames };
}

export async function deleteImages(imageIds: number[]): Promise<void> {
    // Include Place model to access the folder property
    const images = await Image.findAll({
        where: { id: imageIds },
        include: [{ model: Place, as: 'associatedPlace', attributes: ['folder'] }]
    });

    if (images.length === 0) {
        throw new Error('No images found for the provided IDs');
    }

    // Delete images from database
    await Image.destroy({ where: { id: imageIds } });

    // Delete image files from server
    images.forEach(image => {
        try {
            const folder = image.getDataValue('associatedPlace').folder;
            const imagePath = path.join(__dirname, '../../../dist', 'temp', folder, image.image_name);
            console.log(`Deleting image file: ${imagePath}`);

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        } catch (error) {
            const folder = image.getDataValue('associatedPlace').folder;
            const imagePath = path.join(__dirname, '../../../dist', 'temp', folder, image.image_name);
            console.error(`Failed to delete image file for ID ${image.id}: ${imagePath}`, error);
        }
    });
}


interface ImageUrl {
    url: string;
    generatedName: string;
}

