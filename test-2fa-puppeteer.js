const puppeteer = require('puppeteer');

async function testWith2FA() {
    console.log('Starting Puppeteer 2FA Test...');
    
    const browser = await puppeteer.launch({ 
        headless: false, // Set to true for headless mode
        devtools: true   // Open DevTools
    });
    
    const page = await browser.newPage();
    
    // Enable console API
    await page.evaluateOnNewDocument(() => {
        window.consoleErrors = [];
        const originalError = console.error;
        console.error = (...args) => {
            window.consoleErrors.push(args.join(' '));
            originalError.apply(console, args);
        };
    });
    
    // Listen to console events
    page.on('console', async (msg) => {
        const msgArgs = await Promise.all(msg.args().map(arg => arg.jsonValue()));
        console.log(`[${msg.type().toUpperCase()}]`, ...msgArgs);
    });
    
    // Listen to page errors
    page.on('pageerror', error => {
        console.log('[PAGE ERROR]', error.message);
    });
    
    // Listen to request failures
    page.on('requestfailed', request => {
        console.log('[REQUEST FAILED]', request.url(), request.failure().errorText);
    });
    
    // Listen to responses
    page.on('response', response => {
        if (!response.ok()) {
            console.log('[HTTP ERROR]', response.status(), response.url());
        }
    });
    
    try {
        console.log('Navigating to site...');
        await page.goto('https://musicsupplies.com', { waitUntil: 'networkidle2' });
        
        // Take screenshot
        await page.screenshot({ path: './CCimages/screenshots/puppeteer-initial.png' });
        
        // Wait for login form
        await page.waitForSelector('input[type="password"]', { timeout: 10000 });
        
        console.log('Filling login form...');
        await page.type('input[type="text"], input[type="email"]', '999');
        await page.type('input[type="password"]', '2750GroveAvenue');
        
        await page.screenshot({ path: './CCimages/screenshots/puppeteer-filled-form.png' });
        
        console.log('Clicking login...');
        await page.click('button[type="submit"]');
        
        // Wait for potential redirect or 2FA prompt
        await page.waitForTimeout(5000);
        
        await page.screenshot({ path: './CCimages/screenshots/puppeteer-after-submit.png' });
        
        // Check for any console errors that were captured
        const consoleErrors = await page.evaluate(() => window.consoleErrors || []);
        if (consoleErrors.length > 0) {
            console.log('\n=== CAPTURED CONSOLE ERRORS ===');
            consoleErrors.forEach((error, i) => {
                console.log(`${i + 1}. ${error}`);
            });
        }
        
    } catch (error) {
        console.error('Puppeteer test error:', error);
        await page.screenshot({ path: './CCimages/screenshots/puppeteer-error.png' });
    }
    
    // Keep browser open for manual inspection
    console.log('Test completed. Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
    await browser.close();
}

testWith2FA().catch(console.error);