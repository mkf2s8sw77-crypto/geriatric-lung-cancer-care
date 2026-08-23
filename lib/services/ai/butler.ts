// Phase 5 · 患者 AI 健康管家（mock-butler-v1）
// 演示版：本地模板拼接 + 关键词意图路由。零外部依赖。
// 严格保留"演示"边界：所有回复包含模型标识、免责声明。

import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { getDb } from '../../../db/client';
import {
  aiButlerPushes, aiButlerConversations, patients, tasks, followups, assessments, educationResources,
} from '../../../db/schema';
import { recordAudit } from '../../audit';
import { makeDisclaimer, nowIso } from './shared';

export const BUTLER_MODEL = 'mock-butler-v1';
export const BUTLER_DISCLAIMER = '本助手为本地演示版本，回复由预置模板生成，不构成医疗建议。紧急情况请联系护士或就医。';

export type ButlerIntent = 'task' | 'assessment' | 'symptom' | 'followup' | 'education' | 'mood' | 'thanks' | 'unknown';

export type ButlerPush = {
  id: number;
  pushType: string;
  title: string;
  body: string;
  cta: string;
  ctaHref: string;
  expiresAt: string;
  read: boolean;
  createdAt: string;
};

export type ButlerReply = {
  model: string;
  intent: ButlerIntent;
  userText: string;
  botText: string;
  matchedRule: string;
  disclaimer: string;
  generatedAt: string;
};

function startOfToday(): string {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString();
}
function startOfTomorrow(): string {
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); return d.toISOString();
}

// 取患者今日任务、最近评估、下次随访、最近宣教，作为推送生成与意图路由上下文。
async function getPatientContext(patientId: number) {
  const db = getDb();
  const today = startOfToday();
  const tomorrow = startOfTomorrow();
  const todayStart = today.slice(0, 10);
  const allTasks = await db.select().from(tasks).where(eq(tasks.patientId, patientId));
  const todayTasks = allTasks.filter((t) => t.scheduledDate.slice(0, 10) === todayStart && t.status === '待完成');
  const overdueTasks = allTasks.filter((t) => t.status === '未完成');
  const recentAssess = await db.select().from(assessments).where(eq(assessments.patientId, patientId)).orderBy(desc(assessments.submittedAt)).limit(1);
  const upcomingFollowups = await db.select().from(followups).where(and(eq(followups.patientId, patientId), eq(followups.status, '计划'))).orderBy(followups.scheduledAt).limit(1);
  const nextFollowup = upcomingFollowups[0];
  const edu = await db.select().from(educationResources).where(eq(educationResources.enabled, true)).orderBy(educationResources.sortOrder).limit(1);
  return { todayTasks, overdueTasks, recentAssess: recentAssess[0], nextFollowup, edu: edu[0] };
}

// 推送类型 24h 内是否已存在
async function hasRecentPush(patientId: number, pushType: string, sinceIso: string): Promise<boolean> {
  const db = getDb();
  const rows = await db.select({ c: sql<number>`count(*)` }).from(aiButlerPushes)
    .where(and(eq(aiButlerPushes.patientId, patientId), eq(aiButlerPushes.pushType, pushType), gte(aiButlerPushes.createdAt, sinceIso)));
  return (rows[0]?.c || 0) > 0;
}

function nextMidnight(): string {
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); return d.toISOString();
}

