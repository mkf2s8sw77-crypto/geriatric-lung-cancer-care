type Point = { date: string; total: number; top: number };

export default function TrendChart({ points }: { points: Point[] }) {
  if (points.length === 0) return null;
  const W = 320; const H = 140; const padL = 28; const padR = 8; const padT = 8; const padB = 24;
  const maxV = Math.max(10, ...points.flatMap((p) => [p.total, p.top])) * 1.1;
  const xStep = (W - padL - padR) / Math.max(1, points.length - 1);
  function pos(p: Point, idx: number, key: 'total' | 'top'): [number, number] {
    const x = padL + xStep * idx;
    const y = padT + (H - padT - padB) * (1 - p[key] / maxV);
    return [x, y];
  }
  const totalPath = points.map((p, i) => pos(p, i, 'total').map((v, k) => (k === 0 ? 'M' : 'L') + v.toFixed(1)).join(' '));
  const topPath = points.map((p, i) => pos(p, i, 'top').map((v, k) => (k === 0 ? 'M' : 'L') + v.toFixed(1)).join(' '));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40">
      <rect x={0} y={0} width={W} height={H} fill="#f8fafc" />
      {[0, 0.25, 0.5, 0.75, 1].map((r) => {
        const y = padT + (H - padT - padB) * r;
        return <line key={r} x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e2e8f0" />;
      })}
      <path d={totalPath.join(' ')} stroke="#155aa3" strokeWidth={2} fill="none" />
      <path d={topPath.join(' ')} stroke="#d97706" strokeWidth={2} fill="none" />
      {points.map((p, i) => {
        const [x, y] = pos(p, i, 'total');
        return <circle key={'t' + i} cx={x} cy={y} r={2.5} fill="#155aa3" />;
      })}
      {points.map((p, i) => {
        const [x, y] = pos(p, i, 'top');
        return <circle key={'o' + i} cx={x} cy={y} r={2.5} fill="#d97706" />;
      })}
      {points.map((p, i) => (
        <text key={'x' + i} x={padL + xStep * i} y={H - 6} fontSize={8} textAnchor="middle" fill="#64748b">{p.date.slice(5)}</text>
      ))}
    </svg>
  );
}
