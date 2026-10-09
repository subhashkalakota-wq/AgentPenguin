/**
 * Role recommender: content-based matching of the user's skills against a role knowledge
 * base (shared/roleCatalog.js). No AI — every number can be traced back.
 *
 * 1. Proficiency p ∈ [0, 1] per skill:
 *    tested skill → test score (Item Response Theory ability, 0-100) / 100;
 *    untested skill with a level (resume, coding profiles) → level value × 0.85 (unverified);
 *    skill added without evidence → 0.4 × 0.85; resume-only skill → from years of use.
 * 2. Fit of a role = core × (0.75 + 0.25 × support), where core = mean p over its core
 *    skills (weight 3) and support = weighted mean p over the rest (weights 2 and 1).
 *    Core skills decide most of the fit; the others add up to a quarter on top. A "one of
 *    these" group counts the user's best option. A role needs at least one core skill at
 *    p ≥ 0.4, so no role rests on a skill the user is weak at.
 * 3. Gap analysis: for each skill under p 0.55, the fit the role would have if that skill
 *    reached 0.7; gaps are ordered by that gain ("learning SQL raises your fit to 78%").
 *    Skills the user listed but hasn't tested are flagged "test it" rather than missing.
 * 4. Ranking: the 10 best fits get live LinkedIn demand (new openings in the user's city);
 *    rank score = 0.85 × fit + 0.15 × demand, demand on a log scale from 0 to 100.
 * 5. "Learn next": missing skills ordered by the fit points they'd add across the top roles,
 *    each role weighted by how well the user already fits it.
 */
import { ROLES, skillKey } from '../shared/roleCatalog.js';
import { openingsCount } from './marketInsights.js';

const LEVEL_P = { Expert: 0.9, Advanced: 0.75, Intermediate: 0.55, Beginner: 0.3 };
const UNVERIFIED = 0.85;
const MATCH_AT = 0.55; // counts as a skill you have
const TARGET = 0.7; // "good enough" level used for gaps and what-ifs
const DEMAND_WEIGHT = 0.15;

