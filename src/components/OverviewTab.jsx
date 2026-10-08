import React from 'react';
import { ArrowRight, ShieldCheck, Eye, AlertCircle, Gauge } from 'lucide-react';
import MetricsCards from './MetricsCards';
import { StatusBadge, CompanyLogo } from './JobsTable';

const LOG_TONE = {
  llm: 'accent',
  playwright: 'info',
  cdp: 'neutral',
  success: 'success',
  warn: 'warning',
};

export default function OverviewTab({
  jobs,
  logs,
  metrics,
  config,
  onOpenTab,
  onViewDetail
}) {
  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.applied_at || 0) - new Date(a.applied_at || 0))
    .slice(0, 6);
  const recentLogs = logs.slice(-6).reverse();

  const guardrails = [
    { icon: Gauge, title: `Hard cap at ${config.maxApplications} applications`, text: 'The agent auto-pauses when the session quota is reached.' },
    { icon: Eye, title: 'Your real Chrome via CDP (port 9222)', text: 'Runs visibly in your own browser session. No credentials are stored.' },
    { icon: AlertCircle, title: 'Skip, don’t guess', text: 'Unknown screening questions go to “Needs review” instead of being answered blindly.' },
  ];

  return (
    <div className="pg-tab-body">
      <MetricsCards {...metrics} maxCap={config.maxApplications} />

      <div className="pg-overview-grid">
        <div className="pg-overview-side">
          {/* Recent applications */}
          <section className="pg-card">
            <div className="pg-card-head">
              <div>
                <h2 className="pg-card-title">Recent applications</h2>
                <p className="pg-card-sub">Latest jobs the agent processed</p>
              </div>
              <button className="pg-link-btn" onClick={() => onOpenTab('applications')}>
                View all <ArrowRight size={14} />
              </button>
            </div>
            {recentJobs.length === 0 ? (
              <div className="pg-empty pg-empty-sm">
                <strong>No applications yet</strong>
                <span>Click Run Penguin and processed jobs will appear here.</span>
              </div>
            ) : (
              <ul className="pg-recent-list">
                {recentJobs.map(job => (
                  <li key={job.id}>
                    <button type="button" className="pg-recent-row" onClick={() => onViewDetail(job)}>
                      <CompanyLogo job={job} size={32} />
                      <span className="pg-role-text">
                        <span className="pg-role-title">{job.title}</span>
                        <span className="pg-role-company">{job.company}{job.location ? ` · ${job.location}` : ''}</span>
                      </span>
                      {(job.matchScore || job.match_score) ? (
                        <span className="pg-recent-score">{job.matchScore || job.match_score}%</span>
                      ) : null}
                      <StatusBadge status={job.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Guardrails */}
          <section className="pg-card">
            <div className="pg-card-head">
              <div>
                <h2 className="pg-card-title"><ShieldCheck size={16} /> Safety guardrails</h2>
                <p className="pg-card-sub">Easy Apply only · {config.pacingDelaySec ? `~${config.pacingDelaySec}s` : 'randomized'} human pacing</p>
              </div>
            </div>
            <ul className="pg-guard-list">
              {guardrails.map(({ icon: Icon, title, text }) => (
                <li key={title}>
                  <Icon size={15} />
                  <div>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="pg-overview-side">
          {/* Recent activity */}
          <section className="pg-card">
            <div className="pg-card-head">
              <div>
                <h2 className="pg-card-title">Recent activity</h2>
                <p className="pg-card-sub">{logs.length} events this session</p>
              </div>
              <button className="pg-link-btn" onClick={() => onOpenTab('activity')}>
                Open log <ArrowRight size={14} />
              </button>
            </div>
            {recentLogs.length === 0 ? (
              <div className="pg-empty pg-empty-sm"><span>No activity yet.</span></div>
            ) : (
              <ul className="pg-activity-list">
                {recentLogs.map(log => (
                  <li key={log.id}>
                    <span className={`pg-activity-dot pg-tone-${LOG_TONE[log.type] || 'neutral'}`} />
                    <div>
                      <span className="pg-activity-tag">{log.tag}</span>
                      <p className="pg-activity-msg">{log.message}</p>
                      <span className="pg-activity-time">{log.timestamp}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
