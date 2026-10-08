import { LayoutDashboard, MonitorPlay, Briefcase, ScrollText, User, PlugZap, ShieldCheck } from 'lucide-react';

// Sidebar order: tables first, overview last
export const DASHBOARD_TABS = [
  { key: 'applications', label: 'Applications', icon: Briefcase,       path: '/applications' },
  { key: 'live',         label: 'Live Agent',   icon: MonitorPlay,     path: '/agent' },
  { key: 'activity',     label: 'Activity Log', icon: ScrollText,      path: '/activity' },
  { key: 'cdp',          label: 'CDP Connection', icon: PlugZap,       path: '/cdp' },
  { key: 'profile',      label: 'Profile',      icon: User,            path: '/profile' },
  { key: 'overview',     label: 'Overview',     icon: LayoutDashboard, path: '/overview' },
  { key: 'admin',        label: 'Admin',        icon: ShieldCheck,     path: '/admin', adminOnly: true },
];
