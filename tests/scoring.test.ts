import { describe, it, expect } from 'vitest';
import { computeScore, classifyRisk, classifySymptomReportRisk, DEFAULT_RISK_RULES } from '../lib/scoring';

describe('scoring', () => {
  it('computes total and top symptom', () => {
    const r = computeScore([
      { itemCode: 'a', itemName: 'A', score: 3 },
      { itemCode: 'b', itemName: 'B', score: 7 },
      { itemCode: 'c', itemName: 'C', score: 5 },
    ]);
    expect(r.totalScore).toBe(15);
    expect(r.topSymptomCode).toBe('b');
    expect(r.topSymptomScore).toBe(7);
  });

  it('classifies low risk when scores below thresholds', () => {
    const r = classifyRisk({ totalScore: 20, topSymptomScore: 4, deltaVsPrev: null }, DEFAULT_RISK_RULES);
    expect(r.level).toBe('low');
  });

  it('classifies medium risk by top symptom', () => {
    const r = classifyRisk({ totalScore: 20, topSymptomScore: 6, deltaVsPrev: null }, DEFAULT_RISK_RULES);
    expect(r.level).toBe('medium');
  });

  it('classifies high risk by total', () => {
    const r = classifyRisk({ totalScore: 60, topSymptomScore: 6, deltaVsPrev: null }, DEFAULT_RISK_RULES);
    expect(r.level).toBe('high');
  });

  it('classifies high risk when delta is large', () => {
    const r = classifyRisk({ totalScore: 30, topSymptomScore: 4, deltaVsPrev: 20 }, DEFAULT_RISK_RULES);
    expect(r.level).toBe('high');
  });

  it('symptom report high severity is high risk', () => {
    expect(classifySymptomReportRisk(8).level).toBe('high');
    expect(classifySymptomReportRisk(5).level).toBe('medium');
    expect(classifySymptomReportRisk(2).level).toBe('low');
  });
});
