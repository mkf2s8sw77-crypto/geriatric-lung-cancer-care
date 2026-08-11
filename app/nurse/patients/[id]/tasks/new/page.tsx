import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { requireRole } from '../../../../../../lib/guard';
import { getDb } from '../../../../../../db/client';
import { patients, tasks } from '../../../../../../db/schema';
import TaskAdjustForm from '../../../../../../components/TaskAdjustForm';

export const dynamic = 'force-dynamic';

export default async function NewTaskPage({ params }: { params: { id: string } }) {
  const nurse = await requireRole('NURSE');
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) notFound();
  const db = getDb();
  const pRows = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
  const p = pRows[0];
  if (!p || p.primaryNurseId !== nurse.id) notFound();
  return (
    <div className="space-y-4">
      <Link href={'/nurse/patients/' + p.id} className="text-sm text-brand-700 underline">返回患者详情</Link>
      <h1 className="text-lg font-semibold text-brand-700">新增任务（{p.fullName}）</h1>
      <p className="text-xs text-slate-500">系统不会自动调整任务，所有任务调整均由护士手动完成并填写原因。</p>
      <TaskAdjustForm patientId={p.id} nurseId={nurse.id} mode="new" />
    </div>
  );
}
