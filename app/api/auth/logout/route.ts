import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { destroySession, SESSION_COOKIE, clearCookie, COOKIE_BASE_PATH } from '../../../../lib/auth';
import { getCurrentUser } from '../../../../lib/guard';
import { recordAudit } from '../../../../lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const user = await getCurrentUser();
  if (token) await destroySession(token);
  if (user) await recordAudit({ actorUserId: user.id, actorRole: user.role, action: '退出登录', targetType: '账号', targetId: String(user.id) });

  // 表单提交场景：浏览器跟随 303 重定向回登录页；
  // fetch/AJAX 场景：JSON 返回，调用方自行处理。
  const accept = req.headers.get('accept') || '';
  const isFormPost = req.headers.get('content-type')?.includes('application/x-www-form-urlencoded') || req.headers.get('content-type')?.includes('multipart/form-data');
  if (isFormPost || accept.includes('text/html')) {
    const res = NextResponse.redirect(new URL(COOKIE_BASE_PATH + '/login', req.url), { status: 303 });
    res.headers.append('Set-Cookie', clearCookie(SESSION_COOKIE));
    return res;
  }
  const res = NextResponse.json({ ok: true });
  res.headers.append('Set-Cookie', clearCookie(SESSION_COOKIE));
  return res;
}
