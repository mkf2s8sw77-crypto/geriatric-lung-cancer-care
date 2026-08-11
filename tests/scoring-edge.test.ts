import { describe, it, expect } from 'vitest';
import { computeScore, classifyRisk, classifySymptomReportRisk, DEFAULT_RISK_RULES } from '../lib/scoring';

describe('scoring edge cases', () => {
  it('handles empty input', () => {
    const r = computeScore([]);
    expect(r.totalScore).toBe(0);
    expect(r.topSymptomCode).toBeNull();
    expect(r.topSymptomScore).toBe(0);
  });

  it('respects weights', () => {
    const r = computeScore([
      { itemCode: 'a', itemName: 'A', score: 10, weight: 2 },
      { itemCode: 'b', itemName: 'B', score: 5, weight: 1 },
    ]);
    // total = 10*2 + 5*1 = 25
    expect(r.totalScore).toBe(25);
    expect(r.weightedAvg).toBe(8.33);
  });

  it('keeps delta null when first assessment', () => {
    const r = classifyRisk({ totalScore: 5, topSymptomScore: 1, deltaVsPrev: null }, DEFAULT_RISK_RULES);
    expect(r.level).toBe('low');
  });

  it('high risk by symptom even when total low', () => {
    const r = classifyRisk({ totalScore: 5, topSymptomScore: 9, deltaVsPrev: null }, DEFAULT_RISK_RULES);
    expect(r.level).toBe('high');
  });

  it('medium risk by top symptom only', () => {
    const r = classifyRisk({ totalScore: 15, topSymptomScore: 6, deltaVsPrev: null }, DEFAULT_RISK_RULES);
    expect(r.level).toBe('medium');
  });

  it('symptom report boundary values', () => {
    expect(classifySymptomReportRisk(0).level).toBe('low');
    expect(classifySymptomReportRisk(4).level).toBe('low');
    expect(classifySymptomReportRisk(5).level).toBe('medium');
    expect(classifySymptomReportRisk(7).level).toBe('medium');
    expect(classifySymptomReportRisk(8).level).toBe('high');
    expect(classifySymptomReportRisk(10).level).toBe('high');
  });
});
