import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '../../../../lib/guard';
import { findPatientByUserId } from '../../../../lib/services/assessment';
import { createSymptomReport, symptomReportSchema } from '../../../../lib/services/symptom';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = await requireRole('PATIENT');
  const patient = await findPatientByUserId(user.id);
  if (!patient) return NextResponse.json({ ok: false, error: '当前账号未关联患者档案' }, { status: 403 });
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok: false, error: '请求体非法' }, { status: 400 }); }
  // 强制使用当前患者身份
  raw = { ...(raw as Record<string, unknown>), patientId: patient.id, actorUserId: user.id };
  const parsed = symptomReportSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || '请检查表单' }, { status: 400 });
  }
  try {
    const r = await createSymptomReport({ ...parsed.data, patientId: patient.id, actorUserId: user.id });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : '提交失败' }, { status: 400 });
  }
}
