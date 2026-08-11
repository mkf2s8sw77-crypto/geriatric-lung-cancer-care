import { eq, desc } from 'drizzle-orm';
import { getDb } from '../db/client';
import { aiAnalyses } from '../db/schema';
import AIAdoptControls from './AIAdoptControls';

export default async function AIAnalysisSection({ patientId, patientName }: { patientId: number; patientName: string }) {
  const db = getDb();
  const list = await db.select().from(aiAnalyses).where(eq(aiAnalyses.patientId, patientId)).orderBy(desc(aiAnalyses.createdAt)).limit(5);
  return (
    <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
      <h2 className="text-base font-semibold">AI 演示分析（mock-geriatric-lung-v1）</h2>
      <p className="text-xs text-amber-700">本结果为本地确定性演示分析（不构成临床诊断）；所有建议须经医护人员确认。</p>
      {list.length === 0 ? <p className="text-sm text-slate-500">暂无 AI 演示分析。</p> : (
        <ul className="space-y-2">
          {list.map((a) => {
            let out: { summary?: string; riskFactors?: string[]; nurseReview?: string[]; suggestedFollowup?: string; patientHint?: string; disclaimer?: string } = {};
            try { out = JSON.parse(a.outputJson); } catch { /* ignore */ }
            return (
              <li key={a.id} className="border border-slate-200 rounded-md p-3 space-y-1">
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>{a.createdAt.slice(0, 16).replace('T', ' ')}</span>
                  <span>状态：{a.status}</span>
                </div>
                {out.summary && <p className="text-sm"><span className="font-medium">摘要：</span>{out.summary}</p>}
                {out.riskFactors && out.riskFactors.length > 0 && (
                  <p className="text-xs text-slate-600"><span className="font-medium">风险因素：</span>{out.riskFactors.join('；')}</p>
                )}
                {out.nurseReview && out.nurseReview.length > 0 && (
                  <p className="text-xs text-slate-600"><span className="font-medium">建议复核：</span>{out.nurseReview.join('；')}</p>
                )}
                {out.suggestedFollowup && <p className="text-xs text-slate-600"><span className="font-medium">建议随访：</span>{out.suggestedFollowup}</p>}
                {out.disclaimer && <p className="text-xs text-slate-400 italic">{out.disclaimer}</p>}
                {a.status === '已生成' && (
                  <AIAdoptControls analysisId={a.id} />
                )}
                {a.nurseNote && <p className="text-xs text-slate-600">护士备注：{a.nurseNote}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
