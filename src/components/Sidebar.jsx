import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { DASHBOARD_TABS } from '../data/dashboardTabs';

export default function Sidebar({
  activeTab,
  onChangeTab,
  mobileOpen,
  onCloseMobile,
  tabCounts = {},
  isRunning = false,
  isProfileComplete = true,
  cdpConnected = false,
  isAdmin = false
}) {
  // Hover to open, move away to close. Small delays stop it flickering when
  // the cursor just passes over the edge of the screen.
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef(null);
  const schedule = (open, delay) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setExpanded(open), delay);
  };
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleSelect = (key) => {
    onChangeTab?.(key);
    onCloseMobile?.();
    schedule(false, 0);
  };

  return (
    <>
      {mobileOpen && <div className="pg-sidebar-backdrop" onClick={onCloseMobile} />}
      <aside
        className={`pg-sidebar ${expanded || mobileOpen ? '' : 'is-collapsed'} ${mobileOpen ? 'is-mobile-open' : ''}`}
        aria-label="Dashboard navigation"
        onMouseEnter={() => schedule(true, 90)}
        onMouseLeave={() => schedule(false, 160)}
        onFocus={() => schedule(true, 0)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) schedule(false, 0); }}
      >
        {/* Close button for the mobile drawer only */}
        <div className="pg-sidebar-top">
          <button
            type="button"
            className="pg-sidebar-close"
            onClick={onCloseMobile}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="pg-side-nav">
          {DASHBOARD_TABS.filter(t => !t.adminOnly || isAdmin).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={`pg-side-item ${activeTab === key ? 'active' : ''}`}
              onClick={() => handleSelect(key)}
              title={expanded ? undefined : label}
              aria-current={activeTab === key ? 'page' : undefined}
            >
              <span className="pg-side-icon">
                <Icon size={18} />
                {key === 'live' && isRunning && <span className="pg-side-dot pg-side-dot-live" />}
                {key === 'profile' && !isProfileComplete && <span className="pg-side-dot pg-side-dot-warn" />}
                {key === 'cdp' && <span className={`pg-side-dot ${cdpConnected ? 'pg-side-dot-ok' : 'pg-side-dot-off'}`} />}
              </span>
              <span className="pg-side-label">{label}</span>
              {tabCounts[key] != null && <span className="pg-side-count">{tabCounts[key]}</span>}
            </button>
          ))}
        </nav>

      </aside>
    </>
  );
}
