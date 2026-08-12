import { eq, and, desc, gte, lte, isNull, or } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { tasks, pathwaySteps, pathways, patientPathways, patients, users } from '../../db/schema';
import { recordAudit } from '../audit';

export type TaskRow = {
  id: number;
  patientId: number;
  taskType: string;
  title: string;
  description: string;
  scheduledDate: string;
  status: string;
  feedbackNote: string;
  completedAt: string | null;
  pathwayId: number | null;
  pathwayStepId: number | null;
};

export async function listPatientTasks(patientId: number): Promise<TaskRow[]> {
  const db = getDb();
  return await db.select().from(tasks).where(eq(tasks.patientId, patientId)).orderBy(desc(tasks.scheduledDate));
}

export async function listNurseTasksByPatientIds(patientIds: number[]): Promise<TaskRow[]> {
  if (patientIds.length === 0) return [];
  const db = getDb();
  const { inArray } = await import('drizzle-orm');
  return await db.select().from(tasks).where(inArray(tasks.patientId, patientIds)).orderBy(desc(tasks.scheduledDate)).limit(100);
}

export async function updatePatientTaskFeedback(taskId: number, patientId: number, status: '已完成' | '未完成' | '暂不适用', note: string, actorUserId: number, actorRole: string): Promise<void> {
  const db = getDb();
  const rows = await db.select().from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.patientId, patientId))).limit(1);
  if (rows.length === 0) throw new Error('任务不存在或不属于当前患者');
  const prev = rows[0];
  // 已取消的任务不能再被患者反馈
  if (prev.status === '已取消') throw new Error('任务已被护士取消，不能再反馈');
  await db.update(tasks).set({
    status,
    feedbackNote: note,
    completedAt: status === '已完成' ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  }).where(eq(tasks.id, taskId));
  await recordAudit({
    actorUserId,
    actorRole,
    action: '更新任务反馈',
    targetType: '任务',
    targetId: String(taskId),
    summary: `${prev.title}: ${prev.status} -> ${status}`,
  });
}

export async function adjustTaskByNurse(taskId: number, nurseUserId: number, fields: { scheduledDate?: string; title?: string; description?: string; status?: string }, reason: string): Promise<void> {
  if (!reason || reason.trim().length < 5) throw new Error('请填写调整原因（不少于 5 字）');
  const db = getDb();
  const rows = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (rows.length === 0) throw new Error('任务不存在');
  const prev = rows[0];
  // 已取消的任务不能再调整
  if (prev.status === '已取消') throw new Error('任务已被取消，不能再调整');
  const update: Record<string, unknown> = { updatedAt: new Date().toISOString(), adjustedReason: reason, adjustedFromId: prev.id };
  if (fields.scheduledDate) update.scheduledDate = fields.scheduledDate;
  if (fields.title) update.title = fields.title;
  if (fields.description !== undefined) update.description = fields.description;
  if (fields.status) update.status = fields.status;
  // 如果新状态不是已完成，清除 completed_at 保持一致性
  const newStatus = fields.status || prev.status;
  if (newStatus === '已完成') {
    // 如果当前没有 completed_at 或状态机从非已完成→已完成, 设置为当前时间
    if (!prev.completedAt || prev.status !== '已完成') {
      update.completedAt = new Date().toISOString();
    }
  } else {
    // 切到非已完成状态, 清空 completed_at 保持一致
    update.completedAt = null;
  }
  await db.update(tasks).set(update).where(eq(tasks.id, taskId));
  await recordAudit({
    actorUserId: nurseUserId,
    actorRole: 'NURSE',
    action: '人工调整任务',
    targetType: '任务',
    targetId: String(taskId),
    summary: `任务 "${prev.title}" 调整：${reason}`,
  });
}

export async function createAdjustedTask(patientId: number, nurseUserId: number, fields: { taskType: string; title: string; description?: string; scheduledDate: string }, reason: string): Promise<number> {
  if (!reason || reason.trim().length < 5) throw new Error('请填写调整原因（不少于 5 字）');
  const db = getDb();
  const inserted = await db.insert(tasks).values({
    patientId,
    taskType: fields.taskType,
    title: fields.title,
    description: fields.description || '',
    scheduledDate: fields.scheduledDate,
    status: '待完成',
    adjustedReason: reason,
  }).returning({ id: tasks.id });
  await recordAudit({
    actorUserId: nurseUserId,
    actorRole: 'NURSE',
    action: '新增任务',
    targetType: '任务',
    targetId: String(inserted[0].id),
    summary: `为患者 ${patientId} 新增任务 "${fields.title}"：${reason}`,
  });
  return inserted[0].id;
}

export async function cancelTask(taskId: number, nurseUserId: number, reason: string): Promise<void> {
  if (!reason || reason.trim().length < 5) throw new Error('请填写取消原因');
  const db = getDb();
  const rows = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (rows.length === 0) throw new Error('任务不存在');
  if (rows[0].status === '已取消') throw new Error('任务已是已取消状态');
  await db.update(tasks).set({ status: '已取消', adjustedReason: reason, updatedAt: new Date().toISOString() }).where(eq(tasks.id, taskId));
  await recordAudit({
    actorUserId: nurseUserId,
    actorRole: 'NURSE',
    action: '取消任务',
    targetType: '任务',
    targetId: String(taskId),
    summary: `取消任务 "${rows[0].title}"：${reason}`,
  });
}
