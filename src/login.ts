
import puppeteer from 'puppeteer';

export async function loginToDiscord(identifier: string, password: string) {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Change to your Chrome path
    defaultViewport: null,
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();
  await page.goto('https://discord.com/login', { waitUntil: 'networkidle2', timeout: 0 });

  console.log('⌨️ Filling login form...');

  // Fill input fields
  await page.type('input[name="email"]', identifier, { delay: 100 });
  await page.type('input[name="password"]', password, { delay: 50 });

  // Click login button
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 0 }),
  ]);

  // Check login success
  try {
    await page.waitForSelector('[aria-label="Servers"]', { timeout: 10000 });
    console.log('✅ Login successful.');
    return { browser, page };
  } catch (e) {
    console.error('❌ Login failed: Please check your credentials or solve any CAPTCHA manually.');
    await browser.close();
    throw new Error('Login failed');
  }
}
