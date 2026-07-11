import { test, expect, type Page } from '@playwright/test';

// Must match the question's required ordering: total desc, then name (the prompt
// says "break ties by name"). Without the tie-break, ties in the scaled dataset
// make this a genuinely wrong order.
const CORRECT_SQL = `SELECT c.name, SUM(o.amount) AS total
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
WHERE o.status = 'completed'
GROUP BY c.name
ORDER BY total DESC, c.name`;

// CodeMirror renders a contenteditable; type into its content area.
async function typeSql(page: Page, sql: string) {
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await editor.fill(sql);
}

test('selects a question, runs and grades a correct answer, records progress', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  await page.goto('/');
  await expect(page.getByTestId('progress')).toHaveAttribute('aria-label', /Solved 0 of/);

  await page.getByTestId('q-customer-completed-revenue').click();
  await expect(page.getByTestId('question-title')).toContainText('Revenue per customer');

  // Run is enabled only once DuckDB-Wasm has booted, the dataset is seeded, and SQL is present.
  await typeSql(page, CORRECT_SQL);
  await expect(page.getByTestId('run')).toBeEnabled({ timeout: 30_000 });

  await page.getByTestId('run').click();
  await expect(page.getByTestId('results')).toBeVisible();

  await page.getByTestId('submit').click();
  await expect(page.getByTestId('verdict')).toHaveText('Correct');
  await expect(page.getByTestId('progress')).toHaveAttribute('aria-label', /Solved 1 of/);

  expect(pageErrors, `page errors: ${pageErrors.join('\n')}`).toEqual([]);
});

test('marks a wrong answer incorrect', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('q-customer-completed-revenue').click();

  await typeSql(page, 'SELECT name FROM customers');
  await expect(page.getByTestId('submit')).toBeEnabled({ timeout: 30_000 });
  await page.getByTestId('submit').click();
  await expect(page.getByTestId('verdict')).toHaveText('Incorrect');
});

test('active-statement highlight previews only while Ctrl/Cmd is held', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('q-customer-completed-revenue').click();
  await typeSql(page, 'SELECT 1;\nSELECT 2');
  // Not held → no run-preview highlight.
  await expect(page.locator('.cm-active-statement')).toHaveCount(0);
  // Hold the modifier → the statement at the cursor is previewed.
  await page.keyboard.down('Control');
  await expect(page.locator('.cm-active-statement').first()).toBeVisible();
  // Release → gone again.
  await page.keyboard.up('Control');
  await expect(page.locator('.cm-active-statement')).toHaveCount(0);
});

test('filters the question list by difficulty', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('filter-difficulty').selectOption('hard');
  await expect(page.getByTestId('q-top-completed-order-per-customer')).toBeVisible();
  await expect(page.getByTestId('q-orders-by-status')).toHaveCount(0);
});
