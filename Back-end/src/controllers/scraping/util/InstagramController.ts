import { Request, Response } from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as ProxyController from '../ProxyController';

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
    const proxy = ProxyController.getRandomProxy();
    console.log("Using proxy: " + proxy.address);

    browser = await puppeteer.launch({
      headless: "new",
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

    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'networkidle2',
    });
    console.log(`Navigated to Instagram page of ${username}`);

    // Check if the page is available or 404
    const pageNotFound = await page.evaluate(() => {
      return document.body.textContent?.includes("Sorry, this page isn't available.") ||
        document.querySelector('h1')?.textContent === '404' ||
        false;
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

    let imageUrls: string[] = [];
    let attempts = 0;
    const maxAttempts = 5;

    // Adjusted selector for images wrapped in '._aagv' div
    const imageSelector = 'div._aagv img';

    while (attempts < maxAttempts) {
      // Scroll down to load more images
      for (let i = 0; i < 3; i++) {
        await page.mouse.wheel({ deltaY: 1000 });
        console.log(`Scrolled down ${i + 1} times`);
        await page.waitForTimeout(1000);
      }

      // Click "Show more posts" button if present
      const showMoreButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const showMoreBtn = buttons.find(btn => btn.textContent?.includes("Show more posts"));
        if (showMoreBtn) {
          (showMoreBtn as HTMLElement).click();
          return true; // Click was successful
        }
        return false; // No button found
      });

      if (showMoreButton) {
        console.log("Clicked 'Show more posts' button");
        await page.waitForTimeout(2000); // Wait for more posts to load
      } else {
        console.log("'Show more posts' button not found");
      }

      // Wait for images to load after scrolling
      await page.waitForSelector(imageSelector, { timeout: 3000 });

      const newImageUrls = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('div._aagv img'));
        return imgs.map(img => (img as HTMLImageElement).src); // Cast to HTMLImageElement
      });

      imageUrls = [...new Set([...imageUrls, ...newImageUrls])]; // Keep unique URLs
      console.log(`Found ${imageUrls.length} image URLs after scrolling`);

      if (newImageUrls.length === 0) break; // Stop if no more new images are found
      attempts++;
    }

    const result = {
      urls: imageUrls,
      count: imageUrls.length,
    };
    if (res) {
      res.json(result);
    }
    await browser.close();
    console.log('Browser closed');
    return result;
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
