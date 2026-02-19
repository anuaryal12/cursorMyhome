/**
 * MyHome Playwright – run all positive and negative login scenarios.
 * Reads scenarios from scenarios.json. Reports pass/fail per scenario.
 */

import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCENARIOS_PATH = join(__dirname, 'scenarios.json');

const EMAIL_SELECTOR = 'input[type="email"], input[name*="email"], input[placeholder*="mail"], input[id*="email"], input[placeholder*="Email"], input[type="text"]';
const PASSWORD_SELECTOR = 'input[type="password"], input[name*="password"]';
const LOGIN_BTN_SELECTOR = 'button[type="submit"], button:has-text("Login"), button:has-text("Log in"), button:has-text("Sign in")';

function loadScenarios() {
  if (!existsSync(SCENARIOS_PATH)) {
    console.error('Missing scenarios.json');
    process.exit(1);
  }
  return JSON.parse(readFileSync(SCENARIOS_PATH, 'utf-8'));
}

async function runLoginFlow(page, baseUrl, email, password) {
  await page.goto(baseUrl, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2000);

  const emailInput = page.locator(EMAIL_SELECTOR).first();
  const passwordInput = page.locator(PASSWORD_SELECTOR).first();

  if (email !== '') await emailInput.fill(email, { timeout: 10000 });
  if (password !== '') await passwordInput.fill(password, { timeout: 10000 });
  await page.waitForTimeout(300);

  const loginBtn = page.locator(LOGIN_BTN_SELECTOR).first();
  await loginBtn.click({ timeout: 10000 });
  await page.waitForTimeout(4000);
}

function getCurrentUrl(page) {
  return page.url();
}

async function detectOutcome(page, baseUrl) {
  const url = await getCurrentUrl(page);

  const loginFormStillVisible = await page.locator(EMAIL_SELECTOR).first().isVisible().catch(() => false);
  const errorMessageVisible = await page.locator('text=/invalid|error|incorrect|wrong|failed|denied/i').first().isVisible().catch(() => false);
  const successIndicator = await page.locator('text=/logout|sign out|dashboard|welcome/i').first().isVisible().catch(() => false);

  const likelySuccess = successIndicator || (!loginFormStillVisible && url !== baseUrl && !url.includes('login'));
  const likelyFailure = errorMessageVisible || loginFormStillVisible;

  if (likelySuccess && !likelyFailure) return 'success';
  if (likelyFailure) return 'failure';
  return url !== baseUrl ? 'success' : 'failure';
}

async function run() {
  const { baseUrl, scenarios } = loadScenarios();
  const headless = process.argv.includes('--headless');
  const headed = process.argv.includes('--headed');

  console.log('MyHome login scenarios (positive + negative)\n');
  const browser = await chromium.launch({ headless: headless && !headed });

  const results = [];

  for (const scenario of scenarios) {
    const page = await browser.newPage();
    let outcome = 'error';
    try {
      await runLoginFlow(page, baseUrl, scenario.email, scenario.password);
      outcome = await detectOutcome(page, baseUrl);
    } catch (err) {
      outcome = 'error';
      console.error(`  ${scenario.id}: ${err.message}`);
    } finally {
      await page.close();
    }

    const passed = outcome === scenario.expected;
    results.push({ ...scenario, outcome, passed });
    const icon = passed ? 'PASS' : 'FAIL';
    console.log(`  [${icon}] ${scenario.name} (expected: ${scenario.expected}, got: ${outcome})`);
  }

  await browser.close();

  const passedCount = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log('\n---');
  console.log(`Result: ${passedCount}/${total} scenarios passed.`);
  process.exit(passedCount === total ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
