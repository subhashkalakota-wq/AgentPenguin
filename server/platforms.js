/**
 * Multi-platform support: LinkedIn, Naukri, Indeed.
 *
 * - Detects which platforms are open as tabs in the CDP-attached Chrome.
 * - Scrapes job listings on Naukri and Indeed. Applying lives in boardAppliers.js
 *   (same engine as LinkedIn's playwrightApplier.js).
 *
 * Job-board markup changes often. Selectors below list several fallbacks; when
 * a flow can't be completed with confidence the job is returned as
 * needs_review instead of guessing.
 */

export const PLATFORMS = {
  linkedin: { key: 'linkedin', label: 'LinkedIn', domain: 'linkedin.com', homeUrl: 'https://www.linkedin.com/jobs/' },
  naukri:   { key: 'naukri',   label: 'Naukri',   domain: 'naukri.com',   homeUrl: 'https://www.naukri.com/mnjuser/homepage' },
  indeed:   { key: 'indeed',   label: 'Indeed',   domain: 'indeed.com',   homeUrl: 'https://in.indeed.com/' },
};

export const PLATFORM_KEYS = Object.keys(PLATFORMS);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const randomSleep = (min, max) => sleep(min + Math.random() * (max - min));

function hostMatches(url, domain) {
  try {
    const host = new URL(url).hostname;
    return host === domain || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

export function platformFromUrl(url = '') {
  return PLATFORM_KEYS.find(k => hostMatches(url, PLATFORMS[k].domain)) || null;
}

function allPages(browser) {
  if (!browser) return [];
  return browser.contexts().flatMap(ctx => ctx.pages()).filter(p => !p.isClosed());
}

/** First open tab for a platform, or null. Ignores Indeed's apply sub-domain. */
export function findPlatformPage(browser, key) {
  const { domain } = PLATFORMS[key];
  return allPages(browser).find(p => {
    const url = p.url();
    return hostMatches(url, domain) && !url.includes('smartapply.indeed.com');
  }) || null;
}

/** Which platforms are open in Chrome right now. */
export async function getPlatformsStatus(browser) {
  return Promise.all(PLATFORM_KEYS.map(async key => {
    const page = findPlatformPage(browser, key);
    let tabTitle = null;
    if (page) tabTitle = await page.title().catch(() => null);
    return {
      key,
      label: PLATFORMS[key].label,
      open: Boolean(page),
      tabTitle,
      url: page ? page.url() : null,
    };
  }));
}

/** Opens the platform's home page in a new tab of the attached Chrome. */
export async function openPlatformTab(browser, key) {
  const ctx = browser.contexts()[0];
  if (!ctx) throw new Error('No Chrome window found');
  const page = await ctx.newPage();
  await page.goto(PLATFORMS[key].homeUrl, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
  await page.bringToFront().catch(() => {});
  return page;
}

// "Bengaluru, Karnataka (Remote / Hybrid)" -> "Bengaluru"
function primaryCity(location = '') {
  return location.split(/[,(/]/)[0].trim();
}

// Bot-protection / block pages (Akamai "Access Denied", Indeed "Blocked", Cloudflare checks)
export async function blockedReason(page) {
  const title = await page.title().catch(() => '');
  if (/access denied|^blocked\b|blocked - indeed|just a moment|attention required/i.test(title)) return 'verification_required';
  const body = await page.evaluate(() => (document.body?.innerText || '').slice(0, 2000)).catch(() => '');
  if (/verify you are human|additional verification required|security check|request blocked/i.test(body)) return 'verification_required';
  return null;
}

function blockedError(reason) {
  const err = new Error(reason);
  err.reason = reason;
  return err;
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/* ============================== NAUKRI ============================== */

// round: 0 for the first results pages, 1 for the pages after those, and so on
export async function scrapeNaukriJobs(page, query, location, maxJobs = 40, round = 0) {
  const city = primaryCity(location);
  const results = [];
  const seen = new Set();
  const maxPages = Math.max(1, Math.ceil(maxJobs / 20));
  const firstPage = 1 + round * maxPages;

  for (let pageNum = firstPage; pageNum < firstPage + maxPages && results.length < maxJobs; pageNum++) {
    if (page.isClosed()) break;
    const pathSlug = `${slugify(query)}-jobs${city ? `-in-${slugify(city)}` : ''}${pageNum > 1 ? `-${pageNum}` : ''}`;
    const url = `https://www.naukri.com/${pathSlug}?k=${encodeURIComponent(query)}${city ? `&l=${encodeURIComponent(city)}` : ''}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await page.waitForSelector('.srp-jobtuple-wrapper, article.jobTuple, .cust-job-tuple', { timeout: 12000 }).catch(() => {});
    await randomSleep(1200, 2000);
    if (/nlogin|login\.naukri/i.test(page.url())) throw blockedError('login_required');
    const blocked = await blockedReason(page);
    if (blocked) throw blockedError(blocked);

    const cards = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('.srp-jobtuple-wrapper, article.jobTuple, .cust-job-tuple'));
      return nodes.map((card, idx) => {
        const titleEl = card.querySelector('a.title, .title a, a[class*="title"]');
        const companyEl = card.querySelector('a.comp-name, .comp-name, a.subTitle, [class*="comp-name"]');
        const locEl = card.querySelector('.locWdth, .loc-wrap .loc, .location, span.loc, [class*="loc"] span');
        const salEl = card.querySelector('.sal-wrap span, .salary, [class*="sal"] span');
        const href = titleEl?.getAttribute('href') || '';
        const dataId = card.getAttribute('data-job-id') || '';
        const idMatch = href.match(/(\d{9,})/);
        return {
          rawId: dataId || (idMatch ? idMatch[1] : `${idx}-${(titleEl?.innerText || '').slice(0, 20)}`),
          title: titleEl?.innerText?.trim() || '',
          company: companyEl?.innerText?.trim() || '',
          location: locEl?.innerText?.trim()?.split('\n')[0] || '',
          salary: salEl?.innerText?.trim() || '',
          url: href.startsWith('http') ? href : (href ? `https://www.naukri.com${href}` : ''),
        };
      }).filter(c => c.title && c.url);
    }).catch(() => []);

    let added = 0;
    for (const c of cards) {
      const id = `naukri-${c.rawId}`;
      if (seen.has(id) || results.length >= maxJobs) continue;
      seen.add(id);
      added++;
      results.push({
        id,
        title: c.title,
        company: c.company || 'Unknown company',
        location: c.location || city || '',
        salary: c.salary || 'Not disclosed',
        url: c.url,
        platform: 'naukri',
        easyApply: true,
        stepsTotal: 2,
        stepsCompleted: 0,
      });
    }
    if (added === 0) break;
  }
  return results;
}


