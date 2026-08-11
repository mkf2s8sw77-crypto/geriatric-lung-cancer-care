import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '../../../../../../lib/guard';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../../../../db/client';
import { patients } from '../../../../../../db/schema';
import { createAdjustedTask } from '../../../../../../lib/services/task';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  taskType: z.string().min(1).max(20),
  title: z.string().min(1).max(80),
  description: z.string().max(500).optional().default(''),
  scheduledDate: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}/),
  reason: z.string().trim().min(5).max(500),
  nurseId: z.number().int(),
});

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const nurse = await requireRole('NURSE');
  const patientId = parseInt(ctx.params.id, 10);
  if (!Number.isFinite(patientId)) return NextResponse.json({ ok: false, error: '患者 ID 非法' }, { status: 400 });
  const db = getDb();
  const pRows = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
  if (pRows.length === 0) return NextResponse.json({ ok: false, error: '患者不存在' }, { status: 404 });
  if (pRows[0].primaryNurseId !== nurse.id) return NextResponse.json({ ok: false, error: '您不是该患者的责任护士' }, { status: 403 });
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok: false, error: '请求体非法' }, { status: 400 }); }
  raw = { ...(raw as Record<string, unknown>), nurseId: nurse.id };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || '请检查表单' }, { status: 400 });
  try {
    const id = await createAdjustedTask(patientId, nurse.id, { taskType: parsed.data.taskType, title: parsed.data.title, description: parsed.data.description, scheduledDate: parsed.data.scheduledDate }, parsed.data.reason);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : '创建失败' }, { status: 400 });
  }
}
