import { Request, Response } from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import * as ProxyController from '../ProxyController';

puppeteer.use(StealthPlugin());




export async function fetchGoogleImgsFromBusinessPage(req?: Request, res?: Response): Promise<{ urls: string[], count: number, error?: string }> {
  const { location_full_address } = req ? req.body : { location_full_address: '' };
  console.log("location full address : " + location_full_address);

  const formattedAddress = formatAddressForURL(location_full_address);
  console.log("formatted address : " + formattedAddress);

  const encodedAddress = encodeURIComponent(formattedAddress);
  const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  console.log("encoded address : " + encodedAddress);
  console.log("url : " + url);

  if (!url) {
    const error = 'URL is required';
    console.error(error);
    if (res) {
      res.status(400).json({ error });
    }
    return { urls: [], count: 0, error };
  }

  console.log(`Fetching image URLs from: ${url}`);

  let browser;
  try {
    const proxy = ProxyController.getRandomProxy();
    console.log("Using proxy: " + proxy.address);

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


    await page.goto(url, {
      waitUntil: 'networkidle2',
    });
    console.log('Page navigated to URL');

    await handleConsentPage(page);
    console.log('Consent page handled');

    await page.waitForTimeout(randomTimeout());
    console.log('Waited for a random timeout');
    let closed = await checkIfBusinessClosed(page);
    console.log('closed :' + closed);
    if (closed) {
      const result = { urls: [], count: 0, error: "L'endroit est temporairement ou définitivement fermé" };
      if (res) {
        res.json(result);
      }
      await browser.close();
      console.log('Browser closed after detecting business closure');
      return result;
    }

    await clickPhotosDuProprietaireButton(page);
    console.log('Clicked on Photos du Propriétaire button');

    await page.waitForTimeout(randomTimeout());
    console.log('Waited for a random timeout after clicking Photos du Propriétaire');

    const imageUrls = await scrapeImageUrls(page);
    console.log('Scraped image URLs:', imageUrls);

    await browser.close();
    console.log('Browser closed after scraping image URLs');

    const result = { urls: imageUrls, count: imageUrls.length };
    if (res) {
      res.json(result);
    }
    return result;
  } catch (error: any) {
    console.error(`Error fetching image URLs: ${error.message}`);
    if (browser) {
      await browser.close();
      console.log('Browser closed after error');
    }
    const errorMessage = `Error fetching image URLs: ${error.message}, check spelling or no owner photos available`;
    if (res) {
      res.status(500).json({ error: errorMessage });
    }
    return { urls: [], count: 0, error: errorMessage };
  }
}



async function handleConsentPage(page: Page): Promise<string> {
  let currentUrl = page.url();
  if (currentUrl.includes('consent')) {
    try {
      console.log('Consent page detected, handling consent...');
      const acceptButtonSelector = 'button[aria-label="Tout accepter"] span.VfPpkd-vQzf8d';
      const acceptButton = await page.$(acceptButtonSelector);
      if (acceptButton) {
        await acceptButton.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        currentUrl = page.url();
        console.log(`URL after accepting consent: ${currentUrl}`);
      } else {
        const error = 'Consent accept button not found';
        console.log(error);
        throw new Error(error);
      }
    } catch (consentError: any) {
      console.error(`Error handling consent page: ${consentError.message}`);
      throw new Error(`Error handling consent page: ${consentError.message}`);
    }
  }
  return currentUrl;
}

async function checkIfBusinessClosed(page: Page): Promise<boolean> {
  try {

    const isClosed = await page.evaluate(() => {
      const pageContent = document.body.innerText.toLowerCase();
      return pageContent.includes('temporairement fermé') ||
        pageContent.includes('fermé définitivement') ||
        pageContent.includes('temporarily closed') ||
        pageContent.includes('permanently closed');
    });

    if (isClosed) {
      console.log('Business is closed.');
      return true;
    }

  } catch (error) {
    console.log('Error occurred while checking for business closure:', error);
  }

  console.log('Business is open or could not determine closure status.');
  return false;
}


async function clickPhotosDuProprietaireButton(page: Page): Promise<void> {
  try {
    const possibleSelectors = [
      'button[aria-label="By owner"]',
      'button[aria-label="Photos du propriétaire"]',
      'button[aria-label="Fotos del propietario"]',
      'button[aria-label="Vom Inhaber"]',
      'button[aria-label="Dal proprietario"]',
      'button[aria-label="By the owner"]',
      'button[aria-label="Owner photos"]',
      'button[aria-label="Photos by owner"]',
      'button[aria-label="Eigenaarsfoto\'s"]',
      'button[aria-label="Fotos do proprietário"]'
    ];

    // Try each selector until one works
    let photosButton = null;
    for (const selector of possibleSelectors) {
      photosButton = await page.$(selector);
      if (photosButton) {
        await photosButton.click();
        console.log(`Clicked on button with selector: ${selector}`);
        await page.waitForTimeout(randomTimeout()); // Wait for photos to load
        return;
      }
    }

    // If no button was found
    const error = 'Owner photos button not found in any language';
    console.log(error);
    throw new Error(error);

  } catch (clickError: any) {
    console.error(`Error clicking on owner photos button: ${clickError.message}`);
    throw new Error(`Error clicking on owner photos button: ${clickError.message}`);
  }
}

