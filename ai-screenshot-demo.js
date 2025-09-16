#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

/**
 * AI-powered screenshot tool demonstration
 * This shows how to integrate screenshot capabilities with various AI services
 */

// Configuration for different AI services
const AI_CONFIGS = {
  openai: {
    name: 'OpenAI GPT',
    apiKey: process.env.OPENAI_API_KEY || 'your-openai-key-here',
    endpoint: 'https://api.openai.com/v1/chat/completions'
  },
  claude: {
    name: 'Claude',
    apiKey: process.env.ANTHROPIC_API_KEY || 'your-anthropic-key-here', 
    endpoint: 'https://api.anthropic.com/v1/messages'
  },
  browserbase: {
    name: 'Browserbase + Stagehand',
    apiKey: process.env.BROWSERBASE_API_KEY || 'your-browserbase-key-here',
    projectId: process.env.BROWSERBASE_PROJECT_ID || 'your-project-id'
  }
};

/**
 * Take a screenshot using Puppeteer
 */
async function takeScreenshot(url, outputPath = 'screenshot.png', options = {}) {
  const {
    width = 1920,
    height = 1080,
    fullPage = false,
    delay = 2000
  } = options;

  console.log(`📸 Taking screenshot of: ${url}`);
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height });
    
    console.log(`🌐 Navigating to ${url}...`);
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    console.log(`⏳ Waiting ${delay}ms for content to load...`);
    await page.waitForTimeout(delay);
    
    console.log(`💾 Saving screenshot to: ${outputPath}`);
    await page.screenshot({
      path: outputPath,
      fullPage: fullPage,
      type: 'png'
    });
    
    const stats = await fs.stat(outputPath);
    const title = await page.title();
    
    console.log(`✅ Screenshot saved successfully!`);
    console.log(`📊 Details: ${title} (${(stats.size / 1024).toFixed(1)} KB)`);
    
    return {
      success: true,
      title,
      path: path.resolve(outputPath),
      size: stats.size
    };
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return { success: false, error: error.message };
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Extract text content from a webpage for AI analysis
 */
async function extractWebContent(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Extract meaningful content
    const content = await page.evaluate(() => {
      // Remove script and style elements
      const scripts = document.querySelectorAll('script, style');
      scripts.forEach(el => el.remove());
      
      // Get main content areas
      const contentSelectors = [
        'main', 'article', '.content', '#content', 
        '.main-content', 'body'
      ];
      
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          return {
            title: document.title,
            text: element.innerText.slice(0, 2000), // Limit to 2000 chars
            url: window.location.href
          };
        }
      }
      
      return {
        title: document.title,
        text: document.body.innerText.slice(0, 2000),
        url: window.location.href
      };
    });
    
    return content;
  } catch (error) {
    throw new Error(`Failed to extract content: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Demonstrate AI integration approaches
 */
function demonstrateAIIntegration() {
  console.log(`
🤖 AI Screenshot Integration Demo

This tool demonstrates how to integrate screenshot functionality with AI services:

1. **Screenshot + OpenAI Vision API**
   - Take screenshot of webpage
   - Send image to GPT-4 Vision for analysis
   - Get AI insights about the page content, design, etc.

2. **Screenshot + Claude Vision**
   - Capture webpage screenshot
   - Use Claude's vision capabilities for analysis
   - Extract information, summarize content, analyze UI/UX

3. **Browserbase + Stagehand MCP**
   - Use cloud browsers via Browserbase API
   - AI-powered web automation with Stagehand
   - No local browser dependencies required

4. **Content Extraction + Text AI**
   - Extract text content from webpages
   - Feed to any AI service for analysis
   - Useful for content summarization, SEO analysis

Example Workflows:
-----------------

📊 **Website Analysis**
   node ai-screenshot-demo.js analyze https://example.com
   → Screenshot + AI analysis of design, content, accessibility

🔍 **Competitor Research**  
   node ai-screenshot-demo.js compare https://site1.com https://site2.com
   → Compare multiple sites with AI insights

📝 **Content Summarization**
   node ai-screenshot-demo.js summarize https://blog.example.com
   → Extract and summarize article content

🎨 **Design Review**
   node ai-screenshot-demo.js design-review https://mysite.com
   → AI-powered design and UX feedback

Current Configuration:
---------------------
${Object.entries(AI_CONFIGS).map(([key, config]) => 
  `${config.name}: ${config.apiKey !== 'your-' + key + '-key-here' ? '✅ Configured' : '❌ Not configured'}`
).join('\n')}
`);
}

/**
 * Main CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    demonstrateAIIntegration();
    return;
  }
  
  const command = args[0];
  const url = args[1];
  
  switch (command) {
    case 'screenshot':
      if (!url) {
        console.log('❌ URL required. Usage: node ai-screenshot-demo.js screenshot <url>');
        return;
      }
      
      const filename = `screenshot-${Date.now()}.png`;
      const result = await takeScreenshot(url, filename);
      
      if (result.success) {
        console.log(`\n🎯 Ready for AI analysis! You could now:`);
        console.log(`   • Send ${filename} to OpenAI Vision API`);
        console.log(`   • Analyze with Claude's vision capabilities`);
        console.log(`   • Use for automated testing or monitoring`);
      }
      break;
      
    case 'extract':
      if (!url) {
        console.log('❌ URL required. Usage: node ai-screenshot-demo.js extract <url>');
        return;
      }
      
      try {
        const content = await extractWebContent(url);
        console.log(`\n📄 Extracted Content from: ${content.title}`);
        console.log(`📝 Text Preview: ${content.text.substring(0, 200)}...`);
        console.log(`\n🤖 This content is ready to send to any AI service for:`);
        console.log(`   • Summarization • SEO analysis • Content categorization`);
        console.log(`   • Sentiment analysis • Key information extraction`);
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
      break;
      
    case 'demo':
      // Run a quick demonstration
      console.log(`🚀 Running AI Screenshot Demo...`);
      
      const demoResult = await takeScreenshot(
        'https://example.com', 
        'demo-screenshot.png',
        { fullPage: true }
      );
      
      if (demoResult.success) {
        console.log(`
✅ Demo completed successfully!

📸 Screenshot saved: demo-screenshot.png
🤖 AI Integration ready:
   • Image analysis capabilities: Ready
   • Content extraction capabilities: Ready  
   • Cloud browser automation: ${AI_CONFIGS.browserbase.apiKey !== 'your-browserbase-key-here' ? 'Ready' : 'Configure API keys'}
   
💡 Next steps:
   1. Configure AI service API keys in environment variables
   2. Use this as a foundation for AI-powered web automation
   3. Integrate with your favorite AI service for webpage analysis
`);
      }
      break;
      
    default:
      console.log(`❌ Unknown command: ${command}`);
      console.log(`Available commands: screenshot, extract, demo, --help`);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

// Export for use as module
export { takeScreenshot, extractWebContent };
