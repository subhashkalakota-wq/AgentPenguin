import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  BrainCircuit, 
  MousePointer, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ShieldCheck, 
  Zap, 
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Play
} from 'lucide-react';

export default function JobDetailModal({
  job,
  onClose,
  onApplyManual,
  onMarkApplied,
  onSkipJob
}) {
  const [activeTab, setActiveTab] = useState('llm');

  if (!job) return null;

  const { llmReasoning, playwrightTrace, screeningQuestions = [] } = job;
  const qList = llmReasoning?.screeningQuestions || screeningQuestions;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container detail-modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <img 
              src={job.logo} 
              alt={job.company} 
              className="detail-avatar" 
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div>
              <div className="detail-company-line">
                <span className="detail-company">{job.company}</span>
                <span className="detail-dot">•</span>
                <span className="detail-loc">{job.location}</span>
                <span className="easy-apply-tag">Easy Apply</span>
              </div>
              <h2 className="modal-title">{job.title}</h2>
            </div>
          </div>

          <div className="header-right-actions">
            <a 
              href={job.url} 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-ghost icon-only" 
              title="Open in LinkedIn"
            >
              <ExternalLink size={16} />
            </a>
            <button className="icon-btn modal-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="modal-tabs">
          <button 
            className={`modal-tab ${activeTab === 'llm' ? 'active' : ''}`}
            onClick={() => setActiveTab('llm')}
          >
            <BrainCircuit size={15} />
            <span>LLM Matching Analysis ({job.matchScore}%)</span>
          </button>

          <button 
            className={`modal-tab ${activeTab === 'questions' ? 'active' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            <HelpCircle size={15} />
            <span>Screening Q&A Audit ({qList.length})</span>
          </button>

          <button 
            className={`modal-tab ${activeTab === 'playwright' ? 'active' : ''}`}
            onClick={() => setActiveTab('playwright')}
          >
            <MousePointer size={15} />
            <span>Playwright DOM Telemetry</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {activeTab === 'llm' && (
            <div className="detail-tab-pane">
              {/* Score Summary Box */}
              <div className="score-hero-box">
                <div className="hero-score-badge">
                  <div className="score-num">{job.matchScore}%</div>
                  <div className="score-caption">Suitability Score</div>
                </div>
                <div className="hero-decision-meta">
                  <div className="decision-line">
                    <span className="label">LLM Recommendation:</span>
                    <strong className={`badge-decision decision-${llmReasoning?.decision?.toLowerCase()}`}>
                      {llmReasoning?.decision || 'EVAL'}
                    </strong>
                  </div>
                  <p className="hero-summary-text">
                    {llmReasoning?.summary || 'Candidate profile demonstrates strong foundation for this role.'}
                  </p>
                </div>
              </div>

              {/* Strengths & Concerns Grid */}
              <div className="pro-con-grid">
                <div className="analysis-card pro-card">
                  <div className="analysis-card-title">
                    <ThumbsUp size={15} className="text-success" />
                    <span>Candidate Alignment Points</span>
                  </div>
                  <ul className="analysis-list">
                    {(llmReasoning?.strengths || ["Stack alignment with React and modern TypeScript"]).map((s, idx) => (
                      <li key={idx} className="analysis-item">
                        <CheckCircle2 size={13} className="text-success item-icon" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="analysis-card con-card">
                  <div className="analysis-card-title">
                    <ThumbsDown size={15} className="text-warning" />
                    <span>Potential Friction / Notes</span>
                  </div>
                  <ul className="analysis-list">
                    {(llmReasoning?.concerns || ["None identified; clean match"]).map((c, idx) => (
                      <li key={idx} className="analysis-item">
                        <AlertTriangle size={13} className="text-warning item-icon" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Salary & Context Bar */}
              <div className="detail-meta-bar">
                <div className="meta-item">
                  <span className="meta-label">Disclosed Compensation:</span>
                  <span className="meta-value">{job.salary || 'Not listed (Market rate)'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Application Status:</span>
                  <span className="meta-value text-accent">{job.status?.toUpperCase()}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Pacing Delay:</span>
                  <span className="meta-value">{job.pacingDelaySec ? `${job.pacingDelaySec}s` : 'Standard'}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="detail-tab-pane">
              <div className="section-note">
                <ShieldCheck size={16} className="text-accent" />
                <span>
                  The agent scans all form inputs in the Easy Apply modal. If an unmapped screening question is found, the safeguard skips submission cleanly without crashing.
                </span>
              </div>

              <div className="questions-table-box">
                {qList.length === 0 ? (
                  <div className="empty-questions">
                    Standard 1-step Easy Apply: Only requires standard LinkedIn profile contact info and resume. No custom screening questions.
                  </div>
                ) : (
                  qList.map((item, idx) => (
                    <div key={idx} className="question-item-card">
                      <div className="q-header">
                        <span className="q-num">Q{idx + 1}</span>
                        <p className="q-text">{item.question}</p>
                      </div>
                      <div className="q-answer-row">
                        <div className="q-ans-box">
                          <span className="ans-label">Agent Injected Answer:</span>
                          <span className="ans-value">{item.answer || '(Left blank for review)'}</span>
                        </div>
                        <span className={`q-status-badge ${item.status}`}>
                          {item.status === 'auto_filled' && 'Auto Filled'}
                          {item.status === 'pending_human_review' && 'Flagged for Human'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'playwright' && (
            <div className="detail-tab-pane">
              <div className="telemetry-box">
                <h4 className="telemetry-heading">Playwright CDP DOM Actions</h4>
                {(playwrightTrace && playwrightTrace.length > 0) ? (
                  <div className="trace-timeline">
                    {playwrightTrace.map((tr) => (
                      <div key={tr.step} className="timeline-step">
                        <div className="step-badge">{tr.step}</div>
                        <div className="step-content">
                          <div className="step-action-line">
                            <code>{tr.action}</code>
                            <span className={`step-status-tag ${tr.status}`}>{tr.status}</span>
                          </div>
                          <span className="step-time">{tr.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-telemetry">
                    Job is queued in shortlist. Playwright actions will record live when the agent steps into this listing.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer justify-between">
          <div className="footer-left-note">
            <span className="status-indicator state-running"></span>
            <span>CDP connection ready for execution</span>
          </div>

          <div className="footer-btns">
            {job.status === 'needs_review' && (
              <button 
                className="btn btn-warning"
                onClick={() => {
                  onApplyManual(job.id);
                  onClose();
                }}
              >
                <CheckCircle2 size={15} />
                <span>Mark Review Completed</span>
              </button>
            )}

            {job.status === 'shortlisted' && (
              <button 
                className="btn btn-primary"
                onClick={() => {
                  onApplyManual(job.id);
                  onClose();
                }}
              >
                <Play size={15} />
                <span>Execute Easy Apply Now</span>
              </button>
            )}

            {job.status !== 'applied' && (
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  onMarkApplied(job.id);
                  onClose();
                }}
              >
                <span>Force Mark Applied</span>
              </button>
            )}

            <button className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
