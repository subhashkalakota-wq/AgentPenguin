import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, AlertTriangle, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { adminFetch, readJson, friendlyError, fmtDate, PLATFORM_LABELS, STATUS_LABELS } from './adminClient';

const PAGE = 100;

export default function AdminApplications({ onOpenUser }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [platform, setPlatform] = useState('all');
  const [shown, setShown] = useState(PAGE);
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setRows((await readJson(await adminFetch('/api/admin/applications'))).applications); } catch (e) { setError(friendlyError(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter(r => (status === 'all' || r.status === status)
      && (platform === 'all' || r.platform === platform)
      && (!q || [r.company, r.title, r.userName, r.userEmail, r.location].some(v => (v || '').toLowerCase().includes(q))));
  }, [rows, query, status, platform]);

  const remove = async (id) => {
    setDeleting(true);
    try {
      await readJson(await adminFetch(`/api/admin/applications/${id}`, { method: 'DELETE' }));
      setRows(prev => prev.filter(r => r.id !== id));
      setConfirmId(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="adm-stack">
      <div className="adm-page-head">
        <div>
          <h1>Applications</h1>
          <p>{rows ? `${rows.length} applications from every user` : 'Loading…'}</p>
        </div>
      </div>

      <section className="pg-card">
        <div className="pg-table-head">
          <div className="adm-filters">
            <select className="adm-select" value={status} onChange={e => { setStatus(e.target.value); setShown(PAGE); }} aria-label="Status">
              <option value="all">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <select className="adm-select" value={platform} onChange={e => { setPlatform(e.target.value); setShown(PAGE); }} aria-label="Platform">
              <option value="all">All platforms</option>
              {Object.entries(PLATFORM_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div className="pg-table-tools">
            <div className="pg-search">
              <Search size={14} />
              <input value={query} onChange={e => { setQuery(e.target.value); setShown(PAGE); }} placeholder="Company, role or user" aria-label="Search applications" />
            </div>
            <button className="pg-icon-btn" onClick={load} aria-label="Refresh" title="Refresh"><RefreshCw size={15} className={loading ? 'pg-spin' : ''} /></button>
          </div>
        </div>

        {error && <p className="pg-notice is-error pg-adm-error"><AlertTriangle size={15} /> {error}</p>}
        {!rows && !error && <div className="pg-empty"><Loader2 size={22} className="pg-spin" /></div>}

        {rows && (
          <div className="pg-table-scroll">
            <table className="pg-table">
              <thead>
                <tr><th>Company</th><th>Role</th><th>User</th><th>Platform</th><th>Status</th><th>Date</th><th aria-label="Actions" /></tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan="7"><div className="pg-empty pg-empty-sm">No applications match.</div></td></tr>}
                {filtered.slice(0, shown).map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.company}</strong></td>
                    <td className="adm-role">
                      {r.url ? <a className="adm-link" href={r.url} target="_blank" rel="noreferrer">{r.title} <ExternalLink size={11} /></a> : r.title}
                    </td>
                    <td><button className="adm-link" onClick={() => onOpenUser(r.user_id)}>{r.userName}</button></td>
                    <td>{PLATFORM_LABELS[r.platform]}</td>
                    <td><span className={`adm-status is-${r.status}`}>{STATUS_LABELS[r.status] || r.status}</span></td>
                    <td className="adm-nowrap">{fmtDate(r.applied_at)}</td>
                    <td className="adm-nowrap">
                      {confirmId === r.id ? (
                        <span className="adm-inline-confirm">
                          <button className="pg-btn pg-btn-danger" onClick={() => remove(r.id)} disabled={deleting}>{deleting ? <Loader2 size={13} className="pg-spin" /> : 'Delete'}</button>
                          <button className="pg-btn" onClick={() => setConfirmId(null)} disabled={deleting}>Cancel</button>
                        </span>
                      ) : (
                        <button className="pg-icon-btn" onClick={() => setConfirmId(r.id)} aria-label={`Delete ${r.company} application`} title="Delete record"><Trash2 size={14} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > shown && (
          <div className="adm-more"><button className="pg-btn" onClick={() => setShown(s => s + PAGE)}>Show {Math.min(PAGE, filtered.length - shown)} more</button></div>
        )}
      </section>
    </div>
  );
}
