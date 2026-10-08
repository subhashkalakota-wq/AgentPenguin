import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Square, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { adminFetch, readJson, friendlyError, PLATFORM_LABELS } from './adminClient';

const STATE_LABELS = { idle: 'Idle', running: 'Running', paused: 'Paused', pacing: 'Running', completed: 'Finished' };

function Service({ ok, label }) {
  return (
    <li className={`adm-service ${ok ? 'is-ok' : 'is-off'}`}>
      {ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />} {label}
      <span>{ok ? 'Configured' : 'Not set'}</span>
    </li>
  );
}

// Live agent status, the running user's settings, services, and the agent's log. Refreshes every 5s.
export default function AdminSystem({ onOpenUser }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [stopping, setStopping] = useState(false);

  const load = useCallback(async () => {
    try { setData(await readJson(await adminFetch('/api/admin/system'))); setError(null); } catch (e) { setError(friendlyError(e)); }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const stop = async () => {
    setStopping(true);
    try {
      await readJson(await adminFetch('/api/admin/agent/stop', { method: 'POST' }));
      setConfirmStop(false);
      await load();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setStopping(false);
    }
  };

  if (!data) {
    return error ? <p className="pg-notice is-error"><AlertTriangle size={15} /> {error}</p> : <div className="pg-empty"><Loader2 size={22} className="pg-spin" /></div>;
  }

  const active = data.agentState === 'running' || data.agentState === 'paused' || data.agentState === 'pacing';
  const c = data.config || {};
  const s = data.services || {};

  return (
    <div className="adm-stack">
      <div className="adm-page-head">
        <div>
          <h1>Agent &amp; system</h1>
          <p>Live status of the Penguin agent on this server. Updates every 5 seconds.</p>
        </div>
        <button className="pg-icon-btn" onClick={load} aria-label="Refresh" title="Refresh"><RefreshCw size={15} /></button>
      </div>
      {error && <p className="pg-notice is-error"><AlertTriangle size={15} /> {error}</p>}

      <div className="adm-grid-2">
        <section className="pg-card adm-pad">
          <div className="adm-agent-head">
            <span className={`pg-state pg-state-${data.agentState}`}><span className="pg-state-dot" /> {STATE_LABELS[data.agentState] || data.agentState}</span>
            {active && (confirmStop ? (
              <span className="adm-inline-confirm">
                <button className="pg-btn pg-btn-danger" onClick={stop} disabled={stopping}>{stopping ? <Loader2 size={14} className="pg-spin" /> : <Square size={13} />} Stop now</button>
                <button className="pg-btn" onClick={() => setConfirmStop(false)} disabled={stopping}>Cancel</button>
              </span>
            ) : (
              <button className="pg-btn pg-btn-danger-outline" onClick={() => setConfirmStop(true)}><Square size={13} /> Stop agent</button>
            ))}
          </div>
          <dl className="adm-kv">
            <div><dt>Run by</dt><dd>{data.runUser ? <button className="adm-link" onClick={() => onOpenUser(data.runUser.id)}>{data.runUser.name}</button> : '—'}</dd></div>
            <div><dt>Chrome (CDP)</dt><dd>{data.cdpConnected ? 'Connected' : 'Not connected'}</dd></div>
            <div><dt>This run</dt><dd>{data.run?.applied ?? 0} applied · {data.run?.needsReview ?? 0} needs review · {data.run?.found ?? 0} found</dd></div>
            <div><dt>Target</dt><dd>{c.maxApplications} applications · {c.parallelTabs} tabs at once</dd></div>
            <div><dt>Platforms</dt><dd>{(c.platforms || []).map(p => PLATFORM_LABELS[p] || p).join(', ') || '—'}</dd></div>
            <div><dt>Roles</dt><dd>{(c.roles || []).filter(Boolean).join(', ') || '—'}</dd></div>
            <div><dt>Location</dt><dd>{c.location || '—'}</dd></div>
          </dl>
        </section>

        <section className="pg-card adm-pad">
          <h2 className="pg-card-title">Services</h2>
          <ul className="adm-services">
            <Service ok={s.supabase} label="Supabase (admin)" />
            <Service ok={s.groq} label="Groq AI" />
            <Service ok={s.openai} label="OpenAI" />
            <Service ok={s.gemini} label="Gemini" />
          </ul>
          <p className="adm-muted adm-small">Keys stay on the server and are never shown here.</p>
        </section>
      </div>

      <section className="pg-card">
        <div className="pg-card-head"><h2 className="pg-card-title">Agent log</h2><span className="pg-card-sub">Last {data.logs?.length || 0} events</span></div>
        <ol className="adm-log">
          {(!data.logs || data.logs.length === 0) && <li className="adm-muted">Nothing yet.</li>}
          {[...(data.logs || [])].reverse().map(l => (
            <li key={l.id} className={`is-${l.type}`}>
              <time>{l.timestamp}</time>
              <strong>{l.tag}</strong>
              <span>{l.message}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
