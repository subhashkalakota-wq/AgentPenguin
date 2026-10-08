/**
 * Multi-platform support: LinkedIn, Naukri, Indeed.
 *
 * - Detects which platforms are open as tabs in the CDP-attached Chrome.
 * - Scrapes job listings and applies on Naukri and Indeed.
 *   (LinkedIn keeps using scraper.js + playwrightApplier.js.)
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
async function blockedReason(page) {
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

export async function applyNaukriJob(page, job, profile, options = {}, onProgress = () => {}) {
  if (!page || page.isClosed()) return { success: false, reason: 'tab_closed' };
  onProgress({ type: 'playwright', tag: 'NAUKRI OPEN', message: `Opening Naukri job: ${job.company} — "${job.title}"` });

  await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await randomSleep(1800, 2800);
  if (page.isClosed()) return { success: false, reason: 'tab_closed' };
  if (/nlogin|login\.naukri/i.test(page.url())) return { success: false, reason: 'login_required' };
  const blockedJob = await blockedReason(page);
  if (blockedJob) return { success: false, reason: blockedJob };

  const state = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const text = (el) => (el.innerText || '').trim();
    return {
      alreadyApplied: buttons.some(b => /^applied$/i.test(text(b))) || Boolean(document.querySelector('#already-applied')),
      external: Boolean(document.querySelector('#company-site-button')) || buttons.some(b => /apply on company site/i.test(text(b))),
      hasApply: Boolean(document.querySelector('#apply-button')) || buttons.some(b => /^apply$/i.test(text(b))),
      loginToApply: buttons.some(b => /(login|register) to apply/i.test(text(b))),
    };
  }).catch(() => ({}));

  if (state.loginToApply) return { success: false, reason: 'login_required' };
  if (state.alreadyApplied) {
    onProgress({ type: 'warn', tag: 'NAUKRI SKIP', message: `Already applied to ${job.company} on Naukri.` });
    return { success: false, reason: 'already_applied' };
  }
  if (state.external || !state.hasApply) {
    onProgress({ type: 'warn', tag: 'NAUKRI EXTERNAL', message: `${job.company} uses an external application site. Added to Needs review.` });
    return { success: false, reason: 'external_apply' };
  }

  const applyBtn = page.locator('#apply-button, button.apply-button').first();
  const fallbackBtn = page.getByRole('button', { name: /^apply$/i }).first();
  const btn = (await applyBtn.count()) ? applyBtn : fallbackBtn;
  await btn.click({ timeout: 8000 }).catch(() => {});
  onProgress({ type: 'playwright', tag: 'NAUKRI APPLY', message: `Clicked Apply for ${job.company}.` });
  await randomSleep(2500, 3500);

  if (/nlogin|login\.naukri/i.test(page.url())) return { success: false, reason: 'login_required' };

  const after = await page.evaluate(() => {
    const body = document.body.innerText || '';
    const buttons = Array.from(document.querySelectorAll('button, a')).map(b => (b.innerText || '').trim());
    return {
      success: /successfully applied|applied successfully|application (has been )?sent/i.test(body) || buttons.some(t => /^applied$/i.test(t)),
      questionnaire: Boolean(document.querySelector('[class*="chatbot_Drawer"], .chatbot_DrawerContentWrapper, [class*="chatbot"]')),
    };
  }).catch(() => ({}));

  if (after.success) {
    onProgress({ type: 'success', tag: 'NAUKRI APPLIED', message: `Applied to ${job.company} — "${job.title}" on Naukri.` });
    return { success: true, pacingDelaySec: options.pacingDelaySec };
  }
  if (after.questionnaire) {
    onProgress({ type: 'warn', tag: 'NAUKRI QUESTIONS', message: `${job.company} asks recruiter questions. Added to Needs review so you can answer them yourself.` });
    await page.keyboard.press('Escape').catch(() => {});
    return { success: false, reason: 'custom_screening_questions_needs_review' };
  }
  onProgress({ type: 'warn', tag: 'NAUKRI UNCONFIRMED', message: `Could not confirm the application to ${job.company}. Added to Needs review.` });
  return { success: false, reason: 'unconfirmed' };
}

/* ============================== INDEED ============================== */

function indeedOrigin(page) {
  try {
    const u = new URL(page.url());
    if (u.hostname.endsWith('indeed.com') && !u.hostname.startsWith('smartapply') && !u.hostname.startsWith('secure')) return u.origin;
  } catch { /* fall through */ }
  return 'https://in.indeed.com';
}

