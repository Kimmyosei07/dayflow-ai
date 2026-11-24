import { LayoutDashboard, ListChecks, CalendarClock, GraduationCap, Timer, BarChart3, Sparkles, Settings } from 'lucide-react';

/** Sidebar navigation — order matches the product specification. */
export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'My Tasks', icon: ListChecks },
  { to: '/planner', label: 'AI Planner', icon: CalendarClock },
  { to: '/academic', label: 'Academic Manager', icon: GraduationCap },
  { to: '/focus', label: 'Focus Mode', icon: Timer },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/assistant', label: 'AI Assistant', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: Settings },
];
