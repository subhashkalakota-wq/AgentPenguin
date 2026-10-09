/**
 * Coding problems to practise a DSA topic or a programming language, from LeetCode,
 * CodeChef and Codeforces (public data, no logins):
 * - LeetCode: public GraphQL problem list, filtered by tag / category and difficulty
 * - CodeChef: public practice API, filtered by tag and rating, most-solved first
 * - Codeforces: official problemset API, filtered by tag and rating, most-solved first
 * Which tags fit a topic lives in shared/codingTopics.js. The picks rotate daily so
 * coming back gives new problems. Results are cached for 6 hours.
 */
import { codingTopic } from '../shared/codingTopics.js';

const PER_SITE = 6;
const TTL = 6 * 60 * 60 * 1000;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

// Difficulty bands per site
const BANDS = {
  easy: { lc: 'EASY', cc: [0, 1200], cf: [800, 1100] },
  medium: { lc: 'MEDIUM', cc: [1200, 1600], cf: [1200, 1600] },
  hard: { lc: 'HARD', cc: [1600, 2300], cf: [1700, 2200] },
};

const cache = new Map();

async function getJson(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { 'User-Agent': UA, Accept: 'application/json', ...(options.headers || {}) }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${new URL(url).hostname} answered ${res.status}`);
  return res.json();
}

// Same picks all day for a topic, different ones tomorrow
function rotate(list, seedText) {
  if (!list.length) return list;
  let h = 0;
  for (const ch of `${seedText}|${new Date().toISOString().slice(0, 10)}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const k = h % list.length;
  return [...list.slice(k), ...list.slice(0, k)];
}

// One from each pool in turn (mixed topics), or straight from a single pool
function pick(pools, n) {
  const out = [];
  const seen = new Set();
  for (let round = 0; out.length < n && pools.some(p => p.length > round); round++) {
    for (const pool of pools) {
      const item = pool[round];
      if (item && !seen.has(item.url) && out.length < n) { seen.add(item.url); out.push(item); }
    }
  }
  return out;
}

// ---------------- LeetCode ----------------
const LC_QUERY = `query q($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
  questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
    data { difficulty questionFrontendId isPaidOnly title titleSlug acRate topicTags { name } }
  }
}`;

async function leetcodeList(category, filters) {
  const body = await getJson('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com/problemset/' },
    body: JSON.stringify({ query: LC_QUERY, variables: { categorySlug: category || '', limit: 60, skip: 0, filters } }),
  });
  return (body?.data?.questionList?.data || [])
    .filter(q => !q.isPaidOnly)
    .map(q => ({
      title: `${q.questionFrontendId}. ${q.title}`,
      url: `https://leetcode.com/problems/${q.titleSlug}/`,
      difficulty: q.difficulty,
      tags: (q.topicTags || []).map(t => t.name).slice(0, 2),
    }));
}

async function leetcode(plan, level, seed) {
  const { category, tags } = plan.lc;
  const difficulty = BANDS[level].lc;
  let pools;
  if (tags.length) {
    pools = await Promise.all(tags.slice(0, 8).map(tag => leetcodeList(category, { difficulty, tags: [tag] }).then(l => rotate(l, seed + tag))));
  } else {
    // A category (SQL, JavaScript, shell, pandas); small sets fall back to any difficulty
    let list = await leetcodeList(category, { difficulty });
    if (list.length < PER_SITE) list = await leetcodeList(category, {});
    pools = [rotate(list, seed)];
  }
  const more = category === 'database' ? 'https://leetcode.com/problemset/database/'
    : category === 'javascript' ? 'https://leetcode.com/studyplan/30-days-of-javascript/'
      : category === 'shell' ? 'https://leetcode.com/problemset/shell/'
        : category === 'pandas' ? 'https://leetcode.com/studyplan/introduction-to-pandas/'
          : `https://leetcode.com/problem-list/${tags[0]}/`;
  return { problems: pick(pools, PER_SITE), more };
}

// ---------------- CodeChef ----------------
async function codechefList(tag, [lo, hi]) {
  const qs = new URLSearchParams({ page: '0', limit: '30', sort_by: 'successful_submissions', sort_order: 'desc', start_rating: String(lo), end_rating: String(hi), tags: tag });
  const body = await getJson(`https://www.codechef.com/api/list/problems?${qs}`);
  if (body?.status !== 'success') return [];
  return (body.data || []).map(p => ({
    title: p.name,
    url: `https://www.codechef.com/problems/${p.code}`,
    rating: Number(p.difficulty_rating) > 0 ? Number(p.difficulty_rating) : null,
    solved: Number(p.successful_submissions) || 0,
  }));
}

