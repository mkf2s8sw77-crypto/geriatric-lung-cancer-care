import { NextResponse } from 'next/server';
import { getRawSqlite, closeDb } from '../../../db/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  let ok = true;
  let detail = 'ok';
  try {
    const sqlite = getRawSqlite();
    const r = sqlite.prepare("SELECT count(*) as c FROM users").get() as { c: number };
    if (typeof r.c !== 'number') {
      ok = false;
      detail = 'users count failed';
    }
  } catch (e) {
    ok = false;
    detail = 'sqlite read failed';
  } finally {
    try { closeDb(); } catch { /* ignore */ }
  }
  return NextResponse.json({
    status: ok ? 'ok' : 'degraded',
    detail,
    service: 'geriatric-lung-cancer-care',
    aiMode: process.env.AI_MODE || 'mock',
    timestamp: new Date().toISOString(),
  }, { status: ok ? 200 : 503 });
}
