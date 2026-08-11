import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../../../db/client';
import { users } from '../../../../db/schema';
import { verifyPassword, createSession, buildCookie, SESSION_COOKIE, SESSION_TTL_MS, roleHomePath } from '../../../../lib/auth';
import { recordAudit } from '../../../../lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: '请求体不是合法 JSON' }, { status: 400 });
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: '请填写账号与密码' }, { status: 400 });
  }
  const { username, password } = parsed.data;
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
  const user = rows[0];
  if (!user || !user.isActive) {
    await recordAudit({ actorUserId: null, actorRole: null, action: '登录失败', targetType: '账号', targetId: username, summary: '账号不存在或已停用' });
    return NextResponse.json({ ok: false, error: '账号或密码错误' }, { status: 401 });
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await recordAudit({ actorUserId: user.id, actorRole: user.role, action: '登录失败', targetType: '账号', targetId: String(user.id), summary: '密码错误' });
    return NextResponse.json({ ok: false, error: '账号或密码错误' }, { status: 401 });
  }
  const token = await createSession(user.id);
  await db.update(users).set({ lastLoginAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(users.id, user.id));
  await recordAudit({ actorUserId: user.id, actorRole: user.role, action: '登录成功', targetType: '账号', targetId: String(user.id) });
  const cookie = buildCookie(SESSION_COOKIE, token, { maxAge: Math.floor(SESSION_TTL_MS / 1000), httpOnly: true, sameSite: 'Lax' });
  const res = NextResponse.json({ ok: true, role: user.role, redirect: roleHomePath(user.role as 'ADMIN' | 'NURSE' | 'PATIENT') });
  res.headers.append('Set-Cookie', cookie);
  return res;
}
