import { Request, Response } from 'express';
import puppeteer, { Page } from 'puppeteer';
import * as ProxyController from '../ProxyController';

const wikiExtensions = [
    ["Ireland", "en"],
    ["United Kingdom", "en"],
    ["Germany", "de"],
    ["Austria", "de"],
    ["Switzerland", "de"],
    ["France", "fr"],
    ["Belgium", "fr"],
    ["Switzerland", "fr"],
    ["Sweden", "sv"],
    ["Netherlands", "nl"],
    ["Belgium", "nl"],
    ["Russia", "ru"],
    ["Ukraine", "uk"],
    ["Italy", "it"],
    ["Poland", "pl"],
    ["Spain", "es"],
    ["Switzerland", "it"],
    ["Portugal", "pt"],
    ["Romania", "ro"],
    ["Serbia", "sr"],
    ["Montenegro", "sr"],
    ["Croatia", "hr"],
    ["Bosnia and Herzegovina", "sh"],
    ["Slovakia", "sk"],
    ["Czech Republic", "cs"],
    ["Hungary", "hu"],
    ["Finland", "fi"],
    ["Estonia", "et"],
    ["Latvia", "lv"],
    ["Lithuania", "lt"],
    ["Slovenia", "sl"],
    ["Greece", "el"],
    ["Bulgaria", "bg"],
    ["Denmark", "da"],
    ["Norway", "no"],
    ["Iceland", "is"],
    ["Macedonia", "mk"],
    ["Albania", "sq"],
    ["Belarus", "be"],
    ["Moldova", "ro"],
    ["Luxembourg", "lb"],
    ["Malta", "mt"],
    ["Armenia", "hy"],
    ["Georgia", "ka"],
    ["Bosnia and Herzegovina", "bs"],
    ["Monaco", "fr"],
    ["San Marino", "it"],
    ["Andorra", "ca"],
    ["Liechtenstein", "de"],
    ["Kosovo", "sq"],
    ["Vatican City", "la"],
    ["Cyprus", "el"],
    ["Turkey", "tr"]
];

export async function findWikipediaUrl(req?: Request, res?: Response): Promise<string> {
    const name = req ? req.body.name as string : '';
    const country = req ? req.body.country as string : '';
    const city = req ? req.body.city as string : '';


    if (!name || !country) {
        if (res) {
            console.log('Error: name and country are required');
            res.status(400).json({ error: 'name and country are required' });
        }
        return '';
    }

    let browser;
    try {
        const proxy = ProxyController.getRandomProxy();
        console.log("Using proxy: " + proxy.address);

        // Get country-specific Wikipedia extension
        const countryExtension = wikiExtensions.find(([c, ext]) => c.toLowerCase() === country.toLowerCase())?.[1] || 'en';
        console.log(`Using Wikipedia language: ${countryExtension} for country: ${country}`);

        browser = await puppeteer.launch({
            headless: false,
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
        console.log('Proxy authenticated');
        
        // Navigate directly to country-specific Wikipedia
        const wikipediaUrl = `https://${countryExtension}.wikipedia.org/`;
        console.log(`Navigating to Wikipedia: ${wikipediaUrl}`);
        await page.goto(wikipediaUrl, {
            waitUntil: 'networkidle2',
        });

        console.log(`Searching for: ${name}`);
        
        // Click the search button to open the search interface
        const searchButtonSelectors = [
            'a.search-toggle',
            '.cdx-button--icon-only.search-toggle',
            'a[title*="Rechercher"]',
            'a[title*="Search"]'
        ];
        
        let searchButtonClicked = false;
        for (const selector of searchButtonSelectors) {
            try {
                await page.waitForSelector(selector, { visible: true, timeout: 5000 });
                console.log(`Found search button with selector: ${selector}`);
                await page.click(selector);
                searchButtonClicked = true;
                console.log('Search button clicked');
                await page.waitForTimeout(1000); // Wait for search input to appear
                break;
            } catch (error) {
                console.log(`Search button selector ${selector} not found, trying next...`);
            }
        }

        if (!searchButtonClicked) {
            console.log('Could not find search button, trying direct input search...');
        }

        // Wait for and type in the search input
        const searchInputSelectors = [
            '.cdx-text-input__input[name="search"]',
            'input.cdx-text-input__input[type="search"]',
            'input[name="search"]',
            '#searchInput',
            'input[type="search"]'
        ];
        
        let searchInput = null;
        for (const selector of searchInputSelectors) {
            try {
                await page.waitForSelector(selector, { visible: true, timeout: 5000 });
                searchInput = selector;
                console.log(`Found search input with selector: ${selector}`);
                break;
            } catch (error) {
                console.log(`Search input selector ${selector} not found, trying next...`);
            }
        }

        if (!searchInput) {
            throw new Error('Could not find Wikipedia search input');
        }

        // Type the search query
        console.log(`Typing search query: ${name}`);
        await page.click(searchInput);
        await page.type(searchInput, name, { delay: 100 });
        await page.keyboard.press('Enter');

        console.log('Waiting for article page to load');
        // Wait for the table of contents (Sommaire) to appear, indicating article loaded
        try {
            await page.waitForSelector('nav.vector-toc-landmark, #vector-toc, .vector-toc', { timeout: 10000 });
            console.log('Article page loaded (table of contents found)');
        } catch (error) {
            console.log('Table of contents not found, waiting for page load...');
            await page.waitForTimeout(3000);
        }

        const finalUrl = page.url();
        
        // Check if we landed on an article or search results page
        if (finalUrl.includes('/wiki/') && !finalUrl.includes('Special:Search')) {
            console.log(`Found Wikipedia article URL: ${finalUrl}`);
        } else {
            console.log(`Landed on search results page: ${finalUrl}`);
            
            // Try to click the first search result
            try {
                const firstResultSelectors = [
                    '.mw-search-result-heading a',
                    '.searchresult a',
                    '.mw-search-results a'
                ];
                
                for (const selector of firstResultSelectors) {
                    const firstResult = await page.$(selector);
                    if (firstResult) {
                        console.log(`Clicking first search result with selector: ${selector}`);
                        await firstResult.click();
                        await page.waitForTimeout(2000);
                        break;
                    }
                }
            } catch (error: any) {
                console.log(`Could not click first result: ${error.message}`);
            }
        }

        const resultUrl = page.url();
        if (res) {
            res.json({ url: resultUrl });
        }
        console.log(`Final Wikipedia URL: ${resultUrl}`);
        return resultUrl;

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