export async function generateButlerPushesForPatient(patientId: number): Promise<ButlerPush[]> {
  const db = getDb();
  const ctx = await getPatientContext(patientId);
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const expiresAt = nextMidnight();
  const created: ButlerPush[] = [];

  // 1) 今日任务
  if (ctx.todayTasks.length > 0 && !(await hasRecentPush(patientId, '今日任务', since24h))) {
    const titles = ctx.todayTasks.slice(0, 3).map((t) => t.title).join('、');
    const body = `今天您有 ${ctx.todayTasks.length} 项任务待完成：${titles}${ctx.todayTasks.length > 3 ? ' 等' : ''}。请尽量按时完成。`;
    const r = await db.insert(aiButlerPushes).values({
      patientId, pushType: '今日任务', title: `今日有 ${ctx.todayTasks.length} 项任务`, body, cta: '查看任务', ctaHref: '/patient/tasks', expiresAt,
    }).returning();
    created.push(mapPush(r[0]));
  }
  // 2) 评估到期
  if (ctx.recentAssess) {
    const days = Math.floor((Date.now() - new Date(ctx.recentAssess.submittedAt || ctx.recentAssess.createdAt).getTime()) / (24 * 3600 * 1000));
    if (days >= 7 && !(await hasRecentPush(patientId, '评估到期', since24h))) {
      const body = `您最近一次评估是 ${days} 天前，建议本周重新评估以便护士了解您的最新状态。`;
      const r = await db.insert(aiButlerPushes).values({
        patientId, pushType: '评估到期', title: '您有一份评估待完成', body, cta: '开始评估', ctaHref: '/patient/assessments/draft', expiresAt,
      }).returning();
      created.push(mapPush(r[0]));
    }
  }
  // 3) 随访临近
  if (ctx.nextFollowup) {
    const days = Math.floor((new Date(ctx.nextFollowup.scheduledAt).getTime() - Date.now()) / (24 * 3600 * 1000));
    if (days >= 0 && days <= 3 && !(await hasRecentPush(patientId, '随访临近', since24h))) {
      const body = `您 ${days === 0 ? '今天' : days === 1 ? '明天' : `${days} 天后`} 有 ${ctx.nextFollowup.method}随访（${ctx.nextFollowup.scheduledAt.slice(0, 16)}），请提前整理疑问清单。`;
      const r = await db.insert(aiButlerPushes).values({
        patientId, pushType: '随访临近', title: '随访即将到来', body, cta: '查看宣教', ctaHref: '/patient/education', expiresAt,
      }).returning();
      created.push(mapPush(r[0]));
    }
  }
  // 4) 宣教推荐
  if (ctx.edu && !(await hasRecentPush(patientId, '宣教推荐', since24h))) {
    const body = `推荐您阅读《${ctx.edu.title}》，约 ${ctx.edu.readMinutes} 分钟，可帮助您更好地配合治疗。`;
    const r = await db.insert(aiButlerPushes).values({
      patientId, pushType: '宣教推荐', title: `推荐阅读：${ctx.edu.title}`, body, cta: '开始阅读', ctaHref: `/patient/education/${ctx.edu.id}`, expiresAt,
    }).returning();
    created.push(mapPush(r[0]));
  }
  // 5) 心情打卡
  if (!(await hasRecentPush(patientId, '心情打卡', since24h))) {
    const r = await db.insert(aiButlerPushes).values({
      patientId, pushType: '心情打卡', title: '今天感觉怎么样？', body: '点开看看今日评估趋势，告诉自己和家人今天的状态。', cta: '查看趋势', ctaHref: '/patient/trends', expiresAt,
    }).returning();
    created.push(mapPush(r[0]));
  }
  return created;
}

function mapPush(row: typeof aiButlerPushes.$inferSelect): ButlerPush {
  return {
    id: row.id,
    pushType: row.pushType,
    title: row.title,
    body: row.body,
    cta: row.cta,
    ctaHref: row.ctaHref,
    expiresAt: row.expiresAt,
    read: !!row.readAt,
    createdAt: row.createdAt,
  };
}

export async function listButlerPushes(patientId: number, limit = 5): Promise<ButlerPush[]> {
  const db = getDb();
  const rows = await db.select().from(aiButlerPushes).where(eq(aiButlerPushes.patientId, patientId)).orderBy(desc(aiButlerPushes.createdAt)).limit(limit);
  return rows.map(mapPush);
}

export async function markPushRead(pushId: number, patientId: number): Promise<void> {
  const db = getDb();
  const r = await db.select().from(aiButlerPushes).where(and(eq(aiButlerPushes.id, pushId), eq(aiButlerPushes.patientId, patientId))).limit(1);
  if (r.length === 0) throw new Error('推送不存在');
  if (!r[0].readAt) {
    await db.update(aiButlerPushes).set({ readAt: nowIso() }).where(eq(aiButlerPushes.id, pushId));
  }
}

// 意图路由：按关键词命中预置规则。
type Rule = { id: string; intent: ButlerIntent; keywords: string[]; reply: (ctx: Awaited<ReturnType<typeof getPatientContext>>) => string };

