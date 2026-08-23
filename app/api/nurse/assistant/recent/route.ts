import { NextResponse } from 'next/server';
import { requireRole } from '../../../../../lib/guard';
import { listRecentQuestions } from '../../../../../lib/services/ai/agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const nurse = await requireRole('NURSE');
  const list = await listRecentQuestions(nurse.id, 5);
  return NextResponse.json({ ok: true, data: list });
}
