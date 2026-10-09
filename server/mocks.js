/**
 * Penguin mocks: AI mock interviews (question → answer → score and feedback → summary)
 * and AI mock tests (timed multiple-choice questions with explanations).
 * Uses the same AI providers as the rest of the agent (llm.js).
 */
import { llmJson, hasLLM } from './llm.js';

const KINDS = {
  technical: 'technical interview (concepts, problem solving, code reasoning — no long code writing)',
  hr: 'HR interview (motivation, strengths, career goals, salary and joining expectations)',
  behavioral: 'behavioural interview (STAR-style situations: teamwork, conflict, ownership, failure)',
  'system-design': 'system design interview (scaling, trade-offs, components; pitched to the level)',
};
const LEVELS = {
  fresher: 'fresher / final-year student — focus on fundamentals: OOP, core language concepts, DSA basics, DBMS/SQL, OS and networks basics, and their projects',
  junior: '1–3 years of experience', mid: '3–6 years of experience', senior: '6+ years of experience',
};

function candidateBrief(profile = {}) {
  const ra = profile.resumeAnalysis || {};
  return JSON.stringify({
    skills: (ra.skills || []).map(s => s.name).slice(0, 25),
    experienceYears: ra.totalExperienceYears ?? profile.experienceYears ?? null,
    education: (ra.education || []).map(e => `${e.degree} ${e.field || ''} (${e.status})`).slice(0, 2),
    summary: ra.summary || profile.headline || '',
  });
}

const need = () => { if (!hasLLM()) throw new Error('No AI service is configured on the server (GROQ_API_KEY, OPENAI_API_KEY or GEMINI_API_KEY).'); };

/** Next interview question, different from the ones already asked. */
export async function nextInterviewQuestion({ role, kind = 'technical', level = 'fresher', asked = [], profile }) {
  need();
  const out = await llmJson(
    `You are a friendly but rigorous interviewer at an Indian tech company running a ${KINDS[kind] || KINDS.technical} for a ${role} candidate (${LEVELS[level] || level}). `
      + 'Ask ONE clear question at a time, the kind real interviewers ask for this role and level. Use the candidate\'s resume skills where it fits. '
      + 'Do not repeat or closely rephrase earlier questions. Vary topics. '
      + 'Reply with JSON {"question": string, "topic": string (2-4 words), "hint": string (one short line on what a good answer covers)}.',
    `Candidate: ${candidateBrief(profile)}\nAlready asked: ${JSON.stringify(asked.slice(-12))}\nVariation: ${Math.random().toString(36).slice(2, 8)}`,
  );
  if (!out?.question) throw new Error("The AI didn't return a question. Try again.");
  return { question: String(out.question), topic: String(out.topic || ''), hint: String(out.hint || '') };
}

/** Scores one answer out of 10 with specific feedback and a model answer. */
export async function evaluateAnswer({ role, kind = 'technical', level = 'fresher', question, answer }) {
  need();
  if (!String(answer || '').trim()) {
    return { score: 0, verdict: 'No answer', strengths: [], improve: ['Give an answer, even a partial one — interviewers credit clear reasoning.'], modelAnswer: '' };
  }
  const out = await llmJson(
    `You evaluate a candidate's answer in a ${KINDS[kind] || KINDS.technical} for a ${role} (${LEVELS[level] || level}). Be fair, specific and encouraging, and judge against what is expected at this level. `
      + 'Reply with JSON {"score": integer 0-10, "verdict": "Excellent"|"Good"|"Average"|"Needs work", "strengths": [string] (1-3, specific), '
      + '"improve": [string] (1-3, specific and actionable), "modelAnswer": string (a strong answer in under 120 words)}.',
    `Question: ${question}\nCandidate's answer: ${String(answer).slice(0, 3000)}`,
  );
  const score = Math.max(0, Math.min(10, Math.round(Number(out?.score) || 0)));
  return {
    score,
    verdict: out?.verdict || (score >= 8 ? 'Excellent' : score >= 6 ? 'Good' : score >= 4 ? 'Average' : 'Needs work'),
    strengths: (out?.strengths || []).map(String).slice(0, 3),
    improve: (out?.improve || []).map(String).slice(0, 3),
    modelAnswer: String(out?.modelAnswer || ''),
  };
}

