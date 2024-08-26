import { Page } from 'puppeteer';
import dotenv from 'dotenv';

// Charger les variables d'environnement à partir du fichier .env
dotenv.config();

// Extraire les IPs des proxy des variables d'environnement
const proxyList = process.env.PROXY_LIST ? process.env.PROXY_LIST.split(',') : [];
const username = process.env.PROXY_USERNAME || '';
const pw = process.env.PROXY_PASSWORD || '';

export async function getPuppeteerIP(page: Page): Promise<string> {
    const response = await page.goto('https://api64.ipify.org?format=json', {
        waitUntil: 'networkidle2',
    });

    if (!response) {
        throw new Error('Failed to load the IP check page');
    }

    const data = await response.json();
    return data.ip;
}

export function getRandomProxy() {
    const randomIndex = Math.floor(Math.random() * proxyList.length);
    return {
        address: proxyList[randomIndex],
        username,
        pw
    };
}