import Link from 'next/link';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { requireRole } from '../../../../lib/guard';
import { getDb } from '../../../../db/client';
import { educationResources, patientEducationReads } from '../../../../db/schema';
import { findPatientByUserId } from '../../../../lib/services/assessment';
import EducationReader from '../../../../components/EducationReader';

export const dynamic = 'force-dynamic';

export default async function EducationDetail({ params }: { params: { id: string } }) {
  const user = await requireRole('PATIENT');
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) notFound();
  const patient = await findPatientByUserId(user.id);
  if (!patient) return <div className="p-4">账号未关联患者档案。</div>;
  const db = getDb();
  const rows = await db.select().from(educationResources).where(eq(educationResources.id, id)).limit(1);
  const r = rows[0];
  if (!r) notFound();
  const reads = await db.select().from(patientEducationReads).where(and(eq(patientEducationReads.patientId, patient.id), eq(patientEducationReads.resourceId, id))).limit(1);
  const read = reads[0];
  return (
    <div className="space-y-4">
      <Link href="/patient/education" className="text-sm text-brand-700 underline">返回列表</Link>
      <h1 className="text-lg font-semibold text-brand-700">{r.title}</h1>
      <p className="text-xs text-slate-500">{r.category} · {r.applicableStage} · 约 {r.readMinutes} 分钟</p>
      <EducationReader resourceId={r.id} patientId={patient.id} body={r.body} confirmed={!!read?.confirmed} />
    </div>
  );
}
