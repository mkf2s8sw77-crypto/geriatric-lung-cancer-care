import { requireRole } from '../../../lib/guard';
import { listEducation } from '../../../lib/services/admin';

export const dynamic = 'force-dynamic';

export default async function AdminEducationPage() {
  await requireRole('ADMIN');
  const list = await listEducation();
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-700">宣教资源管理</h1>
      <p className="text-xs text-slate-500">本系统宣教仅支持本地文本编辑；不提供图片、视频或外链。</p>
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">标题</th>
              <th className="px-3 py-2 text-left">分类</th>
              <th className="px-3 py-2 text-left">阶段</th>
              <th className="px-3 py-2 text-left">预计时长</th>
              <th className="px-3 py-2 text-left">状态</th>
              <th className="px-3 py-2 text-left">排序</th>
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{e.title}</td>
                <td className="px-3 py-2">{e.category}</td>
                <td className="px-3 py-2">{e.applicableStage}</td>
                <td className="px-3 py-2">{e.readMinutes} 分钟</td>
                <td className="px-3 py-2">{e.enabled ? '启用' : '停用'}</td>
                <td className="px-3 py-2">{e.sortOrder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
