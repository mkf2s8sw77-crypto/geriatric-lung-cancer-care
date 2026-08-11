import { eq } from 'drizzle-orm';
import { requireRole } from '../../../lib/guard';
import { getDb } from '../../../db/client';
import { users } from '../../../db/schema';
import UserRowActions from '../../../components/UserRowActions';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  await requireRole('ADMIN');
  const db = getDb();
  const list = await db.select().from(users);
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-700">人员管理</h1>
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">账号</th>
              <th className="px-3 py-2 text-left">显示名</th>
              <th className="px-3 py-2 text-left">角色</th>
              <th className="px-3 py-2 text-left">状态</th>
              <th className="px-3 py-2 text-left">最近登录</th>
              <th className="px-3 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{u.username}</td>
                <td className="px-3 py-2">{u.displayName}</td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2">{u.isActive ? '启用' : '停用'}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{u.lastLoginAt?.slice(0, 16).replace('T', ' ') || '—'}</td>
                <td className="px-3 py-2"><UserRowActions userId={u.id} isActive={u.isActive} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">管理员不能读取或导出密码哈希和 session token；密码重置后将以新密码显示一次。</p>
    </div>
  );
}
