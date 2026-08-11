'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AIAdoptControls({ analysisId }: { analysisId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  async function submit(status: '已采纳' | '部分采纳' | '未采纳') {
    setBusy(true); setError('');
    try {
      const resp = await fetch('/geriatric-lung-cancer-care/api/nurse/ai-analyses/' + analysisId, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || '提交失败');
      setShowNote(false);
      setNote('');
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : '提交失败'); }
    finally { setBusy(false); }
  }

  if (showNote) {
    return (
      <div className="space-y-2 mt-1">
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="可选：填写备注" className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs" />
        {error && <p className="text-xs text-risk-high">{error}</p>}
        <div className="flex gap-2">
          <button onClick={() => submit('已采纳')} disabled={busy} className="flex-1 min-h-touch rounded-md bg-emerald-600 text-white text-xs disabled:opacity-60">采纳</button>
          <button onClick={() => submit('部分采纳')} disabled={busy} className="flex-1 min-h-touch rounded-md bg-amber-600 text-white text-xs disabled:opacity-60">部分采纳</button>
          <button onClick={() => submit('未采纳')} disabled={busy} className="flex-1 min-h-touch rounded-md border border-slate-300 text-xs disabled:opacity-60">不采纳</button>
          <button onClick={() => setShowNote(false)} disabled={busy} className="min-h-touch px-2 rounded-md border border-slate-300 text-xs">取消</button>
        </div>
      </div>
    );
  }
  return (
    <button onClick={() => setShowNote(true)} className="mt-1 min-h-touch px-3 rounded-md border border-slate-300 text-xs">采纳决策</button>
  );
}
