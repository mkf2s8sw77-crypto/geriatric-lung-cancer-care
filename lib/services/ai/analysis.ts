// Phase 5 · AI 演示分析（mock-geriatric-lung-v1-{balanced|conservative|proactive}）
// 演示版：4 维度归因 + 3 风格 + 证据触发链 + 3 条建议 + 3 条随访计划 + 给患者提示
// 严格保留"演示"边界：所有输出包含模型标识、生成时间、免责声明。

import { eq, desc, and } from 'drizzle-orm';
import { getDb } from '../../../db/client';
import { aiAnalyses, assessments, patients } from '../../../db/schema';
import { recordAudit } from '../../audit';
import { makeDisclaimer, nowIso, LEVEL_LABEL, type AILevel, type AILevelColor } from './shared';
import { symptomLabel } from '../../services/symptom-cluster';

export type AIAnalysisStyle = 'balanced' | 'conservative' | 'proactive';

export type AIAttribution = {
  symptom: string[];
  behavior: string[];
  psychological: string[];
  treatment: string[];
};

export type AIAdvice = {
  action: string;
  evidence: string;
};

export type AIFollowupPlan = {
  timing: string;
  channel: string;
  focus: string;
};

export type AIAnalysisOutput = {
  model: string;
  style: AIAnalysisStyle;
  level: AILevel;
  levelLabel: string;
  levelColor: AILevelColor;
  summary: string;
  topSymptoms: Array<{ code: string; name: string; score: number }>;
  attribution: AIAttribution;
  advice: AIAdvice[];        // 3 条
  followup: AIFollowupPlan[]; // 3 条
  evidence: string[];        // 触发的关键阈值
  patientHint: string;
  generatedAt: string;
  disclaimer: string;
};

export type AIAnalysisInput = {
  total: number;
  top: number;
  topName: string;
  topCode?: string;
  stage?: string;
  delta: number | null;
  taskAdherence?: number;
};

const STYLE_CONFIG: Record<AIAnalysisStyle, {
  modelName: string;
  levelLabels: Record<AILevel, string>;
  followupShift: number; // 随访时点档位偏移
}> = {
  balanced: {
    modelName: 'mock-geriatric-lung-v1',
    levelLabels: { low: '低风险', medium: '中风险', high: '高风险' },
    followupShift: 0,
  },
  conservative: {
    modelName: 'mock-geriatric-lung-v1-conservative',
    levelLabels: { low: '低风险', medium: '中低风险', high: '中高风险' },
    followupShift: 1,
  },
  proactive: {
    modelName: 'mock-geriatric-lung-v1-proactive',
    levelLabels: { low: '低风险', medium: '中高风险', high: '高风险' },
    followupShift: -1,
  },
};

const THRESHOLDS = {
  totalMedium: 30,
  totalHigh: 50,
  topMedium: 5,
  topHigh: 8,
  deltaHigh: 15,
};

export function computeLevel(total: number, top: number): AILevel {
  if (total >= THRESHOLDS.totalHigh || top >= THRESHOLDS.topHigh) return 'high';
  if (total >= THRESHOLDS.totalMedium || top >= THRESHOLDS.topMedium) return 'medium';
  return 'low';
}

function levelColor(level: AILevel): AILevelColor {
  return level === 'high' ? 'red' : level === 'medium' ? 'amber' : 'green';
}

function buildAttribution(level: AILevel, topName: string, topScore: number, total: number, stage: string): AIAttribution {
  const symptom: string[] = [];
  const behavior: string[] = [];
  const psychological: string[] = [];
  const treatment: string[] = [];
  if (level === 'high') {
    symptom.push(`${topName} 评分 ${topScore} 分，明显异常`);
    if (total >= 60) symptom.push('多项症状叠加，总分偏高');
    behavior.push('可能存在活动量下降或睡眠紊乱');
    psychological.push('存在焦虑或情绪低落风险');
    treatment.push('当前治疗方案可能需要调整');
  } else if (level === 'medium') {
    symptom.push(`${topName} 评分 ${topScore} 分，需关注`);
    behavior.push('日常活动可能受到轻度影响');
    psychological.push('情绪状态需要关注');
    treatment.push('当前治疗方案可继续观察');
  } else {
    symptom.push('症状整体平稳');
    behavior.push('日常活动未受明显影响');
    psychological.push('情绪状态良好');
    treatment.push('当前治疗方案适宜');
  }
  return { symptom, behavior, psychological, treatment };
}

