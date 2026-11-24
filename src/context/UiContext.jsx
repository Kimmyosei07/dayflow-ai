/**
 * UiContext — app-wide feedback helpers:
 *   const { toast, confirm } = useUi();
 *   toast('Task saved');                       // success message
 *   toast('Could not save', 'error');
 *   if (await confirm({ title: 'Delete task?' })) { ... }
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';

const UiContext = createContext(null);
const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

export function UiProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (message, type = 'success', duration = 3500) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((list) => [...list.slice(-3), { id, message, type }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const confirm = useCallback((options) => {
    setDialog({ confirmLabel: 'Confirm', cancelLabel: 'Cancel', tone: 'danger', ...options });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setDialog(null);
  };

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <UiContext.Provider value={value}>
      {children}

      {dialog && <ConfirmDialog {...dialog} onConfirm={() => close(true)} onCancel={() => close(false)} />}

      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] ?? Info;
          return (
            <div key={t.id} className={`toast toast--${t.type}`}>
              <Icon size={18} />
              <span className="grow">{t.message}</span>
              <button className="icon-btn icon-btn--sm" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </UiContext.Provider>
  );
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside <UiProvider>');
  return ctx;
}
