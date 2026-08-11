import Link from 'next/link';
import { eq, and } from 'drizzle-orm';
import { requireRole } from '../../../lib/guard';
import { getDb } from '../../../db/client';
import { educationResources, patientEducationReads } from '../../../db/schema';
import { findPatientByUserId } from '../../../lib/services/assessment';

export const dynamic = 'force-dynamic';

export default async function EducationListPage() {
  const user = await requireRole('PATIENT');
  const patient = await findPatientByUserId(user.id);
  if (!patient) return <div className="p-4">账号未关联患者档案。</div>;
  const db = getDb();
  const items = await db.select().from(educationResources).where(eq(educationResources.enabled, true));
  const reads = await db.select().from(patientEducationReads).where(eq(patientEducationReads.patientId, patient.id));
  const readMap = new Map(reads.map((r) => [r.resourceId, r]));
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-700">健康教育</h1>
      <ul className="space-y-2">
        {items.map((it) => {
          const r = readMap.get(it.id);
          const read = !!r;
          const confirmed = !!r?.confirmed;
          return (
            <li key={it.id} className="bg-white rounded-xl p-3 shadow-sm">
              <Link href={'/patient/education/' + it.id} className="block">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-brand-700">{it.title}</p>
                    <p className="text-xs text-slate-500">{it.category} · {it.applicableStage} · 约 {it.readMinutes} 分钟</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${confirmed ? 'bg-emerald-100 text-emerald-700' : read ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{confirmed ? '已确认' : read ? '已读' : '未读'}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
