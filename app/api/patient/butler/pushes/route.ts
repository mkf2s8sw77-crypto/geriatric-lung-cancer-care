import { NextResponse } from 'next/server';
import { requireRole } from '../../../../../lib/guard';
import { findPatientByUserId } from '../../../../../lib/services/assessment';
import { generateButlerPushesForPatient, listButlerPushes } from '../../../../../lib/services/ai/butler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/patient/butler/pushes — 返回推送列表，并触发运行时按需生成。
export async function GET() {
  const user = await requireRole('PATIENT');
  const patient = await findPatientByUserId(user.id);
  if (!patient) return NextResponse.json({ ok: false, error: '账号未关联患者档案' }, { status: 404 });
  await generateButlerPushesForPatient(patient.id);
  const list = await listButlerPushes(patient.id, 5);
  return NextResponse.json({ ok: true, data: list });
}
