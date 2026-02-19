/**
 * MyHome Playwright – post-login flow: Dashboard check, Enquiry page, Enquiry form (two entry points).
 * 1. New Enquiry button (top right on Enquiries page) opens the enquiry form.
 * 2. Enquiries in side menu (above Event) opens the same add enquiry form.
 * Reads config from config.json. Run after successful login; includes login step.
 */

import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, 'config.json');

// Login selectors (same as run.js)
const EMAIL_SELECTOR = 'input[type="email"], input[name*="email"], input[placeholder*="mail"], input[id*="email"], input[placeholder*="Email"], input[type="text"]';
const PASSWORD_SELECTOR = 'input[type="password"], input[name*="password"]';
const LOGIN_BTN_SELECTOR = 'button[type="submit"], button:has-text("Login"), button:has-text("Log in"), button:has-text("Sign in")';

// Post-login selectors
const DASHBOARD_INDICATOR = 'text=/dashboard/i';
const DASHBOARD_URL_PATTERN = /dashboard/i;
const DASHBOARD_MENU = 'a:has-text("Dashboard"), button:has-text("Dashboard"), [role="link"]:has-text("Dashboard")';
const ENQUIRIES_MENU = 'a:has-text("Enquiries"), button:has-text("Enquiries"), [role="link"]:has-text("Enquiries")';
const ENQUIRY_PAGE_INDICATOR = 'text=/enquir/i';
const ENQUIRY_PAGE_URL_PATTERN = /enquir/i;
// New Enquiry: top right on Enquiries page (scope to header/toolbar then fallback to page)
const NEW_ENQUIRY_BTN = 'header button:has-text("New Enquiry"), header a:has-text("New Enquiry"), [class*="header"] button:has-text("New Enquiry"), [class*="toolbar"] button:has-text("New Enquiry"), button:has-text("New Enquiry"), a:has-text("New Enquiry")';
const ENQUIRY_FORM_INDICATOR = 'text=/new enquiry|enquiry form|add enquiry|create enquiry/i, form, [role="dialog"], [role="form"]';
const ENQUIRY_FORM_URL_PATTERN = /enquir.*\/(new|create|add)|\/new.*enquir|\/add.*enquir/i;
// Enquiry form fields and Save button (add more selectors if your form uses different names)
const FIRST_NAME_INPUT = 'input[name*="first"], input[id*="first"], input[name*="firstName"], input[placeholder*="First"], input[placeholder*="first"]';
const LAST_NAME_INPUT = 'input[name*="last"], input[id*="last"], input[name*="lastName"], input[placeholder*="Last"], input[placeholder*="last"]';
const PHONE_INPUT = 'input[name*="phone"], input[id*="phone"], input[type="tel"], input[name*="mobile"], input[name*="contact"], input[placeholder*="Phone"], input[placeholder*="phone"], input[placeholder*="Mobile"]';
const SAVE_ENQUIRY_BTN = 'button:has-text("Save Enquiry"), button:has-text("Save"), [type="submit"]:has-text("Save"), button:has-text("Submit")';
// Enquiry table: first data row (skip header)
const ENQUIRY_TABLE_FIRST_ROW = 'table tbody tr:first-child, [role="table"] tbody tr:first-child, [class*="table"] tbody tr:first-child';

// Test data for new enquiry (override via config.json enquiryTestData if present)
const DEFAULT_ENQUIRY = { firstName: 'TestFirst', lastName: 'TestLast', phone: '0400123456' };

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    console.error('Missing config.json.');
    process.exit(1);
  }
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
}

async function runLoginFlow(page, baseUrl, email, password) {
  await page.goto(baseUrl, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);

  const emailInput = page.locator(EMAIL_SELECTOR).first();
  await emailInput.fill(email, { timeout: 15000 });
  await page.waitForTimeout(300);

  const passwordInput = page.locator(PASSWORD_SELECTOR).first();
  await passwordInput.fill(password, { timeout: 15000 });
  await page.waitForTimeout(300);

  const loginBtn = page.locator(LOGIN_BTN_SELECTOR).first();
  await loginBtn.click({ timeout: 10000 });
  await page.waitForTimeout(5000);
}

