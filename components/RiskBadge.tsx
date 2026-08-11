import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';

export function RiskBadge({ level }: { level: 'low' | 'medium' | 'high' | null | undefined }) {
  if (!level) return null;
  const map = {
    low: { text: '低风险', bg: 'bg-emerald-50', color: 'text-emerald-700', border: 'border-emerald-300', Icon: ShieldCheck },
    medium: { text: '中风险', bg: 'bg-amber-50', color: 'text-amber-700', border: 'border-amber-300', Icon: AlertTriangle },
    high: { text: '高风险', bg: 'bg-red-50', color: 'text-red-700', border: 'border-red-400', Icon: ShieldAlert },
  } as const;
  const m = map[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${m.bg} ${m.color} ${m.border}`}>
      <m.Icon size={14} aria-hidden="true" />
      {m.text}
    </span>
  );
}
