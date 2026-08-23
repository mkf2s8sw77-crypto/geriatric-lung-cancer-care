// 回归测试：患者端 UX 收口（第7 轮）关键改动不应回潮。
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '../db/client';
import { tasks } from '../db/schema';
import { sql } from 'drizzle-orm';

const REPO = path.resolve(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(REPO, rel), 'utf-8');
}

describe('回归 · 种子任务去重（同患者同日同 step）', () => {
  it('每位在组患者不存在同日同 pathwayStepId 的多条任务', async () => {
    const db = getDb();
    // 仅看 pathway 派生的任务（pathwayStepId IS NOT NULL），过滤掉临时任务干扰。
    const rows = await db
      .select({
        patientId: tasks.patientId,
        pathwayStepId: tasks.pathwayStepId,
        scheduledDate: tasks.scheduledDate,
        c: sql<number>`count(*)`,
      })
      .from(tasks)
      .where(sql`${tasks.pathwayStepId} IS NOT NULL`)
      .groupBy(tasks.patientId, tasks.pathwayStepId, tasks.scheduledDate);
    const duplicates = rows.filter((r) => (r.c ?? 0) > 1);
    expect(duplicates).toEqual([]);
  });
});

describe('回归 · 底部导航不再含"趋势"、含"AI 助手"', () => {
  it('PatientNav.tsx 用 AI 助手替代趋势', () => {
    const src = read('components/PatientNav.tsx');
    expect(src).not.toMatch(/趋势/);
    expect(src).toMatch(/AI 助手/);
    expect(src).toMatch(/href: '\/patient\/butler'/);
  });

  it('PatientNav.tsx 不再含浮动退出按钮', () => {
    const src = read('components/PatientNav.tsx');
    expect(src).not.toMatch(/absolute -top-10/);
    expect(src).not.toMatch(/LogOut/);
  });
});

describe('回归 · AI 健康助手去龙虾化 + 去推送区 + 默认展开常见问题', () => {
  it('AIButlerCard.tsx 全文不再出现"小龙虾"或龙虾 emoji', () => {
    const src = read('components/AIButlerCard.tsx');
    expect(src).not.toMatch(/小龙虾/);
    expect(src).not.toMatch(/🦐/);
    expect(src).toMatch(/AI 健康助手/);
    expect(src).toMatch(/<Bot /);
  });

  it('AIButlerCard.tsx 移除今日推送相关 fetch / state / 常量', () => {
    const src = read('components/AIButlerCard.tsx');
    expect(src).not.toMatch(/api\/patient\/butler\/pushes/);
    expect(src).not.toMatch(/api\/patient\/butler\/mark-read/);
    expect(src).not.toMatch(/今日推送/);
    expect(src).not.toMatch(/PUSH_BG|PUSH_ICON/);
  });

  it('AIButlerCard.tsx 默认展开常见问题（showDemo 初值 true）', () => {
    const src = read('components/AIButlerCard.tsx');
    expect(src).toMatch(/const \[showDemo, setShowDemo\] = useState\(true\)/);
  });
});

describe('回归 · 患者首页三入口 + 不再含"小龙虾"文案', () => {
  it('app/patient/page.tsx 含 grid-cols-2 与 AI 健康助手 section', () => {
    const src = read('app/patient/page.tsx');
    expect(src).toMatch(/grid-cols-2/);
    expect(src).toMatch(/AI 健康助手/);
    expect(src).not.toMatch(/小龙虾/);
    expect(src).not.toMatch(/我的健康管家/);
  });
});

describe('回归 · 我的页含趋势图 + 退出登录按钮', () => {
  it('profile/page.tsx 引用 TrendChart + 退出表单', () => {
    const src = read('app/patient/profile/page.tsx');
    expect(src).toMatch(/TrendChart/);
    expect(src).toMatch(/api\/auth\/logout/);
    expect(src).toMatch(/退出登录/);
  });
});

describe('回归 · /patient/trends 重定向到 /patient/profile', () => {
  it('trends/page.tsx 导出 redirect', () => {
    const src = read('app/patient/trends/page.tsx');
    expect(src).toMatch(/redirect\(['"]\/patient\/profile['"]\)/);
  });
});

describe('回归 · 用户手册不再称"小龙虾"', () => {
  it('老年肺癌患者症状群智能评估与全病程管理系统概要设计.md 中"小龙虾"已替换', () => {
    const src = read('docs/老年肺癌患者症状群智能评估与全病程管理系统概要设计.md');
    expect(src).not.toMatch(/小龙虾/);
    // "健康管家"作为产品概念词仅允许在审计段落出现一次，且不带"我的"前缀
    const occ = (src.match(/健康管家/g) || []).length;
    expect(occ).toBeLessThanOrEqual(1);
  });
});
