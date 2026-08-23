import { describe, it, expect } from 'vitest';
import {
  generateMockAnalysis,
  generateMockAnalysisCompare,
  computeLevel,
  defaultStyle,
} from '../lib/services/ai/analysis';

describe('ai-analysis · computeLevel', () => {
  it('low risk for total < 30 and top < 5', () => {
    expect(computeLevel(20, 3)).toBe('low');
  });
  it('medium risk by total >= 30', () => {
    expect(computeLevel(30, 3)).toBe('medium');
  });
  it('medium risk by top >= 5', () => {
    expect(computeLevel(20, 5)).toBe('medium');
  });
  it('high risk by total >= 50', () => {
    expect(computeLevel(50, 3)).toBe('high');
  });
  it('high risk by top >= 8', () => {
    expect(computeLevel(20, 8)).toBe('high');
  });
});

describe('ai-analysis · generateMockAnalysis styles', () => {
  const baseInput = { total: 38, top: 6, topName: '疲乏无力', topCode: 'fatigue', stage: '治疗中', delta: 5 as number | null };

  it('balanced produces model mock-geriatric-lung-v1 and label 中风险', () => {
    const o = generateMockAnalysis(baseInput, 'balanced');
    expect(o.model).toBe('mock-geriatric-lung-v1');
    expect(o.style).toBe('balanced');
    expect(o.level).toBe('medium');
    expect(o.levelLabel).toBe('中风险');
    expect(o.levelColor).toBe('amber');
    expect(o.advice).toHaveLength(3);
    expect(o.followup).toHaveLength(3);
    expect(o.evidence.length).toBeGreaterThan(0);
    expect(o.disclaimer).toContain('mock-geriatric-lung-v1');
    expect(o.disclaimer).toContain('演示');
  });

  it('conservative shifts followup timing later and uses 中低风险 label', () => {
    const b = generateMockAnalysis(baseInput, 'balanced');
    const c = generateMockAnalysis(baseInput, 'conservative');
    expect(c.levelLabel).toBe('中低风险');
    expect(c.model).toBe('mock-geriatric-lung-v1-conservative');
    // conservative has followupShift = 1, so timing labels should be later
    const timingOrder = ['24 小时内', '3 天内', '本周内', '两周内', '一个月内', '三个月内'];
    const bIdx = timingOrder.indexOf(b.followup[0].timing);
    const cIdx = timingOrder.indexOf(c.followup[0].timing);
    expect(cIdx).toBeGreaterThanOrEqual(bIdx);
  });

  it('proactive uses 中高风险 label and earlier followup timing', () => {
    const b = generateMockAnalysis(baseInput, 'balanced');
    const p = generateMockAnalysis(baseInput, 'proactive');
    expect(p.levelLabel).toBe('中高风险');
    expect(p.model).toBe('mock-geriatric-lung-v1-proactive');
    const timingOrder = ['24 小时内', '3 天内', '本周内', '两周内', '一个月内', '三个月内'];
    const bIdx = timingOrder.indexOf(b.followup[0].timing);
    const pIdx = timingOrder.indexOf(p.followup[0].timing);
    expect(pIdx).toBeLessThanOrEqual(bIdx);
  });

  it('high risk shows red color and high-specific advice', () => {
    const o = generateMockAnalysis({ total: 60, top: 8, topName: '疼痛', topCode: 'pain', stage: '治疗中', delta: null }, 'balanced');
    expect(o.level).toBe('high');
    expect(o.levelColor).toBe('red');
    expect(o.levelLabel).toBe('高风险');
    expect(o.advice[0].action).toContain('电话随访');
  });

  it('low risk produces green color and routine advice', () => {
    const o = generateMockAnalysis({ total: 10, top: 2, topName: '咳嗽', topCode: 'cough', stage: '康复期', delta: null }, 'balanced');
    expect(o.level).toBe('low');
    expect(o.levelColor).toBe('green');
    expect(o.levelLabel).toBe('低风险');
    expect(o.evidence[0]).toBe('总分与最高症状均在低风险范围内');
  });
});

describe('ai-analysis · generateMockAnalysisCompare', () => {
  it('returns all three styles with stable model names', () => {
    const input = { total: 25, top: 4, topName: '食欲下降', topCode: 'appetite', stage: '康复期', delta: 2 as number | null };
    const c = generateMockAnalysisCompare(input);
    expect(c.balanced.model).toBe('mock-geriatric-lung-v1');
    expect(c.conservative.model).toBe('mock-geriatric-lung-v1-conservative');
    expect(c.proactive.model).toBe('mock-geriatric-lung-v1-proactive');
  });
});

describe('ai-analysis · defaultStyle stability', () => {
  it('returns same style for the same input hash', () => {
    const input = { total: 38, top: 6, topName: '疲乏无力', topCode: 'fatigue', stage: '治疗中', delta: 5 as number | null };
    const a = defaultStyle(input);
    const b = defaultStyle(input);
    expect(a).toBe(b);
  });
  it('returns one of three valid styles', () => {
    const input = { total: 38, top: 6, topName: '疲乏无力', topCode: 'fatigue', stage: '治疗中', delta: 5 as number | null };
    const s = defaultStyle(input);
    expect(['balanced', 'conservative', 'proactive']).toContain(s);
  });
});
