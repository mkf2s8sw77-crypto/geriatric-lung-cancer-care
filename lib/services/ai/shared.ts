// Phase 5 · 三件 AI 共用类型、免责声明、停用词与基础工具。
// 演示版所有 AI 输出必须显示模型标识、生成时间、免责声明。

export type AILevel = 'low' | 'medium' | 'high';
export type AILevelColor = 'green' | 'amber' | 'red';

export const DEMO_DISCLAIMER_BASE = '本结果为本地确定性演示分析，不构成临床诊断，所有建议须经医护人员确认。';

export function makeDisclaimer(model: string, base = DEMO_DISCLAIMER_BASE): string {
  return `本结果由 ${model} 演示模型生成。${base}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

// 医学关键词与停用词（用于 mock RAG / 关键词路由）。仅作演示用途，无 NLP 能力。
export const STOPWORDS = new Set<string>([
  '的', '了', '是', '我', '你', '他', '她', '它', '们', '在', '和', '与', '或', '但', '就', '也', '都', '不', '没', '有',
  '请', '问', '一下', '怎么', '什么', '为什么', '可以', '应该', '需要', '想要', '想', '要', '会', '能', '会', '能',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'to', 'of', 'and', 'or', 'but', 'so', 'in', 'on', 'at', 'for', 'with', 'how', 'what', 'why', 'can', 'should', 'i', 'you', 'we', 'they', 'he', 'she', 'it',
]);

// 用于切词的简单分词函数：连续中文字符按字切，英文按词切，数字保留。
export function tokenize(input: string): string[] {
  if (!input) return [];
  const tokens: string[] = [];
  // 中文逐字（保留 2+ 字的医学词，如"吸痰"）
  const cnRegex = /[\u4e00-\u9fa5]+/g;
  let m: RegExpExecArray | null;
  while ((m = cnRegex.exec(input)) !== null) {
    const seg = m[0];
    // 单字 + 常见双字词切分
    for (let i = 0; i < seg.length; i++) {
      tokens.push(seg[i]);
      if (i + 1 < seg.length) tokens.push(seg.substring(i, i + 2));
      if (i + 2 < seg.length) tokens.push(seg.substring(i, i + 3));
    }
  }
  // 英文 / 数字 / 混合 token
  const enRegex = /[a-zA-Z0-9]+/g;
  while ((m = enRegex.exec(input)) !== null) {
    tokens.push(m[0].toLowerCase());
  }
  return tokens.filter((t) => t.length > 0 && !STOPWORDS.has(t.toLowerCase()));
}

// 简单高亮：从原文中找出命中关键词的位置，包裹 ** ** 用于粗体高亮。
export function highlightTerms(text: string, terms: string[]): string {
  if (!text || terms.length === 0) return text;
  let result = text;
  // 按词长倒序避免短词覆盖长词
  const sorted = [...terms].filter((t) => t.length > 0).sort((a, b) => b.length - a.length);
  for (const t of sorted) {
    if (!t) continue;
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), `**${t}**`);
  }
  return result;
}

// 风险等级中文标签
export const LEVEL_LABEL: Record<AILevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};
