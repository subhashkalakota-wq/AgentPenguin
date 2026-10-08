import React, { useMemo, useRef, useState } from 'react';
import { X, Plus, Search, Check, Minus, User, PlugZap, MapPin } from 'lucide-react';
import { PLATFORMS } from '../data/platforms';
import { searchLocations } from '../../shared/locations';

// Common tech roles offered as suggestions (any custom role can be typed too)
const ROLE_SUGGESTIONS = [
  'Software Engineer', 'Senior Software Engineer', 'Full Stack Engineer (React/Node)', 'Senior Full Stack Engineer',
  'Frontend Developer (React/Next.js)', 'Senior Frontend Engineer', 'Backend Engineer (Node/Python/Go)', 'Java Developer',
  'Java Full Stack Developer', 'Python Developer (Django/FastAPI)', 'Node.js Backend Developer', 'MERN Stack Developer',
  'React Native Developer', 'Android Developer (Kotlin)', 'iOS Developer (Swift)', 'Flutter Developer',
  'Machine Learning Engineer', 'AI Engineer', 'Generative AI Application Engineer', 'Data Engineer', 'Data Scientist',
  'Data Analyst', 'DevOps Engineer', 'Cloud Engineer (AWS/GCP)', 'Site Reliability Engineer (SRE)',
  'QA / Test Automation Engineer', 'Security Engineer', 'UI Developer', 'Software Engineer Intern', 'Graduate Engineer Trainee',
];

// Common places to search (any city or country can be typed)
const LOCATION_SUGGESTIONS = [
  'Hyderabad', 'Bengaluru', 'Chennai', 'Pune', 'Mumbai', 'Delhi', 'Noida', 'Gurugram', 'Kolkata', 'Ahmedabad',
  'Kochi', 'Coimbatore', 'Visakhapatnam', 'Jaipur', 'Chandigarh', 'Indore', 'Remote', 'India',
];

const EXPERIENCE_LEVELS = ['Internship', 'Entry level', 'Associate', 'Mid-Senior level', 'Director'];
const TARGET_PRESETS = [10, 25, 50, 100];
const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || min));

function initialRoles(config) {
  if (Array.isArray(config.searchQueries) && config.searchQueries.length) return config.searchQueries;
  return config.searchQuery ? [config.searchQuery] : [];
}

