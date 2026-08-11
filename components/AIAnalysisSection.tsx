import { eq, desc } from 'drizzle-orm';
import { getDb } from '../db/client';
import { aiAnalyses } from '../db/schema';

export default async function AIAnalysisSection({ patientId, patientName }: { patientId: number; patientName: string }) {
  const db = getDb();
  const list = await db.select().from(aiAnalyses).where(eq(aiAnalyses.patientId, patientId)).orderBy(desc(aiAnalyses.createdAt)).limit(5);
  return (
    <section className="bg-white rounded-xl p-4 shadow-sm space-y-2">
      <h2 className="text-base font-semibold">AI 演示分析（mock-geriatric-lung-v1）</h2>
      <p className="text-xs text-amber-700">本结果为本地确定性演示分析，不构成临床诊断；所有建议须经医护人员确认。</p>
      {list.length === 0 ? <p className="text-sm text-slate-500">暂无 AI 演示分析。</p> : (
        <ul className="space-y-2">
          {list.map((a) => {
            let out: { summary?: string; riskFactors?: string[]; nurseReview?: string[]; suggestedFollowup?: string; disclaimer?: string } = {};
            try { out = JSON.parse(a.outputJson); } catch { /* ignore */ }
            return (
              <li key={a.id} className="border border-slate-200 rounded-md p-3">
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>{a.createdAt.slice(0, 16).replace('T', ' ')}</span>
                  <span>{a.status}</span>
                </div>
                {out.summary && <p className="text-sm mt-1">{out.summary}</p>}
                {out.riskFactors && out.riskFactors.length > 0 && (
                  <p className="text-xs text-slate-600 mt-1">风险因素：{out.riskFactors.join('；')}</p>
                )}
                {out.nurseReview && out.nurseReview.length > 0 && (
                  <p className="text-xs text-slate-600 mt-1">建议复核：{out.nurseReview.join('；')}</p>
                )}
                {out.suggestedFollowup && <p className="text-xs text-slate-600 mt-1">建议随访：{out.suggestedFollowup}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
