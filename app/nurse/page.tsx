import Link from 'next/link';
import { eq, desc, and, gte, inArray, sql } from 'drizzle-orm';
import { requireRole } from '../../lib/guard';
import { getDb } from '../../db/client';
import { patients, alerts, tasks, followups } from '../../db/schema';
import { RiskBadge } from '../../components/RiskBadge';

export const dynamic = 'force-dynamic';

function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }
function startOfToday(): string { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString(); }

export default async function NurseHome() {
  const user = await requireRole('NURSE');
  const db = getDb();
  const myPatients = await db.select().from(patients).where(eq(patients.primaryNurseId, user.id));
  const patientIds = myPatients.map((p) => p.id);
  // 未处理预警
  const myAlerts = patientIds.length > 0 ? await db.select().from(alerts).where(and(inArray(alerts.patientId, patientIds), eq(alerts.status, '未处理'))).orderBy(desc(alerts.createdAt)).limit(10) : [];
  // 今日随访
  const todayStart = startOfToday();
  const todayFollowups = patientIds.length > 0 ? await db.select().from(followups).where(and(inArray(followups.patientId, patientIds), eq(followups.status, '计划'), gte(followups.scheduledAt, todayStart))).limit(10) : [];
  // 逾期任务
  const today = isoDate(new Date());
  const overdueTasks = patientIds.length > 0 ? await db.select().from(tasks).where(and(inArray(tasks.patientId, patientIds), eq(tasks.status, '未完成'))).limit(10) : [];

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-xl p-4 shadow-sm">
        <h1 className="text-lg font-semibold text-brand-700">{user.displayName} · 工作台</h1>
        <p className="text-sm text-slate-500 mt-1">负责患者 {myPatients.length} 人，未处理预警 {myAlerts.length} 条，今日随访 {todayFollowups.length} 条，逾期任务 {overdueTasks.length} 条</p>
      </section>

      <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-semibold">未处理预警</h2>
          <Link href="/nurse/alerts" className="text-sm text-brand-700 underline">全部</Link>
        </div>
        {myAlerts.length === 0 ? <p className="text-sm text-slate-500">暂无未处理预警。</p> : (
          <ul className="space-y-2 text-sm">
            {myAlerts.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                <span className="flex items-center gap-2">{a.summary} <RiskBadge level={a.level as 'low' | 'medium' | 'high'} /></span>
                <Link href={'/nurse/alerts/' + a.id} className="text-brand-700 underline text-xs">查看</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <h2 className="text-base font-semibold">快捷入口</h2>
        <ul className="grid grid-cols-2 gap-2 text-sm">
          <li><Link href="/nurse/patients" className="block min-h-touch px-3 py-2 rounded-md border border-slate-300 text-center">患者列表</Link></li>
          <li><Link href="/nurse/patients/new" className="block min-h-touch px-3 py-2 rounded-md bg-brand-600 text-white text-center">新建患者</Link></li>
          <li><Link href="/nurse/followups" className="block min-h-touch px-3 py-2 rounded-md border border-slate-300 text-center">随访管理</Link></li>
          <li><Link href="/nurse/alerts" className="block min-h-touch px-3 py-2 rounded-md border border-slate-300 text-center">预警列表</Link></li>
        </ul>
      </section>
    </div>
  );
}
