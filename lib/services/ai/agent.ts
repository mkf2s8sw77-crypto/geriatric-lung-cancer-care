// Phase 5 · 护士 RAG 知识库智能体（mock-kb-agent-v1）
// 演示版：本地关键词命中 + 词频打分，零外部依赖。30 条 mock KB 覆盖 5 大类护理场景。
// 严格保留"演示"边界：所有回答包含模型标识、免责声明，并写入 audit_logs。

import { eq, desc, sql } from 'drizzle-orm';
import { getDb } from '../../../db/client';
import { knowledgeBases, knowledgeQuestions } from '../../../db/schema';
import { recordAudit } from '../../audit';
import { makeDisclaimer, nowIso, tokenize, highlightTerms } from './shared';

export const AGENT_MODEL = 'mock-kb-agent-v1';
export const AGENT_DISCLAIMER = '本结果由本地 mock 知识库与模拟检索生成，仅用于功能演示，不构成临床决策依据。';

export type KBMatch = {
  id: number;
  title: string;
  category: string;
  body: string;
  source: string;
  score: number;        // 0-1
  highlightTerms: string[];
  snippet: string;      // 高亮过的关键句摘录
};

export type AgentAnswer = {
  model: string;
  question: string;
  matches: KBMatch[];
  answer: string;       // 拼接式综合回答
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number;  // 0-1
  citations: Array<{ id: number; title: string; source: string; category: string }>;
  disclaimer: string;
  generatedAt: string;
};

type KBItem = {
  id: number;
  category: string;
  title: string;
  source: string;
  tags: string;
  body: string;
  enabled: boolean;
};

// 提取关键句（按句号切分，挑出含高亮词最多的 1 句，最多 80 字）。
function extractSnippet(body: string, terms: string[]): string {
  if (!body) return '';
  const sentences = body.split(/[。！？!?\n]/).map((s) => s.trim()).filter((s) => s.length > 0);
  if (sentences.length === 0) return body.slice(0, 80);
  let best = sentences[0];
  let bestCount = -1;
  for (const s of sentences) {
    let c = 0;
    for (const t of terms) {
      if (t && s.includes(t)) c += 1;
    }
    if (c > bestCount) {
      bestCount = c;
      best = s;
    }
  }
  if (best.length > 100) best = best.slice(0, 100) + '…';
  return best;
}

function computeMatch(item: KBItem, queryTerms: string[]): { score: number; matched: string[] } {
  if (queryTerms.length === 0) return { score: 0, matched: [] };
  const tagSet = new Set<string>();
  try {
    const tags: string[] = JSON.parse(item.tags || '[]');
    for (const t of tags) {
      for (const tk of tokenize(t)) tagSet.add(tk);
    }
  } catch { /* ignore */ }
  const titleTokens = new Set(tokenize(item.title));
  const bodyTokens = tokenize(item.body);
  const bodySet = new Set(bodyTokens);
  let score = 0;
  let maxPossible = 0;
  const matched: string[] = [];
  for (const q of queryTerms) {
    if (!q || q.length < 1) continue;
    if (tagSet.has(q)) {
      score += 3;
      maxPossible += 3;
      if (!matched.includes(q)) matched.push(q);
    } else if (titleTokens.has(q)) {
      score += 2;
      maxPossible += 2;
      if (!matched.includes(q)) matched.push(q);
    } else if (bodySet.has(q)) {
      score += 1;
      maxPossible += 1;
      if (!matched.includes(q)) matched.push(q);
    }
  }
  // 归一化：按"命中词的可达最大分"归一化，让标题+正文命中就能拿到 1.0
  return { score: maxPossible > 0 ? score / maxPossible : 0, matched };
}

