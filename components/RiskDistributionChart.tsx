export default function RiskDistributionChart({ distribution }: { distribution: { low: number; medium: number; high: number } }) {
  const total = distribution.low + distribution.medium + distribution.high;
  const segments = [
    { key: 'high', label: '高', color: '#dc2626' },
    { key: 'medium', label: '中', color: '#d97706' },
    { key: 'low', label: '低', color: '#16a34a' },
  ] as const;
  let acc = 0;
  const W = 320; const H = 28;
  return (
    <div className="mt-2 space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-7">
        {total === 0 ? (
          <rect x={0} y={0} width={W} height={H} fill="#e2e8f0" />
        ) : (
          segments.map((s) => {
            const v = distribution[s.key];
            const w = (v / total) * W;
            const x = acc; acc += w;
            return <rect key={s.key} x={x} y={0} width={w} height={H} fill={s.color} />;
          })
        )}
      </svg>
      <ul className="flex gap-4 text-xs">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ background: s.color }} />{s.label} {distribution[s.key]}</li>
        ))}
        <li className="text-slate-500">合计 {total}</li>
      </ul>
    </div>
  );
}
