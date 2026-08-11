import { requireRole } from '../../lib/guard';
import BrandHeader from '../../components/BrandHeader';
import AdminSidebar from '../../components/AdminSidebar';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole('ADMIN');
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <BrandHeader role="ADMIN" title={`欢迎，${user.displayName}`} />
      <div className="flex-1 mx-auto w-full max-w-screen-xl px-4 py-4 grid gap-4" style={{ gridTemplateColumns: 'minmax(200px, 220px) 1fr' }}>
        <AdminSidebar />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
