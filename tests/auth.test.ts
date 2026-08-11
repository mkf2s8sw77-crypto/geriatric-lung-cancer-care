import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, buildCookie, parseCookies, clearCookie } from '../lib/auth';

describe('auth helpers', () => {
  it('hashes and verifies password', async () => {
    const h = await hashPassword('Demo@2026');
    expect(h).not.toBe('Demo@2026');
    expect(await verifyPassword('Demo@2026', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
  });

  it('buildCookie includes Path, HttpOnly, SameSite', () => {
    const c = buildCookie('sid', 'abc');
    expect(c).toContain('sid=abc');
    expect(c).toContain('Path=/geriatric-lung-cancer-care');
    expect(c).toContain('HttpOnly');
    expect(c).toContain('SameSite=Lax');
  });

  it('clearCookie sets Max-Age=0', () => {
    const c = clearCookie('sid');
    expect(c).toContain('Max-Age=0');
    expect(c).toContain('sid=');
  });

  it('parseCookies decodes values', () => {
    const out = parseCookies('a=1; b=hello%20world');
    expect(out.a).toBe('1');
    expect(out.b).toBe('hello world');
  });
});
