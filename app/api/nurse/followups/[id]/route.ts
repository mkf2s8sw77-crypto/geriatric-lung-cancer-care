import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireRole } from '../../../../../lib/guard';
import { getDb } from '../../../../../db/client';
import { followups } from '../../../../../db/schema';
import { recordAudit } from '../../../../../lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  action: z.enum(['完成']),
  summary: z.string().min(3).max(500),
  nextFollowupAt: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}/).optional().nullable(),
  patientId: z.number().int(),
  nurseId: z.number().int(),
});

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const nurse = await requireRole('NURSE');
  const id = parseInt(ctx.params.id, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: '随访 ID 非法' }, { status: 400 });
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok: false, error: '请求体非法' }, { status: 400 }); }
  raw = { ...(raw as Record<string, unknown>), nurseId: nurse.id };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || '请检查表单' }, { status: 400 });
  const db = getDb();
  const rows = await db.select().from(followups).where(eq(followups.id, id)).limit(1);
  if (rows.length === 0) return NextResponse.json({ ok: false, error: '随访不存在' }, { status: 404 });
  const f = rows[0];
  if (f.nurseId !== nurse.id) return NextResponse.json({ ok: false, error: '您不是该随访的责任护士' }, { status: 403 });
  await db.update(followups).set({
    status: '已完成',
    summary: parsed.data.summary,
    nextFollowupAt: parsed.data.nextFollowupAt || null,
  }).where(eq(followups.id, id));
  await recordAudit({ actorUserId: nurse.id, actorRole: nurse.role, action: '完成随访', targetType: '随访', targetId: String(id), summary: parsed.data.summary });
  return NextResponse.json({ ok: true });
}
