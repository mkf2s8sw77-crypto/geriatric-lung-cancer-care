import Link from 'next/link';
import { requireRole } from '../../../lib/guard';
import { listAllPatients, listAllUsers } from '../../../lib/services/admin';
import { RiskBadge } from '../../../components/RiskBadge';
import { getDb } from '../../../db/client';
import { assessments, alerts } from '../../../db/schema';
import { desc, eq, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function AdminPatientsPage({ searchParams }: { searchParams: { stage?: string; status?: string; q?: string } }) {
  await requireRole('ADMIN');
  const stage = searchParams.stage || '';
  const status = searchParams.status || '';
  const q = searchParams.q || '';
  const list = await listAllPatients({ stage: stage || undefined, status: status || undefined, q: q || undefined });
  const db = getDb();
  const ids = list.map((p) => p.id);
  const allAlerts = ids.length > 0 ? await db.select().from(alerts).where(inArray(alerts.patientId, ids)) : [];
  const open = allAlerts.filter((a) => a.status === '未处理');
  const highestFor = (pid: number) => {
    const list = open.filter((a) => a.patientId === pid);
    if (list.some((a) => a.level === 'high')) return 'high';
    if (list.some((a) => a.level === 'medium')) return 'medium';
    return null;
  };
  const allUsers = await listAllUsers();
  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-700">患者管理</h1>
      <form className="bg-white rounded-xl p-3 shadow-sm flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={q} placeholder="姓名/编号" className="h-10 px-3 rounded-md border border-slate-300 text-sm flex-1 min-w-[160px]" />
        <select name="stage" defaultValue={stage} className="h-10 px-3 rounded-md border border-slate-300 text-sm">
          <option value="">全部阶段</option>
          {['治疗中', '康复期', '随访期'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="status" defaultValue={status} className="h-10 px-3 rounded-md border border-slate-300 text-sm">
          <option value="">全部状态</option>
          {['在组', '已完成', '失访', '退出'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="h-10 px-3 rounded-md bg-brand-600 text-white text-sm">筛选</button>
      </form>
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">姓名</th>
              <th className="px-3 py-2 text-left">编号</th>
              <th className="px-3 py-2 text-left">阶段</th>
              <th className="px-3 py-2 text-left">状态</th>
              <th className="px-3 py-2 text-left">责任护士</th>
              <th className="px-3 py-2 text-left">预警</th>
              <th className="px-3 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7} className="text-center text-slate-500 py-6">暂无数据。</td></tr>}
            {list.map((p) => {
              const nurse = p.primaryNurseId ? userMap.get(p.primaryNurseId) : null;
              const h = highestFor(p.id);
              return (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{p.fullName}</td>
                  <td className="px-3 py-2 text-slate-600">{p.researchNo}</td>
                  <td className="px-3 py-2">{p.treatmentStage}</td>
                  <td className="px-3 py-2">{p.status}</td>
                  <td className="px-3 py-2">{nurse?.displayName || '未分配'}</td>
                  <td className="px-3 py-2">{h && <RiskBadge level={h} />}</td>
                  <td className="px-3 py-2"><Link href={'/nurse/patients/' + p.id} className="text-brand-700 underline">查看</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
