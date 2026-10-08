import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Sun,
  Moon,
  Zap,
  SlidersHorizontal,
  LogOut,
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  BookOpen,
  User,
  Menu,
  X,
  Code2,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import PenguinAvatar from './PenguinAvatar';
import AgentPenguinMark from './AgentPenguinMark';


const STATE_LABELS = {
  running: 'Applying',
  paused: 'Paused',
  idle: 'Standby',
  pacing: 'Pacing delay',
  completed: 'Finished',
};

export default function Header({
  agentState,
  onStart,
  onPause,
  onStop,
  onReset,
  onSimulateStep,
  theme,
  onToggleTheme,
  cdpStatus,
  appliedCount,
  maxCap,
  onOpenSettings,
  currentUser,
  onSignOut,
  onTestCDP,
  onOpenHowToRun,
  onOpenProfilePage,
  isProfileComplete = true,
  currentView = 'dashboard',
  onChangeView,
  pageTitle = '',
  onOpenMobileNav,
  onOpenCdp,
  onResume
}) {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const isRunning = agentState === 'running';
  const isPaused = agentState === 'paused';

  const userName = currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'User';
  const avatarUrl = currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture;
  const isGoogleUser = currentUser?.app_metadata?.provider === 'google' || currentUser?.identities?.some(id => id.provider === 'google');
  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const capPct = maxCap > 0 ? Math.min(100, (appliedCount / maxCap) * 100) : 0;

  return (
    <header className="pg-header">
      {/* Row 1: menu toggle (mobile) · page title · user */}
      <div className="pg-header-top">
        <button
          type="button"
          className="pg-icon-btn pg-mobile-menu"
          onClick={onOpenMobileNav}
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <button
          type="button"
          className="pg-brand"
          onClick={() => onChangeView?.('assistant')}
          title="Open Penguin AI assistant"
        >
          <span className="pg-brand-icon"><AgentPenguinMark size={22} /></span>
          <span className="pg-brand-name">Agent <span>Penguin</span></span>
        </button>
        <span className="pg-title-divider" aria-hidden="true" />
        <h1 className="pg-page-title">{pageTitle}</h1>

        <button
          type="button"
          className="pg-user"
          onClick={() => setIsSidePanelOpen(true)}
          title="Open menu"
        >
          <span className="pg-user-name">{userName}</span>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="pg-user-avatar" />
          ) : (
            <span className="pg-user-avatar pg-user-initials">{initials}</span>
          )}
          <Menu size={17} className="pg-user-menu" />
        </button>
      </div>

      {/* Row 2: agent controls · status */}
      <div className="pg-control-strip">
        <div className="pg-controls">
          {!isRunning ? (
            <button
              className={`pg-btn pg-btn-primary pg-run-btn ${isPaused ? '' : 'pg-btn-highlight'} ${!isProfileComplete ? 'pg-btn-attention' : ''}`}
              onClick={isPaused ? onResume : onStart}
              title={!isProfileComplete ? 'Complete your profile and upload a resume first' : isPaused ? 'Resume the paused run' : 'Choose platforms and start applying'}
            >
              <Play size={14} fill="currentColor" />
              <span>{isPaused ? 'Resume' : 'Run Penguin'}</span>
            </button>
          ) : (
            <button className="pg-btn pg-btn-warning" onClick={onPause}>
              <Pause size={14} fill="currentColor" />
              <span>Pause</span>
            </button>
          )}
          <button className="pg-btn" onClick={onSimulateStep} disabled={isRunning} title="Apply to the next single job">
            <Zap size={14} />
            <span>Step Apply</span>
          </button>
          <button className="pg-btn" onClick={onStop} disabled={agentState === 'idle'}>
            <Square size={13} />
            <span>Stop</span>
          </button>
          <button className="pg-btn pg-btn-ghost" onClick={onReset} title="Stop and reload data">
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>

        <div className="pg-status">
          <span className={`pg-state pg-state-${agentState}`}>
            <span className="pg-state-dot" />
            {STATE_LABELS[agentState] || agentState}
          </span>
          <button
            type="button"
            className={`pg-state pg-state-btn ${cdpStatus?.connected ? 'pg-state-ok' : 'pg-state-off'}`}
            title={cdpStatus?.connected ? cdpStatus?.tabTitle : 'Open CDP connection settings'}
            onClick={onOpenCdp}
          >
            {cdpStatus?.connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            CDP {cdpStatus?.connected ? 'connected' : 'offline'}
          </button>
          <div className="pg-quota" title="Applications submitted against session cap">
            <div className="pg-quota-text">
              <span>Quota</span>
              <strong>{appliedCount} / {maxCap}</strong>
            </div>
            <div className="pg-quota-track"><div className="pg-quota-fill" style={{ width: `${capPct}%` }} /></div>
          </div>
          <button className="pg-btn" onClick={onOpenSettings} title="Search criteria and automation rules">
            <SlidersHorizontal size={14} />
            <span>Config</span>
          </button>
        </div>
      </div>

      {/* Side panel: other tools, system status, theme, sign out */}
      {isSidePanelOpen && typeof document !== 'undefined' && ReactDOM.createPortal(
        <>
          <div className="dashboard-side-panel-backdrop" onClick={() => setIsSidePanelOpen(false)} />
          <aside className="dashboard-side-panel animate-slide-left">
            <div className="side-panel-header">
              <div className="side-panel-title-group">
                <PenguinAvatar mode="mini" />
                <span className="side-panel-title">Agent Penguin</span>
              </div>
              <button type="button" className="icon-btn side-panel-close-btn" onClick={() => setIsSidePanelOpen(false)} title="Close">
                <X size={18} />
              </button>
            </div>

            <div className="side-panel-body">
              <div className="side-panel-profile-card">
                <div className="side-panel-avatar-row">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={userName} className="side-panel-avatar-img" />
                  ) : (
                    <div className="side-panel-avatar-fallback">{initials}</div>
                  )}
                  <div className="side-panel-user-info">
                    <span className="side-panel-user-name">{userName}</span>
                    <span className="side-panel-user-badge">
                      {!isProfileComplete ? 'Setup incomplete' : (isGoogleUser ? 'Google verified' : 'Authenticated')}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline side-panel-profile-btn"
                  onClick={() => { setIsSidePanelOpen(false); onOpenProfilePage?.(); }}
                >
                  <User size={14} />
                  <span>{isProfileComplete ? 'Edit Profile & Resume' : 'Complete Profile & Resume'}</span>
                </button>
              </div>

              <div className="side-panel-section">
                <span className="side-panel-section-title">Other tools</span>
                <div className="side-panel-nav-list">
                  <button
                    type="button"
                    className={`side-panel-nav-item ${currentView === 'assistant' ? 'active' : ''}`}
                    onClick={() => { setIsSidePanelOpen(false); onChangeView?.('assistant'); }}
                  >
                    <Sparkles size={18} />
                    <div className="side-panel-nav-text">
                      <span className="side-panel-nav-main">Penguin Assistant AI</span>
                      <span className="side-panel-nav-sub">AI chat &amp; training</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`side-panel-nav-item ${currentView === 'viso-dsa' ? 'active' : ''}`}
                    onClick={() => { setIsSidePanelOpen(false); onChangeView?.('viso-dsa'); }}
                  >
                    <Code2 size={18} />
                    <div className="side-panel-nav-text">
                      <span className="side-panel-nav-main">VISO-DSA Lab</span>
                      <span className="side-panel-nav-sub">Interactive algorithm learning</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`side-panel-nav-item ${currentView === 'resume-analyzer' ? 'active' : ''}`}
                    onClick={() => { setIsSidePanelOpen(false); onChangeView?.('resume-analyzer'); }}
                  >
                    <FileCheck2 size={18} />
                    <div className="side-panel-nav-text">
                      <span className="side-panel-nav-main">Resume Analyzer</span>
                      <span className="side-panel-nav-sub">ATS score &amp; keyword audit</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="side-panel-section">
                <span className="side-panel-section-title">Guides</span>
                <div className="side-panel-links-list">
                  <button type="button" className="side-panel-link-btn" onClick={() => { setIsSidePanelOpen(false); onOpenHowToRun?.(); }}>
                    <BookOpen size={16} className="text-teal" />
                    <span>How to Run Agent (Mac &amp; Windows)</span>
                  </button>
                  <button type="button" className="side-panel-link-btn" onClick={() => { setIsSidePanelOpen(false); onOpenSettings?.(); }}>
                    <SlidersHorizontal size={16} className="text-teal" />
                    <span>Automation Settings &amp; Rules</span>
                  </button>
                </div>
              </div>

              <div className="side-panel-section">
                <span className="side-panel-section-title">System status</span>
                <div className="side-panel-status-card">
                  <div className="status-card-header">
                    <div className="status-card-title-group">
                      {cdpStatus?.connected ? <Wifi size={16} className="text-success" /> : <WifiOff size={16} className="text-danger" />}
                      <span className="status-card-name">Chrome CDP</span>
                    </div>
                    <span className={`status-pill-badge ${cdpStatus?.connected ? 'badge-success' : 'badge-danger'}`}>
                      {cdpStatus?.connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <span className="status-card-detail">{cdpStatus?.tabTitle || 'Port 9222 (Debugger)'}</span>
                  {onTestCDP && (
                    <button type="button" className="btn btn-outline btn-sm test-cdp-btn" onClick={onTestCDP}>
                      <RefreshCw size={12} />
                      <span>Test / Reconnect CDP</span>
                    </button>
                  )}
                </div>
                <div className="side-panel-status-card">
                  <div className="status-card-header">
                    <div className="status-card-title-group">
                      <Database size={16} className="text-teal" />
                      <span className="status-card-name">Cloud Database</span>
                    </div>
                    <span className="status-pill-badge badge-success">Synced</span>
                  </div>
                  <span className="status-card-detail">Applications sync to Supabase</span>
                </div>
              </div>

              <div className="side-panel-footer">
                <button type="button" className="side-panel-action-btn theme-switch-btn" onClick={onToggleTheme}>
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                  <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
                </button>
                {onSignOut && (
                  <button type="button" className="side-panel-action-btn signout-btn" onClick={onSignOut}>
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          </aside>
        </>,
        document.body
      )}
    </header>
  );
}
