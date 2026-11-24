/**
 * Donut chart drawn with SVG stroke-dasharray segments.
 * `data` = [{ label, value, color }]
 */
export default function DonutChart({ data, size = 160, stroke = 22, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="donut">
      <div className="ring" style={{ width: size, height: size }} role="img" aria-label={data.map((d) => `${d.label}: ${d.value}`).join(', ')}>
        <svg width={size} height={size}>
          <circle className="ring__track" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} />
          {total > 0 &&
            data.map((d) => {
              const length = (d.value / total) * circumference;
              const segment = (
                <circle
                  key={d.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${Math.max(0, length - 2)} ${circumference}`}
                  strokeDashoffset={-offset}
                >
                  <title>{`${d.label}: ${d.value}`}</title>
                </circle>
              );
              offset += length;
              return segment;
            })}
        </svg>
        <div className="ring__label">
          <div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{centerValue ?? total}</div>
            <div className="text-xs muted">{centerLabel}</div>
          </div>
        </div>
      </div>
      <ul className="donut__legend">
        {data.map((d) => (
          <li key={d.label}>
            <span className="dot" style={{ background: d.color }} />
            <span className="grow">{d.label}</span>
            <strong>{d.value}</strong>
            <span className="muted text-xs">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
