import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { requireRole } from '../../../../../../lib/guard';
import { getDb } from '../../../../../../db/client';
import { patientEducationReads } from '../../../../../../db/schema';
import { findPatientByUserId } from '../../../../../../lib/services/assessment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const user = await requireRole('PATIENT');
  const patient = await findPatientByUserId(user.id);
  if (!patient) return NextResponse.json({ ok: false, error: '账号未关联患者档案' }, { status: 403 });
  const resourceId = parseInt(ctx.params.id, 10);
  if (!Number.isFinite(resourceId)) return NextResponse.json({ ok: false, error: '资源 ID 非法' }, { status: 400 });
  const db = getDb();
  const existing = await db.select().from(patientEducationReads).where(and(eq(patientEducationReads.patientId, patient.id), eq(patientEducationReads.resourceId, resourceId))).limit(1);
  if (existing.length > 0) {
    await db.update(patientEducationReads).set({ confirmed: true, readAt: new Date().toISOString() }).where(eq(patientEducationReads.id, existing[0].id));
  } else {
    await db.insert(patientEducationReads).values({ patientId: patient.id, resourceId, confirmed: true });
  }
  return NextResponse.json({ ok: true });
}
