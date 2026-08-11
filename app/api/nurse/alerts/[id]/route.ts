import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '../../../../../lib/guard';
import { handleAlert, handleSchema } from '../../../../../lib/services/alert';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const nurse = await requireRole('NURSE');
  const id = parseInt(ctx.params.id, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: '预警 ID 非法' }, { status: 400 });
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok: false, error: '请求体非法' }, { status: 400 }); }
  const parsed = handleSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || '请检查表单' }, { status: 400 });
  try {
    await handleAlert(id, nurse.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : '提交失败' }, { status: 400 });
  }
}