/** Overall result for a finished mock interview. */
export async function interviewSummary({ role, kind = 'technical', rounds = [] }) {
  need();
  const avg = rounds.length ? rounds.reduce((n, r) => n + (Number(r.score) || 0), 0) / rounds.length : 0;
  const out = await llmJson(
    'You summarise a mock interview for the candidate. Be honest and encouraging. '
      + 'Reply with JSON {"headline": string (one sentence), "strengths": [string] (2-3), "focusAreas": [string] (2-3, what to practise next), "readiness": "Ready"|"Almost ready"|"Keep practising"}.',
    `Role: ${role}. Interview type: ${kind}. Average score: ${avg.toFixed(1)}/10.\nRounds: ${JSON.stringify(rounds.map(r => ({ q: r.question, score: r.score, improve: r.improve })))}`,
  ).catch(() => null);
  return {
    average: Number(avg.toFixed(1)),
    headline: out?.headline || `You averaged ${avg.toFixed(1)}/10.`,
    strengths: (out?.strengths || []).map(String).slice(0, 3),
    focusAreas: (out?.focusAreas || []).map(String).slice(0, 3),
    readiness: out?.readiness || (avg >= 7.5 ? 'Ready' : avg >= 5.5 ? 'Almost ready' : 'Keep practising'),
  };
}

/** A multiple-choice test: [{ question, options[4], answer (index), explanation }]. */
export async function generateTest({ topic, level = 'medium', count = 10 }) {
  need();
  // 3+ questions: the Penguin Profile skill test asks a few per skill
  const n = Math.max(3, Math.min(25, Number(count) || 10));
  // "mixed": about 30% easy, 40% medium, 30% hard, each labelled, for difficulty-aware
  // (Item Response Theory) scoring in the Skill Test
  const mixed = level === 'mixed';
  const easy = Math.round(n * 0.3);
  const hard = Math.round(n * 0.3);
  const plan = mixed
    ? `Write ${easy} easy, ${n - easy - hard} medium and ${hard} hard questions, in random order, and label each with "difficulty".`
    : `Write ${n} ${level} questions.`;
  const out = await llmJson(
    `You write multiple-choice questions for Indian campus and job placement tests (like TCS NQT, Infosys, Wipro, AMCAT) and tech interviews. `
      + `Topic: ${topic}. Each question has exactly 4 options and exactly one correct answer. Check each answer carefully before replying; for aptitude, compute the result. `
      + 'Easy = basic definitions and syntax; medium = applying it to a small problem; hard = tricky cases, internals or multi-step reasoning. '
      + 'Mix sub-topics; no trick questions; keep questions under 60 words. '
      + 'Reply with JSON {"questions":[{"question": string, "options": [4 strings], "answer": integer 0-3, "difficulty": "easy"|"medium"|"hard", "explanation": string (1-3 sentences)}]}.',
    `${plan} Variation: ${Math.random().toString(36).slice(2, 8)}`,
  );
  const questions = (out?.questions || [])
    .filter(q => q && q.question && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(Number(q.answer)) && Number(q.answer) >= 0 && Number(q.answer) < 4)
    .map(q => ({
      question: String(q.question),
      options: q.options.map(String),
      answer: Number(q.answer),
      difficulty: mixed ? (['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium') : level,
      explanation: String(q.explanation || ''),
    }))
    .slice(0, n);
  if (questions.length < Math.min(5, n)) throw new Error("The AI couldn't write this test right now. Try again.");
  return { topic, level, questions };
}
