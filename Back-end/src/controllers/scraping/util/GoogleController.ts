import { Request, Response } from 'express';
import path from 'path';
import { Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

export async function fetchGoogleImgsFromBusinessPage(req?: Request, res?: Response): Promise<{ urls: string[], count: number, error?: string }> {
  const { location_full_address } = req ? req.body : { location_full_address: '' };
  const formattedAddress = formatAddressForURL(location_full_address);
  const url = "https://www.google.com/maps/search/?api=1&query=" + formattedAddress;
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
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('Browser launched');

    const page = await browser.newPage();
    console.log('New page opened');

    await page.goto(url, {
      waitUntil: 'networkidle2',
    });

    await handleConsentPage(page);
    await page.waitForTimeout(randomTimeout());
    await clickPhotosDuProprietaireButton(page);
    await page.waitForTimeout(randomTimeout());

    const imageUrls = await scrapeImageUrls(page);

    await browser.close();

    const result = { urls: imageUrls, count: imageUrls.length };
    if (res) {
      res.json(result);
    }
    return result;
  } catch (error: any) {
    console.error(`Error fetching image URLs: ${error.message}`);
    if (browser) {
      await browser.close();
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

async function clickPhotosDuProprietaireButton(page: Page): Promise<void> {
  const buttonSelectors = [
    'button[aria-label="Photos du propriétaire"]',
    'button[aria-label="By Owner"]',
    'button[aria-label="Del propietario"]',
    'button[aria-label="Vom Inhaber"]',
    'button[aria-label="Do proprietário"]',
    'button[aria-label="Van de eigenaar"]',
    'button[aria-label="Fotografías del propietario"]',
    'button[aria-label="Fra ejeren"]',
    'button[aria-label="Dal proprietario"]',
    'button[aria-label="Dostarczył właściciel"]',
    'button[aria-label="De la proprietar"]'

    // Ajoutez ici d'autres traductions si nécessaire
  ];

  try {
    for (const selector of buttonSelectors) {
      try {
        await page.waitForSelector(selector, { visible: true, timeout: 5000 });
        const photosButton = await page.$(selector);
        if (photosButton) {
          await photosButton.click();
          console.log(`Clicked on the button with selector: ${selector}`);
          await page.waitForTimeout(randomTimeout()); // Wait for photos to load
          return; // Quitter la fonction après avoir cliqué sur le bouton
        }
      } catch (innerError) {
        console.log(`Button not found with selector: ${selector}`);
      }
    }
    const error = 'Button not found with any of the selectors';
    console.log(error);
    throw new Error(error);
  } catch (clickError: any) {
    console.error(`Error clicking on button: ${clickError.message}`);
    throw new Error(`Error clicking on button: ${clickError.message}`);
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






export async function fetchGoogleBusinessAttributes(req?: Request, res?: Response): Promise<{ attributes: { [key: string]: number }, count: number, screenshotPath?: string, error?: string }> {
  const { location_full_address } = req ? req.body : { location_full_address: '' };
  const formattedAddress = formatAddressForURL(location_full_address);
  const url = "https://www.google.com/maps/search/?api=1&query=" + formattedAddress;
  console.log("url : " + url);

  if (!url) {
    const error = 'URL is required';
    console.error(error);
    if (res) {
      res.status(400).json({ error });
    }
    return { attributes: {}, count: 0, error };
  }

  console.log(`Fetching attributes from: ${url}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('Browser launched');

    const page = await browser.newPage();
    console.log('New page opened');

    await page.goto(url, {
      waitUntil: 'networkidle2',
    });

    await handleConsentPage(page);
    await page.waitForTimeout(randomTimeout());
    await clickReviewsTab(page);
    await page.waitForTimeout(randomTimeout());
    const attributes = await scrapeAttributes(page);

    await browser.close();

    const result = { attributes, count: Object.keys(attributes).length };
    if (res) {
      res.json(result);
    }
    return result;
  } catch (error: any) {
    console.error(`Error fetching attributes: ${error.message}`);
    if (browser) {
      await browser.close();
    }
    const errorMessage = `Error fetching attributes: ${error.message}`;
    if (res) {
      res.status(500).json({ error: errorMessage });
    }
    return { attributes: {}, count: 0, error: errorMessage };
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
