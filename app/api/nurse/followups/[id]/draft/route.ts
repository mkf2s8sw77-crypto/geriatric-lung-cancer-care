import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { requireRole } from '../../../../../../lib/guard';
import { getDb } from '../../../../../../db/client';
import { followups, patients, assessments, symptomReports } from '../../../../../../db/schema';
import { generateFollowupSummaryDraft } from '../../../../../../lib/services/ai/drafting';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const nurse = await requireRole('NURSE');
  const id = parseInt(ctx.params.id, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: '随访 ID 非法' }, { status: 400 });
  const db = getDb();
  const fRows = await db.select().from(followups).where(eq(followups.id, id)).limit(1);
  if (fRows.length === 0) return NextResponse.json({ ok: false, error: '随访不存在' }, { status: 404 });
  const f = fRows[0];
  const pRows = await db.select().from(patients).where(eq(patients.id, f.patientId)).limit(1);
  if (pRows.length === 0 || pRows[0].primaryNurseId !== nurse.id) return NextResponse.json({ ok: false, error: '您不是该患者的责任护士' }, { status: 403 });
  const recent = await db.select().from(assessments).where(eq(assessments.patientId, f.patientId)).orderBy(desc(assessments.submittedAt)).limit(3);
  const sr = await db.select().from(symptomReports).where(eq(symptomReports.patientId, f.patientId)).orderBy(desc(symptomReports.createdAt)).limit(5);
  const draft = generateFollowupSummaryDraft({
    patientName: pRows[0].fullName,
    treatmentStage: pRows[0].treatmentStage,
    recentAssessments: recent.map((r) => ({ totalScore: r.totalScore, topSymptomCode: r.topSymptomCode, topSymptomScore: r.topSymptomScore, riskLevel: r.riskLevel, submittedAt: r.submittedAt })),
    recentSymptomCodes: sr.map((x) => x.symptomCode),
  });
  return NextResponse.json({ ok: true, data: { draft } });
}
