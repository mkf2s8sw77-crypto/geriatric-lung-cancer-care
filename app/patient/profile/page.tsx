import { requireRole } from '../../../lib/guard';
import { getDb } from '../../../db/client';
import { patients, users, followups, assessments, tasks } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';
import TrendChart from '../../../components/TrendChart';

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
  // 近 30 天评估趋势（原 /patient/trends 页逻辑合并进来）
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const recentAssess = await db.select().from(assessments).where(eq(assessments.patientId, p.id)).orderBy(desc(assessments.submittedAt)).limit(20);
  const submitted = recentAssess.filter((a) => a.status === '已提交' && (a.submittedAt?.slice(0, 10) ?? '') >= cutoffIso);
  const trendPoints = submitted.slice().reverse().map((a) => ({ date: (a.submittedAt || a.createdAt).slice(0, 10), total: a.totalScore ?? 0, top: a.topSymptomScore ?? 0 }));
  const allTasks = await db.select().from(tasks).where(eq(tasks.patientId, p.id));
  const completedTasks = allTasks.filter((t) => t.status === '已完成').length;
  const completionRate = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;
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
        <h2 className="text-base font-semibold">近 30 天趋势</h2>
        {trendPoints.length === 0 ? <p className="text-sm text-slate-500">近 30 天暂无已提交评估。</p> : (
          <>
            <TrendChart points={trendPoints} />
            <p className="text-xs text-slate-500">折线由蓝（总分）和橙（主要症状）组成，仅展示最近 20 条记录。</p>
          </>
        )}
        <p className="text-xs text-slate-500">任务完成率：{completionRate}%（{completedTasks} / {allTasks.length}）</p>
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

      <form action="/geriatric-lung-cancer-care/api/auth/logout" method="post" className="pt-2">
        <button type="submit" className="w-full min-h-touch px-4 rounded-md border border-slate-300 text-slate-700 text-sm">退出登录</button>
      </form>
    </div>
  );
}
