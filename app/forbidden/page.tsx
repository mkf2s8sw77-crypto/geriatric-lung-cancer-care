export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold text-risk-high">403 · 无访问权限</h1>
        <p className="text-slate-600">您当前的角色无权访问该页面。请使用对应账号登录。</p>
        <a href="/geriatric-lung-cancer-care/login" className="inline-block min-h-touch px-6 py-3 bg-brand-600 text-white rounded-md">返回登录</a>
      </div>
    </div>
  );
}
