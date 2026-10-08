/**
 * Job-market insights for the Applications tab: how the market is moving, who is
 * hiring, walk-in drives near the user, and job / tech news.
 *
 * Sources (all public, no keys):
 * - LinkedIn's logged-out job pages: openings per role (24h / 7 days), hiring
 *   companies, and walk-in postings (confirmed from the posting text).
 * - Google News RSS (India edition): job-market and tech news.
 * - Hacker News: developer news.
 * The AI (llm.js) only summarises the headlines it is given and extracts walk-in
 * dates/venues from posting text; nothing is invented. Results are cached 30 min.
 */
import { parseGuestJobs } from './linkedinFeed.js';
import { llmJson, hasLLM } from './llm.js';

const TTL_MS = 30 * 60 * 1000;
const PARTIAL_TTL_MS = 5 * 60 * 1000; // a section came back empty (e.g. LinkedIn rate limit): try again sooner
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
  'Accept-Language': 'en-IN,en;q=0.9',
};
const cache = new Map(); // key -> { at, data, pending }

const fetchText = (url, ms = 12000) => fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(ms) })
  .then(r => (r.ok ? r.text() : ''))
  .catch(() => '');

const decode = (s = '') => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();

// LinkedIn requests go through a small queue so we never hammer it, and are retried
// with a back-off when LinkedIn rate-limits (429) or briefly fails
let active = 0;
const waiting = [];
const pause = (ms) => new Promise(r => setTimeout(r, ms));
async function linkedin(url) {
  if (active >= 2) await new Promise(r => waiting.push(r));
  active++;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(12000) }).catch(() => null);
      if (res?.ok) return await res.text();
      if (res && res.status === 404) return '';
      await pause(attempt === 0 ? 1500 : 4000);
    }
    return '';
  } finally {
    active--;
    setTimeout(() => waiting.shift()?.(), 300);
  }
}

