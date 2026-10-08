/**
 * LinkedIn job search via the public job-listing feed (the one LinkedIn's
 * logged-out job pages use). It returns plain HTML cards with stable markup,
 * unlike the signed-in /jobs/search-results/ page whose classes are obfuscated.
 * Fetched from inside the user's LinkedIn tab, parsed here.
 */
const decode = (s = '') => s
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();

const field = (block, cls) => {
  const m = block.match(new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)</`, 'i'));
  return m ? decode(m[1]) : '';
};

export function parseGuestJobs(html) {
  const jobs = [];
  const parts = html.split(/data-entity-urn="urn:li:jobPosting:/).slice(1);
  for (const part of parts) {
    const id = part.match(/^(\d+)/)?.[1];
    if (!id) continue;
    jobs.push({
      id,
      title: field(part, 'base-search-card__title'),
      company: field(part, 'base-search-card__subtitle'),
      location: field(part, 'job-search-card__location'),
      salary: field(part, 'job-search-card__salary-info'),
    });
  }
  return jobs.filter(j => j.title);
}

/** Fetches one page (10 jobs) of Easy Apply listings. `page` must be a LinkedIn tab. */
// LinkedIn's experience-level filter (f_E) codes
const EXPERIENCE_CODES = { internship: 1, 'entry level': 2, associate: 3, 'mid-senior level': 4, director: 5, executive: 6 };

/** f_E value for the chosen levels, e.g. ['Entry level', 'Associate'] -> "2,3" ('' = any level). */
export function experienceFilter(levels) {
  const list = (Array.isArray(levels) ? levels : [levels]).map(l => EXPERIENCE_CODES[String(l || '').toLowerCase()]).filter(Boolean);
  return [...new Set(list)].sort().join(',');
}

export async function fetchGuestJobs(page, { keywords, location, start = 0, experience = '' }) {
  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location || '')}&f_AL=true&sortBy=DD&start=${start}${experience ? `&f_E=${encodeURIComponent(experience)}` : ''}`;
  const html = await page.evaluate(async (u) => {
    const res = await fetch(u, { credentials: 'omit' });
    return res.ok ? res.text() : '';
  }, url).catch(() => '');
  return parseGuestJobs(html);
}
