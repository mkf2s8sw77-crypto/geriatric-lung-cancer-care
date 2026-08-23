import { NextResponse } from 'next/server';
import { requireRole } from '../../../../../lib/guard';
import { listKBCategories, listKBByCategory } from '../../../../../lib/services/ai/agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await requireRole('NURSE');
  const cats = await listKBCategories();
  const items = await listKBByCategory();
  return NextResponse.json({ ok: true, data: { categories: cats, items } });
}
