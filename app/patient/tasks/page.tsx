import { requireRole } from '../../../lib/guard';
import { findPatientByUserId } from '../../../lib/services/assessment';
import { listPatientTasks } from '../../../lib/services/task';
import TaskFeedbackList from '../../../components/TaskFeedbackList';

export const dynamic = 'force-dynamic';

export default async function PatientTasksPage() {
  const user = await requireRole('PATIENT');
  const patient = await findPatientByUserId(user.id);
  if (!patient) return <div className="p-4">账号未关联患者档案。</div>;
  const list = await listPatientTasks(patient.id);
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-700">任务中心</h1>
      <p className="text-sm text-slate-500">系统不会自动调整您的任务，护士会按需手动调整。</p>
      <TaskFeedbackList patientId={patient.id} actorUserId={user.id} tasks={list.map((t) => ({ id: t.id, taskType: t.taskType, title: t.title, description: t.description, scheduledDate: t.scheduledDate, status: t.status, feedbackNote: t.feedbackNote }))} />
    </div>
  );
}
