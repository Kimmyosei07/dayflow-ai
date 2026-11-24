import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Accessible modal dialog.
 * - Closes on Escape and on backdrop click.
 * - Moves focus into the dialog when it opens and restores it afterwards.
 */
export default function Modal({ title, description, onClose, children, footer, size = 'md', labelledBy = 'modal-title' }) {
  const dialogRef = useRef(null);
  // Keep the latest onClose in a ref so the effect below runs only once.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const first = dialogRef.current?.querySelector('input, select, textarea, button:not(.modal__close)');
    (first ?? dialogRef.current)?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal--${size}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} ref={dialogRef} tabIndex={-1}>
        <div className="modal__header">
          <div>
            <h2 id={labelledBy}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="icon-btn icon-btn--sm modal__close" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
