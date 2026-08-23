import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '../../../../../lib/guard';
import { askAgent } from '../../../../../lib/services/ai/agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ question: z.string().min(2).max(500) });

export async function POST(req: NextRequest) {
  const nurse = await requireRole('NURSE');
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok: false, error: '请求体非法' }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || '问题非法' }, { status: 400 });
  try {
    const { id, answer } = await askAgent(parsed.data.question.trim(), nurse.id);
    return NextResponse.json({ ok: true, data: { id, answer } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : '问答失败' }, { status: 500 });
  }
}
