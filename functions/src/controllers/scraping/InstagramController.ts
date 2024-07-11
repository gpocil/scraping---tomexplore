import { Request, Response } from 'express';
import { Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export async function fetchInstagramImages(req?: Request, res?: Response): Promise<{ urls: string[], count: number, error?: string }> {
  const username = req ? req.body.username as string : '';

  if (!username) {
    const error = 'Username is required';
    console.log(error);
    if (res) {
      res.status(400).json({ error });
    }
    return { urls: [], count: 0, error };
  }

  let browser;
  try {
    console.log(`Launching browser for Instagram user: ${username}`);
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('Browser launched');

    const page = await browser.newPage();
    console.log('New page opened');

    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'networkidle2',
    });
    console.log(`Navigated to Instagram page of ${username}`);


    const pageNotFound = await page.evaluate(() => {
      return document.body.textContent?.includes("Sorry, this page isn't available.") || false;
    });

    if (pageNotFound) {
      const error = "No Instagram account found, check spelling";
      console.log(error);
      if (res) {
        res.status(500).json({ error });
      }
      await browser.close();
      console.log('Browser closed');
      return { urls: [], count: 0, error };
    }

    await page.waitForSelector('div._aagv');
    await handleCookiesConsent(page);

    console.log('Image container detected');

    const targetDivSelector = '._aagu';
    await page.waitForSelector(targetDivSelector);
    const targetDiv = await page.$(targetDivSelector);
    console.log('Target div detected');

    if (targetDiv) {
      await targetDiv.hover();
      console.log('Hovered over the target div');

      for (let i = 0; i < 3; i++) {
        await page.mouse.wheel({
          deltaY: 1000,
        });
        console.log(`Scrolled down ${i + 1} times`);

        await page.waitForTimeout(2000);
      }

      const imageUrls = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('div._aagv img'));
        return imgs.map(img => (img as HTMLImageElement).src);
      });
      console.log(`Found ${imageUrls.length} image URLs`);

      const result = { urls: imageUrls, count: imageUrls.length };
      if (res) {
        res.json(result);
      }
      await browser.close();
      console.log('Browser closed');
      return result;
    } else {
      const error = 'Target div not found';
      console.log(error);
      if (res) {
        res.status(500).json({ error });
      }
      await browser.close();
      console.log('Browser closed');
      return { urls: [], count: 0, error };
    }
  } catch (error: any) {
    console.error(`Error fetching Instagram images: ${error.message}`);
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
    if (res) {
      res.status(500).json({ error: error.message });
    }
    return { urls: [], count: 0, error: error.message };
  }
}

async function handleCookiesConsent(page: Page): Promise<void> {
  try {
    const cookiesButtonSelector = 'button._a9--._ap36._a9_0';
    const cookiesButton = await page.$(cookiesButtonSelector);
    if (cookiesButton) {
      console.log('Cookies consent button detected, clicking it...');
      await cookiesButton.click();
      await page.waitForTimeout(2000); // Wait for the page to update after clicking
      console.log('Cookies consent button clicked');
    } else {
      console.log('Cookies consent button not found');
    }
  } catch (error: any) {
    console.error(`Error handling cookies consent: ${error.message}`);
    throw new Error(`Error handling cookies consent: ${error.message}`);
  }
}
