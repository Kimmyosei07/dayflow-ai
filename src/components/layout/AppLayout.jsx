import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

/** Application shell: sidebar + sticky header + routed page content. */
export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer and scroll to top whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      <div className={`sidebar-backdrop ${mobileOpen ? 'is-open' : ''}`} onClick={() => setMobileOpen(false)} aria-hidden="true" />
      <div className="app-main">
        <Header onOpenMenu={() => setMobileOpen(true)} />
        <main className="main-content" id="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
