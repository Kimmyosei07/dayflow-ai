/** Accessible on/off switch built on a real checkbox. */
export default function Toggle({ label, description, checked, onChange, id }) {
  return (
    <label className="toggle" htmlFor={id}>
      <span>
        <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{label}</span>
        {description && <span className="field__hint" style={{ display: 'block' }}>{description}</span>}
      </span>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden="true" />
    </label>
  );
}
