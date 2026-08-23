'use client';

import { useState, useEffect } from 'react';
import { Send, Loader2, Brain } from 'lucide-react';

type AgentAnswer = {
  model: string;
  question: string;
  matches: Array<{ id: number; title: string; category: string; score: number; snippet: string; highlightTerms: string[] }>;
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number;
  citations: Array<{ id: number; title: string; source: string; category: string }>;
  disclaimer: string;
  generatedAt: string;
};

type KBCat = { category: string; count: number };
type RecentQ = { id: number; question: string; confidence: string; confidenceScore: number; createdAt: string };

const DEMO_QUESTIONS = [
  '吸痰时负压应该是多少？',
  '压力性损伤怎么分期？',
  '化疗药物外渗怎么处理？',
  '老年肿瘤患者每日蛋白质补充多少？',
  '焦虑情绪怎么识别？',
  '化疗期间口腔黏膜炎怎么护理？',
  '敷料多久换一次？',
  '失眠患者如何护理？',
];

const CONFIDENCE_BG: Record<string, string> = {
  high: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  medium: 'bg-amber-50 text-amber-700 border-amber-300',
  low: 'bg-slate-50 text-slate-600 border-slate-300',
};
const CONFIDENCE_LABEL: Record<string, string> = { high: '高置信度', medium: '中置信度', low: '低置信度' };

export default function AIKnowledgePanel() {
  const [categories, setCategories] = useState<KBCat[]>([]);
  const [recent, setRecent] = useState<RecentQ[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const r1 = await fetch('/geriatric-lung-cancer-care/api/nurse/assistant/categories');
        const j1 = await r1.json();
        if (j1.ok) setCategories(j1.data.categories);
        const r2 = await fetch('/geriatric-lung-cancer-care/api/nurse/assistant/recent');
        const j2 = await r2.json();
        if (j2.ok) setRecent(j2.data);
      } catch { /* ignore */ }
    })();
  }, []);

  async function submit(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setQuestion(q);
    try {
      const r = await fetch('/geriatric-lung-cancer-care/api/nurse/assistant/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q.trim() }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || '请求失败');
      setResult(j.data.answer);
      // refresh recent
      try {
        const r2 = await fetch('/geriatric-lung-cancer-care/api/nurse/assistant/recent');
        const j2 = await r2.json();
        if (j2.ok) setRecent(j2.data);
      } catch { /* ignore */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : '请求失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <section className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Brain size={18} aria-hidden="true" /> AI 知识库智能体（mock-kb-agent-v1）
          </h2>
          <span className="text-xs text-slate-500">{categories.reduce((s, c) => s + c.count, 0)} 条审核条目</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <span key={c.category} className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              {c.category} · {c.count}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void submit(question); }}
            placeholder="输入护理问题，例如：吸痰时负压应该是多少？"
            className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-sm"
            maxLength={500}
          />
          <button
            onClick={() => void submit(question)}
            disabled={loading || !question.trim()}
            className="min-h-touch px-3 rounded-md bg-brand-600 text-white text-sm flex items-center gap-1 disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            提问
          </button>
        </div>
        {showDemo && (
          <details className="text-xs">
            <summary className="cursor-pointer text-slate-500">试试这些问题（演示用）</summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DEMO_QUESTIONS.map((q) => (
                <button key={q} onClick={() => void submit(q)} className="px-2 py-1 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50">
                  {q}
                </button>
              ))}
            </div>
          </details>
        )}
      </section>

      {error && <p className="text-sm text-risk-high bg-red-50 border border-red-200 rounded-md p-2">{error}</p>}

      {result && (
        <section className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${CONFIDENCE_BG[result.confidence] || CONFIDENCE_BG.low}`}>
              {CONFIDENCE_LABEL[result.confidence]} · {result.confidenceScore.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500">模型：{result.model}</span>
            <span className="text-xs text-slate-400 ml-auto">{new Date(result.generatedAt).toLocaleString('zh-CN', { hour12: false })}</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-800">问题：{result.question}</h3>
          <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{result.answer}</div>
          {result.citations.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-500">查看引用知识库（{result.citations.length}）</summary>
              <ul className="mt-2 space-y-1">
                {result.citations.map((c) => (
                  <li key={c.id} className="border border-slate-200 rounded p-2 bg-slate-50">
                    <div className="font-medium text-slate-700">[{c.category}] 《{c.title}》</div>
                    <div className="text-slate-500 mt-0.5">来源：{c.source}</div>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <p className="text-xs text-slate-400 italic">{result.disclaimer}</p>
        </section>
      )}

      <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">最近提问（{recent.length}）</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">暂无记录。</p>
        ) : (
          <ul className="space-y-1">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-xs border-b border-slate-100 pb-1 last:border-0">
                <span className="text-slate-700 truncate max-w-[60%]">{r.question}</span>
                <span className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${CONFIDENCE_BG[r.confidence] || CONFIDENCE_BG.low}`}>
                    {CONFIDENCE_LABEL[r.confidence] || r.confidence}
                  </span>
                  <span className="text-slate-400">{r.createdAt.slice(11, 16)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
