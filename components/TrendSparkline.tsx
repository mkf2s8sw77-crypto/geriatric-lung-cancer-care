type P = { date: string; count: number; avgTotal: number };

export default function TrendSparkline({ points }: { points: P[] }) {
  if (points.length === 0) return <p className="text-sm text-slate-500">暂无数据。</p>;
  const W = 320; const H = 100; const padL = 24; const padR = 8; const padT = 8; const padB = 18;
  const maxCount = Math.max(1, ...points.map((p) => p.count));
  const xStep = (W - padL - padR) / Math.max(1, points.length - 1);
  function pos(p: P, idx: number): [number, number] {
    const x = padL + xStep * idx;
    const y = padT + (H - padT - padB) * (1 - p.count / maxCount);
    return [x, y];
  }
  const path = points.map((p, i) => pos(p, i).map((v, k) => (k === 0 ? 'M' : 'L') + v.toFixed(1)).join(' ')).join(' ');
  return (
    <div className="mt-2 space-y-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24">
        <rect x={0} y={0} width={W} height={H} fill="#f8fafc" />
        <path d={path} stroke="#155aa3" strokeWidth={2} fill="none" />
        {points.map((p, i) => <circle key={i} {...{ cx: pos(p, i)[0], cy: pos(p, i)[1], r: 1.5, fill: '#155aa3' }} />)}
      </svg>
      <p className="text-xs text-slate-500">30 天评估提交数；峰值 {maxCount}。</p>
    </div>
  );
}
