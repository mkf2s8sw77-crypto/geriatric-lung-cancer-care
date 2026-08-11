import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE_BASE_PATH, SESSION_COOKIE, findUserBySessionToken, type Role, type SessionUser } from './auth';

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value || null;
  return findUserBySessionToken(token);
}

export async function requireUser(role?: Role): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (role && user.role !== role) redirect('/forbidden');
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!roles.includes(user.role)) redirect('/forbidden');
  return user;
}

export function getBasePath(): string {
  return process.env.APP_BASE_PATH || COOKIE_BASE_PATH;
}
