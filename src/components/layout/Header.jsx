import { Link } from 'react-router-dom';
import { Menu, CalendarDays, Timer, Moon, Sun } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext.jsx';
import { useFocusTimer } from '../../context/FocusTimerContext.jsx';
import { formatClock } from '../../utils/timerUtils.js';
import NotificationsMenu from './NotificationsMenu.jsx';

export default function Header({ onOpenMenu }) {
  const { now, settings, updateSettings } = useAppData();
  const timer = useFocusTimer();
  const timerActive = timer.status !== 'idle';

  return (
    <header className="app-header">
      <button type="button" className="icon-btn mobile-only" onClick={onOpenMenu} aria-label="Open navigation menu">
        <Menu size={20} />
      </button>

      <div className="app-header__date">
        <CalendarDays size={16} />
        <span className="long">{now.toLocaleDateString(undefined, { weekday: 'long' })},</span>
        <span>{now.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
      </div>

      <div className="app-header__actions">
        {timerActive && (
          <Link to="/focus" className="header-timer" title="Go to Focus Mode">
            <Timer size={15} />
            {formatClock(timer.remainingMs)}
            <span className="text-xs">{timer.status === 'paused' ? 'paused' : timer.mode === 'focus' ? 'focus' : 'break'}</span>
          </Link>
        )}
        <button
          type="button"
          className="icon-btn"
          onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
          aria-label={settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={settings.theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {settings.theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <NotificationsMenu />
      </div>
    </header>
  );
}
