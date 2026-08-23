// 回归测试：上线前排查并修复的关键 Bug 不应回潮。
import { describe, it, expect } from 'vitest';
import { getDb } from '../db/client';
import { aiButlerPushes, assessments, scaleItems } from '../db/schema';
import { eq, gte, sql } from 'drizzle-orm';
import { symptomLabel } from '../lib/services/symptom-cluster';

describe('回归 · 量表 code → 中文显示', (  ) => {
  it('所有量表 code 都能映射到中文', () => {
    expect(symptomLabel('fatigue')).toBe('疲乏无力');
    expect(symptomLabel('pain')).toBe('疼痛');
    expect(symptomLabel('dyspnea')).toBe('气短/呼吸困难');
    expect(symptomLabel('cough')).toBe('咳嗽');
    expect(symptomLabel('sleep')).toBe('睡眠紊乱');
    expect(symptomLabel('appetite')).toBe('食欲下降');
    expect(symptomLabel('mood')).toBe('情绪低落');
    expect(symptomLabel('nausea')).toBe('恶心呕吐');
    expect(symptomLabel('weight')).toBe('体重变化');
    expect(symptomLabel('daily')).toBe('日常活动受限');
  });

  it('未知 code 返回原值（不抛错）', () => {
    expect(symptomLabel('unknown')).toBe('unknown');
    expect(symptomLabel(null)).toBe('—');
    expect(symptomLabel(undefined)).toBe('—');
  });

  it('评估结果中的 topSymptomCode 都能映射为中文', async () => {
    const db = getDb();
    const rows = await db.select({ code: assessments.topSymptomCode }).from(assessments).where(sql`${assessments.topSymptomCode} IS NOT NULL`).limit(50);
    for (const r of rows) {
      const label = symptomLabel(r.code);
      expect(label).not.toBe(r.code); // 一定不能是英文 code 原值
    }
  });
});

describe('回归 · 趋势页 30 天数据分布', (  ) => {
  it('大部分患者在最近 30 天有至少 1 条评估', async () => {
    const db = getDb();
    // 用 today - 30 day 简单截 ISO 串
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    const rows = await db
      .select({ patientId: assessments.patientId })
      .from(assessments)
      .where(gte(assessments.submittedAt, cutoffIso))
      .groupBy(assessments.patientId);
    // 30 名患者里至少 25 名有近 30 天评估，趋势图不应大量空。
    expect(rows.length).toBeGreaterThanOrEqual(25);
  });
});

describe('回归 · BrandHeader 与 logout API', (  ) => {
  // 这里只覆盖纯函数层面的回归（不带浏览器）。UI 端 e2e 见 tests/e2e/smoke.spec.ts。
  it('logout 路由存在且支持表单 POST', async () => {
    const { POST } = await import('../app/api/auth/logout/route');
    expect(typeof POST).toBe('function');
  });
});
