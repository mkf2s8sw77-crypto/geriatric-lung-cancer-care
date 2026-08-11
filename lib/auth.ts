import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { eq, and, gt } from 'drizzle-orm';
import { getDb } from '../db/client';
import { users, sessions } from '../db/schema';

export const SESSION_COOKIE = 'glcc_sid';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 天
export const COOKIE_BASE_PATH = process.env.APP_BASE_PATH || '/geriatric-lung-cancer-care';

export type Role = 'PATIENT' | 'NURSE' | 'ADMIN';

export type SessionUser = {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  isActive: boolean;
};

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: number): Promise<string> {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await db.insert(sessions).values({ userId, tokenHash, expiresAt });
  return token;
}

export async function destroySession(token: string): Promise<void> {
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export async function findUserBySessionToken(token: string | null | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const db = getDb();
  const nowIso = new Date().toISOString();
  const rows = await db
    .select({ id: users.id, username: users.username, displayName: users.displayName, role: users.role, isActive: users.isActive })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, nowIso)))
    .limit(1);
  if (rows.length === 0) return null;
  const u = rows[0];
  if (!u.isActive) return null;
  return { id: u.id, username: u.username, displayName: u.displayName, role: u.role as Role, isActive: u.isActive };
}

export function roleHomePath(role: Role): string {
  switch (role) {
    case 'ADMIN': return '/admin';
    case 'NURSE': return '/nurse';
    case 'PATIENT': return '/patient';
  }
}

export function isRole(u: SessionUser | null, role: Role): u is SessionUser {
  return !!u && u.role === role;
}

export function buildCookie(name: string, value: string, opts: { maxAge?: number; expires?: Date; httpOnly?: boolean; sameSite?: 'Lax' | 'Strict' | 'None'; path?: string; } = {}): string {
  const parts = [ `${name}=${value}` ];
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  parts.push(`Path=${opts.path || COOKIE_BASE_PATH}`);
  parts.push('HttpOnly');
  parts.push(`SameSite=${opts.sameSite || 'Lax'}`);
  return parts.join('; ');
}

export function clearCookie(name: string, path = COOKIE_BASE_PATH): string {
  return `${name}=; Max-Age=0; Path=${path}; HttpOnly; SameSite=Lax`;
}

export function parseCookies(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join('='));
  }
  return out;
}
