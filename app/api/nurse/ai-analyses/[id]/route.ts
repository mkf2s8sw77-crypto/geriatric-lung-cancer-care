import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireRole } from '../../../../../lib/guard';
import { adoptAIAnalysis } from '../../../../../lib/services/ai/analysis';
import { getDb } from '../../../../../db/client';
import { aiAnalyses, patients } from '../../../../../db/schema';

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
  // 验证权限：护士必须是该 AI 分析所属患者的责任护士
  const db = getDb();
  const aRows = await db.select().from(aiAnalyses).where(eq(aiAnalyses.id, id)).limit(1);
  if (aRows.length === 0) return NextResponse.json({ ok: false, error: 'AI 分析不存在' }, { status: 404 });
  const pRows = await db.select().from(patients).where(eq(patients.id, aRows[0].patientId)).limit(1);
  if (pRows.length === 0 || pRows[0].primaryNurseId !== nurse.id) return NextResponse.json({ ok: false, error: '您不是该患者的责任护士' }, { status: 403 });
  try {
    await adoptAIAnalysis(id, parsed.data.status, parsed.data.note || '', nurse.id, nurse.role);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : '操作失败' }, { status: 400 });
  }
}
