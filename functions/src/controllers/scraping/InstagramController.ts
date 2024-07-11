import { Request, Response } from 'express';
import puppeteer from 'puppeteer';

export async function fetchInstagramImages(req?: Request, res?: Response): Promise<{ urls: string[], count: number }> {
  const username = req ? req.body.username as string : '';

  if (!username) {
    if (res) {
      res.status(400).json({ error: 'Username is required' });
    }
    return { urls: [], count: 0 };
  }

  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'networkidle2',
    });

    // Check if the page contains "Sorry, this page isn't available."
    const pageNotFound = await page.evaluate(() => {
      return document.body.textContent?.includes("Sorry, this page isn't available.") || false;
    });

    if (pageNotFound) {
      await browser.close();
      if (res) {
        res.status(404).json({ error: "Sorry, this page isn't available." });
      }
      return { urls: [], count: 0 };
    }

    await page.waitForSelector('div._aagv');
    const targetDivSelector = '._aagu';
    await page.waitForSelector(targetDivSelector);
    const targetDiv = await page.$(targetDivSelector);

    if (targetDiv) {
      await targetDiv.hover();
      console.log('Hovered over the target div');

      for (let i = 0; i < 3; i++) {
        await page.mouse.wheel({
          deltaY: 1000,
        });

        console.log("Scrolled down");

        await page.waitForTimeout(2000);
      }

      const imageUrls = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('div._aagv img'));
        return imgs.map(img => (img as HTMLImageElement).src);
      });

      await browser.close();

      const result = { urls: imageUrls, count: imageUrls.length };
      if (res) {
        res.json(result);
      }
      return result;
    } else {
      await browser.close();
      if (res) {
        res.status(404).json({ error: 'Target div not found' });
      }
      return { urls: [], count: 0 };
    }
  } catch (error: any) {
    if (res) {
      res.status(500).json({ error: error.message });
    }
    return { urls: [], count: 0 };
  }
}
