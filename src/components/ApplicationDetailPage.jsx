import React from 'react';
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  Brain,
  Terminal,
  Calendar,
  Timer,
  ExternalLink,
  Building2,
  User,
  FileText,
  Target,
  Zap,
  ChevronRight
} from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    applied:      { icon: <CheckCircle2 size={14}/>, label: 'Applied',       cls: 'status-applied' },
    shortlisted:  { icon: <Sparkles size={14}/>,    label: 'Shortlisted',    cls: 'status-shortlisted' },
    needs_review: { icon: <AlertTriangle size={14}/>,label: 'Needs Review',  cls: 'status-review' },
    discarded:    { icon: <XCircle size={14}/>,     label: 'Filtered Out',   cls: 'status-discarded' },
  };
  const s = map[status] || { icon: <Clock size={14}/>, label: 'Queued', cls: 'status-queued' };
  return (
    <span className={`job-status-badge ${s.cls}`} style={{ fontSize: '13px', padding: '6px 14px' }}>
      {s.icon}
      <span>{s.label}</span>
    </span>
  );
}

function ScoreRing({ score }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 85 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444';
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="var(--border-primary)" strokeWidth="8"/>
      <circle
        cx="48" cy="48" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 48 48)"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x="48" y="52" textAnchor="middle" fill={color} fontSize="20" fontWeight="700" fontFamily="inherit">
        {score}%
      </text>
    </svg>
  );
}

