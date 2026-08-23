import Link from 'next/link';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { requireRole } from '../../lib/guard';
import { getDb } from '../../db/client';
import { patients, assessments, alerts, tasks, users } from '../../db/schema';
import { RiskBadge } from '../../components/RiskBadge';
import { ClipboardList, Bot, Bell, BookOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

function startOfToday(): string {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString();
}
function endOfToday(): string {
  const d = new Date(); d.setHours(23, 59, 59, 999); return d.toISOString();
}

export default async function PatientHome() {
  const user = await requireRole('PATIENT');
  const db = getDb();
  const patRows = await db.select().from(patients).where(eq(patients.userId, user.id)).limit(1);
  const patient = patRows[0];
  if (!patient) return <div className="p-4">账号未关联患者档案，请联系护士。</div>;
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  // 今日任务
  const todayTasks = await db.select().from(tasks).where(and(eq(tasks.patientId, patient.id), gte(tasks.scheduledDate, todayStart.slice(0, 10))));
  const pending = todayTasks.filter((t) => t.status === '待完成');
  const completed = todayTasks.filter((t) => t.status === '已完成');
  const overdue = todayTasks.filter((t) => t.status === '未完成');
  // 最近评估
  const recentAssess = await db.select().from(assessments).where(eq(assessments.patientId, patient.id)).orderBy(desc(assessments.createdAt)).limit(3);
  // 风险
  const lastSubmitted = recentAssess.find((a) => a.status === '已提交');
  // 最近预警
  const recentAlerts = await db.select().from(alerts).where(eq(alerts.patientId, patient.id)).orderBy(desc(alerts.createdAt)).limit(2);
  // 责任护士
  let nurseName = '';
  if (patient.primaryNurseId) {
    const nu = await db.select().from(users).where(eq(users.id, patient.primaryNurseId)).limit(1);
    nurseName = nu[0]?.displayName || '';
  }
  // 任务完成率（用于在 AI 入口卡里展示）
  const allTasks = await db.select().from(tasks).where(eq(tasks.patientId, patient.id));
  const completedTasks = allTasks.filter((t) => t.status === '已完成').length;
  const completionRate = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-xl p-4 shadow-sm">
        <h1 className="text-lg font-semibold text-brand-700">{patient.fullName}（演示）</h1>
        <p className="text-sm text-slate-500 mt-1">研究编号 {patient.researchNo} · 治疗阶段 {patient.treatmentStage}</p>
        <p className="text-sm text-slate-600 mt-1">责任护士：{nurseName || '未分配'}</p>
      </section>

      {/* 三入口卡片：今日任务 / 今日评估 / AI 健康助手，并排首屏可达 */}
      <div className="grid grid-cols-2 gap-3">
        <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <h2 className="text-base font-semibold flex items-center gap-2"><ClipboardList size={18} aria-hidden="true" />今日任务</h2>
          {pending.length === 0 && completed.length === 0 && overdue.length === 0 ? (
            <p className="text-sm text-slate-500">今日暂无任务。</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {overdue.slice(0, 2).map((t) => <li key={t.id} className="flex items-center justify-between"><span className="text-risk-high">逾期 · {t.title}</span></li>)}
              {pending.slice(0, 2).map((t) => <li key={t.id} className="flex items-center justify-between"><span>{t.title}</span></li>)}
              {completed.slice(0, 2).map((t) => <li key={t.id} className="flex items-center justify-between text-slate-500"><span>已完成 · {t.title}</span><span className="text-xs">✓</span></li>)}
            </ul>
          )}
          <Link href="/patient/tasks" className="inline-flex min-h-touch items-center text-sm text-brand-700 underline">查看全部任务</Link>
        </section>

        <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <h2 className="text-base font-semibold flex items-center gap-2"><BookOpen size={18} aria-hidden="true" />今日评估</h2>
          {lastSubmitted ? (
            <div className="space-y-1">
              <p className="text-sm">总分 <span className="font-semibold">{lastSubmitted.totalScore?.toFixed(1) ?? '—'}</span></p>
              <p className="text-sm flex items-center gap-2">风险：<RiskBadge level={lastSubmitted.riskLevel as 'low' | 'medium' | 'high' | null} /></p>
              <Link href={'/patient/assessments/' + lastSubmitted.id} className="inline-flex min-h-touch items-center text-sm text-brand-700 underline">查看本次结果</Link>
            </div>
          ) : (
            <p className="text-sm text-slate-500">尚未提交评估。</p>
          )}
          <Link href="/patient/assessments/draft" className="inline-flex min-h-touch items-center px-3 rounded-md bg-brand-600 text-white text-sm">继续/开始评估</Link>
          <Link href="/patient/symptoms/new" className="inline-flex min-h-touch items-center text-sm text-brand-700 underline">上报新症状</Link>
        </section>
      </div>

      <section className="bg-gradient-to-br from-brand-50 to-white border border-brand-200 rounded-xl p-4 shadow-sm space-y-2">
        <h2 className="text-base font-semibold flex items-center gap-2 text-brand-700"><Bot size={18} aria-hidden="true" />AI 健康助手</h2>
        <p className="text-sm text-slate-600">由本地 mock AI 演示引擎驱动，可自由提问今日任务 / 评估 / 随访 / 宣教 / 心情。</p>
        {allTasks.length > 0 && (
          <p className="text-xs text-slate-500">任务完成率：{completionRate}%（{completedTasks} / {allTasks.length}）</p>
        )}
        <Link href="/patient/butler" className="inline-flex min-h-touch items-center px-4 rounded-md bg-brand-600 text-white text-sm">打开 AI 助手</Link>
      </section>

      {recentAlerts.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <h2 className="text-base font-semibold text-amber-700 flex items-center gap-2"><Bell size={18} aria-hidden="true" />近期提醒</h2>
          {recentAlerts.map((a) => (
            <p key={a.id} className="text-sm">{a.source}：{a.summary}（{a.status}）</p>
          ))}
        </section>
      )}

      <section className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-base font-semibold flex items-center gap-2"><BookOpen size={18} aria-hidden="true" />推荐阅读</h2>
        <p className="text-sm text-slate-500 mt-1">护士将根据您的治疗阶段推荐合适的宣教材料。</p>
        <Link href="/patient/education" className="text-sm text-brand-700 underline">查看宣教资源</Link>
      </section>
    </div>
  );
}
