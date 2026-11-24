import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, Clock, GraduationCap, BellOff } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext.jsx';
import { buildNotifications } from '../../utils/notificationUtils.js';
import { useClickOutside } from '../../hooks/useClickOutside.js';

const ICONS = { danger: AlertTriangle, warning: Clock, info: GraduationCap };
const COLORS = { danger: 'var(--color-danger)', warning: 'var(--color-warning)', info: 'var(--color-primary)' };

/** Bell icon with a dropdown of deadline reminders built from real task data. */
export default function NotificationsMenu() {
  const { tasks, courses, now, settings } = useAppData();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  const items = useMemo(() => buildNotifications(tasks, courses, now, settings.notifications), [tasks, courses, now, settings.notifications]);

  return (
    <div className="popover-wrap" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${items.length ? ` (${items.length})` : ''}`}
        aria-expanded={open}
        title="Notifications"
      >
        <Bell size={19} />
        {items.length > 0 && <span className="icon-btn__dot">{items.length}</span>}
      </button>
      {open && (
        <div className="popover" role="menu">
          <div className="popover__title">Notifications</div>
          {!settings.notifications.deadlineReminders ? (
            <div className="empty-state empty-state--compact">
              <BellOff size={20} className="muted" />
              <p>Deadline reminders are turned off in Settings.</p>
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state empty-state--compact">
              <p>You're all caught up. No overdue or due-today tasks.</p>
            </div>
          ) : (
            items.map((n) => {
              const Icon = ICONS[n.tone];
              return (
                <button
                  key={n.id}
                  type="button"
                  role="menuitem"
                  className="notification"
                  onClick={() => {
                    setOpen(false);
                    navigate(n.link);
                  }}
                >
                  <Icon size={18} style={{ color: COLORS[n.tone], flexShrink: 0, marginTop: 2 }} />
                  <span className="grow">
                    <strong>{n.title}</strong>
                    <span>{n.message}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
