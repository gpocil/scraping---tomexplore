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
    source?: string;
}

const sleep = promisify(setTimeout);

async function fetchWithRetry(url: string, retries = 3, delay = 2000): Promise<Buffer | null> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, { 
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://commons.wikimedia.org/',
                    'Sec-Fetch-Dest': 'image',
                    'Sec-Fetch-Mode': 'no-cors',
                    'Sec-Fetch-Site': 'same-site'
                }
            });
            return Buffer.from(response.data);
        } catch (error: any) {
            if ((error.response?.status === 429 || error.response?.status === 403) && i < retries - 1) {
                console.warn(`[RETRY ${i + 1}/${retries - 1}] ${error.response?.status} error for ${url.substring(0, 80)}..., waiting ${delay}ms`);
                await sleep(delay);
                delay *= 2; // Exponential backoff
            } else if (i === retries - 1) {
                console.error(`[FAILED] Could not download after ${retries} attempts: ${url.substring(0, 80)}...`);
                return null;
            }
        }
    }
    return null;
}

async function downloadWithConcurrency(
    imageUrls: { url: string, source: string }[],
    downloadDir: string,
    id_tomexplore: number,
    concurrency: number = 5
): Promise<{ filename: string, source: string }[]> {
    const results: { filename: string, source: string }[] = [];
    let downloadedCount = 0;
    let failedCount = 0;

    const downloadImage = async (item: { url: string, source: string }) => {
        const imageBuffer = await fetchWithRetry(item.url);
        if (imageBuffer) {
            const filename = `${id_tomexplore}_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
            const outputPath = path.join(downloadDir, filename);
            await sharp(imageBuffer).toFile(outputPath);
            downloadedCount++;
            console.log(`[${downloadedCount + failedCount}/${imageUrls.length}] ✓ Downloaded from ${item.source}`);
            return { filename, source: item.source };
        } else {
            failedCount++;
            console.log(`[${downloadedCount + failedCount}/${imageUrls.length}] ✗ Failed from ${item.source}`);
            return null;
        }
    };

    // Process in batches with concurrency limit
    for (let i = 0; i < imageUrls.length; i += concurrency) {
        const batch = imageUrls.slice(i, i + concurrency);
        const batchResults = await Promise.all(batch.map(downloadImage));
        results.push(...batchResults.filter((r): r is { filename: string, source: string } => r !== null));
    }

    return results;
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

    console.log(`Starting parallel download of ${imageUrls.length} images (concurrency: 5)...`);
    const imageNames = await downloadWithConcurrency(imageUrls, downloadDir, id_tomexplore, 5);

    console.log(`Download complete: ${imageNames.length}/${imageUrls.length} successful`);
    console.log(`Download directory: ${downloadDir}`);
    return { downloadDir, imageCount: imageNames.length, imageNames };
}

export async function deleteImages(imageIds: number[]): Promise<void> {
    console.log(`[DELETE] Starting deletion process for image IDs: ${JSON.stringify(imageIds)}`);

    // Include Place model to access the folder property
    console.log(`[DELETE] Fetching images and their associated places from database`);
    const images = await Image.findAll({
        where: { id: imageIds },
        include: [{ model: Place, as: 'associatedPlace', attributes: ['folder'] }]
    });

    console.log(`[DELETE] Found ${images.length} images in database`);
    console.log(`[DELETE] Image details: ${JSON.stringify(images.map(img => ({
        id: img.id,
        name: img.image_name,
        placeFolder: img.getDataValue('associatedPlace')?.folder || 'NO_FOLDER'
    })))}`);

    if (images.length === 0) {
        console.log(`[DELETE] No images found for the provided IDs: ${JSON.stringify(imageIds)}`);
        throw new Error('No images found for the provided IDs');
    }

    // Verify image files exist before deleting from database
    console.log(`[DELETE] Verifying image files exist on server`);
    const fileCheckResults = images.map(image => {
        try {
            const folder = image.getDataValue('associatedPlace')?.folder;
            if (!folder) {
                console.log(`[DELETE] Warning: Image ID ${image.id} has no associated place folder`);
                return { id: image.id, exists: false, path: 'NO_FOLDER' };
            }

            const imagePath = path.join(__dirname, '../../../dist', 'temp', folder, image.image_name);
            const exists = fs.existsSync(imagePath);
            console.log(`[DELETE] Image file check - ID: ${image.id}, Path: ${imagePath}, Exists: ${exists}`);
            return { id: image.id, exists, path: imagePath };
        } catch (error) {
            console.error(`[DELETE] Error checking file existence for image ID ${image.id}:`, error);
            return { id: image.id, exists: false, path: 'ERROR' };
        }
    });

    console.log(`[DELETE] File check results: ${JSON.stringify(fileCheckResults)}`);

    // Delete images from database
    console.log(`[DELETE] Deleting images from database`);
    const deleteResult = await Image.destroy({ where: { id: imageIds } });
    console.log(`[DELETE] Database deletion result: ${deleteResult} records deleted`);

    // Delete image files from server
    console.log(`[DELETE] Starting file deletion process`);
    const fileDeletionResults = [];

    for (const image of images) {
        try {
            const folder = image.getDataValue('associatedPlace')?.folder;
            if (!folder) {
                console.log(`[DELETE] Skipping file deletion for image ID ${image.id} - no folder found`);
                fileDeletionResults.push({ id: image.id, success: false, reason: 'No folder found' });
                continue;
            }

            const imagePath = path.join(__dirname, '../../../dist', 'temp', folder, image.image_name);
            console.log(`[DELETE] Attempting to delete file: ${imagePath}`);

            if (fs.existsSync(imagePath)) {
                try {
                    // Read file details before deletion for verification
                    const stats = fs.statSync(imagePath);
                    console.log(`[DELETE] File details before deletion - Size: ${stats.size} bytes, Created: ${stats.birthtime}`);

                    fs.unlinkSync(imagePath);
                    console.log(`[DELETE] Successfully deleted image file: ${imagePath}`);
                    fileDeletionResults.push({ id: image.id, success: true, path: imagePath });
                } catch (unlinkError) {
                    console.error(`[DELETE] Failed to unlink file ${imagePath}:`, unlinkError);
                    const errorMessage = unlinkError instanceof Error ? unlinkError.message : 'Unknown error';
                    fileDeletionResults.push({ id: image.id, success: false, error: errorMessage });
                }
            } else {
                console.log(`[DELETE] Image file does not exist: ${imagePath}`);
                fileDeletionResults.push({ id: image.id, success: false, reason: 'File does not exist' });
            }
        } catch (error) {
            const errorDetails = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[DELETE] Error processing deletion for image ID ${image.id}:`, error);
            fileDeletionResults.push({ id: image.id, success: false, error: errorDetails });
        }
    }

    console.log(`[DELETE] File deletion results: ${JSON.stringify(fileDeletionResults)}`);

    // Verify final state - check if any files still exist
    console.log(`[DELETE] Performing final verification`);
    const finalCheck = images.map(image => {
        try {
            const folder = image.getDataValue('associatedPlace')?.folder;
            if (!folder) return { id: image.id, stillExists: false, path: 'NO_FOLDER' };

            const imagePath = path.join(__dirname, '../../../dist', 'temp', folder, image.image_name);
            const stillExists = fs.existsSync(imagePath);
            console.log(`[DELETE] Final check - ID: ${image.id}, Path: ${imagePath}, Still exists: ${stillExists}`);
            return { id: image.id, stillExists, path: imagePath };
        } catch (error) {
            console.error(`[DELETE] Error in final check for image ID ${image.id}:`, error);
            return { id: image.id, error: true };
        }
    });

    console.log(`[DELETE] Final verification results: ${JSON.stringify(finalCheck)}`);
    console.log(`[DELETE] Deletion process completed`);
}


interface ImageUrl {
    url: string;
    generatedName: string;
}

