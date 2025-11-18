const puppeteer = require('puppeteer');

async function testProxyWithUrlAuth() {
    const username = 'OR1970346620';
    const password = 'le0dWQsV';
    const proxyHost = '208.195.161.59';
    const proxyPort = '65095';
    
    // Format: http://username:password@host:port
    const proxyUrl = `http://${username}:${password}@${proxyHost}:${proxyPort}`;

    console.log('Testing proxy with URL auth format');
    console.log('Proxy:', `${proxyHost}:${proxyPort}`);
    
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            `--proxy-server=${proxyHost}:${proxyPort}`,
        ],
    });

    const page = await browser.newPage();
    
    // Try authentication
    await page.authenticate({ 
        username: username, 
        password: password 
    });

    console.log('Browser launched, testing connection...');

    try {
        // Test with shorter timeout
        await page.goto('https://api.ipify.org?format=json', { 
            waitUntil: 'domcontentloaded',
            timeout: 20000 
        });
        const ipData = await page.evaluate(() => document.body.textContent);
        console.log('✓ SUCCESS! IP Check Result:', ipData);
        console.log('✓ Proxy is working!');

    } catch (error) {
        console.error('✗ Failed:', error.message);
        console.log('\n⚠ Proxy authentication might be failing');
        console.log('Possible issues:');
        console.log('1. Proxy requires IP whitelisting');
        console.log('2. Credentials are incorrect');
        console.log('3. Proxy is down or blocked');
        console.log('4. Proxy provider uses different auth method');
    }

    await browser.close();
}

testProxyWithUrlAuth().catch(console.error);
