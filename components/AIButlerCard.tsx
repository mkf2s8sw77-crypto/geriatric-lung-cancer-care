'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, MessageCircleHeart, BookOpen, ChevronDown } from 'lucide-react';

type Push = { id: number; pushType: string; title: string; body: string; cta: string; ctaHref: string; read: boolean; createdAt: string };
type Reply = { model: string; intent: string; userText: string; botText: string; matchedRule: string; disclaimer: string; generatedAt: string };
type HistoryItem = { id: number; userText: string; botReply: string; detectedIntent: string; createdAt: string };

const DEMO_QUESTIONS = [
  '今天要做什么？',
  '评估多久做一次？',
  '我有点焦虑',
  '推荐一篇文章看看',
  '下次随访是什么时候？',
  '谢谢',
];

const PUSH_BG: Record<string, string> = {
  '今日任务': 'bg-amber-50 border-amber-200',
  '评估到期': 'bg-violet-50 border-violet-200',
  '随访临近': 'bg-sky-50 border-sky-200',
  '宣教推荐': 'bg-emerald-50 border-emerald-200',
  '心情打卡': 'bg-rose-50 border-rose-200',
};

const PUSH_ICON: Record<string, string> = {
  '今日任务': '📋',
  '评估到期': '📝',
  '随访临近': '📞',
  '宣教推荐': '📚',
  '心情打卡': '💗',
};

export default function AIButlerCard({ patientName }: { patientName: string }) {
  const [pushes, setPushes] = useState<Push[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [p1, p2] = await Promise.all([
        fetch('/geriatric-lung-cancer-care/api/patient/butler/pushes').then((r) => r.json()),
        fetch('/geriatric-lung-cancer-care/api/patient/butler/history').then((r) => r.json()),
      ]);
      if (p1.ok) setPushes(p1.data);
      if (p2.ok) setHistory(p2.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadAll(); }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  async function send(t?: string) {
    const userText = (t ?? text).trim();
    if (!userText) return;
    setBusy(true);
    setError(null);
    setText('');
    // 立即追加用户消息
    const tempUser: HistoryItem = { id: -Date.now(), userText, botReply: '', detectedIntent: 'pending', createdAt: new Date().toISOString() };
    setHistory((h) => [tempUser, ...h]);
    try {
      const r = await fetch('/geriatric-lung-cancer-care/api/patient/butler/send', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: userText }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || '发送失败');
      const reply: Reply = j.data.reply;
      // 替换临时消息
      setHistory((h) => h.map((m) => m.id === tempUser.id ? { id: j.data.id, userText, botReply: reply.botText, detectedIntent: reply.intent, createdAt: reply.generatedAt } : m));
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败');
      setHistory((h) => h.filter((m) => m.id !== tempUser.id));
    } finally {
      setBusy(false);
    }
  }

  async function markRead(pushId: number) {
    try {
      await fetch('/geriatric-lung-cancer-care/api/patient/butler/mark-read', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pushId }),
      });
      setPushes((p) => p.map((x) => x.id === pushId ? { ...x, read: true } : x));
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-4">
      {/* 拟人化头部 */}
      <section className="bg-gradient-to-br from-brand-50 to-white border border-brand-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
        <div className="relative w-14 h-14 rounded-full bg-brand-600 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
          🦐
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-brand-700">小龙虾 · 您的健康管家</h2>
          <p className="text-xs text-slate-500 mt-0.5">在线 · 由 mock AI 演示引擎驱动（不接真实 API）</p>
        </div>
        <span className="text-[10px] text-slate-400">model: {`mock-butler-v1`}</span>
      </section>

      {/* 推送卡片 */}
      <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">📬 今日推送</h3>
        {loading ? <p className="text-sm text-slate-500">加载中…</p> : pushes.length === 0 ? (
          <p className="text-sm text-slate-500">今日暂无新推送。</p>
        ) : (
          <ul className="space-y-2">
            {pushes.map((p) => (
              <li key={p.id} className={`border rounded-md p-3 ${PUSH_BG[p.pushType] || 'bg-slate-50 border-slate-200'} ${p.read ? 'opacity-70' : ''}`}>
                <div className="flex items-start gap-2">
                  <span className="text-xl shrink-0" aria-hidden="true">{PUSH_ICON[p.pushType] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">{p.title}</span>
                      <span className="text-[10px] text-slate-400">{p.createdAt.slice(11, 16)}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{p.body}</p>
                    {p.cta && p.ctaHref && (
                      <div className="mt-2 flex items-center gap-2">
                        <a
                          href={p.ctaHref.startsWith('/') ? `/geriatric-lung-cancer-care${p.ctaHref}` : p.ctaHref}
                          onClick={() => void markRead(p.id)}
                          className="inline-flex min-h-touch items-center px-3 rounded-md bg-brand-600 text-white text-xs"
                        >
                          {p.cta}
                        </a>
                        {!p.read && (
                          <button onClick={() => void markRead(p.id)} className="text-xs text-slate-500 underline">
                            标记已读
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 对话区 */}
      <section className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <MessageCircleHeart size={16} aria-hidden="true" /> 自由对话（演示）
        </h3>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">还没有对话，试着说点什么？</p>
          ) : (
            history.map((m) => (
              <div key={m.id} className="space-y-1">
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-brand-600 text-white text-sm rounded-2xl rounded-tr-sm px-3 py-2">
                    {m.userText}
                  </div>
                </div>
                {m.botReply && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%]">
                      <div className="bg-white border border-slate-200 text-sm rounded-2xl rounded-tl-sm px-3 py-2 text-slate-800">
                        {m.botReply}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <span>意图：{m.detectedIntent}</span>
                        <span>·</span>
                        <span>{m.createdAt.slice(11, 16)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEnd} />
        </div>
        {error && <p className="text-xs text-risk-high">{error}</p>}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !busy) void send(); }}
            placeholder="试着说：今天要做什么？我有点累…"
            className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-sm"
            maxLength={500}
            disabled={busy}
          />
          <button
            onClick={() => void send()}
            disabled={busy || !text.trim()}
            className="min-h-touch px-3 rounded-md bg-brand-600 text-white text-sm flex items-center gap-1 disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            发送
          </button>
        </div>
        <button onClick={() => setShowDemo((v) => !v)} className="text-xs text-slate-500 flex items-center gap-1">
          <ChevronDown size={12} className={`transition-transform ${showDemo ? 'rotate-180' : ''}`} /> 常见问题（演示用）
        </button>
        {showDemo && (
          <div className="flex flex-wrap gap-1.5">
            {DEMO_QUESTIONS.map((q) => (
              <button key={q} onClick={() => void send(q)} className="px-2 py-1 rounded-full border border-slate-300 text-slate-700 text-xs hover:bg-slate-50">
                {q}
              </button>
            ))}
          </div>
        )}
      </section>

      <p className="text-[10px] text-slate-400 text-center">{`本助手由 mock-butler-v1 演示引擎生成回复。${`回复由预置模板生成，不构成医疗建议。紧急情况请联系护士或就医。`}`}</p>
    </div>
  );
}
