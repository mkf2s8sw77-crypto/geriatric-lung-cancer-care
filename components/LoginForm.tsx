'use client';
import { useState } from 'react';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const resp = await fetch('/geriatric-lung-cancer-care/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setError(data.error || '登录失败，请稍后重试');
        setSubmitting(false);
        return;
      }
      // redirect 已包含 basePath 前缀
      window.location.href = '/geriatric-lung-cancer-care' + data.redirect;
    } catch {
      setError('网络异常，请稍后重试');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="login-username" className="block text-sm font-medium text-slate-700 mb-1">账号</label>
        <input id="login-username" data-testid="login-username" type="text" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full h-12 px-3 rounded-md border border-slate-300 focus:border-brand-500 focus:outline-none text-base" />
      </div>
      <div>
        <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-1">密码</label>
        <input id="login-password" data-testid="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-12 px-3 rounded-md border border-slate-300 focus:border-brand-500 focus:outline-none text-base" />
      </div>
      {error && <p role="alert" className="text-sm text-risk-high bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
      <button type="submit" disabled={submitting} data-testid="login-submit" className="w-full min-h-touch bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium rounded-md text-base">
        {submitting ? '登录中...' : '登录'}
      </button>
      <p className="text-xs text-slate-400 text-center">登录入口仅供演示账号使用；正式使用请联系护士或管理员。</p>
    </form>
  );
}