async function run() {
  const config = loadConfig();
  const { baseUrl, email, password } = config;

  const results = { dashboard: false, enquiryPage: false, newEnquiryForm: false, createEnquiryAndListed: false, plusEnquiriesForm: false };
  const enquiryData = config.enquiryTestData || DEFAULT_ENQUIRY;

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false });

  try {
    const page = await browser.newPage();
    console.log('Opening', baseUrl);
    await runLoginFlow(page, baseUrl, email, password);

    await page.waitForTimeout(2000);

    // 1. Dashboard check
    try {
      const url = page.url();
      const urlOk = DASHBOARD_URL_PATTERN.test(url);
      const elOk = await page.locator(DASHBOARD_INDICATOR).first().isVisible().catch(() => false);
      results.dashboard = urlOk || elOk;
      console.log(results.dashboard ? '[PASS] Dashboard: page is on Dashboard screen' : '[FAIL] Dashboard: not on Dashboard screen');
    } catch (e) {
      console.log('[FAIL] Dashboard:', e.message);
    }

    // 2. Enquiry page – click Enquiries in left tab
    try {
      const enquiriesMenu = page.locator(ENQUIRIES_MENU).first();
      await enquiriesMenu.click({ timeout: 8000 });
      await page.waitForTimeout(3000);
      const url = page.url();
      const urlOk = ENQUIRY_PAGE_URL_PATTERN.test(url);
      const elOk = await page.locator(ENQUIRY_PAGE_INDICATOR).first().isVisible().catch(() => false);
      results.enquiryPage = urlOk || elOk;
      console.log(results.enquiryPage ? '[PASS] Enquiry page: redirects to Enquiry page' : '[FAIL] Enquiry page: did not reach Enquiry page');
    } catch (e) {
      console.log('[FAIL] Enquiry page:', e.message);
    }

    // 3. New Enquiry button (top right on Enquiries page) -> Enquiry form
    try {
      const newEnquiryBtn = page.locator(NEW_ENQUIRY_BTN).first();
      await newEnquiryBtn.click({ timeout: 8000 });
      await page.waitForTimeout(3000);
      const url = page.url();
      const formByEl = await page.locator(ENQUIRY_FORM_INDICATOR).first().isVisible().catch(() => false);
      const formByUrl = ENQUIRY_FORM_URL_PATTERN.test(url);
      results.newEnquiryForm = formByEl || formByUrl;
      console.log(results.newEnquiryForm ? '[PASS] New Enquiry (top right): Enquiry form opened' : '[FAIL] New Enquiry (top right): Enquiry form not opened');
    } catch (e) {
      console.log('[FAIL] New Enquiry form:', e.message);
    }

    // 3b. Fill enquiry form (first name, last name, phone), click Save Enquiry, verify new enquiry in first row of table
    if (results.newEnquiryForm) {
      try {
        const formInputs = page.locator('form').first().locator('input[type="text"], input[type="tel"]');
        const count = await formInputs.count().catch(() => 0);
        if (count >= 3) {
          await formInputs.nth(0).fill(enquiryData.firstName, { timeout: 5000 });
          await page.waitForTimeout(200);
          await formInputs.nth(1).fill(enquiryData.lastName, { timeout: 5000 });
          await page.waitForTimeout(200);
          await formInputs.nth(2).fill(enquiryData.phone, { timeout: 5000 });
        } else {
          const firstNameInput = page.locator(FIRST_NAME_INPUT).first();
          const lastNameInput = page.locator(LAST_NAME_INPUT).first();
          const phoneInput = page.locator(PHONE_INPUT).first();
          await firstNameInput.fill(enquiryData.firstName, { timeout: 5000 });
          await page.waitForTimeout(200);
          await lastNameInput.fill(enquiryData.lastName, { timeout: 5000 });
          await page.waitForTimeout(200);
          await phoneInput.fill(enquiryData.phone, { timeout: 5000 });
        }
        await page.waitForTimeout(300);
        const saveBtn = page.locator(SAVE_ENQUIRY_BTN).first();
        await saveBtn.click({ timeout: 5000 });
        await page.waitForTimeout(3000);
        await page.locator(ENQUIRIES_MENU).first().click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(3000);
        const firstRow = page.locator(ENQUIRY_TABLE_FIRST_ROW).first();
        let firstRowText = await firstRow.textContent().catch(() => '');
        let foundInFirstRow = firstRowText.includes(enquiryData.firstName) || firstRowText.includes(enquiryData.lastName) || firstRowText.includes(enquiryData.phone);
        if (!foundInFirstRow) {
          const anyRow = page.locator('table tbody tr, [role="table"] tbody tr, [class*="table"] tbody tr');
          const rowCount = await anyRow.count().catch(() => 0);
          for (let i = 0; i < Math.min(rowCount, 5); i++) {
            const text = await anyRow.nth(i).textContent().catch(() => '');
            if (text.includes(enquiryData.firstName) || text.includes(enquiryData.lastName) || text.includes(enquiryData.phone)) {
              foundInFirstRow = true;
              break;
            }
          }
        }
        results.createEnquiryAndListed = foundInFirstRow;
        console.log(results.createEnquiryAndListed ? '[PASS] Create enquiry: saved and listed in enquiry table' : '[FAIL] Create enquiry: not found in enquiry table');
      } catch (e) {
        console.log('[FAIL] Create enquiry:', e.message);
      }
    } else {
      console.log('[SKIP] Create enquiry: form not opened');
    }

    // 4. Enquiries in side menu (above Event) -> same Enquiry form. Go to Dashboard then open form via sidebar.
    try {
      const dashboardMenu = page.locator(DASHBOARD_MENU).first();
      await dashboardMenu.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
      // Try sidebar control that opens add form: "+", "Add Enquiry", or "Enquiries" (above Event)
      const addInSidebar = page.locator('nav a:has-text("+"), nav button:has-text("+"), [class*="sidebar"] a:has-text("Add"), [class*="sidebar"] a:has-text("New Enquiry"), [class*="menu"] a:has-text("+")').first();
      const addCount = await addInSidebar.count().catch(() => 0);
      if (addCount > 0) {
        await addInSidebar.click({ timeout: 5000 });
      } else {
        await page.locator(ENQUIRIES_MENU).first().click({ timeout: 8000 });
      }
      await page.waitForTimeout(3000);
      const url = page.url();
      const formByEl = await page.locator(ENQUIRY_FORM_INDICATOR).first().isVisible().catch(() => false);
      const formByUrl = ENQUIRY_FORM_URL_PATTERN.test(url);
      results.plusEnquiriesForm = formByEl || formByUrl;
      console.log(results.plusEnquiriesForm ? '[PASS] Enquiries (side menu): Enquiry form opened' : '[FAIL] Enquiries (side menu): Enquiry form not opened');
    } catch (e) {
      console.log('[FAIL] Enquiries side menu form:', e.message);
    }

    console.log('\n--- Summary ---');
    console.log('Dashboard:', results.dashboard ? 'pass' : 'fail');
    console.log('Enquiry page:', results.enquiryPage ? 'pass' : 'fail');
    console.log('New Enquiry (top right) form:', results.newEnquiryForm ? 'pass' : 'fail');
    console.log('Create enquiry (save and first row):', results.createEnquiryAndListed ? 'pass' : 'fail');
    console.log('Enquiries (side menu) form:', results.plusEnquiriesForm ? 'pass' : 'fail');

    const allPass = results.dashboard && results.enquiryPage && results.newEnquiryForm && results.createEnquiryAndListed && results.plusEnquiriesForm;
    process.exit(allPass ? 0 : 1);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
