/** Радар навыков на чистом SVG. Каждая ось — навык, точка — доля пройденного. */
export function Radar({ data, size = 320 }: { data: { label: string; ratio: number }[]; size?: number }) {
  const c = size / 2;
  const r = size / 2 - 40;
  const n = data.length;
  const pt = (i: number, k: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + Math.cos(a) * r * k, c + Math.sin(a) * r * k];
  };
  const poly = data.map((d, i) => pt(i, Math.max(0.03, d.ratio)).join(',')).join(' ');
  return (
    <svg viewBox={`-60 -10 ${size + 120} ${size + 20}`} width="100%" style={{ maxWidth: size + 120, display: 'block', margin: '0 auto' }} role="img" aria-label="Радар навыков">
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} points={data.map((_, i) => pt(i, k).join(',')).join(' ')} fill="none" stroke="var(--color-border)" />
      ))}
      {data.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--color-border)" />;
      })}
      <polygon points={poly} fill="color-mix(in srgb, var(--color-accent) 22%, transparent)" stroke="var(--color-accent)" strokeWidth={2} strokeLinejoin="round" />
      {data.map((d, i) => {
        const [x, y] = pt(i, 1.2);
        const short = d.label.replace(' (iOS / Android)', '');
        return (
          <text key={i} x={x} y={y} textAnchor={Math.abs(x - c) < 8 ? 'middle' : x > c ? 'start' : 'end'} dominantBaseline="middle" fontSize={11} fill="var(--color-text-muted)">
            {short} {Math.round(d.ratio * 100)}%
          </text>
        );
      })}
    </svg>
  );
}
