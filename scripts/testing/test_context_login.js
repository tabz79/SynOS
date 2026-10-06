const puppeteer = require('puppeteer-core');
const { CHROME_PATH, BASE_URL } = require('./test_harness_helper');

const ROLES = [
  { username: 'admin', password: 'admin123', expectedRoute: '/admin', role: 'Admin' },
  { username: 'reception', password: 'Admin', expectedRoute: '/reception', role: 'Receptionist' },
  { username: 'phlebo', password: 'Admin', expectedRoute: '/phlebotomist', role: 'Phlebotomist' },
  { username: 'biotech', password: 'Admin', expectedRoute: '/workbench', role: 'LabTech' },
  { username: 'drvasu', password: 'admin123', expectedRoute: '/pathologist', role: 'Pathologist' },
  { username: 'typist1', password: 'Admin', expectedRoute: '/typist', role: 'Typist' },
  { username: 'delivery', password: 'Admin', expectedRoute: '/delivery', role: 'DeliveryDesk' },
  { username: 'radiologist', password: 'Admin', expectedRoute: '/radiologist', role: 'Radiologist' },
  { username: 'xray', password: 'Admin', expectedRoute: '/xraytech', role: 'XRayTech' },
  { username: 'mri', password: 'Admin', expectedRoute: '/mritech', role: 'MriTech' },
  { username: 'finance', password: 'Admin', expectedRoute: '/finance', role: 'Finance' },
  { username: 'inventory', password: 'Admin', expectedRoute: '/inventory', role: 'InventoryManager' }
];

async function testAllLogins() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--disable-gpu']
  });

  console.log('Testing all 12 roles with clean browser contexts...');
  for (const r of ROLES) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
      
      const userSel = 'input[type="text"]';
      await page.waitForSelector(userSel, { timeout: 5000 });
      await page.click(userSel);
      await page.type(userSel, r.username);

      const passSel = 'input[type="password"]';
      await page.waitForSelector(passSel, { timeout: 5000 });
      await page.click(passSel);
      await page.type(passSel, r.password);

      const submitBtn = await page.$('button[type="submit"]');
      await submitBtn.click();

      await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 });
      const currentUrl = page.url();
      const passed = currentUrl.includes(r.expectedRoute);
      console.log(`[${passed ? 'PASS' : 'FAIL'}] ${r.role.padEnd(16)} (${r.username}) -> URL: ${currentUrl}`);
    } catch (err) {
      console.error(`[FAIL] ${r.role.padEnd(16)} (${r.username}) -> Error: ${err.message}`);
    } finally {
      await context.close();
    }
  }

  await browser.close();
}

testAllLogins().catch(console.error);
