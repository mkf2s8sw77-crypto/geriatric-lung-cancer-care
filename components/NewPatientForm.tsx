'use client';
import { useState } from 'react';

export default function NewPatientForm({ actorId, actorRole, primaryNurseId }: { actorId: number; actorRole: string; primaryNurseId: number }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ researchNo: string; username: string; initialPassword: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError({});
    const form = e.currentTarget;
    const fd = new FormData(form);
    const body = {
      fullName: (fd.get('fullName') as string || '').trim(),
      phone: (fd.get('phone') as string || '').trim(),
      age: Number(fd.get('age') || 0),
      gender: fd.get('gender') as 'M' | 'F',
      diagnosis: (fd.get('diagnosis') as string || '').trim(),
      treatmentStage: (fd.get('treatmentStage') as string || '').trim(),
      enrollmentDate: (fd.get('enrollmentDate') as string || '').trim(),
      followupDate: (fd.get('followupDate') as string || '').trim(),
      primaryNurseId,
      actorUserId: actorId,
      actorRole,
    };
    try {
      const resp = await fetch('/geriatric-lung-cancer-care/api/nurse/patients', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        if (data.fieldErrors) setError(data.fieldErrors);
        setError((prev) => ({ ...prev, _global: data.error || '提交失败' }));
        setSubmitting(false);
        return;
      }
      setResult({ researchNo: data.researchNo, username: data.username, initialPassword: data.initialPassword });
      form.reset();
    } catch (err) {
      setError({ _global: '网络异常，请稍后重试' });
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
        <p className="text-emerald-700 font-semibold">患者已成功创建</p>
        <dl className="grid grid-cols-1 gap-1 text-sm">
          <div className="flex justify-between"><dt>研究编号</dt><dd>{result.researchNo}</dd></div>
          <div className="flex justify-between"><dt>账号</dt><dd>{result.username}</dd></div>
          <div className="flex justify-between"><dt>初始密码</dt><dd className="font-mono">{result.initialPassword}</dd></div>
        </dl>
        <p className="text-xs text-amber-700">请将账号与初始密码当面或电话告知患者/家属。刷新页面后将无法再次查看初始密码。</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl p-4 shadow-sm space-y-3" noValidate>
      <div>
        <label htmlFor="np-fullName" className="block text-sm font-medium mb-1">姓名（虚构）</label>
        <input id="np-fullName" name="fullName" required className="w-full h-12 px-3 rounded-md border border-slate-300" />
        {error.fullName && <p className="text-xs text-risk-high mt-1">{error.fullName}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="np-phone" className="block text-sm font-medium mb-1">联系电话（虚构）</label>
          <input id="np-phone" name="phone" inputMode="numeric" pattern="[0-9]{11}" required className="w-full h-12 px-3 rounded-md border border-slate-300" />
          {error.phone && <p className="text-xs text-risk-high mt-1">{error.phone}</p>}
        </div>
        <div>
          <label htmlFor="np-age" className="block text-sm font-medium mb-1">年龄</label>
          <input id="np-age" name="age" type="number" min={40} max={120} required className="w-full h-12 px-3 rounded-md border border-slate-300" />
          {error.age && <p className="text-xs text-risk-high mt-1">{error.age}</p>}
        </div>
      </div>
      <div>
        <span className="block text-sm font-medium mb-1">性别</span>
        <div className="flex gap-2">
          <label className="flex items-center gap-1"><input type="radio" name="gender" value="M" defaultChecked />男</label>
          <label className="flex items-center gap-1"><input type="radio" name="gender" value="F" />女</label>
        </div>
      </div>
      <div>
        <label htmlFor="np-diagnosis" className="block text-sm font-medium mb-1">诊断</label>
        <select id="np-diagnosis" name="diagnosis" required className="w-full h-12 px-3 rounded-md border border-slate-300">
          <option value="非小细胞肺癌 II 期">非小细胞肺癌 II 期（演示）</option>
          <option value="非小细胞肺癌 III 期">非小细胞肺癌 III 期（演示）</option>
          <option value="小细胞肺癌局限期">小细胞肺癌局限期（演示）</option>
          <option value="肺腺癌 IV 期（演示）">肺腺癌 IV 期（演示）</option>
        </select>
      </div>
      <div>
        <label htmlFor="np-stage" className="block text-sm font-medium mb-1">治疗阶段</label>
        <select id="np-stage" name="treatmentStage" required className="w-full h-12 px-3 rounded-md border border-slate-300">
          <option value="治疗中">治疗中</option>
          <option value="康复期">康复期</option>
          <option value="随访期">随访期</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="np-enroll" className="block text-sm font-medium mb-1">纳入日期</label>
          <input id="np-enroll" name="enrollmentDate" type="date" required className="w-full h-12 px-3 rounded-md border border-slate-300" />
        </div>
        <div>
          <label htmlFor="np-follow" className="block text-sm font-medium mb-1">下次随访日期</label>
          <input id="np-follow" name="followupDate" type="date" required className="w-full h-12 px-3 rounded-md border border-slate-300" />
        </div>
      </div>
      {error._global && <p className="text-sm text-risk-high bg-red-50 border border-red-200 rounded px-3 py-2">{error._global}</p>}
      <button type="submit" disabled={submitting} className="w-full min-h-touch bg-brand-600 text-white rounded-md text-base disabled:opacity-60">{submitting ? '提交中...' : '创建患者'}</button>
    </form>
  );
}
