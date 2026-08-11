import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/guard';
import { roleHomePath } from '../../lib/auth';
import LoginForm from '../../components/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(roleHomePath(user.role));
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <img src="/geriatric-lung-cancer-care/brand/suzhou-municipal-hospital-logo.png" alt="苏州市立医院" className="brand-logo" style={{ maxWidth: '420px' }} />
          <h1 className="text-xl font-semibold text-brand-700">老年肺癌患者症状群智能评估与全病程管理系统</h1>
          <p className="text-sm text-slate-500">演示版本 · 数据为虚构内容</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
