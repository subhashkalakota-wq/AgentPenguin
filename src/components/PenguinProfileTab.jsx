import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles, Search, Plus, X, Check, ClipboardCheck, Loader2, AlertTriangle, RefreshCw, ExternalLink, Star, GitFork,
  Trophy, Code2, FolderGit2, Target, Play, BadgeCheck,
} from 'lucide-react';
import { SKILL_CATALOG, ALL_SKILLS, levelFromScore } from '../../shared/skillsCatalog';
import { PenguinTest } from './MocksTab';
import { Donut, Legend, BarList, Columns, TrendLine } from './charts';
import { authFetch } from '../lib/api';

const LEVEL_RANK = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 };
const SOURCE_LABEL = { test: 'Tested', coding: 'From coding profiles', resume: 'From resume', self: 'Added by you' };

async function post(path, body) {
  const res = await authFetch(path, { method: 'POST', body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
const friendly = (e) => (e.message === 'Failed to fetch' ? 'Backend is not running. Start it with: npm run server' : e.message);
const readLocal = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const writeLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
// Skills saved by older versions may be a comma list or { name } objects
const asSkillList = (v) => (Array.isArray(v) ? v.map(x => (typeof x === 'string' ? x : x?.name)).filter(Boolean)
  : typeof v === 'string' ? v.split(',').map(x => x.trim()).filter(Boolean) : []);
const sameSkill = (a, b) => a.toLowerCase().replace(/[^a-z0-9+#]/g, '') === b.toLowerCase().replace(/[^a-z0-9+#]/g, '');

function Tile({ label, value, sub }) {
  return (
    <div className="pg-stat pg-pp-tile">
      <span className="pg-stat-label">{label}</span>
      <span className="pg-stat-value">{value ?? '—'}</span>
      {sub && <span className="pg-stat-sub">{sub}</span>}
    </div>
  );
}

function LevelBadge({ info }) {
  if (!info?.level) return null;
  return (
    <span className={`pg-pp-level is-${info.level.toLowerCase()}`} title={`${SOURCE_LABEL[info.source] || ''}${info.score != null ? ` · ${info.score}%` : ''}${info.evidence ? ` · ${info.evidence}` : ''}`}>
      {info.source === 'test' && <BadgeCheck size={11} />}
      {info.level}{info.source === 'test' && info.score != null ? ` ${info.score}%` : ''}
    </span>
  );
}

// ---------------- Skills ----------------
function SkillsCard({ skills, levels, onChange, onTest, suggestions }) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState(SKILL_CATALOG[0].group);
  const q = query.trim().toLowerCase();
  const visible = q
    ? ALL_SKILLS.filter(s => s.toLowerCase().includes(q))
    : (SKILL_CATALOG.find(g => g.group === group)?.skills || []);
  const has = (s) => skills.some(x => sameSkill(x, s));
  const toggle = (s) => (has(s) ? onChange(skills.filter(x => !sameSkill(x, s))) : onChange([...skills, s], { [s]: { level: null, source: 'self' } }));
  const addCustom = () => { const v = query.trim(); if (v && !has(v)) onChange([...skills, v], { [v]: { level: null, source: 'self' } }); setQuery(''); };

  return (
    <section className="pg-card pg-pp-card">
      <div className="pg-mk-title"><Sparkles size={16} /><h3>Your skills</h3><span className="pg-mk-sub">{skills.length} selected</span></div>
      {skills.length === 0 && <p className="pg-mk-empty">Pick your skills below. Penguin suggests roles from them and answers application questions with them.</p>}
      <ul className="pg-pp-skills">
        {skills.map(s => {
          const info = levels[s];
          return (
            <li key={s}>
              <span className="pg-pp-skill-name">{s}</span>
              <LevelBadge info={info} />
              <button type="button" className="pg-pp-test" onClick={() => onTest(s)} title={`Take a ${s} test`}>
                <ClipboardCheck size={13} /> {info?.source === 'test' ? 'Retest' : 'Test'}
              </button>
              <button type="button" className="pg-pp-remove" onClick={() => toggle(s)} aria-label={`Remove ${s}`}><X size={13} /></button>
            </li>
          );
        })}
      </ul>

      {suggestions.length > 0 && (
        <div className="pg-pp-suggest">
          <span className="pg-auto-label">Suggested for you</span>
          <div className="pg-toggle-row">
            {suggestions.map(s => (
              <button key={s.skill} type="button" className="pg-chip" title={s.evidence || ''} onClick={() => onChange([...skills, s.skill], { [s.skill]: { level: s.level || null, source: s.source, evidence: s.evidence } })}>
                <Plus size={12} /> {s.skill}{s.level ? ` · ${s.level}` : ''}
              </button>
            ))}
            {suggestions.length > 1 && (
              <button type="button" className="pg-chip active" onClick={() => onChange([...skills, ...suggestions.map(s => s.skill)], Object.fromEntries(suggestions.map(s => [s.skill, { level: s.level || null, source: s.source, evidence: s.evidence }])))}>
                Add all
              </button>
            )}
          </div>
        </div>
      )}

      <div className="pg-pp-picker">
        <div className="pg-role-add">
          <div className="pg-role-input">
            <Search size={14} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} placeholder="Search skills, e.g. React, Excel, Sales" aria-label="Search skills" />
          </div>
          {q && !ALL_SKILLS.some(s => s.toLowerCase() === q) && <button type="button" className="pg-btn" onClick={addCustom}><Plus size={14} /> Add “{query.trim()}”</button>}
        </div>
        {!q && (
          <div className="pg-pp-groups" role="tablist" aria-label="Skill groups">
            {SKILL_CATALOG.map(g => (
              <button key={g.group} type="button" role="tab" aria-selected={group === g.group} className={group === g.group ? 'active' : ''} onClick={() => setGroup(g.group)}>{g.group}</button>
            ))}
          </div>
        )}
        <div className="pg-pp-catalog">
          {visible.map(s => (
            <button key={s} type="button" className={`pg-chip ${has(s) ? 'active' : ''}`} aria-pressed={has(s)} onClick={() => toggle(s)}>
              {has(s) ? <Check size={12} /> : <Plus size={12} />} {s}
            </button>
          ))}
          {q && visible.length === 0 && <span className="pg-mk-empty">Not in the list — press Enter to add it.</span>}
        </div>
      </div>
    </section>
  );
}

// ---------------- Coding profiles ----------------
const SITES = [
  ['leetcode', 'LeetCode', 'leetcode.com/u/username'],
  ['codeforces', 'Codeforces', 'codeforces.com/profile/handle'],
  ['codechef', 'CodeChef', 'codechef.com/users/handle'],
  ['github', 'GitHub', 'github.com/username'],
];

function LeetCodePanel({ lc }) {
  const seg = [
    { label: 'Easy', value: lc.solved.easy, color: 'var(--viz-seq-1)' },
    { label: 'Medium', value: lc.solved.medium, color: 'var(--viz-seq-2)' },
    { label: 'Hard', value: lc.solved.hard, color: 'var(--viz-seq-3)' },
  ];
  return (
    <section className="pg-card pg-pp-site">
      <div className="pg-mk-title"><Code2 size={16} /><h3>LeetCode</h3><a className="pg-mk-sub" href={lc.url} target="_blank" rel="noreferrer">@{lc.username} <ExternalLink size={11} /></a></div>
      <div className="pg-pp-donut-row">
        <Donut segments={seg} centerValue={lc.solved.all} centerLabel="solved" ariaLabel={`LeetCode problems solved: ${lc.solved.easy} easy, ${lc.solved.medium} medium, ${lc.solved.hard} hard`} />
        <div>
          <Legend items={seg} total={lc.solved.all} />
          <p className="pg-pp-note">Of {(lc.totals.easy + lc.totals.medium + lc.totals.hard).toLocaleString('en-IN')} problems on LeetCode</p>
        </div>
      </div>
      <div className="pg-pp-tiles">
        <Tile label="Contest rating" value={lc.contest?.rating} sub={lc.contest ? `${lc.contest.attended} contests · top ${lc.contest.topPercent}%` : 'No contests yet'} />
        <Tile label="Global ranking" value={lc.ranking?.toLocaleString('en-IN')} />
      </div>
      {lc.topics.length > 0 && (<><h4 className="pg-pp-h4">Problems solved by topic</h4><BarList items={lc.topics.slice(0, 10).map(t => ({ label: t.name, value: t.solved }))} ariaLabel="LeetCode problems solved by topic" /></>)}
      {lc.languages.length > 0 && <p className="pg-pp-note">Languages: {lc.languages.map(l => `${l.name} (${l.solved})`).join(', ')}</p>}
    </section>
  );
}

function CodeforcesPanel({ cf }) {
  return (
    <section className="pg-card pg-pp-site">
      <div className="pg-mk-title"><Trophy size={16} /><h3>Codeforces</h3><a className="pg-mk-sub" href={cf.url} target="_blank" rel="noreferrer">@{cf.handle} <ExternalLink size={11} /></a></div>
      <div className="pg-pp-tiles">
        <Tile label="Rating" value={cf.rating} sub={cf.rank} />
        <Tile label="Max rating" value={cf.maxRating} sub={cf.maxRank} />
        <Tile label="Problems solved" value={cf.solved?.toLocaleString('en-IN')} />
        <Tile label="Contests" value={cf.contests} />
      </div>
      {cf.ratingHistory?.length > 1 && (<><h4 className="pg-pp-h4">Rating over recent contests</h4><TrendLine points={cf.ratingHistory.map(r => ({ at: new Date(r.at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), value: r.rating }))} ariaLabel="Codeforces rating history" /></>)}
      {cf.byRating?.length > 0 && (<><h4 className="pg-pp-h4">Problems solved by difficulty rating</h4><Columns items={cf.byRating.map(r => ({ label: String(r.rating), value: r.solved }))} xLabel="Rating" ariaLabel="Codeforces problems solved by rating" /></>)}
      {cf.topics?.length > 0 && (<><h4 className="pg-pp-h4">Top tags</h4><BarList items={cf.topics.slice(0, 8).map(t => ({ label: t.name, value: t.solved }))} ariaLabel="Codeforces problems by tag" /></>)}
    </section>
  );
}

function CodeChefPanel({ cc }) {
  return (
    <section className="pg-card pg-pp-site">
      <div className="pg-mk-title"><Trophy size={16} /><h3>CodeChef</h3><a className="pg-mk-sub" href={cc.url} target="_blank" rel="noreferrer">@{cc.handle} <ExternalLink size={11} /></a></div>
      <div className="pg-pp-tiles">
        <Tile label="Rating" value={cc.rating} sub={cc.stars ? `${cc.stars}★` : null} />
        <Tile label="Highest rating" value={cc.highest} />
        <Tile label="Problems solved" value={cc.solved?.toLocaleString('en-IN')} />
        <Tile label="Contests" value={cc.contests} />
        <Tile label="Global rank" value={cc.globalRank?.toLocaleString('en-IN')} />
      </div>
    </section>
  );
}

const LANG_COLORS = ['var(--viz-cat-1)', 'var(--viz-cat-2)', 'var(--viz-cat-3)', 'var(--viz-cat-4)', 'var(--viz-cat-5)'];

function GitHubPanel({ gh }) {
  const seg = gh.languages.map((l, i) => ({ label: l.name, value: Math.round(l.share * 1000) / 10, color: l.name === 'Other' ? 'var(--viz-other)' : LANG_COLORS[i] }));
  return (
    <section className="pg-card pg-pp-site pg-pp-github">
      <div className="pg-mk-title"><FolderGit2 size={16} /><h3>GitHub</h3><a className="pg-mk-sub" href={gh.url} target="_blank" rel="noreferrer">@{gh.username} <ExternalLink size={11} /></a></div>
      <div className="pg-pp-tiles">
        <Tile label="Public repositories" value={gh.publicRepos?.toLocaleString('en-IN')} sub={`${gh.activeRepos90d} updated in the last 90 days`} />
        <Tile label="Stars earned" value={gh.stars?.toLocaleString('en-IN')} />
        <Tile label="Followers" value={gh.followers?.toLocaleString('en-IN')} />
      </div>
      {seg.length > 0 && (
        <div className="pg-pp-donut-row">
          <Donut segments={seg} centerValue={seg.length} centerLabel="languages" ariaLabel={`GitHub languages: ${seg.map(s => `${s.label} ${s.value}%`).join(', ')}`} />
          <div><h4 className="pg-pp-h4">Code by language</h4><Legend items={seg} unit="%" /></div>
        </div>
      )}
      {gh.insights && (
        <div className="pg-pp-insight">
          <p>{gh.insights.summary}</p>
          {gh.insights.suggestions?.length > 0 && (<><span className="pg-auto-label">Make it stronger</span><ul>{gh.insights.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul></>)}
        </div>
      )}
      {gh.repos.length > 0 && (
        <>
          <h4 className="pg-pp-h4">Top repositories</h4>
          <ul className="pg-pp-repos">
            {gh.repos.map(r => (
              <li key={r.url}>
                <a href={r.url} target="_blank" rel="noreferrer"><strong>{r.name}</strong></a>
                {r.description && <p>{r.description}</p>}
                <span>{r.language && <>{r.language} · </>}<Star size={11} /> {r.stars} · <GitFork size={11} /> {r.forks} · updated {new Date(r.pushedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

// ---------------- Roles ----------------
function RolesCard({ roles, city, myRoles, busy, error, onSuggest, onAdd, onRun, canSuggest }) {
  const mine = (t) => myRoles.some(r => r.toLowerCase() === t.toLowerCase());
  return (
    <section className="pg-card pg-pp-card">
      <div className="pg-mk-title"><Target size={16} /><h3>Roles that fit your skills</h3>
        <button type="button" className="pg-btn pg-pp-suggest-btn" onClick={onSuggest} disabled={busy || !canSuggest}>
          {busy ? <Loader2 size={14} className="pg-spin" /> : <Sparkles size={14} />} {roles?.length ? 'Suggest again' : 'Suggest roles'}
        </button>
      </div>
      <p className="pg-pp-note">Not sure what to apply for? Penguin suggests roles from your skills, test scores, resume and coding profiles. Add the ones you like — Penguin applies to them on your next run.</p>
      {error && <p className="pg-rq-message is-error"><AlertTriangle size={14} /> {error}</p>}
      {!canSuggest && <p className="pg-mk-empty">Add a few skills first.</p>}
      {roles?.length > 0 && (
        <ul className="pg-pp-roles">
          {roles.map(r => (
            <li key={r.title}>
              <div className="pg-pp-role-head">
                <strong>{r.title}</strong>
                {r.level && <span className="pg-mk-cat">{r.level}</span>}
                <span className="pg-pp-fit" title="How well your skills fit"><span style={{ width: `${r.fit}%` }} /></span>
                <span className="pg-pp-fit-num">{r.fit}% fit</span>
              </div>
              <p>{r.why}</p>
              <div className="pg-pp-role-skills">
                {r.matched.map(s => <span key={s} className="pg-pp-has"><Check size={11} /> {s}</span>)}
                {r.missing.map(s => <span key={s} className="pg-pp-gap">Learn: {s}</span>)}
              </div>
              <div className="pg-pp-role-foot">
                <span>{r.today ? <><strong>{r.today.label}</strong> new today</> : null}{r.week ? <> · <strong>{r.week.label}</strong> this week in {city}</> : null}</span>
                <a href={r.url} target="_blank" rel="noreferrer">See jobs <ExternalLink size={11} /></a>
                {mine(r.title)
                  ? <span className="pg-pp-added"><Check size={13} /> In your roles</span>
                  : <button type="button" className="pg-btn pg-btn-primary" onClick={() => onAdd(r.title)}><Plus size={13} /> Add to my roles</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {roles?.some(r => mine(r.title)) && onRun && (
        <div className="pg-pp-run"><span>Penguin will apply to your roles on the next run.</span><button type="button" className="pg-btn pg-btn-primary" onClick={onRun}><Play size={13} /> Run Penguin</button></div>
      )}
    </section>
  );
}

/**
 * Penguin Profile: skills (picked from a catalog, levels from skill tests and coding
 * profiles), LeetCode / Codeforces / CodeChef / GitHub analysis with charts, and role
 * suggestions the user can add to their search with one click.
 */
export default function PenguinProfileTab({ profile, onSaveProfile, config, onSaveConfig, currentUser, onRun }) {
  // Coding stats and role suggestions are kept in this browser (per user), not in the profile
  const STATS_KEY = `pg_coding_stats_${currentUser?.id || 'local'}`;
  const ROLES_KEY = `pg_role_suggestions_${currentUser?.id || 'local'}`;
  const [skills, setSkills] = useState(() => asSkillList(profile.skills));
  const [levels, setLevels] = useState(() => (profile.skillLevels && typeof profile.skillLevels === 'object' ? profile.skillLevels : {}));
  const [testing, setTesting] = useState(null);
  const [links, setLinks] = useState(() => ({ leetcode: '', codeforces: '', codechef: '', github: '', ...(profile.codingProfiles || {}) }));
  const [stats, setStats] = useState(() => readLocal(STATS_KEY));
  const [analysing, setAnalysing] = useState(false);
  const [codingError, setCodingError] = useState(null);
  const [roles, setRoles] = useState(() => readLocal(ROLES_KEY));
  const [suggesting, setSuggesting] = useState(false);
  const [rolesError, setRolesError] = useState(null);
  const saveTimer = useRef(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  // Save skill changes (debounced so quick picks are one save)
  const persist = (nextSkills, nextLevels) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onSaveProfile({ ...profileRef.current, skills: nextSkills, skillLevels: nextLevels });
    }, 700);
  };
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const changeSkills = (nextSkills, levelPatch = {}) => {
    const unique = nextSkills.filter((s, i) => nextSkills.findIndex(x => sameSkill(x, s)) === i);
    const nextLevels = { ...levels };
    for (const [k, v] of Object.entries(levelPatch)) {
      const cur = nextLevels[k];
      // A tested level is never overwritten by a guess
      if (cur?.source === 'test') continue;
      if (!cur || (v.level && (!cur.level || LEVEL_RANK[v.level] > LEVEL_RANK[cur.level]))) nextLevels[k] = v;
    }
    for (const k of Object.keys(nextLevels)) if (!unique.some(s => sameSkill(s, k))) delete nextLevels[k];
    setSkills(unique);
    setLevels(nextLevels);
    persist(unique, nextLevels);
  };

  const onTestDone = ({ pct }) => {
    const skill = testing;
    const nextLevels = { ...levels, [skill]: { level: levelFromScore(pct), score: pct, source: 'test', testedAt: new Date().toISOString() } };
    const nextSkills = skills.some(s => sameSkill(s, skill)) ? skills : [...skills, skill];
    setLevels(nextLevels);
    setSkills(nextSkills);
    persist(nextSkills, nextLevels);
  };

  const analyse = async (refresh = false) => {
    const filled = Object.fromEntries(Object.entries(links).filter(([, v]) => String(v).trim()));
    if (!Object.keys(filled).length) { setCodingError('Add at least one profile link or username.'); return; }
    setAnalysing(true);
    setCodingError(null);
    try {
      const r = await post('/api/coding/analyze', { links: filled, refresh });
      setStats(r);
      writeLocal(STATS_KEY, r);
      onSaveProfile({ ...profileRef.current, codingProfiles: filled });
      const errs = Object.entries(r.errors || {});
      if (errs.length) setCodingError(errs.map(([k, v]) => `${SITES.find(s => s[0] === k)?.[1]}: ${v}`).join(' · '));
    } catch (e) { setCodingError(friendly(e)); } finally { setAnalysing(false); }
  };

  // Analyse saved links once when the tab opens without results
  useEffect(() => {
    if (!stats && Object.values(profile.codingProfiles || {}).some(Boolean)) analyse(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suggestions = useMemo(() => {
    const fromCoding = (stats?.skills || []).map(s => ({ skill: s.skill, level: s.level, evidence: s.evidence, source: 'coding' }));
    const fromGitHub = (stats?.github?.insights?.skills || []).map(s => ({ skill: s, level: null, evidence: 'Seen in your GitHub repositories', source: 'coding' }));
    const fromResume = (profile.resumeAnalysis?.skills || []).map(s => ({ skill: s.name, level: s.years >= 3 ? 'Advanced' : s.years >= 1 ? 'Intermediate' : null, evidence: 'On your resume', source: 'resume' }));
    const out = [];
    for (const s of [...fromCoding, ...fromGitHub, ...fromResume]) {
      if (!s.skill || skills.some(x => sameSkill(x, s.skill)) || out.some(o => sameSkill(o.skill, s.skill))) continue;
      out.push(s);
    }
    return out.slice(0, 14);
  }, [stats, profile.resumeAnalysis, skills]);

  const myRoles = Array.isArray(config.searchQueries) && config.searchQueries.length ? config.searchQueries : [config.searchQuery].filter(Boolean);
  const city = (Array.isArray(config.locations) && config.locations[0]) || config.location || '';

  const suggestRoles = async () => {
    setSuggesting(true);
    setRolesError(null);
    try {
      const coding = stats ? {
        leetcode: stats.leetcode ? { solved: stats.leetcode.solved, contestRating: stats.leetcode.contest?.rating } : null,
        codeforces: stats.codeforces ? { rating: stats.codeforces.rating, solved: stats.codeforces.solved } : null,
        codechef: stats.codechef ? { rating: stats.codechef.rating, solved: stats.codechef.solved } : null,
        github: stats.github ? { languages: stats.github.languages, summary: stats.github.insights?.summary } : null,
      } : null;
      const r = await post('/api/career/suggest', { skills: skills.map(s => ({ name: s, level: levels[s]?.level || null, score: levels[s]?.score ?? null })), coding, location: city });
      const value = { city: r.city, roles: r.roles, at: new Date().toISOString() };
      setRoles(value);
      writeLocal(ROLES_KEY, value);
    } catch (e) { setRolesError(friendly(e)); } finally { setSuggesting(false); }
  };

  const addRole = (title) => {
    const next = { ...config, searchQueries: [...myRoles, title], searchQuery: myRoles[0] || title };
    onSaveConfig(next);
    post('/api/config', { config: next }).catch(() => {});
  };

  const tested = Object.values(levels).filter(l => l?.source === 'test').length;

  return (
    <div className="pg-pp">
      <div className="pg-pp-tiles pg-pp-summary">
        <Tile label="Skills" value={skills.length} sub={`${tested} verified by a test`} />
        <Tile label="LeetCode solved" value={stats?.leetcode?.solved.all} sub={stats?.leetcode ? `${stats.leetcode.solved.hard} hard` : 'Not connected'} />
        <Tile label="Codeforces rating" value={stats?.codeforces?.rating} sub={stats?.codeforces?.rank || 'Not connected'} />
        <Tile label="CodeChef rating" value={stats?.codechef?.rating} sub={stats?.codechef?.stars ? `${stats.codechef.stars}★` : 'Not connected'} />
        <Tile label="GitHub repos" value={stats?.github?.publicRepos?.toLocaleString('en-IN')} sub={stats?.github ? `${stats.github.stars.toLocaleString('en-IN')} stars` : 'Not connected'} />
      </div>

      <SkillsCard skills={skills} levels={levels} onChange={changeSkills} onTest={setTesting} suggestions={suggestions} />

      <RolesCard
        roles={roles?.roles}
        city={roles?.city || city}
        myRoles={myRoles}
        busy={suggesting}
        error={rolesError}
        onSuggest={suggestRoles}
        onAdd={addRole}
        onRun={onRun}
        canSuggest={skills.length > 0}
      />

      <section className="pg-card pg-pp-card">
        <div className="pg-mk-title"><Code2 size={16} /><h3>Coding profiles</h3>
          {stats?.fetchedAt && <span className="pg-mk-sub">Updated {new Date(stats.fetchedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>}
        </div>
        <p className="pg-pp-note">Paste your profile links or usernames. Penguin reads public data only and turns it into charts and skill levels.</p>
        <div className="pg-pp-links">
          {SITES.map(([key, label, ph]) => (
            <label key={key} className="pg-field">
              <span>{label}</span>
              <input className="pg-input" value={links[key]} onChange={(e) => setLinks(l => ({ ...l, [key]: e.target.value }))} placeholder={ph} />
            </label>
          ))}
        </div>
        <div className="pg-mock-answer-bar">
          {codingError && <span className="pg-rq-message is-error"><AlertTriangle size={14} /> {codingError}</span>}
          <button type="button" className="pg-btn pg-btn-primary" onClick={() => analyse(Boolean(stats))} disabled={analysing}>
            {analysing ? <Loader2 size={14} className="pg-spin" /> : stats ? <RefreshCw size={14} /> : <Sparkles size={14} />} {stats ? 'Refresh analysis' : 'Analyse my profiles'}
          </button>
        </div>
      </section>

      {stats && (
        <div className="pg-pp-sites">
          {stats.leetcode && <LeetCodePanel lc={stats.leetcode} />}
          {stats.codeforces && <CodeforcesPanel cf={stats.codeforces} />}
          {stats.codechef && <CodeChefPanel cc={stats.codechef} />}
          {stats.github && <GitHubPanel gh={stats.github} />}
        </div>
      )}

      {testing && (
        <div className="pg-modal-backdrop">
          <div className="pg-modal pg-pp-test-modal" role="dialog" aria-modal="true" aria-label={`${testing} test`}>
            <button type="button" className="pg-icon-btn pg-pp-test-close" onClick={() => setTesting(null)} aria-label="Close test"><X size={16} /></button>
            <PenguinTest key={testing} fixedTopic={testing} onComplete={onTestDone} onCancel={() => setTesting(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