function buildAdvice(level: AILevel, total: number, topScore: number, topName: string, shift: number): AIAdvice[] {
  if (level === 'high') {
    return [
      { action: shift <= 0 ? '24 小时内进行电话随访' : '48 小时内进行电话随访', evidence: `依据：总分 ${total} 达到高风险阈值，主要症状 ${topName} ${topScore} 分` },
      { action: '通知家属近期增加陪护关注', evidence: `依据：${topName} 评分偏高，存在急性加重风险` },
      { action: '考虑增加一次评估，及时复评', evidence: '依据：当前评估为高风险，需要更密集监测' },
    ];
  }
  if (level === 'medium') {
    return [
      { action: shift <= 0 ? '本周内电话随访' : '下周内电话随访', evidence: `依据：总分 ${total} 达到中风险阈值${topScore >= 5 ? `，主要症状 ${topName} ${topScore} 分` : ''}` },
      { action: '嘱患者每日记录症状日记', evidence: `依据：${topName} 需要持续观察` },
      { action: `下次评估建议关注 ${topName} 变化`, evidence: '依据：当前中风险状态需动态跟踪' },
    ];
  }
  return [
    { action: '按常规随访即可', evidence: '依据：总分与最高症状均在低风险范围内' },
    { action: '鼓励患者保持当前生活方式', evidence: '依据：症状整体平稳，未见明显异常' },
    { action: '建议 1 个月后常规评估', evidence: '依据：低风险状态稳定，可适当延长评估间隔' },
  ];
}

function adjustTiming(base: number, shift: number): string {
  const v = Math.max(1, base + shift);
  if (v <= 1) return '24 小时内';
  if (v <= 3) return '3 天内';
  if (v <= 7) return '本周内';
  if (v <= 14) return '两周内';
  if (v <= 30) return '一个月内';
  return '三个月内';
}

function buildFollowup(level: AILevel, shift: number): AIFollowupPlan[] {
  if (level === 'high') {
    return [
      { timing: adjustTiming(1, shift), channel: '电话随访', focus: '症状变化与用药情况' },
      { timing: adjustTiming(3, shift), channel: '门诊复查', focus: '主要症状专项评估' },
      { timing: adjustTiming(7, shift), channel: '上门随访', focus: '家属陪护与生活照护' },
    ];
  }
  if (level === 'medium') {
    return [
      { timing: adjustTiming(7, shift), channel: '电话随访', focus: '症状变化与情绪状态' },
      { timing: adjustTiming(14, shift), channel: '门诊复查', focus: '常规项目复查' },
      { timing: adjustTiming(30, shift), channel: '标准化评估', focus: '阶段性进展评估' },
    ];
  }
  return [
    { timing: adjustTiming(30, shift), channel: '电话随访', focus: '常规健康监测' },
    { timing: adjustTiming(60, shift), channel: '门诊复查', focus: '阶段性体检' },
    { timing: adjustTiming(90, shift), channel: '标准化评估', focus: '季度评估' },
  ];
}

function buildEvidence(total: number, top: number, topName: string, delta: number | null): string[] {
  const e: string[] = [];
  if (total >= THRESHOLDS.totalHigh) e.push(`总分 ${total}（高风险阈值 ${THRESHOLDS.totalHigh}）`);
  else if (total >= THRESHOLDS.totalMedium) e.push(`总分 ${total}（中风险阈值 ${THRESHOLDS.totalMedium}）`);
  if (top >= THRESHOLDS.topHigh) e.push(`${topName} 评分 ${top}（高风险阈值 ${THRESHOLDS.topHigh}）`);
  else if (top >= THRESHOLDS.topMedium) e.push(`${topName} 评分 ${top}（中风险阈值 ${THRESHOLDS.topMedium}）`);
  if (delta !== null && delta >= THRESHOLDS.deltaHigh) e.push(`较上次上升 ${delta.toFixed(1)}（阈值 ${THRESHOLDS.deltaHigh}）`);
  if (e.length === 0) e.push('总分与最高症状均在低风险范围内');
  return e;
}

function patientHintFor(level: AILevel): string {
  if (level === 'high') return '请保持联系畅通，如出现新症状或加重请及时告知护士或就医';
  if (level === 'medium') return '请关注症状变化，必要时联系护士';
  return '请保持当前生活习惯，注意休息';
}

// 决定默认风格：根据 (total, top, taskAdherence) 哈希，保证同一患者稳定。
export function defaultStyle(input: AIAnalysisInput): AIAnalysisStyle {
  const seed = input.total * 7 + input.top * 3 + Math.round((input.taskAdherence ?? 0) * 100) * 5;
  const styles: AIAnalysisStyle[] = ['balanced', 'conservative', 'proactive'];
  return styles[Math.abs(seed) % 3];
}

export function generateMockAnalysis(input: AIAnalysisInput, style: AIAnalysisStyle = 'balanced'): AIAnalysisOutput {
  const level = computeLevel(input.total, input.top);
  const cfg = STYLE_CONFIG[style];
  const topName = input.topName && input.topName !== '—' ? input.topName : '主要症状';
  const advice = buildAdvice(level, input.total, input.top, topName, cfg.followupShift);
  const followup = buildFollowup(level, cfg.followupShift);
  const attribution = buildAttribution(level, topName, input.top, input.total, input.stage || '');
  const evidence = buildEvidence(input.total, input.top, topName, input.delta);
  const patientHint = patientHintFor(level);
  return {
    model: cfg.modelName,
    style,
    level,
    levelLabel: cfg.levelLabels[level],
    levelColor: levelColor(level),
    summary: `${topName} ${input.top} 分；总分 ${input.total}（演示评估）`,
    topSymptoms: [{ code: input.topCode || '—', name: topName, score: input.top }],
    attribution,
    advice,
    followup,
    evidence,
    patientHint,
    generatedAt: nowIso(),
    disclaimer: makeDisclaimer(cfg.modelName),
  };
}

