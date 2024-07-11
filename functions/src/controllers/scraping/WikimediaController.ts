import { Request, Response } from 'express';
import { Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export async function wikiMediaSearch(req?: Request, res?: Response): Promise<{ urls: [string, string][], count: number, error?: string }> {
    const name = req ? req.body.name as string : '';

    if (!name) {
        const error = 'Name is required';
        if (res) {
            console.log(error);
            res.status(400).json({ error });
        }
        return { urls: [], count: 0, error };
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

        console.log('Navigating to Wikimedia Commons');
        await page.goto('https://commons.wikimedia.org/', {
            waitUntil: 'networkidle2',
        });

        console.log(`Typing search query: ${name}`);
        await page.type('#searchInput', name);

        console.log('Submitting the search form');
        await page.keyboard.press('Enter');

        await page.waitForSelector('a.sdms-image-result');

        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => {
                window.scrollBy(0, window.innerHeight);
            });
            await page.waitForTimeout(500);
        }

        const urls = await scrapeImages(page);
        console.log(urls);

        await browser.close();

        if (res) {
            res.status(200).json(urls);
        }

        return urls;
    } catch (error: any) {
        console.error(`Error during search process: ${error.message}`);
        if (browser) {
            await browser.close();
        }
        const errorMessage = `Error during search process: ${error.message}`;
        if (res) {
            res.status(500).json({ error: errorMessage });
        }
        return { urls: [], count: 0, error: errorMessage };
    }
}

export async function scrapeImages(page: Page): Promise<{ urls: [string, string][], count: number }> {
    console.log('Collecting image links...');

    try {
        const imageLinks = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a.sdms-image-result'));
            return links.map((link, index) => ({
                href: (link as HTMLAnchorElement).href,
                index
            }));
        });

        console.log(`Found ${imageLinks.length} image links. Processing `);
        const results: [string, string][] = [];

        for (const { index, href } of imageLinks.slice(0, 50)) {
            console.log(`Processing image ${index + 1}: ${href}`);

            await page.evaluate((i) => {
                const imageLink = document.querySelectorAll('a.sdms-image-result')[i] as HTMLAnchorElement;
                imageLink.click();
            }, index);

            await page.waitForSelector('p.sdms-quick-view__list-item.sdms-quick-view__license');

            const licenseText = await page.evaluate(() => {
                const licenseElement = document.querySelector('p.sdms-quick-view__list-item.sdms-quick-view__license a span');
                return licenseElement ? licenseElement.textContent : '';
            });

            console.log(`License for image ${index + 1}: ${licenseText}`);
            if (licenseText &&
                (licenseText.includes('Creative Commons Attribution-Share Alike 3.0') ||
                    licenseText.includes('Creative Commons Attribution-Share Alike 4.0') ||
                    licenseText.includes('Creative Commons Attribution-Share Alike 2.0') ||
                    licenseText.includes('Creative Commons Attribution 2.0') ||
                    licenseText.includes('Creative Commons Attribution 3.0') ||
                    licenseText.includes('Creative Commons Attribution 4.0'))
            ) {
                const authorAndLicense = await page.evaluate(() => {
                    const licenseElement = document.querySelector('p.sdms-quick-view__list-item.sdms-quick-view__license a span');
                    const authorElement = document.querySelector('p.sdms-quick-view__list-item.sdms-quick-view__artist bdi span a');

                    const licenseText = licenseElement ? licenseElement.textContent : '';
                    let authorText = authorElement ? authorElement.textContent : 'Anonyme';

                    if (!authorText) {
                        authorText = 'Anonyme';
                    }

                    let licenseLink = '';
                    if (licenseText) {
                        if (licenseText.includes('Creative Commons Attribution-Share Alike 3.0')) {
                            licenseLink = '<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank">Creative Commons Attribution-Share Alike 3.0</a>';
                        } else if (licenseText.includes('Creative Commons Attribution-Share Alike 2.0')) {
                            licenseLink = '<a href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank">Creative Commons Attribution-Share Alike 2.0</a>';
                        } else if (licenseText.includes('Creative Commons Attribution-Share Alike 4.0')) {
                            licenseLink = '<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank">Creative Commons Attribution-Share Alike 4.0</a>';
                        } else if (licenseText.includes('Creative Commons Attribution 2.0')) {
                            licenseLink = '<a href="https://creativecommons.org/licenses/by/2.0/" target="_blank">Creative Commons Attribution 2.0</a>';
                        } else if (licenseText.includes('Creative Commons Attribution 3.0')) {
                            licenseLink = '<a href="https://creativecommons.org/licenses/by/3.0/" target="_blank">Creative Commons Attribution 3.0</a>';
                        } else if (licenseText.includes('Creative Commons Attribution 4.0')) {
                            licenseLink = '<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank">Creative Commons Attribution 4.0</a>';
                        }
                    }

                    return `${authorText} - ${licenseLink}`;
                });

                console.log(`Author and License for image ${index + 1}: ${authorAndLicense}`);

                const imageUrl = await page.evaluate(() => {
                    const imageElement = document.querySelector('div.sdms-quick-view__thumbnail-wrapper img.sdms-quick-view__thumbnail') as HTMLImageElement;
                    if (imageElement) {
                        const srcset = imageElement.getAttribute('srcset');
                        if (srcset) {
                            const urls = srcset.split(',');
                            for (let url of urls) {
                                url = url.trim();
                                if (url.endsWith('640w')) {
                                    return url.split(' ')[0];
                                }
                            }
                        }
                    }
                    return '';
                });

                console.log(`Image URL for image ${index + 1}: ${imageUrl}`);

                results.push([imageUrl, authorAndLicense]);
            } else {
                console.log(`Skipping image ${index + 1} due to incompatible license.`);
            }

            await page.evaluate(() => {
                const closeButton = document.querySelector('button.sdms-quick-view__close') as HTMLButtonElement;
                if (closeButton) {
                    closeButton.click();
                }
            });

            await page.waitForTimeout(300);
            await page.waitForSelector('a.sdms-image-result');
        }

        console.log('Image processing complete.');
        return { urls: results, count: results.length };
    } catch (error: any) {
        console.error(`Error during image scraping: ${error.message}`);
        throw new Error(`Error during image scraping: ${error.message}`);
    }
}
