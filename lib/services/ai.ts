import { eq, desc, and } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { aiAnalyses, assessments, patients } from '../../db/schema';

export type AIInput = {
  total: number;
  top: number;
  topName: string;
  stage: string;
  delta: number | null;
  taskAdherence?: number;
};

export type AIOutput = {
  summary: string;
  riskFactors: string[];
  nurseReview: string[];
  suggestedFollowup: string;
  patientHint: string;
  disclaimer: string;
  model: string;
};

export function generateMockAI(input: AIInput): AIOutput {
  const level = input.total >= 50 || input.top >= 8 ? 'high' : (input.total >= 30 || input.top >= 5 ? 'medium' : 'low');
  return {
    model: 'mock-geriatric-lung-v1',
    summary: input.topName + ' ' + input.top + ' 分；总分 ' + input.total + '（演示评估）',
    riskFactors: level === 'low' ? ['症状整体平稳'] : [input.topName + ' 突出'].concat(input.delta !== null && input.delta > 10 ? ['较上次加重'] : []),
    nurseReview: level === 'high' ? ['建议 24 小时内复评', '通知家属'] : (level === 'medium' ? ['本周内复评', '观察睡眠与饮食'] : ['按常规随访即可']),
    suggestedFollowup: level === 'high' ? '24 小时内' : (level === 'medium' ? '一周内' : '下次常规随访'),
    patientHint: level === 'high' ? '请及时联系护士或就医' : (level === 'medium' ? '请关注症状变化，必要时联系护士' : '请保持当前生活习惯'),
    disclaimer: '本结果为本地确定性演示分析（mock-geriatric-lung-v1），不构成临床诊断，所有建议须经医护人员确认。',
  };
}

export async function listPatientAIAnalyses(patientId: number) {
  const db = getDb();
  return await db.select().from(aiAnalyses).where(eq(aiAnalyses.patientId, patientId)).orderBy(desc(aiAnalyses.createdAt)).limit(10);
}

export async function runAIForLatestAssessment(patientId: number, nurseUserId: number): Promise<{ id: number; output: AIOutput }> {
  const db = getDb();
  const latest = await db.select().from(assessments).where(and(eq(assessments.patientId, patientId), eq(assessments.status, '已提交'))).orderBy(desc(assessments.submittedAt)).limit(1);
  if (latest.length === 0) throw new Error('该患者暂无已提交评估');
  const a = latest[0];
  const input: AIInput = {
    total: a.totalScore || 0,
    top: a.topSymptomScore || 0,
    topName: a.topSymptomCode || '—',
    stage: '',
    delta: a.deltaVsPrev,
  };
  const out = generateMockAI(input);
  const inserted = await db.insert(aiAnalyses).values({
    patientId,
    assessmentId: a.id,
    model: out.model,
    inputJson: JSON.stringify(input),
    outputJson: JSON.stringify(out),
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
  const { recordAudit } = await import('../audit');
  await recordAudit({
    actorUserId,
    actorRole,
    action: '采纳 AI 演示分析',
    targetType: 'AI',
    targetId: String(id),
    summary: status + (note ? '：' + note : ''),
  });
}
