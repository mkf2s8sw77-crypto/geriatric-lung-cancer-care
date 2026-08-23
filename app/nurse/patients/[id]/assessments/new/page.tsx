import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { requireRole } from '../../../../../../lib/guard';
import { getDb } from '../../../../../../db/client';
import { patients, scaleItems, scales } from '../../../../../../db/schema';
import { symptomLabel } from '../../../../../../lib/services/symptom-cluster';
import NurseAssessmentRunner from '../../../../../../components/NurseAssessmentRunner';

export const dynamic = 'force-dynamic';

export default async function NewAssessmentPage({ params }: { params: { id: string } }) {
  const nurse = await requireRole('NURSE');
  const patientId = parseInt(params.id, 10);
  if (!Number.isFinite(patientId)) notFound();
  const db = getDb();
  const pRows = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
  const p = pRows[0];
  if (!p || p.primaryNurseId !== nurse.id) notFound();
  const scaleRows = await db.select().from(scales).where(eq(scales.status, '已发布')).limit(1);
  const scale = scaleRows[0];
  if (!scale) return <div className="p-4">暂无已发布量表</div>;
  const items = await db.select().from(scaleItems).where(eq(scaleItems.scaleId, scale.id));
  const itemsWithName = items.map((it) => ({ ...it, name: symptomLabel(it.code) }));
  return (
    <div className="space-y-4">
      <Link href={'/nurse/patients/' + p.id} className="text-sm text-brand-700 underline">返回患者详情</Link>
      <h1 className="text-lg font-semibold text-brand-700">代填评估（{p.fullName}）</h1>
      <p className="text-sm text-slate-500">护士可代患者完成评估。记录将标注来源为「护士代填」，提交后不可修改。</p>
      <NurseAssessmentRunner patientId={p.id} patientName={p.fullName} items={itemsWithName} />
    </div>
  );
}
