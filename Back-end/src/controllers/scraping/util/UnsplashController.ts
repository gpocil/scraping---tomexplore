import { Request, Response } from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as ProxyController from '../ProxyController';
import { config } from '../../../config';

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
        const proxy = ProxyController.getRandomProxy();
        console.log("Using proxy: " + proxy.address);

        browser = await puppeteer.launch({
            headless: config.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--start-fullscreen',
                `--proxy-server=${proxy.address}`,
            ],
        });
        console.log('Browser launched');
        const page = await browser.newPage();
        console.log('New page opened');

        await page.authenticate({ username: proxy.username, password: proxy.pw });

        await page.goto(searchUrl, { waitUntil: 'networkidle2' });
        console.log(`Navigated to ${searchUrl}`);

        // Fonction de défilement
        await page.evaluate(async () => {
            const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
            const scrollHeight = document.body.scrollHeight;

            for (let i = 0; i < scrollHeight / window.innerHeight; i++) {
                window.scrollBy(0, window.innerHeight);
                await delay(1000);
            }
        });

        // Attendre le chargement des images après le défilement
        await page.waitForTimeout(1323);

        const imageUrls = await page.evaluate(() => {
            const images: [string, string, string][] = [];
            document.querySelectorAll('img').forEach((img: HTMLImageElement) => {
                const src = img.src;
                if (src.startsWith('https://images.unsplash.com/photo') || src.startsWith('https://images.unsplash.com/flagged/photo')) {
                    images.push([src, img.width.toString(), img.height.toString()]);
                }
            });
            return images;
        });

        console.log('Images extracted:', imageUrls.length);

        if (res) {
            res.status(200).json({
                urls: imageUrls,
                count: imageUrls.length,
                link: searchUrl
            });
        }
        return {
            urls: imageUrls,
            count: imageUrls.length,
            link: searchUrl
        };
    } catch (error) {
        console.error('Error:', error);
        const errorMessage = 'Error occurred during image search';
        if (res) {
            res.status(500).json({ error: errorMessage });
        }
        return {
            urls: [],
            count: 0,
            error: errorMessage,
            link: ""
        };
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed');
        }
    }
}