async function scrapeImageUrls(page: Page): Promise<string[]> {
  try {
    const targetDivSelector = '.U39Pmb';
    await page.waitForSelector(targetDivSelector, { timeout: 5000 });
    const targetDiv = await page.$(targetDivSelector);
    if (targetDiv) {
      await targetDiv.hover();
      console.log('Hovered over the target div');

      for (let i = 0; i < 3; i++) {
        await page.mouse.wheel({ deltaY: 1000 });
        console.log("Scrolled down");
        await page.waitForTimeout(randomTimeout());
      }

      const imageUrls = await page.evaluate(() => {
        const divs = Array.from(document.querySelectorAll('div.Uf0tqf.loaded'));
        const urls = divs.map(div => {
          const style = window.getComputedStyle(div);
          const backgroundImage = style.backgroundImage;
          const urlMatch = backgroundImage.match(/url\("(.*?)"\)/);
          let url = urlMatch ? urlMatch[1] : null;
          if (url && url.includes('googleusercontent')) {
            url = url.split('=')[0] + '=s1200-k-no';
          } else {
            url = null;
          }
          return url;
        }).filter(url => url !== null);

        console.log(`Found ${urls.length} image URLs`);
        return urls;
      });

      return imageUrls;
    } else {
      const error = 'Target div not found';
      console.log(error);
      throw new Error(error);
    }
  } catch (hoverError: any) {
    console.error(`Error hovering over target div: ${hoverError.message}`);
    throw new Error(`Error hovering over target div: ${hoverError.message}`);
  }
}

function formatAddressForURL(address: string): string {
  // Check if the input is a Google Maps URL
  if (address.startsWith('https://www.google.com/maps')) {
    try {
      // Extract the place name and address from the URL
      const placeMatch = address.match(/place\/([^/@]+)/);
      if (placeMatch && placeMatch[1]) {
        // Decode the URL-encoded place string
        const decodedPlace = decodeURIComponent(placeMatch[1]);
        // Replace URL-specific characters with spaces
        return decodedPlace.replace(/[+]/g, ' ').replace(/,/g, ' ');
      }
    } catch (error) {
      console.error('Error parsing Google Maps URL:', error);
    }
  }

  // If not a URL or if extraction fails, proceed with the original function
  return address.replace(/[^a-zA-Z0-9\s]/g, '');
}

function randomTimeout(): number {
  return Math.floor(500 + Math.random() * 1500);
}

export async function fetchGoogleBusinessAttributes(req: Request, res: Response) {
  const { location_full_address } = req.body;
  const formattedAddress = formatAddressForURL(location_full_address);
  const url = `https://www.google.com/maps/search/?api=1&query=${formattedAddress}`;
  console.log(`url: ${url}`);

  if (!url) {
    const error = 'URL is required';
    console.error(error);
    res.status(400).json({ error });
    return { attributes: {}, count: 0, error };
  }

  console.log(`Fetching attributes from: ${url}`);

  let browser;
  try {
    const proxy = ProxyController.getRandomProxy();
    console.log("Using proxy: " + proxy.address);

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

    await page.goto(url, {
      waitUntil: 'networkidle2',
    });
    console.log('Navigated to URL');

    await handleConsentPage(page);
    await page.waitForTimeout(randomTimeout());

    if (await checkIfBusinessClosed(page)) {
      const result = { attributes: {}, count: 0, error: "Temporairement ou définitivement fermé" };
      res.json(result);
      await browser.close();
      return result;
    }

    await clickReviewsTab(page);
    await page.waitForTimeout(randomTimeout());

    const attributes = await scrapeAttributes(page);

    await browser.close();

    const result = { attributes, count: Object.keys(attributes).length };
    res.json(result);
    return result;
  } catch (error: any) {
    console.error(`Error fetching attributes: ${error.message}`);
    if (browser) {
      await browser.close();
    }
    const errorMessage = `Error fetching attributes: ${error.message}`;
    res.status(500).json({ error: errorMessage });
    return { attributes: {}, count: 0, error: errorMessage };
  } finally {

  }
}