async function codechef(plan, level, seed) {
  const band = BANDS[level].cc;
  const pools = await Promise.all(plan.cc.tags.slice(0, 6).map(tag => codechefList(tag, band).then(l => rotate(l.slice(0, 20), seed + tag))));
  const qs = new URLSearchParams({ page: '0', limit: '20', sort_by: 'difficulty_rating', sort_order: 'asc', start_rating: String(band[0]), end_rating: String(band[1]), tags: plan.cc.tags[0], group: 'all' });
  return { problems: pick(pools, PER_SITE), more: `https://www.codechef.com/practice?${qs}` };
}

// ---------------- Codeforces ----------------
let cfAll = null; // whole problemset, refreshed daily

async function codeforcesAll() {
  if (cfAll && Date.now() - cfAll.at < 24 * 60 * 60 * 1000) return cfAll.problems;
  const body = await getJson('https://codeforces.com/api/problemset.problems');
  if (body?.status !== 'OK') throw new Error('Codeforces is busy right now');
  const solved = new Map(body.result.problemStatistics.map(s => [`${s.contestId}/${s.index}`, s.solvedCount]));
  const problems = body.result.problems
    .filter(p => p.rating && p.type === 'PROGRAMMING')
    .map(p => ({ id: `${p.contestId}/${p.index}`, name: p.name, rating: p.rating, tags: p.tags, solved: solved.get(`${p.contestId}/${p.index}`) || 0 }));
  cfAll = { at: Date.now(), problems };
  return problems;
}

async function codeforces(plan, level, seed) {
  const [lo, hi] = BANDS[level].cf;
  const all = await codeforcesAll();
  const pools = plan.cf.tags.map(tag => rotate(
    all.filter(p => p.rating >= lo && p.rating <= hi && p.tags.includes(tag)).sort((a, b) => b.solved - a.solved).slice(0, 40),
    seed + tag,
  ).map(p => ({
    title: `${p.id.replace('/', '')}. ${p.name}`,
    url: `https://codeforces.com/problemset/problem/${p.id}`,
    rating: p.rating,
    solved: p.solved,
    tags: p.tags.filter(t => t !== tag).slice(0, 2),
  })));
  return { problems: pick(pools, PER_SITE), more: `https://codeforces.com/problemset?tags=${encodeURIComponent(`${plan.cf.tags[0]},${lo}-${hi}`)}` };
}

/**
 * @returns { topic, label, kind, level, note, sites: [{ key, name, problems, more, error?, unavailable? }] }
 */
export async function practiceProblems(topic, level = 'medium') {
  const plan = codingTopic(topic);
  if (!plan) throw new Error(`"${topic}" isn't a DSA or programming-language topic.`);
  const lvl = BANDS[level] ? level : 'medium';
  const key = `${plan.label}|${plan.kind}|${lvl}|${new Date().toISOString().slice(0, 10)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return { ...hit.value, topic };

  const seed = `${plan.label}|${lvl}`;
  const site = async (key, name, enabled, fn, missing) => {
    if (!enabled) return { key, name, problems: [], unavailable: missing };
    try { return { key, name, ...(await fn(plan, lvl, seed)) }; } catch (err) { return { key, name, problems: [], error: err.message }; }
  };
  const sites = await Promise.all([
    site('leetcode', 'LeetCode', Boolean(plan.lc), leetcode, ''),
    site('codechef', 'CodeChef', Boolean(plan.cc), codechef, plan.kind === 'dsa' ? `CodeChef has no problems tagged ${plan.label.toLowerCase()}.` : `CodeChef has no ${plan.label} problems.`),
    site('codeforces', 'Codeforces', Boolean(plan.cf), codeforces, plan.kind === 'dsa' ? `Codeforces has no problems tagged ${plan.label.toLowerCase()}.` : `Codeforces has no ${plan.label} problems.`),
  ]);
  const value = {
    label: plan.label,
    kind: plan.kind,
    level: lvl,
    note: plan.kind === 'language' ? `Solve these in ${plan.label}. They're general problems; the point is writing working ${plan.label} code.` : null,
    sites,
  };
  // Don't keep a result where every site failed
  if (sites.some(s => s.problems.length)) cache.set(key, { at: Date.now(), value });
  return { ...value, topic };
}
