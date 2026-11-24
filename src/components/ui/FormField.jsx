/** Label + control + hint/error wrapper used by every form. */
export default function FormField({ label, htmlFor, error, hint, optional = false, className = '', children }) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field__label" htmlFor={htmlFor}>
          {label} {optional && <span className="optional">(optional)</span>}
        </label>
      )}
      {children}
      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : (
        hint && <span className="field__hint">{hint}</span>
      )}
    </div>
  );
}
