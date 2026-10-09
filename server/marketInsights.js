/**
 * Job-market insights for the Applications tab: how the market is moving, who is
 * hiring, walk-in drives near the user, and job / tech news.
 *
 * Sources (all public, no keys):
 * - LinkedIn's logged-out job pages: openings per role (24h / 7 days), hiring
 *   companies, and walk-in postings (confirmed from the posting text).
 * - Google News RSS (India edition): job-market and tech news.
 * - Hacker News: developer news.
 * - Google News RSS: government exam updates (UPSC, SSC, state PSC groups, police,
 *   banks, railways, defence, teaching) incl. the user's state boards.
 * The AI (llm.js) only extracts walk-in dates/venues from posting text; nothing is
 * invented. Results are cached 30 min.
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

// Merge news lists, newest first, without duplicate (or, for tech/job news, off-topic) headlines
function mergeNews(lists, max, { offTopic = true } = {}) {
  const seen = new Set();
  return lists.flat()
    .filter(n => (!offTopic || !OFF_TOPIC.test(n.title)) && !PRESS_RELEASE.test(n.source))
    .filter(n => { const k = n.title.toLowerCase().slice(0, 60); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, max);
}

// ---- Openings & hiring companies (LinkedIn) ----
export async function openingsCount(role, city, tpr) {
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

// ---- Government jobs: exam notifications, admit cards, results ----
const NATIONAL_SITES = [
  { name: 'UPSC', url: 'https://upsc.gov.in' },
  { name: 'SSC', url: 'https://ssc.gov.in' },
  { name: 'IBPS', url: 'https://www.ibps.in' },
  { name: 'SBI Careers', url: 'https://sbi.co.in/web/careers' },
  { name: 'RBI', url: 'https://opportunities.rbi.org.in' },
  { name: 'Railways (RRB)', url: 'https://www.rrbapply.gov.in' },
  { name: 'Indian Army', url: 'https://joinindianarmy.nic.in' },
];

// City → state recruitment boards (PSC and police), so local exams show up
const STATES = [
  { cities: /hyderabad|secunderabad|warangal|karimnagar|telangana/i, names: /telangana|tgpsc|tspsc|tgprb|tslprb|\bts\b|\btg\b/i, state: 'Telangana', query: '(TGPSC OR TSPSC OR TGPRB OR "Telangana police" OR "Telangana group" OR "TS group")', sites: [{ name: 'TGPSC', url: 'https://www.tgpsc.gov.in' }, { name: 'TG Police (TGPRB)', url: 'https://www.tgprb.in' }] },
  { cities: /visakhapatnam|vizag|vijayawada|guntur|tirupati|andhra/i, names: /andhra|appsc|\bap\b|slprb/i, state: 'Andhra Pradesh', query: '(APPSC OR "AP police" OR "AP SLPRB" OR "Andhra Pradesh police")', sites: [{ name: 'APPSC', url: 'https://psc.ap.gov.in' }, { name: 'AP Police (SLPRB)', url: 'https://slprb.ap.gov.in' }] },
  { cities: /bengaluru|bangalore|mysuru|mysore|mangaluru|karnataka/i, names: /karnataka|kpsc|\bksp\b|\bkea\b/i, state: 'Karnataka', query: '(KPSC OR "Karnataka police" OR KSP OR "KEA recruitment")', sites: [{ name: 'KPSC', url: 'https://kpsc.kar.nic.in' }] },
  { cities: /chennai|coimbatore|madurai|tamil/i, names: /tamil|tnpsc|tnusrb|\btn\b/i, state: 'Tamil Nadu', query: '(TNPSC OR TNUSRB OR "Tamil Nadu police" OR "TN group")', sites: [{ name: 'TNPSC', url: 'https://www.tnpsc.gov.in' }, { name: 'TN Police (TNUSRB)', url: 'https://www.tnusrb.tn.gov.in' }] },
  { cities: /pune|mumbai|nagpur|nashik|maharashtra/i, names: /maharashtra|mpsc|bharti/i, state: 'Maharashtra', query: '(MPSC OR "Maharashtra police" OR "police bharti")', sites: [{ name: 'MPSC', url: 'https://mpsc.gov.in' }] },
  { cities: /noida|lucknow|kanpur|ghaziabad|varanasi|uttar pradesh/i, names: /uttar pradesh|uppsc|upsssc|\bup\b/i, state: 'Uttar Pradesh', query: '(UPPSC OR UPSSSC OR "UP police")', sites: [{ name: 'UPPSC', url: 'https://uppsc.up.nic.in' }] },
  { cities: /gurugram|gurgaon|faridabad|haryana/i, names: /haryana|hpsc|hssc/i, state: 'Haryana', query: '(HPSC OR HSSC OR "Haryana police")', sites: [{ name: 'HPSC', url: 'https://hpsc.gov.in' }] },
  { cities: /delhi/i, names: /delhi|dsssb/i, state: 'Delhi', query: '(DSSSB OR "Delhi police")', sites: [{ name: 'DSSSB', url: 'https://dsssb.delhi.gov.in' }] },
];

const GOVT_RELEVANT = /recruitment|notification|vacanc|exam|admit card|hall ticket|result|apply|posts|application|answer key|syllabus|cut ?off|selection list|merit list/i;
const GOVT_CATEGORIES = [
  ['Defence', /army|navy|air force|agniveer|\bnda\b|\bcds\b|afcat|crpf|bsf|cisf|itbp|\bssb\b|assam rifles|defence|coast guard/i],
  ['Police', /police|constable|sub[- ]inspector|\bsi\b|\basi\b|slprb|tgprb|tnusrb|prb\b|home guard|jail warder/i],
  ['Railways', /\brrb\b|railway|\brail\b|ntpc|alp\b/i],
  ['Banks', /ibps|\bsbi\b|\brbi\b|bank|nabard|\blic\b|insurance|sebi/i],
  ['Teaching', /teacher|\btet\b|\bdsc\b|\bkvs\b|\bnvs\b|lecturer|professor|ctet/i],
  ['Group & PSC', /upsc|\bssc\b|psc\b|tgpsc|tspsc|appsc|tnpsc|kpsc|mpsc|uppsc|group[- ]?(1|2|3|4|i{1,3}|iv)\b|civil services|\bcgl\b|chsl|\bmts\b|\bias\b/i],
];
const GOVT_KIND = [
  ['Notification', /notification|recruitment|apply|vacanc|posts|registration/i],
  ['Admit card', /admit card|hall ticket|city intimation/i],
  ['Result', /result|merit list|selection list|cut ?off/i],
  ['Exam date', /exam date|schedule|exam city|timetable/i],
  ['Answer key', /answer key/i],
];

export const stateFor = (city = '') => STATES.find(s => s.cities.test(city)) || null;

async function governmentUpdates(city) {
  const st = stateFor(city);
  const lists = await Promise.all([
    googleNews('(UPSC OR SSC OR "Group 1" OR "Group 2" OR "Group 4" OR PSC) (notification OR recruitment OR "admit card" OR result) when:7d', 8),
    googleNews('(police OR constable OR "sub inspector") recruitment (notification OR exam OR result) when:7d', 8),
    googleNews('(IBPS OR "SBI PO" OR "SBI Clerk" OR RBI) (recruitment OR notification OR exam OR result) when:7d', 8),
    googleNews('(RRB OR "railway recruitment") (notification OR exam OR result) when:7d', 6),
    googleNews('(Agniveer OR "Indian Army" OR "Indian Navy" OR "Air Force" OR CRPF OR BSF OR CISF) recruitment when:7d', 5),
    googleNews('(teacher recruitment OR TET OR DSC OR KVS) (notification OR exam OR result) when:7d', 4),
    st ? googleNews(`${st.query} (notification OR recruitment OR exam OR result OR "admit card") when:14d`, 10) : [],
  ]);
  // The state search is loose: keep (and tag) only headlines that name the state's boards
  const local = new Set((lists[6] || []).filter(n => st?.names.test(n.title)).map(n => n.title));
  if (st) lists[6] = lists[6].filter(n => local.has(n.title));
  return mergeNews(lists.map(l => l.filter(n => GOVT_RELEVANT.test(n.title))), 40, { offTopic: false }).map(n => ({
    ...n,
    category: (GOVT_CATEGORIES.find(([, re]) => re.test(n.title)) || ['Other'])[0],
    kind: (GOVT_KIND.find(([, re]) => re.test(n.title)) || [null])[0],
    local: local.has(n.title) ? st.state : null,
  }))
    // Only actual job updates (notification, admit card, result, exam date, answer key), not general news
    .filter(n => n.kind)
    .slice(0, 30);
}

// ---- Trending jobs: popular roles ranked by new openings today in the city ----
const TRENDING_ROLES = [
  'Software Engineer', 'Data Analyst', 'Full Stack Developer', 'Java Developer', 'Python Developer', 'DevOps Engineer',
  'QA Engineer', 'Business Analyst', 'Data Scientist', 'Sales Executive', 'Customer Support', 'HR Recruiter', 'Accountant', 'Digital Marketing',
];

async function trendingJobs(place) {
  const rows = await Promise.all(TRENDING_ROLES.map(async (role) => ({ role, today: await openingsCount(role, place, 'r86400') })));
  return rows.filter(r => r.today?.value)
    .sort((a, b) => b.today.value - a.today.value)
    .slice(0, 12)
    .map(r => ({ ...r, url: `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(r.role)}&location=${encodeURIComponent(place)}&f_TPR=r86400` }));
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
  const st = stateFor(place);
  const [jobNewsLists, techLists, openings, companies, walkInList, government, trending] = await Promise.all([
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
    governmentUpdates(place),
    trendingJobs(place),
  ]);
  // Job news must be about India or tech work
  const relevant = /india|indian|bengaluru|bangalore|hyderabad|pune|chennai|mumbai|delhi|noida|gurugram|kolkata|tcs|infosys|wipro|hcl|tech|\bit\b|software|\bai\b|layoff|hiring|freshers|startup|engineer/i;
  const jobNews = mergeNews(jobNewsLists.map(list => list.filter(n => relevant.test(n.title))), 12);
  return {
    city: place,
    roles,
    updatedAt: new Date().toISOString(),
    pulse: await marketPulse(jobNews, openings, place),
    government: { state: st?.state || null, updates: government, sites: [...(st?.sites || []), ...NATIONAL_SITES] },
    trending,
    openings,
    companies,
    walkIns: walkInList,
    jobNews,
    techNews: mergeNews(techLists, 12),
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
      const partial = !data.walkIns.length || !data.companies.length || !data.trending.length || !data.government.updates.length || data.openings.some(o => !o.today || !o.week);
      // Partial results expire sooner so a rate-limited section fills in on the next visit
      cache.set(key, { at: Date.now() - (partial ? TTL_MS - PARTIAL_TTL_MS : 0), data });
      return data;
    })
    .catch((err) => { cache.delete(key); throw err; });
  cache.set(key, { ...hit, pending });
  return pending;
}
