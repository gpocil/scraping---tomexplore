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

    const maxReloadAttempts = 5; // Maximum reload attempts
    let reloadAttempts = 0;
    let contentFound = false;

    // Repeat the process of checking the "Reload page" button and waiting for content
    while (reloadAttempts < maxReloadAttempts && !contentFound) {
      const reloadButton = await page.$('div[role="button"][tabindex="0"]');

      if (reloadButton) {
        await reloadButton.click();
        console.log(`Clicked "Reload page" button (Attempt ${reloadAttempts + 1})`);
        await page.waitForTimeout(3000); // Wait for the page to reload

        // Check for the appearance of the images container
        const contentPresent = await page.$('div._aagw');

        if (contentPresent) {
          console.log('Content found, proceeding with image extraction');
          contentFound = true;
        } else {
          console.log('Content not found, checking for reload button again');
          reloadAttempts++;
        }
      } else {
        console.log('"Reload page" button not found after multiple attempts');
        break;
      }
    }

    if (!contentFound) {
      const error = "Failed to load content after multiple reload attempts";
      console.log(error);
      if (res) {
        res.status(500).json({ error });
      }
      await browser.close();
      return { urls: [], count: 0, error };
    }

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
      return { urls: [], count: 0, error };
    }

    // Directly check if the "Close" button exists, and close it using aria-label="Close"
    const closeButton = await page.$('svg[aria-label="Close"]');

    if (closeButton) {
      await closeButton.click();
      console.log('Closed login popup');
      await page.waitForTimeout(1000); // Wait for popup to close and page to stabilize
    } else {
      console.log('Close button not found, proceeding without closing popup');
    }

    let imageUrls: string[] = [];
    let attempts = 0;
    const maxAttempts = 3;
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
          return true;
        }
        return false;
      });

      if (showMoreButton) {
        console.log("Clicked 'Show more posts' button");
        await page.waitForTimeout(2000);
      } else {
        console.log("'Show more posts' button not found");
      }

      // Wait for images to load after scrolling
      await page.waitForSelector(imageSelector, { timeout: 10000 }); // Increased timeout

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
    }
    if (res) {
      res.status(500).json({ error: error.message });
    }
    return { urls: [], count: 0, error: error.message };
  }
}
