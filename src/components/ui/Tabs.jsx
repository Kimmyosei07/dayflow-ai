/** Segmented tabs. `options` = [{ value, label, count? }] */
export default function Tabs({ options, value, onChange, label }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          className={`tab ${value === opt.value ? 'is-active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.icon && <opt.icon size={15} />}
          {opt.label}
          {typeof opt.count === 'number' && <span className="tab__count">{opt.count}</span>}
        </button>
      ))}
    </div>
  );
}