const pct = (x) => Math.round(x * 100);
const listOf = (a) => (a.length <= 2 ? a.join(' and ') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

/** key → { name, p, tested } from picked skills, resume skills and coding-profile stats. */
function proficiencies(skills, resume, coding) {
  const out = new Map();
  const put = (name, p, tested) => {
    const k = skillKey(name);
    if (!k) return;
    const cur = out.get(k);
    if (!cur || (tested && !cur.tested) || (tested === cur.tested && p > cur.p)) out.set(k, { name, p, tested });
  };
  for (const s of skills) {
    const name = typeof s === 'string' ? s : s?.name;
    if (!name) continue;
    if (s.score != null) put(name, Math.max(0, Math.min(1, s.score / 100)), true);
    else put(name, (LEVEL_P[s.level] ?? 0.4) * UNVERIFIED, false);
  }
  for (const r of resume?.skills || []) {
    if (!out.has(skillKey(r.name))) put(r.name, r.years >= 3 ? 0.6 : r.years >= 1 ? 0.5 : 0.3, false);
  }
  // DSA evidence from coding profiles when the user hasn't listed or tested it
  const solved = coding?.leetcode?.solved?.all || 0;
  const rating = Math.max(coding?.codeforces?.rating || 0, (coding?.codechef?.rating || 0) - 200);
  const dsa = solved >= 300 || rating >= 1600 ? 'Advanced' : solved >= 100 || rating >= 1200 ? 'Intermediate' : solved >= 10 || rating > 0 ? 'Beginner' : null;
  if (dsa && !out.has(skillKey('Data Structures & Algorithms'))) put('Data Structures & Algorithms', LEVEL_P[dsa] * UNVERIFIED, false);
  return out;
}

// fit = core × (0.75 + 0.25 × support)
function fitOf(items) {
  const core = items.filter(i => i.weight === 3);
  const rest = items.filter(i => i.weight !== 3);
  const coreCov = core.reduce((n, i) => n + i.p, 0) / (core.length || 1);
  const restW = rest.reduce((n, i) => n + i.weight, 0);
  const support = restW ? rest.reduce((n, i) => n + i.weight * i.p, 0) / restW : coreCov;
  return coreCov * (0.75 + 0.25 * support);
}

function evaluate(role, prof) {
  const items = role.skills.map(([skill, weight, label]) => {
    const options = [].concat(skill);
    let best = { p: 0, name: label || options[0], tested: false, listed: false };
    for (const o of options) {
      const hit = prof.get(skillKey(o));
      if (hit && hit.p >= best.p) best = { p: hit.p, name: hit.name, tested: hit.tested, listed: true };
    }
    return { label: label || options[0], weight, ...best };
  });
  if (!items.some(i => i.weight === 3 && i.p >= 0.4)) return null;
  const fit = fitOf(items);
  const matched = items.filter(i => i.p >= MATCH_AT).sort((a, b) => b.weight * b.p - a.weight * a.p);
  // Each gap's what-if: the role's fit if that one skill reached the target level
  const gaps = items.filter(i => i.p < MATCH_AT)
    .map(g => ({ ...g, whatIf: fitOf(items.map(i => (i === g ? { ...i, p: TARGET } : i))) }))
    .sort((a, b) => b.whatIf - a.whatIf);
  return { role, fit, items, matched, gaps };
}

function seniority(years) {
  if (years == null) return null;
  return years < 3 ? 'Entry level' : years < 6 ? 'Associate' : 'Mid-Senior level';
}

// Live demand per role and city, cached 30 minutes (LinkedIn's public job search)
const demandCache = new Map();
async function demand(title, city) {
  const key = `${title}|${city}`;
  const hit = demandCache.get(key);
  if (hit && Date.now() - hit.at < 30 * 60 * 1000) return hit.value;
  const [today, week] = await Promise.all([
    openingsCount(title, city, 'r86400').catch(() => null),
    openingsCount(title, city, 'r604800').catch(() => null),
  ]);
  const value = { today, week };
  if (today || week) demandCache.set(key, { at: Date.now(), value });
  return value;
}

/**
 * @param input { skills: [{ name, level?, score? }], resume, coding, location, experienceYears }
 * @returns { city, method, roles: [{ title, fit, rank, why, matched, missing, gain, level, today, week, url }], learnNext }
 */
export async function suggestRoles({ skills = [], resume = null, coding = null, location = '', experienceYears = null } = {}) {
  if (!skills.length && !resume?.skills?.length) throw new Error('Add a few skills first.');
  const city = String(location || '').split(/[,(/|]/)[0].trim() || 'India';
  const prof = proficiencies(skills, resume, coding);

  const candidates = ROLES.map(r => evaluate(r, prof)).filter(Boolean).filter(e => e.fit >= 0.2)
    .sort((a, b) => b.fit - a.fit).slice(0, 10);
  if (!candidates.length) throw new Error('None of the roles Penguin knows match these skills yet. Add or test a few more skills.');

  // Demand for the 10 best fits (4 at a time), then blend
  const withDemand = [];
  for (let i = 0; i < candidates.length; i += 4) {
    withDemand.push(...await Promise.all(candidates.slice(i, i + 4).map(async c => ({ ...c, ...(await demand(c.role.title, city)) }))));
  }
  const weeks = withDemand.map(c => c.week?.value).filter(v => v != null);
  const maxLog = Math.log10(1 + Math.max(1, ...weeks));
  const avgDemand = weeks.length ? weeks.reduce((n, v) => n + Math.log10(1 + v) / maxLog, 0) / weeks.length : 0;
  for (const c of withDemand) {
    c.demand = c.week?.value != null ? Math.log10(1 + c.week.value) / maxLog : avgDemand;
    c.rank = (1 - DEMAND_WEIGHT) * c.fit + DEMAND_WEIGHT * c.demand;
  }
  const top = withDemand.sort((a, b) => b.rank - a.rank).slice(0, 7);

  const level = seniority(experienceYears ?? resume?.totalExperienceYears ?? null);
  const roles = top.map(c => {
    const strong = c.matched.slice(0, 2).map(m => `${m.name}${m.tested ? ` (${pct(m.p)}%)` : ''}`);
    const why = (strong.length
      ? `${listOf(strong)} cover${strong.length === 1 ? 's' : ''} the core of this role.`
      : `Your ${c.items.filter(i => i.p > 0).sort((a, b) => b.weight * b.p - a.weight * a.p)[0]?.name || 'skills'} count toward this role.`)
      + (c.gaps.length ? ` Biggest gap: ${c.gaps[0].listed ? c.gaps[0].name : c.gaps[0].label}.` : ' You cover all its key skills.');
    return {
      title: c.role.title,
      fit: pct(c.fit),
      rank: pct(c.rank),
      why,
      matched: c.matched.slice(0, 6).map(m => ({ name: m.name, pct: m.tested ? pct(m.p) : null })),
      missing: c.gaps.slice(0, 3).map(g => ({ name: g.listed ? g.name : g.label, untested: g.listed && !g.tested })),
      gain: c.gaps.length && c.gaps[0].whatIf - c.fit >= 0.02 ? { skill: c.gaps[0].listed ? c.gaps[0].name : c.gaps[0].label, to: pct(c.gaps[0].whatIf), untested: c.gaps[0].listed && !c.gaps[0].tested } : null,
      level,
      today: c.today || null,
      week: c.week || null,
      url: `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(c.role.title)}&location=${encodeURIComponent(city)}&f_TPR=r604800`,
    };
  });

  // Learn next: fit points each missing skill would add across the recommended roles,
  // weighted by how well the user fits each role
  const impact = new Map();
  for (const c of top) {
    for (const g of c.gaps) {
      const points = (g.whatIf - c.fit) * 100;
      const weighted = points * c.fit;
      const name = g.listed ? g.name : g.label;
      const cur = impact.get(name) || { skill: name, points: 0, roles: 0, untested: g.listed && !g.tested };
      cur.points += points;
      cur.score = (cur.score || 0) + weighted;
      cur.roles += 1;
      impact.set(name, cur);
    }
  }
  const learnNext = [...impact.values()].sort((a, b) => b.score - a.score).slice(0, 3)
    .map(x => ({ skill: x.skill, roles: x.roles, points: Math.round(x.points), untested: x.untested }));

  return { city, method: 'weighted-skill-match', roles, learnNext };
}
