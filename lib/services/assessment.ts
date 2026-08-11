import { eq, desc, and } from 'drizzle-orm';
import { getDb } from '../../db/client';
import {
  scales, scaleItems, assessments, assessmentAnswers, alerts, patients,
} from '../../db/schema';
import { computeScore, classifyRisk, DEFAULT_RISK_RULES, classifySymptomReportRisk } from '../scoring';

const SYMPTOM_NAME_MAP: Record<string, string> = {
  fatigue: '疲乏无力', pain: '疼痛', dyspnea: '气短/呼吸困难', cough: '咳嗽', sleep: '睡眠紊乱',
  appetite: '食欲下降', mood: '情绪低落', nausea: '恶心呕吐', weight: '体重变化', daily: '日常活动受限',
};

export type AssessmentDraft = {
  id: number;
  patientId: number;
  scaleId: number;
  scaleName: string;
  status: '草稿' | '已提交';
  source: string;
  filledByUserId: number;
  items: Array<{ id: number; code: string; prompt: string; minScore: number; maxScore: number; name: string; score: number | null }>;
};

export async function getActivePublishedScale() {
  const db = getDb();
  const scaleRows = await db.select().from(scales).where(and(eq(scales.status, '已发布'))).limit(1);
  if (scaleRows.length === 0) return null;
  const scale = scaleRows[0];
  const items = await db.select().from(scaleItems).where(eq(scaleItems.scaleId, scale.id));
  return {
    id: scale.id,
    name: scale.name,
    items: items.map((it) => ({ id: it.id, code: it.code, prompt: it.prompt, minScore: it.minScore, maxScore: it.maxScore, ordinal: it.ordinal, name: SYMPTOM_NAME_MAP[it.code] || it.code })),
  };
}

export async function findPatientByUserId(userId: number) {
  const db = getDb();
  const rows = await db.select().from(patients).where(eq(patients.userId, userId)).limit(1);
  if (rows.length === 0) return null;
  const p = rows[0];
  return { id: p.id, fullName: p.fullName, researchNo: p.researchNo, status: p.status, treatmentStage: p.treatmentStage, primaryNurseId: p.primaryNurseId };
}

export async function getOrCreateDraftAssessment(patientId: number, filledByUserId: number) {
  const db = getDb();
  const scale = await getActivePublishedScale();
  if (!scale) throw new Error('尚未配置已发布的演示量表');
  const drafts = await db.select().from(assessments).where(and(eq(assessments.patientId, patientId), eq(assessments.status, '草稿'))).limit(1);
  if (drafts.length > 0) return { id: drafts[0].id, scaleId: drafts[0].scaleId };
  const inserted = await db.insert(assessments).values({ patientId, scaleId: scale.id, filledByUserId, source: '患者', status: '草稿' }).returning({ id: assessments.id });
  return { id: inserted[0].id, scaleId: scale.id };
}

export async function saveDraftAnswers(assessmentId: number, items: Array<{ scaleItemId: number; score: number }>) {
  const db = getDb();
  for (const it of items) {
    const existing = await db.select().from(assessmentAnswers).where(and(eq(assessmentAnswers.assessmentId, assessmentId), eq(assessmentAnswers.scaleItemId, it.scaleItemId))).limit(1);
    if (existing.length > 0) {
      await db.update(assessmentAnswers).set({ score: it.score }).where(eq(assessmentAnswers.id, existing[0].id));
    } else {
      await db.insert(assessmentAnswers).values({ assessmentId, scaleItemId: it.scaleItemId, score: it.score });
    }
  }
  await db.update(assessments).set({ updatedAt: new Date().toISOString() }).where(eq(assessments.id, assessmentId));
}

export async function getAssessmentDraft(assessmentId: number, patientId: number): Promise<AssessmentDraft | null> {
  const db = getDb();
  const rows = await db.select().from(assessments).where(and(eq(assessments.id, assessmentId), eq(assessments.patientId, patientId))).limit(1);
  if (rows.length === 0) return null;
  const a = rows[0];
  const scaleRow = await db.select().from(scales).where(eq(scales.id, a.scaleId)).limit(1);
  const items = await db.select().from(scaleItems).where(eq(scaleItems.scaleId, a.scaleId));
  const answers = await db.select().from(assessmentAnswers).where(eq(assessmentAnswers.assessmentId, assessmentId));
  const scoreMap = new Map(answers.map((x) => [x.scaleItemId, x.score]));
  return {
    id: a.id,
    patientId: a.patientId,
    scaleId: a.scaleId,
    scaleName: scaleRow[0]?.name || '',
    status: a.status as '草稿' | '已提交',
    source: a.source,
    filledByUserId: a.filledByUserId,
    items: items.map((it) => ({ id: it.id, code: it.code, prompt: it.prompt, minScore: it.minScore, maxScore: it.maxScore, name: SYMPTOM_NAME_MAP[it.code] || it.code, score: scoreMap.get(it.id) ?? null })),
  };
}

export async function submitAssessment(assessmentId: number, patientId: number) {
  const db = getDb();
  const draft = await getAssessmentDraft(assessmentId, patientId);
  if (!draft) throw new Error('评估不存在或不属于当前患者');
  if (draft.status === '已提交') throw new Error('评估已提交，不能重复提交');
  const unanswered = draft.items.filter((it) => it.score === null);
  if (unanswered.length > 0) throw new Error('仍有未完成的题目');
  const inputs = draft.items.map((it) => ({ itemCode: it.code, itemName: it.name, score: it.score as number, weight: 1.0 }));
  const sc = computeScore(inputs);
  const prevRows = await db.select().from(assessments).where(and(eq(assessments.patientId, patientId), eq(assessments.status, '已提交'))).orderBy(desc(assessments.submittedAt)).limit(2);
  const prevSubmitted = prevRows.find((r) => r.id !== assessmentId);
  const delta = prevSubmitted && prevSubmitted.totalScore !== null ? Number((sc.totalScore - (prevSubmitted.totalScore as number)).toFixed(2)) : null;
  const risk = classifyRisk({ totalScore: sc.totalScore, topSymptomScore: sc.topSymptomScore, deltaVsPrev: delta }, DEFAULT_RISK_RULES);

  await db.update(assessments).set({
    status: '已提交',
    totalScore: sc.totalScore,
    topSymptomCode: sc.topSymptomCode,
    topSymptomScore: sc.topSymptomScore,
    deltaVsPrev: delta,
    riskLevel: risk.level,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).where(eq(assessments.id, assessmentId));

  let alertCreated = false;
  if (risk.level !== 'low') {
    await db.insert(alerts).values({
      patientId,
      source: '评估',
      sourceId: assessmentId,
      level: risk.level,
      ruleVersion: 'demo-risk-v1@1',
      ruleSnapshot: JSON.stringify(risk.reasons),
      status: '未处理',
      summary: risk.reasons.join('；'),
    });
    alertCreated = true;
  }
  return {
    totalScore: sc.totalScore,
    riskLevel: risk.level,
    topSymptom: { code: sc.topSymptomCode || '', name: sc.topSymptomName || '', score: sc.topSymptomScore },
    deltaVsPrev: delta,
    alertCreated,
  };
}

export { classifySymptomReportRisk };
