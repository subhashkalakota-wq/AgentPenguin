import React from 'react';
import {
  Pause,
  Square,
  Zap,
  CheckCircle2,
  ExternalLink,
  ArrowUpRight,
  Sparkles,
  LayoutDashboard,
  ShieldCheck,
  Clock,
  Compass,
  FileText
} from 'lucide-react';
import PenguinAvatar from './PenguinAvatar';

export default function PenguinRunningPage({
  jobs,
  agentState,
  activeJob,
  currentStep,
  pacingCountdown,
  appliedCount,
  maxCap,
  onPause,
  onResume,
  onStop,
  onSwitchToDashboard,
  onViewDetail,
  config
}) {
  const isPaused = agentState === 'paused';
  const appliedJobs = jobs.filter(j => j.status === 'applied');
  const progressPercent = Math.min(100, Math.round((appliedCount / (maxCap || 50)) * 100));

  const stepLabels = [
    { num: 1, label: 'Search & Navigate', desc: 'Querying Easy Apply listings on LinkedIn' },
    { num: 2, label: 'Inspect Modal', desc: 'Opening application dialog via CDP' },
    { num: 3, label: 'Form Fill & Resume', desc: 'Attaching CV & matching skills' },
    { num: 4, label: 'Submit Application', desc: 'Completing submission & telemetry sync' },
  ];

  return (
    <div className="penguin-running-page">
      {/* Top Banner & Mode Toggle */}
      <div className="penguin-running-header">
        <div className="running-title-group">
          <div className="running-badge-pulse">
            <span className="pulse-dot"></span>
            <span>{isPaused ? 'PENGUIN ON BREAK' : 'PENGUIN IN ACTION'}</span>
          </div>
          <h1 className="running-title">
            Penguin is Applying to Jobs for You 🐧
          </h1>
          <p className="running-subtitle">
            Autonomous LinkedIn Easy Apply execution via Chrome DevTools Protocol &bull; Safe Human Pacing Active
          </p>
        </div>

        <div className="running-header-actions">
          <button
            className="btn btn-secondary"
            onClick={onSwitchToDashboard}
            title="Switch to detailed pipeline and table view"
          >
            <LayoutDashboard size={16} />
            <span>Classic Dashboard</span>
          </button>
          {isPaused ? (
            <button className="btn btn-primary" onClick={onResume}>
              <Zap size={16} />
              <span>Resume Penguin</span>
            </button>
          ) : (
            <button className="btn btn-warning" onClick={onPause}>
              <Pause size={16} />
              <span>Pause Run</span>
            </button>
          )}
          <button className="btn btn-outline" onClick={onStop}>
            <Square size={15} />
            <span>Stop Agent</span>
          </button>
        </div>
      </div>

      {/* Hero Animation Zone: Running Baby Penguin */}
      <div className="penguin-hero-card">
        <div className="penguin-track-scene">
          {/* Background Animated Snowy Ice Grid */}
          <div className="snow-particles">
            <span className="snowflake s1">❄</span>
            <span className="snowflake s2">❅</span>
            <span className="snowflake s3">❄</span>
            <span className="snowflake s4">✦</span>
            <span className="snowflake s5">❅</span>
          </div>

          {/* Running Mascot */}
          <div className="penguin-mascot-wrapper">
            <PenguinAvatar mode={isPaused ? 'idle' : 'running'} size={150} />
            <div className="penguin-speech-bubble">
              {isPaused
                ? "I'm pausing to take a sip of cold water! 🥤"
                : activeJob
                ? `Waddling fast! Applying to ${activeJob.company || 'next job'}...`
                : "Speeding through LinkedIn listings with your CV! 🚀"}
            </div>
          </div>

          {/* Running Ice Track */}
          <div className="penguin-ice-track">
            <div className="track-line"></div>
          </div>
        </div>

        {/* Current Target & Step Status Bar */}
        <div className="current-target-card">
          <div className="target-header-row">
            <div className="target-meta">
              <span className="target-label">ACTIVE APPLICATION TARGET</span>
              <h3 className="target-title">
                {activeJob?.title || config?.searchQuery || 'Scanning LinkedIn Search Results'}
              </h3>
              <p className="target-company">
                {activeJob?.company ? `at ${activeJob.company} • ${activeJob.location || 'Remote'}` : 'Matching against candidate profile & skills…'}
              </p>
            </div>
            {pacingCountdown > 0 && (
              <div className="pacing-countdown-badge">
                <Clock size={14} className="spin-slow" />
                <span>Pacing delay: {pacingCountdown}s</span>
              </div>
            )}
          </div>

          {/* Stepper */}
          <div className="stepper-horizontal">
            {stepLabels.map((st) => {
              const isDone = currentStep > st.num;
              const isCurrent = currentStep === st.num;
              return (
                <div
                  key={st.num}
                  className={`step-col ${isDone ? 'step-done' : ''} ${isCurrent ? 'step-active' : ''}`}
                >
                  <div className="step-circle">
                    {isDone ? <CheckCircle2 size={16} /> : st.num}
                  </div>
                  <div className="step-text">
                    <span className="step-label">{st.label}</span>
                    <span className="step-sub">{st.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Progress & Quota Stats Bar */}
      <div className="running-stats-row">
        <div className="running-stat-card stat-applied">
          <div className="stat-label">Applications Submitted</div>
          <div className="stat-value-group">
            <span className="stat-big-val">{appliedCount}</span>
            <span className="stat-denom">/ {maxCap} quota</span>
          </div>
          <div className="running-progress-bg">
            <div className="running-progress-bar" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        <div className="running-stat-card stat-roles">
          <div className="stat-label">Target Criteria</div>
          <div className="stat-value-group">
            <span className="stat-text-val">{config?.searchQuery || 'Software Engineer'}</span>
          </div>
          <span className="stat-subtext">Location: {config?.location || 'Remote'}</span>
        </div>

        <div className="running-stat-card stat-safety">
          <div className="stat-label">Safety & Humanization</div>
          <div className="stat-safety-status">
            <ShieldCheck size={18} className="text-teal" />
            <span>Anti-Detection Active</span>
          </div>
          <span className="stat-subtext">Pacing delay: {config?.pacingDelaySec || 6}s between clicks</span>
        </div>
      </div>

      {/* Real-time Applied Jobs Stream */}
      <div className="applied-stream-section">
        <div className="stream-header-row">
          <div className="stream-title-group">
            <CheckCircle2 size={18} className="text-teal" />
            <h2 className="stream-title">Jobs Penguin Applied For You</h2>
            <span className="stream-count-tag">{appliedJobs.length} Confirmed</span>
          </div>
          <span className="stream-note">Synced live from Supabase & Chrome CDP session</span>
        </div>

        {appliedJobs.length === 0 ? (
          <div className="stream-empty-state">
            <div className="empty-penguin-icon">
              <PenguinAvatar mode="idle" size={80} />
            </div>
            <h3>Penguin is getting started!</h3>
            <p>
              Your first job submission will show up here the moment Penguin completes the Easy Apply modal.
              Keep the LinkedIn tab open in the background!
            </p>
          </div>
        ) : (
          <div className="applied-cards-grid">
            {appliedJobs.map((job) => {
              const displayDate = job.applied_at
                ? new Date(job.applied_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST'
                : job.appliedAt || 'Just now';

              return (
                <div key={job.id} className="applied-card animate-fade-in" onClick={() => onViewDetail && onViewDetail(job)}>
                  <div className="card-top">
                    {job.logo ? (
                      <img src={job.logo} alt={job.company} className="applied-logo" onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className="applied-logo-fallback">{job.company?.charAt(0) || 'J'}</div>
                    )}
                    <div className="card-company-role">
                      <h4 className="card-role-title">{job.title}</h4>
                      <p className="card-company-name">{job.company}</p>
                    </div>
                    <span className="card-applied-badge">
                      <CheckCircle2 size={12} />
                      <span>Applied</span>
                    </span>
                  </div>

                  <div className="card-meta-row">
                    <span className="card-loc">{job.location || 'Remote'}</span>
                    <span className="card-time">{displayDate}</span>
                  </div>

                  {job.matchScore && (
                    <div className="card-match-pill">
                      <Sparkles size={11} />
                      <span>{job.matchScore}% Match Score</span>
                    </div>
                  )}

                  <div className="card-footer-actions">
                    <button
                      className="btn-card-inspect"
                      onClick={(e) => { e.stopPropagation(); onViewDetail && onViewDetail(job); }}
                    >
                      <FileText size={12} />
                      <span>View Application Details</span>
                    </button>
                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-card-link"
                        onClick={(e) => e.stopPropagation()}
                        title="View Job on LinkedIn"
                      >
                        <ArrowUpRight size={14} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
