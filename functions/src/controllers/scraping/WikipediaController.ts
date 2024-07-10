import { Request, Response } from 'express';
import puppeteer, { Page } from 'puppeteer';

export async function googleSearch(req?: Request, res?: Response): Promise<[string, string][]> {
    const name = req ? req.body.name as string : '';

    if (!name) {
        if (res) {
            console.log('Error: name is required');
            res.status(400).json({ error: 'name is required' });
        }
        return [];
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

        console.log('Navigating to Google France');
        await page.goto(`https://www.google.fr/`, {
            waitUntil: 'networkidle2',
        });
        await handleConsentPage(page);

        console.log(`Typing search query: ${name} wikipedia`);
        await page.waitForSelector('textarea#APjFqb', { visible: true });
        console.log('Clicking on the text area to focus');
        await page.click('textarea#APjFqb'); // Click on the text area to focus

        console.log('Entering search query in the text area');
        await page.type('textarea#APjFqb', name + " wikipedia", { delay: 100 });
        await page.keyboard.press('Enter');

        console.log('Waiting for search results to load');
        await page.waitForSelector('a[jsname="UWckNb"]');

        const specificLink = await page.$('a[jsname="UWckNb"]');
        if (specificLink) {
            console.log('Clicking on the specific search result link');
            await specificLink.click();
        } else {
            throw new Error('Specific search result link not found');
        }


        console.log('Waiting for navigation to the first search result');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        const images = await scrapeImages(page);
        console.log('Closing browser');
        await browser.close();
        console.log('Search process completed successfully');
        if (res) {
            res.json({ images });
        }
        return images;

    } catch (error: any) {
        console.error(`Error during search process: ${error.message}`);
        if (res) {
            res.status(500).json({ error: error.message });
        }
        return [];
    }
}

async function handleConsentPage(page: Page): Promise<void> {
    try {
        const consentButtonSelector = '#L2AGLb';
        console.log('Checking for consent page');
        await page.waitForSelector(consentButtonSelector, { visible: true });
        console.log('Consent button found');
        console.log('Clicking consent accept button');
        await page.click(consentButtonSelector);

    } catch (error: any) {
        console.error(`Error handling consent page: ${error.message}`);
        throw new Error(`Error handling consent page: ${error.message}`);
    }
}




async function scrapeImages(page: Page): Promise<[string, string][]> {
    const imageTuples: [string, string][] = [];

    const imgs = await page.evaluate(() => {
        // Function to check if an element is a descendant of a given selector
        function isDescendant(parentSelector: string, child: HTMLElement): boolean {
            const parent = document.querySelector(parentSelector);
            return parent ? parent.contains(child) : false;
        }

        const galerieHeader = document.querySelector('h2 span#Galerie');
        let images: HTMLImageElement[] = [];

        if (galerieHeader) {
            const galleryList = galerieHeader.parentElement!.nextElementSibling;
            if (galleryList && galleryList.tagName.toLowerCase() === 'ul' && galleryList.classList.contains('gallery')) {
                images = Array.from(galleryList.querySelectorAll('img'))
                    .filter(img => img.src.includes('upload.wikimedia.org') && !img.src.includes('.svg'));
            }
        }

        if (images.length === 0) {
            images = Array.from(document.querySelectorAll('img'))
                .filter(img =>
                    img.src.includes('upload.wikimedia.org') &&
                    !img.src.includes('.svg') &&
                    !isDescendant('.DebutCarte', img) &&
                    !isDescendant('#bandeau-portail', img)
                );
        }

        return images.map(img => img.src);
    });

    console.log(`Found ${imgs.length} images matching the criteria.`);

    for (const src of imgs) {
        const srcWithoutHttps = src.replace(/^https?:/, ''); // Remove http or https prefix
        try {
            console.log(`Processing image: ${srcWithoutHttps}`);
            const imgElement = await page.$(`img[src="${srcWithoutHttps}"]`);
            if (imgElement) {
                await imgElement.click();
                console.log(`Clicked on image: ${srcWithoutHttps}`);

                // Wait for the modal to open and the final image element to appear
                const finalImageSelector = 'img.mw-mmv-final-image';
                const creditSelector = 'span.mw-mmv-source-author';
                try {
                    await page.waitForSelector(finalImageSelector, { timeout: 5000 });
                    await page.waitForSelector(creditSelector, { timeout: 5000 });

                    const imageData = await page.evaluate((finalImageSelector, creditSelector) => {
                        const finalImageElement = document.querySelector(finalImageSelector) as HTMLImageElement;
                        const creditElement = document.querySelector(creditSelector) as HTMLElement;

                        const finalImageUrl = finalImageElement ? finalImageElement.src.replace(/^https?:/, '') : '';
                        const licenseText = creditElement ? creditElement.innerText : '';

                        return { finalImageUrl, licenseText };
                    }, finalImageSelector, creditSelector);

                    if (imageData.finalImageUrl && imageData.licenseText) {
                        console.log(`Found final image URL: ${imageData.finalImageUrl}`);
                        console.log(`Found license text: ${imageData.licenseText}`);
                        imageTuples.push([imageData.finalImageUrl, imageData.licenseText]);
                    } else {
                        console.log(`Final image URL or license text not found for image: ${srcWithoutHttps}`);
                    }
                } catch (err) {
                    console.log(`Error finding final image or credit element for image: ${srcWithoutHttps}`);
                }

                // Close the modal
                const closeButton = await page.$('.mw-mmv-close');
                if (closeButton) {
                    await closeButton.click();
                    console.log(`Closed modal for image: ${srcWithoutHttps}`);
                } else {
                    console.log(`Close button not found for modal of image: ${srcWithoutHttps}`);
                }

                await page.waitForTimeout(1000); // Wait for modal to close
            } else {
                console.log(`Image element not found for src: ${srcWithoutHttps}`);
            }
        } catch (error: any) {
            console.error(`Error processing image ${srcWithoutHttps}: ${error.message}`);
        }
    }

    console.log('Completed image processing.');
    console.log('Image URLs and license information found:', imageTuples);
    return imageTuples;
}
