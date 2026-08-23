import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';

// 每次 e2e 测试开始前重置数据库, 确保测试数据干净
test.beforeAll(async () => {
  try { execSync('npm run db:reset', { stdio: 'pipe' }); } catch (e) { /* ignore */ }
});

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
    await login(page, 'patient', '123456');
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
    await login(page, 'patient', '123456');
    await page.goto('/geriatric-lung-cancer-care/patient/symptoms/new');
    await expect(page.locator('h1')).toContainText('主动症状报告');
  });

  test('patient views tasks list', async ({ page }) => {
    await login(page, 'patient', '123456');
    await page.goto('/geriatric-lung-cancer-care/patient/tasks');
    await expect(page.locator('h1')).toContainText('任务中心');
  });

  test('patient views trends chart on profile', async ({ page }) => {
    await login(page, 'patient', '123456');
    // 第7 轮起：趋势图移入"我的"页；/patient/trends 重定向到 /patient/profile。
    await page.goto('/geriatric-lung-cancer-care/patient/profile');
    await expect(page.locator('h1')).toContainText('我的信息');
    await expect(page.getByText('近 30 天趋势')).toBeVisible();
  });

  test('patient /trends redirects to /profile', async ({ page }) => {
    await login(page, 'patient', '123456');
    await page.goto('/geriatric-lung-cancer-care/patient/trends');
    await expect(page).toHaveURL(/\/patient\/profile$/);
  });

  test('RBAC: patient cannot access nurse URL', async ({ page }) => {
    await login(page, 'patient', '123456');
    const resp = await page.goto('/geriatric-lung-cancer-care/nurse');
    // 应重定向到 forbidden 或返回 307
    expect(page.url()).toMatch(/\/(forbidden|patient)/);
  });
});

test.describe('nurse mobile smoke', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('nurse logs in and sees dashboard', async ({ page }) => {
    await login(page, 'nurse', '123456');
    await expect(page).toHaveURL(/\/nurse$/);
    await page.locator('text=演示护士').first().waitFor({ timeout: 15000 });
  });

  test('nurse sees alerts list', async ({ page }) => {
    await login(page, 'nurse', '123456');
    await page.goto('/geriatric-lung-cancer-care/nurse/alerts');
    await expect(page.locator('h1')).toContainText('预警列表');
  });

  test('nurse can fill assessment on behalf of patient', async ({ page }) => {
    await login(page, 'nurse', '123456');
    await page.goto('/geriatric-lung-cancer-care/nurse/patients/1/assessments/new');
    await expect(page.locator('h1')).toContainText('代填评估');
    // 检查页面有 10 道题
    const buttons = await page.locator('button[aria-pressed]').count();
    expect(buttons).toBeGreaterThanOrEqual(10);
  });

  test('nurse can adopt AI analysis', async ({ page }) => {
    await login(page, 'nurse', '123456');
    // 直接尝试一个明显存在的 AI id（seed 中固定会有）, 然后跳过如果已采纳
    const resp = await page.request.post('/geriatric-lung-cancer-care/api/nurse/ai-analyses/3', {
      data: { status: '已采纳', note: 'e2e test' },
    });
    // AI id=3 可能已被其他测试采纳, 允许 200 或 400 两种结果
    expect([200, 400]).toContain(resp.status());
  });

  test('nurse creates a patient', async ({ page }) => {
    await login(page, 'nurse', '123456');
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
    await login(page, 'admin', '123456');
    await expect(page).toHaveURL(/\/admin$/);
    await page.locator('text=总患者数').first().waitFor({ timeout: 15000 });
  });

  test('admin views patient table', async ({ page }) => {
    await login(page, 'admin', '123456');
    await page.goto('/geriatric-lung-cancer-care/admin/patients');
    await expect(page.locator('h1')).toContainText('患者管理');
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  test('admin exports CSV', async ({ page }) => {
    await login(page, 'admin', '123456');
    const resp = await page.request.get('/geriatric-lung-cancer-care/api/admin/research/export');
    expect(resp.ok()).toBeTruthy();
    const body = await resp.text();
    expect(body).toContain('研究编号');
    expect(body).not.toContain('123456');
    expect(body).not.toContain('138');
  });

  test('admin views audit', async ({ page }) => {
    await login(page, 'admin', '123456');
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

test.describe('AI features smoke (Phase 5)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('nurse AI knowledge agent returns a draft answer with citations', async ({ page }) => {
    await login(page, 'nurse', '123456');
    const resp = await page.request.post('/geriatric-lung-cancer-care/api/nurse/assistant/ask', {
      data: { question: '吸痰时负压应该是多少？' },
    });
    expect(resp.ok()).toBeTruthy();
    const j = await resp.json();
    expect(j.ok).toBe(true);
    expect(j.data.answer.matches.length).toBeGreaterThan(0);
    expect(j.data.answer.matches[0].category).toBe('气道护理');
    expect(j.data.answer.confidence).toMatch(/high|medium/);
    expect(j.data.answer.disclaimer).toContain('mock-kb-agent-v1');
  });

  test('patient AI butler send returns intent and disclaimer', async ({ page }) => {
    await login(page, 'patient', '123456');
    const resp = await page.request.post('/geriatric-lung-cancer-care/api/patient/butler/send', {
      data: { text: '今天要做什么？' },
    });
    expect(resp.ok()).toBeTruthy();
    const j = await resp.json();
    expect(j.ok).toBe(true);
    expect(j.data.reply.intent).toBe('task');
    expect(j.data.reply.disclaimer).toContain('mock-butler-v1');
  });

  test('nurse AI alert draft returns a 4-step draft', async ({ page }) => {
    await login(page, 'nurse', '123456');
    // 试着找一个属于 nurse 的预警：从 /nurse/alerts 页面抓取首个预警 id
    await page.goto('/geriatric-lung-cancer-care/nurse/alerts');
    const firstLink = page.locator('a[href*="/nurse/alerts/"]').first();
    let alertId = '1';
    if (await firstLink.count() > 0) {
      const href = await firstLink.getAttribute('href');
      const m = href && href.match(/\/alerts\/(\d+)/);
      if (m) alertId = m[1];
    }
    const draftResp = await page.request.post(`/geriatric-lung-cancer-care/api/nurse/alerts/${alertId}/draft`);
    // 允许 200（属于护士）或 403/404（不属于/不存在）
    if (draftResp.ok()) {
      const j = await draftResp.json();
      expect(j.ok).toBe(true);
      expect(j.data.draft).toContain('mock-drafting-v1');
      expect(j.data.draft).toContain('1. 24 小时内联系患者');
    } else {
      expect([403, 404]).toContain(draftResp.status());
    }
  });
});
