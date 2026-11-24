/** Circular progress indicator. `value` is 0–100. */
export default function ProgressRing({ value = 0, size = 120, stroke = 10, children, color }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${Math.round(clamped)}% complete`}>
      <svg width={size} height={size}>
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} />
        <circle
          className="ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          style={color ? { stroke: color } : undefined}
        />
      </svg>
      <div className="ring__label">{children}</div>
    </div>
  );
}
