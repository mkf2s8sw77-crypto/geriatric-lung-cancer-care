'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Item = { id: number; code: string; prompt: string; minScore: number; maxScore: number; name: string };

export default function NurseAssessmentRunner({ patientId, patientName, items }: { patientId: number; patientName: string; items: Item[] }) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<number, number | null>>({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ totalScore: number; riskLevel: 'low' | 'medium' | 'high' } | null>(null);

  const allAnswered = items.every((it) => scores[it.id] !== undefined && scores[it.id] !== null);

  async function submit() {
    if (!allAnswered) { setError('请为每道题选择一个分数'); return; }
    if (!confirm('代填提交后将不可修改，确认提交吗？')) return;
    setBusy(true); setError('');
    try {
      const resp = await fetch('/geriatric-lung-cancer-care/api/nurse/patients/' + patientId + '/assessments', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: items.map((it) => ({ scaleItemId: it.id, score: scores[it.id] as number })), note }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || '提交失败');
      setResult({ totalScore: data.totalScore, riskLevel: data.riskLevel });
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败');
    } finally { setBusy(false); }
  }

  if (result) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <p className="text-emerald-700 font-semibold">已为 {patientName} 代填评估</p>
        <p className="text-sm">总分：<span className="font-semibold text-2xl">{result.totalScore}</span></p>
        <p className="text-sm">风险：{result.riskLevel === 'high' ? '高风险' : result.riskLevel === 'medium' ? '中风险' : '低风险'}</p>
        <p className="text-xs text-amber-700">本结果为演示评估，须经医护人员确认。</p>
        <button onClick={() => router.push('/nurse/patients/' + patientId)} className="min-h-touch px-4 rounded-md bg-brand-600 text-white text-sm">返回患者详情</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <div key={it.id} className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-500">第 {idx + 1} / {items.length} 题</span>
            <span className="text-xs text-slate-500">{it.name}</span>
          </div>
          <p className="text-base font-medium leading-snug">{it.prompt}</p>
          <fieldset className="grid grid-cols-11 gap-1">
            {Array.from({ length: 11 }, (_, n) => (
              <button key={n} type="button" onClick={() => setScores((s) => ({ ...s, [it.id]: n }))} aria-pressed={scores[it.id] === n} className={`min-h-touch min-w-touch rounded-md border text-sm ${scores[it.id] === n ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-300'}`}>{n}</button>
            ))}
          </fieldset>
        </div>
      ))}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <label className="block text-sm font-medium">备注（可选）</label>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-3 py-2 rounded-md border border-slate-300" placeholder="代填原因或观察" />
      </div>
      {error && <p className="text-sm text-risk-high bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
      <button onClick={submit} disabled={busy || !allAnswered} className="w-full min-h-touch bg-brand-600 text-white rounded-md text-base disabled:opacity-60">{busy ? '提交中...' : '代填并提交'}</button>
    </div>
  );
}
