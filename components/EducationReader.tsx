'use client';
import { useState } from 'react';
import { Volume2, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function EducationReader({ resourceId, patientId, body, confirmed }: { resourceId: number; patientId: number; body: string; confirmed: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [confirmedState, setConfirmedState] = useState(confirmed);
  const [error, setError] = useState('');

  function speak() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setError('当前浏览器不支持语音朗读');
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(body);
    u.lang = 'zh-CN';
    setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }

  async function confirm() {
    setBusy(true); setError('');
    try {
      const resp = await fetch('/geriatric-lung-cancer-care/api/patient/education/' + resourceId + '/confirm', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ patientId }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || '确认失败');
      setConfirmedState(true);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : '确认失败'); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="whitespace-pre-line leading-relaxed text-base">{body}</p>
      </div>
      {error && <p role="alert" className="text-sm text-risk-high bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
      <div className="flex gap-2">
        <button onClick={speak} disabled={speaking} className="flex-1 min-h-touch px-3 rounded-md border border-slate-300 flex items-center justify-center gap-1">
          <Volume2 size={16} aria-hidden="true" />朗读
        </button>
        <button onClick={confirm} disabled={busy || confirmedState} className="flex-1 min-h-touch px-3 rounded-md bg-brand-600 text-white flex items-center justify-center gap-1 disabled:opacity-60">
          <Check size={16} aria-hidden="true" />{confirmedState ? '已确认' : busy ? '提交中...' : '确认已读'}
        </button>
      </div>
    </div>
  );
}
