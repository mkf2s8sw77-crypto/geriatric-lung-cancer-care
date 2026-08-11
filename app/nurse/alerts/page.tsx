import Link from 'next/link';
import { eq, desc, inArray } from 'drizzle-orm';
import { requireRole } from '../../../lib/guard';
import { getDb } from '../../../db/client';
import { patients, alerts } from '../../../db/schema';
import { RiskBadge } from '../../../components/RiskBadge';

export const dynamic = 'force-dynamic';

export default async function AlertsList() {
  const user = await requireRole('NURSE');
  const db = getDb();
  const myPatients = await db.select().from(patients).where(eq(patients.primaryNurseId, user.id));
  const ids = myPatients.map((p) => p.id);
  const list = ids.length > 0 ? await db.select().from(alerts).where(inArray(alerts.patientId, ids)).orderBy(desc(alerts.createdAt)).limit(50) : [];
  const patMap = new Map(myPatients.map((p) => [p.id, p]));
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-700">预警列表</h1>
      {list.length === 0 && <p className="bg-white rounded-xl p-4 text-sm text-slate-500 shadow-sm">暂无预警。</p>}
      <ul className="space-y-2">
        {list.map((a) => {
          const p = patMap.get(a.patientId);
          return (
            <li key={a.id} className="bg-white rounded-xl p-3 shadow-sm">
              <Link href={'/nurse/alerts/' + a.id} className="block">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-brand-700">{p?.fullName || '患者'} · {a.source}</p>
                    <p className="text-xs text-slate-500">{a.summary}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <RiskBadge level={a.level as 'low' | 'medium' | 'high'} />
                    <span className="text-xs text-slate-500">{a.status}</span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
