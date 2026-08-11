import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '../../../../../lib/guard';
import { updatePatientTaskFeedback } from '../../../../../lib/services/task';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  status: z.enum(['已完成', '未完成', '暂不适用']),
  note: z.string().max(500).optional().default(''),
  patientId: z.number().int(),
  actorUserId: z.number().int(),
});

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const user = await requireRole('PATIENT');
  const id = parseInt(ctx.params.id, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: '任务 ID 非法' }, { status: 400 });
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok: false, error: '请求体非法' }, { status: 400 }); }
  raw = { ...(raw as Record<string, unknown>), patientId: user.id, actorUserId: user.id };
  // 注意：patientId 在 service 中是 patient.id（不是 user.id）
  const { findPatientByUserId } = await import('../../../../../lib/services/assessment');
  const patient = await findPatientByUserId(user.id);
  if (!patient) return NextResponse.json({ ok: false, error: '账号未关联患者档案' }, { status: 403 });
  (raw as Record<string, unknown>).patientId = patient.id;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || '请检查表单' }, { status: 400 });
  try {
    await updatePatientTaskFeedback(id, patient.id, parsed.data.status, parsed.data.note || '', user.id, user.role);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : '更新失败' }, { status: 400 });
  }
}
