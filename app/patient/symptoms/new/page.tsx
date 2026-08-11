import { requireRole } from '../../../../lib/guard';
import { findPatientByUserId } from '../../../../lib/services/assessment';
import SymptomReportForm from '../../../../components/SymptomReportForm';

export const dynamic = 'force-dynamic';

export default async function NewSymptomReportPage() {
  const user = await requireRole('PATIENT');
  const patient = await findPatientByUserId(user.id);
  if (!patient) return <div className="p-4">账号未关联患者档案。</div>;
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-700">主动症状报告</h1>
      <p className="text-sm text-slate-500">如症状明显加重或新出现严重不适，请立即联系护士或就医。</p>
      <SymptomReportForm patientId={patient.id} actorUserId={user.id} />
    </div>
  );
}
