'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FollowupActions({ followupId, patientId, nurseId }: { followupId: number; patientId: number; nurseId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState('');
  const [next, setNext] = useState('');
  async function complete() {
    if (summary.trim().length < 3) { alert('请填写随访摘要'); return; }
    setBusy(true);
    try {
      const resp = await fetch('/geriatric-lung-cancer-care/api/nurse/followups/' + followupId, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: '完成', summary, nextFollowupAt: next || null, patientId, nurseId }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || '提交失败');
      router.refresh();
    } catch (e) { alert(e instanceof Error ? e.message : '提交失败'); }
    finally { setBusy(false); }
  }
  return (
    <div className="mt-2 space-y-2">
      <textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="随访摘要（必填）" className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm" />
      <input type="date" value={next} onChange={(e) => setNext(e.target.value)} className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm" />
      <button onClick={complete} disabled={busy} className="w-full min-h-touch rounded-md bg-brand-600 text-white text-sm disabled:opacity-60">{busy ? '提交中...' : '标记完成'}</button>
    </div>
  );
}
