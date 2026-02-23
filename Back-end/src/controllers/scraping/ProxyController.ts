import { Page } from 'puppeteer';
import dotenv from 'dotenv';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Charger les variables d'environnement à partir du fichier .env
dotenv.config();

// Extraire les IPs des proxy des variables d'environnement
const proxyList = process.env.PROXY_LIST ? process.env.PROXY_LIST.split(',') : [];
const username = process.env.PROXY_USERNAME || '';
const pw = process.env.PROXY_PASSWORD || '';

console.log('[ProxyController] Proxy configuration loaded:');

// --- Round-robin state ---
let roundRobinIndex = 0;

// --- Health tracking ---
interface ProxyHealth {
    consecutiveFailures: number;
    healthy: boolean;
    lastLatencyMs: number;
}

const healthMap = new Map<string, ProxyHealth>();

function getHealth(address: string): ProxyHealth {
    if (!healthMap.has(address)) {
        healthMap.set(address, { consecutiveFailures: 0, healthy: true, lastLatencyMs: 0 });
    }
    return healthMap.get(address)!;
}

const MAX_CONSECUTIVE_FAILURES = 5;

export function reportSuccess(address: string, latencyMs: number): void {
    const h = getHealth(address);
    h.consecutiveFailures = 0;
    h.healthy = true;
    h.lastLatencyMs = latencyMs;
}

export function reportFailure(address: string): void {
    const h = getHealth(address);
    h.consecutiveFailures++;
    if (h.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        h.healthy = false;
        console.warn(`[ProxyController] Proxy ${address} marked unhealthy after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`);
    }
}

/**
 * Round-robin proxy selection that skips unhealthy proxies.
 * If all proxies are unhealthy, resets them all and picks the next one.
 */
export function getNextProxy() {
    if (proxyList.length === 0) {
        console.warn('[ProxyController] WARNING: Proxy list is empty!');
        return { address: '', username, pw };
    }

    // Try to find a healthy proxy starting from current index
    for (let i = 0; i < proxyList.length; i++) {
        const idx = (roundRobinIndex + i) % proxyList.length;
        const address = proxyList[idx];
        const h = getHealth(address);

        if (h.healthy) {
            roundRobinIndex = (idx + 1) % proxyList.length;
            console.log(`[ProxyController] Round-robin selected proxy #${idx}: ${address}`);
            return { address, username, pw };
        }
    }

    // All proxies are unhealthy — reset all and pick next
    console.warn('[ProxyController] All proxies unhealthy, resetting health status');
    for (const [, h] of healthMap) {
        h.consecutiveFailures = 0;
        h.healthy = true;
    }

    const idx = roundRobinIndex % proxyList.length;
    roundRobinIndex = (idx + 1) % proxyList.length;
    const address = proxyList[idx];
    console.log(`[ProxyController] After reset, selected proxy #${idx}: ${address}`);
    return { address, username, pw };
}

// --- Cached HttpsProxyAgent ---
const agentCache = new Map<string, HttpsProxyAgent<string>>();

/**
 * Returns a cached HttpsProxyAgent for the given proxy address (or picks the next proxy if none provided).
 * Reuses agents to avoid creating a new one per request.
 */
export function getCachedAgent(address?: string): HttpsProxyAgent<string> | undefined {
    if (!address) {
        const proxy = getNextProxy();
        address = proxy.address;
        if (!address) return undefined;
    }

    if (agentCache.has(address)) {
        return agentCache.get(address)!;
    }

    const proxyUrl = `http://${username}:${pw}@${address}`;
    const agent = new HttpsProxyAgent(proxyUrl);
    agentCache.set(address, agent);
    return agent;
}

// --- Legacy function — redirects to round-robin ---
export function getRandomProxy() {
    return getNextProxy();
}

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
