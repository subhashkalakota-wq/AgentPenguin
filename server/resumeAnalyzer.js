/**
 * Resume analysis: extracts the resume text (PDF / DOCX) and asks the LLM for a
 * structured, evidence-based profile — total experience, years per skill,
 * education, current role. The agent answers screening questions from this:
 * a skill or experience the resume doesn't mention counts as 0.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { llmJson } from './llm.js';

const require = createRequire(import.meta.url);
const CACHE_DIR = path.resolve('server/data/resume-analysis');

export async function extractResumeText(filePath) {
  const buf = fs.readFileSync(filePath);
  if (/\.pdf$/i.test(filePath)) {
    const pdf = require('pdf-parse/lib/pdf-parse.js');
    return (await pdf(buf)).text || '';
  }
  if (/\.docx$/i.test(filePath)) {
    const mammoth = require('mammoth');
    return (await mammoth.extractRawText({ buffer: buf })).value || '';
  }
  throw new Error('Only PDF and DOCX resumes can be analysed.');
}

const SYSTEM = `You analyse a resume and return ONLY facts stated or clearly implied by it. Reply with JSON:
{
  "totalExperienceYears": number,          // paid professional work only (full-time/part-time/contract). Internships count as months/12. Students with no jobs: 0
  "internshipMonths": number,
  "skills": [{"name": string, "years": number}],   // every technical skill mentioned. years = professional use time; skills only used in coursework/personal projects = 0
  "currentTitle": string|null,
  "currentCompany": string|null,
  "education": [{"degree": string, "field": string, "institution": string, "graduationYear": number|null, "status": "completed"|"pursuing"}],
  "highestDegree": string|null,
  "certifications": [string],
  "languages": [string],
  "location": string|null,
  "summary": string                       // 2 sentences, third person, no invented details
}
Never invent employers, years or skills. If something is not in the resume use 0, null or [].`;

// Rough fallback when no LLM is available
function heuristicAnalysis(text) {
  const t = text.replace(/\s+/g, ' ');
  const yrs = t.match(/(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+|work\s+)?experience/i);
  const student = /\b(student|pursuing|undergraduate|b\.?\s?tech[^.]{0,40}(20(2[5-9]|3\d)))\b/i.test(t);
  return {
    totalExperienceYears: yrs ? Number(yrs[1]) : 0,
    internshipMonths: 0,
    skills: [],
    currentTitle: student ? 'Student' : null,
    currentCompany: null,
    education: [],
    highestDegree: null,
    certifications: [],
    languages: [],
    location: null,
    summary: '',
    source: 'heuristic',
  };
}

/**
 * Analyses the resume at filePath (cached by file content hash).
 * Returns { ...analysis, fileName, analysedAt, textChars }.
 */
export async function analyzeResume(filePath, { force = false } = {}) {
  if (!filePath || !fs.existsSync(filePath)) throw new Error('Resume file not found. Upload your resume again.');
  const hash = crypto.createHash('sha1').update(fs.readFileSync(filePath)).digest('hex');
  const cacheFile = path.join(CACHE_DIR, `${hash}.json`);
  if (!force && fs.existsSync(cacheFile)) {
    try { return JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch { /* re-analyse */ }
  }

  const text = (await extractResumeText(filePath)).replace(/[ \t]+/g, ' ').trim();
  if (text.length < 200) throw new Error('Could not read text from this resume (is it a scanned image?). Upload a text-based PDF or DOCX.');

  const out = await llmJson(SYSTEM, `Resume:\n${text.slice(0, 12000)}`);
  const analysis = out && Array.isArray(out.skills) ? { ...out, source: 'ai' } : heuristicAnalysis(text);
  analysis.skills = (analysis.skills || [])
    .filter(s => s && s.name)
    .map(s => ({ name: String(s.name).trim(), years: Math.max(0, Number(s.years) || 0) }));
  analysis.totalExperienceYears = Math.max(0, Number(analysis.totalExperienceYears) || 0);

  const result = {
    ...analysis,
    fileName: path.basename(filePath),
    analysedAt: new Date().toISOString(),
    textChars: text.length,
    resumeExcerpt: text.slice(0, 4000), // used as extra context when answering free-text questions
  };
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
  return result;
}
