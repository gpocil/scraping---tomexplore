import { Request, Response } from 'express';
import { Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export async function wikiMediaSearch(req?: Request, res?: Response): Promise<{ urls: [string, string, string][], count: number, error?: string }> {
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
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-fullscreen'],
            defaultViewport: null // Use the full window size
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 0, height: 0 });

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
            await page.waitForTimeout(1000);
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

export async function scrapeImages(page: Page): Promise<{ urls: [string, string, string][], count: number }> {
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
        const results: [string, string, string][] = [];
        const originalUrl = page.url();

        for (const { index, href } of imageLinks.slice(0, 50)) {
            console.log(`Processing image ${index + 1}: ${href}`);

            await page.evaluate((i) => {
                const imageLink = document.querySelectorAll('a.sdms-image-result')[i] as HTMLAnchorElement;
                imageLink.click();
            }, index);

            // Wait for either the dynamic panel or a new page to load
            try {
                await page.waitForSelector('p.sdms-quick-view__list-item.sdms-quick-view__license', { timeout: 5000 });
            } catch (error) {
                if (page.url() !== originalUrl) {
                    console.log('New page opened, navigating back.');
                    await page.goBack({ waitUntil: 'networkidle2' });
                    await page.waitForTimeout(1000);
                    continue;
                }
            }

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
                const { authorText, licenseLink } = await page.evaluate(() => {
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
                            licenseLink = 'Creative Commons Attribution-Share Alike 3.0';
                        } else if (licenseText.includes('Creative Commons Attribution-Share Alike 2.0')) {
                            licenseLink = 'Creative Commons Attribution-Share Alike 2.0';
                        } else if (licenseText.includes('Creative Commons Attribution-Share Alike 4.0')) {
                            licenseLink = 'Creative Commons Attribution-Share Alike 4.0';
                        } else if (licenseText.includes('Creative Commons Attribution 2.0')) {
                            licenseLink = 'Creative Commons Attribution 2.0';
                        } else if (licenseText.includes('Creative Commons Attribution 3.0')) {
                            licenseLink = 'Creative Commons Attribution 3.0';
                        } else if (licenseText.includes('Creative Commons Attribution 4.0')) {
                            licenseLink = 'Creative Commons Attribution 4.0';
                        }
                    }

                    return { authorText, licenseLink };
                });

                console.log(`Author and License for image ${index + 1}: ${authorText}, ${licenseLink}`);

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

                results.push([imageUrl, authorText, licenseLink]);
            } else {
                console.log(`Skipping image ${index + 1} due to incompatible license.`);
            }

            // Check if the URL has changed and navigate back if needed
            if (page.url() !== originalUrl) {
                await page.goBack({ waitUntil: 'networkidle2' });
                await page.waitForTimeout(1000);
            } else {
                await page.evaluate(() => {
                    const closeButton = document.querySelector('button.sdms-quick-view__close') as HTMLButtonElement;
                    if (closeButton) {
                        closeButton.click();
                    }
                });
                await page.waitForTimeout(300);
                await page.waitForSelector('a.sdms-image-result');
            }
        }

        console.log('Image processing complete.');
        return { urls: results, count: results.length };
    } catch (error: any) {
        console.error(`Error during image scraping: ${error.message}`);
        throw new Error(`Error during image scraping: ${error.message}`);
    }
}