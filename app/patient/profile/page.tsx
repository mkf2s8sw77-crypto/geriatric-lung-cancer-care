import { requireRole } from '../../../lib/guard';
import { getDb } from '../../../db/client';
import { patients, users, followups } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await requireRole('PATIENT');
  const db = getDb();
  const pRows = await db.select().from(patients).where(eq(patients.userId, user.id)).limit(1);
  const p = pRows[0];
  if (!p) return <div className="p-4">账号未关联患者档案。</div>;
  let nurseName = '';
  if (p.primaryNurseId) {
    const nu = await db.select().from(users).where(eq(users.id, p.primaryNurseId)).limit(1);
    nurseName = nu[0]?.displayName || '';
  }
  const recentFollowups = await db.select().from(followups).where(eq(followups.patientId, p.id)).limit(5);
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-700">我的信息</h1>
      <section className="bg-white rounded-xl p-4 shadow-sm space-y-1 text-sm">
        <p><span className="text-slate-500">姓名：</span>{p.fullName}</p>
        <p><span className="text-slate-500">研究编号：</span>{p.researchNo}</p>
        <p><span className="text-slate-500">联系电话：</span>{p.phone}</p>
        <p><span className="text-slate-500">年龄/性别：</span>{p.age} 岁 · {p.gender === 'M' ? '男' : '女'}</p>
        <p><span className="text-slate-500">诊断：</span>{p.diagnosis}</p>
        <p><span className="text-slate-500">治疗阶段：</span>{p.treatmentStage}</p>
        <p><span className="text-slate-500">责任护士：</span>{nurseName || '未分配'}</p>
        <p><span className="text-slate-500">纳入日期：</span>{p.enrollmentDate.slice(0, 10)}</p>
        <p><span className="text-slate-500">下次随访：</span>{p.followupDate.slice(0, 10)}</p>
      </section>
      <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <h2 className="text-base font-semibold">近期随访</h2>
        {recentFollowups.length === 0 ? <p className="text-sm text-slate-500">暂无随访。</p> : (
          <ul className="space-y-1 text-sm">
            {recentFollowups.map((f) => (
              <li key={f.id} className="flex justify-between border-b border-slate-100 pb-1 last:border-0">
                <span>{f.method} · {f.scheduledAt.slice(0, 10)}</span>
                <span className="text-xs text-slate-500">{f.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-slate-500">本系统数据为演示用途，您的信息已脱敏，不会用于临床决策。</p>
    </div>
  );
}
