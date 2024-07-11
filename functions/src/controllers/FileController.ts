import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import axios from 'axios';
import sharp from 'sharp';


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
    prefix: string;
}
export async function downloadPhotosBusiness(username: string, instagramImages: { urls: string[], count: number }, googleImages: { urls: string[], count: number }): Promise<{ downloadDir: string, imageCount: number }> {
    const imageUrls: Url[] = [
        ...instagramImages.urls.map(url => ({ url, prefix: 'i_' })),
        ...googleImages.urls.map(url => ({ url, prefix: 'g_' }))
    ];
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

        console.log('download dir : ' + downloadDir);
        return { downloadDir, imageCount: imageUrls.length };
    }
    return { downloadDir: '', imageCount: 0 };
}

interface ImageUrl {
    url: string;
    license: string;
    prefix: string;
}


export async function downloadPhotosTouristAttraction(name: string, wikiMediaUrls: { urls: [string, string][]; count: number }, unsplashUrls: { urls: [string, string][]; count: number } = { urls: [], count: 0 }): Promise<{ downloadDir: string, imageCount: number }> {
    const imageUrls: ImageUrl[] = [
        ...wikiMediaUrls.urls.map(([url, license]) => ({ url, license, prefix: 'w_' })),
        ...unsplashUrls.urls.map(([url, license]) => ({ url, license, prefix: 'u_' }))
    ];
    const downloadDir = path.join(__dirname, '..', 'temp', name);

    if (imageUrls.length > 0) {
        fs.mkdirSync(downloadDir, { recursive: true });

        const photosWithLicenses: { filename: string; license: string }[] = [];

        await Promise.all(imageUrls.map(async ({ url, license, prefix }, index) => {
            try {
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                const imageBuffer = Buffer.from(response.data);
                const filename = `${prefix}${name}_${index}.jpg`;
                const outputPath = path.join(downloadDir, filename);

                // Delete the file if it already exists
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
                await sharp(imageBuffer).toFile(outputPath);

                // Add the photo and its license to the list
                photosWithLicenses.push({ filename, license });

            } catch (error) {
                console.error(`Failed to download image at ${url}:`, error);
            }
        }));

        // Write the JSON file with photo names and licenses
        const jsonOutputPath = path.join(downloadDir, 'photo_licenses.json');
        fs.writeFileSync(jsonOutputPath, JSON.stringify(photosWithLicenses, null, 2), 'utf-8');

        console.log('download dir : ' + downloadDir);
    }
    return { downloadDir, imageCount: imageUrls.length };
}
