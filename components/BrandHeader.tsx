import Link from 'next/link';
import type { Role } from '../lib/auth';

export default function BrandHeader({ title, role }: { title?: string; role?: Role }) {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="mx-auto max-w-screen-xl px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3 min-w-0">
          <img src="/geriatric-lung-cancer-care/brand/suzhou-municipal-hospital-logo.png" alt="苏州市立医院" className="h-12 sm:h-14 w-auto" />
          <div className="min-w-0 hidden sm:block">
            <p className="text-sm font-semibold text-brand-700 truncate">{title || '老年肺癌患者症状群智能评估与全病程管理系统'}</p>
            <p className="text-xs text-slate-500 truncate">苏州市立医院 · 演示版本</p>
          </div>
        </Link>
        {role && <span className="text-xs px-2 py-1 rounded-full bg-brand-50 text-brand-700 whitespace-nowrap">{roleLabel(role)}</span>}
      </div>
    </header>
  );
}

function roleLabel(role: Role): string {
  return role === 'ADMIN' ? '护士管理员' : role === 'NURSE' ? '护士' : '患者/家属';
}
