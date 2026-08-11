import { requireRole } from '../../../lib/guard';
import { listRiskRules } from '../../../lib/services/admin';

export const dynamic = 'force-dynamic';

export default async function AdminRiskRulesPage() {
  await requireRole('ADMIN');
  const list = await listRiskRules();
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-700">预警规则版本</h1>
      <p className="text-xs text-slate-500">规则版本一经发布不可原地修改；新评估将使用当前生效版本，历史评估仍引用旧版本快照。</p>
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">编号</th>
              <th className="px-3 py-2 text-left">名称</th>
              <th className="px-3 py-2 text-left">版本</th>
              <th className="px-3 py-2 text-left">状态</th>
              <th className="px-3 py-2 text-left">阈值</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              let parsed: { totalMedium?: number; totalHigh?: number; topSymptomMedium?: number; topSymptomHigh?: number; deltaHigh?: number } = {};
              try { parsed = JSON.parse(r.thresholdsJson); } catch { /* */ }
              return (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{r.code}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">v{r.version}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2 text-xs">总分中 {parsed.totalMedium ?? '-'} / 高 {parsed.totalHigh ?? '-'}；症状中 {parsed.topSymptomMedium ?? '-'} / 高 {parsed.topSymptomHigh ?? '-'}；增量高 {parsed.deltaHigh ?? '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
