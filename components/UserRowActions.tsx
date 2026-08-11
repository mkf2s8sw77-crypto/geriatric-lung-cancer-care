'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UserRowActions({ userId, isActive }: { userId: number; isActive: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function call(action: 'reset' | 'deactivate' | 'activate') {
    if (busy) return;
    if (action !== 'activate' && !confirm('确定要执行此操作吗？')) return;
    setBusy(true); setError(''); setInfo(null);
    try {
      const resp = await fetch('/geriatric-lung-cancer-care/api/admin/users/' + userId, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || '操作失败');
      if (data.newPassword) setInfo('新密码：' + data.newPassword);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : '操作失败'); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => call('reset')} disabled={busy} className="px-2 py-1 rounded border border-slate-300 text-xs disabled:opacity-60">重置密码</button>
        {isActive ? (
          <button onClick={() => call('deactivate')} disabled={busy} className="px-2 py-1 rounded border border-amber-300 text-amber-700 text-xs disabled:opacity-60">停用</button>
        ) : (
          <button onClick={() => call('activate')} disabled={busy} className="px-2 py-1 rounded border border-emerald-300 text-emerald-700 text-xs disabled:opacity-60">启用</button>
        )}
      </div>
      {info && <p className="text-xs text-emerald-700">{info}</p>}
      {error && <p className="text-xs text-risk-high">{error}</p>}
    </div>
  );
}