// 同时返回 3 种风格的输出（仅用于"对比学习"，不写入数据库）。
export function generateMockAnalysisCompare(input: AIAnalysisInput): { balanced: AIAnalysisOutput; conservative: AIAnalysisOutput; proactive: AIAnalysisOutput } {
  return {
    balanced: generateMockAnalysis(input, 'balanced'),
    conservative: generateMockAnalysis(input, 'conservative'),
    proactive: generateMockAnalysis(input, 'proactive'),
  };
}

// 兼容老版本的简单 AI 输出（供 seed 与老调用点）。
export type AIInputLegacy = {
  total: number;
  top: number;
  topName: string;
  stage: string;
  delta: number | null;
  taskAdherence?: number;
};
export type AIOutputLegacy = {
  summary: string;
  riskFactors: string[];
  nurseReview: string[];
  suggestedFollowup: string;
  patientHint: string;
  disclaimer: string;
  model: string;
};

export function generateLegacyAI(input: AIInputLegacy): AIOutputLegacy {
  const out = generateMockAnalysis({ ...input, topCode: input.topName }, defaultStyle(input));
  return {
    model: out.model,
    summary: out.summary,
    riskFactors: out.attribution.symptom,
    nurseReview: out.advice.map((a) => a.action),
    suggestedFollowup: out.followup[0]?.timing || '下次常规随访',
    patientHint: out.patientHint,
    disclaimer: out.disclaimer,
  };
}

// 列表与持久化。
export async function listPatientAnalyses(patientId: number, limit = 10) {
  const db = getDb();
  return await db.select().from(aiAnalyses).where(eq(aiAnalyses.patientId, patientId)).orderBy(desc(aiAnalyses.createdAt)).limit(limit);
}

export async function runAnalysisForLatest(patientId: number, nurseUserId: number, style: AIAnalysisStyle = 'balanced'): Promise<{ id: number; output: AIAnalysisOutput }> {
  const db = getDb();
  const latest = await db.select().from(assessments).where(and(eq(assessments.patientId, patientId), eq(assessments.status, '已提交'))).orderBy(desc(assessments.submittedAt)).limit(1);
  if (latest.length === 0) throw new Error('该患者暂无已提交评估');
  const a = latest[0];
  const input: AIAnalysisInput = {
    total: a.totalScore || 0,
    top: a.topSymptomScore || 0,
    topName: symptomLabel(a.topSymptomCode),
    topCode: a.topSymptomCode || '',
    stage: '',
    delta: a.deltaVsPrev,
  };
  const out = generateMockAnalysis(input, style);
  const inserted = await db.insert(aiAnalyses).values({
    patientId,
    assessmentId: a.id,
    model: out.model,
    style: out.style,
    inputJson: JSON.stringify(input),
    outputJson: JSON.stringify(out),
    evidenceJson: JSON.stringify(out.evidence),
    patientHint: out.patientHint,
    status: '已生成',
  }).returning({ id: aiAnalyses.id });
  return { id: inserted[0].id, output: out };
}

export async function adoptAIAnalysis(id: number, status: '已采纳' | '部分采纳' | '未采纳', note: string, actorUserId: number, actorRole: string): Promise<void> {
  const db = getDb();
  const rows = await db.select().from(aiAnalyses).where(eq(aiAnalyses.id, id)).limit(1);
  if (rows.length === 0) throw new Error('AI 分析不存在');
  if (rows[0].status !== '已生成') throw new Error('AI 分析已采纳，无需重复操作');
  await db.update(aiAnalyses).set({ status, nurseNote: note }).where(eq(aiAnalyses.id, id));
  await recordAudit({
    actorUserId,
    actorRole,
    action: `采纳 AI 演示分析（${rows[0].style}）`,
    targetType: 'AI',
    targetId: String(id),
    summary: status + (note ? '：' + note : ''),
  });
}

// 取患者最近一次评估在 3 种风格下的输出（不入库）。
export async function getLatestCompare(patientId: number): Promise<{
  assessmentId: number | null;
  input: AIAnalysisInput;
  outputs: { balanced: AIAnalysisOutput; conservative: AIAnalysisOutput; proactive: AIAnalysisOutput };
} | null> {
  const db = getDb();
  const latest = await db.select().from(assessments).where(and(eq(assessments.patientId, patientId), eq(assessments.status, '已提交'))).orderBy(desc(assessments.submittedAt)).limit(1);
  if (latest.length === 0) return null;
  const a = latest[0];
  const input: AIAnalysisInput = {
    total: a.totalScore || 0,
    top: a.topSymptomScore || 0,
    topName: symptomLabel(a.topSymptomCode),
    topCode: a.topSymptomCode || '',
    stage: '',
    delta: a.deltaVsPrev,
  };
  return { assessmentId: a.id, input, outputs: generateMockAnalysisCompare(input) };
}
