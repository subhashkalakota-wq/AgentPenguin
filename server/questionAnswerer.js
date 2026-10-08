/**
 * Answers job-application screening questions from the candidate profile.
 *
 * 1. Rules for common questions (experience, visa, notice period, salary, links…)
 * 2. An LLM (OpenAI, else Gemini — see llm.js) for anything else — must pick from the
 *    given options and may decline when the profile doesn't support an answer.
 * 3. Otherwise returns null so the caller can flag the job for manual review
 *    instead of submitting a made-up answer.
 *
 * answerQuestion({ question, type, options }, profile) -> string | null
 *   type: 'text' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox'
 *   For select/radio the returned string is one of `options` exactly.
 */

import { llmJson, hasLLM } from './llm.js';
import { SCREENING_QUESTIONS, savedAnswerFor } from '../shared/screeningQuestions.js';

const cache = new Map();

const norm = (s = '') => s.toLowerCase().replace(/\s+/g, ' ').trim();
const digits = (s = '') => String(s).replace(/[^0-9]/g, '');

function pickOption(options, ...wanted) {
  for (const w of wanted) {
    const n = norm(w);
    if (!n) continue;
    const hit = options.find(o => norm(o) === n) || options.find(o => norm(o).startsWith(n))
      || (n.length > 3 ? options.find(o => norm(o).includes(n) || n.includes(norm(o))) : null);
    if (hit) return hit;
  }
  return null;
}

// Rough annual number from strings like "₹22,00,000 / year (22 LPA)" or "22 LPA"
function salaryNumber(profile) {
  const raw = String(profile.salaryFloor || '');
  const lpa = raw.match(/(\d+(?:\.\d+)?)\s*lpa/i);
  if (lpa) return String(Math.round(parseFloat(lpa[1]) * 100000));
  const d = digits(raw.split('/')[0]);
  return d || null;
}

function noticeDays(profile) {
  const n = norm(profile.noticePeriod || '');
  if (!n || /immediate/.test(n)) return '0';
  const m = n.match(/(\d+)\s*(day|week|month)/);
  if (!m) return '30';
  const v = parseInt(m[1], 10);
  return String(m[2] === 'week' ? v * 7 : m[2] === 'month' ? v * 30 : v);
}

// Years of experience with a skill, according to the analysed resume (0 when not mentioned)
function resumeSkillYears(tech, ra) {
  const t = norm(tech).replace(/\b(js)\b/, 'javascript').replace(/[.]/g, '');
  const hit = (ra.skills || []).find(s => {
    const n = norm(s.name).replace(/[.]/g, '');
    return n === t || t.includes(n) || n.includes(t);
  });
  return hit ? Math.round(Number(hit.years) || 0) : 0;
}

function answerYears(value, type, options, isChoice) {
  if (type === 'number' || type === 'text') return String(value);
  if (isChoice) {
    const y = Number(value);
    return options.find(o => {
      const nums = o.match(/\d+/g)?.map(Number) || [];
      if (nums.length === 2) return y >= nums[0] && y <= nums[1];
      if (nums.length === 1 && /\+|more|above/i.test(o)) return y >= nums[0];
      if (nums.length === 1 && /less|under|below|fresher/i.test(o)) return y < nums[0];
      return nums.length === 1 && nums[0] === y;
    }) || (y === 0 ? pickOption(options, 'No', 'None', 'Fresher', '0') : null);
  }
  return null;
}

