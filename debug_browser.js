const puppeteer = require('puppeteer');

async function debugBrowser() {
  try {
    const browser = await puppeteer.launch({ 
      headless: false,
      devtools: true,
      defaultViewport: { width: 1200, height: 800 }
    });
    
    const page = await browser.newPage();
    
    // Navigate to the dev server
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    console.log('📱 Page loaded, checking initial state...');
    
    // Wait for the page to be ready
    await page.waitForSelector('#start-screen', { timeout: 5000 });
    
    // Click on blog automation button
    console.log('🤖 Clicking blog automation button...');
    await page.click('[data-workspace="blog"]');
    
    // Wait for workspace to switch
    await page.waitForSelector('#main-content.active', { timeout: 5000 });
    
    console.log('✅ Workspace switched to blog');
    
    // Check if containers exist
    const browserContainer = await page.$('#browser-component-container');
    const chatContainer = await page.$('#chat-component-container');
    
    console.log('🔍 Container check:');
    console.log('  - Browser container exists:', !!browserContainer);
    console.log('  - Chat container exists:', !!chatContainer);
    
    // Check if components are rendered inside containers
    const browserComponent = await page.$('#browser-component-container .browser-tab-component');
    const chatComponent = await page.$('#chat-component-container .chat-component');
    
    console.log('🎨 Component check:');
    console.log('  - Browser component rendered:', !!browserComponent);
    console.log('  - Chat component rendered:', !!chatComponent);
    
    // Check if URL bar exists
    const urlBar = await page.$('.address-bar');
    console.log('  - URL bar exists:', !!urlBar);
    
    // Get container dimensions
    if (browserContainer) {
      const browserBounds = await browserContainer.boundingBox();
      console.log('📐 Browser container bounds:', browserBounds);
    }
    
    if (chatContainer) {
      const chatBounds = await chatContainer.boundingBox();
      console.log('💬 Chat container bounds:', chatBounds);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'debug_screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved as debug_screenshot.png');
    
    // Keep browser open for manual inspection
    console.log('🔍 Browser left open for manual inspection. Close it when done.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugBrowser();
