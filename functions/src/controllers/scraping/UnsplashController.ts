import { Request, Response } from 'express';
import puppeteer, { Page } from 'puppeteer';

export async function unsplashSearch(req?: Request, res?: Response): Promise<{ urls: [string, string][], count: number }> {
    const name = req ? (req.body.name as string).replace(/\s+/g, '-') : '';

    if (!name) {
        if (res) {
            console.log('Error: name is required');
            res.status(400).json({ error: 'name is required' });
        }
        return { urls: [], count: 0 };
    }

    try {
        console.log(`Launching browser for search: ${name}`);
        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
            defaultViewport: null // Use the full window size
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        await page.goto(`https://unsplash.com/s/photos/${name}`, {
            waitUntil: 'networkidle2',
        });
        await page.waitForSelector('div.fWieE', { timeout: 5000 });

        console.log('Scraping images from Unsplash');
        const result = await scrapeImages(page);

        await browser.close();
        if (res) {
            res.json(result);
        }
        console.log(result);
        return result;

    } catch (error: any) {
        console.error(`Error during search process: ${error.message}`);
        if (res) {
            res.status(500).json({ error: error.message });
        }
        return { urls: [], count: 0 };
    }
}

async function scrapeImages(page: Page): Promise<{ urls: [string, string][], count: number }> {
    return await page.evaluate(() => {
        const imageElements = Array.from(document.querySelectorAll('div.fWieE img[srcset]'));
        const images: [string, string][] = [];

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
                            images.push([imageUrl, `Photo by ${authorName} on <a href="https://unsplash.com/" target="_blank">Unsplash</a>`]);
                        }
                    }
                }
            }
        });

        return { urls: images, count: images.length };
    });
}
