const { chromium } = require('playwright');

async function test2FAFlow() {
    console.log('Starting 2FA Console Test...');
    
    const browser = await chromium.launch({ headless: false }); // Set to false to see the browser
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Capture console messages
    const consoleMessages = [];
    page.on('console', msg => {
        const message = {
            type: msg.type(),
            text: msg.text(),
            location: msg.location()
        };
        consoleMessages.push(message);
        console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    });
    
    // Capture network requests
    const networkRequests = [];
    page.on('request', request => {
        networkRequests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers()
        });
        console.log(`[REQUEST] ${request.method()} ${request.url()}`);
    });
    
    // Capture network responses
    page.on('response', response => {
        console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
        if (!response.ok()) {
            console.log(`[ERROR] Failed request: ${response.status()} ${response.url()}`);
        }
    });
    
    try {
        // Navigate to your site
        console.log('Navigating to site...');
        await page.goto('https://musicsupplies.com'); // Replace with your actual URL
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        // Take screenshot of initial state
        await page.screenshot({ path: './CCimages/screenshots/initial-load.png' });
        
        // Try to find login form
        console.log('Looking for login form...');
        await page.waitForSelector('input[type="text"], input[type="email"]', { timeout: 10000 });
        
        // Fill in 999 login
        console.log('Filling login form...');
        const usernameField = page.locator('input[type="text"], input[type="email"]').first();
        const passwordField = page.locator('input[type="password"]').first();
        
        await usernameField.fill('999');
        await passwordField.fill('2750GroveAvenue'); // Replace with actual admin password
        
        // Take screenshot before submit
        await page.screenshot({ path: './CCimages/screenshots/before-login.png' });
        
        // Submit form
        console.log('Submitting login form...');
        await page.locator('button[type="submit"], button').filter({ hasText: /login|sign in/i }).first().click();
        
        // Wait for response and capture any errors
        await page.waitForTimeout(5000);
        
        // Take screenshot after submit
        await page.screenshot({ path: './CCimages/screenshots/after-login.png' });
        
    } catch (error) {
        console.error('Test error:', error);
        await page.screenshot({ path: './CCimages/screenshots/error-state.png' });
    }
    
    // Output summary
    console.log('\n=== CONSOLE MESSAGES ===');
    consoleMessages.forEach((msg, i) => {
        console.log(`${i + 1}. [${msg.type.toUpperCase()}] ${msg.text}`);
        if (msg.location) {
            console.log(`   Location: ${msg.location.url}:${msg.location.lineNumber}`);
        }
    });
    
    console.log('\n=== NETWORK ERRORS ===');
    const failedRequests = networkRequests.filter(req => 
        req.url.includes('functions/v1') || req.url.includes('2fa') || req.url.includes('admin')
    );
    failedRequests.forEach(req => {
        console.log(`${req.method} ${req.url}`);
    });
    
    await browser.close();
    console.log('Test completed. Check ./CCimages/screenshots/ for screenshots.');
}

test2FAFlow().catch(console.error);