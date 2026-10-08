import React, { useCallback, useEffect, useState } from 'react';
import { LayoutDashboard, Users, Briefcase, Cpu, LogOut, Sun, Moon, ShieldCheck, Loader2, Menu, X } from 'lucide-react';
import AgentPenguinMark from '../components/AgentPenguinMark';
import AdminLogin from './AdminLogin';
import AdminOverview from './AdminOverview';
import AdminUsers from './AdminUsers';
import AdminApplications from './AdminApplications';
import AdminSystem from './AdminSystem';
import { adminSupabase, adminFetch, readJson } from './adminClient';
import '../dashboard.css';
import './admin.css';

const NAV = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/admin' },
  { key: 'users', label: 'Users', icon: Users, path: '/admin/users' },
  { key: 'applications', label: 'Applications', icon: Briefcase, path: '/admin/applications' },
  { key: 'system', label: 'Agent & system', icon: Cpu, path: '/admin/system' },
];

// /admin, /admin/users, /admin/users/<id>, /admin/applications, /admin/system
function parsePath(pathname) {
  const parts = pathname.replace(/\/+$/, '').split('/').slice(2);
  const page = NAV.some(n => n.key === parts[0]) ? parts[0] : 'overview';
  return { page, userId: page === 'users' ? parts[1] || null : null };
}

const THEME_KEY = 'pg_admin_theme';

export default function AdminApp() {
  const [session, setSession] = useState(undefined); // undefined = checking
  const [me, setMe] = useState(null);
  const [notice, setNotice] = useState('');
  const [route, setRoute] = useState(() => parsePath(window.location.pathname));
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'light'; } catch { return 'light'; }
  });

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-brand', 'agent');
    html.setAttribute('data-theme', theme);
    document.title = 'Admin — Agent Penguin';
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* storage unavailable */ }
  }, [theme]);

  // Restore the admin session and re-check admin access with the server
  const verify = useCallback(async () => {
    const { data } = await adminSupabase.auth.getSession();
    if (!data.session) { setSession(null); return; }
    try {
      const info = await readJson(await adminFetch('/api/me'));
      if (!info.isAdmin || info.blocked) {
        await adminSupabase.auth.signOut().catch(() => {});
        setNotice('This account no longer has admin access.');
        setSession(null);
        return;
      }
      setMe({ id: data.session.user.id, email: data.session.user.email, isOwner: info.isOwner });
      setSession(data.session);
    } catch {
      // Backend offline: keep the session; pages show their own error
      setMe({ id: data.session.user.id, email: data.session.user.email });
      setSession(data.session);
    }
  }, []);

  useEffect(() => {
    verify();
    const { data: sub } = adminSupabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setSession(null); setMe(null); }
    });
    const t = setInterval(verify, 5 * 60000);
    return () => { sub.subscription.unsubscribe(); clearInterval(t); };
  }, [verify]);

  useEffect(() => {
    const onPop = () => setRoute(parsePath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = (path) => {
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
    setRoute(parsePath(path));
    setNavOpen(false);
  };
  const openUser = (id) => go(id ? `/admin/users/${id}` : '/admin/users');

  const signOut = async () => {
    await adminSupabase.auth.signOut().catch(() => {});
    setSession(null);
    setMe(null);
  };

  if (session === undefined) {
    return <div className="adm-loading"><Loader2 size={24} className="pg-spin" /></div>;
  }
  if (!session) {
    return <AdminLogin notice={notice} onSignedIn={() => { setNotice(''); verify(); }} />;
  }

  const page = route.page;
  return (
    <div className="adm-shell">
      <header className="adm-topbar">
        <button className="pg-icon-btn adm-menu-btn" onClick={() => setNavOpen(o => !o)} aria-label="Menu">{navOpen ? <X size={17} /> : <Menu size={17} />}</button>
        <a className="adm-brand" href="/admin" onClick={(e) => { e.preventDefault(); go('/admin'); }}>
          <AgentPenguinMark size={22} />
          <strong>Agent Penguin</strong>
          <span className="adm-brand-tag"><ShieldCheck size={12} /> Admin</span>
        </a>
        <div className="adm-topbar-right">
          <span className="adm-me" title={me?.email}>{me?.email}</span>
          <button className="pg-icon-btn" onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))} aria-label="Switch theme" title="Switch theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="pg-btn" onClick={signOut}><LogOut size={14} /> <span className="adm-hide-sm">Sign out</span></button>
        </div>
      </header>

      <nav className={`adm-nav ${navOpen ? 'is-open' : ''}`} aria-label="Admin navigation">
        {NAV.map(({ key, label, icon: Icon, path }) => (
          <button key={key} className={`adm-nav-item ${page === key ? 'active' : ''}`} aria-current={page === key ? 'page' : undefined} onClick={() => go(path)}>
            <Icon size={17} /> <span>{label}</span>
          </button>
        ))}
      </nav>
      {navOpen && <div className="adm-nav-backdrop" onClick={() => setNavOpen(false)} />}

      <main className="adm-main">
        {page === 'overview' && <AdminOverview onOpenUser={openUser} />}
        {page === 'users' && <AdminUsers me={me} openUserId={route.userId} onOpenUser={openUser} />}
        {page === 'applications' && <AdminApplications onOpenUser={openUser} />}
        {page === 'system' && <AdminSystem onOpenUser={openUser} />}
      </main>
    </div>
  );
}
