import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, RefreshCw, X, Mail, Phone, Briefcase, CalendarDays, Clock, Ban, CheckCircle2, Loader2,
  AlertTriangle, ShieldCheck, ShieldOff, Trash2, MapPin, FileText, Link2, Crown,
} from 'lucide-react';
import { adminFetch, readJson, friendlyError, fmtDate, PLATFORM_LABELS, STATUS_LABELS } from './adminClient';

function Avatar({ user, size = 36 }) {
  const [failed, setFailed] = useState(false);
  const initials = (user.name || user.email || '?').split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
  if (user.avatar && !failed) {
    return <img src={user.avatar} alt="" className="pg-adm-avatar" style={{ width: size, height: size }} onError={() => setFailed(true)} referrerPolicy="no-referrer" />;
  }
  return <span className="pg-adm-avatar pg-adm-initials" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>{initials}</span>;
}

function Badges({ user }) {
  return (
    <>
      {user.blocked && <span className="pg-adm-badge is-blocked"><Ban size={11} /> Blocked</span>}
      {user.isOwner ? <span className="pg-adm-badge"><Crown size={11} /> Owner</span>
        : user.isAdmin && <span className="pg-adm-badge"><ShieldCheck size={11} /> Admin</span>}
    </>
  );
}

// Each action needs a second click to confirm
const ACTIONS = {
  block: { label: 'Block user', icon: Ban, tone: 'pg-btn-danger', confirm: (n) => <>Block <strong>{n}</strong>? They can't sign in or run Penguin until you unblock them.</> },
  unblock: { label: 'Unblock user', icon: CheckCircle2, tone: 'pg-btn-primary', confirm: (n) => <>Unblock <strong>{n}</strong>? They can sign in and use Penguin again.</> },
  makeAdmin: { label: 'Make admin', icon: ShieldCheck, tone: 'pg-btn-primary', confirm: (n) => <>Give <strong>{n}</strong> full admin access? They'll be able to sign in to this console and manage every user.</> },
  removeAdmin: { label: 'Remove admin', icon: ShieldOff, tone: 'pg-btn-danger', confirm: (n) => <>Remove admin access from <strong>{n}</strong>? They'll keep their normal user account.</> },
  delete: { label: 'Delete user', icon: Trash2, tone: 'pg-btn-danger', confirm: (n) => <>Permanently delete <strong>{n}</strong> and all their applications? This can't be undone.</> },
};

function UserDetails({ userId, me, onClose, onChanged, onDeleted }) {
  const [user, setUser] = useState(null);
  const [apps, setApps] = useState([]);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null); // action key awaiting confirmation
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState('details');

  useEffect(() => {
    let alive = true;
    adminFetch(`/api/admin/users/${userId}`).then(readJson)
      .then(d => { if (alive) { setUser(d.user); setApps(d.applications || []); } })
      .catch(e => { if (alive) setError(friendlyError(e)); });
    return () => { alive = false; };
  }, [userId]);

  const run = async (action) => {
    setSaving(true);
    setError(null);
    try {
      if (action === 'delete') {
        await readJson(await adminFetch(`/api/admin/users/${userId}`, { method: 'DELETE' }));
        onDeleted(userId);
        return;
      }
      const [path, body] = action === 'block' || action === 'unblock'
        ? ['block', { blocked: action === 'block' }]
        : ['role', { admin: action === 'makeAdmin' }];
      const d = await readJson(await adminFetch(`/api/admin/users/${userId}/${path}`, { method: 'POST', body: JSON.stringify(body) }));
      setUser(d.user);
      onChanged(d.user);
      setPending(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  const isSelf = user && me?.id === user.id;
  const available = !user || isSelf || user.isOwner ? [] : [
    user.blocked ? 'unblock' : (!user.isAdmin && 'block'),
    !user.blocked && (user.isAdmin ? 'removeAdmin' : 'makeAdmin'),
    'delete',
  ].filter(Boolean);
  const p = user?.profile || {};

  return (
    <aside className="pg-card pg-adm-detail" aria-label="User details">
      <div className="pg-adm-detail-head">
        <h3 className="pg-card-title">User</h3>
        <button className="pg-icon-btn" onClick={onClose} aria-label="Close details"><X size={16} /></button>
      </div>

      {!user && !error && <div className="pg-empty pg-empty-sm"><Loader2 size={20} className="pg-spin" /></div>}
      {error && <p className="pg-notice is-error adm-detail-error"><AlertTriangle size={15} /> {error}</p>}

      {user && (
        <>
          <div className="pg-adm-identity">
            <Avatar user={user} size={72} />
            <div>
              <h2>{user.name}</h2>
              {p.headline && <p className="adm-muted adm-headline">{p.headline}</p>}
              <div className="pg-adm-badges">
                {!user.blocked && <span className="pg-adm-badge is-active"><CheckCircle2 size={12} /> Active</span>}
                <Badges user={user} />
              </div>
            </div>
          </div>

          <div className="adm-seg" role="tablist">
            {[['details', 'Details'], ['profile', 'Profile'], ['apps', `Applications (${apps.length})`]].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={section === k} className={section === k ? 'active' : ''} onClick={() => setSection(k)}>{l}</button>
            ))}
          </div>

          {section === 'details' && (
            <dl className="pg-adm-facts">
              <div><dt><Phone size={14} /> Mobile</dt><dd>{user.phone || <span className="pg-not-set">Not added</span>}</dd></div>
              <div><dt><Mail size={14} /> Email</dt><dd>{user.email ? <a href={`mailto:${user.email}`}>{user.email}</a> : '—'}</dd></div>
              <div><dt><Briefcase size={14} /> Jobs applied</dt><dd>{user.appliedCount}</dd></div>
              <div><dt><CalendarDays size={14} /> Joined</dt><dd>{fmtDate(user.joinedAt)}</dd></div>
              <div><dt><Clock size={14} /> Last sign-in</dt><dd>{fmtDate(user.lastSignInAt)}</dd></div>
            </dl>
          )}

          {section === 'profile' && (
            <div className="adm-profile">
              <dl className="pg-adm-facts">
                <div><dt><MapPin size={14} /> Location</dt><dd>{p.location || <span className="pg-not-set">Not added</span>}</dd></div>
                <div><dt><Briefcase size={14} /> Target role</dt><dd>{p.targetRole || <span className="pg-not-set">Not added</span>}</dd></div>
                <div><dt><Clock size={14} /> Experience</dt><dd>{p.experienceYears != null ? `${p.experienceYears} years` : '—'}</dd></div>
                <div><dt><FileText size={14} /> Resume</dt><dd>{p.resumeFile || <span className="pg-not-set">Not uploaded</span>}</dd></div>
                {p.linkedinUrl && <div><dt><Link2 size={14} /> LinkedIn</dt><dd><a href={p.linkedinUrl} target="_blank" rel="noreferrer">Open</a></dd></div>}
                <div><dt><CheckCircle2 size={14} /> Profile</dt><dd>{p.profileCompleted ? 'Complete' : 'Incomplete'}</dd></div>
              </dl>
              {p.skills?.length > 0 && (
                <div className="adm-block">
                  <h4>Skills</h4>
                  <div className="adm-tags">{p.skills.map(s => <span key={s} className="pg-tag">{s}</span>)}</div>
                </div>
              )}
              <div className="adm-block">
                <h4>Application answers</h4>
                {p.answers?.length ? p.answers.map(a => (
                  <div key={a.question} className="adm-qa"><strong>{a.question}</strong><p>{a.answer}</p></div>
                )) : <p className="adm-muted">No answers saved yet.</p>}
              </div>
            </div>
          )}

          {section === 'apps' && (
            <ul className="adm-applist">
              {apps.length === 0 && <li className="adm-muted">No applications yet.</li>}
              {apps.map(a => (
                <li key={a.id}>
                  <div>
                    <strong>{a.company}</strong>
                    {a.url ? <a href={a.url} target="_blank" rel="noreferrer">{a.title}</a> : <span>{a.title}</span>}
                  </div>
                  <div className="adm-applist-meta">
                    <span className={`adm-status is-${a.status}`}>{STATUS_LABELS[a.status] || a.status}</span>
                    <span>{PLATFORM_LABELS[a.platform]} · {fmtDate(a.applied_at, false)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {available.length > 0 && (
            <div className="pg-adm-actions">
              {pending ? (
                <div className="pg-adm-confirm" role="alertdialog" aria-label="Confirm">
                  <p>{ACTIONS[pending].confirm(user.name)}</p>
                  <div>
                    <button className="pg-btn" onClick={() => setPending(null)} disabled={saving}>Cancel</button>
                    <button className={`pg-btn ${ACTIONS[pending].tone}`} onClick={() => run(pending)} disabled={saving}>
                      {saving && <Loader2 size={14} className="pg-spin" />}
                      {ACTIONS[pending].label}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="adm-actions">
                  {available.map(k => {
                    const A = ACTIONS[k];
                    const Icon = A.icon;
                    return (
                      <button key={k} className={`pg-btn ${k === 'delete' || k === 'block' || k === 'removeAdmin' ? 'pg-btn-danger-outline' : ''}`} onClick={() => setPending(k)}>
                        <Icon size={14} /> {A.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {(isSelf || user.isOwner) && (
            <p className="adm-muted adm-detail-note">{isSelf ? 'This is your account.' : 'Owners are set on the server (ADMIN_EMAILS) and can’t be changed here.'}</p>
          )}
        </>
      )}
    </aside>
  );
}

const FILTERS = [['all', 'All'], ['active', 'Active'], ['blocked', 'Blocked'], ['admins', 'Admins']];

export default function AdminUsers({ me, openUserId, onOpenUser }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setUsers((await readJson(await adminFetch('/api/admin/users'))).users); } catch (e) { setError(friendlyError(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = query.trim().toLowerCase();
    return users.filter(u => (filter === 'all' || (filter === 'blocked' ? u.blocked : filter === 'admins' ? u.isAdmin : !u.blocked))
      && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
  }, [users, query, filter]);

  const handleChanged = (updated) => setUsers(prev => prev?.map(u => (u.id === updated.id ? { ...u, ...updated } : u)));
  const handleDeleted = (id) => { setUsers(prev => prev?.filter(u => u.id !== id)); onOpenUser(null); };

  return (
    <div className="adm-stack">
      <div className="adm-page-head">
        <div>
          <h1>Users</h1>
          <p>{users ? `${users.length} users · ${users.filter(u => u.blocked).length} blocked · ${users.filter(u => u.isAdmin).length} admins` : 'Loading…'}</p>
        </div>
      </div>

      <div className={`pg-adm ${openUserId ? 'has-detail' : ''}`}>
        <section className="pg-card pg-adm-list">
          <div className="pg-table-head">
            <div className="adm-chips">
              {FILTERS.map(([k, l]) => <button key={k} className={`pg-chip ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}
            </div>
            <div className="pg-table-tools">
              <div className="pg-search">
                <Search size={14} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" aria-label="Search users" />
              </div>
              <button className="pg-icon-btn" onClick={load} aria-label="Refresh" title="Refresh"><RefreshCw size={15} className={loading ? 'pg-spin' : ''} /></button>
            </div>
          </div>

          {error && <p className="pg-notice is-error pg-adm-error"><AlertTriangle size={15} /> {error}</p>}

          <div className="pg-table-scroll">
            <table className="pg-table pg-adm-table">
              <thead>
                <tr><th>User</th><th className="adm-hide-sm">Last sign-in</th><th className="pg-adm-col-count">Jobs applied</th></tr>
              </thead>
              <tbody>
                {users && filtered.length === 0 && (
                  <tr><td colSpan="3"><div className="pg-empty pg-empty-sm"><span>{query || filter !== 'all' ? 'No users match.' : 'No users yet.'}</span></div></td></tr>
                )}
                {filtered.map(u => (
                  <tr
                    key={u.id}
                    className={openUserId === u.id ? 'is-selected' : ''}
                    onClick={() => onOpenUser(u.id)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenUser(u.id); } }}
                    aria-label={`${u.name}, ${u.appliedCount} jobs applied${u.blocked ? ', blocked' : ''}`}
                  >
                    <td>
                      <div className="pg-adm-user">
                        <Avatar user={u} />
                        <div className="adm-user-text">
                          <span className="pg-adm-name">{u.name}</span>
                          <span className="adm-muted">{u.email}</span>
                        </div>
                        <Badges user={u} />
                      </div>
                    </td>
                    <td className="adm-hide-sm adm-nowrap">{fmtDate(u.lastSignInAt, false)}</td>
                    <td className="pg-adm-col-count">{u.appliedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {openUserId && (
          <UserDetails key={openUserId} userId={openUserId} me={me} onClose={() => onOpenUser(null)} onChanged={handleChanged} onDeleted={handleDeleted} />
        )}
      </div>
    </div>
  );
}
