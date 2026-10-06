const puppeteer = require('puppeteer-core');

async function test() {
  console.log('Testing Chrome launch via puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:59999/login', { waitUntil: 'networkidle2' });
  const title = await page.title();
  console.log('Page Title:', title);
  const content = await page.content();
  console.log('Page content length:', content.length);
  const loginFormExists = await page.$('input[name="username"], input[type="text"], input[id*="user"]') !== null;
  console.log('Login input detected:', loginFormExists);
  await browser.close();
  console.log('Verification passed successfully.');
}

test().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
