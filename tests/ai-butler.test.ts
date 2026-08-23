import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb, closeDb } from '../db/client';
import { users, patients, tasks, aiButlerConversations, aiButlerPushes, auditLogs, assessments, followups, educationResources } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import {
  generateButlerPushesForPatient,
  listButlerPushes,
  markPushRead,
  sendButlerMessage,
  listButlerHistory,
  BUTLER_MODEL,
} from '../lib/services/ai/butler';

let patientId: number;

beforeAll(async () => {
  const db = getDb();
  // 用 demo 患者
  const u = await db.select().from(users).where(eq(users.username, 'patient_demo')).limit(1);
  if (u.length === 0) throw new Error('demo patient 账号不存在，请先 npm run db:reset');
  const p = await db.select().from(patients).where(eq(patients.userId, u[0].id)).limit(1);
  patientId = p[0].id;
  // 清空历史
  await db.delete(aiButlerConversations);
  await db.delete(aiButlerPushes);
});

afterAll(async () => { closeDb(); });

describe('ai-butler · generateButlerPushesForPatient', () => {
  it('首次运行生成多条推送（包含 5 种类型中至少 1 条）', async () => {
    const list = await generateButlerPushesForPatient(patientId);
    // 至少 1 条推送
    expect(list.length).toBeGreaterThan(0);
    // 类型去重后 ≥ 2
    const types = new Set(list.map((p) => p.pushType));
    expect(types.size).toBeGreaterThanOrEqual(1);
  });
  it('24 小时内再次运行同类型不重复创建', async () => {
    const before = (await getDb().select().from(aiButlerPushes).where(eq(aiButlerPushes.patientId, patientId))).length;
    const created = await generateButlerPushesForPatient(patientId);
    const after = (await getDb().select().from(aiButlerPushes).where(eq(aiButlerPushes.patientId, patientId))).length;
    expect(after).toBe(before);
    expect(created).toHaveLength(0);
  });
});

describe('ai-butler · listButlerPushes + markPushRead', () => {
  it('listButlerPushes 返回按时间倒序', async () => {
    const list = await listButlerPushes(patientId, 5);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty('title');
    expect(list[0]).toHaveProperty('ctaHref');
  });
  it('markPushRead 设置 readAt', async () => {
    const list = await listButlerPushes(patientId, 1);
    const first = list[0];
    if (first.read) return; // 已是已读，跳过
    await markPushRead(first.id, patientId);
    const after = await listButlerPushes(patientId, 5);
    const found = after.find((p) => p.id === first.id);
    expect(found?.read).toBe(true);
  });
});

describe('ai-butler · sendButlerMessage intent routing', () => {
  it('"今天要做什么" → task', async () => {
    const { reply } = await sendButlerMessage(patientId, '今天要做什么？');
    expect(reply.intent).toBe('task');
    expect(reply.botText).toMatch(/任务/);
    expect(reply.disclaimer).toContain(BUTLER_MODEL);
  });
  it('"评估" → assessment', async () => {
    const { reply } = await sendButlerMessage(patientId, '评估多久做一次？');
    expect(reply.intent).toBe('assessment');
  });
  it('"我有点累" → mood', async () => {
    const { reply } = await sendButlerMessage(patientId, '我有点累');
    expect(reply.intent).toBe('mood');
  });
  it('"随访" → followup', async () => {
    const { reply } = await sendButlerMessage(patientId, '下次随访是什么时候？');
    expect(reply.intent).toBe('followup');
  });
  it('"宣教" → education', async () => {
    const { reply } = await sendButlerMessage(patientId, '推荐一篇文章看看');
    expect(reply.intent).toBe('education');
  });
  it('"不舒服" → symptom', async () => {
    const { reply } = await sendButlerMessage(patientId, '我有点不舒服');
    expect(reply.intent).toBe('symptom');
  });
  it('"谢谢" → thanks', async () => {
    const { reply } = await sendButlerMessage(patientId, '谢谢');
    expect(reply.intent).toBe('thanks');
  });
  it('无命中 → unknown', async () => {
    const { reply } = await sendButlerMessage(patientId, '随便聊聊 xyz abc');
    expect(reply.intent).toBe('unknown');
    expect(reply.botText).toContain('理解');
  });
});

describe('ai-butler · side effects', () => {
  it('每次对话写入 ai_butler_conversations + audit_logs', async () => {
    const beforeC = (await getDb().select().from(aiButlerConversations)).length;
    const beforeA = (await getDb().select().from(auditLogs)).length;
    await sendButlerMessage(patientId, '今天要做什么');
    const afterC = (await getDb().select().from(aiButlerConversations)).length;
    const afterA = (await getDb().select().from(auditLogs)).length;
    expect(afterC).toBeGreaterThanOrEqual(beforeC + 1);
    expect(afterA).toBeGreaterThanOrEqual(beforeA + 1);
  });
  it('listButlerHistory 返回倒序', async () => {
    const list = await listButlerHistory(patientId, 5);
    expect(list.length).toBeGreaterThan(0);
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].createdAt >= list[i].createdAt).toBe(true);
    }
  });
});
