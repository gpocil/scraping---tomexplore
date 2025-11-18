const https = require('https');

console.log('Checking your current public IP address...\n');

https.get('https://api.ipify.org?format=json', (resp) => {
    let data = '';
    
    resp.on('data', (chunk) => {
        data += chunk;
    });
    
    resp.on('end', () => {
        const result = JSON.parse(data);
        console.log('═══════════════════════════════════════════════════');
        console.log('Your Current Public IP:', result.ip);
        console.log('═══════════════════════════════════════════════════');
        console.log('\n⚠ IMPORTANT:');
        console.log('If your proxy provider requires IP whitelisting,');
        console.log('you need to add this IP to your proxy dashboard.');
        console.log('\nCommon proxy providers that require whitelisting:');
        console.log('- Bright Data (Luminati)');
        console.log('- Smartproxy');
        console.log('- Oxylabs');
        console.log('- IPRoyal');
        console.log('- Proxy-Seller');
    });
    
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