function ruleAnswer({ question, type, options = [] }, profile) {
  const q = norm(question);
  const isChoice = type === 'select' || type === 'radio';
  const yes = () => (isChoice ? pickOption(options, 'Yes') : 'Yes');
  const no = () => (isChoice ? pickOption(options, 'No') : 'No');
  const years = String(profile.experienceYears ?? '');
  const skills = (profile.skills || []).map(norm);

  // Sponsorship / visa (check before "authorized")
  if (/sponsor|visa/.test(q)) return profile.visaRequired === 'Yes' ? yes() : no();
  if (/authori[sz]ed|legally (able|permitted|eligible)|right to work|work permit|citizen/.test(q)) {
    return profile.workAuthorization === 'No' ? no() : yes();
  }

  // Experience — the analysed resume is the source of truth when available
  const ra = profile.resumeAnalysis;
  if (ra && /how many years|years of (work |professional |relevant |total )?experience|years experience|overall (it )?experience|total experience|work experience do you have|experience (do you have )?(with|in)/.test(q)) {
    const tech = q.match(/.*\b(?:with|in|using)\s+([a-z0-9+#. /-]{2,40}?)\??$/)?.[1];
    const generic = !tech || /^(total|overall|relevant|professional|the industry|this field|software|it|the it industry|industry)$/.test(tech.trim());
    const years = generic ? Math.round(ra.totalExperienceYears || 0) : resumeSkillYears(tech, ra);
    return answerYears(years, type, options, isChoice);
  }
  if (ra && /(have you|did you) (complete|completed|earn|earned|obtain)|do you (have|hold) a/.test(q) && /bachelor|degree|graduat|b\.?tech|master/.test(q)) {
    const wantsMaster = /master|m\.?tech|mba|post ?grad/.test(q);
    const done = (ra.education || []).some(e => e.status === 'completed' && (wantsMaster ? /master|m\.?tech|mba|m\.?s\b/i.test(e.degree) : /bachelor|b\.?tech|b\.?e\b|b\.?sc|b\.?s\b|master|m\.?tech/i.test(e.degree)));
    return done ? yes() : no();
  }

  // Current title / company from the resume (students: "Student" at their institution)
  if (ra && /^(your )?(job )?title$|current (job )?title|designation|your title|current role/.test(q)) {
    const studying = (ra.education || []).find(e => e.status === 'pursuing');
    return ra.currentTitle || (studying ? 'Student' : null);
  }
  if (ra && /^(your )?company( name)?$|current (company|employer)|employer name/.test(q)) {
    const studying = (ra.education || []).find(e => e.status === 'pursuing');
    return ra.currentCompany || (studying ? studying.institution : null);
  }

  // Experience (no resume analysis yet: fall back to profile)
  if (/how many years|years of (work |professional |relevant )?experience|years experience/.test(q)) {
    if (!years) return null;
    // "...experience with X": only claim experience for skills on the profile
    // the skill named after the LAST "with/in/using", e.g. "...experience do you have with Kubernetes?"
    const tech = q.match(/.*\b(?:with|in|using)\s+([a-z0-9+#. /-]{2,40}?)\??$/)?.[1];
    if (tech && !/^(total|overall|relevant|professional|the industry|this field|software)/.test(tech)) {
      const known = skills.some(s => tech.includes(s) || s.includes(tech.trim()));
      if (!known) return null; // let the LLM decide or flag for review
    }
    if (type === 'number' || type === 'text') return years;
    if (isChoice) {
      const y = Number(years);
      const ranged = options.find(o => {
        const nums = o.match(/\d+/g)?.map(Number) || [];
        if (nums.length === 2) return y >= nums[0] && y <= nums[1];
        if (nums.length === 1 && /\+|more|above/i.test(o)) return y >= nums[0];
        return nums.length === 1 && nums[0] === y;
      });
      return ranged || null;
    }
  }

  if (/notice period/.test(q)) return type === 'number' ? noticeDays(profile) : (isChoice ? null : (profile.noticePeriod || null));
  if (/(expected|desired|current).*(salary|ctc|compensation)|salary expectation|(ctc|salary) (in|per)/.test(q)) {
    const n = salaryNumber(profile);
    return type === 'number' ? n : (isChoice ? null : (n || profile.salaryFloor || null));
  }

  if (/relocat/.test(q)) return /remote only|no/i.test(profile.relocation || '') ? no() : yes();
  if (/commut|on-?site|in the office|hybrid|work from (the )?office/.test(q)) return yes();
  if (/bachelor|degree|graduat/.test(q) && /(have|completed|hold|possess)/.test(q)) return yes();
  if (/english/.test(q) && /proficien|level|fluent/.test(q)) {
    return isChoice ? pickOption(options, 'Professional', 'Fluent', 'Native', 'Advanced') : 'Professional';
  }
  if (/background check|drug (test|screen)|comfortable|willing|able to start|are you available|agree|consent|terms/.test(q)) return yes();

  // Self-identification: prefer "decline to answer" when offered
  if (/gender|race|ethnic|veteran|disabilit|pronoun|sexual orientation/.test(q)) {
    return isChoice ? pickOption(options, 'I don’t wish to answer', "I don't wish to answer", 'Decline to self identify', 'Prefer not to say', 'Prefer not to answer') : null;
  }

  // Contact & links
  if (/linkedin/.test(q)) return profile.linkedinUrl || null;
  if (/github/.test(q)) return profile.githubUrl || null;
  if (/portfolio|website|personal site/.test(q)) return profile.portfolioUrl || profile.githubUrl || null;
  if (/mobile|phone/.test(q)) return digits(profile.phone).slice(-10) || null;
  if (/\bcity\b|current location|where are you (based|located)/.test(q)) return (profile.location || '').split(/[,(/]/)[0].trim() || null;
  if (/first name/.test(q)) return (profile.name || '').split(' ')[0] || null;
  if (/last name|surname/.test(q)) return (profile.name || '').split(' ').slice(1).join(' ') || null;
  if (/full name|^name$/.test(q)) return profile.name || null;

  return null;
}

async function llmAnswer({ question, type, options = [] }, profile, { mustAnswer = false } = {}) {
  if (!hasLLM()) return null;
  const facts = {
    name: profile.name, headline: profile.headline, location: profile.location, experienceYears: profile.experienceYears,
    skills: profile.skills, workAuthorization: profile.workAuthorization, visaRequired: profile.visaRequired,
    expectedSalary: profile.salaryFloor, noticePeriod: profile.noticePeriod, degree: profile.degree, relocation: profile.relocation,
    linkedinUrl: profile.linkedinUrl, githubUrl: profile.githubUrl, portfolioUrl: profile.portfolioUrl,
    // Answers the candidate wrote in their profile, keyed by the question they answer
    resume: profile.resumeAnalysis ? {
      totalExperienceYears: profile.resumeAnalysis.totalExperienceYears,
      internshipMonths: profile.resumeAnalysis.internshipMonths,
      skills: profile.resumeAnalysis.skills,
      education: profile.resumeAnalysis.education,
      certifications: profile.resumeAnalysis.certifications,
      currentTitle: profile.resumeAnalysis.currentTitle,
      summary: profile.resumeAnalysis.summary,
      text: (profile.resumeAnalysis.resumeExcerpt || '').slice(0, 2500),
    } : undefined,
    savedAnswers: Object.fromEntries(SCREENING_QUESTIONS
      .filter(sq => String(profile.screeningAnswers?.[sq.key] ?? '').trim())
      .map(sq => [sq.label, profile.screeningAnswers[sq.key]])),
  };
  const out = await llmJson(
    'You fill in job application screening questions for a candidate, truthfully. The candidate\'s RESUME (facts.resume) is the source of truth; '
      + 'if a skill, tool, certification or experience is not in the resume, the answer is 0 / No. '
      + 'Use the other facts only for things a resume does not cover (salary, notice period, visa, relocation). '
      + 'Never invent employers, certifications, degrees or experience. '
      + 'Yes/No questions asking whether the candidate has something (a certification, a skill, a clearance) that is NOT in the facts: answer "No". '
      + 'Numeric questions about years of experience with a skill: if the skill is listed, or is a basic part of a listed skill (e.g. JavaScript, HTML and CSS for React; SQL for backend work), answer with experienceYears; if it is unrelated to the facts, answer null. '
      + 'Open-ended questions (motivation, summary, cover note): reuse or adapt the candidate\'s savedAnswers when relevant; otherwise write 2-3 sincere sentences grounded in the headline and skills, no made-up specifics. '
      + (mustAnswer
        ? 'This question is REQUIRED and the form cannot be sent without it, so you must give an answer: choose the most reasonable truthful option '
          + '(availability, comfort, willingness and consent questions: "Yes"; having a skill or credential not in the facts: "No"; numbers you cannot support: 0; '
          + 'text: a short honest answer grounded in the facts). Never return null. '
        : 'If the facts still do not support an answer, set "answer" to null. ')
      + 'For multiple choice, "answer" must be exactly one of the options. For number fields return only digits. Keep text answers under 300 characters. '
      + 'Reply with JSON: {"answer": string|null}.',
    `Candidate facts: ${JSON.stringify(facts)}\nQuestion: ${question}\nField type: ${type}${options.length ? `\nOptions: ${JSON.stringify(options)}` : ''}`
  );
  const answer = out?.answer;
  if (answer == null || answer === '') return null;
  if (options.length) return pickOption(options, String(answer));
  if (type === 'number') return digits(answer) || null;
  return String(answer).slice(0, 300);
}

// Last resort for REQUIRED fields so the application isn't blocked:
// choices -> "Yes" if offered, else the first option; experience numbers -> 0 (truthful
// for a skill not on the profile). Free-text stays unanswered (needs review).
function forcedAnswer({ question, type, options = [] }, profile) {
  if (options.length) {
    return pickOption(options, 'Yes') || options.find(o => !/^select|^choose|^--/i.test(o.trim())) || options[0];
  }
  if (type === 'number') {
    return /year|experience/i.test(question) ? '0' : (String(profile.experienceYears ?? '') || '0');
  }
  // Free text: a short, truthful line from the profile rather than leaving it blank
  return profile.resumeAnalysis?.summary || profile.headline || 'Please refer to my resume for details.';
}

/**
 * @param field   { question, type, options }
 * @param profile candidate profile (incl. screeningAnswers)
 * @param opts    { force } — fill required fields even without a confident answer
 * @returns { answer, source: 'profile' | 'rules' | 'ai' | 'auto-pick' } | null
 */
export async function answerQuestion(field, profile, { force = false } = {}) {
  const key = `${norm(field.question)}|${field.type}|${(field.options || []).join('/')}`;
  if (cache.has(key)) return cache.get(key);

  let result = null;
  const isChoice = field.type === 'select' || field.type === 'radio';

  // 1. The user's own saved answer for this kind of question
  const saved = isChoice ? null : savedAnswerFor(field.question, profile.screeningAnswers);
  if (saved) {
    const value = field.type === 'number' ? digits(saved.value) : saved.value;
    if (value) result = { answer: value, source: 'profile' };
  }
  // 2. Rules from profile facts
  if (!result) {
    const answer = ruleAnswer(field, profile);
    if (answer != null) result = { answer, source: 'rules' };
  }
  // 3. LLM (Groq / OpenAI / Gemini)
  if (!result) {
    const answer = await llmAnswer(field, profile);
    if (answer != null) result = { answer, source: 'ai' };
  }
  if (result) {
    cache.set(key, result);
    return result;
  }
  // 4. Required field: ask the AI again, this time insisting on an answer
  if (force) {
    const answer = await llmAnswer(field, profile, { mustAnswer: true }).catch(() => null);
    if (answer != null) return { answer, source: 'ai' };
  }
  // 5. Last resort for required fields so the application can continue (not cached)
  if (force) {
    const answer = forcedAnswer(field, profile);
    if (answer != null) return { answer, source: 'auto-pick' };
  }
  return null;
}