async function indeedBlocked(page) {
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
async function fillIndeedStep(applyPage, profile) {
  const nameParts = (profile.name || '').trim().split(/\s+/);
  const values = {
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    fullName: profile.name || '',
    email: profile.email || '',
    phone: (profile.phone || '').replace(/[^\d+]/g, ''),
    city: (profile.location || '').split(/[,(/]/)[0].trim(),
    experience: profile.experienceYears != null ? String(profile.experienceYears) : '',
  };
  return applyPage.evaluate((v) => {
    const labelFor = (el) => {
      const id = el.getAttribute('id');
      const lbl = (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) || el.closest('label');
      return `${el.getAttribute('aria-label') || ''} ${lbl?.innerText || ''} ${el.getAttribute('name') || ''}`.toLowerCase();
    };
    const setValue = (el, value) => {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const missing = [];
    const fields = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input:not([type]), textarea'))
      .filter(el => el.offsetParent !== null && !el.disabled);
    for (const el of fields) {
      if (el.value) continue;
      const l = labelFor(el);
      let value = '';
      if (/first name/.test(l)) value = v.firstName;
      else if (/last name|surname/.test(l)) value = v.lastName;
      else if (/full name|^\s*name|your name/.test(l)) value = v.fullName;
      else if (/e-?mail/.test(l)) value = v.email;
      else if (/phone|mobile/.test(l)) value = v.phone;
      else if (/city|location/.test(l)) value = v.city;
      else if (/years? of (total )?experience/.test(l) && el.type === 'number') value = v.experience;
      if (value) setValue(el, value);
      else if (el.required || el.getAttribute('aria-required') === 'true') missing.push(l.trim().slice(0, 60) || 'unlabelled field');
    }
    // Required radio groups / selects with nothing chosen
    const radioNames = new Set(Array.from(document.querySelectorAll('input[type="radio"]')).filter(r => r.offsetParent !== null).map(r => r.name));
    for (const name of radioNames) {
      const group = Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`));
      if (!group.some(r => r.checked) && group.some(r => r.required || r.getAttribute('aria-required') === 'true')) missing.push(`choice: ${name}`);
    }
    for (const sel of Array.from(document.querySelectorAll('select')).filter(s => s.offsetParent !== null)) {
      if (!sel.value && (sel.required || sel.getAttribute('aria-required') === 'true')) missing.push(labelFor(sel).trim().slice(0, 60) || 'dropdown');
    }
    return missing;
  }, values).catch(() => []);
}

export async function applyIndeedJob(page, job, profile, options = {}, onProgress = () => {}) {
  if (!page || page.isClosed()) return { success: false, reason: 'tab_closed' };
  onProgress({ type: 'playwright', tag: 'INDEED OPEN', message: `Opening Indeed job: ${job.company} — "${job.title}"` });

  await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await randomSleep(1800, 2800);
  if (page.isClosed()) return { success: false, reason: 'tab_closed' };
  const blocked = await indeedBlocked(page);
  if (blocked) return { success: false, reason: blocked };

  const applyBtn = page.locator('#indeedApplyButton, button[id*="indeedApplyButton"], button[aria-label*="Apply now"]').first();
  if (!(await applyBtn.count())) {
    const applied = await page.getByText(/^applied$/i).count().catch(() => 0);
    if (applied) return { success: false, reason: 'already_applied' };
    onProgress({ type: 'warn', tag: 'INDEED EXTERNAL', message: `${job.company} applies on the company site. Added to Needs review.` });
    return { success: false, reason: 'external_apply' };
  }

  // Indeed Apply opens either in this tab or a new one
  const popupPromise = page.context().waitForEvent('page', { timeout: 7000 }).catch(() => null);
  await applyBtn.click({ timeout: 8000 }).catch(() => {});
  const popup = await popupPromise;
  const applyPage = popup || page;
  await applyPage.waitForLoadState('domcontentloaded').catch(() => {});
  await randomSleep(2000, 3000);
  onProgress({ type: 'playwright', tag: 'INDEED APPLY', message: `Started Indeed Apply for ${job.company}.` });

  const finish = async (result) => {
    if (popup && !popup.isClosed()) await popup.close().catch(() => {});
    return result;
  };

  for (let step = 0; step < 10; step++) {
    if (applyPage.isClosed()) return finish({ success: false, reason: 'tab_closed' });
    const stepBlocked = await indeedBlocked(applyPage);
    if (stepBlocked) return finish({ success: false, reason: stepBlocked });

    const body = await applyPage.evaluate(() => document.body?.innerText || '').catch(() => '');
    if (/application has been submitted|your application has been sent/i.test(body)) {
      onProgress({ type: 'success', tag: 'INDEED APPLIED', message: `Applied to ${job.company} — "${job.title}" on Indeed.` });
      return finish({ success: true, pacingDelaySec: options.pacingDelaySec });
    }

    // Upload resume when the step offers a file input
    const fileInput = applyPage.locator('input[type="file"]').first();
    if (profile.resumePath && (await fileInput.count()) && /resume|cv/i.test(body)) {
      await fileInput.setInputFiles(profile.resumePath).catch(() => {});
      onProgress({ type: 'playwright', tag: 'INDEED RESUME', message: `Attached ${profile.resumeFile || 'resume'}.` });
      await randomSleep(1500, 2200);
    }

    const missing = await fillIndeedStep(applyPage, profile);
    if (missing.length) {
      onProgress({ type: 'warn', tag: 'INDEED QUESTIONS', message: `${job.company} needs answers the agent can't fill (${missing.slice(0, 3).join('; ')}). Added to Needs review.` });
      return finish({ success: false, reason: 'custom_screening_questions_needs_review' });
    }

    const submit = applyPage.getByRole('button', { name: /submit (your )?application/i }).first();
    if (await submit.count()) {
      await submit.click({ timeout: 8000 }).catch(() => {});
      await randomSleep(2500, 3500);
      continue;
    }
    const next = applyPage.getByRole('button', { name: /^(continue|next|review your application)/i }).first();
    if (await next.count()) {
      await next.click({ timeout: 8000 }).catch(() => {});
      await randomSleep(1800, 2600);
      continue;
    }
    break;
  }

  onProgress({ type: 'warn', tag: 'INDEED UNCONFIRMED', message: `Could not finish the Indeed application for ${job.company}. Added to Needs review.` });
  return finish({ success: false, reason: 'unconfirmed' });
}

export { randomSleep };
