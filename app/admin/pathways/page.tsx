import { eq } from 'drizzle-orm';
import { requireRole } from '../../../lib/guard';
import { getDb } from '../../../db/client';
import { pathways, pathwaySteps } from '../../../db/schema';

export const dynamic = 'force-dynamic';

export default async function AdminPathwaysPage() {
  await requireRole('ADMIN');
  const db = getDb();
  const list = await db.select().from(pathways);
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-700">护理路径版本管理</h1>
      <p className="text-xs text-slate-500">已发布的路径不自动覆盖已分配患者；新版本需要由护士手动分配。</p>
      {list.map(async (p) => {
        const steps = await db.select().from(pathwaySteps).where(eq(pathwaySteps.pathwayId, p.id));
        return (
          <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-base font-semibold">{p.name} <span className="text-xs text-slate-500">v{p.version} · {p.applicableStage} · {p.status}</span></h2>
            <ul className="mt-2 space-y-1 text-sm">
              {steps.map((s) => (
                <li key={s.id} className="flex justify-between border-b border-slate-100 pb-1 last:border-0">
                  <span>{s.ordinal}. [{s.taskType}] {s.title}</span>
                  <span className="text-xs text-slate-500">D{s.relativeDay >= 0 ? '+' : ''}{s.relativeDay}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
