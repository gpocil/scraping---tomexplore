import { Request, Response } from 'express';
import axios from 'axios';
import * as ProxyController from '../ProxyController';
import { config } from '../../../config';
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

  try {
      console.log(`Fetching Instagram images for user: ${username}`);

      const agent = ProxyController.getCachedAgent();

      const response = await axios.get(
          `https://instagram230.p.rapidapi.com/user/posts?username=${encodeURIComponent(username)}`,
          {
              headers: {
                  'x-rapidapi-key': config.rapidApiKey,
                  'x-rapidapi-host': 'instagram230.p.rapidapi.com'
              },
              httpsAgent: agent
          }
      );

      const data = response.data;

      console.log('Instagram API Response:', {
          statusCode: response.status,
          bodyLength: JSON.stringify(data).length,
          dataStructure: {
              hasItems: !!data.items,
              itemsCount: data.items?.length || 0,
              firstItem: data.items?.[0] ? JSON.stringify(data.items[0]).slice(0, 200) + '...' : null
          }
      });

      if (!data.items || !Array.isArray(data.items)) {
          const error = 'Invalid response format from Instagram API';
          console.error(error);
          if (res) res.status(500).json({ error });
          return { urls: [], count: 0, error, source: 'Instagram' };
      }

      const imageUrls = data.items
          .filter((item: any) => item.display_uri || (item.image_versions2 && item.image_versions2.candidates))
          .map((item: any) => item.display_uri || (item.image_versions2.candidates[0]?.url))
          .filter(Boolean);

      console.log(`Found ${imageUrls.length} Instagram images for user ${username}`);

      const result = { urls: imageUrls, count: imageUrls.length, source: 'Instagram' };
      if (res) res.json(result);
      return result;
  } catch (error: any) {
      console.error(`Error fetching Instagram images: ${error.message}`);
      if (res) res.status(500).json({ error: error.message });
      return { urls: [], count: 0, error: error.message, source: 'Instagram' };
  }
}
