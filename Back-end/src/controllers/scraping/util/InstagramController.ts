import { Request, Response } from 'express';
import https from 'https';
import * as ProxyController from '../ProxyController';
export async function fetchInstagramImages(req?: Request, res?: Response): Promise<{ urls: string[], count: number, error?: string, source?: string }> {
  const username = req ? req.body.username as string : '';

  if (!username) {
    const error = 'Username is required';
    console.log(error);
    if (res) {
      res.status(400).json({ error });
    }
    return { urls: [], count: 0, error };
  }

  return new Promise((resolve, reject) => {
    try {
      console.log(`Fetching Instagram images for user: ${username}`);

      const options = {
        method: 'GET',
        hostname: 'instagram230.p.rapidapi.com',
        port: null,
        path: `/user/posts?username=${encodeURIComponent(username)}`,
        headers: {
          'x-rapidapi-key': 'fec6d0631bmshcf4428bf097f45bp13dc75jsn39ecb3f96346',
          'x-rapidapi-host': 'instagram230.p.rapidapi.com'
        }
      };

      const apiReq = https.request(options, (apiRes) => {
        const chunks: Buffer[] = [];

        apiRes.on('data', (chunk) => {
          chunks.push(chunk);
        });

        apiRes.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString();
            const data = JSON.parse(body);

            console.log('Instagram API Response:', {
              statusCode: apiRes.statusCode,
              headers: apiRes.headers,
              bodyLength: body.length,
              dataStructure: {
                hasItems: !!data.items,
                itemsCount: data.items?.length || 0,
                firstItem: data.items?.[0] ? JSON.stringify(data.items[0]).slice(0, 200) + '...' : null
              }
            });

            if (!data.items || !Array.isArray(data.items)) {
              const error = 'Invalid response format from Instagram API';
              console.error(error);
              if (res) {
                res.status(500).json({ error });
              }
              resolve({ urls: [], count: 0, error, source: 'Instagram' });
              return;
            }

            // Extract image URLs from the display_uri field
            const imageUrls = data.items
              .filter((item: { display_uri: any; image_versions2: { candidates: any; }; }) => item.display_uri || (item.image_versions2 && item.image_versions2.candidates))
              .map((item: { display_uri: any; image_versions2: { candidates: { url: any; }[]; }; }) => item.display_uri || (item.image_versions2.candidates[0]?.url))
              .filter(Boolean);

            console.log(`Found ${imageUrls.length} Instagram images for user ${username}`);

            const result = {
              urls: imageUrls,
              count: imageUrls.length,
              source: 'Instagram'
            };

            if (res) {
              res.json(result);
            }

            resolve(result);
          } catch (error: any) {
            console.error(`Error parsing Instagram API response: ${error.message}`);
            if (res) {
              res.status(500).json({ error: error.message });
            }
            resolve({ urls: [], count: 0, error: error.message, source: 'Instagram' });
          }
        });
      });

      apiReq.on('error', (error) => {
        console.error(`Error fetching Instagram images: ${error.message}`);
        if (res) {
          res.status(500).json({ error: error.message });
        }
        resolve({ urls: [], count: 0, error: error.message, source: 'Instagram' });
      });

      apiReq.end();
    } catch (error: any) {
      console.error(`Error in Instagram API request: ${error.message}`);
      if (res) {
        res.status(500).json({ error: error.message });
      }
      resolve({ urls: [], count: 0, error: error.message, source: 'Instagram' });
    }
  });
}
