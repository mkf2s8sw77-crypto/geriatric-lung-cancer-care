'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TaskAdjustForm({ patientId, nurseId, mode }: { patientId: number; nurseId: number; mode: 'new' }) {
  const router = useRouter();
  const [taskType, setTaskType] = useState('评估');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 5) { setError('请填写调整原因（不少于 5 字）'); return; }
    setBusy(true); setError('');
    try {
      const resp = await fetch('/geriatric-lung-cancer-care/api/nurse/patients/' + patientId + '/tasks', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ taskType, title, description, scheduledDate, reason, nurseId }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || '提交失败');
      router.push('/nurse/patients/' + patientId);
    } catch (e) { setError(e instanceof Error ? e.message : '提交失败'); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl p-4 shadow-sm space-y-3" noValidate>
      <div>
        <label className="block text-sm font-medium mb-1">任务类型</label>
        <select value={taskType} onChange={(e) => setTaskType(e.target.value)} className="w-full h-12 px-3 rounded-md border border-slate-300">
          {['评估', '随访', '用药', '复诊', '康复', '宣教'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">任务标题</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full h-12 px-3 rounded-md border border-slate-300" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">说明</label>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 rounded-md border border-slate-300" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">计划日期</label>
        <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required className="w-full h-12 px-3 rounded-md border border-slate-300" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">调整原因（必填）</label>
        <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} required className="w-full px-3 py-2 rounded-md border border-slate-300" placeholder="例如：患者近日症状加重，新增电话随访。" />
      </div>
      {error && <p role="alert" className="text-sm text-risk-high bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
      <button type="submit" disabled={busy} className="w-full min-h-touch bg-brand-600 text-white rounded-md text-base disabled:opacity-60">{busy ? '提交中...' : '创建任务'}</button>
    </form>
  );
}
