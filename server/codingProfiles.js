/**
 * Coding-profile analysis for the Penguin Profile tab: LeetCode, Codeforces, CodeChef
 * and GitHub. All public data (no logins):
 * - LeetCode: public GraphQL API (solved by difficulty, topics, languages, contests)
 * - Codeforces: official API (rating, solved problems by rating and tag, contests)
 * - CodeChef: public profile page (rating, stars, contests, problems solved)
 * - GitHub: REST API (repos, stars, languages, recent activity)
 * Results are cached for 6 hours per handle (GitHub allows 60 requests an hour without a token).
 */
import { llmJson, hasLLM } from './llm.js';

const TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map();
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

const get = async (url, opts = {}) => {
  const res = await fetch(url, { ...opts, headers: { 'User-Agent': UA, ...(opts.headers || {}) }, signal: AbortSignal.timeout(20000) });
  if (res.status === 404) throw new Error('Profile not found — check the username or link.');
  if (res.status === 403 || res.status === 429) throw new Error('The site is limiting requests right now — try again in a few minutes.');
  if (!res.ok) throw new Error(`The site answered ${res.status}.`);
  return res;
};

/** Username from a profile link or a plain handle. */
export function handleFrom(site, value = '') {
  const v = String(value || '').trim().replace(/\/+$/, '');
  if (!v) return '';
  const patterns = {
    leetcode: /leetcode\.com\/(?:u\/)?([^/?#]+)/i,
    codeforces: /codeforces\.com\/profile\/([^/?#]+)/i,
    codechef: /codechef\.com\/users\/([^/?#]+)/i,
    github: /github\.com\/([^/?#]+)/i,
  };
  const m = v.match(patterns[site]);
  const h = (m ? m[1] : v).replace(/^@/, '');
  return /^[A-Za-z0-9_.-]{1,40}$/.test(h) ? h : '';
}

const cached = async (key, fn) => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const data = await fn();
  cache.set(key, { at: Date.now(), data });
  return data;
};

// ---------------- LeetCode ----------------
async function leetcode(user) {
  const query = `query($u: String!) {
    allQuestionsCount { difficulty count }
    matchedUser(username: $u) {
      username
      profile { ranking }
      submitStatsGlobal { acSubmissionNum { difficulty count } }
      tagProblemCounts { advanced { tagName problemsSolved } intermediate { tagName problemsSolved } fundamental { tagName problemsSolved } }
      languageProblemCount { languageName problemsSolved }
    }
    userContestRanking(username: $u) { rating attendedContestsCount topPercentage globalRanking }
  }`;
  const res = await get('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
    body: JSON.stringify({ query, variables: { u: user } }),
  });
  const { data } = await res.json();
  const u = data?.matchedUser;
  if (!u) throw new Error('LeetCode profile not found — check the username.');
  const ac = Object.fromEntries((u.submitStatsGlobal?.acSubmissionNum || []).map(x => [x.difficulty.toLowerCase(), x.count]));
  const total = Object.fromEntries((data.allQuestionsCount || []).map(x => [x.difficulty.toLowerCase(), x.count]));
  const tags = [...(u.tagProblemCounts?.fundamental || []), ...(u.tagProblemCounts?.intermediate || []), ...(u.tagProblemCounts?.advanced || [])]
    .filter(t => t.problemsSolved > 0).sort((a, b) => b.problemsSolved - a.problemsSolved);
  const c = data.userContestRanking;
  return {
    username: u.username,
    url: `https://leetcode.com/u/${u.username}/`,
    solved: { all: ac.all || 0, easy: ac.easy || 0, medium: ac.medium || 0, hard: ac.hard || 0 },
    totals: { easy: total.easy || 0, medium: total.medium || 0, hard: total.hard || 0 },
    ranking: u.profile?.ranking || null,
    topics: tags.slice(0, 12).map(t => ({ name: t.tagName, solved: t.problemsSolved })),
    languages: (u.languageProblemCount || []).sort((a, b) => b.problemsSolved - a.problemsSolved).slice(0, 6).map(l => ({ name: l.languageName, solved: l.problemsSolved })),
    contest: c ? { rating: Math.round(c.rating), attended: c.attendedContestsCount, topPercent: c.topPercentage, globalRank: c.globalRanking } : null,
  };
}

// ---------------- Codeforces ----------------
async function codeforces(handle) {
  const api = async (path) => {
    const body = await (await get(`https://codeforces.com/api/${path}`)).json();
    if (body.status !== 'OK') throw new Error(/not found/i.test(body.comment || '') ? 'Codeforces handle not found.' : (body.comment || 'Codeforces API error.'));
    return body.result;
  };
  const [info] = await api(`user.info?handles=${encodeURIComponent(handle)}`);
  const [subs, ratings] = await Promise.all([
    api(`user.status?handle=${encodeURIComponent(handle)}&from=1&count=5000`).catch(() => []),
    api(`user.rating?handle=${encodeURIComponent(handle)}`).catch(() => []),
  ]);
  const solved = new Map();
  for (const s of subs) {
    if (s.verdict !== 'OK' || !s.problem) continue;
    const key = `${s.problem.contestId || ''}-${s.problem.index}`;
    if (!solved.has(key)) solved.set(key, s.problem);
  }
  const byRating = {};
  const byTag = {};
  for (const p of solved.values()) {
    if (p.rating) byRating[p.rating] = (byRating[p.rating] || 0) + 1;
    for (const t of p.tags || []) byTag[t] = (byTag[t] || 0) + 1;
  }
  return {
    handle: info.handle,
    url: `https://codeforces.com/profile/${info.handle}`,
    rating: info.rating ?? null, maxRating: info.maxRating ?? null, rank: info.rank || 'unrated', maxRank: info.maxRank || null,
    solved: solved.size,
    contests: ratings.length,
    byRating: Object.entries(byRating).map(([r, n]) => ({ rating: Number(r), solved: n })).sort((a, b) => a.rating - b.rating),
    topics: Object.entries(byTag).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, n]) => ({ name, solved: n })),
    ratingHistory: ratings.slice(-40).map(r => ({ at: new Date(r.ratingUpdateTimeSeconds * 1000).toISOString().slice(0, 10), rating: r.newRating })),
  };
}

// ---------------- CodeChef ----------------
async function codechef(handle) {
  const html = await (await get(`https://www.codechef.com/users/${encodeURIComponent(handle)}`)).text();
  if (!/rating-header|Problems Solved/i.test(html)) throw new Error('CodeChef profile not found — check the username.');
  const num = (re) => { const m = html.match(re); return m ? Number(String(m[1]).replace(/,/g, '')) : null; };
  return {
    handle,
    url: `https://www.codechef.com/users/${handle}`,
    rating: num(/class="rating-number"[^>]*>\s*(\d+)/) ?? num(/rating-header[^>]*>(?:\s|<[^>]+>)*(\d+)/),
    stars: num(/(\d)\s*(?:&#9733;|★)/),
    highest: num(/Highest Rating\s*(\d+)/),
    globalRank: num(/Global Rank:?(?:\s|&nbsp;|<[^>]+>)*(\d[\d,]*)/),
    contests: num(/No\. of Contests Participated:?(?:\s|&nbsp;|<[^>]+>)*(\d+)/),
    solved: num(/Total Problems Solved:\s*(\d+)/),
  };
}

// ---------------- GitHub ----------------
async function github(user) {
  const headers = { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
  const profile = await (await get(`https://api.github.com/users/${encodeURIComponent(user)}`, { headers })).json();
  const repos = await (await get(`https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&sort=pushed`, { headers })).json();
  const own = (Array.isArray(repos) ? repos : []).filter(r => !r.fork);
  // Languages by code size across the 12 most recently active repositories
  const langs = {};
  await Promise.all(own.slice(0, 12).map(async (r) => {
    const l = await (await get(r.languages_url, { headers })).json().catch(() => ({}));
    for (const [k, v] of Object.entries(l || {})) langs[k] = (langs[k] || 0) + v;
  }).map(p => p.catch(() => {})));
  const totalBytes = Object.values(langs).reduce((a, b) => a + b, 0) || 1;
  const sortedLangs = Object.entries(langs).sort((a, b) => b[1] - a[1]);
  // Up to 5 named languages with at least 1% of the code; the rest fold into "Other"
  const named = sortedLangs.slice(0, 5).filter(([, bytes]) => bytes / totalBytes >= 0.01);
  const top = named.map(([name, bytes]) => ({ name, share: bytes / totalBytes }));
  const otherShare = sortedLangs.slice(named.length).reduce((n, [, b]) => n + b, 0) / totalBytes;
  const ninety = Date.now() - 90 * 86400000;
  return {
    username: profile.login,
    url: profile.html_url,
    name: profile.name,
    bio: profile.bio,
    followers: profile.followers,
    publicRepos: profile.public_repos,
    ownRepos: own.length,
    stars: own.reduce((n, r) => n + (r.stargazers_count || 0), 0),
    forks: own.reduce((n, r) => n + (r.forks_count || 0), 0),
    activeRepos90d: own.filter(r => new Date(r.pushed_at).getTime() > ninety).length,
    languages: [...top, ...(otherShare > 0.005 ? [{ name: 'Other', share: otherShare }] : [])],
    topics: [...new Set(own.flatMap(r => r.topics || []))].slice(0, 20),
    repos: own
      .sort((a, b) => (b.stargazers_count - a.stargazers_count) || (new Date(b.pushed_at) - new Date(a.pushed_at)))
      .slice(0, 6)
      .map(r => ({ name: r.name, url: r.html_url, description: r.description, language: r.language, stars: r.stargazers_count, forks: r.forks_count, pushedAt: r.pushed_at, topics: (r.topics || []).slice(0, 4) })),
    repoNames: own.slice(0, 30).map(r => `${r.name}${r.description ? `: ${r.description}` : ''}`),
  };
}

// ---------------- Skill signals ----------------
const level = (v, steps) => (v >= steps[2] ? 'Advanced' : v >= steps[1] ? 'Intermediate' : v >= steps[0] ? 'Beginner' : null);

function skillSignals({ leetcode: lc, codeforces: cf, codechef: cc, github: gh }) {
  const out = [];
  const dsa = [
    lc && level(lc.solved.all, [10, 100, 300]),
    cf && cf.rating && (cf.rating >= 1600 ? 'Advanced' : cf.rating >= 1200 ? 'Intermediate' : 'Beginner'),
    cc && cc.rating && (cc.rating >= 1800 ? 'Advanced' : cc.rating >= 1400 ? 'Intermediate' : 'Beginner'),
  ].filter(Boolean);
  const rank = { Beginner: 1, Intermediate: 2, Advanced: 3 };
  if (dsa.length) {
    const best = dsa.sort((a, b) => rank[b] - rank[a])[0];
    out.push({ skill: 'Data Structures & Algorithms', level: best, evidence: [lc && `${lc.solved.all} LeetCode problems`, cf?.rating && `Codeforces ${cf.rating}`, cc?.rating && `CodeChef ${cc.rating}`].filter(Boolean).join(' · ') });
  }
  if (lc?.contest?.attended || cf?.contests || cc?.contests) out.push({ skill: 'Competitive Programming', level: level((lc?.contest?.attended || 0) + (cf?.contests || 0) + (cc?.contests || 0), [1, 10, 40]), evidence: 'Contest participation' });
  for (const l of lc?.languages || []) if (l.solved >= 20) out.push({ skill: l.name.replace(/^Python3$/, 'Python').replace(/^MySQL$/, 'SQL'), level: level(l.solved, [20, 100, 300]), evidence: `${l.solved} LeetCode problems in ${l.name}` });
  for (const l of gh?.languages || []) if (l.name !== 'Other' && l.share >= 0.08) out.push({ skill: l.name, level: l.share >= 0.35 ? 'Intermediate' : 'Beginner', evidence: `${Math.round(l.share * 100)}% of your recent GitHub code` });
  if (gh?.ownRepos >= 3) out.push({ skill: 'Git', level: gh.ownRepos >= 15 ? 'Intermediate' : 'Beginner', evidence: `${gh.ownRepos} GitHub repositories` });
  // One entry per skill (strongest evidence wins)
  const best = new Map();
  for (const s of out.filter(x => x.level)) {
    const k = s.skill.toLowerCase();
    if (!best.has(k) || rank[s.level] > rank[best.get(k).level]) best.set(k, s);
  }
  return [...best.values()];
}

async function githubInsights(gh) {
  if (!hasLLM() || !gh) return null;
  const out = await llmJson(
    'You review a developer\'s public GitHub for a job seeker. Using ONLY the repository names, descriptions, topics and languages given, '
      + 'reply with JSON {"summary": string (2 sentences, what they build), "skills": [string] (frameworks/tools evident from the repos, max 8), '
      + '"suggestions": [string] (2-3 concrete ways to make the GitHub stronger for recruiters)}. Do not invent projects.',
    JSON.stringify({ languages: gh.languages, topics: gh.topics, repos: gh.repoNames }),
  ).catch(() => null);
  if (!out?.summary) return null;
  return { summary: String(out.summary), skills: (out.skills || []).map(String).slice(0, 8), suggestions: (out.suggestions || []).map(String).slice(0, 3) };
}

/**
 * @param links { leetcode, codeforces, codechef, github } — usernames or profile links
 * @returns { fetchedAt, leetcode?, codeforces?, codechef?, github?, errors, skills }
 */
export async function analyzeCodingProfiles(links = {}, { refresh = false } = {}) {
  const sites = { leetcode, codeforces, codechef, github };
  const result = { fetchedAt: new Date().toISOString(), errors: {} };
  await Promise.all(Object.entries(sites).map(async ([site, fn]) => {
    const h = handleFrom(site, links[site]);
    if (!links[site]) return;
    if (!h) { result.errors[site] = 'That doesn’t look like a valid username or profile link.'; return; }
    const key = `${site}:${h.toLowerCase()}`;
    if (refresh) cache.delete(key);
    try { result[site] = await cached(key, () => fn(h)); } catch (err) { result.errors[site] = err.message; }
  }));
  if (result.github) {
    result.github.insights = await cached(`gh-insights:${result.github.username}`, () => githubInsights(result.github)).catch(() => null);
    delete result.github.repoNames;
  }
  result.skills = skillSignals(result);
  return result;
}
