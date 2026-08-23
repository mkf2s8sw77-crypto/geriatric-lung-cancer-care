// Phase 5 · 症状群归类（演示版）
// 仅 4 群演示映射，未经过临床验证；UI 中必须显式标"演示"。

export type SymptomCluster = 'somatic' | 'nutritional' | 'psychological' | 'respiratory';

export const CLUSTER_LABEL: Record<SymptomCluster, string> = {
  somatic: '躯体症状群',
  nutritional: '营养相关群',
  psychological: '心理症状群',
  respiratory: '呼吸症状群',
};

export const CLUSTER_COLOR: Record<SymptomCluster, { bg: string; text: string; border: string }> = {
  somatic: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
  nutritional: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  psychological: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-300' },
  respiratory: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' },
};

export const CLUSTER_MAP: Record<string, SymptomCluster> = {
  fatigue: 'somatic',
  pain: 'somatic',
  sleep: 'somatic',
  daily: 'somatic',
  appetite: 'nutritional',
  weight: 'nutritional',
  nausea: 'nutritional',
  mood: 'psychological',
  dyspnea: 'respiratory',
  cough: 'respiratory',
};

export const SYMPTOM_CLUSTER_DISCLAIMER = '本归类为演示版映射（躯体 / 营养 / 心理 / 呼吸 4 群），未经过临床验证。';

export function clusterOf(symptomCode: string | null | undefined): SymptomCluster | null {
  if (!symptomCode) return null;
  return CLUSTER_MAP[symptomCode] || null;
}

export function groupSymptomsByCluster<T extends { code: string }>(symptoms: T[]): Record<SymptomCluster, T[]> {
  const out: Record<SymptomCluster, T[]> = { somatic: [], nutritional: [], psychological: [], respiratory: [] };
  for (const s of symptoms) {
    const c = clusterOf(s.code);
    if (c) out[c].push(s);
  }
  return out;
}
