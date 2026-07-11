import { test, expect } from '@playwright/test';

// The Model pillar: a mini-dbt IDE — file tree, editor, terminal (dbt commands), Submit-grades.
test('dbt IDE: write a model, run `dbt build`, Submit → Correct', async ({ page }) => {
  await page.goto('/#/model');
  await page.getByTestId('dbt-stage-orders').click();
  await expect(page.getByTestId('challenge-title')).toContainText('Stage the raw orders');

  // Open the model file from the tree and write the solution.
  await page.getByTestId('tree-models-stg-orders-sql').click();
  const solution =
    "select order_id, customer_id, amount, lower(trim(status)) as status from {{ source('raw', 'orders') }}";
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.locator('.cm-content').fill(solution);

  // Run it in the terminal.
  await page.getByTestId('dbt-terminal-input').fill('dbt build');
  await page.getByTestId('dbt-terminal-input').press('Enter');
  await expect(page.getByTestId('dbt-terminal')).toContainText('OK stg_orders', { timeout: 60_000 });

  // Grade it.
  await page.getByTestId('dbt-submit').click();
  await expect(page.getByTestId('dbt-verdict')).toContainText('Correct', { timeout: 60_000 });
  await page.screenshot({ path: 'screenshots/10-dbt-ide.png', fullPage: true });
});

test('dbt IDE: `dbt build -s model` builds a selection, skipping unwritten stubs', async ({ page }) => {
  await page.goto('/#/model/incremental-orders'); // orders_mart starts as an empty stub
  await page.getByTestId('dbt-terminal-input').fill('dbt build -s stg_orders');
  await page.getByTestId('dbt-terminal-input').press('Enter');
  await expect(page.getByTestId('dbt-terminal')).toContainText('OK stg_orders', { timeout: 60_000 });
  await expect(page.getByTestId('dbt-terminal')).not.toContainText('ERROR');
});

test('dbt IDE: terminal recalls previous commands with up/down arrows', async ({ page }) => {
  await page.goto('/#/model/incremental-orders');
  const input = page.getByTestId('dbt-terminal-input');
  await input.fill('dbt compile');
  await input.press('Enter');
  await expect(input).toHaveValue('');
  await input.fill('dbt ls');
  await input.press('Enter');
  await expect(input).toHaveValue('');

  await input.press('ArrowUp');
  await expect(input).toHaveValue('dbt ls'); // most recent
  await input.press('ArrowUp');
  await expect(input).toHaveValue('dbt compile'); // older
  await input.press('ArrowDown');
  await expect(input).toHaveValue('dbt ls');
  await input.press('ArrowDown');
  await expect(input).toHaveValue(''); // back to a fresh line
});

test('dbt IDE: files + command history persist across a reload', async ({ page }) => {
  await page.goto('/#/model/stage-orders');
  await page.getByTestId('tree-models-stg-orders-sql').click();
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.locator('.cm-content').fill('select 42 as answer');
  await page.getByTestId('dbt-terminal-input').fill('dbt compile');
  await page.getByTestId('dbt-terminal-input').press('Enter');
  await expect(page.getByTestId('dbt-terminal-input')).toHaveValue('');

  await page.reload();
  await page.getByTestId('tree-models-stg-orders-sql').click();
  await expect(page.locator('.cm-content')).toContainText('select 42 as answer');
  await page.getByTestId('dbt-terminal-input').press('ArrowUp');
  await expect(page.getByTestId('dbt-terminal-input')).toHaveValue('dbt compile');
});

test('dbt IDE: the terminal collapses', async ({ page }) => {
  await page.goto('/#/model/stage-orders');
  await expect(page.getByTestId('dbt-terminal-input')).toBeVisible();
  await page.getByTestId('dbt-term-toggle').click();
  await expect(page.getByTestId('dbt-terminal-input')).toBeHidden();
});

test('dbt IDE: incremental persists across runs; SQL queries show materialized data', async ({ page }) => {
  await page.goto('/#/model/incremental-orders');
  await page.getByTestId('tree-models-orders-mart-sql').click();
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page
    .locator('.cm-content')
    .fill(
      "{{ config(materialized='incremental', unique_key='order_id') }}\n" +
        "select order_id, customer_id, amount, updated_at from {{ ref('stg_orders') }}\n" +
        '{% if is_incremental() %}\n' +
        'where updated_at > (select max(updated_at) from {{ this }})\n' +
        '{% endif %}',
    );

  const input = page.getByTestId('dbt-terminal-input');
  const term = page.getByTestId('dbt-terminal');

  // First build creates the table from scratch — not the incremental path.
  await input.fill('dbt build');
  await input.press('Enter');
  await expect(term).toContainText('OK orders_mart', { timeout: 60_000 });
  await expect(term).not.toContainText('OK orders_mart [3 rows] (incremental)');

  // Second build against the persistent scratch takes the incremental path.
  await input.fill('dbt build');
  await input.press('Enter');
  await expect(term).toContainText('(incremental)', { timeout: 60_000 });

  // A plain SQL query inspects the materialized model's rows.
  await input.fill('select order_id, amount from orders_mart order by order_id');
  await input.press('Enter');
  await expect(term).toContainText('order_id', { timeout: 60_000 });
  await expect(term).toContainText('(3 rows)');
});

test('dbt IDE: a table instead of an incremental model is Incorrect', async ({ page }) => {
  await page.goto('/#/model/incremental-orders');
  await page.getByTestId('tree-models-orders-mart-sql').click();
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page
    .locator('.cm-content')
    .fill("{{ config(materialized='table') }}\nselect order_id, customer_id, amount, updated_at from {{ ref('stg_orders') }}");

  await page.getByTestId('dbt-submit').click();
  await expect(page.getByTestId('dbt-verdict')).toContainText('Incorrect', { timeout: 60_000 });
  await expect(page.getByTestId('dbt-reasons')).toContainText('incremental');
});
