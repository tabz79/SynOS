const { launchBrowser, BASE_URL, takeScreenshot, attachPageListeners, loginUser } = require('./test_harness_helper');

const ROLES = [
  { username: 'admin', password: 'admin123', expectedRoute: '/admin', role: 'Admin' },
  { username: 'reception', password: 'Admin', expectedRoute: '/reception', role: 'Receptionist' },
  { username: 'phlebo', password: 'admin123', expectedRoute: '/phlebotomist', role: 'Phlebotomist' },
  { username: 'biotech', password: 'Admin', expectedRoute: '/workbench', role: 'LabTech' },
  { username: 'drvasu', password: 'admin123', expectedRoute: '/pathologist', role: 'Pathologist' },
  { username: 'typist1', password: 'admin123', expectedRoute: '/typist', role: 'Typist' },
  { username: 'delivery', password: 'Admin', expectedRoute: '/delivery', role: 'DeliveryDesk' },
  { username: 'radiologist', password: 'admin123', expectedRoute: '/radiologist', role: 'Radiologist' },
  { username: 'xray', password: 'Admin', expectedRoute: '/xraytech', role: 'XRayTech' },
  { username: 'mri', password: 'Admin', expectedRoute: '/mritech', role: 'MriTech' },
  { username: 'finance', password: 'Admin', expectedRoute: '/finance', role: 'Finance' },
  { username: 'inventory', password: 'Admin', expectedRoute: '/inventory', role: 'InventoryManager' }
];

async function runPhase1() {
  console.log('====================================================');
  console.log(' PHASE 1: APPLICATION SMOKE & ROLE AUTHORIZATION TEST');
  console.log('====================================================');

  const browser = await launchBrowser();
  const results = [];

  // TEST 1.1: Unauthenticated direct access to protected routes
  console.log('\n--- 1.1: Unauthenticated Protected Route Access ---');
  const protectedRoutes = ['/admin', '/reception', '/phlebotomist', '/workbench', '/pathologist', '/finance', '/radiologist'];
  {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    attachPageListeners(page, 'PHASE1_UNAUTH');

    for (const route of protectedRoutes) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle2' });
      const currentUrl = page.url();
      const redirectedToLogin = currentUrl.includes('/login');
      const status = redirectedToLogin ? 'PASS' : 'FAIL';
      results.push({ test: `Unauthenticated access to ${route}`, status, details: `Current URL: ${currentUrl}` });
      console.log(`[${status}] Unauthenticated ${route} -> ${currentUrl}`);
      if (!redirectedToLogin) {
        await takeScreenshot(page, `fail_unauth_${route.replace('/', '')}`);
      }
    }
    await context.close();
  }

  // TEST 1.2: Role Login & Default Workspace Navigation (12 Distinct Roles)
  console.log('\n--- 1.2: Role Login & Workspace Routing ---');
  for (const r of ROLES) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    attachPageListeners(page, `PHASE1_${r.role}`);
    try {
      await loginUser(page, r.username, r.password);
      const url = page.url();
      const onExpected = url.includes(r.expectedRoute);
      const status = onExpected ? 'PASS' : 'FAIL';
      results.push({ test: `Login & Route: ${r.role} (${r.username})`, status, details: `Target: ${r.expectedRoute}, Got: ${url}` });
      console.log(`[${status}] Role: ${r.role.padEnd(16)} | Target: ${r.expectedRoute.padEnd(14)} | Landed: ${url}`);
      await takeScreenshot(page, `workspace_${r.username}`);
    } catch (err) {
      results.push({ test: `Login & Route: ${r.role} (${r.username})`, status: 'FAIL', details: err.message });
      console.error(`[FAIL] Role: ${r.role.padEnd(16)} | Error: ${err.message}`);
      await takeScreenshot(page, `fail_login_${r.username}`);
    } finally {
      await context.close();
    }
  }

  // TEST 1.3: Role Security Boundaries (Privilege Escalation Attempts)
  console.log('\n--- 1.3: Role Security Boundaries (Cross-Role Access) ---');
  // Log in as Receptionist and try accessing Admin, Pathologist, Radiologist, Finance
  {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    attachPageListeners(page, 'PHASE1_ESCALATION');
    await loginUser(page, 'reception', 'Admin');

    const forbiddenForReception = [
      { target: '/admin', name: 'Admin Dashboard' },
      { target: '/pathologist', name: 'Pathologist Terminal' },
      { target: '/radiologist', name: 'Radiologist Console' },
      { target: '/finance', name: 'Finance Hub' }
    ];

    for (const boundary of forbiddenForReception) {
      await page.goto(`${BASE_URL}${boundary.target}`, { waitUntil: 'networkidle2' });
      const url = page.url();
      const pageBody = await page.evaluate(() => document.body.innerText);
      const blocked = !url.includes(boundary.target) || 
                      pageBody.includes('Access Denied') || 
                      pageBody.includes('not authorized') || 
                      pageBody.includes('Access Portal') || 
                      pageBody.includes('Unauthorized') || 
                      pageBody.includes('coming soon');
      const status = blocked ? 'PASS' : 'SECURITY ISSUE';
      results.push({ test: `Receptionist accessing ${boundary.name} (${boundary.target})`, status, details: `URL: ${url}` });
      console.log(`[${status}] Receptionist -> ${boundary.target} | Final URL: ${url} (Blocked: ${blocked})`);
      if (!blocked) {
        await takeScreenshot(page, `security_reception_${boundary.target.replace('/', '')}`);
      }
    }
    await context.close();
  }

  // TEST 1.4: Post-Logout Browser Back Button Vulnerability
  console.log('\n--- 1.4: Back Button Navigation Post-Logout ---');
  {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await loginUser(page, 'admin', 'admin123');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2' });
    
    // Clear session tokens in page (simulate logout)
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    });
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
    
    // Attempt browser back
    await page.goBack().catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
    const postBackUrl = page.url();
    const postBackBody = await page.evaluate(() => document.body.innerText);
    const backProtected = postBackUrl.includes('/login') || !postBackBody.includes('System Admin');
    const backStatus = backProtected ? 'PASS' : 'FAIL';
    results.push({ test: 'Post-Logout Browser Back Protection', status: backStatus, details: `URL after back: ${postBackUrl}` });
    console.log(`[${backStatus}] Browser Back after Logout -> URL: ${postBackUrl}`);
    await context.close();
  }

  await browser.close();

  console.log('\n====================================================');
  console.log(' PHASE 1 SUMMARY RESULTS');
  console.log('====================================================');
  let passCount = 0;
  let failCount = 0;
  for (const r of results) {
    if (r.status === 'PASS') passCount++;
    else failCount++;
    console.log(`- [${r.status}] ${r.test}: ${r.details}`);
  }
  console.log(`\nTotal: ${results.length} | Passed: ${passCount} | Failed: ${failCount}`);

  return { results, passCount, failCount };
}

runPhase1().catch(err => {
  console.error('Phase 1 runner fatal error:', err);
  process.exit(1);
});
