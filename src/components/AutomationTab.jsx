import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarClock, Bell, Send, MessageCircle, Mail, Loader2, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Wifi, WifiOff, Search,
} from 'lucide-react';

const API = 'http://localhost:3001';
const DAYS = [['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun']];

async function call(path, body) {
  const res = await fetch(`${API}${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
  return data;
}
const friendly = (e) => (e.message === 'Failed to fetch' ? 'Backend is not running. Start it with: npm run server' : e.message);

function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`pg-switch ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

const CHANNELS = {
  telegram: {
    title: 'Telegram', icon: Send,
    fields: [
      { key: 'token', label: 'Bot token', secret: 'hasToken', placeholder: '123456:ABC-…' },
      { key: 'chatId', label: 'Chat ID', placeholder: 'Use "Find my chat ID"' },
    ],
    steps: [
      <>In Telegram, open <a href="https://t.me/BotFather" target="_blank" rel="noreferrer">@BotFather</a>, send <code>/newbot</code> and follow the steps.</>,
      'Copy the bot token it gives you, paste it above and click Save.',
      'Open your new bot in Telegram and send it any message, like "hi".',
      'Click "Find my chat ID", then "Send test".',
    ],
  },
  whatsapp: {
    title: 'WhatsApp', icon: MessageCircle,
    fields: [
      { key: 'phone', label: 'Your WhatsApp number', placeholder: '+91 98765 43210' },
      { key: 'apiKey', label: 'CallMeBot API key', secret: 'hasApiKey', placeholder: 'From the CallMeBot message' },
    ],
    steps: [
      <>WhatsApp alerts use the free CallMeBot service. Follow steps 1–3 on <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noreferrer">CallMeBot’s WhatsApp page</a> to get your API key.</>,
      'Enter your number with the country code and the API key, then Save and Send test.',
    ],
  },
  email: {
    title: 'Email', icon: Mail,
    fields: [
      { key: 'user', label: 'Your email (sender)', placeholder: 'you@gmail.com' },
      { key: 'pass', label: 'App password', secret: 'hasPass', placeholder: '16-character app password' },
      { key: 'to', label: 'Send alerts to', placeholder: 'you@gmail.com' },
      { key: 'host', label: 'SMTP server', placeholder: 'smtp.gmail.com' },
      { key: 'port', label: 'Port', placeholder: '465' },
    ],
    steps: [
      'For Gmail: turn on 2-Step Verification in your Google account.',
      <>Create an app password at <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">myaccount.google.com/apppasswords</a> and paste it above. Your normal password won’t work.</>,
      'Save, then Send test. Other providers: use their SMTP server and port.',
    ],
  },
};

function ChannelCard({ id, settings, onSaved }) {
  const meta = CHANNELS[id];
  const Icon = meta.icon;
  const [draft, setDraft] = useState(() => Object.fromEntries(meta.fields.map(f => [f.key, f.secret ? '' : (settings[f.key] ?? '')])));
  const [open, setOpen] = useState(!settings.ready);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  const act = async (kind) => {
    setBusy(kind);
    setMsg(null);
    try {
      if (kind === 'save' || kind === 'toggle') {
        const patch = kind === 'toggle' ? { enabled: !settings.enabled } : draft;
        const next = await call('/api/alerts/settings', { [id]: patch });
        onSaved(next);
        if (kind === 'save') { setDraft(d => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, meta.fields.find(f => f.key === k)?.secret ? '' : v]))); setMsg({ ok: true, text: 'Saved.' }); }
      } else if (kind === 'test') {
        await call('/api/alerts/test', { channel: id });
        setMsg({ ok: true, text: `Test sent. Check ${meta.title}.` });
      } else if (kind === 'detect') {
        const out = await call('/api/alerts/telegram/detect', {});
        onSaved(out.alerts);
        setDraft(d => ({ ...d, chatId: out.chatId }));
        setMsg({ ok: true, text: `Found your chat${out.name ? ` with ${out.name}` : ''}.` });
      }
    } catch (e) {
      setMsg({ ok: false, text: friendly(e) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`pg-channel ${settings.enabled && settings.ready ? 'is-on' : ''}`}>
      <div className="pg-channel-head">
        <span className="pg-channel-icon"><Icon size={16} /></span>
        <div>
          <strong>{meta.title}</strong>
          <span>{settings.ready ? (settings.enabled ? 'On' : 'Set up · off') : 'Not set up'}</span>
        </div>
        <Switch checked={Boolean(settings.enabled)} label={`${meta.title} alerts`} onChange={() => act('toggle')} />
        <button type="button" className="pg-icon-btn" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={`${meta.title} settings`}>
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>
      {open && (
        <div className="pg-channel-body">
          <div className="pg-channel-fields">
            {meta.fields.map(f => (
              <label key={f.key} className="pg-field">
                <span>{f.label}</span>
                <input
                  className="pg-input"
                  type={f.secret ? 'password' : 'text'}
                  autoComplete="off"
                  value={draft[f.key]}
                  placeholder={f.secret && settings[f.secret] ? 'Saved — type to replace' : f.placeholder}
                  onChange={(e) => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <ol className="pg-channel-steps">{meta.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          <div className="pg-channel-actions">
            <button type="button" className="pg-btn pg-btn-primary" onClick={() => act('save')} disabled={!!busy}>{busy === 'save' && <Loader2 size={14} className="pg-spin" />} Save</button>
            {id === 'telegram' && <button type="button" className="pg-btn" onClick={() => act('detect')} disabled={!!busy}>{busy === 'detect' ? <Loader2 size={14} className="pg-spin" /> : <Search size={14} />} Find my chat ID</button>}
            <button type="button" className="pg-btn" onClick={() => act('test')} disabled={!!busy || !settings.ready}>{busy === 'test' ? <Loader2 size={14} className="pg-spin" /> : <Send size={14} />} Send test</button>
          </div>
          {msg && <p className={`pg-rq-message ${msg.ok ? 'is-ok' : 'is-error'}`}>{msg.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {msg.text}</p>}
        </div>
      )}
    </div>
  );
}

/** Scheduled runs and alert channels (Telegram, WhatsApp, email). */
export default function AutomationTab() {
  const [status, setStatus] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await call('/api/automation');
      setStatus(s);
      setSchedule(s.schedule);
      setError(null);
    } catch (e) { setError(friendly(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveSchedule = async (next = schedule) => {
    setSaving(true);
    setSaved(false);
    try {
      const s = await call('/api/automation/schedule', { schedule: next });
      setStatus(s);
      setSchedule(s.schedule);
      setSaved(true);
    } catch (e) { setError(friendly(e)); } finally { setSaving(false); }
  };

  const setEvents = async (key, value) => {
    try {
      const alerts = await call('/api/alerts/settings', { events: { [key]: value } });
      setStatus(s => ({ ...s, alerts }));
    } catch (e) { setError(friendly(e)); }
  };

  if (!status) {
    return error ? <p className="pg-notice is-error"><AlertTriangle size={15} /> {error}</p> : <div className="pg-card pg-empty"><Loader2 size={22} className="pg-spin" /></div>;
  }

  const alerts = status.alerts;
  const dirty = JSON.stringify(schedule) !== JSON.stringify(status.schedule);

  return (
    <div className="pg-auto">
      {error && <p className="pg-notice is-error"><AlertTriangle size={15} /> {error}</p>}

      {/* Schedule */}
      <section className="pg-card pg-auto-card">
        <div className="pg-auto-head">
          <span className="pg-auto-icon"><CalendarClock size={18} /></span>
          <div>
            <h2>Scheduled runs</h2>
            <p>Penguin starts a run by itself at the time you choose (India time).</p>
          </div>
          <Switch checked={schedule.enabled} label="Scheduled runs" onChange={(v) => { const next = { ...schedule, enabled: v }; setSchedule(next); saveSchedule(next); }} />
        </div>

        <div className={`pg-auto-body ${schedule.enabled ? '' : 'is-off'}`}>
          <div className="pg-auto-row">
            <span className="pg-auto-label">Days</span>
            <div className="pg-toggle-row">
              {DAYS.map(([k, l]) => (
                <button key={k} type="button" className={`pg-chip ${schedule.days.includes(k) ? 'active' : ''}`} aria-pressed={schedule.days.includes(k)}
                  onClick={() => setSchedule(s => ({ ...s, days: s.days.includes(k) ? s.days.filter(d => d !== k) : [...s.days, k] }))}>{l}</button>
              ))}
            </div>
          </div>
          <div className="pg-auto-row">
            <span className="pg-auto-label">Time</span>
            <input type="time" className="pg-input pg-auto-time" value={schedule.time} onChange={(e) => setSchedule(s => ({ ...s, time: e.target.value }))} aria-label="Run time" />
          </div>
          <div className="pg-auto-row">
            <span className="pg-auto-label">Applications per run</span>
            <input type="number" min="1" max="200" className="pg-input pg-auto-num" value={schedule.applications}
              onChange={(e) => setSchedule(s => ({ ...s, applications: e.target.value === '' ? '' : Number(e.target.value) }))} aria-label="Applications per run" />
          </div>
          <div className="pg-auto-foot">
            <span className="pg-auto-next">
              {status.schedule.enabled && status.nextRun ? <>Next run: <strong>{status.nextRun}</strong></> : 'Scheduled runs are off.'}
            </span>
            <button type="button" className="pg-btn pg-btn-primary" onClick={() => saveSchedule()} disabled={saving || !dirty}>
              {saving && <Loader2 size={14} className="pg-spin" />} {saved && !dirty ? 'Saved' : 'Save schedule'}
            </button>
          </div>
        </div>

        <div className={`pg-auto-note ${status.chromeReady ? 'is-ok' : ''}`}>
          {status.chromeReady ? <Wifi size={15} /> : <WifiOff size={15} />}
          <span>
            {status.chromeReady
              ? 'Chrome is connected. Keep your computer on, Chrome open and the Agent Penguin backend running at the scheduled time.'
              : 'Chrome isn’t connected right now. At the scheduled time your computer must be on, Chrome open with remote debugging, and the backend running. Otherwise the run is skipped and you get an alert.'}
          </span>
        </div>
        <p className="pg-auto-small">Uses your current Run settings (roles, locations, job sites). The run uses the job sites that are open in Chrome.</p>
      </section>

      {/* Alerts */}
      <section className="pg-card pg-auto-card">
        <div className="pg-auto-head">
          <span className="pg-auto-icon"><Bell size={18} /></span>
          <div>
            <h2>Alerts</h2>
            <p>Get messages on Telegram, WhatsApp or email.</p>
          </div>
        </div>

        <div className="pg-auto-events">
          <span className="pg-auto-label">Tell me when</span>
          {Object.entries(alerts.eventLabels).map(([k, label]) => (
            <label key={k} className="pg-auto-event">
              <input type="checkbox" checked={Boolean(alerts.events[k])} onChange={(e) => setEvents(k, e.target.checked)} />
              {label}
            </label>
          ))}
        </div>

        <div className="pg-channels">
          {Object.keys(CHANNELS).map(id => (
            <ChannelCard key={id} id={id} settings={alerts[id]} onSaved={(a) => setStatus(s => ({ ...s, alerts: a }))} />
          ))}
        </div>
        <p className="pg-auto-small">Keys and passwords stay on your computer (in the backend) and are never shown again in the browser.</p>
      </section>
    </div>
  );
}
