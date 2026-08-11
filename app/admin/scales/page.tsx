import { eq } from 'drizzle-orm';
import { requireRole } from '../../../lib/guard';
import { getDb } from '../../../db/client';
import { scales, scaleItems } from '../../../db/schema';

export const dynamic = 'force-dynamic';

export default async function AdminScalesPage() {
  await requireRole('ADMIN');
  const db = getDb();
  const list = await db.select().from(scales);
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-700">量表版本管理</h1>
      <p className="text-xs text-slate-500">本量表为本地演示量表，已产生评估数据的已发布版本不可原地修改。新版本将另行发布。</p>
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">编号</th>
              <th className="px-3 py-2 text-left">名称</th>
              <th className="px-3 py-2 text-left">版本</th>
              <th className="px-3 py-2 text-left">状态</th>
              <th className="px-3 py-2 text-left">题目数</th>
              <th className="px-3 py-2 text-left">演示</th>
              <th className="px-3 py-2 text-left">更新时间</th>
            </tr>
          </thead>
          <tbody>
            {list.map(async (s) => {
              const items = await db.select().from(scaleItems).where(eq(scaleItems.scaleId, s.id));
              return (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{s.code}</td>
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2">v{s.version}</td>
                  <td className="px-3 py-2">{s.status}</td>
                  <td className="px-3 py-2">{items.length}</td>
                  <td className="px-3 py-2">{s.isDemo ? '演示' : '正式'}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{s.updatedAt.slice(0, 16).replace('T', ' ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">P4 验收后将支持量表版本复制、新建草稿、编辑题目和发布。</p>
    </div>
  );
}
