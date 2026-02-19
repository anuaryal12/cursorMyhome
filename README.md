# MyHome automation

Playwright automation for the MyHome React app (login and positive/negative scenarios).

## Setup

1. Install dependencies and Chromium:

   ```bash
   cd c:\College\myhome-automation
   npm install
   npx playwright install chromium
   ```

2. Edit `config.json` for the quick login script (base URL, email, password).
3. Edit `scenarios.json` to add or change positive/negative login scenarios.

## Quick login (single run)

```bash
npm start
```

Opens the browser, fills credentials from `config.json`, and clicks login.

## Positive and negative scenarios

Runs all scenarios in `scenarios.json` (valid login, invalid password, empty fields, etc.) and reports pass/fail:

```bash
npm run scenarios
```

Runs in headless mode by default. To watch the browser:

```bash
npm run scenarios:headed
```

Scenarios define `expected: "success"` or `expected: "failure"`. The script checks the page after login (URL change, error message, or login form still visible) to determine outcome.

## Post-login: Dashboard and Enquiry flows

Runs login then checks Dashboard, Enquiry page, and Enquiry form (via "New Enquiry" and "+Enquiries"):

```bash
npm run post-login
```

Steps: login with `config.json` credentials, assert Dashboard screen, click Enquiries in the left tab and assert Enquiry page, click "New Enquiry" and assert Enquiry form opens, fill first name / last name / phone and click "Save Enquiry" then verify the new enquiry appears in the first row of the enquiry table, then run the Enquiries (side menu) form check. A summary (pass/fail per step) is printed; exit code is 0 only if all checks pass. You can set `enquiryTestData` in `config.json` (firstName, lastName, phone) to use custom values for the new enquiry.

If any check fails, the selectors in `run-post-login.js` may need adjustment to match your app (e.g. left tab labels, "New Enquiry" / "+Enquiries" text, or Dashboard/Enquiry URL paths). Edit the selector constants at the top of `run-post-login.js` to tune them.
