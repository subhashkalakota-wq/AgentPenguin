import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MessagesSquare, ClipboardCheck, Globe2, Loader2, Mic, MicOff, Volume2, Send, ArrowRight, RotateCcw, CheckCircle2, XCircle,
  AlertTriangle, ExternalLink, Timer, Flag, ChevronLeft, ChevronRight, Trophy,
} from 'lucide-react';
import { MOCK_INTERVIEW_SITES, MOCK_TEST_SITES, TEST_TOPICS } from '../data/mockResources';

const API = 'http://localhost:3001';
const KINDS = [['technical', 'Technical'], ['hr', 'HR'], ['behavioral', 'Behavioural'], ['system-design', 'System design']];
const LEVELS = [['fresher', 'Fresher'], ['junior', '1–3 years'], ['mid', '3–6 years'], ['senior', '6+ years']];

async function post(path, body) {
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
const friendly = (e) => (e.message === 'Failed to fetch' ? 'Backend is not running. Start it with: npm run server' : e.message);
const shortRole = (r = '') => r.replace(/\(.*?\)/g, '').trim();

export function Segmented({ value, onChange, options, label }) {
  return (
    <div className="pg-toggle-row" role="radiogroup" aria-label={label}>
      {options.map(([k, l]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} className={`pg-chip ${value === k ? 'active' : ''}`} onClick={() => onChange(k)}>{l}</button>
      ))}
    </div>
  );
}

// Browser speech-to-text (Chrome / Edge); hidden where unsupported
function useDictation(onText) {
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);
  const Rec = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const toggle = () => {
    if (listening) { recRef.current?.stop(); return; }
    const rec = new Rec();
    rec.lang = 'en-IN';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => onText(Array.from(e.results).slice(e.resultIndex).map(r => r[0].transcript).join(' '));
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };
  useEffect(() => () => recRef.current?.stop(), []);
  return { supported: Boolean(Rec), listening, toggle };
}

const speak = (text) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-IN';
  u.rate = 0.98;
  window.speechSynthesis.speak(u);
};

