import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { destroySession, SESSION_COOKIE, clearCookie } from '../../../../lib/auth';
import { getCurrentUser } from '../../../../lib/guard';
import { recordAudit } from '../../../../lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const user = await getCurrentUser();
  if (token) await destroySession(token);
  if (user) await recordAudit({ actorUserId: user.id, actorRole: user.role, action: '退出登录', targetType: '账号', targetId: String(user.id) });
  const res = NextResponse.json({ ok: true });
  res.headers.append('Set-Cookie', clearCookie(SESSION_COOKIE));
  return res;
}
