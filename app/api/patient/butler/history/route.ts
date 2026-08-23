import { NextResponse } from 'next/server';
import { requireRole } from '../../../../../lib/guard';
import { findPatientByUserId } from '../../../../../lib/services/assessment';
import { listButlerHistory } from '../../../../../lib/services/ai/butler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await requireRole('PATIENT');
  const patient = await findPatientByUserId(user.id);
  if (!patient) return NextResponse.json({ ok: false, error: '账号未关联患者档案' }, { status: 404 });
  const list = await listButlerHistory(patient.id, 30);
  return NextResponse.json({ ok: true, data: list });
}
