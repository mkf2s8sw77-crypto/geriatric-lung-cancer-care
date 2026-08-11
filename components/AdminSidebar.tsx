'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, Layers, Settings, BookOpen, BarChart2, History } from 'lucide-react';

const items = [
  { href: '/admin', label: '驾驶舱', icon: LayoutDashboard },
  { href: '/admin/patients', label: '患者', icon: Users },
  { href: '/admin/users', label: '人员', icon: Users },
  { href: '/admin/scales', label: '量表', icon: FileText },
  { href: '/admin/pathways', label: '路径', icon: Layers },
  { href: '/admin/risk-rules', label: '规则', icon: Settings },
  { href: '/admin/education', label: '宣教', icon: BookOpen },
  { href: '/admin/research', label: '科研统计', icon: BarChart2 },
  { href: '/admin/audit', label: '审计', icon: History },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:block bg-white rounded-lg shadow-sm p-3 h-fit sticky top-4">
      <ul className="space-y-1">
        {items.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.href || (it.href !== '/admin' && pathname.startsWith(it.href));
          return (
            <li key={it.href}>
              <Link href={it.href} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon size={16} aria-hidden="true" />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="pt-2 mt-2 border-t border-slate-200">
          <form action="/geriatric-lung-cancer-care/api/auth/logout" method="post">
            <button type="submit" className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100">退出登录</button>
          </form>
        </li>
      </ul>
    </aside>
  );
}
