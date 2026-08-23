import Link from 'next/link';
import { requireRole } from '../../../lib/guard';
import AIKnowledgePanel from '../../../components/AIKnowledgePanel';

export const dynamic = 'force-dynamic';

export default async function NurseAssistantPage() {
  const user = await requireRole('NURSE');
  return (
    <div className="space-y-4">
      <Link href="/nurse" className="text-sm text-brand-700 underline">返回工作台</Link>
      <section className="bg-white rounded-xl p-4 shadow-sm">
        <h1 className="text-lg font-semibold text-brand-700">{user.displayName} · AI 知识库助手</h1>
        <p className="text-xs text-slate-500 mt-1">基于本地 mock 审核知识库的 RAG 问答，覆盖气道护理、压力性损伤、化疗护理、营养支持、心理护理五大类。</p>
      </section>
      <AIKnowledgePanel />
    </div>
  );
}