const cityOf = (location = '') => location.split(/[,(/|]/)[0].replace(/\b(remote|hybrid|on-?site)\b/ig, '').trim();
const shortRole = (role = '') => role.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
const searchUrl = (keywords, city, extra = '') => `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(city)}${extra}`;

// ---- News ----
async function googleNews(query, max = 8) {
  const xml = await fetchText(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`);
  return (xml.match(/<item>[\s\S]*?<\/item>/g) || []).slice(0, max * 2).map((item) => {
    const source = decode(item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || '');
    let title = decode(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '');
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    return {
      title,
      source,
      url: decode(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || ''),
      publishedAt: new Date(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || Date.now()).toISOString(),
    };
  }).filter(n => n.title && n.url);
}

async function hackerNews(max = 6) {
  const ids = JSON.parse(await fetchText('https://hacker-news.firebaseio.com/v0/topstories.json') || '[]').slice(0, 20);
  const items = await Promise.all(ids.map(id => fetchText(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, 8000).then(t => { try { return JSON.parse(t); } catch { return null; } })));
  return items.filter(i => i?.type === 'story' && i.url && i.title).slice(0, max).map(i => ({
    title: i.title,
    source: (() => { try { return new URL(i.url).hostname.replace(/^www\./, ''); } catch { return 'Hacker News'; } })(),
    url: i.url,
    publishedAt: new Date(i.time * 1000).toISOString(),
    points: i.score,
    via: 'Hacker News',
  }));
}

// Off-topic for a tech job seeker (other sectors, shopping, puzzles, press releases)
const OFF_TOPIC = /biotech|biochem|pharma|nursing|teacher|police|railway|constable|army|navy|sarkari|govt job|deals?\b|discount|sale\b|price cut|wordle|strands|hints|answers|horoscope|cricket|box office/i;
const PRESS_RELEASE = /business wire|pr newswire|globenewswire|accesswire|einpresswire/i;

// Merge news lists, newest first, without duplicate or off-topic headlines
function mergeNews(lists, max) {
  const seen = new Set();
  return lists.flat()
    .filter(n => !OFF_TOPIC.test(n.title) && !PRESS_RELEASE.test(n.source))
    .filter(n => { const k = n.title.toLowerCase().slice(0, 60); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, max);
}

// ---- Openings & hiring companies (LinkedIn) ----
async function openingsCount(role, city, tpr) {
  const html = await linkedin(`https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(shortRole(role))}&location=${encodeURIComponent(city)}&f_TPR=${tpr}`);
  const raw = html.match(/results-context-header__job-count">([^<]*)/)?.[1]?.trim();
  if (!raw) return null;
  return { value: Number(raw.replace(/[^\d]/g, '')) || 0, label: raw, capped: raw.includes('+') };
}

async function hiringCompanies(roles, city) {
  const pages = await Promise.all(roles.flatMap(role => [0, 10].map(start =>
    linkedin(searchUrl(shortRole(role), city, `&f_TPR=r604800&start=${start}`)).then(html => parseGuestJobs(html).map(j => ({ ...j, role }))))));
  const byCompany = new Map();
  const seenJobs = new Set();
  for (const j of pages.flat()) {
    if (!j.company || seenJobs.has(j.id)) continue;
    seenJobs.add(j.id);
    const key = j.company.toLowerCase().replace(/\b(pvt|private|ltd|limited|inc|llp)\b\.?/g, '').trim();
    const entry = byCompany.get(key) || { company: j.company, openings: 0, titles: [] };
    entry.openings++;
    if (!entry.titles.includes(j.title) && entry.titles.length < 3) entry.titles.push(j.title);
    byCompany.set(key, entry);
  }
  return [...byCompany.values()]
    .sort((a, b) => b.openings - a.openings)
    .slice(0, 10)
    .map(c => ({ ...c, url: `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(c.company)}&location=${encodeURIComponent(city)}&f_TPR=r604800` }));
}

// ---- Walk-in drives (LinkedIn postings that mention a walk-in) ----
const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
function regexWalkInDate(text) {
  const m = text.match(new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?[\\s\\-/,]*(${MONTHS})[a-z]*[\\s,\\-/]*(\\d{4})?`, 'i'));
  if (!m) return null;
  const d = new Date(`${m[1]} ${m[2]} ${m[3] || new Date().getFullYear()}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

async function walkIns(roles, city) {
  const queries = ['walk in drive', ...roles.slice(0, 2).map(r => `walk in ${shortRole(r).split(' ').slice(0, 2).join(' ')}`)];
  const found = new Map();
  for (const q of queries) {
    const jobs = parseGuestJobs(await linkedin(searchUrl(q, city, '&f_TPR=r1209600&start=0')));
    for (const j of jobs) if (!found.has(j.id)) found.set(j.id, j);
  }
  const candidates = [...found.values()].slice(0, 10);
  const withText = await Promise.all(candidates.map(async (j) => {
    const html = await linkedin(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${j.id}`);
    const text = decode(html.match(/show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/)?.[1] || html).slice(0, 4000);
    return { ...j, text };
  }));
  const posts = withText.filter(j => /walk[\s-]?in/i.test(j.text));
  if (!posts.length) return [];

  // AI pulls the date / time / venue out of each posting (regex fallback)
  let details = {};
  if (hasLLM()) {
    const out = await llmJson(
      'You read job postings and extract walk-in drive details. Use ONLY what the posting says; use null when it is not stated. '
        + 'Reply with JSON {"items":[{"id":string,"isWalkIn":boolean,"date":"YYYY-MM-DD"|null,"endDate":"YYYY-MM-DD"|null,"time":string|null,"venue":string|null,"experience":string|null,"isTech":boolean}]}. '
        + 'isWalkIn is true only for an in-person walk-in interview/drive. isTech is true for software/IT/engineering/data roles. '
        + `Today is ${new Date().toISOString().slice(0, 10)}; assume the year is the current one when missing.`,
      JSON.stringify(posts.map(p => ({ id: p.id, title: p.title, company: p.company, text: p.text.slice(0, 1500) }))),
    ).catch(() => null);
    for (const it of out?.items || []) details[String(it.id)] = it;
  } else {
    details = Object.fromEntries(posts.map(p => [p.id, { isWalkIn: true, date: regexWalkInDate(p.text), isTech: /engineer|developer|software|data|analyst|devops|qa|test/i.test(p.title) }]));
  }

  const today = new Date().toISOString().slice(0, 10);
  return posts
    .map(p => ({ p, d: details[p.id] || {} }))
    .filter(({ d }) => d.isWalkIn !== false)
    .filter(({ d }) => !d.date || (d.endDate || d.date) >= today) // drop drives that are over
    .map(({ p, d }) => ({
      id: p.id,
      title: p.title,
      company: p.company,
      location: p.location,
      date: d.date || null,
      endDate: d.endDate || null,
      time: d.time || null,
      venue: d.venue || null,
      experience: d.experience || null,
      isTech: d.isTech ?? true,
      url: `https://www.linkedin.com/jobs/view/${p.id}/`,
    }))
    // Same drive posted twice (e.g. two TCS listings for one Java drive)
    .filter((w, i, all) => all.findIndex(o => `${o.company.toLowerCase().replace(/tata consultancy services/, 'tcs')}|${o.title.toLowerCase()}|${o.date}`
      === `${w.company.toLowerCase().replace(/tata consultancy services/, 'tcs')}|${w.title.toLowerCase()}|${w.date}`) === i)
    .sort((a, b) => (b.isTech - a.isTech) || String(a.date || '9999').localeCompare(String(b.date || '9999')))
    .slice(0, 8);
}

