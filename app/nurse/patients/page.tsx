import Link from 'next/link';
import { eq, desc, and, like, inArray } from 'drizzle-orm';
import { requireRole } from '../../../lib/guard';
import { getDb } from '../../../db/client';
import { patients, users, alerts } from '../../../db/schema';
import { RiskBadge } from '../../../components/RiskBadge';

export const dynamic = 'force-dynamic';

export default async function PatientList({ searchParams }: { searchParams: { q?: string; risk?: string } }) {
  const user = await requireRole('NURSE');
  const db = getDb();
  const all = await db.select().from(patients).where(eq(patients.primaryNurseId, user.id));
  const q = (searchParams.q || '').trim();
  const risk = (searchParams.risk || '').trim();
  let filtered = all;
  if (q) {
    filtered = filtered.filter((p) => p.fullName.includes(q) || p.researchNo.includes(q) || p.phone.includes(q));
  }
  // 计算风险过滤
  if (risk) {
    const ids = filtered.map((p) => p.id);
    if (ids.length > 0) {
      const openAlerts = await db.select().from(alerts).where(and(inArray(alerts.patientId, ids), eq(alerts.status, '未处理')));
      const highestFor = (id: number): string => {
        const list = openAlerts.filter((a) => a.patientId === id);
        if (list.some((a) => a.level === 'high')) return 'high';
        if (list.some((a) => a.level === 'medium')) return 'medium';
        if (list.length > 0) return 'low';
        return '';
      };
      filtered = filtered.filter((p) => highestFor(p.id) === risk);
    }
  }

  // 每个患者未处理最高风险
  const patientIds = filtered.map((p) => p.id);
  const openAlerts = patientIds.length > 0 ? await db.select().from(alerts).where(and(inArray(alerts.patientId, patientIds), eq(alerts.status, '未处理'))) : [];
  const highestFor = (id: number): 'low' | 'medium' | 'high' | null => {
    const list = openAlerts.filter((a) => a.patientId === id);
    if (list.some((a) => a.level === 'high')) return 'high';
    if (list.some((a) => a.level === 'medium')) return 'medium';
    if (list.length > 0) return 'low';
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-brand-700">患者列表</h1>
        <Link href="/nurse/patients/new" className="min-h-touch inline-flex items-center px-3 rounded-md bg-brand-600 text-white text-sm">新建患者</Link>
      </div>
      <form className="bg-white rounded-xl p-3 shadow-sm space-y-2" method="get">
        <div className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="搜索姓名/编号/电话" className="flex-1 h-10 px-3 rounded-md border border-slate-300 text-sm" />
          <select name="risk" defaultValue={risk} className="h-10 px-3 rounded-md border border-slate-300 text-sm">
            <option value="">全部风险</option>
            <option value="high">高风险</option>
            <option value="medium">中风险</option>
            <option value="low">低风险</option>
          </select>
          <button className="h-10 px-3 rounded-md bg-slate-700 text-white text-sm">筛选</button>
        </div>
      </form>
      <ul className="space-y-2">
        {filtered.length === 0 && <li className="bg-white rounded-xl p-4 text-sm text-slate-500 shadow-sm">暂无符合条件的患者。</li>}
        {filtered.map((p) => {
          const h = highestFor(p.id);
          return (
            <li key={p.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <Link href={'/nurse/patients/' + p.id} className="text-base font-medium text-brand-700 underline">{p.fullName}</Link>
                  <p className="text-xs text-slate-500">{p.researchNo} · {p.treatmentStage} · {p.status}</p>
                </div>
                {h && <RiskBadge level={h} />}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
