import React, { useEffect, useRef, useState } from 'react';

/*
 * Small SVG charts for the Penguin Profile (no chart library).
 * Colors come from CSS variables (--viz-*) so light and dark modes each use their own
 * validated steps. Every mark has a hover/focus tooltip; values also appear as labels or
 * in a legend, so nothing depends on hovering.
 */

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-IN') : n);

function useTooltip() {
  const ref = useRef(null);
  const [tip, setTip] = useState(null);
  const show = (e, content) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const p = e.touches?.[0] || e;
    const x = (p.clientX ?? box.left + box.width / 2) - box.left;
    const y = (p.clientY ?? box.top + box.height / 2) - box.top;
    setTip({ x, y, content });
  };
  const showAt = (x, y, content) => setTip({ x, y, content });
  const hide = () => setTip(null);
  const node = tip ? (
    <div className="pg-viz-tip" style={{ left: tip.x, top: tip.y }} role="status">
      <strong>{tip.content.value}</strong>
      <span>{tip.content.label}</span>
    </div>
  ) : null;
  return { ref, show, showAt, hide, node };
}

/** Donut for part-to-whole (≤ 6 segments). segments: [{ label, value, color }] */
export function Donut({ segments, size = 156, thickness = 22, centerValue, centerLabel, ariaLabel }) {
  const t = useTooltip();
  const [active, setActive] = useState(null);
  const total = segments.reduce((n, s) => n + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const gap = segments.filter(s => s.value > 0).length > 1 ? 2 : 0; // surface gap between segments
  let offset = 0;
  return (
    <div className="pg-viz pg-donut" ref={t.ref} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--viz-track)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          if (!s.value) return null;
          const len = (s.value / total) * circ;
          const dash = Math.max(0, len - gap);
          const el = (
            <circle
              key={s.label}
              cx={c} cy={c} r={r} fill="none"
              stroke={s.color}
              strokeWidth={active === i ? thickness + 4 : thickness}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${c} ${c})`}
              tabIndex={0}
              aria-label={`${s.label}: ${fmt(s.value)} (${Math.round((s.value / total) * 100)}%)`}
              onPointerMove={(e) => { setActive(i); t.show(e, { value: `${fmt(s.value)} · ${Math.round((s.value / total) * 100)}%`, label: s.label }); }}
              onPointerLeave={() => { setActive(null); t.hide(); }}
              onFocus={() => { setActive(i); t.showAt(c, thickness / 2, { value: `${fmt(s.value)} · ${Math.round((s.value / total) * 100)}%`, label: s.label }); }}
              onBlur={() => { setActive(null); t.hide(); }}
              style={{ transition: 'stroke-width 0.12s', cursor: 'default', outline: 'none' }}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {(centerValue != null) && (
        <div className="pg-donut-center" aria-hidden="true">
          <strong>{fmt(centerValue)}</strong>
          {centerLabel && <span>{centerLabel}</span>}
        </div>
      )}
      {t.node}
    </div>
  );
}

/** Legend rows for a donut: swatch + label + value (+ share). */
export function Legend({ items, total, unit = '' }) {
  return (
    <ul className="pg-viz-legend">
      {items.map(s => (
        <li key={s.label}>
          <span className="pg-viz-swatch" style={{ background: s.color }} aria-hidden="true" />
          <span className="pg-viz-legend-label">{s.label}</span>
          <strong>{fmt(s.value)}{unit}</strong>
          {total ? <span className="pg-viz-legend-share">{Math.round((s.value / total) * 100)}%</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** Horizontal bars (one hue): items [{ label, value }]. Value at the bar tip. */
export function BarList({ items, color = 'var(--viz-seq-2)', ariaLabel, unit = '' }) {
  const t = useTooltip();
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <div className="pg-viz pg-barlist" ref={t.ref} role="list" aria-label={ariaLabel}>
      {items.map(it => (
        <div
          key={it.label}
          className="pg-barlist-row"
          role="listitem"
          tabIndex={0}
          aria-label={`${it.label}: ${fmt(it.value)}${unit}`}
          onPointerMove={(e) => t.show(e, { value: `${fmt(it.value)}${unit}`, label: it.label })}
          onPointerLeave={t.hide}
          onFocus={(e) => { const r = e.currentTarget.getBoundingClientRect(); const b = t.ref.current.getBoundingClientRect(); t.showAt(r.left - b.left + 120, r.top - b.top, { value: `${fmt(it.value)}${unit}`, label: it.label }); }}
          onBlur={t.hide}
        >
          <span className="pg-barlist-label" title={it.label}>{it.label}</span>
          <span className="pg-barlist-track">
            <span className="pg-barlist-bar" style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: color }} />
          </span>
          <span className="pg-barlist-value">{fmt(it.value)}{unit}</span>
        </div>
      ))}
      {t.node}
    </div>
  );
}

/** Columns from one baseline (one hue): items [{ label, value }]. */
export function Columns({ items, color = 'var(--viz-seq-2)', height = 150, ariaLabel, xLabel }) {
  const t = useTooltip();
  const max = Math.max(1, ...items.map(i => i.value));
  const niceMax = (() => { const p = 10 ** Math.floor(Math.log10(max)); return Math.ceil(max / p) * p; })();
  const ticks = [0, niceMax / 2, niceMax];
  const every = Math.ceil(items.length / 10); // thin out x labels
  return (
    <div className="pg-viz pg-columns" ref={t.ref}>
      <div className="pg-columns-plot" style={{ height }} role="list" aria-label={ariaLabel}>
        <div className="pg-columns-grid" aria-hidden="true">
          {ticks.slice().reverse().map(v => <span key={v}><em>{fmt(Math.round(v))}</em></span>)}
        </div>
        <div className="pg-columns-bars">
          {items.map(it => (
            <div
              key={it.label}
              className="pg-columns-slot"
              role="listitem"
              tabIndex={0}
              aria-label={`${it.label}: ${fmt(it.value)}`}
              onPointerMove={(e) => t.show(e, { value: fmt(it.value), label: `${xLabel ? `${xLabel} ` : ''}${it.label}` })}
              onPointerLeave={t.hide}
              onFocus={(e) => { const r = e.currentTarget.getBoundingClientRect(); const b = t.ref.current.getBoundingClientRect(); t.showAt(r.left - b.left + r.width / 2, 10, { value: fmt(it.value), label: `${xLabel ? `${xLabel} ` : ''}${it.label}` }); }}
              onBlur={t.hide}
            >
              <span className="pg-columns-bar" style={{ height: `${(it.value / niceMax) * 100}%`, background: color }} />
            </div>
          ))}
        </div>
      </div>
      <div className="pg-columns-x" aria-hidden="true">
        {items.map((it, i) => <span key={it.label}>{i % every === 0 ? it.label : ''}</span>)}
      </div>
      {t.node}
    </div>
  );
}

/** Single-series line over time with a crosshair tooltip. points: [{ at, value }] */
export function TrendLine({ points, height = 140, color = 'var(--viz-seq-3)', ariaLabel, valueLabel = 'Rating' }) {
  const t = useTooltip();
  const [hover, setHover] = useState(null);
  const [W, setW] = useState(520);
  // Draw at the real width so text keeps its size on phones and wide screens
  useEffect(() => {
    const el = t.ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => { const w = Math.round(e.contentRect.width); if (w > 0) setW(w); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [t.ref]);
  const H = height;
  const pad = { l: 40, r: 12, t: 10, b: 22 };
  if (points.length < 2) return null;
  const vals = points.map(p => p.value);
  const lo = Math.floor(Math.min(...vals) / 100) * 100;
  const hi = Math.ceil(Math.max(...vals) / 100) * 100 || lo + 100;
  const x = (i) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (H - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  const onMove = (e) => {
    const svg = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - svg.left) / svg.width) * W;
    const i = Math.max(0, Math.min(points.length - 1, Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (points.length - 1))));
    setHover(i);
    t.showAt((x(i) / W) * svg.width, (y(points[i].value) / H) * svg.height, { value: `${valueLabel} ${fmt(points[i].value)}`, label: points[i].at });
  };
  return (
    <div className="pg-viz pg-trend" ref={t.ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={ariaLabel} onPointerMove={onMove} onPointerLeave={() => { setHover(null); t.hide(); }}>
        {[lo, (lo + hi) / 2, hi].map(v => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--viz-grid)" strokeWidth="1" />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" className="pg-viz-axis">{fmt(Math.round(v))}</text>
          </g>
        ))}
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--viz-grid-strong)" strokeWidth="1" />}
        {hover != null && <circle cx={x(hover)} cy={y(points[hover].value)} r="5" fill={color} stroke="var(--bg-card)" strokeWidth="2" />}
        <circle cx={x(points.length - 1)} cy={y(last.value)} r="4.5" fill={color} stroke="var(--bg-card)" strokeWidth="2" />
        <text x={W - pad.r} y={y(last.value) - 9} textAnchor="end" className="pg-viz-endlabel">{fmt(last.value)}</text>
        <text x={pad.l} y={H - 5} className="pg-viz-axis">{points[0].at}</text>
        <text x={W - pad.r} y={H - 5} textAnchor="end" className="pg-viz-axis">{last.at}</text>
      </svg>
      {t.node}
    </div>
  );
}
