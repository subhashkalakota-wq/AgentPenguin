import React, { useState } from 'react';
import { Play, X } from 'lucide-react';
import { PLATFORMS } from '../data/platforms';
import AgentPenguinMark from './AgentPenguinMark';

const DISMISS_KEY = 'pg_platform_banner_dismissed';

// Monochrome letter mark per platform (no third-party logos)
export function PlatformMark({ platform, size = 28 }) {
  const p = PLATFORMS.find(x => x.key === platform) || PLATFORMS[0];
  return (
    <span
      className={`pg-platform-mark pg-platform-mark-${p.key}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden="true"
    >
      {p.short}
    </span>
  );
}

export function PlatformTag({ platform }) {
  const p = PLATFORMS.find(x => x.key === platform) || PLATFORMS[0];
  return <span className="pg-platform-tag">{p.label}</span>;
}

export default function PlatformsBanner({ onRun }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });
  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* storage unavailable */ }
  };

  return (
    <section className="pg-banner" aria-label="Supported job platforms">
      <span className="pg-banner-mark"><AgentPenguinMark size={26} /></span>
      <div className="pg-banner-text">
        <strong>Agent Penguin applies on LinkedIn, Naukri and Indeed</strong>
        <span>Choose one or more sites each time you run. Penguin only applies where you're signed in.</span>
      </div>
      <ul className="pg-banner-platforms">
        {PLATFORMS.map(p => (
          <li key={p.key}>
            <PlatformMark platform={p.key} size={26} />
            {p.label}
          </li>
        ))}
      </ul>
      <button className="pg-btn pg-btn-primary pg-banner-cta" onClick={onRun}>
        <Play size={14} fill="currentColor" /> Run Penguin
      </button>
      <button className="pg-banner-close" onClick={dismiss} aria-label="Dismiss banner" title="Dismiss">
        <X size={15} />
      </button>
    </section>
  );
}