/* ============================== INDEED ============================== */

function indeedOrigin(page) {
  try {
    const u = new URL(page.url());
    if (u.hostname.endsWith('indeed.com') && !u.hostname.startsWith('smartapply') && !u.hostname.startsWith('secure')) return u.origin;
  } catch { /* fall through */ }
  return 'https://in.indeed.com';
}

export async function indeedBlocked(page) {
  if (/secure\.indeed\.com\/auth|\/account\/login/i.test(page.url())) return 'login_required';
  return blockedReason(page);
}

export async function scrapeIndeedJobs(page, query, location, maxJobs = 40, round = 0) {
  const origin = indeedOrigin(page);
  const city = primaryCity(location);
  const results = [];
  const seen = new Set();
  const maxPages = Math.max(1, Math.ceil(maxJobs / 15));
  const firstPage = round * maxPages;

  for (let pageNum = firstPage; pageNum < firstPage + maxPages && results.length < maxJobs; pageNum++) {
    if (page.isClosed()) break;
    // sc=0kf:attr(DSQF7); is Indeed's "Easily apply" filter
    const url = `${origin}/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(city)}&sc=0kf%3Aattr%28DSQF7%29%3B&sort=date&start=${pageNum * 10}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await page.waitForSelector('.job_seen_beacon, [data-jk]', { timeout: 12000 }).catch(() => {});
    await randomSleep(1500, 2500);

    const blocked = await indeedBlocked(page);
    if (blocked) throw blockedError(blocked);

    const cards = await page.evaluate((originArg) => {
      const nodes = Array.from(document.querySelectorAll('.job_seen_beacon, .cardOutline, .resultContent'));
      const out = [];
      for (const card of nodes) {
        const link = card.querySelector('a[data-jk], h2.jobTitle a');
        const jk = link?.getAttribute('data-jk') || (link?.getAttribute('href') || '').match(/jk=([a-f0-9]+)/i)?.[1];
        if (!jk) continue;
        const titleEl = card.querySelector('h2.jobTitle span[title], h2.jobTitle a span, h2.jobTitle');
        const companyEl = card.querySelector('[data-testid="company-name"], .companyName');
        const locEl = card.querySelector('[data-testid="text-location"], .companyLocation');
        const salEl = card.querySelector('[data-testid="attribute_snippet_testid"], .salary-snippet-container');
        out.push({
          jk,
          title: titleEl?.innerText?.trim() || '',
          company: companyEl?.innerText?.trim() || '',
          location: locEl?.innerText?.trim() || '',
          salary: salEl?.innerText?.trim() || '',
          url: `${originArg}/viewjob?jk=${jk}`,
        });
      }
      return out.filter(c => c.title);
    }, origin).catch(() => []);

    let added = 0;
    for (const c of cards) {
      const id = `indeed-${c.jk}`;
      if (seen.has(id) || results.length >= maxJobs) continue;
      seen.add(id);
      added++;
      results.push({
        id,
        title: c.title,
        company: c.company || 'Unknown company',
        location: c.location || city || '',
        salary: c.salary || 'Not disclosed',
        url: c.url,
        platform: 'indeed',
        easyApply: true,
        stepsTotal: 4,
        stepsCompleted: 0,
      });
    }
    if (added === 0) break;
  }
  return results;
}

// Fills empty text fields whose label we recognise; returns labels of required fields left empty.


export { randomSleep };
