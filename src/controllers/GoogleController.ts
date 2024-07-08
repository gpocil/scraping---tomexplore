import { Request, Response } from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export async function fetchGoogleImgsFromBusinessPage(req?: Request, res?: Response): Promise<string[]> {
  const { url: rawUrl } = req ? req.body : { url: '' };
  console.log("raw url : " + rawUrl);

  if (!rawUrl) {
    console.error('URL is required');
    if (res) {
      res.status(400).json({ error: 'URL is required' });
    }
    return [];
  }

  console.log(`Fetching image URLs from: ${rawUrl}`);

  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('Browser launched');

    const page = await browser.newPage();
    console.log('New page opened');

    await page.goto(rawUrl, {
      waitUntil: 'networkidle2',
    });

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
        await browser.close();
        if (res) {
          res.status(500).json({ error: `Error handling consent page: ${consentError.message}` });
        }
        return [];
      }
    }

    if (currentUrl !== rawUrl) {
      try {
        console.warn('The navigated URL does not match the sanitized URL, retrying...');
        await page.goto(rawUrl, {
          waitUntil: 'networkidle2',
        });
        currentUrl = page.url();
        console.log(`Re-navigated URL: ${currentUrl}`);
      } catch (navigationError: any) {
        console.error(`Error re-navigating to the URL: ${navigationError.message}`);
        await browser.close();
        if (res) {
          res.status(500).json({ error: `Error re-navigating to the URL: ${navigationError.message}` });
        }
        return [];
      }
    }

    await page.waitForTimeout(854);

    try {
      const targetDivSelector = '.m6QErb.XiKgde';
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
          // Select all divs with class "Uf0tqf loaded"
          const divs = Array.from(document.querySelectorAll('div.Uf0tqf.loaded'));

          // Extract the URLs from the background-image style
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

        await browser.close();

        if (res) {
          res.json({ imageUrls });
        }
        return imageUrls;
      } else {
        console.log('Target div not found');
        await browser.close();
        if (res) {
          res.status(404).json({ error: 'Target div not found' });
        }
        return [];
      }
    } catch (hoverError: any) {
      console.error(`Error hovering over target div: ${hoverError.message}`);
      await browser.close();
      if (res) {
        res.status(500).json({ error: `Error hovering over target div: ${hoverError.message}` });
      }
      return [];
    }
  } catch (error: any) {
    console.error(`Error fetching image URLs: ${error.message}`);
    if (res) {
      res.status(500).json({ error: `Error fetching image URLs: ${error.message}` });
    }
    return [];
  }
}