async function clickReviewsTab(page: Page): Promise<void> {
  try {
    const reviewsTabSelector = 'button[aria-label*="Avis"]';
    await page.waitForSelector(reviewsTabSelector, { visible: true, timeout: 5000 });
    const reviewsTab = await page.$(reviewsTabSelector);
    if (reviewsTab) {
      await reviewsTab.click();
      console.log('Clicked on the "Avis" tab');
      await page.waitForTimeout(randomTimeout()); // Wait for reviews to load
    } else {
      const error = '"Avis" tab not found';
      console.log(error);
      throw new Error(error);
    }
  } catch (clickError: any) {
    console.error(`Error clicking on "Avis" tab: ${clickError.message}`);
    throw new Error(`Error clicking on "Avis" tab: ${clickError.message}`);
  }
}

async function scrapeAttributes(page: Page): Promise<{ [key: string]: number }> {
  try {
    const attributeSelector = 'div.m6QErb.XiKgde.tLjsW button.e2moi';
    await page.waitForSelector(attributeSelector, { visible: true, timeout: 10000 });

    const attributes = await page.$$eval(attributeSelector, elements => {
      const result: { [key: string]: number } = {};
      elements.forEach(element => {
        const keyElement = element.querySelector('span.uEubGf.fontBodyMedium');
        const valueElement = element.querySelector('span.bC3Nkc.fontBodySmall');
        if (keyElement && valueElement) {
          const key = keyElement.textContent?.trim() ?? '';
          const value = parseInt(valueElement.textContent?.trim() ?? '0', 10);
          if (key && !isNaN(value)) {
            result[key] = value;
          }
        }
      });
      return result;
    });

    return attributes;
  } catch (scrapeError: any) {
    console.error(`Error scraping attributes: ${scrapeError.message}`);
    throw new Error(`Error scraping attributes: ${scrapeError.message}`);
  }
}

export async function getOriginalName(req: Request, res?: Response): Promise<string> {
  let browser: Browser | null = null;

  try {
    let { name_eng, country, city } = req.body;

    if (!name_eng || !country || !city) {
      if (res) {
        res.status(400).json({ error: "name_eng, country, and city are required in the request body" });
      }
      throw new Error("name_eng, country, and city are required in the request body");
    }

    name_eng = name_eng.replace(/\s+/g, '+');
    country = country.replace(/\s+/g, '+');
    city = city.replace(/\s+/g, '+');

    const searchQuery = `${name_eng}+${city}+${country}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;

    const proxy = ProxyController.getRandomProxy();
    console.log("Using proxy: " + proxy.address);

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

    await page.goto(url, { waitUntil: 'networkidle2' });
    console.log('Page navigated to URL');

    await handleConsentPage(page);
    console.log('Consent page handled');

    await page.waitForTimeout(randomTimeout());
    console.log('Waited for a random timeout');

    let name = await page.evaluate(async () => {
      const nameElement = document.querySelector('h2.bwoZTb.fontBodyMedium span');
      if (nameElement) {
        console.log('h2 element found');
        return nameElement.textContent?.trim() || '';
      } else {
        console.log('h2 element not found, checking for h1');
        const h1Element = document.querySelector('h1.DUwDvf.lfPIob');
        if (h1Element) {
          console.log('h1 element found');
          return h1Element.textContent?.trim() || '';
        } else {
          console.log('h1 element not found, checking for the first <a> with class hfpxzc');
          const linkElement = document.querySelectorAll('a.hfpxzc')[0];
          if (linkElement) {
            console.log('Clicking on the first <a> element with class hfpxzc');
            (linkElement as HTMLElement).click();
            return ''; // Return empty string for now, will be processed further
          } else {
            console.log('No suitable <a> element found');
            return 'Name not found';
          }
        }
      }
    });

    // If name is equal to city, try to extract the name from h1
    if (name === city) {
      console.log('Extracted name matches city, attempting to get h1 element instead');
      name = await page.evaluate(() => {
        const h1Element = document.querySelector('h1.DUwDvf.lfPIob');
        if (h1Element) {
          console.log('h1 element found after matching with city');
          return h1Element.textContent?.trim() || '';
        } else {
          console.log('h1 element not found after matching with city');
          return '';
        }
      });
    }

    if (!name) {
      // Wait for the page to load after clicking the link
      await page.waitForTimeout(randomTimeout());
      console.log('Waited after clicking the link, trying to extract name again');

      name = await page.evaluate(() => {
        const h1Element = document.querySelector('h1.DUwDvf.lfPIob');
        if (h1Element) {
          console.log('h1 element found after clicking the link');
          return h1Element.textContent?.trim() || '';
        } else {
          console.log('h1 element not found after clicking the link');
          return '';
        }
      });
    }

    console.log(`Extracted name: ${name}`);

    if (res) {
      res.json({ name });
    }

    return name;

  } catch (error: any) {
    console.error(`Error fetching original name: ${error.message}`);
    if (res) {
      res.status(500).json({ error: `Error fetching original name: ${error.message}` });
    }
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
}
