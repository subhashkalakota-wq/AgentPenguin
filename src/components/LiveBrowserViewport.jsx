import React, { useState } from 'react';
import { 
  Laptop, 
  ExternalLink, 
  RefreshCw, 
  Lock, 
  CheckCircle, 
  ArrowRight, 
  FileText, 
  UserCheck, 
  MousePointer, 
  Sliders, 
  Maximize2,
  Minimize2,
  Code2,
  Sparkles
} from 'lucide-react';

export default function LiveBrowserViewport({
  currentJob,
  currentStep,
  agentState,
  pacingCountdown
}) {
  const [viewMode, setViewMode] = useState('modal'); // 'modal' or 'dom'
  const [isExpanded, setIsExpanded] = useState(false);

  // If no current job is actively being processed, show the latest applied or a default preview
  const job = currentJob || {
    title: "Senior Frontend Engineer (React / TypeScript)",
    company: "Stripe",
    location: "Bengaluru, Karnataka (Remote / Hybrid)",
    salary: "₹38 - ₹55 LPA",
    matchScore: 94
  };

  const steps = [
    { num: 1, label: "Contact Info", status: currentStep >= 1 ? "done" : "pending" },
    { num: 2, label: "Resume", status: currentStep >= 2 ? "done" : "pending" },
    { num: 3, label: "Screening Q&A", status: currentStep >= 3 ? "done" : "pending" },
    { num: 4, label: "Review & Submit", status: currentStep >= 4 ? "done" : "pending" }
  ];

  return (
    <div className={`browser-viewport-card ${isExpanded ? 'viewport-expanded' : ''}`}>
      {/* Chrome Window Header */}
      <div className="chrome-header">
        <div className="chrome-controls">
          <span className="dot dot-red"></span>
          <span className="dot dot-yellow"></span>
          <span className="dot dot-green"></span>
        </div>

        {/* Chrome Tab */}
        <div className="chrome-tab">
          <div className="tab-favicon">in</div>
          <span className="tab-title">LinkedIn Jobs — {job.company} Easy Apply</span>
          <span className="tab-close">×</span>
        </div>

        {/* URL Bar */}
        <div className="chrome-url-bar">
          <Lock size={12} className="url-lock-icon" />
          <span className="url-domain">https://www.linkedin.com</span>
          <span className="url-path">/jobs/search/?f_AL=true&keywords=Senior+Frontend</span>
        </div>

        {/* Viewport Actions */}
        <div className="viewport-action-group">
          <button 
            className={`view-mode-btn ${viewMode === 'modal' ? 'active' : ''}`}
            onClick={() => setViewMode('modal')}
            title="Visual LinkedIn Modal"
          >
            UI
          </button>
          <button 
            className={`view-mode-btn ${viewMode === 'dom' ? 'active' : ''}`}
            onClick={() => setViewMode('dom')}
            title="CDP / Playwright DOM Tree"
          >
            <Code2 size={13} />
          </button>
          <button 
            className="icon-btn-sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse Viewport" : "Expand Viewport"}
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Browser Viewport Canvas */}
      <div className="chrome-viewport-content">
        {/* Status Toast Banner */}
        <div className="viewport-status-bar">
          <div className="status-live-indicator">
            <span className={`pulse-dot ${agentState === 'running' ? 'active' : ''}`}></span>
            <span className="status-caption">
              {agentState === 'running' && `Playwright driving DOM: Step ${currentStep} of 4`}
              {agentState === 'pacing' && `Human delay cooldown: ${pacingCountdown}s remaining...`}
              {agentState === 'paused' && 'Agent paused on active page'}
              {agentState === 'idle' && 'CDP standby • Attached to port 9222'}
              {agentState === 'completed' && 'Run session complete'}
            </span>
          </div>

          <div className="viewport-badge">
            <span>Target:</span>
            <strong>{job.company}</strong>
          </div>
        </div>

        {/* Visual Simulated LinkedIn UI or DOM View */}
        {viewMode === 'modal' ? (
          <div className="linkedin-modal-sim">
            {/* Modal Top Bar */}
            <div className="li-modal-top">
              <div className="li-logo">in</div>
              <div className="li-title-block">
                <h3 className="li-job-title">{job.title}</h3>
                <span className="li-company-line">{job.company} • {job.location}</span>
              </div>
              <div className="li-badge-easyapply">Easy Apply</div>
            </div>

            {/* Stepper Header */}
            <div className="li-stepper">
              {steps.map((st, idx) => (
                <div key={st.num} className={`li-step-item ${st.status} ${currentStep === st.num ? 'current' : ''}`}>
                  <div className="step-circle">
                    {st.status === 'done' && currentStep > st.num ? (
                      <CheckCircle size={12} />
                    ) : (
                      st.num
                    )}
                  </div>
                  <span className="step-title">{st.label}</span>
                  {idx < steps.length - 1 && <div className="step-divider"></div>}
                </div>
              ))}
            </div>

            {/* Step Body Content */}
            <div className="li-step-body">
              {currentStep === 1 && (
                <div className="step-content-box animate-slide-up">
                  <h4 className="step-heading">Contact Information</h4>
                  <div className="sim-field-row">
                    <div className="sim-field">
                      <label>First name</label>
                      <input type="text" readOnly value="Subhash" className="sim-input" />
                    </div>
                    <div className="sim-field">
                      <label>Last name</label>
                      <input type="text" readOnly value="Kalakota" className="sim-input" />
                    </div>
                  </div>
                  <div className="sim-field">
                    <label>Email address</label>
                    <input type="email" readOnly value="subhash.eng@example.com" className="sim-input" />
                  </div>
                  <div className="sim-field">
                    <label>Phone number</label>
                    <input type="text" readOnly value="+1 (555) 234-8971" className="sim-input" />
                  </div>
                  <div className="sim-action-row">
                    <span className="sim-auto-tag">
                      <Sparkles size={13} />
                      Playwright auto-filled via candidate profile
                    </span>
                    <button className="btn-li-next active">
                      <span>Next</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="step-content-box animate-slide-up">
                  <h4 className="step-heading">Resume Selection</h4>
                  <div className="sim-resume-card selected">
                    <FileText size={22} className="resume-icon text-accent" />
                    <div className="resume-info">
                      <div className="resume-title">Subhash_Senior_Eng_2026.pdf</div>
                      <div className="resume-meta">Uploaded 2 days ago • Tailored for Senior Frontend / AI</div>
                    </div>
                    <div className="resume-radio">
                      <div className="radio-inner"></div>
                    </div>
                  </div>
                  <div className="sim-action-row">
                    <span className="sim-auto-tag">
                      <Sparkles size={13} />
                      Auto-matched candidate default resume
                    </span>
                    <button className="btn-li-next active">
                      <span>Next</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="step-content-box animate-slide-up">
                  <h4 className="step-heading">Screening Questions</h4>
                  <div className="sim-screening-list">
                    <div className="sim-q-item">
                      <label className="sim-q-label">How many years of work experience do you have with React?</label>
                      <input type="text" readOnly value="5" className="sim-input sim-input-sm" />
                    </div>
                    <div className="sim-q-item">
                      <label className="sim-q-label">Are you authorized to work in the US?</label>
                      <div className="sim-radio-row">
                        <label className="sim-radio-opt checked"><input type="radio" checked readOnly /> Yes</label>
                        <label className="sim-radio-opt"><input type="radio" readOnly /> No</label>
                      </div>
                    </div>
                  </div>
                  <div className="sim-action-row">
                    <span className="sim-auto-tag">
                      <Sparkles size={13} />
                      LLM structured answers validated
                    </span>
                    <button className="btn-li-next active">
                      <span>Review</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {currentStep >= 4 && (
                <div className="step-content-box animate-slide-up">
                  <div className="sim-success-banner">
                    <CheckCircle size={32} className="text-success" />
                    <h4>Application Ready for Submission</h4>
                    <p>Contact info, resume, and answers verified. Playwright firing submit selector.</p>
                  </div>
                  <div className="sim-action-row justify-end">
                    <button className="btn-li-submit animate-glow">
                      <span>Submit Application</span>
                      <Sparkles size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Virtual Simulated Mouse Pointer */}
            {agentState === 'running' && (
              <div className="virtual-cursor animate-pulse">
                <MousePointer size={18} fill="#e2b4bd" color="#4a4a4a" />
                <span className="cursor-label">Playwright Click</span>
              </div>
            )}
          </div>
        ) : (
          /* DOM / CDP Inspector View */
          <div className="cdp-inspector-view">
            <div className="inspector-toolbar">
              <span className="inspector-tag">CDP Inspector</span>
              <code>targetId: 8A4E91 • Session Active</code>
            </div>
            <pre className="inspector-code">
{`<!-- LinkedIn Easy Apply Modal DOM Tree -->
<div role="dialog" class="jobs-easy-apply-modal" aria-labelledby="jobs-apply-header">
  <div class="jobs-easy-apply-content">
    <h3 id="jobs-apply-header">${job.title}</h3>
    <!-- Active Form Step: ${currentStep} of 4 -->
    <form class="jobs-easy-apply-form">
      <div data-test-form-builder-component="contact-info">
        <input name="email" value="subhash.eng@example.com" data-automation="verified" />
        <input name="phone" value="+15552348971" />
      </div>
      <div data-test-form-element="resume-select">
        <input type="radio" checked id="resume-subhash-2026" />
      </div>
      <!-- Playwright Click Target: -->
      <button 
        type="button" 
        class="artdeco-button artdeco-button--primary jobs-apply-button"
        aria-label="${currentStep >= 4 ? 'Submit application' : 'Continue to next step'}"
      >
        <span>${currentStep >= 4 ? 'Submit application' : 'Next'}</span>
      </button>
    </form>
  </div>
</div>`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
