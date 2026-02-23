import { Request, Response } from 'express';
import axios from 'axios';
import * as ProxyController from '../ProxyController';

// License short names from Wikimedia API → display format
const LICENSE_MAP: Record<string, string> = {
    'cc-by-sa-4.0': 'Creative Commons Attribution-Share Alike 4.0',
    'cc-by-sa-3.0': 'Creative Commons Attribution-Share Alike 3.0',
    'cc-by-sa-2.0': 'Creative Commons Attribution-Share Alike 2.0',
    'cc-by-4.0': 'Creative Commons Attribution 4.0',
    'cc-by-3.0': 'Creative Commons Attribution 3.0',
    'cc-by-2.0': 'Creative Commons Attribution 2.0',
};

const ALLOWED_LICENSE_PATTERNS = [
    'cc-by-sa-4.0', 'cc-by-sa-3.0', 'cc-by-sa-2.0',
    'cc-by-4.0', 'cc-by-3.0', 'cc-by-2.0',
];

function stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
}

function matchLicense(licenseValue: string): string | null {
    const lower = licenseValue.toLowerCase();
    for (const pattern of ALLOWED_LICENSE_PATTERNS) {
        if (lower.includes(pattern)) {
            return LICENSE_MAP[pattern] || null;
        }
    }
    return null;
}

export async function wikiMediaSearch(req?: Request, res?: Response): Promise<{ urls: [string, string, string][], count: number, error?: string }> {
    const name = req ? req.body.name as string : '';

    if (!name) {
        const error = 'Name is required';
        if (res) {
            console.log(error);
            res.status(400).json({ error });
        }
        return { urls: [], count: 0, error };
    }

    try {
        const proxy = ProxyController.getNextProxy();
        const agent = ProxyController.getCachedAgent(proxy.address);
        const startTime = Date.now();

        const apiUrl = 'https://commons.wikimedia.org/w/api.php';
        const params = {
            action: 'query',
            generator: 'search',
            gsrsearch: name,
            gsrnamespace: '6', // File namespace
            gsrlimit: '50',
            prop: 'imageinfo',
            iiprop: 'url|extmetadata',
            iiurlwidth: '1000',
            format: 'json',
            origin: '*',
        };

        console.log(`[Wikimedia API] Searching for: "${name}"`);

        const response = await axios.get(apiUrl, {
            params,
            headers: {
                'User-Agent': 'TomexploreBot/1.0 (tourism image aggregator; https://tomexplore.com)',
            },
            httpsAgent: agent,
            timeout: 15000,
        });

        const latency = Date.now() - startTime;
        if (proxy.address) ProxyController.reportSuccess(proxy.address, latency);

        const pages = response.data?.query?.pages;
        if (!pages) {
            console.log('[Wikimedia API] No results found');
            const result = { urls: [] as [string, string, string][], count: 0, error: 'No images found on Wikimedia commons' };
            if (res) res.json(result);
            return result;
        }

        const results: [string, string, string][] = [];

        for (const pageId of Object.keys(pages)) {
            const page = pages[pageId];
            const imageInfo = page.imageinfo?.[0];
            if (!imageInfo) continue;

            const metadata = imageInfo.extmetadata || {};

            // Check license
            const licenseShortName = metadata.LicenseShortName?.value || '';
            const licenseDisplay = matchLicense(licenseShortName);
            if (!licenseDisplay) continue;

            // Get image URL — prefer the thumbnail (resized to 1000px width), fallback to full URL
            const imageUrl = imageInfo.thumburl || imageInfo.url || '';
            if (!imageUrl) continue;

            // Get author — strip HTML tags
            let author = metadata.Artist?.value || 'Anonyme';
            author = stripHtmlTags(author);
            if (!author) author = 'Anonyme';

            results.push([imageUrl, author, licenseDisplay]);
        }

        const urlsWithoutDoubles = checkDuplicateURLs(results);

        const result = {
            urls: urlsWithoutDoubles,
            count: urlsWithoutDoubles.length,
        };
        console.log(`[Wikimedia API] Found ${result.count} images with valid licenses in ${latency}ms`);

        if (res) {
            res.status(200).json(result);
        }

        return result;

    } catch (error: any) {
        console.error(`[Wikimedia API] Error during search: ${error.message}`);

        // Report proxy failure if it's a network error
        if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            const proxy = ProxyController.getNextProxy();
            if (proxy.address) ProxyController.reportFailure(proxy.address);
        }

        const errorMessage = `Error during search process: ${error.message}`;
        if (res) {
            res.status(500).json({ error: errorMessage });
        }
        return { urls: [], count: 0, error: errorMessage };
    }
}

function checkDuplicateURLs(results: [string, string, string][]): [string, string, string][] {
    const uniqueUrls = new Map<string, [string, string, string]>();

    for (const [url, author, license] of results) {
        if (!uniqueUrls.has(url)) {
            uniqueUrls.set(url, [url, author, license]);
        }
    }

    return Array.from(uniqueUrls.values());
}
