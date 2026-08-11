import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '../../../../../lib/guard';
import { buildResearchCSV } from '../../../../../lib/services/admin';
import { recordAudit } from '../../../../../lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await requireRole('ADMIN');
  const sp = req.nextUrl.searchParams;
  const stage = sp.get('stage') || undefined;
  const status = sp.get('status') || undefined;
  const risk = sp.get('risk') || undefined;
  const csv = await buildResearchCSV({ stage, status, risk });
  const filename = 'research-export-' + new Date().toISOString().slice(0, 10) + '.csv';
  await recordAudit({
    actorUserId: admin.id,
    actorRole: admin.role,
    action: '导出科研 CSV',
    targetType: 'CSV',
    targetId: filename,
    summary: 'stage=' + (stage || '') + ' status=' + (status || '') + ' risk=' + (risk || ''),
  });
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="' + filename + '"',
    },
  });
}
