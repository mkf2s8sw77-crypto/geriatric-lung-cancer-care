import Link from 'next/link';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { requireRole } from '../../lib/guard';
import { getDashboardStats } from '../../lib/services/admin';
import { getDb } from '../../db/client';
import { aiAnalyses, assessments, patients, knowledgeQuestions } from '../../db/schema';
import RiskDistributionChart from '../../components/RiskDistributionChart';
import TrendSparkline from '../../components/TrendSparkline';
import { CLUSTER_LABEL, clusterOf } from '../../lib/services/symptom-cluster';

export const dynamic = 'force-dynamic';

const STATUS_COLOR: Record<string, string> = {
  已生成: 'bg-slate-100 text-slate-700',
  已采纳: 'bg-emerald-50 text-emerald-700',
  部分采纳: 'bg-amber-50 text-amber-700',
  未采纳: 'bg-rose-50 text-rose-700',
};

export default async function AdminDashboard() {
  await requireRole('ADMIN');
  const stats = await getDashboardStats();
  const db = getDb();

  // AI 演示分析采纳率
  const aiStatusRows = await db.select({ status: aiAnalyses.status, c: sql<number>`count(*)` }).from(aiAnalyses).groupBy(aiAnalyses.status);
  const aiStatusTotal = aiStatusRows.reduce((s, r) => s + r.c, 0);
  const aiStatusMap: Record<string, number> = { 已生成: 0, 已采纳: 0, 部分采纳: 0, 未采纳: 0 };
  for (const r of aiStatusRows) aiStatusMap[r.status] = r.c;

  // 按症状群分布
  const recentPatIds = (await db.select({ patientId: assessments.patientId, topSymptomCode: assessments.topSymptomCode, submittedAt: assessments.submittedAt, status: assessments.status }).from(assessments).where(eq(assessments.status, '已提交')).orderBy(desc(assessments.submittedAt))).slice(0, 200);
  const latestByPatient = new Map<number, string | null>();
  for (const a of recentPatIds) {
    if (!latestByPatient.has(a.patientId)) latestByPatient.set(a.patientId, a.topSymptomCode);
  }
  const clusterCount: Record<string, number> = { somatic: 0, nutritional: 0, psychological: 0, respiratory: 0, none: 0 };
  for (const code of latestByPatient.values()) {
    const c = clusterOf(code);
    if (c) clusterCount[c] += 1;
    else clusterCount.none += 1;
  }
  const clusterTotal = Object.values(clusterCount).reduce((s, v) => s + v, 0);

  // 高风险患者列表（top 5）
  const highRiskPats = await db.select({ id: patients.id, fullName: patients.fullName, researchNo: patients.researchNo, treatmentStage: patients.treatmentStage, riskLevel: assessments.riskLevel, totalScore: assessments.totalScore, submittedAt: assessments.submittedAt })
    .from(assessments)
    .innerJoin(patients, eq(patients.id, assessments.patientId))
    .where(eq(assessments.riskLevel, 'high'))
    .orderBy(desc(assessments.submittedAt))
    .limit(5);

  // 知识库问答统计（最近 7 天）
  const kq7Rows = await db.select({ c: sql<number>`count(*)` }).from(knowledgeQuestions);
  const kqTotal = kq7Rows[0]?.c || 0;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-700">驾驶舱</h1>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="总患者数" value={stats.totalPatients} />
        <Stat label="在组" value={stats.patientsByStatus['在组'] || 0} />
        <Stat label="未处理预警" value={stats.openAlerts} />
        <Stat label="逾期任务" value={stats.overdueTasks} />
        <Stat label="今日评估" value={stats.recentAssessments} />
        <Stat label="高风险" value={stats.riskDistribution.high} />
        <Stat label="中风险" value={stats.riskDistribution.medium} />
        <Stat label="低风险" value={stats.riskDistribution.low} />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <h2 className="text-base font-semibold">AI 演示分析采纳率</h2>
          <Donut data={[
            { label: '已采纳', value: aiStatusMap.已采纳, color: '#059669' },
            { label: '部分采纳', value: aiStatusMap.部分采纳, color: '#d97706' },
            { label: '未采纳', value: aiStatusMap.未采纳, color: '#dc2626' },
            { label: '已生成', value: aiStatusMap.已生成, color: '#94a3b8' },
          ]} total={aiStatusTotal} />
          <p className="text-xs text-slate-500">基于本地 mock 演示分析（mock-geriatric-lung-v1 系列），共 {aiStatusTotal} 条。</p>
        </section>

        <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <h2 className="text-base font-semibold">按症状群分布（演示映射）</h2>
          <ul className="space-y-1.5 text-xs">
            {(['somatic', 'nutritional', 'psychological', 'respiratory'] as const).map((c) => {
              const v = clusterCount[c];
              const pct = clusterTotal > 0 ? (v / clusterTotal) * 100 : 0;
              return (
                <li key={c} className="flex items-center gap-2">
                  <span className="w-24 text-slate-600">{CLUSTER_LABEL[c]}</span>
                  <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-12 text-right text-slate-500">{v}</span>
                </li>
              );
            })}
            <li className="text-slate-400">（未归类 {clusterCount.none}）</li>
          </ul>
          <p className="text-xs text-slate-500">症状群归类为演示版映射（躯体 / 营养 / 心理 / 呼吸 4 群），未经过临床验证。</p>
        </section>
      </div>

      <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <h2 className="text-base font-semibold">高风险患者（top 5）</h2>
        {highRiskPats.length === 0 ? <p className="text-sm text-slate-500">暂无高风险评估记录。</p> : (
          <ul className="divide-y divide-slate-100">
            {highRiskPats.map((p) => (
              <li key={p.id + '_' + p.submittedAt} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium text-slate-800">{p.fullName}</div>
                  <div className="text-xs text-slate-500">{p.researchNo} · {p.treatmentStage} · {p.submittedAt?.slice(0, 10)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-700">总分 {p.totalScore?.toFixed(1) ?? '—'}</span>
                  <Link href={`/admin/patients`} className="text-xs text-brand-700 underline">查看</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <h2 className="text-base font-semibold">治疗阶段分布</h2>
          <ul className="mt-2 grid grid-cols-3 gap-2 text-sm">
            {Object.entries(stats.patientsByStage).map(([k, v]) => (
              <li key={k} className="bg-slate-50 rounded-md p-2 text-center"><p className="text-slate-500">{k}</p><p className="text-xl font-semibold">{v}</p></li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <h2 className="text-base font-semibold">风险分布（基于最新评估）</h2>
          <RiskDistributionChart distribution={stats.riskDistribution} />
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <h2 className="text-base font-semibold">近 30 天评估趋势</h2>
          <TrendSparkline points={stats.trendDaily} />
        </section>

        <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <h2 className="text-base font-semibold">知识库智能体使用</h2>
          <p className="text-3xl font-semibold text-brand-700">{kqTotal}</p>
          <p className="text-xs text-slate-500">累计护士问答次数（mock-kb-agent-v1，30 条审核知识库）</p>
          <Link href="/admin/ai/knowledge" className="inline-flex min-h-touch items-center px-3 rounded-md border border-slate-300 text-sm">查看知识库</Link>
        </section>
      </div>

      <p className="text-xs text-slate-500">本仪表盘数据均来自本地 SQLite 数据库，全部指标可在统计导出中验证。</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-brand-700 mt-1">{value}</p>
    </div>
  );
}

function Donut({ data, total }: { data: { label: string; value: number; color: string }[]; total: number }) {
  const size = 120, cx = size / 2, cy = size / 2, r = 45, stroke = 18;
  let offset = 0;
  const circumference = 2 * Math.PI * r;
  if (total === 0) {
    return <p className="text-sm text-slate-500">暂无数据</p>;
  }
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {data.map((d, i) => {
          if (d.value === 0) return null;
          const len = (d.value / total) * circumference;
          const dasharray = `${len} ${circumference - len}`;
          const dashoffset = -offset;
          offset += len;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={stroke}
              strokeDasharray={dasharray} strokeDashoffset={dashoffset} transform={`rotate(-90 ${cx} ${cy})`} />
          );
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fill="#64748b">总计</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="16" fontWeight="600" fill="#155aa3">{total}</text>
      </svg>
      <ul className="space-y-1 text-xs">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-slate-700">{d.label}</span>
            <span className="text-slate-500">{d.value} ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
