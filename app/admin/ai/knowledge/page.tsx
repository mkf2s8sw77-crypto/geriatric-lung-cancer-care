import Link from 'next/link';
import { sql, eq, desc } from 'drizzle-orm';
import { requireRole } from '../../../../lib/guard';
import { getDb } from '../../../../db/client';
import { knowledgeBases, knowledgeQuestions } from '../../../../db/schema';

export const dynamic = 'force-dynamic';

const CAT_COLOR: Record<string, string> = {
  气道护理: 'bg-sky-50 text-sky-700 border-sky-200',
  压力性损伤: 'bg-rose-50 text-rose-700 border-rose-200',
  化疗护理: 'bg-violet-50 text-violet-700 border-violet-200',
  营养支持: 'bg-amber-50 text-amber-700 border-amber-200',
  心理护理: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default async function AdminKnowledgePage() {
  await requireRole('ADMIN');
  const db = getDb();
  const items = await db.select().from(knowledgeBases).orderBy(knowledgeBases.category, knowledgeBases.id);
  const statsRows = await db.select({ c: sql<number>`count(*)` }).from(knowledgeQuestions);
  const totalQuestions = statsRows[0]?.c || 0;
  const recentQs = await db.select().from(knowledgeQuestions).orderBy(desc(knowledgeQuestions.createdAt)).limit(5);

  // 按类别统计
  const catGroups = new Map<string, { count: number; enabled: number; total: number }>();
  for (const it of items) {
    const cur = catGroups.get(it.category) || { count: 0, enabled: 0, total: 0 };
    cur.count += 1;
    cur.total += 1;
    if (it.enabled) cur.enabled += 1;
    catGroups.set(it.category, cur);
  }
  const categoryStats = Array.from(catGroups.entries()).map(([k, v]) => ({ category: k, ...v }));

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-brand-700 underline">返回驾驶舱</Link>
      <section className="bg-white rounded-xl p-4 shadow-sm">
        <h1 className="text-lg font-semibold text-brand-700">AI 知识库管理（演示版）</h1>
        <p className="text-xs text-slate-500 mt-1">查看 mock 知识库条目与护士提问统计。本轮不开放新增/编辑功能，避免内容审核复杂度。</p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500">总条目</p>
          <p className="text-2xl font-semibold text-brand-700 mt-1">{items.length}</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500">类别数</p>
          <p className="text-2xl font-semibold text-brand-700 mt-1">{catGroups.size}</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500">已启用</p>
          <p className="text-2xl font-semibold text-emerald-700 mt-1">{items.filter((i) => i.enabled).length}</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500">累计提问</p>
          <p className="text-2xl font-semibold text-brand-700 mt-1">{totalQuestions}</p>
        </div>
      </section>

      <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <h2 className="text-base font-semibold">按类别分布</h2>
        <div className="space-y-2">
          {categoryStats.map((c) => (
            <div key={c.category} className="flex items-center gap-2 text-sm">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${CAT_COLOR[c.category] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                {c.category}
              </span>
              <span className="text-slate-500">已启用 {c.enabled} / 共 {c.total}</span>
              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-brand-500" style={{ width: `${(c.enabled / Math.max(1, c.total)) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <h2 className="text-base font-semibold">条目清单</h2>
        <ul className="divide-y divide-slate-100">
          {items.map((it) => {
            let tags: string[] = [];
            try { tags = JSON.parse(it.tags || '[]'); } catch { /* ignore */ }
            return (
              <li key={it.id} className="py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${CAT_COLOR[it.category] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                    {it.category}
                  </span>
                  <span className="font-medium text-slate-800">{it.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${it.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {it.enabled ? '已启用' : '已停用'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">来源：{it.source} · 审核：{it.approvedBy}</p>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{it.body}</p>
                {tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tags.map((t) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">#{t}</span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {recentQs.length > 0 && (
        <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <h2 className="text-base font-semibold">最近 5 条提问</h2>
          <ul className="divide-y divide-slate-100">
            {recentQs.map((q) => (
              <li key={q.id} className="py-2 text-xs flex items-center justify-between gap-2">
                <span className="truncate text-slate-700 max-w-[60%]">{q.question}</span>
                <span className="flex items-center gap-2 text-slate-500">
                  <span className={`px-1.5 py-0.5 rounded-full border ${q.confidence === 'high' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : q.confidence === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    {q.confidence} · {(q.confidenceScore || 0).toFixed(2)}
                  </span>
                  <span className="text-slate-400">{q.createdAt.slice(11, 16)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
