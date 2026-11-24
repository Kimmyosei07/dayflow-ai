/** Horizontal progress bar. `value` is 0–100. */
export default function ProgressBar({ value = 0, label }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="progress__bar" style={{ width: `${clamped}%` }} />
    </div>
  );
}
