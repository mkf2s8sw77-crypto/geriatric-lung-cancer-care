import { requireRole } from '../../../lib/guard';
import { listAuditLogs, listAllUsers } from '../../../lib/services/admin';

export const dynamic = 'force-dynamic';

export default async function AdminAuditPage({ searchParams }: { searchParams: { actor?: string; action?: string; from?: string; to?: string } }) {
  await requireRole('ADMIN');
  const actor = searchParams.actor || '';
  const action = searchParams.action || '';
  const from = searchParams.from || '';
  const to = searchParams.to || '';
  const filter: { actorId?: number; action?: string; fromDate?: string; toDate?: string } = {};
  if (action) filter.action = action;
  if (from) filter.fromDate = from;
  if (to) filter.toDate = to;
  const allUsers = await listAllUsers();
  const actorId = actor ? parseInt(actor, 10) : NaN;
  if (Number.isFinite(actorId)) filter.actorId = actorId;
  const list = await listAuditLogs(filter);
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-700">审计日志</h1>
      <form className="bg-white rounded-xl p-3 shadow-sm flex flex-wrap gap-2" method="get">
        <select name="actor" defaultValue={actor} className="h-10 px-3 rounded-md border border-slate-300 text-sm">
          <option value="">全部操作者</option>
          {allUsers.map((u) => <option key={u.id} value={u.id}>{u.displayName} ({u.role})</option>)}
        </select>
        <input name="action" defaultValue={action} placeholder="动作关键词" className="h-10 px-3 rounded-md border border-slate-300 text-sm" />
        <input name="from" defaultValue={from} type="date" className="h-10 px-3 rounded-md border border-slate-300 text-sm" />
        <input name="to" defaultValue={to} type="date" className="h-10 px-3 rounded-md border border-slate-300 text-sm" />
        <button className="h-10 px-3 rounded-md bg-brand-600 text-white text-sm">筛选</button>
      </form>
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">时间</th>
              <th className="px-3 py-2 text-left">操作者</th>
              <th className="px-3 py-2 text-left">动作</th>
              <th className="px-3 py-2 text-left">对象</th>
              <th className="px-3 py-2 text-left">摘要</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={5} className="text-center text-slate-500 py-6">暂无审计日志。</td></tr>}
            {list.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-xs text-slate-500">{r.createdAt.slice(0, 19).replace('T', ' ')}</td>
                <td className="px-3 py-2">{r.actorRole || '系统'}{r.actorUserId ? ' #' + r.actorUserId : ''}</td>
                <td className="px-3 py-2">{r.action}</td>
                <td className="px-3 py-2 text-xs">{r.targetType ? r.targetType + (r.targetId ? ' #' + r.targetId : '') : '—'}</td>
                <td className="px-3 py-2">{r.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
