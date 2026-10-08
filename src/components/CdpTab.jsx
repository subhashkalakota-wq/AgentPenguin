import React, { useState } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Globe2,
  Loader2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

export default function CdpTab({ cdpStatus, config, onSaveConfig, onTestCDP, logs }) {
  const [endpoint, setEndpoint] = useState(config.cdpEndpoint || 'http://localhost:9222');
  const [launching, setLaunching] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);

  const connected = Boolean(cdpStatus?.connected);
  const endpointDirty = endpoint.trim() !== (config.cdpEndpoint || 'http://localhost:9222');
  const cdpLogs = logs.filter(l => l.type === 'cdp' || /CDP/i.test(l.tag || '')).slice(-12).reverse();

  const handleTest = async () => {
    setTesting(true);
    await onTestCDP();
    setTesting(false);
  };

  const handleSaveEndpoint = () => {
    onSaveConfig({ ...config, cdpEndpoint: endpoint.trim() });
    setMessage({ type: 'ok', text: 'Endpoint saved. Click "Test connection" to verify it.' });
  };

  const handleLaunch = async () => {
    setLaunching(true);
    setMessage(null);
    try {
      const res = await fetch('http://localhost:3001/api/cdp/launch', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'ok', text: data.message || 'Connected to your Chrome.' });
        onTestCDP();
        setLaunching(false);
        return;
      }
      setMessage({ type: 'error', text: data.error || 'Could not connect to your Chrome.' });
    } catch {
      setMessage({ type: 'error', text: 'Backend server is not running. Start it with: npm run server' });
    }
    setLaunching(false);
  };

  return (
    <div className="pg-tab-body">
      {/* Status */}
      <section className={`pg-card pg-cdp-status ${connected ? 'is-connected' : ''}`}>
        <div className="pg-cdp-status-main">
          <span className="pg-cdp-icon">{connected ? <Wifi size={22} /> : <WifiOff size={22} />}</span>
          <div>
            <h2 className="pg-card-title">{connected ? 'Chrome is connected' : 'Chrome is not connected'}</h2>
            <p className="pg-card-sub">
              {connected
                ? <>Attached to <strong>{cdpStatus?.tabTitle || 'Chrome'}</strong></>
                : 'Penguin works inside your own Chrome — the one where you are signed in to LinkedIn, Naukri and Indeed. Turn on remote debugging once to connect.'}
            </p>
          </div>
        </div>
        <div className="pg-cdp-actions">
          <button className="pg-btn" onClick={handleTest} disabled={testing}>
            <RefreshCw size={14} className={testing ? 'pg-spin' : ''} />
            Test connection
          </button>
          {!connected && (
            <button className="pg-btn pg-btn-primary" onClick={handleLaunch} disabled={launching}>
              {launching ? <Loader2 size={14} className="pg-spin" /> : <Globe2 size={14} />}
              {launching ? 'Connecting…' : 'Connect my Chrome'}
            </button>
          )}
        </div>
        {message && (
          <p className={`pg-cdp-msg ${message.type === 'error' ? 'is-error' : ''}`}>
            {message.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
            {message.text}
          </p>
        )}
      </section>

      <div className="pg-cdp-grid">
        {/* Connection settings */}
        <section className="pg-card">
          <div className="pg-card-head">
            <div>
              <h2 className="pg-card-title">Connection details</h2>
              <p className="pg-card-sub">Penguin finds your Chrome automatically</p>
            </div>
          </div>
          <dl className="pg-dl">
            <div><dt>Status</dt><dd><span className={`pg-dot-label ${connected ? 'ok' : 'off'}`}>{connected ? 'Connected' : 'Disconnected'}</span></dd></div>
            <div><dt>Port</dt><dd>{cdpStatus?.port || 9222}</dd></div>
            <div><dt>Active tab</dt><dd>{connected ? (cdpStatus?.tabTitle || '—') : '—'}</dd></div>
          </dl>
          <div className="pg-field pg-cdp-endpoint">
            <label htmlFor="cdp-endpoint">Advanced: custom CDP endpoint (leave as is to use your own Chrome)</label>
            <div className="pg-inline-field">
              <input
                id="cdp-endpoint"
                className="pg-input"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="http://localhost:9222"
                spellCheck={false}
              />
              <button className="pg-btn" onClick={handleSaveEndpoint} disabled={!endpointDirty || !endpoint.trim()}>
                Save
              </button>
            </div>
          </div>
        </section>

        {/* One-time setup in the user's own Chrome */}
        <section className="pg-card">
          <div className="pg-card-head">
            <div>
              <h2 className="pg-card-title">Connect your own Chrome (one time)</h2>
              <p className="pg-card-sub">No separate browser or profile — Penguin uses your normal Chrome</p>
            </div>
          </div>
          <ol className="pg-steps-list">
            <li>In your Chrome, open <code>chrome://inspect/#remote-debugging</code> (the <strong>Connect my Chrome</strong> button opens it for you).</li>
            <li>Turn on <strong>Allow remote debugging for this browser instance</strong>.</li>
            <li>Click <strong>Connect my Chrome</strong> again. When Chrome asks whether to allow the connection, choose <strong>Allow</strong>. You only do this once: Penguin stays connected until you quit Chrome.</li>
            <li>Open LinkedIn, Naukri and/or Indeed in that same Chrome and sign in.</li>
          </ol>
        </section>
      </div>

      {/* Recent CDP events */}
      <section className="pg-card">
        <div className="pg-card-head">
          <div>
            <h2 className="pg-card-title">Recent CDP events</h2>
            <p className="pg-card-sub">Connection checks and browser attach events from this session</p>
          </div>
        </div>
        {cdpLogs.length === 0 ? (
          <div className="pg-empty pg-empty-sm"><span>No CDP events yet. Click “Test connection” to check.</span></div>
        ) : (
          <ul className="pg-event-list">
            {cdpLogs.map(log => (
              <li key={log.id}>
                <span className="pg-event-time">{log.timestamp}</span>
                <span className="pg-event-tag">{log.tag}</span>
                <span className="pg-event-msg">{log.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
