// 评分与风险分层的纯函数实现，方便单元测试和复用

export type ScoreInput = {
  itemCode: string;
  itemName: string;
  score: number;
  weight?: number;
};

export type ScoreResult = {
  totalScore: number;
  topSymptomCode: string | null;
  topSymptomName: string | null;
  topSymptomScore: number;
  weightedAvg: number;
};

export function computeScore(items: ScoreInput[]): ScoreResult {
  if (items.length === 0) {
    return { totalScore: 0, topSymptomCode: null, topSymptomName: null, topSymptomScore: 0, weightedAvg: 0 };
  }
  let total = 0;
  let weightSum = 0;
  let top = items[0];
  for (const it of items) {
    const w = it.weight ?? 1.0;
    total += it.score * w;
    weightSum += w;
    if (it.score > top.score) top = it;
  }
  return {
    totalScore: Number(total.toFixed(2)),
    topSymptomCode: top.itemCode,
    topSymptomName: top.itemName,
    topSymptomScore: top.score,
    weightedAvg: weightSum > 0 ? Number((total / weightSum).toFixed(2)) : 0,
  };
}

export type RiskLevel = 'low' | 'medium' | 'high';

export type RiskInput = {
  totalScore: number;
  topSymptomScore: number;
  deltaVsPrev: number | null;
};

export type RiskRuleConfig = {
  totalMedium: number;
  totalHigh: number;
  topSymptomMedium: number;
  topSymptomHigh: number;
  deltaHigh: number;
};

export const DEFAULT_RISK_RULES: RiskRuleConfig = {
  totalMedium: 30,
  totalHigh: 50,
  topSymptomMedium: 5,
  topSymptomHigh: 8,
  deltaHigh: 15,
};

export function classifyRisk(input: RiskInput, cfg: RiskRuleConfig = DEFAULT_RISK_RULES): { level: RiskLevel; reasons: string[] } {
  const reasons: string[] = [];
  let level: RiskLevel = 'low';
  if (input.totalScore >= cfg.totalHigh) {
    level = 'high';
    reasons.push(`总分 ${input.totalScore} 超过高风险阈值 ${cfg.totalHigh}`);
  } else if (input.totalScore >= cfg.totalMedium) {
    level = max(level, 'medium');
    reasons.push(`总分 ${input.totalScore} 达到中风险阈值 ${cfg.totalMedium}`);
  }
  if (input.topSymptomScore >= cfg.topSymptomHigh) {
    level = max(level, 'high');
    reasons.push(`最高症状得分 ${input.topSymptomScore} 达到高风险阈值 ${cfg.topSymptomHigh}`);
  } else if (input.topSymptomScore >= cfg.topSymptomMedium) {
    level = max(level, 'medium');
    reasons.push(`最高症状得分 ${input.topSymptomScore} 达到中风险阈值 ${cfg.topSymptomMedium}`);
  }
  if (input.deltaVsPrev !== null && input.deltaVsPrev >= cfg.deltaHigh) {
    level = max(level, 'high');
    reasons.push(`较上次上升 ${input.deltaVsPrev} 超过阈值 ${cfg.deltaHigh}`);
  }
  if (reasons.length === 0) reasons.push('总分与最高症状均在低风险范围内');
  return { level, reasons };
}

function max(a: RiskLevel, b: RiskLevel): RiskLevel {
  const order: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };
  return order[a] >= order[b] ? a : b;
}

export function classifySymptomReportRisk(severity: number): { level: RiskLevel; reason: string } {
  if (severity >= 8) return { level: 'high', reason: `症状严重度 ${severity} 达到高风险阈值` };
  if (severity >= 5) return { level: 'medium', reason: `症状严重度 ${severity} 达到中风险阈值` };
  return { level: 'low', reason: `症状严重度 ${severity} 在低风险范围内` };
}
