import Link from 'next/link';
import { eq, desc, and, gte, inArray, sql } from 'drizzle-orm';
import { requireRole } from '../../lib/guard';
import { getDb } from '../../db/client';
import { patients, alerts, tasks, followups, aiAnalyses, assessments } from '../../db/schema';
import { RiskBadge } from '../../components/RiskBadge';
import { Brain, Stethoscope, ClipboardList, Phone, BookOpen, FileBarChart } from 'lucide-react';

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
  // 风险分布（按负责患者最新一次评估）
  const recentAss = patientIds.length > 0 ? await db.select().from(assessments).where(inArray(assessments.patientId, patientIds)).orderBy(desc(assessments.submittedAt)).limit(200) : [];
  const latestByPatient = new Map<number, typeof recentAss[number]>();
  for (const a of recentAss) {
    if (a.status !== '已提交') continue;
    if (!latestByPatient.has(a.patientId)) latestByPatient.set(a.patientId, a);
  }
  const riskDist = { low: 0, medium: 0, high: 0, none: 0 };
  for (const p of myPatients) {
    const last = latestByPatient.get(p.id);
    if (!last) riskDist.none += 1;
    else if (last.riskLevel === 'low' || last.riskLevel === 'medium' || last.riskLevel === 'high') riskDist[last.riskLevel] += 1;
  }
  // 近期 AI 采纳率（30 天内）
  const cutoff30 = new Date(); cutoff30.setDate(cutoff30.getDate() - 30);
  const myAi = patientIds.length > 0 ? await db.select({ status: aiAnalyses.status, c: sql<number>`count(*)` }).from(aiAnalyses).where(and(inArray(aiAnalyses.patientId, patientIds), gte(aiAnalyses.createdAt, cutoff30.toISOString()))).groupBy(aiAnalyses.status) : [];
  const aiTotal = myAi.reduce((s, r) => s + r.c, 0);
  const aiAdopted = myAi.filter((r) => r.status === '已采纳' || r.status === '部分采纳').reduce((s, r) => s + r.c, 0);
  const aiAdoptRate = aiTotal > 0 ? Math.round((aiAdopted / aiTotal) * 100) : 0;

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-xl p-4 shadow-sm">
        <h1 className="text-lg font-semibold text-brand-700">{user.displayName} · 工作台</h1>
        <p className="text-sm text-slate-500 mt-1">负责患者 {myPatients.length} 人，未处理预警 {myAlerts.length} 条，今日随访 {todayFollowups.length} 条，逾期任务 {overdueTasks.length} 条</p>
      </section>

      {/* AI 智能体入口卡 */}
      <section className="bg-gradient-to-br from-brand-50 to-white border border-brand-200 rounded-xl p-4 shadow-sm">
        <h2 className="text-base font-semibold text-brand-700 flex items-center gap-2">
          <Brain size={18} aria-hidden="true" /> AI 知识库智能体（mock-kb-agent-v1）
        </h2>
        <p className="text-sm text-slate-600 mt-1">5 大类共 30 条审核知识库，覆盖气道护理 / 压力性损伤 / 化疗护理 / 营养支持 / 心理护理。遇到不熟悉的临床问题时，试着让它给你一个带引用的回答。</p>
        <Link href="/nurse/assistant" className="inline-flex min-h-touch items-center px-4 mt-2 rounded-md bg-brand-600 text-white text-sm">打开 AI 助手</Link>
      </section>

      {/* 今日待办摘要 */}
      <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <h2 className="text-base font-semibold">今日待办</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Link href="/nurse/alerts" className="rounded-md bg-rose-50 p-3 border border-rose-200 hover:bg-rose-100">
            <p className="text-xs text-rose-700">未处理预警</p>
            <p className="text-2xl font-semibold text-rose-700 mt-1">{myAlerts.length}</p>
          </Link>
          <Link href="/nurse/followups" className="rounded-md bg-sky-50 p-3 border border-sky-200 hover:bg-sky-100">
            <p className="text-xs text-sky-700">今日随访</p>
            <p className="text-2xl font-semibold text-sky-700 mt-1">{todayFollowups.length}</p>
          </Link>
          <Link href="/nurse/patients" className="rounded-md bg-amber-50 p-3 border border-amber-200 hover:bg-amber-100">
            <p className="text-xs text-amber-700">逾期任务</p>
            <p className="text-2xl font-semibold text-amber-700 mt-1">{overdueTasks.length}</p>
          </Link>
        </div>
      </section>

      {/* 风险分布 + AI 采纳率 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <h2 className="text-base font-semibold">负责患者风险分布</h2>
          <RiskDonut dist={riskDist} />
        </section>
        <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <h2 className="text-base font-semibold">近期 AI 采纳率（30 天）</h2>
          <div className="flex items-end gap-3">
            <p className="text-4xl font-semibold text-brand-700">{aiAdoptRate}%</p>
            <p className="text-xs text-slate-500 pb-2">采纳 {aiAdopted} / 共 {aiTotal}</p>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${aiAdoptRate}%` }} />
          </div>
          <p className="text-xs text-slate-500">演示版 AI 演示分析：采纳 = 已采纳 + 部分采纳</p>
        </section>
      </div>

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
          <li><Link href="/nurse/patients" className="block min-h-touch px-3 py-2 rounded-md border border-slate-300 text-center flex items-center justify-center gap-1"><Stethoscope size={14} />患者列表</Link></li>
          <li><Link href="/nurse/patients/new" className="block min-h-touch px-3 py-2 rounded-md bg-brand-600 text-white text-center flex items-center justify-center gap-1"><ClipboardList size={14} />新建患者</Link></li>
          <li><Link href="/nurse/followups" className="block min-h-touch px-3 py-2 rounded-md border border-slate-300 text-center flex items-center justify-center gap-1"><Phone size={14} />随访管理</Link></li>
          <li><Link href="/nurse/alerts" className="block min-h-touch px-3 py-2 rounded-md border border-slate-300 text-center flex items-center justify-center gap-1"><BookOpen size={14} />预警列表</Link></li>
        </ul>
      </section>
    </div>
  );
}

function RiskDonut({ dist }: { dist: { low: number; medium: number; high: number; none: number } }) {
  const total = dist.low + dist.medium + dist.high;
  const size = 110, cx = size / 2, cy = size / 2, r = 40, stroke = 16;
  const circumference = 2 * Math.PI * r;
  if (total === 0) return <p className="text-sm text-slate-500">暂无评估数据（{dist.none} 人未评估）</p>;
  let offset = 0;
  const items = [
    { label: '低', value: dist.low, color: '#059669' },
    { label: '中', value: dist.medium, color: '#d97706' },
    { label: '高', value: dist.high, color: '#dc2626' },
  ];
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {items.map((d, i) => {
          if (d.value === 0) return null;
          const len = (d.value / total) * circumference;
          const dasharray = `${len} ${circumference - len}`;
          const dashoffset = -offset;
          offset += len;
          return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={stroke} strokeDasharray={dasharray} strokeDashoffset={dashoffset} transform={`rotate(-90 ${cx} ${cy})`} />;
        })}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="9" fill="#64748b">已评估</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="14" fontWeight="600" fill="#155aa3">{total}</text>
      </svg>
      <ul className="text-xs space-y-1">
        {items.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
            <span className="text-slate-700">{d.label === '低' ? '低风险' : d.label === '中' ? '中风险' : '高风险'}</span>
            <span className="text-slate-500">{d.value} ({Math.round((d.value / total) * 100)}%)</span>
          </li>
        ))}
        {dist.none > 0 && <li className="text-slate-400">未评估 {dist.none}</li>}
      </ul>
    </div>
  );
}
