import { requireRole } from '../../lib/guard';
import BrandHeader from '../../components/BrandHeader';
import NurseNav from '../../components/NurseNav';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export default async function NurseLayout({ children }: { children: ReactNode }) {
  await requireRole('NURSE');
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <BrandHeader role="NURSE" />
      <main className="flex-1 mx-auto w-full max-w-screen-md px-4 py-4 pb-28">{children}</main>
      <NurseNav />
    </div>
  );
}
