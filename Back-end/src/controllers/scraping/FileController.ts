import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import axios from 'axios';
import sharp from 'sharp';
import { Image } from '../../models';
import { Place } from '../../models';

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


interface Url {
    url: string;
    generatedName: string;
}

export async function downloadPhotosBusiness(name_en: string, id_tomexplore: number, instagramImages: { urls: string[], count: number }, googleImages: { urls: string[], count: number }): Promise<{ downloadDir: string, imageCount: number, imageNames: string[] }> {
    const imageUrls: Url[] = [
        ...instagramImages.urls.map(url => ({ url, generatedName: `${id_tomexplore}_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg` })),
        ...googleImages.urls.map(url => ({ url, generatedName: `${id_tomexplore}_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg` }))
    ];

    if (imageUrls.length > 0) {
        const downloadDir = path.join(__dirname, '../..', 'temp', id_tomexplore.toString() + '-' + name_en);
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
    license: string;
    author: string;
    generatedName: string;
}

export async function downloadPhotosTouristAttraction(name_en: string, id_tomexplore: number, wikiMediaUrls: { urls: [string, string, string][]; count: number }, unsplashUrls: { urls: [string, string, string][]; count: number } = { urls: [], count: 0 }): Promise<{ downloadDir: string, imageCount: number, imageNames: string[] }> {
    const imageUrls: ImageUrl[] = [
        ...wikiMediaUrls.urls.map(([url, license, author]) => ({ url, license, author, generatedName: `${id_tomexplore}_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg` })),
        ...unsplashUrls.urls.map(([url, license, author]) => ({ url, license, author, generatedName: `${id_tomexplore}_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg` }))
    ];

    const downloadDir = path.join(__dirname, '../..', 'temp', id_tomexplore.toString() + '-' + name_en);

    if (imageUrls.length > 0) {
        fs.mkdirSync(downloadDir, { recursive: true });

        const photosWithLicenses: { filename: string; license: string }[] = [];
        const imageNames: string[] = [];

        await Promise.all(imageUrls.map(async ({ url, license }, index) => {
            try {
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                const imageBuffer = Buffer.from(response.data);
                const filename = `${id_tomexplore}_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
                const outputPath = path.join(downloadDir, filename);

                // Delete the file if it already exists
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
                await sharp(imageBuffer).toFile(outputPath);

                // Add the photo and its license to the list
                photosWithLicenses.push({ filename, license });
                imageNames.push(filename);
            } catch (error) {
                console.error(`Failed to download image at ${url}:`, error);
            }
        }));

        // Write the JSON file with photo names and licenses
        const jsonOutputPath = path.join(downloadDir, 'photo_licenses.json');
        fs.writeFileSync(jsonOutputPath, JSON.stringify(photosWithLicenses, null, 2), 'utf-8');

        console.log('download dir : ' + downloadDir);
        return { downloadDir, imageCount: imageUrls.length, imageNames };
    }
    return { downloadDir: '', imageCount: 0, imageNames: [] };
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
        const folder = image.getDataValue('associatedPlace').folder;
        const imagePath = path.join(__dirname, '../..', 'temp', folder, image.image_name);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
    });
}

