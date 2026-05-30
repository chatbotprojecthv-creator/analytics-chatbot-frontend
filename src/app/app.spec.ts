import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:4200';
const BACKEND_URL = 'http://127.0.0.1:8000';

test.describe('Pharma Analytics App', () => {
  test('backend health works', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.message).toContain('Backend is running');
  });

  test('backend ask endpoint works for Jpharma', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/ask`, {
      data: {
        client: 'Jpharma',
        question: 'Show top 5 therapeutic classes by medicine count'
      }
    });

    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.sql).toBeTruthy();
    expect(body.summary).toBeTruthy();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('frontend loads dashboard', async ({ page }) => {
    await page.goto(FRONTEND_URL);

    await expect(page.getByText('Pharma Analytics Dashboard')).toBeVisible();
    await expect(page.getByText('Available Clients')).toBeVisible();
    await expect(page.getByText('Open Analytics Workspace')).toBeVisible();
  });

  test('frontend can open workspace and ask question', async ({ page }) => {
    await page.goto(FRONTEND_URL);

    await page.locator('select').first().selectOption('Jpharma');
    await page.getByRole('button', { name: /Open Analytics Workspace/i }).click();

    await expect(page.getByText('Jpharma Reporting Workspace')).toBeVisible();

    await page.locator('textarea[name="question"]').fill(
      'Show top 5 therapeutic classes by medicine count'
    );

    await page.getByRole('button', { name: /Generate Report/i }).click();

    await expect(page.getByText('Chart Output')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('AI Summary')).toBeVisible();
    await expect(page.getByText('SQL Generated')).toBeVisible();
  });

  test('chart type selector works', async ({ page }) => {
    await page.goto(FRONTEND_URL);

    await page.locator('select').first().selectOption('Jpharma');
    await page.getByRole('button', { name: /Open Analytics Workspace/i }).click();

    await page.locator('textarea[name="question"]').fill(
      'Show top 5 therapeutic classes by medicine count'
    );

    await page.getByRole('button', { name: /Generate Report/i }).click();

    await expect(page.getByText('Configure Chart:')).toBeVisible({ timeout: 30000 });

    await page.locator('.visual-config select').selectOption('bar');
    await expect(page.locator('canvas')).toBeVisible();

    await page.locator('.visual-config select').selectOption('pie');
    await expect(page.locator('canvas')).toBeVisible();

    await page.locator('.visual-config select').selectOption('table');
    await expect(page.getByText('Table Only selected')).toBeVisible();
  });

  test('save report works', async ({ page }) => {
    await page.goto(FRONTEND_URL);

    await page.locator('select').first().selectOption('Jpharma');
    await page.getByRole('button', { name: /Open Analytics Workspace/i }).click();

    await page.locator('textarea[name="question"]').fill(
      'Show top 5 therapeutic classes by medicine count'
    );

    await page.getByRole('button', { name: /Generate Report/i }).click();

    await expect(page.getByRole('button', { name: /Save Report/i })).toBeVisible({
      timeout: 30000
    });

    await page.getByRole('button', { name: /Save Report/i }).click();

    await expect(page.getByText('Saved Reports')).toBeVisible();
    await expect(page.getByText('Show top 5 therapeutic classes by medicine count')).toBeVisible();
  });
});