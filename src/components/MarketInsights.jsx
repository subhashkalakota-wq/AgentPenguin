import React, { useCallback, useEffect, useState } from 'react';
import {
  TrendingUp, Building2, MapPin, Newspaper, Cpu, RefreshCw, ChevronDown, ChevronUp,
  CalendarDays, Clock, ExternalLink, AlertTriangle, Pencil,
} from 'lucide-react';

import { placeName } from '../../shared/locations';

const API = 'http://localhost:3001/api/market';
const COLLAPSE_KEY = 'pg_market_collapsed';
const PLACE_KEY = 'pg_market_location';

function ago(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

const dayLabel = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null);
const isToday = (d) => d === new Date().toISOString().slice(0, 10);
const shortRole = (r) => r.replace(/\(.*?\)/g, '').trim();

const MOOD_CLASS = { 'Hiring is strong': 'is-strong', Steady: 'is-steady', Mixed: 'is-mixed', Cautious: 'is-cautious' };

function NewsList({ items, emptyText }) {
  const [all, setAll] = useState(false);
  if (!items?.length) return <p className="pg-mk-empty">{emptyText}</p>;
  const shown = all ? items : items.slice(0, 5);
  return (
    <>
      <ul className="pg-mk-news-list">
        {shown.map(n => (
          <li key={n.url}>
            <a href={n.url} target="_blank" rel="noreferrer">{n.title}</a>
            <span>{n.source}{n.points ? ` · ${n.points} points` : ''} · {ago(n.publishedAt)}</span>
          </li>
        ))}
      </ul>
      {items.length > 5 && (
        <button type="button" className="pg-mk-more" onClick={() => setAll(a => !a)}>{all ? 'Show less' : `Show ${items.length - 5} more`}</button>
      )}
    </>
  );
}

/**
 * Job market at a glance, above the applications table: market pulse, new openings
 * for the user's roles, who's hiring, walk-in drives nearby, and job / tech news.
 */
