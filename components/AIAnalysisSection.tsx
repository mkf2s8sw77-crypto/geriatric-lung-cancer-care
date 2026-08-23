import { eq, desc } from 'drizzle-orm';
import { getDb } from '../db/client';
import { aiAnalyses } from '../db/schema';
import AIAdoptControls from './AIAdoptControls';
import AIAnalysisCompare from './AIAnalysisCompare';
import type { AIAnalysisOutput, AIAnalysisStyle } from '../lib/services/ai/analysis';

type AIAnalysisRow = {
  id: number;
  status: string;
  model: string;
  style: string | null;
  evidenceJson: string | null;
  patientHint: string | null;
  nurseNote: string | null;
  outputJson: string;
  createdAt: string;
};

const STYLE_LABEL: Record<string, string> = {
  balanced: '平衡型',
  conservative: '保守型',
  proactive: '积极型',
};

const LEVEL_BG: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  medium: 'bg-amber-50 text-amber-700 border-amber-300',
  high: 'bg-red-50 text-red-700 border-red-300',
};

const DIM_LABEL: Record<string, string> = {
  symptom: '症状维度',
  behavior: '行为维度',
  psychological: '心理维度',
  treatment: '治疗维度',
};

function tryParse(json: string): AIAnalysisOutput | null {
  try {
    return JSON.parse(json) as AIAnalysisOutput;
  } catch {
    return null;
  }
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

export default async function AIAnalysisSection({ patientId, patientName, showCompare = true }: { patientId: number; patientName: string; showCompare?: boolean }) {
  const db = getDb();
  const list = (await db.select().from(aiAnalyses).where(eq(aiAnalyses.patientId, patientId)).orderBy(desc(aiAnalyses.createdAt)).limit(8)) as AIAnalysisRow[];
  return (
    <section className="bg-white rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">AI 演示分析（mock-geriatric-lung-v1 系列）</h2>
        <span className="text-xs text-slate-500">本地确定性 · 3 风格对比 · 演示版本</span>
      </div>
      <p className="text-xs text-amber-700">本结果为本地确定性演示分析，不构成临床诊断，所有建议须经医护人员确认。</p>
      {list.length === 0 ? (
        <p className="text-sm text-slate-500">暂无 AI 演示分析。</p>
      ) : (
        <ul className="space-y-3">
          {list.map((a) => {
            const out = tryParse(a.outputJson);
            if (!out) return null;
            const levelBg = LEVEL_BG[out.level] || LEVEL_BG.medium;
            const styleLabel = STYLE_LABEL[out.style] || out.style;
            return (
              <li key={a.id} className="border border-slate-200 rounded-md p-3 space-y-3 bg-slate-50/40">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${levelBg}`}>风险等级：{out.levelLabel}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">风格：{styleLabel}</span>
                  <span className="text-xs text-slate-500 ml-auto">{fmtTime(out.generatedAt || a.createdAt)}</span>
                </div>
                <div className="text-xs text-slate-500">模型：{out.model}</div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{out.summary}</p>
                  {out.topSymptoms && out.topSymptoms.length > 0 && (
                    <ul className="mt-1 flex flex-wrap gap-1">
                      {out.topSymptoms.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {s.name} {s.score} 分
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {out.attribution && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-brand-700">查看 4 维度归因</summary>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(Object.keys(out.attribution) as Array<keyof typeof out.attribution>).map((dim) => (
                        <div key={dim} className="border border-slate-200 rounded p-2 bg-white">
                          <div className="font-medium text-slate-700 mb-1">{DIM_LABEL[dim]}</div>
                          <ul className="space-y-0.5 text-slate-600">
                            {out.attribution[dim].map((s, i) => (
                              <li key={i}>· {s}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                {out.advice && out.advice.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-1">💡 个性化建议（{out.advice.length} 条）</div>
                    <ol className="space-y-1">
                      {out.advice.map((adv, i) => (
                        <li key={i} className="text-xs text-slate-700 bg-amber-50 border-l-2 border-amber-400 px-2 py-1 rounded">
                          <span className="font-medium">{i + 1}. {adv.action}</span>
                          <div className="text-slate-500 mt-0.5">↳ {adv.evidence}</div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {out.followup && out.followup.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-1">📅 下次随访建议（{out.followup.length} 条）</div>
                    <ol className="space-y-1">
                      {out.followup.map((f, i) => (
                        <li key={i} className="text-xs text-slate-700">
                          <span className="font-medium">{i + 1}. {f.timing}</span>
                          <span className="text-slate-500"> · {f.channel} · 关注：{f.focus}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {out.evidence && out.evidence.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-slate-500">查看触发的关键阈值</summary>
                    <ul className="mt-1 space-y-0.5 text-slate-600">
                      {out.evidence.map((e, i) => (
                        <li key={i}>· {e}</li>
                      ))}
                    </ul>
                  </details>
                )}
                {out.patientHint && (
                  <div className="text-xs bg-blue-50 border-l-2 border-blue-400 px-2 py-1 rounded text-slate-700">
                    <span className="font-medium">📱 给患者：</span> {out.patientHint}
                  </div>
                )}
                <div className="text-xs text-slate-400 italic">{out.disclaimer}</div>
                {a.status === '已生成' && <AIAdoptControls analysisId={a.id} />}
                {a.nurseNote && (
                  <div className="text-xs text-slate-600 bg-slate-50 border-l-2 border-slate-300 px-2 py-1 rounded">
                    护士备注：{a.nurseNote}
                  </div>
                )}
                <div className="text-xs text-slate-400">状态：{a.status}</div>
              </li>
            );
          })}
        </ul>
      )}
      {showCompare && <AIAnalysisCompare patientId={patientId} patientName={patientName} />}
    </section>
  );
}
