import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '../../../../../lib/guard';
import { findPatientByUserId } from '../../../../../lib/services/assessment';
import { markPushRead } from '../../../../../lib/services/ai/butler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ pushId: z.number().int().positive() });

export async function POST(req: NextRequest) {
  const user = await requireRole('PATIENT');
  const patient = await findPatientByUserId(user.id);
  if (!patient) return NextResponse.json({ ok: false, error: '账号未关联患者档案' }, { status: 404 });
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok: false, error: '请求体非法' }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || '推送 ID 必填' }, { status: 400 });
  try {
    await markPushRead(parsed.data.pushId, patient.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : '标记失败' }, { status: 400 });
  }
}
