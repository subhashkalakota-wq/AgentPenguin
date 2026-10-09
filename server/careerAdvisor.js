/**
 * Role suggestions from a person's skills, for people who don't know which job to aim for.
 * The AI ranks realistic roles using the skills they picked (and how they scored on Penguin
 * skill tests), their resume and coding-profile signals; each role then gets a live count
 * of new openings in their city so they can see demand before adding it to their search.
 */
import { llmJson, hasLLM } from './llm.js';
import { openingsCount } from './marketInsights.js';

/**
 * @param input { skills: [{ name, level?, score? }], resume, coding, location, experienceYears }
 * @returns [{ title, fit, why, matched, missing, level, today, week, url }]
 */
export async function suggestRoles({ skills = [], resume = null, coding = null, location = '', experienceYears = null } = {}) {
  if (!hasLLM()) throw new Error('No AI service is configured on the server, so roles can’t be suggested right now.');
  if (!skills.length && !resume?.skills?.length) throw new Error('Add a few skills first.');
  const city = String(location || '').split(/[,(/|]/)[0].trim() || 'India';
  const out = await llmJson(
    'You are a career advisor for job seekers in India. Suggest 7 job roles this person can realistically apply to now, '
      + 'based ONLY on their skills (with levels / test scores), resume and coding profiles. Mix: 4 strong fits, 2 good fits, 1 stretch. '
      + 'Use common job-board titles (e.g. "Java Developer", "Data Analyst", "Frontend Developer", "QA Engineer"), not invented ones, '
      + 'and keep seniority out of the title (no brackets) — it goes in "level". '
      + 'Match seniority to their experience (freshers: junior / trainee / intern / associate roles). '
      + 'Each skill may have "score": their Penguin skill-test result in percent. Weigh skills by it: 70%+ are real strengths, '
      + '40-69% are partial, under 40% are not job-ready yet (list them in "missing", not "matched", when a role depends on them). '
      + 'Untested skills (score null) count less than tested strong ones. "fit" must reflect the test results. '
      + 'Never base a role (including the stretch one) on a skill they scored under 40% on. '
      + 'Reply with JSON {"roles":[{"title": string, "fit": integer 0-100, "why": string (one sentence), "matched": [string] (their skills that fit), '
      + '"missing": [string] (max 3 skills to learn for this role), "level": "Internship"|"Entry level"|"Associate"|"Mid-Senior level"}]}.',
    JSON.stringify({
      skills: skills.slice(0, 40),
      experienceYears: experienceYears ?? resume?.totalExperienceYears ?? null,
      education: resume?.education || null,
      resumeSummary: resume?.summary || null,
      coding,
    }),
  );
  const roles = (out?.roles || [])
    .filter(r => r?.title)
    .map(r => ({
      // Plain search title: "React Developer (Entry level)" → "React Developer"
      title: String(r.title).replace(/\s*[([][^)\]]*[)\]]\s*/g, ' ').trim().slice(0, 60),
      fit: Math.max(0, Math.min(100, Math.round(Number(r.fit) || 0))),
      why: String(r.why || ''),
      matched: (r.matched || []).map(String).slice(0, 6),
      missing: (r.missing || []).map(String).slice(0, 3),
      level: r.level || null,
    }))
    .filter((r, i, all) => r.title && all.findIndex(x => x.title.toLowerCase() === r.title.toLowerCase()) === i)
    .slice(0, 8);
  // Demand: new LinkedIn openings for each role in the city
  const withDemand = await Promise.all(roles.map(async (r) => ({
    ...r,
    today: await openingsCount(r.title, city, 'r86400').catch(() => null),
    week: await openingsCount(r.title, city, 'r604800').catch(() => null),
    url: `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(r.title)}&location=${encodeURIComponent(city)}&f_TPR=r604800`,
  })));
  return { city, roles: withDemand.sort((a, b) => b.fit - a.fit) };
}
