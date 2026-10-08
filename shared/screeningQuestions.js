/**
 * Questions job platforms commonly ask during applications. Users answer them once
 * in their profile; the agent reuses the answers (matched by `match`) when a form
 * asks something similar. Shared by the frontend (profile form) and server (agent).
 */
export const SCREENING_QUESTIONS = [
  {
    key: 'whyHire', label: 'Why should we hire you?', type: 'textarea', required: true,
    placeholder: 'e.g. 5 years building React apps used by 2M users; I ship fast and own quality end to end…',
    match: /why (should|would|do) (we|i) hire|why are you (a |the )?(good|right|best) (fit|candidate)|what makes you (a |the )?(good|right|ideal)|why should we (choose|select|pick) you/i,
  },
  {
    key: 'aboutYou', label: 'Tell us about yourself', type: 'textarea', required: true,
    placeholder: 'A 3–4 line summary of your experience, skills and what you are looking for.',
    match: /tell (us|me) (a bit |a little )?about yourself|about yourself|introduce yourself|describe yourself|professional summary|profile summary|brief summary|cover (letter|note)|additional information/i,
  },
  {
    key: 'whyRole', label: 'Why are you interested in this role / company?', type: 'textarea', required: true,
    placeholder: 'What draws you to roles like this and the kind of companies you want to join.',
    match: /why (do )?you want|why (are you (interested|applying)|this (role|company|position|job|opportunity))|why (join|apply|work (at|for|with))|interest(ed)? in (this|our|the) (role|company|position)|what (interests|excites|attracts) you|motivat/i,
  },
  {
    key: 'currentCtc', label: 'Current CTC (₹ per year)', type: 'number', required: true,
    placeholder: 'e.g. 1800000',
    match: /current (ctc|salary|compensation|package|annual)|present (ctc|salary)|(ctc|salary) currently/i,
  },
  {
    key: 'currentCompany', label: 'Current / last company', type: 'text', required: false,
    match: /(current|present|last|most recent) (company|employer|organi[sz]ation)/i,
  },
  {
    key: 'currentTitle', label: 'Current job title', type: 'text', required: false,
    match: /(current|present) (designation|job title|title|role|position)/i,
  },
  {
    key: 'strengths', label: 'Your key strengths', type: 'textarea', required: false,
    match: /strength/i,
  },
  {
    key: 'achievement', label: 'A project or achievement you are proud of', type: 'textarea', required: false,
    match: /achievement|proud|accomplishment|(challenging|recent|best) project|project you (worked|built|led)/i,
  },
  {
    key: 'preferredLocations', label: 'Preferred work locations', type: 'text', required: false,
    match: /preferred (work )?(location|city|cities)|location preference|where would you (like|prefer) to work/i,
  },
  {
    key: 'careerGap', label: 'Career gap explanation (leave blank if none)', type: 'textarea', required: false,
    match: /(career |employment )?gap|break in (your )?(career|employment)/i,
  },
];

/** Required questions the user hasn't answered yet (labels). */
export function missingScreeningAnswers(answers = {}) {
  return SCREENING_QUESTIONS.filter(q => q.required && !String(answers[q.key] ?? '').trim()).map(q => q.label);
}

/** Saved answer for a platform's question text, or null. */
export function savedAnswerFor(questionText, answers = {}) {
  for (const q of SCREENING_QUESTIONS) {
    const value = String(answers[q.key] ?? '').trim();
    if (value && q.match.test(questionText)) return { key: q.key, value, type: q.type };
  }
  return null;
}
