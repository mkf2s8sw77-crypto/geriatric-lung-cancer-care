import { eq, desc, gte } from 'drizzle-orm';
import { requireRole } from '../../../lib/guard';
import { getDb } from '../../../db/client';
import { assessments, tasks } from '../../../db/schema';
import { findPatientByUserId } from '../../../lib/services/assessment';
import TrendChart from '../../../components/TrendChart';

export const dynamic = 'force-dynamic';

function isoDay(offset: number): string { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); }

export default async function TrendsPage() {
  const user = await requireRole('PATIENT');
  const patient = await findPatientByUserId(user.id);
  if (!patient) return <div className="p-4">账号未关联患者档案。</div>;
  const db = getDb();
  const cutoff = isoDay(-30);
  const recent = await db.select().from(assessments).where(eq(assessments.patientId, patient.id)).orderBy(desc(assessments.submittedAt)).limit(20);
  const submitted = recent.filter((a) => a.status === '已提交' && (a.submittedAt?.slice(0, 10) ?? '') >= cutoff);
  const points = submitted.slice().reverse().map((a) => ({ date: (a.submittedAt || a.createdAt).slice(0, 10), total: a.totalScore ?? 0, top: a.topSymptomScore ?? 0 }));
  const allTasks = await db.select().from(tasks).where(eq(tasks.patientId, patient.id));
  const completed = allTasks.filter((t) => t.status === '已完成').length;
  const completionRate = allTasks.length > 0 ? Math.round((completed / allTasks.length) * 100) : 0;
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-700">近 30 天趋势</h1>
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <h2 className="text-base font-semibold">评估趋势</h2>
        {points.length === 0 ? <p className="text-sm text-slate-500">近 30 天暂无已提交评估。</p> : (
          <>
            <TrendChart points={points} />
            <p className="text-xs text-slate-500">折线由蓝（总分）和橙（主要症状）组成，仅展示最近 20 条记录。</p>
          </>
        )}
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-base font-semibold">任务完成率</h2>
        <p className="text-2xl font-semibold text-brand-700 mt-1">{completionRate}%</p>
        <p className="text-xs text-slate-500">已完成 {completed} / {allTasks.length} 项任务。</p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
        <p className="font-semibold text-amber-700">提示</p>
        <p className="mt-1">评估结果为本地演示评估，须经责任护士确认。所有异常请及时联系护士或就医。</p>
      </div>
    </div>
  );
}
