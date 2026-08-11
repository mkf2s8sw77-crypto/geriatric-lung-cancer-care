import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '../../../../../lib/guard';
import { adoptAIAnalysis } from '../../../../../lib/services/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  status: z.enum(['已采纳', '部分采纳', '未采纳']),
  note: z.string().max(500).optional().default(''),
});

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const nurse = await requireRole('NURSE');
  const id = parseInt(ctx.params.id, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: 'AI 分析 ID 非法' }, { status: 400 });
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok: false, error: '请求体非法' }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || '请检查表单' }, { status: 400 });
  try {
    await adoptAIAnalysis(id, parsed.data.status, parsed.data.note || '', nurse.id, nurse.role);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : '操作失败' }, { status: 400 });
  }
}
