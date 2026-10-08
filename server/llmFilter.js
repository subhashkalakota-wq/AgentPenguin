import { llmJson, hasLLM } from './llm.js';

/**
 * LLM Decision Engine for Filtering & Scoring LinkedIn Jobs
 * Returns structured JSON with decision ('APPLY' | 'SKIP' | 'FLAG_MANUAL_REVIEW')
 */
export async function filterJobsWithLLM(jobs, candidateProfile, minMatchScore = 75, role = '') {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;

  if (apiKey && process.env.ANTHROPIC_API_KEY) {
    return await callClaudeFilter(jobs, candidateProfile, minMatchScore);
  } else if (hasLLM()) {
    return await callOpenAIFilter(jobs, candidateProfile, minMatchScore, role);
  }

  // Built-in intelligent heuristic engine (Default when external API keys aren't set)
  return heuristicFilter(jobs, candidateProfile, minMatchScore, role);
}

const STOP = new Set(['and', 'or', 'the', 'of', 'for', 'a', 'an', 'in', 'with', 'senior', 'sr', 'junior', 'jr', 'lead', 'staff', 'ii', 'iii', 'i']);
const tokens = (s = '') => s.toLowerCase().split(/[^a-z0-9+#.]+/).filter(t => t.length > 1 && !STOP.has(t));

// Keyword scoring when no LLM key is set: mostly "does the title match the role
// you searched for", plus skill overlap. (Only titles are scraped, so skill words
// alone almost never match.)
function heuristicFilter(jobs, profile, minMatchScore, role = '') {
  const profileSkills = (profile.skills || []).map(s => s.toLowerCase());
  const roleTokens = tokens(role || profile.targetRole || '');

  return jobs.map(job => {
    const text = `${job.title} ${job.company} ${job.description || ''}`.toLowerCase();
    const titleTokens = new Set(tokens(job.title));
    const roleHit = roleTokens.length ? roleTokens.filter(t => titleTokens.has(t)).length / roleTokens.length : 0.5;

    const matched = profileSkills.filter(skill => text.includes(skill));
    const skillRatio = matched.length / Math.max(1, profileSkills.length);
    const score = Math.min(96, Math.max(30, Math.round(45 + roleHit * 40 + skillRatio * 15)));

    let decision = 'APPLY';
    if (score < minMatchScore) {
      decision = 'SKIP';
    } else if (text.includes('relocation required') || text.includes('must be in office 5 days') || text.includes('clearance required')) {
      decision = 'FLAG_MANUAL_REVIEW';
    }

    return {
      ...job,
      matchScore: score,
      status: decision === 'APPLY' ? 'shortlisted' : (decision === 'SKIP' ? 'discarded' : 'needs_review'),
      llmReasoning: {
        decision,
        summary: `Evaluated against candidate skills (${matched.join(', ')}). ${decision === 'APPLY' ? 'Strong alignment with target role.' : 'Insufficient keyword overlap.'}`,
        strengths: matched.slice(0, 3).map(m => `Experience with ${m}`),
        concerns: decision === 'SKIP' ? ['Low stack overlap with profile'] : [],
        screeningQuestions: [
          { question: "Years of React/Frontend Experience?", answer: `${profile.experienceYears || 5}`, status: "auto_filled" },
          { question: "Authorized to work in US?", answer: profile.workAuthorization || "Yes", status: "auto_filled" },
          { question: "Requires Visa sponsorship?", answer: profile.visaRequired || "No", status: "auto_filled" }
        ]
      }
    };
  });
}

async function callClaudeFilter(jobs, profile, minMatchScore) {
  try {
    const prompt = `You are a recruitment decision agent.
Candidate Profile:
${JSON.stringify(profile, null, 2)}

Filter threshold: ${minMatchScore}%

Evaluate each of these scraped LinkedIn jobs and output a strict JSON array of objects:
[
  {
    "id": "<job.id>",
    "matchScore": <0-100>,
    "decision": "APPLY" | "SKIP" | "FLAG_MANUAL_REVIEW",
    "summary": "<short 1-2 sentence justification>",
    "strengths": ["<strength 1>", "<strength 2>"],
    "concerns": ["<concern 1>"]
  }
]

Jobs:
${JSON.stringify(jobs.map(j => ({ id: j.id, title: j.title, company: j.company, description: (j.description || '').slice(0, 600) })), null, 2)}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    const textContent = data.content?.[0]?.text || '[]';
    const jsonMatch = textContent.match(/\[[\s\S]*\]/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return jobs.map(job => {
      const evalData = parsed.find(p => p.id === job.id) || {};
      const score = evalData.matchScore || 70;
      const decision = evalData.decision || (score >= minMatchScore ? 'APPLY' : 'SKIP');

      return {
        ...job,
        matchScore: score,
        status: decision === 'APPLY' ? 'shortlisted' : (decision === 'SKIP' ? 'discarded' : 'needs_review'),
        llmReasoning: {
          decision,
          summary: evalData.summary || 'Profile evaluation completed.',
          strengths: evalData.strengths || [],
          concerns: evalData.concerns || [],
          screeningQuestions: []
        }
      };
    });
  } catch (err) {
    console.error('Claude LLM API error, falling back to heuristic:', err);
    return heuristicFilter(jobs, profile, minMatchScore);
  }
}

async function callOpenAIFilter(jobs, profile, minMatchScore, role = '') {
  try {
    const out = await llmJson('You screen job listings for a candidate. Reply with JSON only.', `Candidate: ${JSON.stringify({ headline: profile.headline, targetRole: role || profile.targetRole, experienceYears: profile.experienceYears, skills: profile.skills, location: profile.location })}
Searched role: "${role}"
Score each job 0-100 for how well it fits this candidate and role. Jobs with a clearly relevant title should score at least ${minMatchScore}.
Return compact JSON {"results":[{"id":"...","matchScore":0,"decision":"APPLY|SKIP","summary":"under 15 words"}]}
Jobs: ${JSON.stringify(jobs.map(j => ({ id: j.id, title: j.title, company: j.company, location: j.location })))}`);
    if (!out) throw new Error('no LLM provider available');
    const parsed = out.results || [];
    const fallback = heuristicFilter(jobs, profile, minMatchScore, role);
    return jobs.map((job, i) => {
      const r = parsed.find(p => String(p.id) === String(job.id));
      if (!r) return fallback[i];
      const score = Math.max(0, Math.min(100, Number(r.matchScore) || 0));
      const decision = r.decision === 'APPLY' || score >= minMatchScore ? 'APPLY' : 'SKIP';
      return {
        ...job,
        matchScore: score,
        status: decision === 'APPLY' ? 'shortlisted' : 'discarded',
        llmReasoning: { decision, summary: r.summary || '', strengths: [], concerns: [], screeningQuestions: [] },
      };
    });
  } catch (err) {
    console.error('OpenAI filter error, using keyword scoring:', err.message);
    return heuristicFilter(jobs, profile, minMatchScore, role);
  }
}
