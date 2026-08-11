import { requireRole } from '../../lib/guard';
import BrandHeader from '../../components/BrandHeader';
import PatientNav from '../../components/PatientNav';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export default async function PatientLayout({ children }: { children: ReactNode }) {
  await requireRole('PATIENT');
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <BrandHeader role="PATIENT" />
      <main className="flex-1 mx-auto w-full max-w-screen-md px-4 py-4 pb-28">{children}</main>
      <PatientNav />
    </div>
  );
}
