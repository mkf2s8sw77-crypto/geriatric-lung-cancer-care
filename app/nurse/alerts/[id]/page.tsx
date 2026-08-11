import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { requireRole } from '../../../../lib/guard';
import { getDb } from '../../../../db/client';
import { alerts, patients, interventions } from '../../../../db/schema';
import { RiskBadge } from '../../../../components/RiskBadge';
import AlertHandleForm from '../../../../components/AlertHandleForm';

export const dynamic = 'force-dynamic';

export default async function AlertDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole('NURSE');
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) notFound();
  const db = getDb();
  const aRows = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);
  const a = aRows[0];
  if (!a) notFound();
  const pRows = await db.select().from(patients).where(eq(patients.id, a.patientId)).limit(1);
  const p = pRows[0];
  if (!p || p.primaryNurseId !== user.id) notFound();
  const reasons = (() => { try { return JSON.parse(a.ruleSnapshot) as string[]; } catch { return []; } })();
  const history = await db.select().from(interventions).where(eq(interventions.alertId, id));
  return (
    <div className="space-y-4">
      <Link href="/nurse/alerts" className="text-sm text-brand-700 underline">返回预警列表</Link>
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <h1 className="text-lg font-semibold text-brand-700">{p.fullName}（{p.researchNo}）</h1>
        <p className="text-sm">来源：{a.source}</p>
        <p className="text-sm">状态：<span className="font-medium">{a.status}</span></p>
        <div className="flex items-center gap-2"><span>风险：</span><RiskBadge level={a.level as 'low' | 'medium' | 'high'} /></div>
        <p className="text-sm">规则版本：{a.ruleVersion}</p>
        <p className="text-sm">触发时间：{a.createdAt.slice(0, 16).replace('T', ' ')}</p>
        <div className="border-t pt-2 mt-2">
          <p className="text-sm font-medium">触发依据</p>
          <ul className="list-disc pl-5 text-sm text-slate-700 mt-1">
            {reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
        {a.status !== '未处理' && a.handledAt && (
          <p className="text-xs text-slate-500">处理时间：{a.handledAt.slice(0, 16).replace('T', ' ')}</p>
        )}
      </div>
      {a.status === '未处理' ? (
        <AlertHandleForm alertId={a.id} />
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm">
          <p className="font-semibold text-emerald-700">已处理</p>
          <p className="mt-1">{a.summary}</p>
          {history.length > 0 && (
            <ul className="mt-2 space-y-1">
              {history.map((h) => <li key={h.id}>{h.actionType} · {h.createdAt.slice(0, 16).replace('T', ' ')}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
