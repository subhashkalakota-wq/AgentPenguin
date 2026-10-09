import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles, Search, Plus, X, Check, ClipboardCheck, Loader2, AlertTriangle, RefreshCw, ExternalLink, Star, GitFork,
  Trophy, Code2, FolderGit2, Target, Play, BadgeCheck, ChevronDown, ChevronUp, BookOpen, Gauge, GraduationCap,
} from 'lucide-react';
import { SKILL_CATALOG, ALL_SKILLS, levelFromScore, ratingFromScore } from '../../shared/skillsCatalog';
import { learnLinksFor } from '../data/learningResources';
import { isCodingTopic, practiceLevel } from '../../shared/codingTopics';
import { estimateAbility, byDifficulty, overallAbility } from '../../shared/abilityScore';
import CodingPractice from './CodingPractice';
import { PenguinTest, Segmented } from './MocksTab';
import { Donut, Legend, BarList, Columns, TrendLine } from './charts';
import { authFetch } from '../lib/api';

const FOLD_KEY = 'pg_pp_collapsed';
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

// Which boxes are hidden ({ id: true }), shared by every Box on the page
const FoldContext = createContext({ closed: () => false, toggle: () => {} });

/**
 * A Penguin Profile card with the same arrow + Hide / Show button as the Job market box.
 * `actions` stay in the title row when hidden; `openActions` only show when open.
 */
function Box({ id, icon: Icon, title, actions, openActions, className = 'pg-pp-card', children }) {
  const fold = useContext(FoldContext);
  const closed = fold.closed(id);
  return (
    <section className={`pg-card ${className} ${closed ? 'is-collapsed' : ''}`}>
      <div className="pg-mk-title pg-pp-head">
        <Icon size={16} /><h3>{title}</h3>
        <div className="pg-pp-head-actions">
          {actions}
          {!closed && openActions}
          <button type="button" className="pg-btn pg-pp-toggle" onClick={() => fold.toggle(id)} aria-expanded={!closed} aria-controls={`pp-box-${id}`} aria-label={`${closed ? 'Show' : 'Hide'} ${title}`}>
            {closed ? <><ChevronDown size={14} /> Show</> : <><ChevronUp size={14} /> Hide</>}
          </button>
        </div>
      </div>
      {!closed && <div id={`pp-box-${id}`}>{children}</div>}
    </section>
  );
}

