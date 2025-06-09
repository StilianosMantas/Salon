const puppeteer = require('puppeteer');

async function testLogin() {
  let browser;
  try {
    console.log('Starting login test...');
    
    browser = await puppeteer.launch({
      headless: true,
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
      // Check for the specific initialization error
      if (error.message.includes('Cannot access \'redirectToSalon\' before initialization')) {
        console.error('❌ CRITICAL: redirectToSalon initialization error detected!');
        return false;
      }
    });
    
    // Navigate to the login page
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/login', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for page to load
    console.log('Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if the login form is present
    const loginForm = await page.$('form');
    if (!loginForm) {
      console.error('❌ Login form not found');
      return false;
    }
    
    // Check if email input is present
    const emailInput = await page.$('input[type="email"]');
    if (!emailInput) {
      console.error('❌ Email input not found');
      return false;
    }
    
    console.log('✅ Login form and email input found');
    
    // Try to type in the email field (this would trigger any initialization errors)
    try {
      await page.type('input[type="email"]', 'test@example.com');
      console.log('✅ Successfully typed in email field');
    } catch (error) {
      console.error('❌ Error typing in email field:', error.message);
      return false;
    }
    
    // Check page content
    const bodyContent = await page.evaluate(() => document.body.textContent);
    
    if (bodyContent.includes('Cannot access') && bodyContent.includes('before initialization')) {
      console.error('❌ Initialization error found in page content');
      return false;
    }
    
    console.log('✅ No initialization errors detected');
    return true;
    
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
testLogin().then(success => {
  console.log('\n=== LOGIN TEST RESULT ===');
  if (success) {
    console.log('✅ Login page test PASSED');
    process.exit(0);
  } else {
    console.log('❌ Login page test FAILED');
    process.exit(1);
  }
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});