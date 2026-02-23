import { Request, Response } from 'express';
import axios from 'axios';
import * as ProxyController from '../ProxyController';

const wikiExtensions = [
    ["Ireland", "en"],
    ["United Kingdom", "en"],
    ["Germany", "de"],
    ["Austria", "de"],
    ["Switzerland", "de"],
    ["France", "fr"],
    ["Belgium", "fr"],
    ["Switzerland", "fr"],
    ["Sweden", "sv"],
    ["Netherlands", "nl"],
    ["Belgium", "nl"],
    ["Russia", "ru"],
    ["Ukraine", "uk"],
    ["Italy", "it"],
    ["Poland", "pl"],
    ["Spain", "es"],
    ["Switzerland", "it"],
    ["Portugal", "pt"],
    ["Romania", "ro"],
    ["Serbia", "sr"],
    ["Montenegro", "sr"],
    ["Croatia", "hr"],
    ["Bosnia and Herzegovina", "sh"],
    ["Slovakia", "sk"],
    ["Czech Republic", "cs"],
    ["Hungary", "hu"],
    ["Finland", "fi"],
    ["Estonia", "et"],
    ["Latvia", "lv"],
    ["Lithuania", "lt"],
    ["Slovenia", "sl"],
    ["Greece", "el"],
    ["Bulgaria", "bg"],
    ["Denmark", "da"],
    ["Norway", "no"],
    ["Iceland", "is"],
    ["Macedonia", "mk"],
    ["Albania", "sq"],
    ["Belarus", "be"],
    ["Moldova", "ro"],
    ["Luxembourg", "lb"],
    ["Malta", "mt"],
    ["Armenia", "hy"],
    ["Georgia", "ka"],
    ["Bosnia and Herzegovina", "bs"],
    ["Monaco", "fr"],
    ["San Marino", "it"],
    ["Andorra", "ca"],
    ["Liechtenstein", "de"],
    ["Kosovo", "sq"],
    ["Vatican City", "la"],
    ["Cyprus", "el"],
    ["Turkey", "tr"]
];

export async function findWikipediaUrl(req?: Request, res?: Response): Promise<string> {
    const name = req ? req.body.name as string : '';
    const country = req ? req.body.country as string : '';

    if (!name || !country) {
        if (res) {
            console.log('Error: name and country are required');
            res.status(400).json({ error: 'name and country are required' });
        }
        return '';
    }

    try {
        // Get country-specific Wikipedia extension
        const countryExtension = wikiExtensions.find(([c]) => c.toLowerCase() === country.toLowerCase())?.[1] || 'en';
        console.log(`[Wikipedia API] Using language: ${countryExtension} for country: ${country}`);

        const proxy = ProxyController.getNextProxy();
        const agent = ProxyController.getCachedAgent(proxy.address);
        const startTime = Date.now();

        const apiUrl = `https://${countryExtension}.wikipedia.org/w/api.php`;
        const params = {
            action: 'opensearch',
            search: name,
            limit: '1',
            format: 'json',
        };

        console.log(`[Wikipedia API] Searching for: "${name}" on ${countryExtension}.wikipedia.org`);

        const response = await axios.get(apiUrl, {
            params,
            headers: {
                'User-Agent': 'TomexploreBot/1.0 (tourism image aggregator; https://tomexplore.com)',
            },
            httpsAgent: agent,
            timeout: 10000,
        });

        const latency = Date.now() - startTime;
        if (proxy.address) ProxyController.reportSuccess(proxy.address, latency);

        // OpenSearch returns [searchTerm, [titles], [descriptions], [urls]]
        const urls = response.data?.[3];
        const resultUrl = (urls && urls.length > 0) ? urls[0] : '';

        if (resultUrl) {
            console.log(`[Wikipedia API] Found URL: ${resultUrl} in ${latency}ms`);
        } else {
            console.log(`[Wikipedia API] No article found for "${name}" in ${latency}ms`);
        }

        if (res) {
            res.json({ url: resultUrl });
        }
        return resultUrl;

    } catch (error: any) {
        console.error(`[Wikipedia API] Error during search: ${error.message}`);

        if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            const proxy = ProxyController.getNextProxy();
            if (proxy.address) ProxyController.reportFailure(proxy.address);
        }

        if (res) {
            res.status(500).json({ error: error.message });
        }
        return '';
    }
}
