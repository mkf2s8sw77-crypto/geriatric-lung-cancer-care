import { notFound, redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { requireRole } from '../../../../lib/guard';
import { getDb } from '../../../../db/client';
import { assessments, assessmentAnswers, scaleItems } from '../../../../db/schema';
import { symptomLabel } from '../../../../lib/services/symptom-cluster';
import { RiskBadge } from '../../../../components/RiskBadge';

export const dynamic = 'force-dynamic';

export default async function AssessmentResult({ params }: { params: { id: string } }) {
  const user = await requireRole('PATIENT');
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) notFound();
  const db = getDb();
  const aRows = await db.select().from(assessments).where(eq(assessments.id, id)).limit(1);
  const a = aRows[0];
  if (!a || a.filledByUserId !== user.id) notFound();
  const answers = await db.select().from(assessmentAnswers).where(eq(assessmentAnswers.assessmentId, id));
  const items = await db.select().from(scaleItems).where(eq(scaleItems.scaleId, a.scaleId));
  const scoreMap = new Map(answers.map((x) => [x.scaleItemId, x.score]));
  if (a.status !== '已提交') redirect('/patient/assessments/draft');

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-700">评估结果</h1>
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <p className="text-sm text-slate-500">提交时间：{a.submittedAt?.slice(0, 16).replace('T', ' ') || '—'}</p>
        <p className="text-base">总分：<span className="font-semibold text-2xl">{a.totalScore?.toFixed(1) ?? '—'}</span></p>
        <p className="flex items-center gap-2 text-sm">风险：<RiskBadge level={a.riskLevel as 'low' | 'medium' | 'high' | null} /></p>
        <p className="text-sm">主要症状：{symptomLabel(a.topSymptomCode)}（{a.topSymptomScore?.toFixed(1) ?? '—'} 分）</p>
        <p className="text-sm">较上次：{a.deltaVsPrev !== null ? (a.deltaVsPrev > 0 ? '+' : '') + a.deltaVsPrev.toFixed(1) + ' 分' : '首次评估'}</p>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-base font-semibold mb-2">分题得分</h2>
        <ul className="space-y-1 text-sm">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between border-b border-slate-100 last:border-0 py-1">
              <span>{symptomLabel(it.code)}</span>
              <span>{scoreMap.get(it.id)?.toFixed(1) ?? '—'}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
        <p className="font-semibold text-amber-700">重要提示</p>
        <p className="mt-1">本结果为本地演示评估，不构成临床诊断。所有异常请及时联系责任护士或就医，由医护人员最终确认。</p>
      </div>
    </div>
  );
}
