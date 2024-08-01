import { Request, Response } from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Page } from 'puppeteer';
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
    console.log('Proxy authenticated');


    await page.goto(url, {
      waitUntil: 'networkidle2',
    });
    console.log('Page navigated to URL');

    await handleConsentPage(page);
    console.log('Consent page handled');

    await page.waitForTimeout(randomTimeout());
    console.log('Waited for a random timeout');

    if (await checkIfBusinessClosed(page)) {
      const result = { urls: [], count: 0, error: "Business is temporarily or permanently closed" };
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
  const closedDivSelector = '.MkV9 .o0Svhf .ZDu9vd .aSftqf';
  try {
    await page.waitForSelector(closedDivSelector, { timeout: 5000 });
    const closedText = await page.$eval(closedDivSelector, el => el.textContent?.trim().toLowerCase());
    if (closedText && (closedText.includes('fermé temporairement') || closedText.includes('fermé définitivement'))) {
      console.log('Business is closed: ' + closedText);
      return true;
    }
  } catch (error) {
    console.log('Business closure check: Selector not found, continuing...');
  }
  return false;
}

async function clickPhotosDuProprietaireButton(page: Page): Promise<void> {
  try {
    const photosButtonSelector = 'button[aria-label="By owner"]';
    await page.waitForSelector(photosButtonSelector, { visible: true, timeout: 5000 });
    const photosButton = await page.$(photosButtonSelector);
    if (photosButton) {
      await photosButton.click();
      console.log('Clicked on the "Photos du propriétaire" button');
      await page.waitForTimeout(randomTimeout()); // Wait for photos to load
    } else {
      const error = '"Photos du propriétaire" button not found';
      console.log(error);
      throw new Error(error);
    }
  } catch (clickError: any) {
    console.error(`Error clicking on "Photos du propriétaire" button: ${clickError.message}`);
    throw new Error(`Error clicking on "Photos du propriétaire" button: ${clickError.message}`);
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
    console.log('Proxy authenticated');

    await page.goto(url, {
      waitUntil: 'networkidle2',
    });
    console.log('Navigated to URL');

    await handleConsentPage(page);
    await page.waitForTimeout(randomTimeout());

    if (await checkIfBusinessClosed(page)) {
      const result = { attributes: {}, count: 0, error: "Business is temporarily or permanently closed" };
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
