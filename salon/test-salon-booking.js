const puppeteer = require('puppeteer');

async function testSalonBooking() {
  let browser;
  try {
    console.log('Starting Puppeteer test...');
    
    browser = await puppeteer.launch({
      headless: true, // Headless mode for container
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => {
      console.log('PAGE LOG:', msg.text());
    });
    
    // Enable error logging
    page.on('pageerror', error => {
      console.error('PAGE ERROR:', error.message);
    });
    
    // Navigate to the booking page
    console.log('Navigating to booking page...');
    await page.goto('http://localhost:3000/book', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for the page to load and check for content
    console.log('Waiting for salon content...');
    
    // Wait a bit longer to catch delayed errors
    console.log('Waiting 10 seconds to catch any delayed errors...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check if we get an error message after waiting
    const errorElement = await page.$('.notification.is-danger');
    if (errorElement) {
      const errorText = await page.$eval('.notification.is-danger', el => el.textContent);
      console.error('Found error on page:', errorText);
      
      // Check if it's the stack depth error
      if (errorText.includes('stack depth limit exceeded')) {
        console.error('❌ STACK DEPTH ERROR DETECTED AFTER DELAY');
        return false;
      }
    }
    
    // Check if salons are loading
    const loadingElement = await page.$('.loading, [data-testid="loading"]');
    if (loadingElement) {
      console.log('Page is still loading, waiting...');
      await page.waitForSelector('.loading, [data-testid="loading"]', { 
        hidden: true, 
        timeout: 15000 
      });
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-screenshot.png' });
    console.log('Screenshot saved as debug-screenshot.png');
    
    // Let's see what's actually on the page
    const bodyContent = await page.evaluate(() => document.body.textContent);
    console.log('Page body content:', bodyContent.substring(0, 500));
    
    // Check for salon cards
    console.log('Checking for salon content...');
    const salonCards = await page.$$('.card');
    
    if (salonCards.length > 0) {
      console.log(`✅ SUCCESS: Found ${salonCards.length} salon cards`);
      return true;
    } else {
      // Check if there's a "No salons available" message
      const noSalonsMessage = await page.$('.notification.is-info');
      if (noSalonsMessage) {
        const messageText = await page.$eval('.notification.is-info', el => el.textContent);
        console.log('ℹ️  No salons message:', messageText);
        if (messageText.includes('No salons available') || messageText.includes('No Salons Available')) {
          console.log('✅ SUCCESS: Page loaded correctly but no salons in database');
          return true; // This is expected if database is empty
        }
      }
      
      // Check if we can at least see the page structure
      const pageTitle = await page.$('h1.title');
      if (pageTitle) {
        const titleText = await page.$eval('h1.title', el => el.textContent);
        console.log('Page title found:', titleText);
        if (titleText.includes('Choose Your Salon')) {
          console.log('✅ SUCCESS: Page structure loaded correctly');
          return true;
        }
      }
      
      // The key test: make sure we don't have stack depth error
      if (bodyContent.includes('stack depth limit exceeded')) {
        console.error('❌ CRITICAL: Stack depth error still present!');
        return false;
      } else if (bodyContent.includes('Choose Your Salon') || bodyContent.includes('No salons available') || bodyContent.includes('Loading available salons')) {
        console.log('✅ SUCCESS: Page loaded without stack depth error');
        return true;
      }
      
      console.error('❌ No expected content found on page');
      return false;
    }
    
  } catch (error) {
    console.error('Test failed with error:', error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testSalonBooking().then(success => {
  console.log('\n=== TEST RESULT ===');
  if (success) {
    console.log('✅ Salon booking page test PASSED');
    process.exit(0);
  } else {
    console.log('❌ Salon booking page test FAILED');
    process.exit(1);
  }
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});