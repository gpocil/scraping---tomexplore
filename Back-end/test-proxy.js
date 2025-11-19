const puppeteer = require('puppeteer');

async function testProxy() {
    const proxy = {
        address: '208.195.161.59:65095',
        username: 'OR1970346620',
        password: 'le0dWQsV'
    };

    console.log('Testing proxy:', proxy.address);
    
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            `--proxy-server=${proxy.address}`,
        ],
    });

    const page = await browser.newPage();
    
    // Authenticate
    await page.authenticate({ 
        username: proxy.username, 
        password: proxy.password 
    });

    console.log('Browser launched with proxy, testing IP...');

    try {
        // Test 1: Check IP
        await page.goto('https://api.ipify.org?format=json', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        const ipData = await page.evaluate(() => document.body.textContent);
        console.log('✓ IP Check Result:', ipData);

        // Test 2: Try Google
        console.log('\nTesting Google access...');
        await page.goto('https://www.google.com', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        console.log('✓ Google loaded successfully');

        // Test 3: Try Google Maps
        console.log('\nTesting Google Maps access...');
        await page.goto('https://www.google.com/maps', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        console.log('✓ Google Maps loaded successfully');

    } catch (error) {
        console.error('✗ Error:', error.message);
    }

    await browser.close();
    console.log('\nTest complete');
}

testProxy().catch(console.error);
