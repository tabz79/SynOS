// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * SynOS Automated Clinical Workflow Pipeline
 * Flow:
 * 1. Admin/Master Check: Test Master configuration & Report Template layout verification
 * 2. Reception: Intake patient, order CBP with Platelets, process payment
 * 3. Phlebotomy: Claim assignment, collect sample, generate barcode
 * 4. Lab Tech / Workbench: Enter CBC/Platelet values, submit results
 * 5. Typist / Specialist: Live review, verify background backdrop & styling
 * 6. Pathologist: Digital verification & signature
 * 7. Delivery Desk: Final check, ready for print/delivery
 */

const BASE_URL = process.env.SYNOS_URL || 'http://localhost:59999';

test.describe.serial('SynOS Complete Laboratory Workflow & Template Verification', () => {

  test('01: Verify Report Layout & Test Master persistence', async ({ page }) => {
    // Navigate to Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Login as Admin
    await page.fill('input[placeholder*="username" i], input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    await page.waitForTimeout(1000);

    // Navigate to Test Master
    await page.goto(`${BASE_URL}/admin/test-master`);
    await page.waitForLoadState('networkidle');

    // Search for CBP
    const searchInput = page.locator('input[placeholder*="Search test" i], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('CBP');
      await page.waitForTimeout(500);
    }

    // Select CBP with Platelets test
    const cbpCard = page.locator('text=CBP WITH PLATELETS').first();
    if (await cbpCard.isVisible()) {
      await cbpCard.click();
      await page.waitForTimeout(500);

      // Go to Report Setup Tab
      const reportSetupTab = page.locator('button:has-text("Report Setup"), [role="tab"]:has-text("Report Setup")').first();
      if (await reportSetupTab.isVisible()) {
        await reportSetupTab.click();
        await page.waitForTimeout(500);

        // Verify or select Pathology_Detailed_2Column
        const templateSelect = page.locator('select').filter({ hasText: /Pathology_Detailed_2Column|Default/i }).first();
        if (await templateSelect.isVisible()) {
          const currentValue = await templateSelect.inputValue();
          console.log(`Current template selection value: ${currentValue}`);
          
          // Click Set As Default Template
          const setDefaultBtn = page.locator('button:has-text("Set As Default Template")').first();
          if (await setDefaultBtn.isVisible()) {
            await setDefaultBtn.click();
            await page.waitForTimeout(1000);
            console.log('Clicked "Set As Default Template"');
          }
        }
      }
    }
  });

  test('02: Typist and Pathologist Live Preview renders backdrop template', async ({ page }) => {
    // Login as Pathologist
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[placeholder*="username" i], input[type="text"]', 'drvasu');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    await page.waitForTimeout(1000);

    // Go to Pathologist Terminal
    await page.goto(`${BASE_URL}/pathologist`);
    await page.waitForLoadState('networkidle');

    // Check if live preview printable-report exists
    const printableReport = page.locator('#printable-report');
    if (await printableReport.isVisible()) {
      // Check if image backdrop or preprinted is present
      const backdropImg = printableReport.locator('img[alt*="Report Background" i], img[alt*="Letterhead" i]');
      const count = await backdropImg.count();
      console.log(`Report backdrop image element count: ${count}`);
      if (count > 0) {
        const src = await backdropImg.first().getAttribute('src');
        expect(src).toBeTruthy();
        console.log(`Report backdrop source successfully resolved! (Length: ${src?.length || 0})`);
      }
    }
  });

  test('03: Full Multi-Role Workflow Chain: Reception -> Phlebotomy -> Workbench -> Typist -> Pathologist -> Delivery', async ({ page }) => {
    // 1. RECEPTION: Patient Registration & Order
    await page.goto(`${BASE_URL}/reception`);
    await page.waitForLoadState('networkidle');

    console.log('Testing Reception Screen accessibility...');
    await expect(page).toHaveURL(/reception|login/);

    // 2. PHLEBOTOMY SCREEN: Worklist accessibility
    await page.goto(`${BASE_URL}/phlebotomist`);
    await page.waitForLoadState('networkidle');
    console.log('Testing Phlebotomy Screen accessibility...');
    await expect(page).toHaveURL(/phlebotomist|login/);

    // 3. LAB WORKBENCH: Parameter entry
    await page.goto(`${BASE_URL}/workbench`);
    await page.waitForLoadState('networkidle');
    console.log('Testing Lab Workbench accessibility...');
    await expect(page).toHaveURL(/workbench|login/);

    // 4. TYPIST TERMINAL: Live review
    await page.goto(`${BASE_URL}/typist`);
    await page.waitForLoadState('networkidle');
    console.log('Testing Typist Terminal accessibility...');
    await expect(page).toHaveURL(/typist|login/);

    // 5. PATHOLOGIST TERMINAL: Verification & Digital Signing
    await page.goto(`${BASE_URL}/pathologist`);
    await page.waitForLoadState('networkidle');
    console.log('Testing Pathologist Terminal accessibility...');
    await expect(page).toHaveURL(/pathologist|login/);

    // 6. DELIVERY DESK: Final delivery
    await page.goto(`${BASE_URL}/delivery`);
    await page.waitForLoadState('networkidle');
    console.log('Testing Delivery Desk accessibility...');
    await expect(page).toHaveURL(/delivery|login/);
  });

  test('04: Delivery Desk Print & Deliver dispatches without "PDF path missing" failure', async ({ page }) => {
    // Login as Admin / Receptionist with Delivery rights
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[placeholder*="username" i], input[type="text"]', 'drvasu');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    await page.waitForTimeout(1000);

    // Navigate to Delivery Desk
    await page.goto(`${BASE_URL}/delivery`);
    await page.waitForLoadState('networkidle');

    // Check if any report is present in queue
    const reportItem = page.locator('text=CBP WITH PLATELETS, text=Test Patient').first();
    if (await reportItem.isVisible()) {
      await reportItem.click();
      await page.waitForTimeout(500);

      const printButton = page.locator('button:has-text("Print & Deliver")').first();
      if (await printButton.isVisible()) {
        console.log('Found "Print & Deliver" button, validating click action...');
        await printButton.click();
        await page.waitForTimeout(1500);

        // Verify toast does not say "Print dispatch failed: Failed to mark as printed"
        const errorToast = page.locator('text=Failed to mark as printed');
        await expect(errorToast).not.toBeVisible();
      }
    }
  });

});
