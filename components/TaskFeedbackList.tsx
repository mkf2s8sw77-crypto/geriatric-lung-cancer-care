'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type T = { id: number; taskType: string; title: string; description: string; scheduledDate: string; status: string; feedbackNote: string };

function statusLabel(s: string): { text: string; cls: string } {
  if (s === '已完成') return { text: '已完成', cls: 'bg-emerald-100 text-emerald-700' };
  if (s === '未完成') return { text: '逾期', cls: 'bg-red-100 text-red-700' };
  if (s === '暂不适用') return { text: '暂不适用', cls: 'bg-slate-100 text-slate-600' };
  if (s === '已取消') return { text: '已取消', cls: 'bg-slate-100 text-slate-500' };
  return { text: '待完成', cls: 'bg-amber-50 text-amber-700' };
}

export default function TaskFeedbackList({ patientId, actorUserId, tasks }: { patientId: number; actorUserId: number; tasks: T[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const filtered = tasks.filter((t) => filter === 'all' ? true : filter === 'pending' ? (t.status === '待完成' || t.status === '未完成') : (t.status === '已完成' || t.status === '暂不适用' || t.status === '已取消'));

  async function submit(id: number, status: '已完成' | '未完成' | '暂不适用', note: string) {
    setBusy(id); setError('');
    try {
      const resp = await fetch('/geriatric-lung-cancer-care/api/patient/tasks/' + id, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, note, patientId, actorUserId }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || '提交失败');
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : '提交失败'); }
    finally { setBusy(null); }
  }

  if (tasks.length === 0) return <p className="bg-white rounded-xl p-4 text-sm text-slate-500 shadow-sm">暂无任务。</p>;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {(['all', 'pending', 'completed'] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={`min-h-touch px-3 rounded-full text-sm border ${filter === k ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-700 border-slate-300'}`}>{k === 'all' ? '全部' : k === 'pending' ? '待完成' : '已完成/不适'}</button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-risk-high bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
      <ul className="space-y-2">
        {filtered.map((t) => {
          const sl = statusLabel(t.status);
          return (
            <li key={t.id} className="bg-white rounded-xl p-3 shadow-sm space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-base font-medium">{t.title}</p>
                  <p className="text-xs text-slate-500">{t.taskType} · {t.scheduledDate.slice(0, 10)}</p>
                  {t.description && <p className="text-sm text-slate-600 mt-1">{t.description}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${sl.cls}`}>{sl.text}</span>
              </div>
              {(t.status === '待完成' || t.status === '未完成') && (
                <FeedbackForm taskId={t.id} onSubmit={submit} busy={busy === t.id} />
              )}
              {t.feedbackNote && <p className="text-xs text-slate-500">反馈：{t.feedbackNote}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FeedbackForm({ taskId, onSubmit, busy }: { taskId: number; onSubmit: (id: number, s: '已完成' | '未完成' | '暂不适用', note: string) => void; busy: boolean }) {
  const [note, setNote] = useState('');
  return (
    <div className="space-y-2">
      <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="可选：补充反馈说明" className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm" />
      <div className="flex gap-2">
        <button disabled={busy} onClick={() => onSubmit(taskId, '已完成', note)} className="flex-1 min-h-touch rounded-md bg-emerald-600 text-white text-sm disabled:opacity-60">已完成</button>
        <button disabled={busy} onClick={() => onSubmit(taskId, '未完成', note)} className="flex-1 min-h-touch rounded-md bg-amber-600 text-white text-sm disabled:opacity-60">未完成</button>
        <button disabled={busy} onClick={() => onSubmit(taskId, '暂不适用', note)} className="flex-1 min-h-touch rounded-md border border-slate-300 text-sm disabled:opacity-60">暂不适用</button>
      </div>
    </div>
  );
}
