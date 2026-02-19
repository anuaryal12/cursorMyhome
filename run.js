/**
 * MyHome Playwright automation – login flow.
 * Reads config from config.json (baseUrl, email, password).
 */

import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, 'config.json');

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    console.error('Missing config.json. Create it with baseUrl, email, password.');
    process.exit(1);
  }
  const raw = readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw);
}

async function run() {
  const config = loadConfig();
  const { baseUrl, email, password } = config;

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false });

  try {
    const page = await browser.newPage();
    console.log('Opening', baseUrl);
    await page.goto(baseUrl, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);

    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="mail"], input[id*="email"], input[placeholder*="Email"], input[type="text"]').first();
    await emailInput.fill(email, { timeout: 15000 });
    await page.waitForTimeout(300);

    const passwordInput = page.locator('input[type="password"], input[name*="password"]').first();
    await passwordInput.fill(password, { timeout: 15000 });
    await page.waitForTimeout(300);

    const loginBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Log in"), button:has-text("Sign in")').first();
    await loginBtn.click({ timeout: 10000 });
    await page.waitForTimeout(5000);

    console.log('Login attempted. Closing in 5s...');
    await page.waitForTimeout(5000);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