// ---------------- Penguin interview ----------------
function PenguinInterview({ roles, prefill }) {
  const [setup, setSetup] = useState({ role: prefill?.role ? '__custom' : (roles[0] || 'Software Engineer'), kind: 'technical', level: 'fresher', count: 5 });
  const [customRole, setCustomRole] = useState(prefill?.role ? `${prefill.role}${prefill.company ? ` at ${prefill.company}` : ''}` : '');
  const [stage, setStage] = useState('setup'); // setup | asking | evaluated | summary
  const [rounds, setRounds] = useState([]); // { question, topic, hint, answer, eval }
  const [answer, setAnswer] = useState('');
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [voice, setVoice] = useState(false);
  const dictation = useDictation((t) => setAnswer(a => `${a}${a && !a.endsWith(' ') ? ' ' : ''}${t.trim()}`));
  const current = rounds[rounds.length - 1];
  const role = setup.role === '__custom' ? customRole.trim() || 'Software Engineer' : setup.role;

  const ask = async (prev = rounds) => {
    setBusy(true);
    setError(null);
    try {
      const q = await post('/api/mock/interview/question', { role, kind: setup.kind, level: setup.level, asked: prev.map(r => r.question) });
      setRounds([...prev, { ...q, answer: '', eval: null }]);
      setAnswer('');
      setStage('asking');
      if (voice) speak(q.question);
    } catch (e) { setError(friendly(e)); } finally { setBusy(false); }
  };

  const submit = async () => {
    if (dictation.listening) dictation.toggle();
    setBusy(true);
    setError(null);
    try {
      const ev = await post('/api/mock/interview/evaluate', { role, kind: setup.kind, level: setup.level, question: current.question, answer });
      setRounds(rs => rs.map((r, i) => (i === rs.length - 1 ? { ...r, answer, eval: ev } : r)));
      setStage('evaluated');
    } catch (e) { setError(friendly(e)); } finally { setBusy(false); }
  };

  const finish = async (list = rounds.filter(r => r.eval)) => {
    if (!list.length) { setStage('setup'); setRounds([]); return; }
    setBusy(true);
    setError(null);
    try {
      const s = await post('/api/mock/interview/summary', { role, kind: setup.kind, rounds: list.map(r => ({ question: r.question, score: r.eval.score, improve: r.eval.improve })) });
      setSummary(s);
      setStage('summary');
    } catch (e) { setError(friendly(e)); } finally { setBusy(false); }
  };

  const restart = () => { setStage('setup'); setRounds([]); setSummary(null); setAnswer(''); window.speechSynthesis?.cancel(); };

  if (stage === 'setup') {
    return (
      <section className="pg-card pg-mock-card">
        <h2 className="pg-mock-h">Mock interview with Penguin</h2>
        <p className="pg-mock-sub">Penguin asks real interview questions for your role and level, scores each answer out of 10 and shows a model answer. Type or speak your answers.</p>
        <div className="pg-mock-setup">
          <label className="pg-mock-row"><span>Role</span>
            <select className="pg-input" value={setup.role} onChange={(e) => setSetup(s => ({ ...s, role: e.target.value }))}>
              {roles.map(r => <option key={r} value={r}>{shortRole(r)}</option>)}
              <option value="__custom">Another role…</option>
            </select>
          </label>
          {setup.role === '__custom' && (
            <label className="pg-mock-row"><span>Which role?</span><input className="pg-input" value={customRole} onChange={(e) => setCustomRole(e.target.value)} placeholder="e.g. Data Analyst" /></label>
          )}
          <div className="pg-mock-row"><span>Interview</span><Segmented value={setup.kind} onChange={(v) => setSetup(s => ({ ...s, kind: v }))} options={KINDS} label="Interview type" /></div>
          <div className="pg-mock-row"><span>Your level</span><Segmented value={setup.level} onChange={(v) => setSetup(s => ({ ...s, level: v }))} options={LEVELS} label="Level" /></div>
          <div className="pg-mock-row"><span>Questions</span><Segmented value={String(setup.count)} onChange={(v) => setSetup(s => ({ ...s, count: Number(v) }))} options={[['3', '3'], ['5', '5'], ['8', '8']]} label="Number of questions" /></div>
          <label className="pg-mock-check"><input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} /> Read questions aloud</label>
        </div>
        {error && <p className="pg-rq-message is-error"><AlertTriangle size={14} /> {error}</p>}
        <button type="button" className="pg-btn pg-btn-primary pg-mock-start" onClick={() => ask([])} disabled={busy}>
          {busy ? <Loader2 size={15} className="pg-spin" /> : <MessagesSquare size={15} />} Start interview
        </button>
      </section>
    );
  }

  if (stage === 'summary' && summary) {
    const done = rounds.filter(r => r.eval);
    return (
      <section className="pg-card pg-mock-card">
        <div className="pg-mock-result-head">
          <div className="pg-mock-score-big"><Trophy size={20} /><strong>{summary.average}</strong><span>/10</span></div>
          <div>
            <span className={`pg-mk-mood ${summary.readiness === 'Ready' ? 'is-strong' : ''}`}>{summary.readiness}</span>
            <h2 className="pg-mock-h">{summary.headline}</h2>
            <p className="pg-mock-sub">{shortRole(role)} · {KINDS.find(k => k[0] === setup.kind)?.[1]} interview · {done.length} questions</p>
          </div>
        </div>
        <div className="pg-mock-two">
          <div><h3>What went well</h3><ul>{summary.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
          <div><h3>Practise next</h3><ul>{summary.focusAreas.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
        </div>
        <ol className="pg-mock-qlist">
          {done.map((r, i) => (
            <li key={i}><span className="pg-mock-qscore">{r.eval.score}/10</span><span>{r.question}</span></li>
          ))}
        </ol>
        <button type="button" className="pg-btn pg-btn-primary" onClick={restart}><RotateCcw size={14} /> Practise again</button>
      </section>
    );
  }

  const n = rounds.length;
  return (
    <section className="pg-card pg-mock-card">
      <div className="pg-mock-progress">
        <span>Question {n} of {setup.count}</span>
        <div className="pg-stat-track"><div style={{ width: `${(n / setup.count) * 100}%` }} /></div>
        <button type="button" className="pg-btn pg-btn-ghost" onClick={() => finish()} disabled={busy}>End interview</button>
      </div>

      <div className="pg-mock-question">
        <span className="pg-mock-avatar" aria-hidden="true">🐧</span>
        <div>
          {current?.topic && <span className="pg-mock-topic">{current.topic}</span>}
          <p>{current?.question}</p>
          <button type="button" className="pg-mock-link" onClick={() => speak(current.question)}><Volume2 size={13} /> Read aloud</button>
        </div>
      </div>

      {stage === 'asking' && (
        <>
          <div className="pg-mock-answer">
            <textarea
              className="pg-input"
              rows={6}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer as you would say it in the interview…"
              aria-label="Your answer"
            />
            <div className="pg-mock-answer-bar">
              {dictation.supported && (
                <button type="button" className={`pg-btn ${dictation.listening ? 'pg-btn-danger-outline' : ''}`} onClick={dictation.toggle}>
                  {dictation.listening ? <><MicOff size={14} /> Stop speaking</> : <><Mic size={14} /> Speak answer</>}
                </button>
              )}
              {current?.hint && <span className="pg-mock-hint">Tip: {current.hint}</span>}
              <button type="button" className="pg-btn pg-btn-primary" onClick={submit} disabled={busy}>
                {busy ? <Loader2 size={14} className="pg-spin" /> : <Send size={14} />} Submit answer
              </button>
            </div>
          </div>
        </>
      )}

      {stage === 'evaluated' && current?.eval && (
        <div className="pg-mock-feedback">
          <div className="pg-mock-feedback-head">
            <span className={`pg-mock-score ${current.eval.score >= 7 ? 'is-good' : current.eval.score >= 4 ? 'is-mid' : 'is-low'}`}>{current.eval.score}/10</span>
            <strong>{current.eval.verdict}</strong>
          </div>
          <div className="pg-mock-two">
            {current.eval.strengths.length > 0 && <div><h3>Good</h3><ul>{current.eval.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
            {current.eval.improve.length > 0 && <div><h3>Improve</h3><ul>{current.eval.improve.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
          </div>
          {current.eval.modelAnswer && (
            <details className="pg-mock-model"><summary>See a strong answer</summary><p>{current.eval.modelAnswer}</p></details>
          )}
          <div className="pg-mock-answer-bar">
            <span className="pg-mock-hint">Your answer: {current.answer ? `${current.answer.slice(0, 120)}${current.answer.length > 120 ? '…' : ''}` : '(none)'}</span>
            {n < setup.count
              ? <button type="button" className="pg-btn pg-btn-primary" onClick={() => ask()} disabled={busy}>{busy ? <Loader2 size={14} className="pg-spin" /> : <ArrowRight size={14} />} Next question</button>
              : <button type="button" className="pg-btn pg-btn-primary" onClick={() => finish()} disabled={busy}>{busy ? <Loader2 size={14} className="pg-spin" /> : <Trophy size={14} />} See results</button>}
          </div>
        </div>
      )}
      {error && <p className="pg-rq-message is-error"><AlertTriangle size={14} /> {error}</p>}
    </section>
  );
}

// ---------------- Penguin test ----------------
/**
 * Timed MCQ test. In the Penguin Profile it runs as a skill test: `fixedTopic` locks the
 * skill, or `initialTest` starts a ready-made test straight away (the multi-skill test,
 * whose questions carry a `skill`). `onComplete({ correct, total, pct, questions, answers })`
 * reports the result so skill levels update; `doneHint` is shown next to Done.
 */
export function PenguinTest({ roles = [], prefill, fixedTopic, initialTest, doneHint, onComplete, onCancel }) {
  const [topic, setTopic] = useState(fixedTopic || prefill?.role ? '__custom' : 'Quantitative aptitude');
  const [custom, setCustom] = useState(fixedTopic || (prefill?.role ? `${prefill.role} (assessment${prefill.company ? ` for ${prefill.company}` : ''})` : ''));
  const [level, setLevel] = useState('medium');
  const [count, setCount] = useState(10);
  const [test, setTest] = useState(initialTest || null);
  const [answers, setAnswers] = useState({});
  const [flags, setFlags] = useState({});
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(() => (initialTest ? initialTest.questions.length * 60 : 0));
  const [startedAt, setStartedAt] = useState(() => (initialTest ? Date.now() : 0));
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const roleTopics = useMemo(() => [...new Set(roles.map(shortRole))].slice(0, 3), [roles]);

  const submit = () => {
    if (!test) return;
    const correct = test.questions.filter((q, i) => answers[i] === q.answer).length;
    const total = test.questions.length;
    setResult({ correct, total, seconds: Math.round((Date.now() - startedAt) / 1000) });
    onComplete?.({ correct, total, pct: Math.round((correct / total) * 100), topic: test.topic, questions: test.questions, answers });
  };

  // Countdown; submits automatically when time runs out
  useEffect(() => {
    if (!test || result) return undefined;
    if (left <= 0) { submit(); return undefined; }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, test, result]);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const t = await post('/api/mock/test', { topic: topic === '__custom' ? custom.trim() : topic, level, count });
      setTest(t);
      setAnswers({});
      setFlags({});
      setIdx(0);
      setResult(null);
      setLeft(t.questions.length * 60);
      setStartedAt(Date.now());
    } catch (e) { setError(friendly(e)); } finally { setBusy(false); }
  };

  const reset = () => { setTest(null); setResult(null); };

  if (!test && fixedTopic) {
    return (
      <section className="pg-mock-card pg-skilltest-setup">
        <h2 className="pg-mock-h">Test your {fixedTopic} skill</h2>
        <p className="pg-mock-sub">Answer multiple-choice questions on {fixedTopic}, one minute each. Your score sets this skill's level in your Penguin Profile.</p>
        <div className="pg-mock-setup">
          <div className="pg-mock-row"><span>Difficulty</span><Segmented value={level} onChange={setLevel} options={[['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']]} label="Difficulty" /></div>
          <div className="pg-mock-row"><span>Questions</span><Segmented value={String(count)} onChange={(v) => setCount(Number(v))} options={[['10', '10'], ['15', '15'], ['20', '20']]} label="Questions" /></div>
        </div>
        {error && <p className="pg-rq-message is-error"><AlertTriangle size={14} /> {error}</p>}
        <div className="pg-mock-answer-bar">
          {onCancel && <button type="button" className="pg-btn" onClick={onCancel}>Cancel</button>}
          <button type="button" className="pg-btn pg-btn-primary" onClick={start} disabled={busy}>
            {busy ? <><Loader2 size={15} className="pg-spin" /> Writing your test…</> : <><ClipboardCheck size={15} /> Start {count}-question test · {count} min</>}
          </button>
        </div>
      </section>
    );
  }

  if (!test) {
    return (
      <section className="pg-card pg-mock-card">
        <h2 className="pg-mock-h">Mock test with Penguin</h2>
        <p className="pg-mock-sub">Timed multiple-choice tests like TCS NQT, Infosys and AMCAT rounds, or on your tech stack. One minute per question; full review with explanations at the end.</p>
        <div className="pg-mock-topics">
          {[...TEST_TOPICS, ...(roleTopics.length ? [{ group: 'Your roles', items: roleTopics }] : [])].map(g => (
            <div key={g.group}>
              <span className="pg-auto-label">{g.group}</span>
              <div className="pg-toggle-row">
                {g.items.map(t => <button key={t} type="button" className={`pg-chip ${topic === t ? 'active' : ''}`} onClick={() => setTopic(t)}>{t}</button>)}
                {g.group === 'CS fundamentals' && <button type="button" className={`pg-chip ${topic === '__custom' ? 'active' : ''}`} onClick={() => setTopic('__custom')}>Other topic…</button>}
              </div>
            </div>
          ))}
          {topic === '__custom' && <input className="pg-input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. Spring Boot, AWS basics, Excel" aria-label="Test topic" />}
        </div>
        <div className="pg-mock-setup">
          <div className="pg-mock-row"><span>Difficulty</span><Segmented value={level} onChange={setLevel} options={[['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']]} label="Difficulty" /></div>
          <div className="pg-mock-row"><span>Questions</span><Segmented value={String(count)} onChange={(v) => setCount(Number(v))} options={[['10', '10'], ['15', '15'], ['20', '20']]} label="Questions" /></div>
        </div>
        {error && <p className="pg-rq-message is-error"><AlertTriangle size={14} /> {error}</p>}
        <button type="button" className="pg-btn pg-btn-primary pg-mock-start" onClick={start} disabled={busy || (topic === '__custom' && !custom.trim())}>
          {busy ? <><Loader2 size={15} className="pg-spin" /> Writing your test…</> : <><ClipboardCheck size={15} /> Start {count}-question test · {count} min</>}
        </button>
        <p className="pg-auto-small">Questions are written by AI and checked automatically, but read the explanations if an answer looks wrong.</p>
      </section>
    );
  }

  if (result) {
    const pct = Math.round((result.correct / result.total) * 100);
    return (
      <section className="pg-card pg-mock-card">
        <div className="pg-mock-result-head">
          <div className="pg-mock-score-big"><Trophy size={20} /><strong>{result.correct}</strong><span>/{result.total}</span></div>
          <div>
            <span className={`pg-mk-mood ${pct >= 70 ? 'is-strong' : ''}`}>{pct}%</span>
            <h2 className="pg-mock-h">{test.topic}{test.level ? ` · ${test.level}` : ''}</h2>
            <p className="pg-mock-sub">Finished in {Math.floor(result.seconds / 60)}m {result.seconds % 60}s</p>
          </div>
        </div>
        <ol className="pg-test-review">
          {test.questions.map((q, i) => {
            const mine = answers[i];
            const ok = mine === q.answer;
            return (
              <li key={i} className={ok ? 'is-right' : 'is-wrong'}>
                <div className="pg-test-review-q">{ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}<span>{q.skill && <em className="pg-test-skill">{q.skill}</em>}{q.question}</span></div>
                <p>Your answer: <strong>{mine == null ? 'Not answered' : q.options[mine]}</strong>{!ok && <> · Correct: <strong>{q.options[q.answer]}</strong></>}</p>
                {q.explanation && <p className="pg-test-expl">{q.explanation}</p>}
              </li>
            );
          })}
        </ol>
        {fixedTopic || initialTest
          ? <div className="pg-mock-answer-bar"><span className="pg-mock-hint">{doneHint || `Your ${fixedTopic} level was updated in your Penguin Profile.`}</span><button type="button" className="pg-btn pg-btn-primary" onClick={onCancel}>Done</button></div>
          : <button type="button" className="pg-btn pg-btn-primary" onClick={reset}><RotateCcw size={14} /> Take another test</button>}
      </section>
    );
  }

  const q = test.questions[idx];
  const answeredCount = Object.keys(answers).length;
  return (
    <section className="pg-card pg-mock-card">
      <div className="pg-mock-progress">
        <span>{q.skill || test.topic} · Question {idx + 1} of {test.questions.length}</span>
        <span className={`pg-test-timer ${left < 60 ? 'is-low' : ''}`}><Timer size={14} /> {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>
      </div>
      <div className="pg-test-layout">
        <div>
          <p className="pg-test-q">{q.question}</p>
          <div className="pg-test-options" role="radiogroup" aria-label={`Question ${idx + 1}`}>
            {q.options.map((o, i) => (
              <label key={i} className={`pg-rq-option ${answers[idx] === i ? 'is-on' : ''}`}>
                <input type="radio" name={`tq-${idx}`} checked={answers[idx] === i} onChange={() => setAnswers(a => ({ ...a, [idx]: i }))} />
                <span className="pg-test-letter">{'ABCD'[i]}</span>{o}
              </label>
            ))}
          </div>
          <div className="pg-mock-answer-bar">
            <button type="button" className="pg-btn" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}><ChevronLeft size={14} /> Previous</button>
            <button type="button" className={`pg-btn ${flags[idx] ? 'pg-btn-primary' : ''}`} onClick={() => setFlags(f => ({ ...f, [idx]: !f[idx] }))}><Flag size={14} /> {flags[idx] ? 'Marked' : 'Mark for review'}</button>
            {idx < test.questions.length - 1
              ? <button type="button" className="pg-btn pg-btn-primary" onClick={() => setIdx(i => i + 1)}>Next <ChevronRight size={14} /></button>
              : <button type="button" className="pg-btn pg-btn-primary" onClick={() => { if (answeredCount === test.questions.length || window.confirm(`${test.questions.length - answeredCount} questions are unanswered. Submit anyway?`)) submit(); }}>Submit test</button>}
          </div>
        </div>
        <aside className="pg-test-palette" aria-label="Questions">
          <span className="pg-auto-label">{answeredCount}/{test.questions.length} answered</span>
          <div>
            {test.questions.map((_, i) => (
              <button key={i} type="button" onClick={() => setIdx(i)} aria-label={`Question ${i + 1}`}
                className={`${i === idx ? 'is-current' : ''} ${answers[i] != null ? 'is-done' : ''} ${flags[i] ? 'is-flag' : ''}`}>{i + 1}</button>
            ))}
          </div>
          <button type="button" className="pg-btn" onClick={() => { if (window.confirm('Submit the test now?')) submit(); }}>Submit test</button>
        </aside>
      </div>
    </section>
  );
}

// ---------------- Real mocks online ----------------
function RealMocks() {
  const Card = ({ s }) => (
    <a className="pg-res-card" href={s.url} target="_blank" rel="noreferrer">
      <div className="pg-res-top"><strong>{s.name}</strong><ExternalLink size={13} /></div>
      <p>{s.what}</p>
      <div className="pg-res-tags">{s.tags.map(t => <span key={t} className={t.startsWith('Free') ? 'is-free' : ''}>{t}</span>)}</div>
    </a>
  );
  return (
    <div className="pg-res">
      <section className="pg-card pg-mock-card">
        <h2 className="pg-mock-h">Mock interviews with real people</h2>
        <p className="pg-mock-sub">Practise with peers, engineers and mentors.</p>
        <div className="pg-res-grid">{MOCK_INTERVIEW_SITES.map(s => <Card key={s.name} s={s} />)}</div>
      </section>
      <section className="pg-card pg-mock-card">
        <h2 className="pg-mock-h">Mock tests and contests</h2>
        <p className="pg-mock-sub">Placement papers, aptitude, skill tests and hiring challenges.</p>
        <div className="pg-res-grid">{MOCK_TEST_SITES.map(s => <Card key={s.name} s={s} />)}</div>
      </section>
    </div>
  );
}

const MODES = [
  ['interview', 'Penguin interview', MessagesSquare],
  ['test', 'Penguin test', ClipboardCheck],
  ['real', 'Real mocks & tests', Globe2],
];

/** Mocks: AI interviews and tests by Penguin, plus real mock interviews and tests online. */
export default function MocksTab({ roles = [] }) {
  // "Practise for this interview/test" from the Inbox tab sets up the matching mock
  const [prefill] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem('pg_mock_prefill') || 'null');
      localStorage.removeItem('pg_mock_prefill');
      return p;
    } catch { return null; }
  });
  const [mode, setMode] = useState(() => {
    if (prefill) return prefill.kind === 'assessment' ? 'test' : 'interview';
    try { return localStorage.getItem('pg_mocks_mode') || 'interview'; } catch { return 'interview'; }
  });
  const pick = (m) => { setMode(m); try { localStorage.setItem('pg_mocks_mode', m); } catch { /* storage unavailable */ } };
  const roleList = roles.length ? roles : ['Software Engineer'];
  return (
    <div className="pg-mocks">
      <div className="pg-mocks-modes" role="tablist" aria-label="Mock type">
        {MODES.map(([k, l, Icon]) => (
          <button key={k} type="button" role="tab" aria-selected={mode === k} className={mode === k ? 'active' : ''} onClick={() => pick(k)}>
            <Icon size={16} /> {l}
          </button>
        ))}
      </div>
      {prefill && <p className="pg-mock-prefill">Set up for your {prefill.kind === 'assessment' ? 'assessment' : 'interview'}{prefill.company ? ` with ${prefill.company}` : ''}{prefill.role ? ` — ${prefill.role}` : ''}. Good luck!</p>}
      {mode === 'interview' && <PenguinInterview roles={roleList} prefill={prefill} />}
      {mode === 'test' && <PenguinTest roles={roleList} prefill={prefill} />}
      {mode === 'real' && <RealMocks />}
    </div>
  );
}
