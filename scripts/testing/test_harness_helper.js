const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:59999';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function sqlQuery(query) {
  try {
    const escaped = query.replace(/"/g, '""');
    const cmd = `sqlcmd -S .\\SYNOS -d SynOSDb-1 -E -Q "${escaped}" -h -1 -W`;
    const out = execSync(cmd, { encoding: 'utf8', timeout: 15000 });
    return out.trim();
  } catch (err) {
    console.error('SQL query error:', err.message);
    return null;
  }
}

async function launchBrowser(options = {}) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: options.headless !== undefined ? options.headless : 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--ignore-certificate-errors',
      '--disable-gpu',
      '--window-size=1440,900'
    ],
    ...options
  });
  return browser;
}

function attachPageListeners(page, logPrefix = '') {
  const consoleErrors = [];
  const networkFailures = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore routine favicon or benign warnings
      if (!text.includes('favicon.ico')) {
        consoleErrors.push(text);
        if (logPrefix) console.log(`[${logPrefix}][CONSOLE_ERR]`, text.substring(0, 200));
      }
    }
  });

  page.on('requestfailed', req => {
    const url = req.url();
    if (!url.includes('favicon.ico')) {
      networkFailures.push(`${req.method()} ${url} - ${req.failure()?.errorText}`);
      if (logPrefix) console.log(`[${logPrefix}][NET_FAIL]`, `${req.method()} ${url} - ${req.failure()?.errorText}`);
    }
  });

  return { consoleErrors, networkFailures };
}

async function takeScreenshot(page, name) {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  try {
    await page.screenshot({ path: filePath, fullPage: false });
    return filePath;
  } catch (e) {
    console.error(`Failed to take screenshot ${name}:`, e.message);
    return null;
  }
}

async function loginUser(page, username, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  
  // Fill username
  const userSelector = 'input[name="username"], input[type="text"]';
  await page.waitForSelector(userSelector, { timeout: 10000 });
  await page.focus(userSelector);
  await page.$eval(userSelector, el => el.value = '');
  await page.type(userSelector, username);

  // Fill password
  const passSelector = 'input[name="password"], input[type="password"]';
  await page.waitForSelector(passSelector, { timeout: 5000 });
  await page.focus(passSelector);
  await page.$eval(passSelector, el => el.value = '');
  await page.type(passSelector, password);

  // Click submit button
  const submitButtonSelector = 'button[type="submit"]';
  const submitBtn = await page.$(submitButtonSelector);
  if (submitBtn) {
    await submitBtn.click();
  } else {
    await page.keyboard.press('Enter');
  }

  // Handle possible Branch Selection modal or direct redirect
  try {
    await page.waitForFunction(() => {
      // Check if branch selection appeared
      const heading = document.querySelector('h2');
      if (heading && heading.innerText.includes('Select Branch')) return true;
      // Check if navigated away from login
      return !window.location.pathname.includes('/login');
    }, { timeout: 8000 });

    // If branch selection appeared, click the first branch button
    const branchBtn = await page.evaluate(() => {
      const heading = document.querySelector('h2');
      if (heading && heading.innerText.includes('Select Branch')) {
        const btn = document.querySelector('.space-y-2 button');
        if (btn) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    // Wait for final workspace route
    await page.waitForFunction(() => {
      const p = window.location.pathname;
      return p !== '/login' && p !== '/';
    }, { timeout: 12000 });
  } catch (e) {
    const errorText = await page.evaluate(() => {
      const errEl = document.querySelector('.text-red-500, [role="alert"], .error');
      return errEl ? errEl.innerText : null;
    });
    throw new Error(`Login failed for ${username}: ${errorText || e.message}`);
  }
  await new Promise(r => setTimeout(r, 1000));
}

async function logoutUser(page) {
  try {
    // Try clicking avatar/profile menu or logout button
    const logoutBtn = await page.$('button[title*="Logout"], button:has-text("Logout"), [data-testid="logout"]');
    if (logoutBtn) {
      await logoutBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    } else {
      // Clear localStorage and sessionStorage directly
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
      });
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
    }
  } catch (err) {
    // Ensure clean state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    });
  }
}

module.exports = {
  CHROME_PATH,
  BASE_URL,
  SCREENSHOTS_DIR,
  sqlQuery,
  launchBrowser,
  attachPageListeners,
  takeScreenshot,
  loginUser,
  logoutUser
};
