import { Request, Response } from 'express';
import puppeteer, { Page } from 'puppeteer';
import * as ProxyController from '../ProxyController';

export async function findWikipediaUrl(req?: Request, res?: Response): Promise<string> {
    const name = req ? req.body.name as string : '';

    if (!name) {
        if (res) {
            console.log('Error: name is required');
            res.status(400).json({ error: 'name is required' });
        }
        return '';
    }

    let browser;
    try {
        const proxy = ProxyController.getRandomProxy();
        console.log("Using proxy: " + proxy.address);

        browser = await puppeteer.launch({
            headless: true,
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
        console.log('Proxy authenticated');;
        console.log('Navigating to Google');
        await page.goto(`https://www.google.com/`, {
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

        console.log('Collecting Wikipedia URLs from search results');
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[jsname="UWckNb"]')).map(anchor => (anchor as HTMLAnchorElement).href);
        });

        console.log('Found links:', links);

        console.log('Prioritizing en.wikipedia.org URLs');
        const enWikiUrl = links.find(link => link.includes('en.wikipedia.org'));
        const wikiUrl = enWikiUrl ? enWikiUrl : links.find(link => link.includes('wikipedia.org'));

        if (!wikiUrl) {
            throw new Error('No Wikipedia URL found');
        }

        console.log(`Navigating to Wikipedia URL: ${wikiUrl}`);
        await page.goto(wikiUrl, {
            waitUntil: 'networkidle2',
        });

        const finalUrl = page.url();
        if (res) {
            res.json({ url: finalUrl });
        }
        console.log(`Found Wikipedia URL: ${finalUrl}`);
        return finalUrl;

    } catch (error: any) {
        console.error(`Error during search process: ${error.message}`);
        if (browser) {
            await browser.close();
        }
        if (res) {
            res.status(500).json({ error: error.message });
        }
        return '';
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

async function handleConsentPage(page: Page): Promise<void> {
    try {
        const consentButtonSelector = '#L2AGLb';
        console.log('Checking for consent page');
        const consentButton = await page.$(consentButtonSelector);
        if (consentButton) {
            console.log('Consent button found');
            console.log('Clicking consent accept button');
            await page.click(consentButtonSelector);
        } else {
            console.log('Consent button not found, skipping step');
        }
    } catch (error: any) {
        console.error(`Error handling consent page: ${error.message}`);
        // Pas d'erreur levée ici pour que le processus continue
    }
}



