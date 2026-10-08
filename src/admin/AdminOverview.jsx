import React, { useCallback, useEffect, useState } from 'react';
import { Users, Ban, ShieldCheck, Activity, Briefcase, AlertTriangle, CalendarDays, RefreshCw, Loader2 } from 'lucide-react';
import { adminFetch, readJson, friendlyError, fmtDate, PLATFORM_LABELS } from './adminClient';

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="pg-stat">
      <div className="pg-stat-top">
        <span className="pg-stat-label">{label}</span>
        <span className="pg-stat-icon"><Icon size={15} /></span>
      </div>
      <div className="pg-stat-value">{value}</div>
      {sub && <div className="pg-stat-sub">{sub}</div>}
    </div>
  );
}

export default function AdminOverview({ onOpenUser }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setData(await readJson(await adminFetch('/api/admin/overview'))); } catch (e) { setError(friendlyError(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!data) {
    return error
      ? <p className="pg-notice is-error"><AlertTriangle size={15} /> {error}</p>
      : <div className="pg-empty"><Loader2 size={22} className="pg-spin" /></div>;
  }

  const t = data.totals;
  const maxDay = Math.max(1, ...data.perDay.map(d => d.count));
  const platformTotal = Math.max(1, Object.values(data.perPlatform).reduce((a, b) => a + b, 0));

  return (
    <div className="adm-stack">
      <div className="adm-page-head">
        <div>
          <h1>Overview</h1>
          <p>Everything happening across Agent Penguin.</p>
        </div>
        <button className="pg-icon-btn" onClick={load} aria-label="Refresh" title="Refresh"><RefreshCw size={15} className={loading ? 'pg-spin' : ''} /></button>
      </div>
      {error && <p className="pg-notice is-error"><AlertTriangle size={15} /> {error}</p>}

      <div className="adm-stats">
        <Stat icon={Users} label="Users" value={t.users} sub={`${t.activeThisWeek} signed in this week`} />
        <Stat icon={Briefcase} label="Applications sent" value={t.applied} sub={`${t.appliedThisWeek} this week`} />
        <Stat icon={CalendarDays} label="Sent today" value={t.appliedToday} sub="India time" />
        <Stat icon={Activity} label="Needs review" value={t.needsReview} sub="Not sent automatically" />
        <Stat icon={ShieldCheck} label="Admins" value={t.admins} />
        <Stat icon={Ban} label="Blocked" value={t.blocked} />
      </div>

      <div className="adm-grid-2">
        <section className="pg-card">
          <div className="pg-card-head"><h2 className="pg-card-title">Applications per day</h2><span className="pg-card-sub">Last 14 days</span></div>
          <div className="adm-bars" role="img" aria-label="Applications sent per day for the last 14 days">
            {data.perDay.map(d => (
              <div key={d.date} className="adm-bar" title={`${fmtDate(d.date, false)}: ${d.count}`}>
                <span className="adm-bar-value">{d.count || ''}</span>
                <div className="adm-bar-fill" style={{ height: `${(d.count / maxDay) * 100}%` }} />
                <span className="adm-bar-label">{new Date(d.date).getDate()}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="pg-card">
          <div className="pg-card-head"><h2 className="pg-card-title">By platform</h2></div>
          <div className="adm-split">
            {Object.entries(data.perPlatform).map(([k, n]) => (
              <div key={k} className="adm-split-row">
                <span>{PLATFORM_LABELS[k]}</span>
                <div className="adm-split-track"><div style={{ width: `${(n / platformTotal) * 100}%` }} /></div>
                <strong>{n}</strong>
              </div>
            ))}
          </div>
          <div className="pg-card-head adm-subhead"><h2 className="pg-card-title">Most active users</h2></div>
          <ul className="adm-list">
            {data.topUsers.length === 0 && <li className="adm-muted">No applications yet.</li>}
            {data.topUsers.map(u => (
              <li key={u.id}>
                <button className="adm-link" onClick={() => onOpenUser(u.id)}>{u.name}</button>
                <span className="adm-muted">{u.email}</span>
                <strong>{u.count}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="pg-card">
        <div className="pg-card-head"><h2 className="pg-card-title">Latest applications</h2></div>
        <div className="pg-table-scroll">
          <table className="pg-table">
            <thead><tr><th>Company</th><th>Role</th><th>User</th><th>Platform</th><th>Sent</th></tr></thead>
            <tbody>
              {data.recent.length === 0 && <tr><td colSpan="5"><div className="pg-empty pg-empty-sm">No applications yet.</div></td></tr>}
              {data.recent.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.company}</strong></td>
                  <td>{r.url ? <a className="adm-link" href={r.url} target="_blank" rel="noreferrer">{r.title}</a> : r.title}</td>
                  <td><button className="adm-link" onClick={() => onOpenUser(r.user_id)}>{r.userName}</button></td>
                  <td>{PLATFORM_LABELS[r.platform]}</td>
                  <td className="adm-nowrap">{fmtDate(r.applied_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
