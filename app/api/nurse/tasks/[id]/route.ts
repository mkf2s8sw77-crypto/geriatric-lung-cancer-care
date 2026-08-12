import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '../../../../../lib/guard';
import { adjustTaskByNurse, cancelTask } from '../../../../../lib/services/task';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../../../db/client';
import { patients } from '../../../../../db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUSES = ['待完成', '已完成', '未完成', '暂不适用', '已取消'] as const;
const adjustSchema = z.object({
  action: z.enum(['调整', '取消']),
  reason: z.string().trim().min(5, '请填写调整原因（不少于 5 字）').max(500),
  scheduledDate: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}/).optional(),
  title: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(STATUSES).optional(),
});

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const nurse = await requireRole('NURSE');
  const id = parseInt(ctx.params.id, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: '任务 ID 非法' }, { status: 400 });
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok: false, error: '请求体非法' }, { status: 400 }); }
  const parsed = adjustSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || '请检查表单' }, { status: 400 });
  // 验证权限：护士必须是该患者的责任护士
  const db = getDb();
  const { tasks } = await import('../../../../../db/schema');
  const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (rows.length === 0) return NextResponse.json({ ok: false, error: '任务不存在' }, { status: 404 });
  const pRows = await db.select().from(patients).where(eq(patients.id, rows[0].patientId)).limit(1);
  if (pRows.length === 0 || pRows[0].primaryNurseId !== nurse.id) return NextResponse.json({ ok: false, error: '您不是该患者的责任护士' }, { status: 403 });
  try {
    if (parsed.data.action === '取消') {
      await cancelTask(id, nurse.id, parsed.data.reason);
    } else {
      const fields: { scheduledDate?: string; title?: string; description?: string; status?: string } = {};
      if (parsed.data.scheduledDate) fields.scheduledDate = parsed.data.scheduledDate;
      if (parsed.data.title) fields.title = parsed.data.title;
      if (parsed.data.description !== undefined) fields.description = parsed.data.description;
      if (parsed.data.status) fields.status = parsed.data.status;
      await adjustTaskByNurse(id, nurse.id, fields, parsed.data.reason);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : '操作失败' }, { status: 400 });
  }
}
