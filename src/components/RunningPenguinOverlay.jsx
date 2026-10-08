import React from 'react';
import { Pause, Play, Square, Minimize2, Check, PartyPopper, ArrowRight } from 'lucide-react';
import { PLATFORMS } from '../data/platforms';

function RunningPenguin({ moving }) {
  return (
    <div className={`pg-run-scene ${moving ? 'is-moving' : 'is-still'}`} aria-hidden="true">
      <span className="pg-snow pg-snow-1" />
      <span className="pg-snow pg-snow-2" />
      <span className="pg-snow pg-snow-3" />
      <span className="pg-snow pg-snow-4" />
      <span className="pg-snow pg-snow-5" />
      <div className="pg-run-penguin">
        <svg viewBox="0 0 120 140" width="112" height="130">
          {/* flippers */}
          <path className="pg-flipper pg-flipper-l" d="M30 62 C14 74 12 92 18 100 C26 92 32 82 36 72 Z" />
          <path className="pg-flipper pg-flipper-r" d="M90 62 C106 74 108 92 102 100 C94 92 88 82 84 72 Z" />
          {/* body */}
          <ellipse className="pg-p-body" cx="60" cy="72" rx="34" ry="46" />
          <ellipse className="pg-p-belly" cx="60" cy="82" rx="23" ry="33" />
          {/* face */}
          <ellipse className="pg-p-belly" cx="49" cy="46" rx="9" ry="10" />
          <ellipse className="pg-p-belly" cx="71" cy="46" rx="9" ry="10" />
          <circle className="pg-p-eye" cx="51" cy="47" r="3.6" />
          <circle className="pg-p-eye" cx="69" cy="47" r="3.6" />
          <path className="pg-p-beak" d="M53 56 L67 56 L60 65 Z" />
          {/* feet */}
          <ellipse className="pg-foot pg-foot-l" cx="47" cy="121" rx="10" ry="4.5" />
          <ellipse className="pg-foot pg-foot-r" cx="73" cy="121" rx="10" ry="4.5" />
        </svg>
      </div>
      <div className="pg-run-ground" />
    </div>
  );
}

export default function RunningPenguinOverlay({
  agentState,
  progress,
  activeJob,
  lastLog,
  selectedPlatforms = [],
  maxCap,
  onPause,
  onResume,
  onStop,
  onMinimize,
  onClose,
  onViewApplications
}) {
  const done = agentState === 'completed' || agentState === 'idle';
  const paused = agentState === 'paused';
  const applied = progress?.applied ?? 0;
  const cap = progress?.cap ?? maxCap ?? 0;
  const pct = cap > 0 ? Math.min(100, Math.round((applied / cap) * 100)) : 0;
  const platformKeys = progress?.platforms?.length ? progress.platforms : selectedPlatforms;
  const currentIdx = progress?.platformIndex ?? -1;

  let title = 'Penguin is applying to jobs';
  if (paused) title = 'Penguin is taking a break';
  if (done) title = agentState === 'completed' ? 'Penguin finished the run' : 'Penguin stopped';

  return (
    <div className="pg-modal-backdrop pg-run-backdrop">
      <div className="pg-modal pg-run-window" role="dialog" aria-modal="true" aria-labelledby="run-title" aria-live="polite">
        {!done && (
          <button className="pg-icon-btn pg-run-minimize" onClick={onMinimize} aria-label="Minimize" title="Minimize — keep running in the background">
            <Minimize2 size={15} />
          </button>
        )}

        <RunningPenguin moving={!done && !paused} />

        <div className="pg-run-body">
          <h2 id="run-title">{done && agentState === 'completed' && <PartyPopper size={20} />} {title}</h2>
          <p className="pg-run-sub">
            {done
              ? `${applied} application${applied === 1 ? '' : 's'} submitted this run.`
              : paused
                ? 'Paused. Check the Chrome window if Penguin asked you to sign in, then resume.'
                : progress?.role
                  ? <>Searching <strong>{progress.platformLabel}</strong> for <strong>“{progress.role}”</strong></>
                  : 'Getting ready…'}
          </p>

          {/* Platform steps */}
          <ol className="pg-run-steps">
            {platformKeys.map((key, i) => {
              const p = PLATFORMS.find(x => x.key === key);
              const state = done || i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'todo';
              return (
                <li key={key} className={`is-${state}`}>
                  <span className="pg-run-step-dot">{state === 'done' ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
                  {p?.label || key}
                </li>
              );
            })}
          </ol>

          {/* Progress */}
          <div className="pg-run-progress">
            <div className="pg-run-progress-text">
              <span>Applications</span>
              <strong>{applied} / {cap}</strong>
            </div>
            <div className="pg-run-track"><div style={{ width: `${pct}%` }} /></div>
          </div>

          {!done && activeJob && (
            <div className="pg-run-current">
              <span className="pg-run-label">Now applying</span>
              <strong>{activeJob.title}</strong>
              <span>{activeJob.company}{activeJob.location ? ` · ${activeJob.location}` : ''}</span>
            </div>
          )}

          {!done && (
            <p className="pg-run-note">Keep this dashboard tab and the job-site tabs in Chrome open. Closing this tab stops Penguin.</p>
          )}

          {lastLog && !done && (
            <p className="pg-run-log" title={lastLog.message}>
              <span>{lastLog.tag}</span> {lastLog.message}
            </p>
          )}

          <div className="pg-run-actions">
            {done ? (
              <>
                <button className="pg-btn" onClick={onClose}>Close</button>
                <button className="pg-btn pg-btn-primary" onClick={onViewApplications}>
                  View applications <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <>
                {paused ? (
                  <button className="pg-btn pg-btn-primary" onClick={onResume}><Play size={14} fill="currentColor" /> Resume</button>
                ) : (
                  <button className="pg-btn" onClick={onPause}><Pause size={14} fill="currentColor" /> Pause</button>
                )}
                <button className="pg-btn" onClick={onStop}><Square size={13} /> Stop</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Small floating pill shown when the run window is minimized
export function RunningPenguinPill({ agentState, progress, maxCap, onOpen }) {
  const applied = progress?.applied ?? 0;
  const cap = progress?.cap ?? maxCap ?? 0;
  return (
    <button className="pg-run-pill" onClick={onOpen} title="Show Penguin's progress">
      <span className={`pg-run-pill-dot ${agentState === 'paused' ? 'is-paused' : ''}`} />
      {agentState === 'paused' ? 'Penguin paused' : 'Penguin running'}
      <strong>{applied}/{cap}</strong>
    </button>
  );
}
