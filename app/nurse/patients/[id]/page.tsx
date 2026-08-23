import Link from 'next/link';
import { eq, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { requireRole } from '../../../../lib/guard';
import { getDb } from '../../../../db/client';
import { patients, assessments, alerts, tasks, patientPathways, pathwaySteps, aiAnalyses } from '../../../../db/schema';
import { RiskBadge } from '../../../../components/RiskBadge';
import TaskRowNurse from '../../../../components/TaskRowNurse';
import AIAnalysisSection from '../../../../components/AIAnalysisSection';
import SymptomClusterBadge from '../../../../components/SymptomClusterBadge';
import { clusterOf, symptomLabel } from '../../../../lib/services/symptom-cluster';

export const dynamic = 'force-dynamic';

export default async function NursePatientDetail({ params }: { params: { id: string } }) {
  const user = await requireRole('NURSE');
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) notFound();
  const db = getDb();
  const pRows = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
  const p = pRows[0];
  if (!p || p.primaryNurseId !== user.id) notFound();
  const recent = await db.select().from(assessments).where(eq(assessments.patientId, id)).orderBy(desc(assessments.createdAt)).limit(5);
  const openAlerts = await db.select().from(alerts).where(eq(alerts.patientId, id)).orderBy(desc(alerts.createdAt)).limit(10);
  const recentTasks = await db.select().from(tasks).where(eq(tasks.patientId, id)).orderBy(desc(tasks.scheduledDate)).limit(20);
  const pathways = await db.select().from(patientPathways).where(eq(patientPathways.patientId, id));
  const aiCount = (await db.select({ c: aiAnalyses.id }).from(aiAnalyses).where(eq(aiAnalyses.patientId, id))).length;
  const latestAssess = recent.find((a) => a.status === '已提交');
  const topCode = latestAssess?.topSymptomCode || null;
  const cluster = clusterOf(topCode);
  return (
    <div className="space-y-4">
      <Link href="/nurse/patients" className="text-sm text-brand-700 underline">返回患者列表</Link>
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-1">
        <div className="flex items-start justify-between">
          <h1 className="text-lg font-semibold text-brand-700">{p.fullName}</h1>
          {cluster && <SymptomClusterBadge cluster={cluster} />}
        </div>
        <p className="text-sm">{p.researchNo} · {p.treatmentStage} · {p.status}</p>
        <p className="text-sm text-slate-600">年龄 {p.age} · {p.gender === 'M' ? '男' : '女'} · 诊断：{p.diagnosis}</p>
        <p className="text-sm text-slate-600">纳入日期：{p.enrollmentDate.slice(0, 10)} · 下次随访：{p.followupDate.slice(0, 10)}</p>
      </div>

      <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <h2 className="text-base font-semibold">任务与护理路径</h2>
        <p className="text-xs text-slate-500">已分配路径 {pathways.length} 套。系统不会自动调整任务；如需调整请使用下方操作。</p>
        <div className="flex flex-wrap gap-2">
          <Link href={'/nurse/patients/' + p.id + '/tasks/new'} className="min-h-touch inline-flex items-center px-3 rounded-md bg-brand-600 text-white text-sm">新增任务</Link>
          <Link href={'/nurse/patients/' + p.id + '/assessments/new'} className="min-h-touch inline-flex items-center px-3 rounded-md border border-slate-300 text-sm">代填评估</Link>
        </div>
        <ul className="mt-2 space-y-2">
          {recentTasks.map((t) => (
            <li key={t.id}>
              <TaskRowNurse task={t} />
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">最近评估</h2>
          {latestAssess && (
            <div className="flex items-center gap-2 text-xs">
              <SymptomClusterBadge cluster={cluster} size="xs" />
              <span className="text-slate-500">主要症状 {symptomLabel(latestAssess.topSymptomCode)}</span>
            </div>
          )}
        </div>
        {recent.length === 0 ? <p className="text-sm text-slate-500">暂无评估记录。</p> : (
          <ul className="space-y-1 text-sm">
            {recent.map((a) => (
              <li key={a.id} className="flex justify-between border-b border-slate-100 pb-1 last:border-0">
                <span className="flex items-center gap-2">
                  {a.submittedAt?.slice(0, 10) || a.createdAt.slice(0, 10)} · {a.source}
                  <SymptomClusterBadge cluster={clusterOf(a.topSymptomCode)} size="xs" />
                </span>
                <span className="flex items-center gap-2">{a.totalScore?.toFixed(1) ?? '—'} <RiskBadge level={a.riskLevel as 'low' | 'medium' | 'high' | null} /></span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {openAlerts.length > 0 && (
        <section className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2">
          <h2 className="text-base font-semibold text-rose-700">近期预警（{openAlerts.length}）</h2>
          <ul className="space-y-1 text-sm">
            {openAlerts.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <span>{a.summary} <RiskBadge level={a.level as 'low' | 'medium' | 'high'} /></span>
                <Link href={'/nurse/alerts/' + a.id} className="text-xs text-brand-700 underline">查看</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AIAnalysisSection patientId={id} patientName={p.fullName} />
    </div>
  );
}
