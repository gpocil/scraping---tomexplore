import { Request, Response } from 'express';
import puppeteer, { Page } from 'puppeteer';



export async function wikiMediaSearch(req?: Request, res?: Response): Promise<void> {
    const name = req ? req.body.name as string : '';

    if (!name) {
        if (res) {
            console.log('Error: name is required');
            res.status(400).json({ error: 'name is required' });
        }
        return;
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

        console.log('Navigating to Wikimedia Commons');
        await page.goto('https://commons.wikimedia.org/', {
            waitUntil: 'networkidle2',
        });

        console.log(`Typing search query: ${name}`);
        await page.type('#searchInput', name);

        console.log('Submitting the search form');
        await page.keyboard.press('Enter');

        // Attendre le chargement de l'élément spécifié
        await page.waitForSelector('a.sdms-image-result');

        // Défiler plusieurs fois vers le bas
        for (let i = 0; i < 3; i++) {  // Ajuster le nombre de défilements si nécessaire
            await page.evaluate(() => {
                window.scrollBy(0, window.innerHeight);
            });
            await page.waitForTimeout(2000); // Attendre 2 secondes pour que le contenu se charge
        }
        const urls = await scrapeImages(page);
        console.log(urls);
        await browser.close();

        if (res) {
            res.status(200).json(urls);
        }
    } catch (error: any) {
        console.error(`Error during search process: ${error.message}`);
        if (res) {
            res.status(500).json({ error: error.message });
        }
        return;
    }
}




export async function scrapeImages(page: Page): Promise<[string, string][]> {
    console.log('Collecting image links...');

    // Récupérer tous les liens des images
    const imageLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a.sdms-image-result'));
        return links.map((link, index) => ({
            href: (link as HTMLAnchorElement).href,
            index
        }));
    });

    console.log(`Found ${imageLinks.length} image links. Processing the first 10 links...`);
    const results: [string, string][] = [];

    // Boucler sur les 10 premières images
    for (const { index, href } of imageLinks.slice(0, 30)) {
        console.log(`Processing image ${index + 1}: ${href}`);

        // Cliquer sur l'image pour ouvrir les détails
        await page.evaluate((i) => {
            const imageLink = document.querySelectorAll('a.sdms-image-result')[i] as HTMLAnchorElement;
            imageLink.click();
        }, index);

        // Attendre que les détails de l'image soient affichés
        await page.waitForSelector('p.sdms-quick-view__list-item.sdms-quick-view__license');

        // Vérifier la licence
        const licenseText = await page.evaluate(() => {
            const licenseElement = document.querySelector('p.sdms-quick-view__list-item.sdms-quick-view__license a span');
            return licenseElement ? licenseElement.textContent : '';
        });

        console.log(`License for image ${index + 1}: ${licenseText}`);
        if (licenseText &&
            (licenseText.includes('Creative Commons Attribution-Share Alike 3.0') ||
                licenseText.includes('Creative Commons Attribution-Share Alike 4.0') ||
                licenseText.includes('Creative Commons Attribution-Share Alike 2.0'))
        ) {
            const authorAndLicense = await page.evaluate(() => {
                const licenseElement = document.querySelector('p.sdms-quick-view__list-item.sdms-quick-view__license a span');
                const authorElement = document.querySelector('p.sdms-quick-view__list-item.sdms-quick-view__artist bdi span a');

                const licenseText = licenseElement ? licenseElement.textContent : '';
                const authorText = authorElement ? authorElement.textContent : '';

                return `${authorText} - ${licenseText}`;
            });

            console.log(`Author and License for image ${index + 1}: ${authorAndLicense}`);

            // Récupérer l'image grand format
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

        // Fermer les détails de l'image
        await page.evaluate(() => {
            const closeButton = document.querySelector('button.sdms-quick-view__close') as HTMLButtonElement;
            if (closeButton) {
                closeButton.click();
            }
        });

        // Attendre que la liste d'images soit à nouveau visible
        await page.waitForTimeout(1000); // Attendre un peu avant de vérifier la présence de l'élément pour éviter des erreurs potentielles
        await page.waitForSelector('a.sdms-image-result');
    }

    console.log('Image processing complete.');
    return results;
}