export default function MarketInsights({ locations = [], roles = [], onEditSettings }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newsTab, setNewsTab] = useState('jobs');
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });
  const roleKey = roles.filter(Boolean).join('|');
  // Market data is for one of the user's search locations at a time (remembered per browser)
  const [picked, setPicked] = useState(() => {
    try { return localStorage.getItem(PLACE_KEY) || ''; } catch { return ''; }
  });
  const location = locations.includes(picked) ? picked : (locations[0] || '');
  const pickPlace = (l) => {
    setPicked(l);
    setData(null);
    try { localStorage.setItem(PLACE_KEY, l); } catch { /* storage unavailable */ }
  };

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ location, roles: roleKey, ...(refresh ? { refresh: '1' } : {}) });
      const res = await fetch(`${API}?${qs}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
      setData(body);
    } catch (e) {
      setError(e.message === 'Failed to fetch' ? 'Backend is not running. Start it with: npm run server' : e.message);
    } finally {
      setLoading(false);
    }
  }, [location, roleKey]);

  useEffect(() => { if (!collapsed) load(); }, [load, collapsed]);

  const toggle = () => {
    setCollapsed(c => {
      try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); } catch { /* storage unavailable */ }
      return !c;
    });
  };

  const city = data?.city || placeName(location) || 'India';

  return (
    <section className="pg-market" aria-label="Job market">
      <div className="pg-market-head">
        <div>
          <h2>Job market today</h2>
          <p>
            {locations.length <= 1 && <><MapPin size={13} /> {city}<span className="pg-market-dot">·</span></>}
            {roles.filter(Boolean).map(shortRole).join(', ') || 'Your roles'}
            {data?.updatedAt && <><span className="pg-market-dot">·</span>Updated {ago(data.updatedAt)}</>}
            {onEditSettings && <button type="button" className="pg-market-link" onClick={onEditSettings}><Pencil size={12} /> Change</button>}
          </p>
        </div>
        <div className="pg-market-actions">
          {!collapsed && (
            <button type="button" className="pg-icon-btn" onClick={() => load(true)} disabled={loading} aria-label="Refresh market data" title="Refresh">
              <RefreshCw size={15} className={loading ? 'pg-spin' : ''} />
            </button>
          )}
          <button type="button" className="pg-btn" onClick={toggle} aria-expanded={!collapsed}>
            {collapsed ? <><ChevronDown size={14} /> Show</> : <><ChevronUp size={14} /> Hide</>}
          </button>
        </div>
      </div>

      {!collapsed && locations.length > 1 && (
        <div className="pg-market-places" role="tablist" aria-label="Location">
          <MapPin size={14} />
          {locations.map(l => (
            <button key={l} type="button" role="tab" aria-selected={l === location} className={`pg-chip ${l === location ? 'active' : ''}`} onClick={() => pickPlace(l)}>
              {placeName(l)}
            </button>
          ))}
        </div>
      )}

      {!collapsed && error && <p className="pg-notice is-error"><AlertTriangle size={15} /> {error}</p>}

      {!collapsed && !data && !error && (
        <div className="pg-market-grid" aria-busy="true">
          {['pulse', 'openings', 'companies', 'walkins', 'news'].map(k => (
            <div key={k} className={`pg-card pg-mk-${k} pg-mk-skeleton`}>
              <span /><span /><span />
            </div>
          ))}
          <p className="pg-mk-loading">Gathering today's openings, walk-ins and news… the first load takes a few seconds.</p>
        </div>
      )}

      {!collapsed && data && (
        <div className="pg-market-grid">
          {/* Market pulse */}
          <article className="pg-card pg-mk-pulse">
            <div className="pg-mk-title">
              <TrendingUp size={16} /> <h3>Market pulse</h3>
              {data.pulse?.mood && <span className={`pg-mk-mood ${MOOD_CLASS[data.pulse.mood] || ''}`}>{data.pulse.mood}</span>}
            </div>
            {data.pulse?.bullets?.length ? (
              <ul className="pg-mk-bullets">
                {data.pulse.bullets.map((b, i) => (
                  <li key={i}>
                    <p>{b.text}</p>
                    {b.sources?.length > 0 && (
                      <span className="pg-mk-sources">
                        {b.sources.map((s, j) => (s.url
                          ? <a key={j} href={s.url} target="_blank" rel="noreferrer" title={s.title}>{s.source}</a>
                          : <span key={j}>{s.source}</span>))}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : <p className="pg-mk-empty">The AI summary isn't available right now. See the news and openings below.</p>}
          </article>

          {/* New openings per role */}
          <article className="pg-card pg-mk-openings">
            <div className="pg-mk-title"><Cpu size={16} /> <h3>New openings in {city}</h3></div>
            <ul className="pg-mk-openings-list">
              {data.openings.map(o => (
                <li key={o.role}>
                  <span className="pg-mk-role" title={o.role}>{shortRole(o.role)}</span>
                  <span className="pg-mk-num">{o.today ? <><strong>{o.today.label}</strong> today</> : 'Updating…'}</span>
                  <span className="pg-mk-num">{o.week && <><strong>{o.week.label}</strong> this week</>}</span>
                </li>
              ))}
            </ul>
            <p className="pg-mk-foot">New LinkedIn listings for your roles.</p>
          </article>

          {/* Who is hiring */}
          <article className="pg-card pg-mk-companies">
            <div className="pg-mk-title"><Building2 size={16} /> <h3>Hiring now</h3></div>
            {data.companies.length ? (
              <ol className="pg-mk-company-list">
                {data.companies.slice(0, 7).map(c => (
                  <li key={c.company}>
                    <a href={c.url} target="_blank" rel="noreferrer">
                      <span className="pg-mk-company-mark" aria-hidden="true">{c.company.charAt(0).toUpperCase()}</span>
                      <span className="pg-mk-company-text">
                        <strong>{c.company}</strong>
                        <span>{c.titles.slice(0, 2).join(' · ')}</span>
                      </span>
                      <span className="pg-mk-count">{c.openings}</span>
                    </a>
                  </li>
                ))}
              </ol>
            ) : <p className="pg-mk-empty">No hiring data for these roles yet.</p>}
            <p className="pg-mk-foot">Openings posted this week for your roles.</p>
          </article>

          {/* Walk-ins */}
          <article className="pg-card pg-mk-walkins">
            <div className="pg-mk-title"><CalendarDays size={16} /> <h3>Walk-ins near you</h3></div>
            {data.walkIns.length ? (
              <ul className="pg-mk-walkin-list">
                {data.walkIns.slice(0, 5).map(w => (
                  <li key={w.id}>
                    <span className={`pg-mk-date ${isToday(w.date) ? 'is-today' : ''}`}>
                      {w.date ? <>{isToday(w.date) ? 'Today' : dayLabel(w.date)}{w.endDate && w.endDate !== w.date ? `–${dayLabel(w.endDate)}` : ''}</> : 'Date TBC'}
                    </span>
                    <div className="pg-mk-walkin-text">
                      <a href={w.url} target="_blank" rel="noreferrer"><strong>{w.company}</strong> · {w.title}</a>
                      <span>
                        {w.time && <><Clock size={11} /> {w.time}</>}
                        {w.venue && <><MapPin size={11} /> <span className="pg-mk-venue" title={w.venue}>{w.venue}</span></>}
                        {!w.time && !w.venue && w.location}
                      </span>
                      {w.experience && <span>Experience: {w.experience}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="pg-mk-empty">No upcoming walk-in drives found in {city} right now.</p>}
            <p className="pg-mk-foot">From recent job posts. Confirm details on the post before you go.</p>
          </article>

          {/* News */}
          <article className="pg-card pg-mk-news">
            <div className="pg-mk-title pg-mk-title-tabs">
              <Newspaper size={16} />
              <div className="pg-mk-tabs" role="tablist" aria-label="News">
                <button type="button" role="tab" aria-selected={newsTab === 'jobs'} className={newsTab === 'jobs' ? 'active' : ''} onClick={() => setNewsTab('jobs')}>Job news</button>
                <button type="button" role="tab" aria-selected={newsTab === 'tech'} className={newsTab === 'tech' ? 'active' : ''} onClick={() => setNewsTab('tech')}>Tech news</button>
              </div>
            </div>
            {newsTab === 'jobs'
              ? <NewsList key="jobs" items={data.jobNews} emptyText="No job news right now." />
              : <NewsList key="tech" items={data.techNews} emptyText="No tech news right now." />}
            <p className="pg-mk-foot"><ExternalLink size={11} /> Google News and Hacker News.</p>
          </article>
        </div>
      )}
    </section>
  );
}
