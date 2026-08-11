import Link from 'next/link';
import { requireRole } from '../../../lib/guard';
import { researchAggregates } from '../../../lib/services/admin';

export const dynamic = 'force-dynamic';

export default async function AdminResearchPage({ searchParams }: { searchParams: { stage?: string; status?: string; risk?: string } }) {
  await requireRole('ADMIN');
  const stage = searchParams.stage || '';
  const status = searchParams.status || '';
  const risk = searchParams.risk || '';
  const stats = await researchAggregates({ stage: stage || undefined, status: status || undefined, risk: risk || undefined });
  const exportQuery = new URLSearchParams();
  if (stage) exportQuery.set('stage', stage);
  if (status) exportQuery.set('status', status);
  if (risk) exportQuery.set('risk', risk);
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-700">科研统计与导出</h1>
      <form className="bg-white rounded-xl p-3 shadow-sm flex flex-wrap gap-2" method="get">
        <select name="stage" defaultValue={stage} className="h-10 px-3 rounded-md border border-slate-300 text-sm">
          <option value="">全部阶段</option>
          {['治疗中', '康复期', '随访期'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="status" defaultValue={status} className="h-10 px-3 rounded-md border border-slate-300 text-sm">
          <option value="">全部状态</option>
          {['在组', '已完成', '失访', '退出'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="risk" defaultValue={risk} className="h-10 px-3 rounded-md border border-slate-300 text-sm">
          <option value="">全部风险</option>
          <option value="high">高风险</option>
          <option value="medium">中风险</option>
          <option value="low">低风险</option>
          <option value="none">未评估</option>
        </select>
        <button className="h-10 px-3 rounded-md bg-brand-600 text-white text-sm">筛选</button>
        <a href={'/geriatric-lung-cancer-care/api/admin/research/export?' + exportQuery.toString()} className="h-10 px-3 inline-flex items-center rounded-md border border-slate-300 text-sm">导出 CSV</a>
      </form>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="患者数" value={stats.filteredPatientCount} />
        <Stat label="高风险" value={stats.riskDistribution.high} />
        <Stat label="中风险" value={stats.riskDistribution.medium} />
        <Stat label="低风险" value={stats.riskDistribution.low} />
        <Stat label="未评估" value={stats.riskDistribution.none} />
        <Stat label="任务完成率" value={stats.taskCompletionRate + '%'} />
        <Stat label="平均预警处置（小时）" value={stats.avgAlertHandlingHours} />
      </div>
      <p className="text-xs text-slate-500">CSV 含 UTF-8 BOM 和中文表头，已脱敏姓名、电话、账号、密码哈希、session 和自由文本。</p>
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
