import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { requireRole } from '../../../../../../lib/guard';
import { getDb } from '../../../../../../db/client';
import { alerts, patients, assessments } from '../../../../../../db/schema';
import { generateAlertHandlingDraft } from '../../../../../../lib/services/ai/drafting';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const nurse = await requireRole('NURSE');
  const id = parseInt(ctx.params.id, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: '预警 ID 非法' }, { status: 400 });
  const db = getDb();
  const aRows = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);
  if (aRows.length === 0) return NextResponse.json({ ok: false, error: '预警不存在' }, { status: 404 });
  const alert = aRows[0];
  const pRows = await db.select().from(patients).where(eq(patients.id, alert.patientId)).limit(1);
  if (pRows.length === 0 || pRows[0].primaryNurseId !== nurse.id) return NextResponse.json({ ok: false, error: '您不是该患者的责任护士' }, { status: 403 });
  const recent = await db.select().from(assessments).where(eq(assessments.patientId, alert.patientId)).orderBy(desc(assessments.submittedAt)).limit(3);
  const draft = generateAlertHandlingDraft(
    { id: alert.id, level: alert.level as 'low' | 'medium' | 'high', source: alert.source, ruleSnapshot: alert.ruleSnapshot, summary: alert.summary },
    recent.map((r) => ({ totalScore: r.totalScore, topSymptomCode: r.topSymptomCode, topSymptomScore: r.topSymptomScore, riskLevel: r.riskLevel, submittedAt: r.submittedAt })),
  );
  return NextResponse.json({ ok: true, data: { draft } });
}
