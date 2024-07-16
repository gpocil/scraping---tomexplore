import { Request, Response } from 'express';
import { Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

interface ImageResultTourist {
    urls: [string, string, string][];
    count: number;
    error?: string;
    link: string;
}

export async function unsplashSearch(req?: Request, res?: Response): Promise<ImageResultTourist> {
    const name = req ? (req.body.name as string).replace(/\s+/g, '-') : '';
    const searchUrl = `https://unsplash.com/s/photos/${name}`;

    if (!name) {
        const error = 'Name is required';
        if (res) {
            console.log(error);
            res.status(400).json({ error });
        }
        return { urls: [], count: 0, error, link: "" };
    }

    let browser;
    try {
        console.log(`Launching browser for search: ${name}`);
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
            defaultViewport: null // Use the full window size
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        await page.goto(searchUrl, {
            waitUntil: 'networkidle2',
        });
        await page.waitForSelector('div.fWieE', { timeout: 5000 });

        console.log('Scraping images from Unsplash');
        const result = await scrapeUnsplashImages(page);

        await browser.close();
        const finalResult = { ...result, link: searchUrl };
        if (res) {
            res.json(finalResult);
        }
        console.log(finalResult);
        return finalResult;

    } catch (error: any) {
        console.error(`Error during search process: ${error.message}`);
        if (browser) {
            await browser.close();
        }
        const errorMessage = `Error during search process: ${error.message}`;
        if (res) {
            res.status(500).json({ error: errorMessage });
        }
        return { urls: [], count: 0, error: errorMessage, link: "" };
    }
}

async function scrapeUnsplashImages(page: Page): Promise<{ urls: [string, string, string][], count: number }> {
    try {
        return await page.evaluate(() => {
            const imageElements = Array.from(document.querySelectorAll('div.fWieE img[srcset]'));
            const images: [string, string, string][] = [];

            console.log(`Found ${imageElements.length} image elements`);

            imageElements.slice(0, 50).forEach((img, index) => {
                console.log(`Processing image ${index + 1}`);
                const srcset = img.getAttribute('srcset');
                if (srcset) {
                    const match = srcset.match(/https:\/\/images\.unsplash\.com[^\s]+w=600[^\s]*/);
                    if (match) {
                        const imageUrl = match[0];
                        const parentDiv = img.closest('div.fWieE');
                        if (parentDiv) {
                            const authorElement = parentDiv.querySelector('a.BkSVh');
                            if (authorElement) {
                                const authorName = authorElement.textContent?.trim() || 'Unknown';
                                console.log(`Found image by ${authorName}`);
                                images.push([imageUrl, authorName, `Photo by ${authorName} on <a href="https://unsplash.com/" target="_blank">Unsplash</a>`]);
                            }
                        }
                    }
                }
            });

            return { urls: images, count: images.length };
        });
    } catch (error: any) {
        console.error(`Error during image scraping: ${error.message}`);
        throw new Error(`Error during image scraping: ${error.message}`);
    }
}