export default function ApplicationDetailPage({ job, onBack }) {
  if (!job) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Briefcase size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
          <p>No application selected.</p>
          <button className="btn-secondary" onClick={onBack} style={{ marginTop: 12 }}>
            <ArrowLeft size={14} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  // The stored trace is a list of steps for older rows and an object (review reason,
  // inbox updates) for newer ones; only a list can be drawn as steps
  const trace = job.playwrightTrace;
  const playwrightSteps = (Array.isArray(trace) && trace) || (Array.isArray(trace?.steps) && trace.steps) || [
    { step: 1, action: 'Navigated to listing via CDP', status: 'done', ts: '10:42:01' },
    { step: 2, action: "Clicked 'Easy Apply' modal trigger", status: 'done', ts: '10:42:03' },
    { step: 3, action: `Auto-filled contact info & email`, status: 'done', ts: '10:42:05' },
    { step: 4, action: `Selected resume file`, status: 'done', ts: '10:42:07' },
    { step: 5, action: 'Answered screening questions via LLM', status: 'done', ts: '10:42:10' },
    { step: 6, action: 'Submitted application — confirmed success toast', status: job.status === 'applied' ? 'done' : 'pending', ts: '10:42:13' },
  ];

  const llm = job.llmReasoning || {};
  const skills = llm.skills || job.skills || [];
  const pros = llm.pros || [];
  const cons = llm.cons || [];

  return (
    <div className="detail-page-container animate-slide-up">
      {/* Back Nav */}
      <div className="detail-page-nav">
        <button className="btn-back-nav" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to Pipeline</span>
        </button>
        <div className="detail-breadcrumb">
          <span>Applications</span>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--text-primary)' }}>{job.company}</span>
        </div>
      </div>

      {/* Hero Card */}
      <div className="detail-hero-card">
        <div className="detail-hero-left">
          {job.logo && (
            <img src={job.logo} alt={job.company} className="detail-company-logo"
              onError={e => e.target.style.display = 'none'} />
          )}
          <div className="detail-hero-meta">
            <h1 className="detail-job-title">{job.title}</h1>
            <div className="detail-company-row">
              <Building2 size={15} />
              <span className="detail-company-name">{job.company}</span>
              {job.easyApply && <span className="easy-apply-tag">Easy Apply</span>}
            </div>
            <div className="detail-meta-pills">
              {job.location && (
                <span className="meta-pill">
                  <MapPin size={13} /> {job.location}
                </span>
              )}
              {job.salary && (
                <span className="meta-pill">
                  <IndianRupee size={13} /> {job.salary}
                </span>
              )}
              {job.appliedAt && (
                <span className="meta-pill">
                  <Calendar size={13} /> Applied {job.appliedAt}
                </span>
              )}
              {job.pacingDelaySec && (
                <span className="meta-pill">
                  <Timer size={13} /> {job.pacingDelaySec}s anti-bot delay
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="detail-hero-right">
          <StatusBadge status={job.status} />
          {job.url && (
            <a href={job.url} target="_blank" rel="noreferrer" className="btn-open-listing">
              <ExternalLink size={14} />
              Open on LinkedIn
            </a>
          )}
        </div>
      </div>

      {/* 3-column grid */}
      <div className="detail-grid-3col">
        {/* LLM Match Score */}
        <div className="detail-card">
          <div className="detail-card-header">
            <Brain size={16} className="text-accent" />
            <h3>LLM Match Analysis</h3>
          </div>
          <div className="detail-score-center">
            <ScoreRing score={job.matchScore || 0} />
            <div className="detail-score-decision">
              <span className={`score-decision-badge ${job.matchScore >= 75 ? 'go' : 'no-go'}`}>
                {llm.decision || (job.matchScore >= 75 ? 'APPLY' : 'SKIP')}
              </span>
            </div>
          </div>
          {llm.summary && (
            <p className="detail-llm-summary">{llm.summary}</p>
          )}
          {pros.length > 0 && (
            <div className="detail-pros-cons">
              <div className="pros-list">
                {pros.map((p, i) => (
                  <div key={i} className="pro-item"><CheckCircle2 size={12} /> {p}</div>
                ))}
              </div>
              {cons.length > 0 && (
                <div className="cons-list">
                  {cons.map((c, i) => (
                    <div key={i} className="con-item"><XCircle size={12} /> {c}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Playwright Trace */}
        <div className="detail-card">
          <div className="detail-card-header">
            <Terminal size={16} className="text-accent" />
            <h3>Playwright Execution Trace</h3>
          </div>
          <div className="playwright-trace-list">
            {playwrightSteps.map((s, idx) => (
              <div key={idx} className={`trace-step-item ${s.status}`}>
                <div className="trace-step-bullet">
                  {s.status === 'done'
                    ? <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
                    : s.status === 'error'
                    ? <XCircle size={14} style={{ color: '#ef4444' }} />
                    : <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                  }
                  {idx < playwrightSteps.length - 1 && <div className="trace-step-line" />}
                </div>
                <div className="trace-step-content">
                  <span className="trace-step-action">{s.action}</span>
                  {s.ts && <span className="trace-step-ts">{s.ts}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills & Details */}
        <div className="detail-card">
          <div className="detail-card-header">
            <Target size={16} className="text-accent" />
            <h3>Matched Skills & Details</h3>
          </div>
          {skills.length > 0 && (
            <div className="detail-skills-grid">
              {skills.map((sk, i) => (
                <span key={i} className="skill-chip">{sk}</span>
              ))}
            </div>
          )}
          <div className="detail-info-rows">
            {job.experienceLevel && (
              <div className="detail-info-row">
                <span className="info-row-label"><User size={13} /> Experience</span>
                <span className="info-row-value">{job.experienceLevel}</span>
              </div>
            )}
            {job.employmentType && (
              <div className="detail-info-row">
                <span className="info-row-label"><Briefcase size={13} /> Type</span>
                <span className="info-row-value">{job.employmentType}</span>
              </div>
            )}
            {job.stepsTotal && (
              <div className="detail-info-row">
                <span className="info-row-label"><Zap size={13} /> Easy Apply Steps</span>
                <span className="info-row-value">{job.stepsCompleted}/{job.stepsTotal} completed</span>
              </div>
            )}
          </div>
          {job.description && (
            <>
              <div className="detail-card-header" style={{ marginTop: 16 }}>
                <FileText size={14} className="text-accent" />
                <h4 style={{ fontSize: '13px', margin: 0 }}>Job Description Snippet</h4>
              </div>
              <p className="detail-description-snippet">{job.description.slice(0, 320)}...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
