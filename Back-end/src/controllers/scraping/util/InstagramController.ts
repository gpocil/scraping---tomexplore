import { Request, Response } from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as ProxyController from '../ProxyController';
import path from 'path';
import fs from 'fs';

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

  // Create a directory to store screenshots if it doesn't exist
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
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

    // Take a screenshot after opening the page
    await page.screenshot({ path: path.join(screenshotsDir, '1_new_page_opened.png') });

    await page.authenticate({ username: proxy.username, password: proxy.pw });
    console.log('Proxy authenticated');

    await page.screenshot({ path: path.join(screenshotsDir, '2_proxy_authenticated.png') });

    await page.goto(`https://www.picuki.com/profile/${username}/`, {
      waitUntil: 'networkidle2',
    });
    console.log(`Navigated to picuki page of ${username}`);

    await page.screenshot({ path: path.join(screenshotsDir, '3_navigated_to_picuki.png') });

    const pageNotFound = await page.evaluate(() => {
      return document.body.textContent?.includes("Sorry, this page isn't available.") ||
        document.querySelector('h1')?.textContent === '404' ||
        false;
    });

    if (pageNotFound) {
      const error = "No Instagram account found, check spelling";
      console.log(error);
      await page.screenshot({ path: path.join(screenshotsDir, '4_page_not_found.png') });

      if (res) {
        res.status(500).json({ error });
      }
      await browser.close();
      console.log('Browser closed');
      return { urls: [], count: 0, error };
    }

    await page.waitForSelector('div.photo');
    console.log('Image container detected');

    await page.screenshot({ path: path.join(screenshotsDir, '5_image_container_detected.png') });

    const targetDivSelector = '.box-photo';
    await page.waitForSelector(targetDivSelector);
    const targetDiv = await page.$(targetDivSelector);
    console.log('Target div detected');

    await page.screenshot({ path: path.join(screenshotsDir, '6_target_div_detected.png') });

    if (targetDiv) {
      await targetDiv.hover();
      console.log('Hovered over the target div');
      await page.screenshot({ path: path.join(screenshotsDir, '7_hovered_target_div.png') });

      let imageUrls: string[] = [];
      let attempts = 0;
      const maxAttempts = 4;

      while (attempts < maxAttempts) {
        if (imageUrls.length === 12) {
          const loadMoreButton = await page.$('button.pagination-failed-retry');

          if (loadMoreButton) {
            console.log('Clicking "Load More" button');
            await page.screenshot({ path: path.join(screenshotsDir, '8_before_click_load_more.png') });

            await page.evaluate((btn) => btn.style.display = 'block', loadMoreButton);
            await loadMoreButton.click();

            await page.evaluate((btn) => {
              btn.style.display = 'block';
              btn.scrollIntoView();
            }, loadMoreButton);

            await page.waitForTimeout(500);

            for (let i = 0; i < 3; i++) {
              await page.mouse.wheel({ deltaY: 1000 });
              console.log(`Scrolled down ${i + 1} times after clicking "Load More" button`);
              await page.waitForTimeout(1000); // Adding delay between scrolls
            }

            await page.screenshot({ path: path.join(screenshotsDir, `9_scrolled_down_attempt_${attempts + 1}.png`) });

            const isVisible = await page.evaluate((btn) => {
              const rect = btn.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && rect.top >= 0;
            }, loadMoreButton);

            if (isVisible) {
              await loadMoreButton.click();
              console.log('Button clicked');
            } else {
              console.log('Button is not visible, skipping click');
            }

            await page.waitForTimeout(823);
            attempts++;
            continue;
          }
        }

        for (let i = 0; i < 3; i++) {
          await page.mouse.wheel({ deltaY: 1000 });
          console.log(`Scrolled down ${i + 1} times`);
          await page.waitForTimeout(482);
        }

        await page.waitForTimeout(1682);
        imageUrls = await page.evaluate(() => {
          const imgs = Array.from(document.querySelectorAll('div.photo img'));
          return imgs
            .filter(img => !(img as HTMLImageElement).alt.includes('©'))
            .map(img => (img as HTMLImageElement).src);
        });

        console.log(`Found ${imageUrls.length} image URLs after scrolling`);
        await page.screenshot({ path: path.join(screenshotsDir, `10_images_found_attempt_${attempts + 1}.png`) });
        attempts++;
      }

      const result = {
        urls: imageUrls,
        count: imageUrls.length,
      };

      if (res) {
        res.json(result);
      }

      await page.screenshot({ path: path.join(screenshotsDir, '11_final_screenshot.png') });
      await browser.close();
      console.log('Browser closed');
      return result;
    } else {
      const error = 'Target div not found';
      console.log(error);
      await page.screenshot({ path: path.join(screenshotsDir, '12_target_div_not_found.png') });

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
