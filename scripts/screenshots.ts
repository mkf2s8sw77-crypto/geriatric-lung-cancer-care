import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://127.0.0.1:12168/geriatric-lung-cancer-care';
const OUT = path.resolve(process.cwd(), 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

async function login(page: import('@playwright/test').Page, username: string, password: string) {
  await page.goto(BASE + '/login');
  await page.getByTestId('login-username').fill(username);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 30000 });
}

async function shot(page: import('@playwright/test').Page, name: string) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
  console.log('saved', name);
}

async function scrollToHeading(page: import('@playwright/test').Page, text: string) {
  await page.evaluate((t) => {
    const headings = document.querySelectorAll('h1, h2, h3');
    for (const h of headings) {
      if (h.textContent && h.textContent.includes(t)) {
        h.scrollIntoView({ block: 'start' });
        return;
      }
    }
  }, text);
  await page.waitForTimeout(300);
}

async function run() {
  const browser = await chromium.launch();

  // ============ Mobile 390x844 · Patient (6) ============
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await login(page, 'patient_demo', 'Demo@2026');
    await page.goto(BASE + '/patient'); await shot(page, 'patient-home-mobile.png');
    await page.goto(BASE + '/patient/assessments/draft'); await shot(page, 'patient-assessment-mobile.png');
    await page.goto(BASE + '/patient/symptoms/new'); await shot(page, 'patient-symptom-mobile.png');
    await page.goto(BASE + '/patient/tasks'); await shot(page, 'patient-tasks-mobile.png');
    await page.goto(BASE + '/patient/education'); await shot(page, 'patient-education-mobile.png');
    await page.goto(BASE + '/patient/trends'); await shot(page, 'patient-trends-mobile.png');
    await page.goto(BASE + '/patient/butler'); await shot(page, 'patient-butler-mobile.png');
    // 评估结果页（取最近一条已提交评估）
    const resp = await page.request.get(BASE + '/api/health');
    void resp;
    await page.goto(BASE + '/patient/assessments/1');
    await page.waitForTimeout(1200);
    await shot(page, 'patient-assessment-result-mobile.png');
    // 患者首页滚到管家入口卡
    await page.goto(BASE + '/patient');
    await page.waitForTimeout(800);
    await scrollToHeading(page, '健康管家');
    await shot(page, 'patient-home-butler-mobile.png');
    await ctx.close();
  }

  // ============ Mobile 390x844 · Nurse (8) ============
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await login(page, 'nurse_demo', 'Demo@2026');
    await page.goto(BASE + '/nurse'); await shot(page, 'nurse-home-mobile.png');
    await page.goto(BASE + '/nurse/patients'); await shot(page, 'nurse-patients-mobile.png');
    await page.goto(BASE + '/nurse/patients/new'); await shot(page, 'nurse-patient-new-mobile.png');
    await page.goto(BASE + '/nurse/patients/1'); await shot(page, 'nurse-patient-detail-mobile.png');
    await page.goto(BASE + '/nurse/patients/1');
    await page.waitForTimeout(800);
    await scrollToHeading(page, 'AI 演示分析');
    await shot(page, 'nurse-patient-detail-ai-compare-mobile.png');
    await page.goto(BASE + '/nurse/alerts'); await shot(page, 'nurse-alerts-mobile.png');
    await page.goto(BASE + '/nurse/alerts/1'); await shot(page, 'nurse-alert-detail-mobile.png');
    await page.goto(BASE + '/nurse/followups'); await shot(page, 'nurse-followups-mobile.png');
    await page.goto(BASE + '/nurse/assistant'); await shot(page, 'nurse-assistant-mobile.png');
    await page.goto(BASE + '/nurse');
    await page.waitForTimeout(800);
    await scrollToHeading(page, 'AI 知识库智能体');
    await shot(page, 'nurse-home-upgrade-mobile.png');
    await ctx.close();
  }

  // ============ Desktop 1280x800 · Admin (10) ============
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await login(page, 'admin_demo', 'Demo@2026');
    await page.goto(BASE + '/admin'); await shot(page, 'admin-dashboard-desktop.png');
    await page.goto(BASE + '/admin');
    await page.waitForTimeout(800);
    await scrollToHeading(page, 'AI 演示分析采纳率');
    await shot(page, 'admin-dashboard-upgrade-desktop.png');
    await page.goto(BASE + '/admin/patients'); await shot(page, 'admin-patients-desktop.png');
    await page.goto(BASE + '/admin/users'); await shot(page, 'admin-users-desktop.png');
    await page.goto(BASE + '/admin/scales'); await shot(page, 'admin-scales-desktop.png');
    await page.goto(BASE + '/admin/pathways'); await shot(page, 'admin-pathways-desktop.png');
    await page.goto(BASE + '/admin/risk-rules'); await shot(page, 'admin-risk-rules-desktop.png');
    await page.goto(BASE + '/admin/education'); await shot(page, 'admin-education-desktop.png');
    await page.goto(BASE + '/admin/research'); await shot(page, 'admin-research-desktop.png');
    await page.goto(BASE + '/admin/audit'); await shot(page, 'admin-audit-desktop.png');
    await page.goto(BASE + '/admin/ai/knowledge'); await shot(page, 'admin-knowledge-desktop.png');
    await ctx.close();
  }

  await browser.close();
  console.log('All 30 screenshots saved to', OUT);
}

run().catch((e) => { console.error(e); process.exit(1); });
