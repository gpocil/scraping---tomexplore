import puppeteer, { Page } from 'puppeteer';


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

const proxyList = [
    "40.183.120.13:5909",
    "40.183.126.218:6255",
    "40.183.121.210:8716",
    "40.183.120.157:7970",
    "40.183.118.214:6736",
    "40.183.126.63:7272",
    "40.183.115.211:5155",
    "40.183.127.66:5797",
    "40.183.114.221:7899",
    "40.183.124.79:6573",
    "40.183.114.43:6301",
    "40.183.115.14:5944",
    "40.183.119.119:8065",
    "40.183.127.169:8585",
    "40.183.114.231:7648",
    "40.183.127.252:7152",
    "40.183.124.197:5431",
    "40.183.124.123:6872",
    "40.183.114.227:7358",
    "40.183.112.122:7270",
    "40.183.127.217:5638",
    "40.183.115.255:8323",
    "40.183.114.245:8475",
    "40.183.113.175:8599",
    "40.183.113.42:7438",
    "40.183.117.122:5701",
    "40.183.115.141:6054",
    "40.183.123.187:6303",
    "40.183.124.191:6141",
    "40.183.123.70:7182"
];
const username = 'OR835424952';
const pw = 'KhYLJ6KF';

export function getRandomProxy() {
    const randomIndex = Math.floor(Math.random() * proxyList.length);
    return {
        address: proxyList[randomIndex],
        username,
        pw
    };
}
