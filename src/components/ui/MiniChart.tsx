interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
}

export function BarChart({ data, height = 120 }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-1.5 sm:gap-2" style={{ height }} role="img" aria-label="Bar chart">
      {data.map((item) => (
        <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] text-text-muted font-medium">{item.value > 0 ? item.value.toLocaleString() : ''}</span>
          <div
            className={`w-full rounded-t-sm transition-all duration-500 ${item.color ?? 'bg-primary-500'}`}
            style={{ height: `${(item.value / max) * (height - 28)}px`, minHeight: item.value > 0 ? 4 : 0 }}
          />
          <span className="text-[10px] text-text-muted truncate max-w-full">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export function Sparkline({ data, color = '#3b82f6', height = 40 }: SparklineProps) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 200;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} role="img" aria-label="Sparkline chart">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface DonutChartProps {
  value: number;
  max: number;
  size?: number;
  label: string;
  color?: string;
}

export function DonutChart({ value, max, size = 80, label, color = '#3b82f6' }: DonutChartProps) {
  const pct = Math.min(value / Math.max(max, 1), 1);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} role="img" aria-label={`${label}: ${Math.round(pct * 100)}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth="6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-700"
        />
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" className="text-sm font-bold fill-text-primary">
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}
