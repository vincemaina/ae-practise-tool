import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

/**
 * Visual-verification harness. Captures the app in key states to `screenshots/`
 * so they can be reviewed (incl. by an agent that can read images). Run with:
 *   pnpm screenshot
 * Requires a Playwright browser — see app/CLAUDE.md "Visual verification".
 */
const DIR = 'screenshots';

const CORRECT_SQL = `SELECT c.name, SUM(o.amount) AS total
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
WHERE o.status = 'completed'
GROUP BY c.name
ORDER BY total DESC`;

test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

test.beforeAll(() => {
  fs.mkdirSync(DIR, { recursive: true });
});

/** Open the revenue question from the list and wait until the engine is ready. */
async function openQuestionReady(page: Page) {
  await page.getByTestId('q-customer-completed-revenue').click();
  await page.locator('.cm-content').click();
  await page.locator('.cm-content').fill(CORRECT_SQL);
  await expect(page.getByTestId('run')).toBeEnabled({ timeout: 45_000 });
}

test('problem list', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('q-orders-by-status')).toBeVisible();
  await page.screenshot({ path: `${DIR}/00-problem-list.png`, fullPage: true });
});

test('solve — light', async ({ page }) => {
  await page.goto('/');
  await openQuestionReady(page);
  await page.screenshot({ path: `${DIR}/01-solve-light.png`, fullPage: true });
});

test('overview — dark', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ae-practice:theme', 'dark'));
  await page.goto('/');
  await openQuestionReady(page);
  await page.screenshot({ path: `${DIR}/02-overview-dark.png`, fullPage: true });
});

test('correct verdict + results', async ({ page }) => {
  await page.goto('/');
  await openQuestionReady(page);
  await page.getByTestId('submit').click();
  await expect(page.getByTestId('verdict')).toHaveText('Correct');
  await page.screenshot({ path: `${DIR}/03-correct.png`, fullPage: true });
});

test('error squiggle (invalid SQL)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('q-customer-completed-revenue').click();
  await page.locator('.cm-content').click();
  await page.locator('.cm-content').fill('SELECT frm customers');
  // give the debounced DuckDB linter time to mark the error
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${DIR}/04-error.png`, fullPage: true });
});
