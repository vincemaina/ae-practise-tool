import { test, expect } from '@playwright/test';

// The Model pillar: a mini-dbt project builds against DuckDB-Wasm and is graded.
test('dbt: open a challenge, build the solution, grade Correct', async ({ page }) => {
  await page.goto('/#/model');
  await expect(page.getByTestId('dbt-stage-orders')).toBeVisible();

  await page.getByTestId('dbt-stage-orders').click();
  await expect(page.getByTestId('challenge-title')).toContainText('Stage the raw orders');

  // Write the correct staging model into the (single) model file.
  const solution =
    "select order_id, customer_id, amount, lower(trim(status)) as status from {{ source('raw', 'orders') }}";
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.locator('.cm-content').fill(solution);

  // Build & grade — DuckDB-Wasm boots + the mini-dbt engine runs the project.
  await page.getByTestId('dbt-build').click();
  await expect(page.getByTestId('dbt-verdict')).toHaveText('Correct', { timeout: 60_000 });
  await expect(page.getByTestId('dbt-results')).toBeVisible();
  await page.screenshot({ path: 'screenshots/10-dbt-correct.png', fullPage: true });
});

test('dbt: right output but wrong materialization is marked Incorrect', async ({ page }) => {
  await page.goto('/#/model/incremental-orders');
  await expect(page.getByTestId('challenge-title')).toContainText('Incremental orders mart');

  // Solve orders_mart as a plain table — correct rows, but not incremental.
  await page.getByTestId('file-models-orders-mart-sql').click();
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page
    .locator('.cm-content')
    .fill("{{ config(materialized='table') }}\nselect order_id, customer_id, amount, updated_at from {{ ref('stg_orders') }}");

  await page.getByTestId('dbt-build').click();
  await expect(page.getByTestId('dbt-verdict')).toHaveText('Incorrect', { timeout: 60_000 });
  await expect(page.getByTestId('dbt-reasons')).toContainText('incremental');
});
