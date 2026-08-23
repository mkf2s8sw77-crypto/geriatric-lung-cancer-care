// Phase 5 · AI 草稿（mock-drafting-v1）
// 预警处置草稿 + 随访摘要草稿的 mock 模板拼接；演示边界，护士必须编辑后采纳。

import type { AIAnalysisOutput } from './analysis';

export const DRAFTING_MODEL = 'mock-drafting-v1';
export const DRAFTING_DISCLAIMER = '本草稿由 mock 智能体生成，须由责任护士确认后执行。';

export type AlertSnapshot = {
  id: number;
  level: 'low' | 'medium' | 'high';
  source: string;
  ruleSnapshot: string;
  summary: string;
};

export type AssessmentLite = {
  totalScore: number | null;
  topSymptomCode: string | null;
  topSymptomScore: number | null;
  riskLevel: string | null;
  submittedAt: string | null;
};

export function generateAlertHandlingDraft(alert: AlertSnapshot, latestAssessments: AssessmentLite[] = []): string {
  const recent = latestAssessments.slice(0, 3);
  const trendLine = recent.length === 0 ? '近 30 天暂无已提交评估' : `近 ${recent.length} 次评估总分：${recent.map((a) => (a.totalScore ?? 0).toFixed(1)).join(' / ')}`;
  const levelMap: Record<string, string> = { low: '低', medium: '中', high: '高' };
  const levelText = levelMap[alert.level] || alert.level;
  return [
    `【AI 处置草稿 · ${DRAFTING_MODEL}】`,
    `触发条件：${alert.ruleSnapshot || alert.summary || '（无快照）'}`,
    `风险等级：${levelText} · 来源：${alert.source}`,
    trendLine,
    '',
    '建议处置（须由责任护士确认后执行）：',
    '1. 24 小时内联系患者，评估症状与情绪状态。',
    '2. 核实近期用药与检查结果，必要时与主管医生沟通。',
    '3. 根据情况安排电话随访 / 门诊复查 / 上门随访。',
    '4. 在护理记录中登记本次处置过程与结果。',
    '',
    `免责声明：${DRAFTING_DISCLAIMER}`,
  ].join('\n');
}

export function generateFollowupSummaryDraft(opts: {
  patientName: string;
  treatmentStage: string;
  recentAssessments: AssessmentLite[];
  recentSymptomCodes: string[];
  recentTaskAdherence?: number;
}): string {
  const { patientName, treatmentStage, recentAssessments, recentSymptomCodes } = opts;
  const total = recentAssessments.length;
  const avg = total > 0 ? recentAssessments.reduce((s, a) => s + (a.totalScore || 0), 0) / total : 0;
  const risk = recentAssessments.find((a) => a.riskLevel === 'high') ? '出现过高风险评估' : recentAssessments.find((a) => a.riskLevel === 'medium') ? '近期中风险评估' : '近期整体低风险';
  const sympLine = recentSymptomCodes.length > 0 ? `常见症状：${[...new Set(recentSymptomCodes)].slice(0, 4).join('、')}` : '近 30 天无主动症状报告';
  return [
    `【AI 随访摘要草稿 · ${DRAFTING_MODEL}】`,
    `患者：${patientName} · 治疗阶段：${treatmentStage}`,
    `近 30 天评估 ${total} 次，平均分 ${avg.toFixed(1)}；${risk}。`,
    sympLine + '。',
    '',
    '建议随访要点：',
    '1. 确认当前症状与既往基线对比，关注主要症状变化。',
    '2. 评估治疗依从性（用药 / 康复训练 / 宣教阅读）。',
    '3. 评估心理与家庭支持情况，必要时转介心理科。',
    '4. 与患者共同制定下阶段自我管理目标。',
    '',
    `免责声明：${DRAFTING_DISCLAIMER}`,
  ].join('\n');
}
