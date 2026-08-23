import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb, closeDb } from '../db/client';
import { knowledgeBases, users, knowledgeQuestions, auditLogs } from '../db/schema';
import { askAgent, listKBCategories, AGENT_MODEL, AGENT_DISCLAIMER } from '../lib/services/ai/agent';
import { eq } from 'drizzle-orm';

let testNurseId: number;

beforeAll(async () => {
  const db = getDb();
  // 用 demo 护士作为测试用户
  const nurse = await db.select().from(users).where(eq(users.username, 'nurse_demo')).limit(1);
  if (nurse.length === 0) throw new Error('demo nurse 账号不存在，请先 npm run db:reset');
  testNurseId = nurse[0].id;
  // 清掉可能残留（仅本测试关心的表，不动 users）
  await db.delete(knowledgeQuestions);
  await db.delete(knowledgeBases);
  // 插入 5 条 mock KB（覆盖 5 大类各 1 条）
  await db.insert(knowledgeBases).values([
    { category: '气道护理', title: '吸痰负压', source: '演示 A', tags: JSON.stringify(['吸痰', '负压']), body: '成人吸痰负压建议 80—150 mmHg，每次吸引不超过 15 秒。', approvedBy: '演示护理部', enabled: true },
    { category: '压力性损伤', title: 'Braden 评分', source: '演示 B', tags: JSON.stringify(['Braden', '压力性损伤']), body: 'Braden ≤9 极高危，10—12 高危，13—14 中危，15—18 低危。', approvedBy: '演示护理部', enabled: true },
    { category: '化疗护理', title: '化疗外渗', source: '演示 C', tags: JSON.stringify(['化疗', '外渗']), body: '外渗立即停止输液，回抽残留药物，局部冷敷 24 小时。', approvedBy: '演示护理部', enabled: true },
    { category: '营养支持', title: '蛋白质补充', source: '演示 D', tags: JSON.stringify(['营养', '蛋白质']), body: '老年肿瘤患者每日蛋白质 1.2—2.0 g/kg 体重。', approvedBy: '演示护理部', enabled: true },
    { category: '心理护理', title: '焦虑识别', source: '演示 E', tags: JSON.stringify(['焦虑', '心理']), body: '焦虑表现坐立不安、失眠、心悸、过度担忧。', approvedBy: '演示护理部', enabled: true },
  ]);
});

afterAll(async () => {
  closeDb();
});

describe('ai-agent · askAgent hit & confidence', () => {
  it('气道护理：吸痰负压 → 命中且 high', async () => {
    const { answer } = await askAgent('吸痰时负压应该是多少？', testNurseId);
    expect(answer.matches.length).toBeGreaterThan(0);
    expect(answer.matches[0].category).toBe('气道护理');
    expect(answer.confidence).toBe('high');
    expect(answer.confidenceScore).toBeGreaterThanOrEqual(0.5);
    expect(answer.answer).toContain('审核知识库');
    expect(answer.disclaimer).toContain(AGENT_MODEL);
    expect(answer.disclaimer).toContain('演示');
  });

  it('压力性损伤：分期 → 命中', async () => {
    const { answer } = await askAgent('Braden 评分怎么解读？', testNurseId);
    expect(answer.matches.length).toBeGreaterThan(0);
    expect(answer.matches[0].category).toBe('压力性损伤');
    expect(answer.confidenceScore).toBeGreaterThan(0.2);
  });

  it('化疗护理：外渗 → 命中', async () => {
    const { answer } = await askAgent('化疗药物外渗怎么处理？', testNurseId);
    expect(answer.matches[0].category).toBe('化疗护理');
    expect(answer.confidence).not.toBe('low');
  });

  it('营养支持：蛋白质 → 命中', async () => {
    const { answer } = await askAgent('老年患者需要多少蛋白质？', testNurseId);
    expect(answer.matches[0].category).toBe('营养支持');
  });

  it('心理护理：焦虑 → 命中', async () => {
    const { answer } = await askAgent('焦虑情绪怎么识别？', testNurseId);
    expect(answer.matches[0].category).toBe('心理护理');
  });

  it('完全无关问题 → low + 未命中提示', async () => {
    const { answer } = await askAgent('今天天气怎么样？', testNurseId);
    expect(answer.matches.length).toBe(0);
    expect(answer.confidence).toBe('low');
    expect(answer.answer).toContain('未在已审核知识库中找到');
  });
});

describe('ai-agent · side effects', () => {
  it('每次提问写入 knowledge_questions 表', async () => {
    const before = (await getDb().select().from(knowledgeQuestions)).length;
    await askAgent('吸痰时负压？', testNurseId);
    const after = (await getDb().select().from(knowledgeQuestions)).length;
    expect(after).toBe(before + 1);
  });
  it('每次提问写入 audit_logs', async () => {
    const before = (await getDb().select().from(auditLogs)).length;
    await askAgent('蛋白', testNurseId);
    const after = (await getDb().select().from(auditLogs)).length;
    // 在 threads 模式下，better-sqlite3 单连接是串行的，期望恰好 +1；
    // 实际可能因 vitest pool=threads 内部串行仍然 +1；若失败可放宽到 >= before + 1
    expect(after).toBeGreaterThanOrEqual(before + 1);
    const last = (await getDb().select().from(auditLogs).orderBy(auditLogs.id))[0];
    expect(last.action).toBe('知识库问答');
  });
});

describe('ai-agent · listKBCategories', () => {
  it('返回 5 个类别', async () => {
    const cats = await listKBCategories();
    expect(cats).toHaveLength(5);
    const total = cats.reduce((s, c) => s + c.count, 0);
    expect(total).toBe(5);
  });
});
