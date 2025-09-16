#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

/**
 * Take a screenshot of a given URL
 * @param {string} url - The URL to screenshot
 * @param {string} outputPath - Path to save the screenshot
 * @param {Object} options - Screenshot options
 */
async function takeScreenshot(url, outputPath = 'screenshot.png', options = {}) {
  const {
    width = 1920,
    height = 1080,
    fullPage = false,
    waitForSelector = null,
    delay = 1000
  } = options;

  console.log(`📸 Taking screenshot of: ${url}`);
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width, height });
    
    // Navigate to the URL
    console.log(`🌐 Navigating to ${url}...`);
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for specific selector if provided
    if (waitForSelector) {
      console.log(`⏳ Waiting for selector: ${waitForSelector}`);
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    }
    
    // Add delay to let dynamic content load
    if (delay > 0) {
      console.log(`⏳ Waiting ${delay}ms for content to load...`);
      await page.waitForTimeout(delay);
    }
    
    // Take screenshot
    console.log(`💾 Saving screenshot to: ${outputPath}`);
    await page.screenshot({
      path: outputPath,
      fullPage: fullPage,
      type: 'png'
    });
    
    console.log(`✅ Screenshot saved successfully!`);
    
    // Get page title and URL for confirmation
    const title = await page.title();
    const finalUrl = page.url();
    
    return {
      success: true,
      title,
      url: finalUrl,
      screenshotPath: path.resolve(outputPath),
      size: fs.statSync(outputPath).size
    };
    
  } catch (error) {
    console.error(`❌ Error taking screenshot:`, error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
🖼️  URL Screenshot Tool

Usage:
  node screenshot-tool.js <url> [output-file] [options]

Examples:
  node screenshot-tool.js https://example.com
  node screenshot-tool.js https://google.com google-homepage.png
  node screenshot-tool.js https://github.com github.png --full-page
  node screenshot-tool.js https://example.com --width=1280 --height=800

Options:
  --width=N         Browser width (default: 1920)
  --height=N        Browser height (default: 1080)
  --full-page       Take full page screenshot
  --delay=N         Wait N milliseconds before screenshot (default: 1000)
  --wait-for=selector  Wait for CSS selector to appear
  --help            Show this help message
`);
    return;
  }
  
  const url = args[0];
  let outputFile = args[1] || 'screenshot.png';
  
  // Parse options
  const options = {};
  args.forEach(arg => {
    if (arg.startsWith('--width=')) options.width = parseInt(arg.split('=')[1]);
    if (arg.startsWith('--height=')) options.height = parseInt(arg.split('=')[1]);
    if (arg.startsWith('--delay=')) options.delay = parseInt(arg.split('=')[1]);
    if (arg.startsWith('--wait-for=')) options.waitForSelector = arg.split('=')[1];
    if (arg === '--full-page') options.fullPage = true;
  });
  
  // Ensure output file has .png extension
  if (!outputFile.endsWith('.png')) {
    outputFile += '.png';
  }
  
  const result = await takeScreenshot(url, outputFile, options);
  
  if (result.success) {
    console.log(`\n📊 Screenshot Details:`);
    console.log(`   Title: ${result.title}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   File: ${result.screenshotPath}`);
    console.log(`   Size: ${(result.size / 1024).toFixed(1)} KB`);
  } else {
    console.log(`\n❌ Failed to take screenshot: ${result.error}`);
    process.exit(1);
  }
}

// Export for use as module
export { takeScreenshot };

// Run as CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
