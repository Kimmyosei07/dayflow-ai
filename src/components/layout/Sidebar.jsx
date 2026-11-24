import { NavLink, Link } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV_ITEMS } from './navItems.js';
import Logo from './Logo.jsx';
import { useAppData } from '../../context/AppDataContext.jsx';

export function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'DF';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

/**
 * Desktop: sticky sidebar that can collapse to icons.
 * Mobile (<860px): off-canvas drawer opened from the header menu button.
 */
export default function Sidebar({ mobileOpen, onNavigate }) {
  const { settings, updateSettings } = useAppData();
  const collapsed = settings.sidebarCollapsed;

  return (
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-open' : ''}`} aria-label="Main navigation">
      <Link to="/" className="sidebar__brand" onClick={onNavigate} style={{ color: 'inherit', textDecoration: 'none' }}>
        <span className="sidebar__logo">
          <Logo />
        </span>
        <span className="sidebar__wordmark">
          <strong>DAYFLOW AI</strong>
          <span>Plan · Focus · Live</span>
        </span>
      </Link>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="nav-link" onClick={onNavigate} title={collapsed ? label : undefined}>
            <Icon size={19} />
            <span className="nav-link__label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <Link to="/settings" className="sidebar__profile" onClick={onNavigate} title="Profile & settings">
          <span className="avatar">{initialsOf(settings.displayName)}</span>
          <span className="sidebar__profile-text">
            <strong>{settings.displayName || 'Set your name'}</strong>
            <span>Personal workspace</span>
          </span>
        </Link>
        <button
          type="button"
          className="icon-btn sidebar__collapse"
          onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
    </aside>
  );
}
