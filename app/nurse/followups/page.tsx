import Link from 'next/link';
import { eq, desc, gte } from 'drizzle-orm';
import { requireRole } from '../../../lib/guard';
import { getDb } from '../../../db/client';
import { patients, followups } from '../../../db/schema';

export const dynamic = 'force-dynamic';

export default async function FollowupsPage() {
  const user = await requireRole('NURSE');
  const db = getDb();
  const myPatients = await db.select().from(patients).where(eq(patients.primaryNurseId, user.id));
  const ids = myPatients.map((p) => p.id);
  const patMap = new Map(myPatients.map((p) => [p.id, p]));
  const upcoming = await db.select().from(followups).where(eq(followups.nurseId, user.id)).orderBy(desc(followups.scheduledAt)).limit(50);
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-700">随访管理</h1>
      <ul className="space-y-2">
        {upcoming.length === 0 && <li className="bg-white rounded-xl p-4 text-sm text-slate-500 shadow-sm">暂无随访记录。</li>}
        {upcoming.map((f) => {
          const p = patMap.get(f.patientId);
          return (
            <li key={f.id} className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{p?.fullName || '患者'}</p>
                  <p className="text-xs text-slate-500">{f.method} · {f.scheduledAt.slice(0, 16).replace('T', ' ')}</p>
                  {f.summary && <p className="text-sm text-slate-600 mt-1">{f.summary}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${f.status === '已完成' ? 'bg-emerald-100 text-emerald-700' : f.status === '已取消' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'}`}>{f.status}</span>
              </div>
              {f.status !== '已完成' && p && (
                <FollowupActions followupId={f.id} patientId={p.id} nurseId={user.id} />
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-slate-500">P3 将支持完整的随访新建、编辑、提交和后续任务生成。</p>
    </div>
  );
}

import FollowupActions from '../../../components/FollowupActions';
