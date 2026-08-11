import { test, expect } from '@playwright/test';

async function login(page: import('@playwright/test').Page, username: string, password: string) {
  await page.goto('/geriatric-lung-cancer-care/login');
  await page.getByTestId('login-username').fill(username);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
}

test.describe('mobile smoke', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('patient logs in and reaches draft assessment page', async ({ page }) => {
    await login(page, 'patient_demo', 'Demo@2026');
    await expect(page).toHaveURL(/\/patient$/);
    await page.goto('/geriatric-lung-cancer-care/patient/assessments/draft');
    await expect(page.locator('h1')).toContainText('症状评估');
    // 等待10题加载
    await page.waitForTimeout(500);
    // 验证有10道题的按钮组
    const buttons = await page.locator('button[aria-pressed]').count();
    expect(buttons).toBeGreaterThanOrEqual(10);
  });

  test('patient reports a new symptom', async ({ page }) => {
    await login(page, 'patient_demo', 'Demo@2026');
    await page.goto('/geriatric-lung-cancer-care/patient/symptoms/new');
    await expect(page.locator('h1')).toContainText('主动症状报告');
  });

  test('patient views tasks list', async ({ page }) => {
    await login(page, 'patient_demo', 'Demo@2026');
    await page.goto('/geriatric-lung-cancer-care/patient/tasks');
    await expect(page.locator('h1')).toContainText('任务中心');
  });

  test('patient views trends chart', async ({ page }) => {
    await login(page, 'patient_demo', 'Demo@2026');
    await page.goto('/geriatric-lung-cancer-care/patient/trends');
    await expect(page.locator('h1')).toContainText('近 30 天趋势');
  });

  test('RBAC: patient cannot access nurse URL', async ({ page }) => {
    await login(page, 'patient_demo', 'Demo@2026');
    const resp = await page.goto('/geriatric-lung-cancer-care/nurse');
    // 应重定向到 forbidden 或返回 307
    expect(page.url()).toMatch(/\/(forbidden|patient)/);
  });
});

test.describe('nurse mobile smoke', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('nurse logs in and sees dashboard', async ({ page }) => {
    await login(page, 'nurse_demo', 'Demo@2026');
    await expect(page).toHaveURL(/\/nurse$/);
    await page.locator('text=演示护士').first().waitFor({ timeout: 15000 });
  });

  test('nurse sees alerts list', async ({ page }) => {
    await login(page, 'nurse_demo', 'Demo@2026');
    await page.goto('/geriatric-lung-cancer-care/nurse/alerts');
    await expect(page.locator('h1')).toContainText('预警列表');
  });

  test('nurse creates a patient', async ({ page }) => {
    await login(page, 'nurse_demo', 'Demo@2026');
    await page.goto('/geriatric-lung-cancer-care/nurse/patients/new');
    await page.locator('#np-fullName').waitFor({ timeout: 15000 });
    const ts = Date.now().toString().slice(-9);
    await page.locator('#np-fullName').fill('演示患者_' + ts);
    await page.locator('#np-phone').fill('138' + ts.padStart(8, '0').slice(-8));
    await page.locator('#np-age').fill('68');
    await page.locator('#np-enroll').fill('2026-08-01');
    await page.locator('#np-follow').fill('2026-08-30');
    await page.getByRole('button', { name: '创建患者' }).click();
    await page.locator('text=已成功创建').first().waitFor({ timeout: 20000 });
  });
});

test.describe('desktop admin smoke', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('admin sees dashboard', async ({ page }) => {
    await login(page, 'admin_demo', 'Demo@2026');
    await expect(page).toHaveURL(/\/admin$/);
    await page.locator('text=总患者数').first().waitFor({ timeout: 15000 });
  });

  test('admin views patient table', async ({ page }) => {
    await login(page, 'admin_demo', 'Demo@2026');
    await page.goto('/geriatric-lung-cancer-care/admin/patients');
    await expect(page.locator('h1')).toContainText('患者管理');
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  test('admin exports CSV', async ({ page }) => {
    await login(page, 'admin_demo', 'Demo@2026');
    const resp = await page.request.get('/geriatric-lung-cancer-care/api/admin/research/export');
    expect(resp.ok()).toBeTruthy();
    const body = await resp.text();
    expect(body).toContain('研究编号');
    expect(body).not.toContain('Demo@2026');
    expect(body).not.toContain('138');
  });

  test('admin views audit', async ({ page }) => {
    await login(page, 'admin_demo', 'Demo@2026');
    await page.goto('/geriatric-lung-cancer-care/admin/audit');
    await expect(page.locator('h1')).toContainText('审计');
  });
});

test.describe('health check', () => {
  test('returns 200 with minimal JSON', async ({ request }) => {
    const r = await request.get('/geriatric-lung-cancer-care/api/health');
    expect(r.status()).toBe(200);
    const j = await r.json();
    expect(j.status).toBe('ok');
    expect(j.service).toBe('geriatric-lung-cancer-care');
  });
});
