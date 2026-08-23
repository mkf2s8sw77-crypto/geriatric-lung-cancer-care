'use client';

import { useState } from 'react';
import { Loader2, GitCompare } from 'lucide-react';

type AIAnalysisOutputLite = {
  model: string;
  style: 'balanced' | 'conservative' | 'proactive';
  level: 'low' | 'medium' | 'high';
  levelLabel: string;
  summary: string;
  levelColor: 'green' | 'amber' | 'red';
  advice: Array<{ action: string; evidence: string }>;
  followup: Array<{ timing: string; channel: string; focus: string }>;
  evidence: string[];
  patientHint: string;
  disclaimer: string;
};

type CompareResponse = {
  ok: boolean;
  data?: {
    assessmentId: number;
    input: { total: number; top: number; topName: string; topCode: string };
    outputs: { balanced: AIAnalysisOutputLite; conservative: AIAnalysisOutputLite; proactive: AIAnalysisOutputLite };
  };
  error?: string;
};

const STYLE_LABEL: Record<string, string> = {
  balanced: '平衡型',
  conservative: '保守型',
  proactive: '积极型',
};

const BG: Record<string, string> = {
  green: 'bg-emerald-50 border-emerald-300 text-emerald-700',
  amber: 'bg-amber-50 border-amber-300 text-amber-700',
  red: 'bg-red-50 border-red-300 text-red-700',
};

export default function AIAnalysisCompare({ patientId, patientName }: { patientId: number; patientName: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CompareResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/geriatric-lung-cancer-care/api/nurse/ai-analyses/compare?patientId=${patientId}`);
      const json: CompareResponse = await resp.json();
      if (!resp.ok || !json.ok) throw new Error(json.error || '加载失败');
      setData(json.data || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-t border-slate-200 pt-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <GitCompare size={16} aria-hidden="true" /> 3 种风格对比（演示）
        </h3>
        {!data && (
          <button onClick={load} disabled={loading} className="min-h-touch px-3 rounded-md bg-brand-600 text-white text-xs flex items-center gap-1 disabled:opacity-60">
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {loading ? '加载中…' : '展开对比'}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-risk-high">{error}</p>}
      {data && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            基于 {patientName} 最近一次评估（总分 {data.input.total}、主要症状 {data.input.topName} {data.input.top} 分），分别用三种风格生成演示结果，仅供对比学习，不会写入数据库。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {(['balanced', 'conservative', 'proactive'] as const).map((k) => {
              const o = data.outputs[k];
              const bg = BG[o.levelColor] || BG.amber;
              return (
                <div key={k} className="border border-slate-200 rounded-md p-2 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">{STYLE_LABEL[k]}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${bg}`}>{o.levelLabel}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{o.model}</div>
                  <p className="text-xs text-slate-700">{o.summary}</p>
                  <div>
                    <div className="text-[10px] font-semibold text-slate-600 mt-1">建议（首条）</div>
                    <p className="text-[10px] text-slate-600">{o.advice[0]?.action}</p>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-slate-600 mt-1">随访（首条）</div>
                    <p className="text-[10px] text-slate-600">{o.followup[0]?.timing} · {o.followup[0]?.channel}</p>
                  </div>
                  <details className="text-[10px]">
                    <summary className="cursor-pointer text-slate-500">证据</summary>
                    <ul className="mt-1 space-y-0.5 text-slate-500">
                      {o.evidence.map((e, i) => (
                        <li key={i}>· {e}</li>
                      ))}
                    </ul>
                  </details>
                  <div className="text-[10px] text-blue-700">📱 {o.patientHint}</div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 italic">{data.outputs.balanced.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
