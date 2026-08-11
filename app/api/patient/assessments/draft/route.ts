import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '../../../../../lib/guard';
import { findPatientByUserId, getOrCreateDraftAssessment, getAssessmentDraft, saveDraftAnswers } from '../../../../../lib/services/assessment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const draftBody = z.object({
  items: z.array(z.object({ scaleItemId: z.number().int(), score: z.number().min(0).max(10) })).optional(),
  create: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireRole('PATIENT');
  const patient = await findPatientByUserId(user.id);
  if (!patient) return NextResponse.json({ ok: false, error: '当前账号未关联患者档案' }, { status: 403 });
  let body: unknown = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const parsed = draftBody.safeParse(body || {});
  if (!parsed.success) return NextResponse.json({ ok: false, error: '请求体非法' }, { status: 400 });
  const { items, create } = parsed.data;
  const draft = await getOrCreateDraftAssessment(patient.id, user.id);
  if (!create && items && items.length > 0) {
    await saveDraftAnswers(draft.id, items);
  }
  const detail = await getAssessmentDraft(draft.id, patient.id);
  return NextResponse.json({ ok: true, draft: detail, assessmentId: draft.id });
}

export async function GET() {
  const user = await requireRole('PATIENT');
  const patient = await findPatientByUserId(user.id);
  if (!patient) return NextResponse.json({ ok: false, error: '当前账号未关联患者档案' }, { status: 403 });
  const draft = await getOrCreateDraftAssessment(patient.id, user.id);
  const detail = await getAssessmentDraft(draft.id, patient.id);
  return NextResponse.json({ ok: true, draft: detail, assessmentId: draft.id });
}
