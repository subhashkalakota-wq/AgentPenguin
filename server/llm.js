/**
 * JSON chat helper: tries Groq, then OpenAI, then Gemini (whichever keys are set and working).
 * Returns the parsed JSON object, or null if no provider answered.
 */
let openaiDisabledUntil = 0; // back off after quota/auth errors instead of retrying every call
let groqDisabledUntil = 0;

// Groq exposes an OpenAI-compatible API. Models are tried in order; ones that are
// missing (404/400) or rate-limited (429) fall through to the next.
const GROQ_MODELS = [process.env.GROQ_MODEL, 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'].filter(Boolean);

async function viaGroq(system, user) {
  if (!process.env.GROQ_API_KEY || Date.now() < groqDisabledUntil) return null;
  for (const model of [...new Set(GROQ_MODELS)]) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    });
    if (res.status === 401 || res.status === 403) {
      groqDisabledUntil = Date.now() + 10 * 60 * 1000;
      console.warn(`[LLM] Groq rejected the API key (${res.status}).`);
      return null;
    }
    if (!res.ok) continue;
    const data = await res.json();
    const parsed = parseJsonLoose(data.choices?.[0]?.message?.content);
    if (parsed) return parsed;
  }
  return null;
}

async function viaOpenAI(system, user) {
  if (!process.env.OPENAI_API_KEY || Date.now() < openaiDisabledUntil) return null;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  if (res.status === 401 || res.status === 429) {
    openaiDisabledUntil = Date.now() + 10 * 60 * 1000;
    console.warn(`[LLM] OpenAI unavailable (${res.status}); using Gemini for 10 minutes.`);
    return null;
  }
  if (!res.ok) return null;
  const data = await res.json();
  return parseJsonLoose(data.choices?.[0]?.message?.content);
}

// Tried in order; busy (503) or retired (404) models fall through to the next one
const GEMINI_MODELS = [process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'].filter(Boolean);

async function viaGemini(system, user) {
  if (!process.env.GEMINI_API_KEY) return null;
  for (const model of [...new Set(GEMINI_MODELS)]) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
    });
    if (res.status === 404 || res.status === 429 || res.status >= 500) continue;
    if (!res.ok) {
      console.warn(`[LLM] Gemini error ${res.status}`);
      return null;
    }
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
    const parsed = parseJsonLoose(text);
    if (parsed) return parsed; // unusable output: try the next model
  }
  console.warn('[LLM] All Gemini models busy or unavailable.');
  return null;
}

function parseJsonLoose(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* try the outermost {...} */ }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

export function hasLLM() {
  return Boolean(process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
}

export async function llmJson(system, user) {
  for (const provider of [viaGroq, viaOpenAI, viaGemini]) {
    try {
      const out = await provider(system, user);
      if (out) return out;
    } catch (err) {
      console.warn('[LLM] provider error:', err.message);
    }
  }
  return null;
}
