'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AlertHandleForm({ alertId }: { alertId: number }) {
  const router = useRouter();
  const [action, setAction] = useState<'已确认' | '已忽略' | '已升级'>('已确认');
  const [summary, setSummary] = useState('');
  const [followup, setFollowup] = useState<'' | '电话联系' | '护理指导' | '建议就医' | '复评'>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (summary.trim().length < 3) { setError('请填写处理摘要（不少于 3 字）'); return; }
    setBusy(true); setError('');
    try {
      const resp = await fetch('/geriatric-lung-cancer-care/api/nurse/alerts/' + alertId, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, summary, followupAction: followup || undefined }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || '提交失败');
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : '提交失败'); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl p-4 shadow-sm space-y-3" noValidate>
      <div>
        <span className="block text-sm font-medium mb-1">处理结果</span>
        <div className="flex gap-2">
          {(['已确认', '已忽略', '已升级'] as const).map((a) => (
            <label key={a} className="flex items-center gap-1 text-sm">
              <input type="radio" checked={action === a} onChange={() => setAction(a)} />{a}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="ah-summary">处理摘要</label>
        <textarea id="ah-summary" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} className="w-full px-3 py-2 rounded-md border border-slate-300" placeholder="如：已电话联系患者，建议近期复评。" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="ah-followup">后续动作（可选）</label>
        <select id="ah-followup" value={followup} onChange={(e) => setFollowup(e.target.value as typeof followup)} className="w-full h-12 px-3 rounded-md border border-slate-300">
          <option value="">不指定</option>
          <option value="电话联系">电话联系</option>
          <option value="护理指导">护理指导</option>
          <option value="建议就医">建议就医</option>
          <option value="复评">复评</option>
        </select>
      </div>
      {error && <p role="alert" className="text-sm text-risk-high bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
      <button type="submit" disabled={busy} className="w-full min-h-touch bg-brand-600 text-white rounded-md text-base disabled:opacity-60">{busy ? '提交中...' : '提交处理'}</button>
    </form>
  );
}
