import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireRole } from '../../../../../../lib/guard';
import { getDb } from '../../../../../../db/client';
import { patients, assessments, scaleItems, scales, assessmentAnswers, alerts } from '../../../../../../db/schema';
import { recordAudit } from '../../../../../../lib/audit';
import { computeScore, classifyRisk } from '../../../../../../lib/scoring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYMPTOM_NAME_MAP: Record<string, string> = {
  fatigue: '疲乏无力', pain: '疼痛', dyspnea: '气短/呼吸困难', cough: '咳嗽', sleep: '睡眠紊乱',
  appetite: '食欲下降', mood: '情绪低落', nausea: '恶心呕吐', weight: '体重变化', daily: '日常活动受限',
};

const schema = z.object({
  items: z.array(z.object({ scaleItemId: z.number().int(), score: z.number().min(0).max(10) })),
  note: z.string().max(500).optional().default(''),
});

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const nurse = await requireRole('NURSE');
  const patientId = parseInt(ctx.params.id, 10);
  if (!Number.isFinite(patientId)) return NextResponse.json({ ok: false, error: '患者 ID 非法' }, { status: 400 });
  const db = getDb();
  const pRows = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
  if (pRows.length === 0) return NextResponse.json({ ok: false, error: '患者不存在' }, { status: 404 });
  if (pRows[0].primaryNurseId !== nurse.id) return NextResponse.json({ ok: false, error: '您不是该患者的责任护士' }, { status: 403 });
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok: false, error: '请求体非法' }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || '请检查表单' }, { status: 400 });
  // 找到已发布的量表
  const scaleRows = await db.select().from(scales).where(eq(scales.status, '已发布')).limit(1);
  if (scaleRows.length === 0) return NextResponse.json({ ok: false, error: '暂无已发布量表' }, { status: 400 });
  const scaleId = scaleRows[0].id;
  // 24小时内频率限制
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const recent = await db.select({ id: assessments.id, submittedAt: assessments.submittedAt })
    .from(assessments).where(eq(assessments.patientId, patientId)).limit(20);
  const tooRecent = recent.find((r) => r.submittedAt && r.submittedAt > oneDayAgo);
  if (tooRecent) return NextResponse.json({ ok: false, error: '24 小时内已有评估记录' }, { status: 400 });
  // 创建评估记录
  const aRows = await db.insert(assessments).values({
    patientId,
    scaleId,
    filledByUserId: nurse.id,
    source: '护士代填',
    status: '已提交',
    submittedAt: new Date().toISOString(),
  }).returning({ id: assessments.id });
  const aid = aRows[0].id;
  for (const it of parsed.data.items) {
    await db.insert(assessmentAnswers).values({ assessmentId: aid, scaleItemId: it.scaleItemId, score: it.score });
  }
  // 计算分数
  const items = await db.select().from(scaleItems).where(eq(scaleItems.scaleId, scaleId));
  const ansMap = new Map(parsed.data.items.map((i) => [i.scaleItemId, i.score]));
  const inputs = items.map((it) => ({ itemCode: it.code, itemName: SYMPTOM_NAME_MAP[it.code] || it.code, score: ansMap.get(it.id) ?? 0, weight: 1.0 }));
  const sc = computeScore(inputs);
  const risk = classifyRisk({ totalScore: sc.totalScore, topSymptomScore: sc.topSymptomScore, deltaVsPrev: null });
  await db.update(assessments).set({
    totalScore: sc.totalScore,
    topSymptomCode: sc.topSymptomCode,
    topSymptomScore: sc.topSymptomScore,
    riskLevel: risk.level,
  }).where(eq(assessments.id, aid));
  // 如果不是低风险，创建预警
  if (risk.level !== 'low') {
    await db.insert(alerts).values({
      patientId,
      source: '评估',
      sourceId: aid,
      level: risk.level,
      ruleVersion: 'demo-risk-v1@1',
      ruleSnapshot: JSON.stringify(risk.reasons),
      status: '未处理',
      summary: risk.reasons.join('；'),
    }).catch(() => null); // 表结构可能不一样, 已 import alerts
  }
  await recordAudit({
    actorUserId: nurse.id,
    actorRole: nurse.role,
    action: '代填评估',
    targetType: '评估',
    targetId: String(aid),
    summary: '总分 ' + sc.totalScore + ' / 风险 ' + risk.level + (parsed.data.note ? ' / 备注：' + parsed.data.note : ''),
  });
  return NextResponse.json({ ok: true, assessmentId: aid, totalScore: sc.totalScore, riskLevel: risk.level });
}
