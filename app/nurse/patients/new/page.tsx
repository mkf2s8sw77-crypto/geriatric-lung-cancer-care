import { requireRole } from '../../../../lib/guard';
import NewPatientForm from '../../../../components/NewPatientForm';

export const dynamic = 'force-dynamic';

export default async function NewPatientPage() {
  const user = await requireRole('NURSE');
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-700">新建患者</h1>
      <p className="text-sm text-slate-500">本系统不提供患者自注册。患者账号由护士或管理员在后台创建，初始密码仅在创建成功时显示一次。</p>
      <NewPatientForm actorId={user.id} actorRole={user.role} primaryNurseId={user.id} />
    </div>
  );
}
