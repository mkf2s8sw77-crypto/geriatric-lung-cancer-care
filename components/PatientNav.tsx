'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, BookOpen, LineChart, User, LogOut } from 'lucide-react';

const items = [
  { href: '/patient', label: '首页', icon: Home },
  { href: '/patient/tasks', label: '任务', icon: ClipboardList },
  { href: '/patient/education', label: '宣教', icon: BookOpen },
  { href: '/patient/trends', label: '趋势', icon: LineChart },
  { href: '/patient/profile', label: '我的', icon: User },
];

export default function PatientNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="患者导航" className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30">
      <ul className="flex justify-around items-stretch">
        {items.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.href || (it.href !== '/patient' && pathname.startsWith(it.href));
          return (
            <li key={it.href} className="flex-1">
              <Link href={it.href} className={`flex flex-col items-center justify-center gap-1 min-h-touch py-2 text-xs ${active ? 'text-brand-700' : 'text-slate-500'}`}>
                <Icon size={20} aria-hidden="true" />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="absolute -top-10 right-2">
        <form action="/geriatric-lung-cancer-care/api/auth/logout" method="post">
          <button type="submit" className="min-w-touch min-h-touch px-3 py-1 bg-white border border-slate-300 rounded-md text-sm flex items-center gap-1" aria-label="退出登录">
            <LogOut size={14} aria-hidden="true" />退出
          </button>
        </form>
      </div>
    </nav>
  );
}
