import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '../../../../../lib/guard';
import { findPatientByUserId, getOrCreateDraftAssessment, saveDraftAnswers, submitAssessment } from '../../../../../lib/services/assessment';
import { recordAudit } from '../../../../../lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const body = z.object({
  items: z.array(z.object({ scaleItemId: z.number().int(), score: z.number().min(0).max(10) })),
});

export async function POST(req: NextRequest) {
  const user = await requireRole('PATIENT');
  const patient = await findPatientByUserId(user.id);
  if (!patient) return NextResponse.json({ ok: false, error: '当前账号未关联患者档案' }, { status: 403 });
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok: false, error: '请求体非法' }, { status: 400 }); }
  const parsed = body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: '请为每道题选择一个分数' }, { status: 400 });
  const draft = await getOrCreateDraftAssessment(patient.id, user.id);
  await saveDraftAnswers(draft.id, parsed.data.items);
  try {
    const result = await submitAssessment(draft.id, patient.id);
    await recordAudit({ actorUserId: user.id, actorRole: user.role, action: '提交评估', targetType: '评估', targetId: String(draft.id), summary: '总分 ' + result.totalScore + ' / 风险 ' + result.riskLevel });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '提交失败';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
