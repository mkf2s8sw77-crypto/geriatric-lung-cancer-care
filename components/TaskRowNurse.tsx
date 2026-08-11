'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type T = { id: number; title: string; taskType: string; description: string; scheduledDate: string; status: string; adjustedReason: string | null };

export default function TaskRowNurse({ task }: { task: T }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(task.scheduledDate.slice(0, 10));
  const [title, setTitle] = useState(task.title);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (reason.trim().length < 5) { setError('请填写调整原因（不少于 5 字）'); return; }
    setBusy(true); setError('');
    try {
      const resp = await fetch('/geriatric-lung-cancer-care/api/nurse/tasks/' + task.id, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: '调整', reason, scheduledDate, title }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || '提交失败');
      setEditing(false);
      setReason('');
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : '提交失败'); }
    finally { setBusy(false); }
  }

  async function cancel() {
    if (reason.trim().length < 5) { setError('请填写取消原因'); return; }
    if (!confirm('确定要取消这个任务吗？')) return;
    setBusy(true); setError('');
    try {
      const resp = await fetch('/geriatric-lung-cancer-care/api/nurse/tasks/' + task.id, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: '取消', reason }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || '提交失败');
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : '提交失败'); }
    finally { setBusy(false); }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium">{task.title}</p>
          <p className="text-xs text-slate-500">{task.taskType} · {task.scheduledDate.slice(0, 10)} · {task.status}</p>
          {task.description && <p className="text-sm text-slate-600 mt-1">{task.description}</p>}
          {task.adjustedReason && <p className="text-xs text-amber-700 mt-1">调整说明：{task.adjustedReason}</p>}
        </div>
      </div>
      {editing ? (
        <div className="space-y-2">
          <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm" />
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="调整原因（必填）" className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm" />
          {error && <p className="text-xs text-risk-high">{error}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="flex-1 min-h-touch rounded-md bg-brand-600 text-white text-sm disabled:opacity-60">保存调整</button>
            <button onClick={cancel} disabled={busy} className="flex-1 min-h-touch rounded-md bg-amber-600 text-white text-sm disabled:opacity-60">取消任务</button>
            <button onClick={() => setEditing(false)} disabled={busy} className="min-h-touch px-3 rounded-md border border-slate-300 text-sm">返回</button>
          </div>
        </div>
      ) : (
        task.status !== '已取消' && (
          <button onClick={() => setEditing(true)} className="min-h-touch px-3 rounded-md border border-slate-300 text-sm">调整 / 取消</button>
        )
      )}
    </div>
  );
}
