import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, 
  ExternalLink, 
  RotateCcw, 
  LayoutDashboard, 
  Code2, 
  Sparkles,
  Maximize2
} from 'lucide-react';
import PenguinAvatar from './PenguinAvatar';

export default function VisoDsaPage({
  onBack,
  onOpenDashboard
}) {
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef(null);

  const handleReload = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = '/viso-dsa/index.html?t=' + Date.now();
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
              <span className="viso-badge-num">1. VISO-DSA</span>
            </div>
            <h1 className="viso-page-title">
              <Code2 size={18} className="viso-icon-glow" />
              <span>Interactive Data Structures &amp; Algorithms Lab</span>
            </h1>
          </div>
        </div>

        <div className="viso-dsa-right">
          <button
            type="button"
            className="btn btn-ghost btn-sm viso-tool-btn"
            onClick={handleReload}
            title="Reload Algorithm Visualizer"
          >
            <RotateCcw size={15} />
            <span>Reload Lab</span>
          </button>

          <a
            href="/viso-dsa/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm viso-tool-btn"
            title="Open VISO-DSA in a separate browser tab"
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
                <h3>Loading VISO-DSA Visualization Lab…</h3>
                <p>Initializing sorting, tree, graph, and data structure visualizers</p>
              </div>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src="/viso-dsa/index.html"
          title="VISO-DSA Interactive Algorithm Lab"
          className="viso-dsa-iframe"
          onLoad={() => setIsLoading(false)}
          allow="fullscreen; clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
