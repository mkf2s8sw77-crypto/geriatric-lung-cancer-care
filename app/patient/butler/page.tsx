import Link from 'next/link';
import { requireRole } from '../../../lib/guard';
import { findPatientByUserId } from '../../../lib/services/assessment';
import AIButlerCard from '../../../components/AIButlerCard';

export const dynamic = 'force-dynamic';

export default async function ButlerPage() {
  const user = await requireRole('PATIENT');
  const patient = await findPatientByUserId(user.id);
  return (
    <div className="space-y-4">
      <Link href="/patient" className="text-sm text-brand-700 underline">返回首页</Link>
      {patient ? (
        <AIButlerCard patientName={patient.fullName} />
      ) : (
        <p className="text-sm text-slate-500">账号未关联患者档案，请联系护士。</p>
      )}
    </div>
  );
}
