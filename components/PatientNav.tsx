'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Bot, BookOpen, User } from 'lucide-react';

const items = [
  { href: '/patient', label: '首页', icon: Home },
  { href: '/patient/tasks', label: '任务', icon: ClipboardList },
  { href: '/patient/butler', label: 'AI 助手', icon: Bot },
  { href: '/patient/education', label: '宣教', icon: BookOpen },
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
    </nav>
  );
}