const RULES: Rule[] = [
  { id: 'rule-task', intent: 'task', keywords: ['任务', '今天', '做什么', '要做', '要做什么', '安排'], reply: (ctx) => ctx.todayTasks.length > 0 ? `今天您有 ${ctx.todayTasks.length} 项任务待完成：${ctx.todayTasks.slice(0, 3).map((t) => t.title).join('、')}。点击下方"查看任务"了解详情。` : '今天您没有待完成任务，可以休息一下。' },
  { id: 'rule-assessment', intent: 'assessment', keywords: ['评估', '评分', '测一测', '量表', '测试'], reply: (ctx) => {
    if (!ctx.recentAssess) return '您还没有完成过评估，建议尽快做一份以建立基线。';
    const days = Math.floor((Date.now() - new Date(ctx.recentAssess.submittedAt || ctx.recentAssess.createdAt).getTime()) / (24 * 3600 * 1000));
    return `您最近一次评估是 ${days} 天前，分数 ${(ctx.recentAssess.totalScore || 0).toFixed(1)}。${days >= 7 ? '超过 7 天建议重新评估。' : '继续保持观察。'}`;
  } },
  { id: 'rule-symptom', intent: 'symptom', keywords: ['症状', '不舒服', '难受', '疼痛', '发烧', '咳嗽', '气短', '恶心'], reply: () => '建议您立即填写主动症状报告，告诉护士您的具体感受。严重时请直接联系护士或就医。' },
  { id: 'rule-followup', intent: 'followup', keywords: ['随访', '电话', '联系', '护士', '回访'], reply: (ctx) => ctx.nextFollowup ? `您下次随访是 ${ctx.nextFollowup.scheduledAt.slice(0, 16)}（${ctx.nextFollowup.method}）。请提前准备疑问清单。` : '暂未安排下次随访，请联系护士确认。' },
  { id: 'rule-education', intent: 'education', keywords: ['宣教', '阅读', '文章', '知识', '学习'], reply: (ctx) => ctx.edu ? `推荐您阅读《${ctx.edu.title}》，约 ${ctx.edu.readMinutes} 分钟。` : '暂时没有可推荐的宣教内容。' },
  { id: 'rule-mood', intent: 'mood', keywords: ['心情', '累', '焦虑', '害怕', '担心', '难过', '抑郁', '孤单'], reply: () => '感谢您告诉我您的感受。建议您和家人聊聊；如果持续低落超过两周，请联系护士安排专业支持。' },
  { id: 'rule-thanks', intent: 'thanks', keywords: ['谢谢', '感谢', '辛苦了'], reply: () => '不客气，我会一直陪在您身边。有什么需要随时告诉我。' },
];

export async function sendButlerMessage(patientId: number, userText: string): Promise<{ id: number; reply: ButlerReply }> {
  const db = getDb();
  const ctx = await getPatientContext(patientId);
  const text = userText.trim();
  let matched: Rule | null = null;
  for (const r of RULES) {
    if (r.keywords.some((k) => text.includes(k))) {
      matched = r;
      break;
    }
  }
  let intent: ButlerIntent = matched?.intent || 'unknown';
  let botText: string;
  let ruleId: string;
  if (matched) {
    botText = matched.reply(ctx);
    ruleId = matched.id;
  } else {
    intent = 'unknown';
    botText = '我没有完全理解您的意思，您可以换个说法，或点击下方"常见问题"查看示例。';
    ruleId = 'rule-unknown';
  }
  const reply: ButlerReply = {
    model: BUTLER_MODEL,
    intent,
    userText: text,
    botText,
    matchedRule: ruleId,
    disclaimer: makeDisclaimer(BUTLER_MODEL, BUTLER_DISCLAIMER),
    generatedAt: nowIso(),
  };
  const r = await db.insert(aiButlerConversations).values({
    patientId, userText: text, detectedIntent: intent, botReply: botText, matchedRuleId: ruleId,
  }).returning({ id: aiButlerConversations.id });

  await recordAudit({
    actorUserId: null,
    actorRole: 'PATIENT',
    action: 'AI 健康管家对话',
    targetType: 'BUTLER',
    targetId: String(r[0].id),
    summary: `${intent}：${text.slice(0, 30)}`,
  });

  return { id: r[0].id, reply };
}

export async function listButlerHistory(patientId: number, limit = 20) {
  const db = getDb();
  return await db.select().from(aiButlerConversations).where(eq(aiButlerConversations.patientId, patientId)).orderBy(desc(aiButlerConversations.createdAt)).limit(limit);
}
