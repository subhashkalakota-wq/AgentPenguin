import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, X, Mail, Phone, Briefcase, CalendarDays, Clock, Ban, CheckCircle2, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { authFetch } from '../lib/api';

function Avatar({ user, size = 36 }) {
  const [failed, setFailed] = useState(false);
  const initials = (user.name || user.email || '?').split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
  if (user.avatar && !failed) {
    return <img src={user.avatar} alt="" className="pg-adm-avatar" style={{ width: size, height: size }} onError={() => setFailed(true)} referrerPolicy="no-referrer" />;
  }
  return <span className="pg-adm-avatar pg-adm-initials" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>{initials}</span>;
}

const fmtDate = (iso) => iso
  ? new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  : '—';

async function readJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function UserDetails({ userId, onClose, onChanged }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    authFetch(`/api/admin/users/${userId}`)
      .then(readJson)
      .then(d => { if (alive) setUser(d.user); })
      .catch(e => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [userId]);

  const setBlocked = async (blocked) => {
    setSaving(true);
    setError(null);
    try {
      const d = await readJson(await authFetch(`/api/admin/users/${userId}/block`, {
        method: 'POST',
        body: JSON.stringify({ blocked }),
      }));
      setUser(d.user);
      setConfirming(false);
      onChanged(d.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="pg-card pg-adm-detail" aria-label="User details">
      <div className="pg-adm-detail-head">
        <h3 className="pg-card-title">User details</h3>
        <button className="pg-icon-btn" onClick={onClose} aria-label="Close details"><X size={16} /></button>
      </div>

      {!user && !error && <div className="pg-empty pg-empty-sm"><Loader2 size={20} className="pg-spin" /></div>}
      {error && <p className="pg-notice is-error"><AlertTriangle size={15} /> {error}</p>}

      {user && (
        <>
          <div className="pg-adm-identity">
            <Avatar user={user} size={72} />
            <div>
              <h2>{user.name}</h2>
              <div className="pg-adm-badges">
                {user.blocked
                  ? <span className="pg-adm-badge is-blocked"><Ban size={12} /> Blocked</span>
                  : <span className="pg-adm-badge is-active"><CheckCircle2 size={12} /> Active</span>}
                {user.isAdmin && <span className="pg-adm-badge"><ShieldCheck size={12} /> Admin</span>}
              </div>
            </div>
          </div>

          <dl className="pg-adm-facts">
            <div><dt><Phone size={14} /> Mobile</dt><dd>{user.phone || <span className="pg-not-set">Not added</span>}</dd></div>
            <div><dt><Mail size={14} /> Email</dt><dd>{user.email ? <a href={`mailto:${user.email}`}>{user.email}</a> : '—'}</dd></div>
            <div><dt><Briefcase size={14} /> Jobs applied</dt><dd>{user.appliedCount}</dd></div>
            <div><dt><CalendarDays size={14} /> Joined</dt><dd>{fmtDate(user.joinedAt)}</dd></div>
            <div><dt><Clock size={14} /> Last sign-in</dt><dd>{fmtDate(user.lastSignInAt)}</dd></div>
          </dl>

          {!user.isAdmin && (
            <div className="pg-adm-actions">
              {confirming ? (
                <div className="pg-adm-confirm" role="alertdialog" aria-label="Confirm">
                  <p>
                    {user.blocked
                      ? <>Unblock <strong>{user.name}</strong>? They'll be able to sign in and use Penguin again.</>
                      : <>Block <strong>{user.name}</strong>? They won't be able to sign in or run the agent until you unblock them.</>}
                  </p>
                  <div>
                    <button className="pg-btn" onClick={() => setConfirming(false)} disabled={saving}>Cancel</button>
                    <button
                      className={`pg-btn ${user.blocked ? 'pg-btn-primary' : 'pg-btn-danger'}`}
                      onClick={() => setBlocked(!user.blocked)}
                      disabled={saving}
                    >
                      {saving && <Loader2 size={14} className="pg-spin" />}
                      {user.blocked ? 'Unblock user' : 'Block user'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className={`pg-btn ${user.blocked ? 'pg-btn-primary' : 'pg-btn-danger-outline'}`}
                  onClick={() => setConfirming(true)}
                >
                  {user.blocked ? <><CheckCircle2 size={14} /> Unblock user</> : <><Ban size={14} /> Block user</>}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </aside>
  );
}

export default function AdminPage() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await readJson(await authFetch('/api/admin/users'));
      setUsers(d.users);
    } catch (e) {
      setError(e.message === 'Failed to fetch' ? 'Backend is not running. Start it with: npm run server' : e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!users) return [];
    return q ? users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : users;
  }, [users, query]);

  const blockedCount = users?.filter(u => u.blocked).length || 0;

  const handleChanged = (updated) => {
    setUsers(prev => prev?.map(u => (u.id === updated.id ? { ...u, blocked: updated.blocked } : u)));
  };

  return (
    <div className={`pg-adm ${selectedId ? 'has-detail' : ''}`}>
      <section className="pg-card pg-adm-list">
        <div className="pg-table-head">
          <div>
            <h2 className="pg-card-title">Users</h2>
            <p className="pg-card-sub">
              {users ? `${users.length} users${blockedCount ? ` · ${blockedCount} blocked` : ''}` : 'Loading…'}
            </p>
          </div>
          <div className="pg-table-tools">
            <div className="pg-search">
              <Search size={14} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" aria-label="Search users" />
            </div>
            <button className="pg-icon-btn" onClick={load} aria-label="Refresh" title="Refresh">
              <RefreshCw size={15} className={loading ? 'pg-spin' : ''} />
            </button>
          </div>
        </div>

        {error && <p className="pg-notice is-error pg-adm-error"><AlertTriangle size={15} /> {error}</p>}

        <div className="pg-table-scroll">
          <table className="pg-table pg-adm-table">
            <thead>
              <tr>
                <th>User</th>
                <th className="pg-adm-col-count">Jobs applied</th>
              </tr>
            </thead>
            <tbody>
              {users && filtered.length === 0 && (
                <tr><td colSpan="2"><div className="pg-empty pg-empty-sm"><span>{query ? 'No users match your search.' : 'No users yet.'}</span></div></td></tr>
              )}
              {filtered.map(u => (
                <tr
                  key={u.id}
                  className={selectedId === u.id ? 'is-selected' : ''}
                  onClick={() => setSelectedId(u.id)}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(u.id); } }}
                  aria-label={`${u.name}, ${u.appliedCount} jobs applied${u.blocked ? ', blocked' : ''}`}
                >
                  <td>
                    <div className="pg-adm-user">
                      <Avatar user={u} />
                      <span className="pg-adm-name">{u.name}</span>
                      {u.blocked && <span className="pg-adm-badge is-blocked"><Ban size={11} /> Blocked</span>}
                    </div>
                  </td>
                  <td className="pg-adm-col-count">{u.appliedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedId && (
        <UserDetails key={selectedId} userId={selectedId} onClose={() => setSelectedId(null)} onChanged={handleChanged} />
      )}
    </div>
  );
}
