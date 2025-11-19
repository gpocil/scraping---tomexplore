import { Page } from 'puppeteer';
import dotenv from 'dotenv';

// Charger les variables d'environnement à partir du fichier .env
dotenv.config();

// Extraire les IPs des proxy des variables d'environnement
const proxyList = process.env.PROXY_LIST ? process.env.PROXY_LIST.split(',') : [];
const username = process.env.PROXY_USERNAME || '';
const pw = process.env.PROXY_PASSWORD || '';

console.log('[ProxyController] Proxy configuration loaded:');
export async function getPuppeteerIP(page: Page): Promise<string> {
    console.log('[ProxyController] Fetching current IP address...');
    
    try {
        const response = await page.goto('https://api64.ipify.org?format=json', {
            waitUntil: 'networkidle2',
        });

        if (!response) {
            console.error('[ProxyController] Failed to load the IP check page - no response received');
            throw new Error('Failed to load the IP check page');
        }

        console.log(`[ProxyController] IP check page response status: ${response.status()}`);
        
        const data = await response.json();
        console.log(`[ProxyController] Current IP address: ${data.ip}`);
        
        return data.ip;
    } catch (error) {
        console.error('[ProxyController] Error fetching IP:', error);
        throw error;
    }
}

export function getRandomProxy() {
    console.log('[ProxyController] Selecting random proxy...');
    
    if (proxyList.length === 0) {
        console.warn('[ProxyController] WARNING: Proxy list is empty!');
        return {
            address: '',
            username,
            pw
        };
    }
    
    const randomIndex = Math.floor(Math.random() * proxyList.length);
    const selectedProxy = {
        address: proxyList[randomIndex],
        username,
        pw
    };
    
    console.log(`[ProxyController] Selected proxy at index ${randomIndex}: ${selectedProxy.address}`);
    
    return selectedProxy;
}