/**
 * Lightweight, dependency-free bar chart built from plain HTML/CSS.
 * `data` = [{ label, value }]. Values are real numbers from analytics utils.
 */
export default function BarChart({ data, height = 160, formatValue = (v) => v, ariaLabel, color }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bar-chart" style={{ height }} role="img" aria-label={ariaLabel}>
      {data.map((d) => (
        <div className="bar-chart__col" key={d.label} title={`${d.label}: ${formatValue(d.value)}`}>
          <span className="bar-chart__value">{d.value > 0 ? formatValue(d.value) : ''}</span>
          <div className="bar-chart__track">
            <div className="bar-chart__bar" style={{ height: `${(d.value / max) * 100}%`, ...(color ? { background: color } : {}) }} />
          </div>
          <span className="bar-chart__label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
