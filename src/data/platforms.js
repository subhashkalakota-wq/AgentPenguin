// Job platforms Agent Penguin can apply on
export const PLATFORMS = [
  { key: 'linkedin', label: 'LinkedIn', short: 'in', domain: 'linkedin.com', note: 'Easy Apply jobs' },
  { key: 'naukri',   label: 'Naukri',   short: 'N',  domain: 'naukri.com',   note: 'Quick-apply jobs' },
  { key: 'indeed',   label: 'Indeed',   short: 'i',  domain: 'indeed.com',   note: '“Easily apply” jobs' },
];

export const PLATFORM_LABELS = Object.fromEntries(PLATFORMS.map(p => [p.key, p.label]));

// Jobs saved before multi-platform support have no `platform`; derive it from the URL
export function platformOf(job) {
  if (job?.platform) return job.platform;
  try {
    const host = new URL(job?.url || '').hostname;
    const match = PLATFORMS.find(p => host === p.domain || host.endsWith(`.${p.domain}`));
    if (match) return match.key;
  } catch { /* no/invalid url */ }
  return 'linkedin';
}
