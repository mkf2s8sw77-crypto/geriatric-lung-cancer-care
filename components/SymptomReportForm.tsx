'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const SYMPTOMS = [
  { code: 'fatigue', name: '疲乏无力' },
  { code: 'pain', name: '疼痛' },
  { code: 'dyspnea', name: '气短/呼吸困难' },
  { code: 'cough', name: '咳嗽' },
  { code: 'sleep', name: '睡眠紊乱' },
  { code: 'appetite', name: '食欲下降' },
  { code: 'mood', name: '情绪低落' },
  { code: 'nausea', name: '恶心呕吐' },
  { code: 'weight', name: '体重变化' },
  { code: 'daily', name: '日常活动受限' },
];

function defaultOccurredAt(): string {
  const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function SymptomReportForm({ patientId, actorUserId }: { patientId: number; actorUserId: number }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ alertLevel: 'low' | 'medium' | 'high' } | null>(null);
  const [code, setCode] = useState(SYMPTOMS[0].code);
  const [severity, setSeverity] = useState(3);
  const [occurredAt, setOccurredAt] = useState(defaultOccurredAt());
  const [note, setNote] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const resp = await fetch('/geriatric-lung-cancer-care/api/patient/symptoms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ symptomCode: code, severity, occurredAt, note, patientId, actorUserId }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || '提交失败');
      setResult({ alertLevel: data.alertLevel });
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const msg = result.alertLevel === 'high' ? '系统已自动生成高风险预警并通知护士；建议您尽快联系护士或就医。' : result.alertLevel === 'medium' ? '系统已生成中风险预警，护士会在班内联系您。' : '本次为低风险记录，护士会在常规随访中关注。';
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <p className="text-emerald-700 font-semibold">已提交</p>
        <p className="text-sm">{msg}</p>
        <div className="flex gap-2">
          <button onClick={() => { setResult(null); setNote(''); setSeverity(3); }} className="min-h-touch flex-1 px-3 rounded-md border border-slate-300 text-sm">再次报告</button>
          <button onClick={() => router.push('/patient')} className="min-h-touch flex-1 px-3 rounded-md bg-brand-600 text-white text-sm">返回首页</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl p-4 shadow-sm space-y-3" noValidate>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="sr-symptom">症状</label>
        <select id="sr-symptom" value={code} onChange={(e) => setCode(e.target.value)} className="w-full h-12 px-3 rounded-md border border-slate-300">
          {SYMPTOMS.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">严重程度（{severity}）</label>
        <input type="range" min={0} max={10} value={severity} onChange={(e) => setSeverity(parseInt(e.target.value))} className="w-full" />
        <div className="grid grid-cols-11 gap-1 mt-1">
          {Array.from({ length: 11 }, (_, n) => (
            <button key={n} type="button" onClick={() => setSeverity(n)} className={`min-h-touch rounded-md border text-xs ${severity === n ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-300'}`}>{n}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="sr-time">发生时间</label>
        <input id="sr-time" type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} required className="w-full h-12 px-3 rounded-md border border-slate-300" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="sr-note">备注（可选）</label>
        <textarea id="sr-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} className="w-full px-3 py-2 rounded-md border border-slate-300" />
      </div>
      {error && <p role="alert" className="text-sm text-risk-high bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
      <button type="submit" disabled={submitting} className="w-full min-h-touch bg-brand-600 text-white rounded-md text-base disabled:opacity-60">{submitting ? '提交中...' : '提交报告'}</button>
    </form>
  );
}
