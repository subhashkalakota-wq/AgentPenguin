import React from 'react';

// Illustrated penguin for the Penguin AI greeting: heart-shaped face, glossy
// eyes that blink, aqua scarf, one flipper resting and one waving.
export default function WavingPenguin({ size = 240, className = '' }) {
  const id = 'wp'; // gradient id prefix (only one instance on screen)
  return (
    <svg
      className={`wp ${className}`}
      width={size}
      height={size * 1.1}
      viewBox="0 0 200 220"
      role="img"
      aria-label="Penguin waving hello"
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#33445f" />
          <stop offset="100%" stopColor="#141c2a" />
        </linearGradient>
        <radialGradient id={`${id}-belly`} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e3ebf3" />
        </radialGradient>
        <linearGradient id={`${id}-orange`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffb547" />
          <stop offset="100%" stopColor="#f2791c" />
        </linearGradient>
        <linearGradient id={`${id}-scarf`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5fd3d6" />
          <stop offset="100%" stopColor="#2a9da3" />
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse className="wp-shadow" cx="100" cy="211" rx="60" ry="6.5" fill="rgba(18,62,66,0.16)" />

      {/* Waving flipper (behind body, pivots at the shoulder) */}
      <g className="wp-wave">
        <path d="M146 110 C 170 104, 194 80, 199 56 C 201 48, 194 44, 188 49 C 174 64, 158 84, 140 98 Z" fill={`url(#${id}-body)`} />
      </g>

      {/* Resting flipper */}
      <path d="M48 106 C 26 120, 14 148, 20 168 C 22 174, 29 174, 32 168 C 40 150, 48 130, 56 114 Z" fill={`url(#${id}-body)`} />

      {/* Feet */}
      <g fill={`url(#${id}-orange)`}>
        <path d="M60 204 C 60 195, 92 194, 95 203 C 96 207, 92 208, 89 206 C 86 209, 82 209, 78 207 C 74 209, 69 209, 66 207 C 63 209, 60 207, 60 204 Z" />
        <path d="M105 203 C 108 194, 140 195, 140 204 C 140 207, 137 209, 134 207 C 131 209, 126 209, 122 207 C 118 209, 114 209, 111 206 C 108 208, 104 207, 105 203 Z" />
      </g>

      {/* Body */}
      <path
        d="M100 16 C 140 16, 158 48, 158 90 C 158 118, 170 148, 165 172 C 160 194, 132 203, 100 203 C 68 203, 40 194, 35 172 C 30 148, 42 118, 42 90 C 42 48, 60 16, 100 16 Z"
        fill={`url(#${id}-body)`}
      />
      {/* Head tuft */}
      <path d="M99 18 C 95 7, 104 2, 110 8 C 105 8, 102 12, 103 18 Z" fill="#141c2a" />

      {/* Belly + heart-shaped face */}
      <path
        d="M100 58 C 92 41, 61 40, 57 65 C 54 82, 63 96, 70 102 C 60 116, 54 130, 54 146 C 54 178, 74 195, 100 195 C 126 195, 146 178, 146 146 C 146 130, 140 116, 130 102 C 137 96, 146 82, 143 65 C 139 40, 108 41, 100 58 Z"
        fill={`url(#${id}-belly)`}
      />

      {/* Cheeks */}
      <ellipse cx="69" cy="88" rx="7.5" ry="4.2" fill="#ff9fb6" opacity="0.6" />
      <ellipse cx="131" cy="88" rx="7.5" ry="4.2" fill="#ff9fb6" opacity="0.6" />

      {/* Eyes (blink together) */}
      <g className="wp-eyes">
        <ellipse cx="81" cy="72" rx="7.5" ry="9.5" fill="#141c2a" />
        <circle cx="84" cy="67.5" r="3" fill="#ffffff" />
        <circle cx="78.5" cy="76.5" r="1.4" fill="#ffffff" opacity="0.9" />
        <ellipse cx="119" cy="72" rx="7.5" ry="9.5" fill="#141c2a" />
        <circle cx="122" cy="67.5" r="3" fill="#ffffff" />
        <circle cx="116.5" cy="76.5" r="1.4" fill="#ffffff" opacity="0.9" />
      </g>

      {/* Beak */}
      <path d="M90 86 C 94 80, 106 80, 110 86 C 108 93, 103 97, 100 97 C 97 97, 92 93, 90 86 Z" fill={`url(#${id}-orange)`} />
      <path d="M92 87.5 C 96 89.5, 104 89.5, 108 87.5" stroke="#d9661a" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />

      {/* Scarf */}
      <path d="M52 106 C 76 120, 124 120, 148 106 L 151 120 C 124 138, 76 138, 49 120 Z" fill={`url(#${id}-scarf)`} />
      <path d="M116 124 L 128 160 C 129 163, 127 165, 124 164 L 113 160 L 108 127 Z" fill="#2a9da3" />
      <g stroke="#1f8187" strokeWidth="1.6" strokeLinecap="round">
        <line x1="116" y1="160.5" x2="115" y2="166" />
        <line x1="121" y1="162.5" x2="120.5" y2="168" />
        <line x1="126" y1="164" x2="126.5" y2="169" />
      </g>
      <path d="M58 113 C 80 124, 120 124, 142 113" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}
