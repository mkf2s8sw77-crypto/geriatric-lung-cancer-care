import { requireRole } from '../../../../lib/guard';
import { findPatientByUserId, getOrCreateDraftAssessment, getAssessmentDraft } from '../../../../lib/services/assessment';
import AssessmentRunner from '../../../../components/AssessmentRunner';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DraftAssessmentPage() {
  const user = await requireRole('PATIENT');
  const patient = await findPatientByUserId(user.id);
  if (!patient) return <div className="p-4">账号未关联患者档案。</div>;
  const draft = await getOrCreateDraftAssessment(patient.id, user.id);
  const detail = await getAssessmentDraft(draft.id, patient.id);
  if (!detail) return <div className="p-4">评估草稿不存在，请刷新。</div>;
  if (detail.status === '已提交') redirect('/patient/assessments/' + detail.id);
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-700">症状评估（演示）</h1>
      <p className="text-sm text-slate-500">本量表为本地演示量表，分数越高表示症状越重。请根据过去 24 小时的真实感受作答。</p>
      <AssessmentRunner initial={detail} patientId={patient.id} />
    </div>
  );
}
