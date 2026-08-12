import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/client';
import { alerts, patients, interventions } from '../../db/schema';
import { recordAudit } from '../audit';

export const handleSchema = z.object({
  action: z.enum(['已确认', '已忽略', '已升级']),
  summary: z.string().trim().min(3, '请填写处理摘要').max(500),
  followupAction: z.enum(['电话联系', '护理指导', '建议就医', '复评']).optional(),
});

export async function handleAlert(alertId: number, nurseUserId: number, data: z.infer<typeof handleSchema>) {
  const db = getDb();
  const rows = await db.select().from(alerts).where(eq(alerts.id, alertId)).limit(1);
  if (rows.length === 0) throw new Error('预警不存在');
  const alert = rows[0];
  // 验证权限：护士必须是该患者的责任护士
  const pRows = await db.select().from(patients).where(eq(patients.id, alert.patientId)).limit(1);
  if (pRows.length === 0) throw new Error('患者不存在');
  if (pRows[0].primaryNurseId !== nurseUserId) throw new Error('您不是该患者的责任护士');
  if (alert.status !== '未处理') throw new Error('预警已处理，无需重复操作');

  await db.update(alerts).set({
    status: data.action,
    handlerUserId: nurseUserId,
    handledAt: new Date().toISOString(),
    summary: data.summary,
  }).where(eq(alerts.id, alertId));

  if (data.followupAction) {
    await db.insert(interventions).values({
      patientId: alert.patientId,
      nurseId: nurseUserId,
      alertId,
      actionType: data.followupAction,
      note: data.summary,
    });
  }

  await recordAudit({
    actorUserId: nurseUserId,
    actorRole: 'NURSE',
    action: '处理预警',
    targetType: '预警',
    targetId: String(alertId),
    summary: `${data.action}：${data.summary}${data.followupAction ? ' / ' + data.followupAction : ''}`,
  });
}
