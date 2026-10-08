import React from 'react';
import {
  ScanSearch,
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  Timer
} from 'lucide-react';

export default function MetricsCards({
  scannedCount,
  shortlistedCount,
  appliedCount,
  needsReviewCount,
  discardedCount,
  avgPacingSec,
  maxCap
}) {
  const shortlistPercent = scannedCount > 0 ? Math.round((shortlistedCount / scannedCount) * 100) : 0;
  const capPercent = maxCap > 0 ? Math.min(100, Math.round((appliedCount / maxCap) * 100)) : 0;

  const tiles = [
    {
      label: 'Listings scanned',
      value: scannedCount,
      sub: 'Easy Apply jobs found',
      icon: ScanSearch,
      tone: 'neutral',
    },
    {
      label: 'Shortlist rate',
      value: `${shortlistPercent}%`,
      sub: `${shortlistedCount} passed · ${discardedCount} filtered`,
      icon: BrainCircuit,
      tone: 'accent',
      bar: shortlistPercent,
    },
    {
      label: 'Submitted',
      value: appliedCount,
      unit: `/ ${maxCap}`,
      sub: `${Math.max(0, maxCap - appliedCount)} left before auto-pause`,
      icon: CheckCircle2,
      tone: 'success',
      bar: capPercent,
    },
    {
      label: 'Needs review',
      value: needsReviewCount,
      sub: 'Custom questions skipped',
      icon: AlertTriangle,
      tone: needsReviewCount > 0 ? 'warning' : 'neutral',
    },
    {
      label: 'Avg pacing',
      value: avgPacingSec === '—' ? '—' : `${avgPacingSec}s`,
      sub: 'Randomized human delay',
      icon: Timer,
      tone: 'neutral',
    },
  ];

  return (
    <section className="pg-stats">
      {tiles.map(({ label, value, unit, sub, icon: Icon, tone, bar }) => (
        <div key={label} className={`pg-stat pg-tone-${tone}`}>
          <div className="pg-stat-top">
            <span className="pg-stat-label">{label}</span>
            <span className="pg-stat-icon"><Icon size={16} /></span>
          </div>
          <div className="pg-stat-value">
            {value}
            {unit && <span className="pg-stat-unit">{unit}</span>}
          </div>
          <div className="pg-stat-sub">{sub}</div>
          {bar != null && (
            <div className="pg-stat-track"><div style={{ width: `${bar}%` }} /></div>
          )}
        </div>
      ))}
    </section>
  );
}
