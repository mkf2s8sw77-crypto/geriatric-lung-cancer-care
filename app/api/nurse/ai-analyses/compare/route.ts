import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireRole } from '../../../../../lib/guard';
import { getDb } from '../../../../../db/client';
import { patients } from '../../../../../db/schema';
import { getLatestCompare } from '../../../../../lib/services/ai/analysis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/nurse/ai-analyses/compare?patientId=N
// 返回该患者最近一次评估在 3 种风格下的输出（不入库）。
export async function GET(req: NextRequest) {
  const nurse = await requireRole('NURSE');
  const url = new URL(req.url);
  const patientIdStr = url.searchParams.get('patientId');
  const patientId = parseInt(patientIdStr || '', 10);
  if (!Number.isFinite(patientId)) return NextResponse.json({ ok: false, error: 'patientId 必填' }, { status: 400 });
  const db = getDb();
  const pRows = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
  if (pRows.length === 0) return NextResponse.json({ ok: false, error: '患者不存在' }, { status: 404 });
  if (pRows[0].primaryNurseId !== nurse.id) return NextResponse.json({ ok: false, error: '您不是该患者的责任护士' }, { status: 403 });
  const cmp = await getLatestCompare(patientId);
  if (!cmp) return NextResponse.json({ ok: false, error: '该患者暂无已提交评估' }, { status: 404 });
  return NextResponse.json({ ok: true, data: cmp });
}
