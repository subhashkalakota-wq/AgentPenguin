import React, { useCallback, useEffect, useState } from 'react';
import { X, RefreshCw, ExternalLink, Check, Loader2, Play, AlertTriangle, WifiOff } from 'lucide-react';
import { PLATFORMS } from '../data/platforms';
import { PlatformMark } from './PlatformsBanner';

const API = 'http://localhost:3001';

export default function PlatformPickerModal({ isOpen, onClose, initialSelection = ['linkedin'], onRun, onOpenCdp }) {
  const [selected, setSelected] = useState(() => new Set(initialSelection));
  const [status, setStatus] = useState(null); // { cdpConnected, platforms: [{ key, open, tabTitle }] }
  const [checking, setChecking] = useState(false);
  const [opening, setOpening] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async (connect = true) => {
    setChecking(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/platforms/status?connect=${connect ? 1 : 0}`);
      setStatus(await res.json());
    } catch {
      setStatus(null);
      setError('Backend is not running. Start it with: npm run server');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    refresh();
    // Re-check while the dialog is open so newly opened tabs show up
    const t = setInterval(() => refresh(false), 5000);
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { clearInterval(t); window.removeEventListener('keydown', onKey); };
  }, [isOpen, refresh, onClose]);

  if (!isOpen) return null;

  const openMap = Object.fromEntries((status?.platforms || []).map(p => [p.key, p]));
  const selectedList = PLATFORMS.filter(p => selected.has(p.key)).map(p => p.key);
  const notOpenSelected = selectedList.filter(k => !openMap[k]?.open);
  const canRun = status?.cdpConnected && selectedList.length > 0 && notOpenSelected.length === 0 && !starting;

  const toggle = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const openPlatform = async (key) => {
    setOpening(key);
    setError(null);
    try {
      const res = await fetch(`${API}/api/platforms/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: key })
      });
      const data = await res.json();
      if (!data.success) setError(data.error || 'Could not open the site.');
      else setStatus({ cdpConnected: true, platforms: data.platforms });
    } catch {
      setError('Backend is not running. Start it with: npm run server');
    } finally {
      setOpening(null);
    }
  };

  const handleRun = async () => {
    setStarting(true);
    setError(null);
    const result = await onRun(selectedList);
    setStarting(false);
    if (result?.success) onClose();
    else setError(result?.message || 'Could not start the agent.');
  };

  let runHint = '';
  if (!status?.cdpConnected) runHint = 'Connect Chrome first.';
  else if (selectedList.length === 0) runHint = 'Select at least one platform.';
  else if (notOpenSelected.length) runHint = `Open ${notOpenSelected.map(k => PLATFORMS.find(p => p.key === k).label).join(' and ')} in Chrome, or unselect ${notOpenSelected.length === 1 ? 'it' : 'them'}.`;

  return (
    <div className="pg-modal-backdrop" onClick={onClose}>
      <div className="pg-modal" role="dialog" aria-modal="true" aria-labelledby="pp-title" onClick={(e) => e.stopPropagation()}>
        <div className="pg-modal-head">
          <div>
            <h2 id="pp-title">Where should Penguin apply?</h2>
            <p>Pick the job sites. Each one must be open and signed in, in the Chrome window the agent controls.</p>
          </div>
          <button className="pg-icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        {status && !status.cdpConnected && (
          <div className="pg-modal-alert">
            <WifiOff size={16} />
            <span>Penguin isn't connected to your Chrome yet, so it can't see your tabs.</span>
            <button className="pg-btn" onClick={() => { onClose(); onOpenCdp(); }}>Connect Chrome</button>
          </div>
        )}

        <ul className="pg-platform-list">
          {PLATFORMS.map(p => {
            const info = openMap[p.key];
            const isSelected = selected.has(p.key);
            const isOpen = Boolean(info?.open);
            return (
              <li key={p.key} className={`pg-platform-row ${isSelected ? 'is-selected' : ''}`}>
                <label className="pg-platform-pick">
                  <input type="checkbox" checked={isSelected} onChange={() => toggle(p.key)} />
                  <span className="pg-platform-check" aria-hidden="true">{isSelected && <Check size={13} strokeWidth={3} />}</span>
                  <PlatformMark platform={p.key} size={36} />
                  <span className="pg-platform-text">
                    <strong>{p.label}</strong>
                    <span>{p.note}</span>
                  </span>
                </label>
                <div className="pg-platform-state">
                  {!status ? (
                    <span className="pg-muted">{checking ? 'Checking…' : '—'}</span>
                  ) : isOpen ? (
                    <span className="pg-open-badge" title={info.tabTitle || ''}><span className="pg-open-dot" /> Open in Chrome</span>
                  ) : (
                    <>
                      <span className="pg-closed-badge">Not open</span>
                      <button
                        className="pg-btn"
                        onClick={() => openPlatform(p.key)}
                        disabled={!status.cdpConnected || opening === p.key}
                      >
                        {opening === p.key ? <Loader2 size={14} className="pg-spin" /> : <ExternalLink size={14} />}
                        Open
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {error && <p className="pg-modal-error"><AlertTriangle size={14} /> {error}</p>}

        <div className="pg-modal-foot">
          <button className="pg-link-btn" onClick={() => refresh(true)} disabled={checking}>
            <RefreshCw size={14} className={checking ? 'pg-spin' : ''} /> Check again
          </button>
          <div className="pg-modal-foot-right">
            {runHint && <span className="pg-run-hint-text">{runHint}</span>}
            <button className="pg-btn" onClick={onClose}>Cancel</button>
            <button className="pg-btn pg-btn-primary" onClick={handleRun} disabled={!canRun}>
              {starting ? <Loader2 size={14} className="pg-spin" /> : <Play size={14} fill="currentColor" />}
              {starting ? 'Starting…' : `Run Penguin${selectedList.length ? ` on ${selectedList.length}` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
