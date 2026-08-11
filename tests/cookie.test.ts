import { describe, it, expect } from 'vitest';
import { buildCookie, parseCookies, clearCookie, SESSION_COOKIE, COOKIE_BASE_PATH } from '../lib/auth';

describe('cookie session helpers', () => {
  it('builds session cookie with correct base path', () => {
    const c = buildCookie(SESSION_COOKIE, 'token');
    expect(c).toContain('Path=' + COOKIE_BASE_PATH);
    expect(c).toContain('HttpOnly');
    expect(c).toContain('SameSite=Lax');
  });

  it('clearCookie sets Max-Age=0', () => {
    const c = clearCookie(SESSION_COOKIE);
    expect(c).toContain('Max-Age=0');
  });

  it('parseCookies handles multiple values', () => {
    const out = parseCookies('a=1; b=hello%20world; c=');
    expect(out.a).toBe('1');
    expect(out.b).toBe('hello world');
    expect(out.c).toBe('');
  });
});
