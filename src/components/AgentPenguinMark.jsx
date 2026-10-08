import React from 'react';

// Monochrome "Agent Penguin" mark — distinct from the colorful Penguin AI mascot.
// Uses currentColor for the silhouette so it follows the theme ink/paper.
export default function AgentPenguinMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.5c-3.6 0-6 2.9-6 6.6v4.2c0 1.5-.9 2.6-1.7 3.6-.4.5 0 1.2.6 1.1l1.6-.3c.9 2.4 3 3.8 5.5 3.8s4.6-1.4 5.5-3.8l1.6.3c.6.1 1-.6.6-1.1-.8-1-1.7-2.1-1.7-3.6V9.1c0-3.7-2.4-6.6-6-6.6Z"
        fill="currentColor"
      />
      <ellipse cx="12" cy="14.6" rx="3.6" ry="4.6" fill="var(--pg-paper, #fff)" />
      <circle cx="9.9" cy="8.4" r="1.1" fill="var(--pg-paper, #fff)" />
      <circle cx="14.1" cy="8.4" r="1.1" fill="var(--pg-paper, #fff)" />
      <path d="M10.8 10.6h2.4L12 12.2l-1.2-1.6Z" fill="var(--pg-paper, #fff)" />
    </svg>
  );
}