// ---------------- Skills ----------------
function SkillsCard({ skills, levels, onChange, onTest, onTestAll, suggestions }) {
  const [tab, setTab] = useState('mine');
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState(SKILL_CATALOG[0].group);
  const q = query.trim().toLowerCase();
  const visible = q
    ? ALL_SKILLS.filter(s => s.toLowerCase().includes(q))
    : (SKILL_CATALOG.find(g => g.group === group)?.skills || []);
  const has = (s) => skills.some(x => sameSkill(x, s));
  const toggle = (s) => (has(s) ? onChange(skills.filter(x => !sameSkill(x, s))) : onChange([...skills, s], { [s]: { level: null, source: 'self' } }));
  const addCustom = () => { const v = query.trim(); if (v && !has(v)) onChange([...skills, v], { [v]: { level: null, source: 'self' } }); setQuery(''); };
  const addSuggestion = (s) => onChange([...skills, s.skill], { [s.skill]: { level: s.level || null, source: s.source, evidence: s.evidence } });
  const untested = skills.filter(s => levels[s]?.source !== 'test');

  return (
    <Box id="skills" icon={Sparkles} title="Your skills" actions={<span className="pg-mk-sub">{skills.length} selected</span>}>
      <div className="pg-pp-tabs" role="tablist" aria-label="Skills">
        <button type="button" role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
          Your skills <span>{skills.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'suggested'} className={tab === 'suggested' ? 'active' : ''} onClick={() => setTab('suggested')}>
          Suggested for you <span>{suggestions.length}</span>
        </button>
      </div>

      {tab === 'suggested' ? (
        <div className="pg-pp-suggest" role="tabpanel">
          {suggestions.length === 0 ? (
            <p className="pg-mk-empty">No suggestions yet. Upload your resume in Profile, or analyse your coding profiles in Penguin Profile, and Penguin suggests skills from them.</p>
          ) : (
            <>
              <div className="pg-pp-suggest-head">
                <p className="pg-pp-note">From your resume and coding profiles. Add the ones you have, then test them.</p>
                {suggestions.length > 1 && (
                  <button type="button" className="pg-btn" onClick={() => onChange([...skills, ...suggestions.map(s => s.skill)], Object.fromEntries(suggestions.map(s => [s.skill, { level: s.level || null, source: s.source, evidence: s.evidence }])))}>
                    <Plus size={13} /> Add all
                  </button>
                )}
              </div>
              <ul className="pg-pp-suggest-list">
                {suggestions.map(s => (
                  <li key={s.skill}>
                    <strong>{s.skill}</strong>
                    {s.level && <span className={`pg-pp-level is-${s.level.toLowerCase()}`}>{s.level}</span>}
                    <span className="pg-pp-evidence">{s.evidence}</span>
                    <button type="button" className="pg-pp-test" onClick={() => addSuggestion(s)}><Plus size={13} /> Add</button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        <div role="tabpanel">
          {skills.length === 0 && <p className="pg-mk-empty">Pick your skills below, then take one test on them. Penguin scores each skill and suggests roles from how you did.</p>}
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

          {skills.length > 0 && (
            <div className="pg-pp-testcta">
              <span>
                {untested.length
                  ? <><strong>{untested.length} of {skills.length}</strong> skill{skills.length === 1 ? '' : 's'} not tested yet. Take one test on them to see how you rate.</>
                  : 'All your skills are tested. Retake the test any time to update your scores.'}
              </span>
              <button type="button" className="pg-btn pg-btn-primary" onClick={onTestAll}><ClipboardCheck size={14} /> Test my skills</button>
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
        </div>
      )}
    </Box>
  );
}

// ---------------- Skill test (several skills in one test) ----------------
const TEST_MAX_SKILLS = 10;

function SkillAssessment({ skills, levels, onDone, onClose }) {
  const untested = skills.filter(s => levels[s]?.source !== 'test');
  const [picked, setPicked] = useState(() => (untested.length ? untested : skills).slice(0, TEST_MAX_SKILLS));
  const [level, setLevel] = useState('mixed');
  const [perSkill, setPerSkill] = useState(5);
  const [progress, setProgress] = useState(null); // { skill: 'writing' | 'ready' | 'failed' }
  const [test, setTest] = useState(null);
  const [error, setError] = useState(null);
  const total = picked.length * perSkill;
  const toggle = (s) => setPicked(p => (p.includes(s) ? p.filter(x => x !== s) : p.length >= TEST_MAX_SKILLS ? p : [...p, s]));

  // Questions for each skill are written separately (3 at a time) so progress shows per skill
  const start = async () => {
    setError(null);
    setProgress(Object.fromEntries(picked.map(s => [s, 'writing'])));
    const bySkill = {};
    let lastError = null;
    const queue = [...picked];
    const worker = async () => {
      while (queue.length) {
        const skill = queue.shift();
        for (let attempt = 0; attempt < 2 && !bySkill[skill]; attempt++) {
          try { bySkill[skill] = (await post('/api/mock/test', { topic: skill, level, count: perSkill })).questions; } catch (e) { lastError = e; }
        }
        setProgress(p => ({ ...p, [skill]: bySkill[skill] ? 'ready' : 'failed' }));
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    const ready = picked.filter(s => bySkill[s]?.length);
    if (!ready.length) {
      setError(lastError ? friendly(lastError) : "The AI couldn't write questions right now. Try again in a minute.");
      setProgress(null);
      return;
    }
    setTest({
      topic: ready.length === 1 ? ready[0] : `Skill test · ${ready.length} skills`,
      level,
      questions: ready.flatMap(s => bySkill[s].slice(0, perSkill).map(q => ({ ...q, skill: s }))),
      skipped: picked.filter(s => !bySkill[s]?.length),
    });
  };

  if (test) {
    return (
      <>
        {test.skipped.length > 0 && <p className="pg-rq-message is-error pg-pp-skipped"><AlertTriangle size={14} /> Couldn't write questions for {test.skipped.join(', ')}, so {test.skipped.length === 1 ? "it's" : "they're"} left out of this test.</p>}
        <PenguinTest initialTest={test} doneHint="Your skill report and role suggestions are updated in your Penguin Profile." onComplete={onDone} onCancel={onClose} />
      </>
    );
  }

  const ready = progress ? Object.values(progress).filter(v => v !== 'writing').length : 0;
  return (
    <section className="pg-mock-card pg-skilltest-setup">
      <h2 className="pg-mock-h">Test my skills</h2>
      <p className="pg-mock-sub">One timed test on the skills you pick, one minute per question. Penguin scores each skill (taking question difficulty into account), rates you from Poor to Excellent, shows where to learn what you missed, and suggests roles from how you did.</p>
      <div className="pg-mock-setup">
        <div className="pg-mock-row pg-pp-pick-row">
          <span>Skills</span>
          <div className="pg-toggle-row">
            {skills.map(s => (
              <button key={s} type="button" className={`pg-chip ${picked.includes(s) ? 'active' : ''}`} aria-pressed={picked.includes(s)} onClick={() => toggle(s)} disabled={Boolean(progress)}>
                {picked.includes(s) ? <Check size={12} /> : <Plus size={12} />} {s}
              </button>
            ))}
          </div>
        </div>
        <div className="pg-mock-row"><span>Difficulty</span><Segmented value={level} onChange={setLevel} options={[['mixed', 'Mixed (recommended)'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']]} label="Difficulty" /></div>
        <div className="pg-mock-row"><span>Per skill</span><Segmented value={String(perSkill)} onChange={(v) => setPerSkill(Number(v))} options={[['3', '3 questions'], ['5', '5 questions'], ['8', '8 questions']]} label="Questions per skill" /></div>
      </div>
      {skills.length > TEST_MAX_SKILLS && <p className="pg-auto-small">Up to {TEST_MAX_SKILLS} skills per test. Take another test for the rest.</p>}
      {progress && (
        <div className="pg-pp-writing" role="status">
          <span className="pg-auto-label">Writing your questions · {ready} of {picked.length} skills ready</span>
          <ul>
            {picked.map(s => (
              <li key={s} className={`is-${progress[s]}`}>
                {progress[s] === 'writing' ? <Loader2 size={13} className="pg-spin" /> : progress[s] === 'ready' ? <Check size={13} /> : <AlertTriangle size={13} />} {s}
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="pg-rq-message is-error"><AlertTriangle size={14} /> {error}</p>}
      <div className="pg-mock-answer-bar">
        <button type="button" className="pg-btn" onClick={onClose}>Cancel</button>
        <button type="button" className="pg-btn pg-btn-primary" onClick={start} disabled={!picked.length || Boolean(progress)}>
          {progress ? <><Loader2 size={15} className="pg-spin" /> Writing your test…</> : <><ClipboardCheck size={15} /> Start {total}-question test · {total} min</>}
        </button>
      </div>
    </section>
  );
}

// ---------------- Skill report ----------------
const RATING_LINE = {
  excellent: (s) => `You're excellent at ${s}.`,
  strong: (s) => `You're very good at ${s}.`,
  good: (s) => `You're good at ${s}. A little more practice makes it a strength.`,
  average: (s) => `You're average at ${s}. Learn the gaps below, then retest.`,
  poor: (s) => `You're poor at ${s} right now. Start with the basics below, then retest.`,
};
const listOf = (a) => (a.length <= 2 ? a.join(' and ') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
// "3 of 5 right (easy 2/2 · medium 1/2 · hard 0/1)"
const breakdown = (t) => {
  if (!t.total) return '';
  const parts = ['easy', 'medium', 'hard'].filter(d => t.byDifficulty?.[d]).map(d => `${d} ${t.byDifficulty[d].correct}/${t.byDifficulty[d].total}`);
  return ` ${t.correct} of ${t.total} right${parts.length > 1 ? ` (${parts.join(' · ')})` : ''}.`;
};

function LearnLinks({ skill, onOpenVisoDsa }) {
  const { viso, links } = learnLinksFor(skill);
  return (
    <div className="pg-pp-learn">
      <span className="pg-pp-learn-label"><BookOpen size={13} /> Learn {skill}</span>
      {viso && (onOpenVisoDsa
        ? <button type="button" className="pg-btn pg-btn-primary" onClick={onOpenVisoDsa}><GraduationCap size={13} /> Learn on Viso DSA</button>
        : <a className="pg-btn pg-btn-primary" href="/viso-dsa"><GraduationCap size={13} /> Learn on Viso DSA</a>)}
      {links.map(l => <a key={l.url} className="pg-chip" href={l.url} target="_blank" rel="noreferrer">{l.name} <ExternalLink size={11} /></a>)}
    </div>
  );
}

function skillScores(skills, levels) {
  const tested = skills
    .filter(s => levels[s]?.source === 'test' && levels[s].score != null)
    .map(s => ({ skill: s, ...levels[s], rating: ratingFromScore(levels[s].score) }))
    .sort((a, b) => b.score - a.score);
  // Overall: inverse-variance weighted mean of ability, so precisely measured skills count more
  const overall = tested.length ? overallAbility(tested) : null;
  return { tested, overall, rating: overall == null ? null : ratingFromScore(overall) };
}

function SkillReport({ skills, levels, onTestAll, onTestOne, onOpenVisoDsa }) {
  const { tested, overall, rating } = skillScores(skills, levels);
  const untested = skills.filter(s => levels[s]?.source !== 'test');
  const [practice, setPractice] = useState({}); // which skills show coding problems
  const strong = tested.filter(t => t.score >= 70).map(t => t.skill);
  const weak = tested.filter(t => t.score < 55).map(t => t.skill);

  return (
    <Box
      id="report"
      icon={Gauge}
      title="Skill report"
      openActions={tested.length > 0 && <button type="button" className="pg-btn" onClick={onTestAll}><RefreshCw size={13} /> Retake test</button>}
    >
      {tested.length === 0 ? (
        <div className="pg-pp-report-empty">
          <p>See how good you really are. Take one test on your skills: Penguin scores each one, rates you from <strong>Poor</strong> to <strong>Excellent</strong>, shows where to learn what you missed, and suggests roles from how you did.</p>
          <button type="button" className="pg-btn pg-btn-primary" onClick={onTestAll} disabled={!skills.length}><ClipboardCheck size={14} /> {skills.length ? `Test my ${skills.length} skill${skills.length === 1 ? '' : 's'}` : 'Add skills first'}</button>
        </div>
      ) : (
        <>
          <div className={`pg-pp-overall is-${rating.tone}`}>
            <div className="pg-pp-overall-score"><strong>{overall}%</strong><span>overall</span></div>
            <div>
              <span className={`pg-pp-rating is-${rating.tone}`}>{rating.label}</span>
              <p>
                Overall, you're {rating.label.toLowerCase()}.
                {strong.length > 0 && <> You're strongest at {listOf(strong)}.</>}
                {weak.length > 0 && <> {listOf(weak)} need{weak.length === 1 ? 's' : ''} work.</>}
              </p>
              <span className="pg-pp-note">Based on {tested.length} tested skill{tested.length === 1 ? '' : 's'}. Scores use Item Response Theory: the same number right on harder questions scores higher, and more precisely measured skills weigh more in the overall.</span>
            </div>
          </div>
          <ul className="pg-pp-report">
            {tested.map(t => (
              <li key={t.skill}>
                <div className="pg-pp-rep-row">
                  <strong className="pg-pp-rep-skill">{t.skill}</strong>
                  <span className="pg-pp-rep-bar" aria-hidden="true"><span style={{ width: `${Math.max(2, t.score)}%` }} /></span>
                  <span className="pg-pp-rep-pct">{t.score}%</span>
                  <span className={`pg-pp-rating is-${t.rating.tone}`}>{t.rating.label}</span>
                  <button type="button" className="pg-pp-test" onClick={() => onTestOne(t.skill)}><ClipboardCheck size={13} /> Retest</button>
                </div>
                <p className="pg-pp-rep-msg">
                  {RATING_LINE[t.rating.tone](t.skill)}
                  {breakdown(t)}
                  {t.low != null && <span className="pg-pp-range" title="Likely range of your score (±1 standard error). More questions make it narrower."> Likely {t.low}–{t.high} · {t.confidence} confidence{t.confidence === 'Low' ? ', retest with more questions' : ''}.</span>}
                  {isCodingTopic(t.skill) && (
                    <button type="button" className="pg-pp-linkbtn" aria-expanded={Boolean(practice[t.skill])} onClick={() => setPractice(p => ({ ...p, [t.skill]: !p[t.skill] }))}>
                      <Code2 size={13} /> {practice[t.skill] ? 'Hide coding problems' : 'Coding problems on LeetCode, CodeChef & Codeforces'}
                    </button>
                  )}
                </p>
                {t.score < 70 && <LearnLinks skill={t.skill} onOpenVisoDsa={onOpenVisoDsa} />}
                {practice[t.skill] && <CodingPractice topic={t.skill} level={practiceLevel(t.score)} />}
              </li>
            ))}
          </ul>
          {untested.length > 0 && (
            <div className="pg-pp-testcta">
              <span>Not tested yet: <strong>{listOf(untested)}</strong></span>
              <button type="button" className="pg-btn" onClick={onTestAll}><ClipboardCheck size={14} /> Test {untested.length === 1 ? 'it' : 'these'}</button>
            </div>
          )}
        </>
      )}
    </Box>
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
    <Box id="leetcode" className="pg-pp-site" icon={Code2} title="LeetCode" actions={<a className="pg-mk-sub" href={lc.url} target="_blank" rel="noreferrer">@{lc.username} <ExternalLink size={11} /></a>}>
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
    </Box>
  );
}

function CodeforcesPanel({ cf }) {
  return (
    <Box id="codeforces" className="pg-pp-site" icon={Trophy} title="Codeforces" actions={<a className="pg-mk-sub" href={cf.url} target="_blank" rel="noreferrer">@{cf.handle} <ExternalLink size={11} /></a>}>
      <div className="pg-pp-tiles">
        <Tile label="Rating" value={cf.rating} sub={cf.rank} />
        <Tile label="Max rating" value={cf.maxRating} sub={cf.maxRank} />
        <Tile label="Problems solved" value={cf.solved?.toLocaleString('en-IN')} />
        <Tile label="Contests" value={cf.contests} />
      </div>
      {cf.ratingHistory?.length > 1 && (<><h4 className="pg-pp-h4">Rating over recent contests</h4><TrendLine points={cf.ratingHistory.map(r => ({ at: new Date(r.at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), value: r.rating }))} ariaLabel="Codeforces rating history" /></>)}
      {cf.byRating?.length > 0 && (<><h4 className="pg-pp-h4">Problems solved by difficulty rating</h4><Columns items={cf.byRating.map(r => ({ label: String(r.rating), value: r.solved }))} xLabel="Rating" ariaLabel="Codeforces problems solved by rating" /></>)}
      {cf.topics?.length > 0 && (<><h4 className="pg-pp-h4">Top tags</h4><BarList items={cf.topics.slice(0, 8).map(t => ({ label: t.name, value: t.solved }))} ariaLabel="Codeforces problems by tag" /></>)}
    </Box>
  );
}

function CodeChefPanel({ cc }) {
  return (
    <Box id="codechef" className="pg-pp-site" icon={Trophy} title="CodeChef" actions={<a className="pg-mk-sub" href={cc.url} target="_blank" rel="noreferrer">@{cc.handle} <ExternalLink size={11} /></a>}>
      <div className="pg-pp-tiles">
        <Tile label="Rating" value={cc.rating} sub={cc.stars ? `${cc.stars}★` : null} />
        <Tile label="Highest rating" value={cc.highest} />
        <Tile label="Problems solved" value={cc.solved?.toLocaleString('en-IN')} />
        <Tile label="Contests" value={cc.contests} />
        <Tile label="Global rank" value={cc.globalRank?.toLocaleString('en-IN')} />
      </div>
    </Box>
  );
}

const LANG_COLORS = ['var(--viz-cat-1)', 'var(--viz-cat-2)', 'var(--viz-cat-3)', 'var(--viz-cat-4)', 'var(--viz-cat-5)'];

function GitHubPanel({ gh }) {
  const seg = gh.languages.map((l, i) => ({ label: l.name, value: Math.round(l.share * 1000) / 10, color: l.name === 'Other' ? 'var(--viz-other)' : LANG_COLORS[i] }));
  return (
    <Box id="github" className="pg-pp-site pg-pp-github" icon={FolderGit2} title="GitHub" actions={<a className="pg-mk-sub" href={gh.url} target="_blank" rel="noreferrer">@{gh.username} <ExternalLink size={11} /></a>}>
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
    </Box>
  );
}

// ---------------- Roles ----------------
function RolesCard({ roles, learnNext, city, myRoles, busy, error, onSuggest, onAdd, onRun, onTestOne, canSuggest, hasTested, stale, onTestAll }) {
  const mine = (t) => myRoles.some(r => r.toLowerCase() === t.toLowerCase());
  return (
    <Box
      id="roles"
      icon={Target}
      title="Roles that fit your skills"
      openActions={(hasTested || roles?.length > 0) && (
        <button type="button" className="pg-btn" onClick={onSuggest} disabled={busy || !canSuggest}>
          {busy ? <Loader2 size={14} className="pg-spin" /> : <Sparkles size={14} />} {roles?.length ? 'Suggest again' : 'Suggest roles'}
        </button>
      )}
    >
      <p className="pg-pp-note">
        {hasTested
          ? 'Ranked by how well your skills cover each role\'s core skills (tested skills count at their score), plus live demand in your city. Add the roles you like — Penguin applies to them on your next run.'
          : 'Not sure what to apply for? Penguin suggests roles from how you do on the skill test, plus your resume and coding profiles.'}
      </p>
      {!hasTested && canSuggest && !roles?.length && (
        <div className="pg-pp-testcta">
          <span>Take the skill test first so the roles match how you actually did.</span>
          <span className="pg-pp-cta-btns">
            <button type="button" className="pg-btn pg-btn-ghost" onClick={onSuggest} disabled={busy}>{busy ? <Loader2 size={13} className="pg-spin" /> : null} Suggest without a test</button>
            <button type="button" className="pg-btn pg-btn-primary" onClick={onTestAll}><ClipboardCheck size={14} /> Test my skills</button>
          </span>
        </div>
      )}
      {stale && !busy && <p className="pg-rq-message is-ok pg-pp-stale"><RefreshCw size={14} /> Your test scores changed since these suggestions. Click <strong>Suggest again</strong> to update them.</p>}
      {busy && <p className="pg-pp-note"><Loader2 size={13} className="pg-spin" /> Finding roles that fit your results…</p>}
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
                {r.matched.map(m => {
                  const name = typeof m === 'string' ? m : m.name;
                  return <span key={name} className="pg-pp-has"><Check size={11} /> {name}{m.pct != null ? ` ${m.pct}%` : ''}</span>;
                })}
                {r.missing.map(g => {
                  const name = typeof g === 'string' ? g : g.name;
                  return g.untested
                    ? <button key={name} type="button" className="pg-pp-gap is-test" onClick={() => onTestOne(name)} title={`You listed ${name} but haven't tested it`}><ClipboardCheck size={11} /> Test: {name}</button>
                    : <span key={name} className="pg-pp-gap">Learn: {name}</span>;
                })}
              </div>
              {r.gain && <p className="pg-pp-gain">{r.gain.untested ? 'Testing' : 'Learning'} <strong>{r.gain.skill}</strong>{r.gain.untested ? ' (and scoring 70%+)' : ' to 70%'} would raise your fit to <strong>{r.gain.to}%</strong>.</p>}
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
      {roles?.length > 0 && learnNext?.length > 0 && (
        <div className="pg-pp-learnnext">
          <span className="pg-auto-label">Learn next for these roles</span>
          <ul>
            {learnNext.map(l => (
              <li key={l.skill}><strong>{l.skill}</strong> · +{l.points} fit points across {l.roles} role{l.roles === 1 ? '' : 's'}{l.untested ? ' · listed, not tested yet' : ''}</li>
            ))}
          </ul>
        </div>
      )}
      {roles?.some(r => mine(r.title)) && onRun && (
        <div className="pg-pp-run"><span>Penguin will apply to your roles on the next run.</span><button type="button" className="pg-btn pg-btn-primary" onClick={onRun}><Play size={13} /> Run Penguin</button></div>
      )}
    </Box>
  );
}

/**
 * Two sidebar sections share this component and its state:
 * - Penguin Profile (section="profile"): at a glance, and LeetCode / Codeforces / CodeChef /
 *   GitHub analysis with charts.
 * - Skill Test (section="skills"): skills (picked from a catalog or suggested), one test on
 *   them, the skill report with ratings and learning links, and roles from the results.
 */
export default function PenguinProfileTab({ section = 'profile', profile, onSaveProfile, config, onSaveConfig, currentUser, onRun, onOpenVisoDsa, onOpenSection }) {
  // Coding stats and role suggestions are kept in this browser (per user), not in the profile
  const STATS_KEY = `pg_coding_stats_${currentUser?.id || 'local'}`;
  const ROLES_KEY = `pg_role_suggestions_${currentUser?.id || 'local'}`;
  const [skills, setSkills] = useState(() => asSkillList(profile.skills));
  const [levels, setLevels] = useState(() => (profile.skillLevels && typeof profile.skillLevels === 'object' ? profile.skillLevels : {}));
  const [testing, setTesting] = useState(null);
  const [assessing, setAssessing] = useState(false);
  const [links, setLinks] = useState(() => ({ leetcode: '', codeforces: '', codechef: '', github: '', ...(profile.codingProfiles || {}) }));
  const [stats, setStats] = useState(() => readLocal(STATS_KEY));
  const [analysing, setAnalysing] = useState(false);
  const [codingError, setCodingError] = useState(null);
  const [roles, setRoles] = useState(() => readLocal(ROLES_KEY));
  const [suggesting, setSuggesting] = useState(false);
  const [rolesError, setRolesError] = useState(null);
  const [folded, setFolded] = useState(() => readLocal(FOLD_KEY) || {});
  const fold = useMemo(() => ({
    closed: (id) => Boolean(folded[id]),
    toggle: (id) => setFolded(f => { const next = { ...f, [id]: !f[id] }; writeLocal(FOLD_KEY, next); return next; }),
  }), [folded]);
  const saveTimer = useRef(null);
  const pendingSave = useRef(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const saveRef = useRef(onSaveProfile);
  saveRef.current = onSaveProfile;

  // Save skill changes (debounced so quick picks are one save); a pending save is
  // written straight away when the user leaves the section
  const flushSave = () => {
    if (!pendingSave.current) return;
    const patch = pendingSave.current;
    pendingSave.current = null;
    saveRef.current({ ...profileRef.current, ...patch });
  };
  const persist = (nextSkills, nextLevels) => {
    pendingSave.current = { skills: nextSkills, skillLevels: nextLevels };
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 700);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => { clearTimeout(saveTimer.current); flushSave(); }, []);
  // Follow skill changes saved elsewhere (the other section, the Profile tab) unless a
  // change made here is still waiting to be saved
  useEffect(() => {
    if (pendingSave.current) return;
    setSkills(asSkillList(profile.skills));
    setLevels(profile.skillLevels && typeof profile.skillLevels === 'object' ? profile.skillLevels : {});
  }, [profile.skills, profile.skillLevels]);

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

  // A skill's result from its answers: ability score from Item Response Theory (shared/abilityScore.js)
  const tested = (responses, at) => {
    const a = estimateAbility(responses);
    return {
      level: levelFromScore(a.score), score: a.score, low: a.low, high: a.high, confidence: a.confidence, theta: a.theta, se: a.se,
      correct: responses.filter(r => r.correct).length, total: responses.length, byDifficulty: byDifficulty(responses),
      source: 'test', testedAt: at, method: 'irt',
    };
  };
  const responsesOf = (questions, answers, level) => questions.map((q, i) => ({ skill: q.skill, correct: answers[i] === q.answer, difficulty: q.difficulty || (level === 'mixed' ? 'medium' : level) || 'medium' }));

  const onTestDone = ({ questions, answers, level: testLevel }) => {
    const skill = testing;
    const nextLevels = { ...levels, [skill]: tested(responsesOf(questions, answers, testLevel), new Date().toISOString()) };
    const nextSkills = skills.some(s => sameSkill(s, skill)) ? skills : [...skills, skill];
    setLevels(nextLevels);
    setSkills(nextSkills);
    persist(nextSkills, nextLevels);
  };

  // Multi-skill test: score each skill from its own questions, then suggest roles from the result
  const onAssessmentDone = ({ questions, answers, level: testLevel }) => {
    const per = {};
    for (const r of responsesOf(questions, answers, testLevel)) (per[r.skill] ||= []).push(r);
    const at = new Date().toISOString();
    const nextLevels = { ...levels };
    for (const [skill, responses] of Object.entries(per)) nextLevels[skill] = tested(responses, at);
    setLevels(nextLevels);
    persist(skills, nextLevels);
    suggestRoles(nextLevels);
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
    if (section === 'profile' && !stats && Object.values(profile.codingProfiles || {}).some(Boolean)) analyse(false);
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

  const suggestRoles = async (lv = levels) => {
    setSuggesting(true);
    setRolesError(null);
    try {
      const coding = stats ? {
        leetcode: stats.leetcode ? { solved: stats.leetcode.solved, contestRating: stats.leetcode.contest?.rating } : null,
        codeforces: stats.codeforces ? { rating: stats.codeforces.rating, solved: stats.codeforces.solved } : null,
        codechef: stats.codechef ? { rating: stats.codechef.rating, solved: stats.codechef.solved } : null,
        github: stats.github ? { languages: stats.github.languages, summary: stats.github.insights?.summary } : null,
      } : null;
      const r = await post('/api/career/suggest', { skills: skills.map(s => ({ name: s, level: lv[s]?.level || null, score: lv[s]?.source === 'test' ? lv[s].score : null })), coding, location: city });
      const value = { city: r.city, roles: r.roles, learnNext: r.learnNext || [], at: new Date().toISOString() };
      setRoles(value);
      writeLocal(ROLES_KEY, value);
    } catch (e) { setRolesError(friendly(e)); } finally { setSuggesting(false); }
  };

  const addRole = (title) => {
    const next = { ...config, searchQueries: [...myRoles, title], searchQuery: myRoles[0] || title };
    onSaveConfig(next);
    post('/api/config', { config: next }).catch(() => {});
  };

  const report = skillScores(skills, levels);
  const lastTestAt = report.tested.reduce((m, t) => (t.testedAt > m ? t.testedAt : m), '');

  return (
    <FoldContext.Provider value={fold}>
    <div className="pg-pp">
      {section === 'profile' && (
      <>
      <Box
        id="summary"
        className="pg-pp-site pg-pp-overview"
        icon={BadgeCheck}
        title="At a glance"
        openActions={onOpenSection && <button type="button" className="pg-btn" onClick={() => onOpenSection('skills')}><ClipboardCheck size={13} /> Open Skill Test</button>}
      >
      <div className="pg-pp-tiles pg-pp-summary">
        <Tile label="Skills" value={skills.length} sub={`${report.tested.length} verified by a test`} />
        <Tile label="Skill test" value={report.overall == null ? null : `${report.overall}%`} sub={report.rating?.label || 'Not taken yet'} />
        <Tile label="LeetCode solved" value={stats?.leetcode?.solved.all} sub={stats?.leetcode ? `${stats.leetcode.solved.hard} hard` : 'Not connected'} />
        <Tile label="Codeforces rating" value={stats?.codeforces?.rating} sub={stats?.codeforces?.rank || 'Not connected'} />
        <Tile label="CodeChef rating" value={stats?.codechef?.rating} sub={stats?.codechef?.stars ? `${stats.codechef.stars}★` : 'Not connected'} />
        <Tile label="GitHub repos" value={stats?.github?.publicRepos?.toLocaleString('en-IN')} sub={stats?.github ? `${stats.github.stars.toLocaleString('en-IN')} stars` : 'Not connected'} />
      </div>
      </Box>
      </>
      )}

      {section === 'skills' && (
      <>
      <SkillsCard skills={skills} levels={levels} onChange={changeSkills} onTest={setTesting} onTestAll={() => setAssessing(true)} suggestions={suggestions} />

      <SkillReport skills={skills} levels={levels} onTestAll={() => setAssessing(true)} onTestOne={setTesting} onOpenVisoDsa={onOpenVisoDsa} />

      <RolesCard
        roles={roles?.roles}
        learnNext={roles?.learnNext}
        onTestOne={setTesting}
        city={roles?.city || city}
        myRoles={myRoles}
        busy={suggesting}
        error={rolesError}
        onSuggest={() => suggestRoles()}
        onAdd={addRole}
        onRun={onRun}
        canSuggest={skills.length > 0}
        hasTested={report.tested.length > 0}
        stale={Boolean(roles?.at && lastTestAt && lastTestAt > roles.at)}
        onTestAll={() => setAssessing(true)}
      />
      </>
      )}

      {section === 'profile' && (
      <>
      <Box
        id="coding"
        icon={Code2}
        title="Coding profiles"
        actions={stats?.fetchedAt && <span className="pg-mk-sub">Updated {new Date(stats.fetchedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>}
      >
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
      </Box>

      {stats && (
        <div className="pg-pp-sites">
          {stats.leetcode && <LeetCodePanel lc={stats.leetcode} />}
          {stats.codeforces && <CodeforcesPanel cf={stats.codeforces} />}
          {stats.codechef && <CodeChefPanel cc={stats.codechef} />}
          {stats.github && <GitHubPanel gh={stats.github} />}
        </div>
      )}
      </>
      )}

      {testing && (
        <div className="pg-modal-backdrop">
          <div className="pg-modal pg-pp-test-modal" role="dialog" aria-modal="true" aria-label={`${testing} test`}>
            <button type="button" className="pg-icon-btn pg-pp-test-close" onClick={() => setTesting(null)} aria-label="Close test"><X size={16} /></button>
            <PenguinTest key={testing} fixedTopic={testing} onComplete={onTestDone} onCancel={() => setTesting(null)} />
          </div>
        </div>
      )}

      {assessing && (
        <div className="pg-modal-backdrop">
          <div className="pg-modal pg-pp-test-modal" role="dialog" aria-modal="true" aria-label="Skill test">
            <button type="button" className="pg-icon-btn pg-pp-test-close" onClick={() => setAssessing(false)} aria-label="Close test"><X size={16} /></button>
            <SkillAssessment skills={skills} levels={levels} onDone={onAssessmentDone} onClose={() => setAssessing(false)} />
          </div>
        </div>
      )}
    </div>
    </FoldContext.Provider>
  );
}

/** Skill Test section in the sidebar: same component, skills / test / report / roles. */
export function SkillTestTab(props) {
  return <PenguinProfileTab {...props} section="skills" />;
}