export async function askAgent(question: string, nurseUserId: number): Promise<{ id: number; answer: AgentAnswer }> {
  const db = getDb();
  const queryTerms = tokenize(question);
  const allEnabled = await db.select().from(knowledgeBases).where(eq(knowledgeBases.enabled, true));
  const scored: KBMatch[] = [];
  for (const it of allEnabled) {
    const { score, matched } = computeMatch(it, queryTerms);
    if (score >= 0.05) {
      const snippet = highlightTerms(extractSnippet(it.body, matched), matched);
      scored.push({
        id: it.id,
        title: it.title,
        category: it.category,
        body: it.body,
        source: it.source,
        score: Math.min(1, score),
        highlightTerms: matched,
        snippet,
      });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);

  const topScore = top[0]?.score || 0;
  const confidence: 'high' | 'medium' | 'low' = topScore >= 0.5 ? 'high' : topScore >= 0.2 ? 'medium' : 'low';

  const citations = top.map((m) => ({ id: m.id, title: m.title, source: m.source, category: m.category }));

  let answer: string;
  if (top.length === 0) {
    answer = `未在已审核知识库中找到与「${question}」匹配的条目。建议查阅原始指南/共识或联系高年资护士后再决定护理措施。`;
  } else {
    const header = `根据 ${top.length} 条审核知识库内容（${citations.map((c) => `《${c.title}》`).join('、')}），可能的回答如下：\n\n`;
    const body = top
      .map((m, i) => `${i + 1}. 【${m.category}】《${m.title}》—— ${m.snippet}`)
      .join('\n\n');
    const footer = `\n\n建议结合患者实际评估结果与高年资护士意见综合判断。`;
    answer = header + body + footer;
  }

  const agentAnswer: AgentAnswer = {
    model: AGENT_MODEL,
    question,
    matches: top,
    answer,
    confidence,
    confidenceScore: topScore,
    citations,
    disclaimer: makeDisclaimer(AGENT_MODEL, AGENT_DISCLAIMER),
    generatedAt: nowIso(),
  };

  // 写问答日志
  const inserted = await db.insert(knowledgeQuestions).values({
    nurseUserId,
    question,
    matchedKnowledgeIds: JSON.stringify(citations.map((c) => c.id)),
    answerBody: answer,
    confidence,
    confidenceScore: topScore,
  }).returning({ id: knowledgeQuestions.id });

  // 审计
  await recordAudit({
    actorUserId: nurseUserId,
    actorRole: 'NURSE',
    action: '知识库问答',
    targetType: 'KB',
    targetId: String(inserted[0].id),
    summary: `${confidence}（${topScore.toFixed(2)}）：${question.slice(0, 30)}`,
  });

  return { id: inserted[0].id, answer: agentAnswer };
}

export async function listKBCategories() {
  const db = getDb();
  const rows = await db.select({ category: knowledgeBases.category, c: sql<number>`count(*)` }).from(knowledgeBases).groupBy(knowledgeBases.category);
  return rows.map((r) => ({ category: r.category, count: r.c }));
}

export async function listKBByCategory(category?: string) {
  const db = getDb();
  if (category) {
    return await db.select().from(knowledgeBases).where(eq(knowledgeBases.category, category));
  }
  return await db.select().from(knowledgeBases);
}

export async function listRecentQuestions(nurseUserId: number, limit = 5) {
  const db = getDb();
  return await db.select().from(knowledgeQuestions).where(eq(knowledgeQuestions.nurseUserId, nurseUserId)).orderBy(desc(knowledgeQuestions.createdAt)).limit(limit);
}

// 类别 → 内置示例问题
export const CATEGORY_DEMO_QUESTIONS: Record<string, string[]> = {
  气道护理: ['吸痰时负压应该是多少？', '气道湿化频率怎么把握？', '气道痉挛怎么识别？'],
  压力性损伤: ['压力性损伤怎么分期？', 'Ⅰ 期压力性损伤怎么处理？', '敷料多久换一次？'],
  化疗护理: ['化疗药物外渗怎么处理？', '化疗相关恶心呕吐怎么预防？', '化疗期间口腔黏膜炎怎么护理？'],
  营养支持: ['老年肿瘤患者每日蛋白质补充多少？', '食欲下降怎么办？', '营养风险怎么评估？'],
  心理护理: ['焦虑情绪怎么识别？', '抑郁情绪上报阈值是什么？', '与家属沟通有哪些注意事项？'],
};
