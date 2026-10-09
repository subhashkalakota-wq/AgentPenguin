/**
 * Skill-test scoring with Item Response Theory (the Rasch / one-parameter logistic model).
 *
 *   P(correct | ability θ, question difficulty b) = 1 / (1 + e^-(θ - b))
 *
 * Ability θ is the Bayesian MAP estimate under a Normal(0, 2²) prior, found with
 * Newton–Raphson. The prior keeps all-right and all-wrong results finite and pulls short
 * tests towards the middle, so a perfect 3-question test isn't treated as proof of mastery.
 *
 * - score (0-100): the chance of answering a typical medium question correctly, so it reads
 *   like a percentage. It accounts for question difficulty: the same number right on a
 *   harder set of questions gives a higher score (in this model the number right per
 *   difficulty is what counts, not which particular questions).
 * - se: standard error of θ (1 / √information); low..high is the score at θ ± 1 SE.
 * - confidence: High / Medium / Low from how wide that range is (more questions → narrower).
 * - overallAbility: inverse-variance weighted mean of θ across skills, so precisely
 *   measured skills count more.
 */
export const DIFFICULTY = { easy: -1.2, medium: 0, hard: 1.2 };
const PRIOR_SD = 2;
const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const toScore = (theta) => Math.round(100 * sigmoid(theta));

function information(theta, responses) {
  let info = 1 / PRIOR_SD ** 2;
  for (const r of responses) {
    const p = sigmoid(theta - (DIFFICULTY[r.difficulty] ?? 0));
    info += p * (1 - p);
  }
  return info;
}

/** responses: [{ correct: boolean, difficulty: 'easy' | 'medium' | 'hard' }] */
export function estimateAbility(responses) {
  let theta = 0;
  for (let i = 0; i < 50; i++) {
    let grad = -theta / PRIOR_SD ** 2; // d/dθ of the log prior
    for (const r of responses) grad += (r.correct ? 1 : 0) - sigmoid(theta - (DIFFICULTY[r.difficulty] ?? 0));
    const step = grad / information(theta, responses); // Newton step: −gradient / Hessian
    theta += step;
    if (Math.abs(step) < 1e-7) break;
  }
  const se = 1 / Math.sqrt(information(theta, responses));
  return {
    theta: Math.round(theta * 1000) / 1000,
    se: Math.round(se * 1000) / 1000,
    score: toScore(theta),
    low: toScore(theta - se),
    high: toScore(theta + se),
    confidence: toScore(theta + se) - toScore(theta - se) <= 25 ? 'High' : toScore(theta + se) - toScore(theta - se) <= 40 ? 'Medium' : 'Low',
  };
}

/** Right / total per difficulty, for showing how the score came about. */
export function byDifficulty(responses) {
  const out = {};
  for (const r of responses) {
    const d = DIFFICULTY[r.difficulty] != null ? r.difficulty : 'medium';
    out[d] = out[d] || { correct: 0, total: 0 };
    out[d].total += 1;
    if (r.correct) out[d].correct += 1;
  }
  return out;
}

/**
 * Overall ability across skills: inverse-variance weighted mean of θ (weights 1 / SE²).
 * Older results without θ are converted from their score with a default SE of 1.
 */
export function overallAbility(results) {
  let num = 0;
  let den = 0;
  for (const r of results) {
    const theta = r.theta ?? Math.log(Math.min(0.99, Math.max(0.01, r.score / 100)) / (1 - Math.min(0.99, Math.max(0.01, r.score / 100))));
    const w = 1 / (r.se ?? 1) ** 2;
    num += w * theta;
    den += w;
  }
  return den ? toScore(num / den) : null;
}
