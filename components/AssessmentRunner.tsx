'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Volume2, ChevronLeft, ChevronRight, Send, Save } from 'lucide-react';

type Item = { id: number; code: string; prompt: string; minScore: number; maxScore: number; name: string; score: number | null };
type Draft = { id: number; patientId: number; scaleId: number; scaleName: string; status: string; items: Item[] };

export default function AssessmentRunner({ initial, patientId }: { initial: Draft; patientId: number }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initial.items);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [saveHint, setSaveHint] = useState('');
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const current = items[step];
  const progress = Math.round(((step + 1) / items.length) * 100);
  const answeredCount = items.filter((it) => it.score !== null).length;
  const canPrev = step > 0;
  const canNext = step < items.length - 1;

  async function autoSave(nextItems: Item[]) {
    setSaveHint('保存中...');
    try {
      const resp = await fetch('/geriatric-lung-cancer-care/api/patient/assessments/draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: nextItems.filter((i) => i.score !== null).map((i) => ({ scaleItemId: i.id, score: i.score as number })) }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || '保存失败');
      setSaveHint('已自动保存');
    } catch (e) {
      setSaveHint('保存失败，请稍后重试');
    }
  }

  function setScore(score: number) {
    const next = items.map((it, idx) => idx === step ? { ...it, score } : it);
    setItems(next);
    autoSave(next);
  }

  function speak() {
    if (!current) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setError('当前浏览器不支持语音朗读');
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(current.prompt);
    u.lang = 'zh-CN';
    setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }

  async function onSubmit() {
    if (answeredCount < items.length) {
      setError('还有未作答的题目，请逐题完成。');
      return;
    }
    if (!confirm('提交后将不能修改，确认提交本次评估吗？')) return;
    setSubmitting(true);
    setError('');
    try {
      const resp = await fetch('/geriatric-lung-cancer-care/api/patient/assessments/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: items.map((i) => ({ scaleItemId: i.id, score: i.score as number })) }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || '提交失败');
      router.push('/patient/assessments/' + initial.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败');
      setSubmitting(false);
    }
  }

  if (!current) return null;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center text-xs text-slate-500">
          <span>第 {step + 1} / {items.length} 题</span>
          <span>{saveHint || ' '}</span>
        </div>
        <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500" style={{ width: progress + '%' }} />
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <p className="text-base font-medium leading-snug">{current.prompt}</p>
        <button type="button" onClick={speak} className="inline-flex items-center gap-2 min-h-touch min-w-touch px-3 rounded-md border border-slate-300 text-sm" disabled={speaking}>
          <Volume2 size={16} aria-hidden="true" />朗读题目
        </button>
        <fieldset className="grid grid-cols-11 gap-1.5" aria-label={`${current.name} 评分`}>
          <legend className="sr-only">评分 0 至 10</legend>
          {Array.from({ length: 11 }, (_, n) => (
            <button key={n} type="button" onClick={() => setScore(n)} aria-pressed={current.score === n} className={`min-h-touch min-w-touch rounded-md border text-sm ${current.score === n ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-300 text-slate-700'}`}>{n}</button>
          ))}
        </fieldset>
        <p className="text-xs text-slate-500">已作答 {answeredCount} / {items.length} 题</p>
      </div>

      {error && <p role="alert" className="text-sm text-risk-high bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={() => { if (canPrev) { window.speechSynthesis.cancel(); setStep(step - 1); } }} disabled={!canPrev} className="flex-1 min-h-touch px-3 rounded-md border border-slate-300 text-sm flex items-center justify-center gap-1 disabled:opacity-50">
          <ChevronLeft size={16} />上一题
        </button>
        {canNext ? (
          <button type="button" onClick={() => { window.speechSynthesis.cancel(); setStep(step + 1); }} className="flex-1 min-h-touch px-3 rounded-md bg-brand-600 text-white text-sm flex items-center justify-center gap-1">
            下一题<ChevronRight size={16} />
          </button>
        ) : (
          <button type="button" onClick={onSubmit} disabled={submitting} className="flex-1 min-h-touch px-3 rounded-md bg-brand-700 text-white text-sm flex items-center justify-center gap-1 disabled:opacity-60">
            <Send size={16} />{submitting ? '提交中...' : '提交评估'}
          </button>
        )}
      </div>
    </div>
  );
}
