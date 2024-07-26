import { Request, Response } from 'express';
import { Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';

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
    console.log(`Launching browser for search: ${username}`);
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-fullscreen'],
      defaultViewport: null // Use the full window size
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 0, height: 0 });

    console.log('New page opened');

    await page.goto(`https://www.picuki.com/profile/${username}/`, {
      waitUntil: 'networkidle2',
    });
    console.log(`Navigated to picuki page of ${username}`);

    // Prendre une capture d'écran et l'enregistrer
    const screenshotDir = path.join(__dirname, '../../..', 'temp', 'instaphotos');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotDir, `${username}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved at ${screenshotPath}`);

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

    await page.waitForSelector('div.photo');
    // await handleCookiesConsent(page);
    // await checkShowMorePosts(page);

    console.log('Image container detected');

    const targetDivSelector = '.box-photo';
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

      }
      await page.waitForTimeout(1682);

      const imageUrls = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('div.photo img'));
        return imgs.map(img => (img as HTMLImageElement).src);
      });
      console.log(`Found ${imageUrls.length} image URLs`);

      const result = {
        urls: imageUrls,
        count: imageUrls.length,
        screenshotUrl: `http://37.187.35.37:3000/images/${username}_screenshot.png`
      };
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
      await page.waitForTimeout(1000); // Wait for the page to update after clicking
      console.log('Cookies consent button clicked');
    } else {
      console.log('Cookies consent button not found');
    }
  } catch (error: any) {
    console.error(`Error handling cookies consent: ${error.message}`);
    throw new Error(`Error handling cookies consent: ${error.message}`);
  }
}

async function checkShowMorePosts(page: Page): Promise<void> {
  try {
    const showMorePostsButtonSelector = 'button.x1lugfcp';
    let retries = 3;  // Nombre de tentatives avant d'abandonner
    let clicked = false;

    while (retries > 0 && !clicked) {
      const showMorePostsButton = await page.$(showMorePostsButtonSelector);
      if (showMorePostsButton) {
        console.log('Show more posts button detected, clicking it...');
        await showMorePostsButton.click();
        await page.waitForTimeout(1000);
        console.log('Show more posts button clicked');
        clicked = true;
      } else {
        console.log('Show more posts button not found, retrying...');
        await page.waitForTimeout(2000);
        retries--;
      }
    }

    if (!clicked) {
      console.log('Failed to click Show more posts button after multiple attempts');
    }
  } catch (error: any) {
    console.error(`Error checking show more posts button: ${error.message}`);
    throw new Error(`Error checking show more posts button: ${error.message}`);
  }
}