// ---- Market pulse (AI summary of the headlines only) ----
async function marketPulse(news, openings, city) {
  if (!hasLLM() || !news.length) return null;
  const out = await llmJson(
    'You brief a job seeker in India on the tech job market. Use ONLY the numbered headlines and openings numbers given; do not add facts. '
      + 'Reply with JSON {"mood":"Hiring is strong"|"Steady"|"Mixed"|"Cautious","bullets":[{"text":string,"basis":"openings"|"news","sources":[number]}]} with exactly 3 short bullets (max 22 words each): '
      + 'the first about the openings numbers (basis "openings", sources []), the other two from the headlines (basis "news", citing the headline numbers used). Plain words, no hype.',
    `City: ${city}\nOpenings (new LinkedIn listings): ${JSON.stringify(openings.map(o => ({ role: o.role, last24h: o.today?.label, last7days: o.week?.label })))}\n`
      + `Headlines:\n${news.slice(0, 14).map((n, i) => `${i + 1}. ${n.title} (${n.source}, ${n.publishedAt.slice(0, 10)})`).join('\n')}`,
  ).catch(() => null);
  if (!out?.bullets?.length) return null;
  return {
    mood: ['Hiring is strong', 'Steady', 'Mixed', 'Cautious'].includes(out.mood) ? out.mood : 'Mixed',
    bullets: out.bullets.slice(0, 3).map(b => ({
      text: String(b.text || ''),
      // Openings come from LinkedIn listings, not from a news story
      sources: b.basis === 'openings'
        ? [{ title: 'New LinkedIn job listings', url: '', source: 'LinkedIn listings' }]
        : (Array.isArray(b.sources) ? b.sources : []).map(n => news[Number(n) - 1]).filter(Boolean).slice(0, 2)
          .map(n => ({ title: n.title, url: n.url, source: n.source })),
    })).filter(b => b.text),
  };
}

async function build(city, roles) {
  const place = city || 'India';
  const [jobNewsLists, techLists, openings, companies, walkInList] = await Promise.all([
    Promise.all([
      googleNews('(IT hiring OR tech jobs OR job market) India when:7d', 10),
      googleNews('(layoffs OR hiring freeze) tech India when:7d', 6),
      city ? googleNews(`${city} (IT OR tech OR software) (jobs OR hiring) when:14d`, 8) : [],
    ]),
    Promise.all([
      googleNews('(AI OR software OR developers OR cybersecurity OR "open source" OR startup) (launch OR release OR update OR announces) when:2d', 10),
      hackerNews(6),
    ]),
    Promise.all(roles.map(async (role) => ({ role, today: await openingsCount(role, place, 'r86400'), week: await openingsCount(role, place, 'r604800') }))),
    hiringCompanies(roles, place),
    walkIns(roles, place),
  ]);
  // Job news must be about India or tech work
  const relevant = /india|indian|bengaluru|bangalore|hyderabad|pune|chennai|mumbai|delhi|noida|gurugram|kolkata|tcs|infosys|wipro|hcl|tech|\bit\b|software|\bai\b|layoff|hiring|freshers|startup|engineer/i;
  const jobNews = mergeNews(jobNewsLists.map(list => list.filter(n => relevant.test(n.title))), 12);
  const techNews = mergeNews(techLists, 12);
  return {
    city: place,
    roles,
    updatedAt: new Date().toISOString(),
    pulse: await marketPulse(jobNews, openings, place),
    openings,
    companies,
    walkIns: walkInList,
    jobNews,
    techNews,
  };
}

/** Market insights for a location and set of roles (cached for 30 minutes). */
export async function getMarketInsights({ location = '', roles = [], refresh = false } = {}) {
  const city = cityOf(location);
  const roleList = [...new Set(roles.map(r => String(r).trim()).filter(Boolean))].slice(0, 3);
  if (!roleList.length) roleList.push('Software Engineer');
  const key = `${city.toLowerCase()}|${roleList.join('|').toLowerCase()}`;
  const hit = cache.get(key);
  if (hit?.pending) return hit.pending;
  if (hit?.data && !refresh && Date.now() - hit.at < TTL_MS) return hit.data;
  const pending = build(city, roleList)
    .then((data) => {
      const partial = !data.walkIns.length || !data.companies.length || data.openings.some(o => !o.today || !o.week);
      // Partial results expire sooner so a rate-limited section fills in on the next visit
      cache.set(key, { at: Date.now() - (partial ? TTL_MS - PARTIAL_TTL_MS : 0), data });
      return data;
    })
    .catch((err) => { cache.delete(key); throw err; });
  cache.set(key, { ...hit, pending });
  return pending;
}
