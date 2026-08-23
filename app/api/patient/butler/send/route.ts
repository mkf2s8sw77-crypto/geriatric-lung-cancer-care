import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '../../../../../lib/guard';
import { findPatientByUserId } from '../../../../../lib/services/assessment';
import { sendButlerMessage } from '../../../../../lib/services/ai/butler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ text: z.string().min(1).max(500) });

export async function POST(req: NextRequest) {
  const user = await requireRole('PATIENT');
  const patient = await findPatientByUserId(user.id);
  if (!patient) return NextResponse.json({ ok: false, error: '账号未关联患者档案' }, { status: 404 });
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok: false, error: '请求体非法' }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || '请输入内容' }, { status: 400 });
  try {
    const { id, reply } = await sendButlerMessage(patient.id, parsed.data.text);
    return NextResponse.json({ ok: true, data: { id, reply } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : '发送失败' }, { status: 500 });
  }
}
