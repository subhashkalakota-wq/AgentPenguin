import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, 
  ExternalLink, 
  RotateCcw, 
  LayoutDashboard, 
  FileCheck2, 
  Sparkles 
} from 'lucide-react';
import PenguinAvatar from './PenguinAvatar';

export default function ResumeAnalyzerPage({
  onBack,
  onOpenDashboard
}) {
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef(null);

  const handleReload = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = '/resume-analyzer/index.html?t=' + Date.now();
    }
  };

  return (
    <div className="viso-dsa-page-container">
      {/* Top Navigation & Controls Bar */}
      <header className="viso-dsa-header">
        <div className="viso-dsa-left">
          <button 
            type="button" 
            className="btn btn-outline btn-sm viso-back-btn"
            onClick={onBack}
            title="Return to Penguin AI Assistant"
          >
            <ArrowLeft size={16} />
            <span>Back to Assistant</span>
          </button>

          <div className="viso-brand-divider" />

          <div className="viso-brand-group">
            <div className="viso-badge-label">
              <span className="viso-badge-tag">AGENT</span>
              <span className="viso-badge-num">2. RESUME ANALYZE</span>
            </div>
            <h1 className="viso-page-title">
              <FileCheck2 size={18} className="viso-icon-glow" />
              <span>Intelligent ATS Resume &amp; Keyword Analyzer</span>
            </h1>
          </div>
        </div>

        <div className="viso-dsa-right">
          <button
            type="button"
            className="btn btn-ghost btn-sm viso-tool-btn"
            onClick={handleReload}
            title="Reload Resume Analyzer"
          >
            <RotateCcw size={15} />
            <span>Reload Analyzer</span>
          </button>

          <a
            href="/resume-analyzer/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm viso-tool-btn"
            title="Open Resume Analyzer in a separate browser tab"
          >
            <ExternalLink size={15} />
            <span>Open in Full Window</span>
          </a>

          {onOpenDashboard && (
            <button
              type="button"
              className="btn btn-primary btn-sm viso-dashboard-btn"
              onClick={onOpenDashboard}
              title="Switch to Jobs Dashboard"
            >
              <LayoutDashboard size={15} />
              <span>Open Dashboard</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Interactive Lab Viewport */}
      <div className="viso-dsa-viewport">
        {isLoading && (
          <div className="viso-loading-overlay">
            <div className="viso-loader-card">
              <PenguinAvatar mode="loading" size={60} />
              <div className="viso-loading-text">
                <h3>Loading Resume Analyzer…</h3>
                <p>Initializing ATS scoring engine, keyword matcher &amp; company recommender</p>
              </div>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src="/resume-analyzer/index.html"
          title="RESUME ANALYZE — ATS Score & Match"
          className="viso-dsa-iframe"
          onLoad={() => setIsLoading(false)}
          allow="fullscreen; clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
