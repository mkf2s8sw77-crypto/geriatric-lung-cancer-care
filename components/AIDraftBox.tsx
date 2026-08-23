'use client';

import { useState } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';

type Props = {
  title?: string;
  initialText?: string;
  type: 'alert' | 'followup';
  refId: number;
  endpoint: string;
};

export default function AIDraftBox({ title, initialText = '', type, refId, endpoint }: Props) {
  const [text, setText] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(endpoint, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(type === 'alert' ? { alertId: refId } : { followupId: refId }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || '生成失败');
      setText(j.data.draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  return (
    <div className="border border-slate-200 rounded-md bg-amber-50/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <Sparkles size={12} className="text-amber-500" /> {title || 'AI 草稿（演示）'}
        </span>
        <div className="flex gap-1">
          <button onClick={() => void generate()} disabled={loading} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-600 text-white disabled:opacity-60">
            {loading ? '生成中…' : text ? '重新生成' : '生成草稿'}
          </button>
          {text && (
            <button onClick={() => void copy()} className="text-[10px] px-2 py-0.5 rounded-full border border-slate-300 text-slate-600 flex items-center gap-1">
              {copied ? <Check size={10} /> : <Copy size={10} />}
              {copied ? '已复制' : '复制'}
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-risk-high">{error}</p>}
      {text ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={Math.min(12, Math.max(6, text.split('\n').length))}
          className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 font-mono leading-relaxed bg-white"
        />
      ) : (
        <p className="text-xs text-slate-500">点击「生成草稿」由 mock 智能体拼接处置建议；本结果须由责任护士确认后使用。</p>
      )}
    </div>
  );
}
