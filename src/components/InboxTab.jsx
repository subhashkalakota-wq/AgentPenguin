import React, { useCallback, useEffect, useState } from 'react';
import { Mail, RefreshCw, Loader2, AlertTriangle, CheckCircle2, Send, X, CalendarDays, MessagesSquare, Reply, Inbox } from 'lucide-react';
import { authFetch } from '../lib/api';

const STAGE = {
  interview: { label: 'Interview', cls: 'is-interview' },
  assessment: { label: 'Assessment', cls: 'is-assessment' },
  offer: { label: 'Offer', cls: 'is-offer' },
  rejected: { label: 'Not selected', cls: 'is-rejected' },
  viewed: { label: 'Viewed', cls: '' },
  confirmation: { label: 'Received', cls: '' },
};

async function call(path, body) {
  const res = await authFetch(path, body ? { method: 'POST', body: JSON.stringify(body) } : undefined);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
  return data;
}
const friendly = (e) => (e.message === 'Failed to fetch' ? 'Backend is not running. Start it with: npm run server' : e.message);
const fmt = (iso, time = false) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', ...(time ? { hour: 'numeric', minute: '2-digit' } : {}) });
const ago = (iso) => { const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };

function FollowUpModal({ item, account, onClose, onSent }) {
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    call('/api/followup/draft', { jobId: item.jobId })
      .then(d => { if (alive) setDraft(d); })
      .catch(e => { if (alive) setError(friendly(e)); });
    return () => { alive = false; };
  }, [item.jobId]);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await call('/api/followup/send', { jobId: item.jobId, to: draft.to, subject: draft.subject, body: draft.body });
      onSent();
    } catch (e) { setError(friendly(e)); } finally { setSending(false); }
  };

  return (
    <div className="pg-modal-backdrop" onClick={onClose}>
      <div className="pg-modal pg-settings pg-followup-modal" role="dialog" aria-modal="true" aria-labelledby="fu-title" onClick={(e) => e.stopPropagation()}>
        <div className="pg-modal-head">
          <div>
            <h2 id="fu-title">Follow up</h2>
            <p><strong>{item.company}</strong> · {item.title} · applied {item.daysAgo} days ago</p>
          </div>
          <button className="pg-icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="pg-settings-body">
          {!draft && !error && <div className="pg-empty pg-empty-sm"><Loader2 size={20} className="pg-spin" /> Writing a follow-up for this job…</div>}
          {draft && (
            <div className="pg-followup-form">
              <label className="pg-field"><span>To</span>
                <input className="pg-input" type="email" value={draft.to} onChange={(e) => setDraft(d => ({ ...d, to: e.target.value }))} placeholder="recruiter@company.com" />
              </label>
              {!draft.to && <p className="pg-followup-hint">No recruiter email was found for this job yet. Add one from the job post or a recruiter's message.</p>}
              {draft.inThread && <p className="pg-followup-hint"><Reply size={13} /> Sent as a reply in the recruiter's email thread.</p>}
              <label className="pg-field"><span>Subject</span>
                <input className="pg-input" value={draft.subject} onChange={(e) => setDraft(d => ({ ...d, subject: e.target.value }))} />
              </label>
              <label className="pg-field"><span>Message</span>
                <textarea className="pg-input" rows={10} value={draft.body} onChange={(e) => setDraft(d => ({ ...d, body: e.target.value }))} />
              </label>
            </div>
          )}
        </div>
        {error && <p className="pg-rq-message is-error"><AlertTriangle size={14} /> {error}</p>}
        <div className="pg-modal-foot">
          <span className="pg-followup-from">Sends from {account?.user || 'your email'}</span>
          <div className="pg-modal-foot-right">
            <button type="button" className="pg-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="pg-btn pg-btn-primary" onClick={send} disabled={!draft || sending || !draft.to}>
              {sending ? <Loader2 size={14} className="pg-spin" /> : <Send size={14} />} Send follow-up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inbox: job emails read from the user's mailbox (interviews, tests, offers, rejections)
 * matched to their applications, and follow-ups for applications with no reply yet.
 */
export default function InboxTab({ onOpenAutomation, onPractise }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState(null);
  const [writing, setWriting] = useState(null);

  const load = useCallback(async () => {
    try { setData(await call('/api/inbox')); setError(null); } catch (e) { setError(friendly(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const setSetting = async (patch) => {
    try {
      const settings = await call('/api/inbox/settings', patch);
      setData(d => ({ ...d, settings }));
      if (patch.enabled) checkNow();
    } catch (e) { setError(friendly(e)); }
  };

  const checkNow = async () => {
    setChecking(true);
    setNotice(null);
    try {
      const r = await call('/api/inbox/check', {});
      setNotice(`Checked ${r.checked} job email${r.checked === 1 ? '' : 's'}: ${r.updates} update${r.updates === 1 ? '' : 's'}, ${r.applicationsUpdated} application${r.applicationsUpdated === 1 ? '' : 's'} updated.`);
      await load();
    } catch (e) { setError(friendly(e)); } finally { setChecking(false); }
  };

  const skip = async (item) => {
    try { await call('/api/followup/skip', { jobId: item.jobId }); await load(); } catch (e) { setError(friendly(e)); }
  };

  if (!data) {
    return error ? <p className="pg-notice is-error"><AlertTriangle size={15} /> {error}</p> : <div className="pg-card pg-empty"><Loader2 size={22} className="pg-spin" /></div>;
  }
  const { settings, account, events, followUps } = data;

  return (
    <div className="pg-inbox">
      {error && <p className="pg-notice is-error"><AlertTriangle size={15} /> {error}</p>}

      <section className="pg-card pg-auto-card">
        <div className="pg-auto-head">
          <span className="pg-auto-icon"><Mail size={18} /></span>
          <div>
            <h2>Inbox tracker</h2>
            <p>{account
              ? <>Reads job emails in <strong>{account.user}</strong> and updates your applications: viewed, assessment, interview, offer or not selected.</>
              : 'Reads your job emails and updates your applications automatically.'}</p>
          </div>
          {account && (
            <button type="button" role="switch" aria-checked={settings.enabled} aria-label="Inbox tracker" className={`pg-switch ${settings.enabled ? 'is-on' : ''}`} onClick={() => setSetting({ enabled: !settings.enabled })}><span /></button>
          )}
        </div>

        {!account ? (
          <div className="pg-auto-note">
            <AlertTriangle size={15} />
            <span>
              Connect your email first: in <strong>Automation → Alerts → Email</strong>, add your Gmail and an app password. The tracker uses the same account.
              {onOpenAutomation && <> <button type="button" className="pg-market-link" onClick={onOpenAutomation}>Open Automation</button></>}
            </span>
          </div>
        ) : (
          <div className="pg-inbox-bar">
            <span className="pg-auto-next">
              {settings.enabled ? 'Checks every 30 minutes.' : 'Off — turn it on to check every 30 minutes.'}
              {settings.lastChecked && <> Last checked {ago(settings.lastChecked)}.</>}
            </span>
            <label className="pg-inbox-days">
              Follow up after
              <select className="pg-input" value={settings.followUpDays} onChange={(e) => setSetting({ followUpDays: Number(e.target.value) })}>
                {[5, 7, 10, 14].map(d => <option key={d} value={d}>{d} days</option>)}
              </select>
            </label>
            <button type="button" className="pg-btn" onClick={checkNow} disabled={checking}>
              {checking ? <Loader2 size={14} className="pg-spin" /> : <RefreshCw size={14} />} Check now
            </button>
          </div>
        )}
        {notice && <p className="pg-rq-message is-ok"><CheckCircle2 size={14} /> {notice}</p>}
      </section>

      <div className="pg-inbox-grid">
        <section className="pg-card pg-auto-card">
          <div className="pg-mk-title"><Inbox size={16} /><h3>Updates from your email</h3></div>
          {events.length === 0 ? (
            <p className="pg-mk-empty">{account ? 'No job updates yet. Click "Check now" to read your recent emails.' : 'Updates appear here once your email is connected.'}</p>
          ) : (
            <ul className="pg-inbox-events">
              {events.map(e => {
                const st = STAGE[e.stage] || { label: e.stage, cls: '' };
                return (
                  <li key={e.id}>
                    <span className={`pg-stage ${st.cls}`}>{st.label}</span>
                    <div className="pg-inbox-event">
                      <strong>{e.company}{e.role ? ` · ${e.role}` : ''}</strong>
                      <p>{e.summary}</p>
                      <span className="pg-inbox-meta">
                        {fmt(e.date)} · {e.from}
                        {e.when && <> · <CalendarDays size={12} /> {fmt(e.when, true)}</>}
                        {e.deadline && <> · due {fmt(e.deadline)}</>}
                      </span>
                      {e.action && <span className="pg-inbox-action">To do: {e.action}</span>}
                      {(e.stage === 'interview' || e.stage === 'assessment') && onPractise && (
                        <button type="button" className="pg-btn pg-inbox-practise" onClick={() => onPractise({ role: e.role, company: e.company, kind: e.stage })}>
                          <MessagesSquare size={13} /> Practise for this {e.stage === 'interview' ? 'interview' : 'test'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="pg-card pg-auto-card">
          <div className="pg-mk-title"><Send size={16} /><h3>Follow-ups due</h3></div>
          <p className="pg-auto-small">Applications with no reply after {settings.followUpDays} days. Penguin writes the email; you check it and send.</p>
          {data.followUpError && <p className="pg-rq-message is-error"><AlertTriangle size={14} /> {data.followUpError}</p>}
          {followUps.length === 0 ? (
            <p className="pg-mk-empty">Nothing due right now.</p>
          ) : (
            <ul className="pg-followups">
              {followUps.map(f => (
                <li key={f.jobId}>
                  <div>
                    <strong>{f.company}</strong>
                    <span>{f.title} · applied {f.daysAgo} days ago</span>
                    <span className={f.to ? 'pg-followup-to' : 'pg-followup-to is-missing'}>{f.to ? `To ${f.to}` : 'No recruiter email yet'}</span>
                  </div>
                  <div className="pg-followup-actions">
                    <button type="button" className="pg-btn pg-btn-primary" onClick={() => setWriting(f)}><Send size={13} /> Write follow-up</button>
                    <button type="button" className="pg-btn pg-btn-ghost" onClick={() => skip(f)}>Skip</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {writing && (
        <FollowUpModal
          item={writing}
          account={account}
          onClose={() => setWriting(null)}
          onSent={() => { setWriting(null); setNotice(`Follow-up sent to ${writing.company}.`); load(); }}
        />
      )}
    </div>
  );
}
