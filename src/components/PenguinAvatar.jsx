import React from 'react';

/**
 * PenguinAvatar — The Official "Penguin" Baby Penguin Mascot
 * Modes: 'idle' | 'running' | 'loading' | 'welcome' | 'mini'
 */
export default function PenguinAvatar({ mode = 'idle', size = 120, className = '' }) {
  if (mode === 'mini') {
    return (
      <span className={`penguin-mini-icon ${className}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
          {/* Baby Penguin Body */}
          <ellipse cx="20" cy="22" rx="14" ry="16" fill="#1e293b" />
          <ellipse cx="20" cy="24" rx="10" ry="13" fill="#f8fafc" />
          {/* Blushing Cheeks */}
          <circle cx="13" cy="20" r="2.5" fill="#f472b6" opacity="0.6" />
          <circle cx="27" cy="20" r="2.5" fill="#f472b6" opacity="0.6" />
          {/* Eyes */}
          <circle cx="15" cy="17" r="2.2" fill="#0f172a" />
          <circle cx="15.8" cy="16.2" r="0.8" fill="#ffffff" />
          <circle cx="25" cy="17" r="2.2" fill="#0f172a" />
          <circle cx="25.8" cy="16.2" r="0.8" fill="#ffffff" />
          {/* Beak */}
          <path d="M18 20 Q20 23 22 20 Z" fill="#f59e0b" />
          {/* Webbed Feet */}
          <ellipse cx="15" cy="37" rx="3.5" ry="2" fill="#f59e0b" />
          <ellipse cx="25" cy="37" rx="3.5" ry="2" fill="#f59e0b" />
        </svg>
      </span>
    );
  }

  const isRunning = mode === 'running';
  const isLoading = mode === 'loading';
  const isWelcome = mode === 'welcome';

  return (
    <div className={`penguin-container penguin-mode-${mode} ${className}`} style={{ width: size, height: size, position: 'relative', display: 'inline-block' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`penguin-svg ${isRunning ? 'animate-penguin-run' : ''} ${isLoading ? 'animate-penguin-waddle' : ''} ${isWelcome ? 'animate-penguin-celebrate' : ''}`}
      >
        <defs>
          <radialGradient id="penguinTummy" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </radialGradient>
          <linearGradient id="beakGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="shoeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          <linearGradient id="briefcaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>

        {/* Motion lines for running mode */}
        {isRunning && (
          <g className="penguin-dust">
            <ellipse cx="30" cy="142" rx="16" ry="4" fill="rgba(37,99,235,0.2)" />
            <circle cx="22" cy="138" r="4" fill="rgba(37,99,235,0.3)" />
            <circle cx="12" cy="142" r="3" fill="rgba(37,99,235,0.2)" />
            {/* Speed breeze lines */}
            <path d="M10 80 L35 80" stroke="rgba(37,99,235,0.4)" strokeWidth="3" strokeLinecap="round" />
            <path d="M5 95 L25 95" stroke="rgba(37,99,235,0.3)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M12 110 L30 110" stroke="rgba(37,99,235,0.3)" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {/* Shadow */}
        <ellipse cx="80" cy="148" rx={isRunning ? 38 : 46} ry="8" fill="rgba(0,0,0,0.14)" />

        {/* Left Webbed Foot / Running Sneaker */}
        {isRunning ? (
          <g className="left-foot-run">
            <ellipse cx="62" cy="144" rx="14" ry="7" fill="url(#shoeGrad)" transform="rotate(-15 62 144)" />
            <path d="M52 146 Q62 148 72 146" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        ) : (
          <ellipse cx="62" cy="145" rx="14" ry="7" fill="url(#beakGrad)" />
        )}

        {/* Right Webbed Foot / Running Sneaker */}
        {isRunning ? (
          <g className="right-foot-run">
            <ellipse cx="98" cy="144" rx="14" ry="7" fill="url(#shoeGrad)" transform="rotate(15 98 144)" />
            <path d="M88 146 Q98 148 108 146" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        ) : (
          <ellipse cx="98" cy="145" rx="14" ry="7" fill="url(#beakGrad)" />
        )}

        {/* Left Flipper Wing */}
        <path
          className={isRunning ? 'flipper-left-run' : 'flipper-left'}
          d={isRunning ? "M48 85 Q25 95 38 120 Q50 110 52 90 Z" : "M48 85 Q30 105 45 125 Q55 115 52 90 Z"}
          fill="#1e293b"
        />

        {/* Baby Penguin Body (Main Charcoal Round Shape) */}
        <ellipse cx="80" cy="92" rx="46" ry="52" fill="#1e293b" />

        {/* Baby Penguin White Fluffy Tummy */}
        <ellipse cx="80" cy="98" rx="34" ry="42" fill="url(#penguinTummy)" />

        {/* Blushing Pink Cheeks */}
        <circle cx="58" cy="85" r="7" fill="#f472b6" opacity="0.65" />
        <circle cx="102" cy="85" r="7" fill="#f472b6" opacity="0.65" />

        {/* Big Adorable Baby Eyes */}
        <g className="penguin-eyes">
          {/* Left Eye */}
          <ellipse cx="64" cy="74" rx="6.5" ry="8" fill="#0f172a" />
          <circle cx="66.5" cy="71" r="2.8" fill="#ffffff" />
          <circle cx="62.5" cy="77" r="1.3" fill="#ffffff" />

          {/* Right Eye */}
          <ellipse cx="96" cy="74" rx="6.5" ry="8" fill="#0f172a" />
          <circle cx="98.5" cy="71" r="2.8" fill="#ffffff" />
          <circle cx="94.5" cy="77" r="1.3" fill="#ffffff" />
        </g>

        {/* Golden Cute Beak */}
        <path d="M73 82 Q80 94 87 82 Q80 79 73 82 Z" fill="url(#beakGrad)" />

        {/* Cute Head Tuft / Hair */}
        <path d="M78 40 Q75 30 80 26 Q85 30 82 40 Z" fill="#1e293b" />
        <path d="M82 41 Q85 32 89 29 Q90 35 84 42 Z" fill="#1e293b" />

        {/* Right Flipper Wing / Briefcase / Laptop */}
        {isRunning ? (
          <g className="flipper-right-run">
            <path d="M112 85 Q135 95 122 120 Q110 110 108 90 Z" fill="#1e293b" />
            {/* Tiny Blue Job Briefcase */}
            <rect x="114" y="98" width="24" height="18" rx="3" fill="url(#briefcaseGrad)" transform="rotate(12 114 98)" />
            <path d="M122 96 Q126 90 130 96" stroke="#ffffff" strokeWidth="2" fill="none" transform="rotate(12 114 98)" />
            <text x="120" y="111" fill="#ffffff" fontSize="7" fontWeight="bold" fontFamily="sans-serif" transform="rotate(12 114 98)">CV</text>
          </g>
        ) : isWelcome ? (
          <g className="flipper-right-wave">
            <path d="M112 85 Q135 60 142 80 Q125 90 110 90 Z" fill="#1e293b" />
          </g>
        ) : (
          <path className="flipper-right" d="M112 85 Q130 105 115 125 Q105 115 108 90 Z" fill="#1e293b" />
        )}

        {/* Celebration Party Hat for Welcome Mode */}
        {isWelcome && (
          <g className="penguin-party-hat">
            <polygon points="72,42 88,42 80,14" fill="#f59e0b" />
            <circle cx="80" cy="13" r="4" fill="#ef4444" />
            <path d="M74 38 Q80 34 86 38" stroke="#3b82f6" strokeWidth="2" fill="none" />
            <path d="M76 30 Q80 26 84 30" stroke="#10b981" strokeWidth="2" fill="none" />
          </g>
        )}
      </svg>
    </div>
  );
}