/** Removable chips plus a type-ahead box with suggestions (roles, locations). */
function ChipPicker({ items, onChange, suggestions, placeholder, label, emptyText, icon: Icon = Search }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    return suggestions.filter(s => !items.some(i => i.toLowerCase() === s.toLowerCase()) && (!q || s.toLowerCase().includes(q))).slice(0, 8);
  }, [text, items, suggestions]);

  const add = (value) => {
    const v = (value ?? text).trim();
    if (!v) return;
    if (!items.some(i => i.toLowerCase() === v.toLowerCase())) onChange([...items, v]);
    setText('');
    inputRef.current?.focus();
  };

  return (
    <>
      <div className="pg-role-chips">
        {items.length === 0 && <span className="pg-settings-empty">{emptyText}</span>}
        {items.map(r => (
          <span key={r} className="pg-role-chip">
            {r}
            <button type="button" onClick={() => onChange(items.filter(x => x !== r))} aria-label={`Remove ${r}`}><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="pg-role-add">
        <div className="pg-role-input">
          <Icon size={14} />
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => { setText(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder={placeholder}
            aria-label={label}
          />
        </div>
        <button type="button" className="pg-btn" onClick={() => add()} disabled={!text.trim()}><Plus size={14} /> Add</button>
        {open && matches.length > 0 && (
          <ul className="pg-role-suggest" role="listbox">
            {matches.map(s => (
              <li key={s}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(s)}>{s}</button></li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function Stepper({ value, min, max, step = 1, onChange, label }) {
  return (
    <div className="pg-stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(clamp(value - step, min, max))} disabled={value <= min} aria-label={`Fewer ${label}`}><Minus size={14} /></button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        onBlur={(e) => onChange(clamp(e.target.value, min, max))}
        aria-label={label}
      />
      <button type="button" onClick={() => onChange(clamp(value + step, min, max))} disabled={value >= max} aria-label={`More ${label}`}><Plus size={14} /></button>
    </div>
  );
}

/**
 * Run settings: what Penguin searches for and how it applies.
 * Profile details (resume, contact, answers) live in the Profile tab; Chrome in the CDP tab.
 */
export default function AgentControlPanel({ isOpen, onClose, config = {}, onSaveConfig, onOpenProfile, onOpenCdp }) {
  const [roles, setRoles] = useState(() => initialRoles(config));
  const [locations, setLocations] = useState(() => searchLocations(config));
  const [levels, setLevels] = useState(() => (Array.isArray(config.experienceLevels) ? config.experienceLevels : []));
  const [target, setTarget] = useState(config.maxApplications || 25);
  const [tabs, setTabs] = useState(config.parallelTabs ?? 5);
  const [minMatch, setMinMatch] = useState(config.minMatchScore ?? 70);
  const [pacing, setPacing] = useState(config.pacingDelaySec ?? 6);
  const [platforms, setPlatforms] = useState(() => (Array.isArray(config.platforms) && config.platforms.length ? config.platforms : ['linkedin']));
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

  const save = () => {
    if (!roles.length) { setError('Add at least one role for Penguin to search for.'); return; }
    if (!locations.length) { setError('Add at least one location (use "India" or "Remote" to search widely).'); return; }
    if (!platforms.length) { setError('Choose at least one job site.'); return; }
    const next = {
      ...config,
      searchQueries: roles,
      searchQuery: roles[0],
      locations,
      location: locations[0],
      experienceLevels: levels,
      maxApplications: clamp(target, 1, 200),
      parallelTabs: clamp(tabs, 1, 15),
      minMatchScore: clamp(minMatch, 40, 95),
      pacingDelaySec: clamp(pacing, 3, 20),
      platforms,
    };
    onSaveConfig(next);
    fetch('http://localhost:3001/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: next }),
    }).catch(() => {});
    onClose();
  };

  return (
    <div className="pg-modal-backdrop" onClick={onClose}>
      <div className="pg-modal pg-settings" role="dialog" aria-modal="true" aria-labelledby="rs-title" onClick={(e) => e.stopPropagation()}>
        <div className="pg-modal-head">
          <div>
            <h2 id="rs-title">Run settings</h2>
            <p>What Penguin searches for and how it applies.</p>
          </div>
          <button className="pg-icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="pg-settings-body">
          {/* Roles */}
          <section className="pg-settings-section">
            <div className="pg-settings-label">
              <h3>Roles</h3>
              <span>Penguin searches each role in turn.</span>
            </div>
            <div className="pg-settings-control">
              <ChipPicker
                items={roles}
                onChange={(next) => { setRoles(next); setError(''); }}
                suggestions={ROLE_SUGGESTIONS}
                placeholder="Add a role, e.g. Java Developer"
                label="Add a role"
                emptyText="No roles yet. Add one below."
              />
            </div>
          </section>

          {/* Where */}
          <section className="pg-settings-section">
            <div className="pg-settings-label">
              <h3>Locations</h3>
              <span>Penguin applies in every location you add. Job market shows these places.</span>
            </div>
            <div className="pg-settings-control">
              <ChipPicker
                items={locations}
                onChange={(next) => { setLocations(next); setError(''); }}
                suggestions={LOCATION_SUGGESTIONS}
                placeholder="Add a city, e.g. Bengaluru"
                label="Add a location"
                emptyText="No locations yet. Add one below."
                icon={MapPin}
              />
            </div>
          </section>

          <section className="pg-settings-section">
            <div className="pg-settings-label">
              <h3>Experience level</h3>
              <span>Leave empty for any level.</span>
            </div>
            <div className="pg-settings-control">
              <div className="pg-toggle-row" role="group" aria-label="Experience level">
                {EXPERIENCE_LEVELS.map(l => (
                  <button key={l} type="button" className={`pg-chip ${levels.includes(l) ? 'active' : ''}`} aria-pressed={levels.includes(l)} onClick={() => toggle(levels, setLevels, l)}>
                    {levels.includes(l) && <Check size={12} />} {l}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* How many */}
          <section className="pg-settings-section">
            <div className="pg-settings-label">
              <h3>Applications</h3>
              <span>Penguin keeps searching until it sends this many, or you press Stop.</span>
            </div>
            <div className="pg-settings-control">
              <div className="pg-settings-inline">
                <Stepper value={target} min={1} max={200} step={5} onChange={setTarget} label="applications" />
                <div className="pg-toggle-row">
                  {TARGET_PRESETS.map(n => (
                    <button key={n} type="button" className={`pg-chip ${Number(target) === n ? 'active' : ''}`} onClick={() => setTarget(n)}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="pg-settings-section">
            <div className="pg-settings-label">
              <h3>Tabs at once</h3>
              <span>Jobs Penguin works on at the same time. Use 3–5 if your computer slows down.</span>
            </div>
            <div className="pg-settings-control">
              <Stepper value={tabs} min={1} max={15} onChange={setTabs} label="tabs" />
            </div>
          </section>

          {/* Quality & pace */}
          <section className="pg-settings-section">
            <div className="pg-settings-label">
              <h3>Match &amp; pace</h3>
              <span>Skip weaker matches, and pause between applications like a person would.</span>
            </div>
            <div className="pg-settings-control">
              <label className="pg-range">
                <span>Minimum match <strong>{minMatch}%</strong></span>
                <input type="range" min="40" max="95" step="5" value={minMatch} onChange={(e) => setMinMatch(Number(e.target.value))} />
              </label>
              <label className="pg-range">
                <span>Pause between applications <strong>{pacing}s</strong></span>
                <input type="range" min="3" max="20" step="1" value={pacing} onChange={(e) => setPacing(Number(e.target.value))} />
              </label>
            </div>
          </section>

          {/* Sites */}
          <section className="pg-settings-section">
            <div className="pg-settings-label">
              <h3>Job sites</h3>
              <span>Selected by default when you click Run Penguin.</span>
            </div>
            <div className="pg-settings-control">
              <div className="pg-toggle-row" role="group" aria-label="Job sites">
                {PLATFORMS.map(p => (
                  <button key={p.key} type="button" className={`pg-chip ${platforms.includes(p.key) ? 'active' : ''}`} aria-pressed={platforms.includes(p.key)} onClick={() => toggle(platforms, setPlatforms, p.key)}>
                    {platforms.includes(p.key) && <Check size={12} />} {p.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {error && <p className="pg-modal-error">{error}</p>}

        <div className="pg-modal-foot">
          <div className="pg-settings-links">
            {onOpenProfile && <button type="button" className="pg-btn pg-btn-ghost" onClick={onOpenProfile}><User size={14} /> Resume &amp; answers</button>}
            {onOpenCdp && <button type="button" className="pg-btn pg-btn-ghost" onClick={onOpenCdp}><PlugZap size={14} /> Chrome</button>}
          </div>
          <div className="pg-modal-foot-right">
            <button type="button" className="pg-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="pg-btn pg-btn-primary" onClick={save}>Save settings</button>
          </div>
        </div>
      </div>
    </div>
  );
}
