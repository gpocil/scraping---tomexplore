import { Request, Response } from 'express';
import axios from 'axios';
import * as ProxyController from '../ProxyController';

interface ImageResultTourist {
    urls: [string, string, string][];
    count: number;
    error?: string;
    link: string;
}

export async function unsplashSearch(req?: Request, res?: Response): Promise<ImageResultTourist> {
    const name = req ? (req.body.name as string) : '';

    if (!name) {
        const error = 'Name is required';
        if (res) {
            console.log(error);
            res.status(400).json({ error });
        }
        return { urls: [], count: 0, error, link: '' };
    }

    const searchUrl = `https://unsplash.com/s/photos/${name.replace(/\s+/g, '-')}`;

    try {
        const proxy = ProxyController.getNextProxy();
        const agent = ProxyController.getCachedAgent(proxy.address);
        const startTime = Date.now();

        const apiUrl = 'https://unsplash.com/napi/search/photos';
        const params = {
            query: name,
            per_page: '30',
        };

        console.log(`[Unsplash HTTP] Searching for: "${name}"`);

        const response = await axios.get(apiUrl, {
            params,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://unsplash.com/',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            httpsAgent: agent,
            timeout: 15000,
        });

        const latency = Date.now() - startTime;
        if (proxy.address) ProxyController.reportSuccess(proxy.address, latency);

        const results = response.data?.results;
        if (!results || !Array.isArray(results)) {
            console.log('[Unsplash HTTP] No results found');
            const result: ImageResultTourist = { urls: [], count: 0, error: 'No images found on Unsplash', link: searchUrl };
            if (res) res.json(result);
            return result;
        }

        const imageUrls: [string, string, string][] = results
            .filter((photo: any) => photo.urls?.regular)
            .map((photo: any) => {
                const url = photo.urls.regular || photo.urls.full || '';
                const width = (photo.width || '').toString();
                const height = (photo.height || '').toString();
                return [url, width, height] as [string, string, string];
            });

        console.log(`[Unsplash HTTP] Found ${imageUrls.length} images in ${latency}ms`);

        const result: ImageResultTourist = {
            urls: imageUrls,
            count: imageUrls.length,
            link: searchUrl,
        };

        if (res) {
            res.status(200).json(result);
        }
        return result;

    } catch (error: any) {
        console.error(`[Unsplash HTTP] Error: ${error.message}`);

        if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            const proxy = ProxyController.getNextProxy();
            if (proxy.address) ProxyController.reportFailure(proxy.address);
        }

        const errorMessage = 'Error occurred during image search';
        if (res) {
            res.status(500).json({ error: errorMessage });
        }
        return {
            urls: [],
            count: 0,
            error: errorMessage,
            link: '',
        };
    }
}
