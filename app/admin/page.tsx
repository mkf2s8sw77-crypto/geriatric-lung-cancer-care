import Link from 'next/link';
import { requireRole } from '../../lib/guard';
import { getDashboardStats } from '../../lib/services/admin';
import RiskDistributionChart from '../../components/RiskDistributionChart';
import TrendSparkline from '../../components/TrendSparkline';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  await requireRole('ADMIN');
  const stats = await getDashboardStats();
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

      <section className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-base font-semibold">治疗阶段分布</h2>
        <ul className="mt-2 grid grid-cols-3 gap-2 text-sm">
          {Object.entries(stats.patientsByStage).map(([k, v]) => (
            <li key={k} className="bg-slate-50 rounded-md p-2 text-center"><p className="text-slate-500">{k}</p><p className="text-xl font-semibold">{v}</p></li>
          ))}
        </ul>
      </section>

      <section className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-base font-semibold">风险分布（基于最新评估）</h2>
        <RiskDistributionChart distribution={stats.riskDistribution} />
      </section>

      <section className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-base font-semibold">近 30 天评估趋势</h2>
        <TrendSparkline points={stats.trendDaily} />
      </section>

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
