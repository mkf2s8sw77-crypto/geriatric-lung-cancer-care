import { getDb } from '../db/client';
import { auditLogs } from '../db/schema';

export type AuditPayload = {
  actorUserId: number | null;
  actorRole: string | null;
  action: string;
  targetType?: string;
  targetId?: string | number;
  summary?: string;
};

export async function recordAudit(p: AuditPayload): Promise<void> {
  const db = getDb();
  await db.insert(auditLogs).values({
    actorUserId: p.actorUserId,
    actorRole: p.actorRole,
    action: p.action,
    targetType: p.targetType ?? null,
    targetId: p.targetId !== undefined ? String(p.targetId) : null,
    summary: p.summary ?? '',
  });
}
