import { test, expect, Page } from '@playwright/test';

const clients = ['Hpharma', 'Jpharma', 'Vpharma'];
const chartQuestion = 'Show top 5 therapeutic classes by medicine count';
const tableQuestion = 'Show medicines used for pain';

async function openWorkspace(page: Page, client: string) {
  await page.goto('/');

  await page.locator('select').first().selectOption(client);

  await page
    .getByRole('button', { name: /Open Analytics Workspace/i })
    .click();

  await expect(page.getByText(`${client} Reporting Workspace`)).toBeVisible();
  await expect(page.getByText(`Client: ${client}`)).toBeVisible();
  await expect(page.getByText('Connected to BigQuery')).toBeVisible();
}

async function generateReport(page: Page, question: string) {
  await page.locator('textarea[name="question"]').fill(question);

  await page.getByRole('button', { name: /Generate Report/i }).click();

  await expect(
    page.getByRole('heading', { name: /AI Summary/i })
  ).toBeVisible({ timeout: 120000 });
}

test.describe('Pharma Analytics Full Client Test Suite', () => {
  test('dashboard loads correctly', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.locator('header.page-header').getByRole('heading', {
        name: 'Pharma Analytics Dashboard'
      })
    ).toBeVisible();

    await expect(page.locator('.stat-card').nth(0)).toContainText('Reports Generated');
    await expect(page.locator('.stat-card').nth(1)).toContainText('Saved Reports');
    await expect(page.locator('.stat-card').nth(2)).toContainText('Available Clients');
  });

  for (const client of clients) {
    test(`${client} workspace opens`, async ({ page }) => {
      await openWorkspace(page, client);
      await expect(page.locator('textarea[name="question"]')).toBeVisible();
    });

    test(`${client} chart report generation works`, async ({ page }) => {
      await openWorkspace(page, client);
      await generateReport(page, chartQuestion);

      await expect(
        page.getByRole('heading', { name: 'Chart Output' })
      ).toBeVisible();

      await expect(page.getByText('Query executed through NL')).toBeVisible();

      const hasChart = await page.locator('canvas').isVisible().catch(() => false);
      const hasNoChart = await page
        .getByText('No chart generated for this question.')
        .isVisible()
        .catch(() => false);

      expect(hasChart || hasNoChart).toBeTruthy();
    });

    test(`${client} data preview tab works`, async ({ page }) => {
      await openWorkspace(page, client);
      await generateReport(page, tableQuestion);

      await page.getByRole('button', { name: /Data Preview/i }).click();

      await expect(
        page.getByRole('heading', { name: 'Data Preview' })
      ).toBeVisible();

      const tableVisible = await page.locator('table').isVisible().catch(() => false);
      const noDataVisible = await page
        .getByText('No data returned for this question.')
        .isVisible()
        .catch(() => false);

      expect(tableVisible || noDataVisible).toBeTruthy();
    });

    test(`${client} SQL generated tab works`, async ({ page }) => {
      await openWorkspace(page, client);
      await generateReport(page, chartQuestion);

      await page.getByRole('button', { name: /SQL Generated/i }).click();

      await expect(
        page.getByRole('heading', { name: 'Generated SQL' })
      ).toBeVisible();

      await expect(page.locator('pre')).toBeVisible();
    });

    test(`${client} chart selector works`, async ({ page }) => {
      await openWorkspace(page, client);
      await generateReport(page, chartQuestion);

      await page.locator('.visual-config select').selectOption('bar');
      await expect(page.locator('canvas')).toBeVisible();

      await page.locator('.visual-config select').selectOption('pie');
      await expect(page.locator('canvas')).toBeVisible();

      await page.locator('.visual-config select').selectOption('table');

      await expect(
        page.getByText('Table Only selected. View results in the Data Preview tab.')
      ).toBeVisible();
    });
  }

  test('save report works for Jpharma', async ({ page }) => {
    await openWorkspace(page, 'Jpharma');
    await generateReport(page, chartQuestion);

    await expect(
      page.getByRole('button', { name: /Save Report/i })
    ).toBeVisible({ timeout: 120000 });

    await page.getByRole('button', { name: /Save Report/i }).click();

    await expect(
      page.locator('header.page-header').getByRole('heading', {
        name: 'Saved Reports'
      })
    ).toBeVisible();

    await expect(
      page.locator('.report-list-item').filter({ hasText: chartQuestion })
    ).toBeVisible();
  });

  test('history page opens after report generation', async ({ page }) => {
    await openWorkspace(page, 'Vpharma');
    await generateReport(page, chartQuestion);

    await page.getByRole('button', { name: '✕' }).click();

    await page.locator('.sidebar-nav a').filter({ hasText: 'History' }).click();

    await expect(
      page.locator('header.page-header').getByRole('heading', {
        name: 'History'
      })
    ).toBeVisible();

    await expect(
      page.locator('.report-list-item').filter({ hasText: chartQuestion })
    ).toBeVisible();
  });

  test('settings page opens', async ({ page }) => {
    await page.goto('/');

    await page.getByText('⚙ Settings').click();

    await expect(
      page.locator('header.page-header').getByRole('heading', {
        name: 'Settings'
      })
    ).toBeVisible();

    await expect(page.getByText('Default Client')).toBeVisible();
    await expect(page.getByText('Default Visualization')).toBeVisible();
  });

  test('help page opens', async ({ page }) => {
    await page.goto('/');

    await page.getByText('❔ Help & Support').click();

    await expect(
      page.locator('header.page-header').getByRole('heading', {
        name: 'Help & Support'
      })
    ).toBeVisible();

    await expect(page.getByText(chartQuestion)).toBeVisible();
  });

  test('close workspace modal returns to dashboard', async ({ page }) => {
    await openWorkspace(page, 'Hpharma');

    await page.getByRole('button', { name: '✕' }).click();

    await expect(
      page.locator('header.page-header').getByRole('heading', {
        name: 'Pharma Analytics Dashboard'
      })
    ).toBeVisible();
  });
});