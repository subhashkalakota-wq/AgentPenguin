import { LayoutDashboard, MonitorPlay, Briefcase, ScrollText, User, PlugZap, GraduationCap, CalendarClock, Mail, Sparkles, ClipboardCheck } from 'lucide-react';

// Sidebar order: tables first, overview last
export const DASHBOARD_TABS = [
  { key: 'applications', label: 'Applications', icon: Briefcase,       path: '/applications' },
  { key: 'live',         label: 'Live Agent',   icon: MonitorPlay,     path: '/agent' },
  { key: 'activity',     label: 'Activity Log', icon: ScrollText,      path: '/activity' },
  { key: 'inbox',        label: 'Inbox',        icon: Mail,            path: '/inbox' },
  { key: 'skills',       label: 'Penguin Profile', icon: Sparkles,     path: '/skills' },
  { key: 'skilltest',    label: 'Skill Test',   icon: ClipboardCheck,  path: '/skill-test' },
  { key: 'mocks',        label: 'Mocks',        icon: GraduationCap,   path: '/mocks' },
  { key: 'automation',   label: 'Automation',   icon: CalendarClock,   path: '/automation' },
  { key: 'cdp',          label: 'CDP Connection', icon: PlugZap,       path: '/cdp' },
  { key: 'profile',      label: 'Profile',      icon: User,            path: '/profile' },
  { key: 'overview',     label: 'Overview',     icon: LayoutDashboard, path: '/overview' },
];
