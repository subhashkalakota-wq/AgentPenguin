import React, { useState } from 'react';
import { ShieldCheck, Info, ChevronDown, ChevronUp, AlertCircle, Eye } from 'lucide-react';

export default function SafetyBanner() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="safety-banner">
      <div className="safety-summary">
        <div className="safety-badge">
          <ShieldCheck size={16} />
          <span>Smart Automation Guardrails Active</span>
        </div>
        <p className="safety-text">
          Targeted <strong>Easy Apply Only</strong> • Hard cap at <strong>15 applications</strong> • Human pacing jitter (<strong>7–12s</strong>) • <strong>Zero-crash skip</strong> on custom screening questions.
        </p>
        <button 
          className="safety-toggle-btn"
          onClick={() => setExpanded(!expanded)}
        >
          <span>{expanded ? 'Hide Safety Spec' : 'View Safety Spec'}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="safety-details-grid animate-slide-up">
          <div className="safety-item">
            <div className="safety-item-title">
              <Eye size={14} />
              <span>Visible Chrome via CDP (Port 9222)</span>
            </div>
            <p>
              Connects directly to your real browser session via <code>playwright.chromium.connectOverCDP</code>. Zero credential handling, zero simulated login traps, fully visible live execution.
            </p>
          </div>

          <div className="safety-item">
            <div className="safety-item-title">
              <ShieldCheck size={14} />
              <span>Division of Labor: LLM vs Playwright</span>
            </div>
            <p>
              The LLM only evaluates suitability & outputs structured JSON. Playwright handles the DOM clicks. Keeps speed reliable and prevents hallucinatory clicks.
            </p>
          </div>

          <div className="safety-item">
            <div className="safety-item-title">
              <AlertCircle size={14} />
              <span>Skip & Log Non-Blocking Fallback</span>
            </div>
            <p>
              If a listing throws an unexpected multi-choice question or unmapped input, it is safely queued into "Needs Manual Review" rather than freezing the agent runner or risking account flags.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
