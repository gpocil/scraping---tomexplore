import { Request, Response } from 'express';
import { Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export async function fetchGoogleImgsFromBusinessPage(req?: Request, res?: Response): Promise<string[]> {
  const { location_full_address: location_full_address } = req ? req.body : { location_full_address: '' };
  const formattedAddress = formatAddressForURL(location_full_address);
  const url = "https://www.google.com/maps/search/?api=1&query=" + formattedAddress;
  console.log("url : " + url);

  if (!url) {
    console.error('URL is required');
    if (res) {
      res.status(400).json({ error: 'URL is required' });
    }
    return [];
  }

  console.log(`Fetching image URLs from: ${url}`);

  try {
    const browser = await puppeteer.launch({
      headless: false,
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

    if (res) {
      res.json({ imageUrls });
    }
    return imageUrls;
  } catch (error: any) {
    console.error(`Error fetching image URLs: ${error.message}`);
    if (res) {
      res.status(500).json({ error: `Error fetching image URLs: ${error.message}` });
    }
    return [];
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
        console.log('Consent accept button not found');
      }
    } catch (consentError: any) {
      console.error(`Error handling consent page: ${consentError.message}`);
      throw new Error(`Error handling consent page: ${consentError.message}`);
    }
  }
  return currentUrl;
}

async function clickPhotosDuProprietaireButton(page: Page): Promise<void> {
  try {
    const photosButtonSelector = 'button[aria-label="Photos du propriétaire"]';
    await page.waitForSelector(photosButtonSelector, { visible: true });
    const photosButton = await page.$(photosButtonSelector);
    if (photosButton) {
      await photosButton.click();
      console.log('Clicked on the "Photos du propriétaire" button');
      await page.waitForTimeout(randomTimeout()); // Wait for photos to load
    } else {
      console.log('"Photos du propriétaire" button not found');
    }
  } catch (clickError: any) {
    console.error(`Error clicking on "Photos du propriétaire" button: ${clickError.message}`);
  }
}

async function scrapeImageUrls(page: Page): Promise<string[]> {
  try {
    const targetDivSelector = '.U39Pmb';
    await page.waitForSelector(targetDivSelector);
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
      console.log('Target div not found');
      throw new Error('Target div not found');
    }
  } catch (hoverError: any) {
    console.error(`Error hovering over target div: ${hoverError.message}`);
    throw new Error(`Error hovering over target div: ${hoverError.message}`);
  }
}
function formatAddressForURL(address: String) {


  return address.replace(/[^a-zA-Z0-9\s]/g, '');
}
function randomTimeout(): number {
  return Math.floor(500 + Math.random() * 1500);
}
