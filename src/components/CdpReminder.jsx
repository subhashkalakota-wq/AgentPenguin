import React, { useState } from 'react';
import { WifiOff, Globe2, Loader2, X } from 'lucide-react';

const DISMISS_KEY = 'pg_cdp_reminder_dismissed';

// Reminder shown on Agent Penguin pages while Chrome isn't connected over CDP.
// Dismissing hides it for this browser session only.
export default function CdpReminder({ connected, onOpenCdp, onConnected }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState(null);

  if (connected || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* storage unavailable */ }
  };

  const connect = async () => {
    setLaunching(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:3001/api/cdp/launch', { method: 'POST' });
      const data = await res.json();
      if (data.success) onConnected?.();
      else setError(data.error || 'Could not connect to your Chrome.');
    } catch {
      setError('Backend is not running. Start it with: npm run server');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <section className="pg-cdp-reminder" role="status">
      <span className="pg-cdp-reminder-icon"><WifiOff size={18} /></span>
      <div className="pg-cdp-reminder-text">
        <strong>Connect your Chrome to let Penguin apply</strong>
        <span>{error || "Penguin works inside your own Chrome. Turn on remote debugging once so it can search and apply in your signed-in tabs."}</span>
      </div>
      <div className="pg-cdp-reminder-actions">
        <button className="pg-btn" onClick={onOpenCdp}>How to connect</button>
        <button className="pg-btn pg-btn-primary" onClick={connect} disabled={launching}>
          {launching ? <Loader2 size={14} className="pg-spin" /> : <Globe2 size={14} />}
          {launching ? 'Connecting…' : 'Connect my Chrome'}
        </button>
      </div>
      <button className="pg-banner-close" onClick={dismiss} aria-label="Dismiss reminder" title="Hide for this session">
        <X size={15} />
      </button>
    </section>
  );
}
