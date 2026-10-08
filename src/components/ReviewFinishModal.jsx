import React, { useState } from 'react';
import { X, ExternalLink, Loader2, CheckCircle2, AlertTriangle, RotateCcw, BookmarkCheck } from 'lucide-react';

const API = 'http://localhost:3001';

// Adds/replaces the user's answers in their saved "learned answers"
function mergeLearned(existing = [], answers = []) {
  const key = (q) => q.toLowerCase().replace(/\s+/g, ' ').trim();
  const map = new Map(existing.map(a => [key(a.question), a]));
  for (const a of answers) map.set(key(a.question), { ...a, updatedAt: new Date().toISOString() });
  return [...map.values()].slice(-300);
}

function QuestionField({ q, value, onChange }) {
  const id = `rq-${q.question.slice(0, 40).replace(/\W+/g, '-')}`;
  if (q.type === 'multi' && q.options?.length) {
    const list = Array.isArray(value) ? value : [];
    return (
      <div className="pg-rq-options" role="group" aria-label={q.question}>
        {q.options.map(o => (
          <label key={o} className={`pg-rq-option ${list.includes(o) ? 'is-on' : ''}`}>
            <input type="checkbox" checked={list.includes(o)} onChange={() => onChange(list.includes(o) ? list.filter(x => x !== o) : [...list, o])} />
            {o}
          </label>
        ))}
      </div>
    );
  }
  if (q.options?.length && q.options.length <= 6) {
    return (
      <div className="pg-rq-options" role="radiogroup" aria-label={q.question}>
        {q.options.map(o => (
          <label key={o} className={`pg-rq-option ${value === o ? 'is-on' : ''}`}>
            <input type="radio" name={id} checked={value === o} onChange={() => onChange(o)} />
            {o}
          </label>
        ))}
      </div>
    );
  }
  if (q.options?.length) {
    return (
      <select id={id} className="pg-input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose…</option>
        {q.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (q.type === 'textarea') {
    return <textarea id={id} className="pg-input" rows={3} value={value || ''} onChange={(e) => onChange(e.target.value)} />;
  }
  return <input id={id} className="pg-input" type={q.type === 'number' ? 'number' : 'text'} value={value || ''} onChange={(e) => onChange(e.target.value)} />;
}

/**
 * Finish a "Needs review" job: answer the questions Penguin couldn't, save them so
 * Penguin uses them on every future form, and apply again. Company-website jobs can be
 * opened and marked as applied by hand.
 */
export default function ReviewFinishModal({ job, profile, onSaveProfile, onClose }) {
  const questions = job.reviewQuestions || [];
  const [values, setValues] = useState(() => Object.fromEntries(questions.map(q => [q.question, q.guess ?? (q.type === 'multi' ? [] : '')])));
  const [busy, setBusy] = useState(null); // 'retry' | 'save' | 'applied'
  const [message, setMessage] = useState(null);
  const external = job.reviewKind === 'external_apply' || /company website/i.test(job.reviewReason || '');
  const filled = questions.filter(q => (Array.isArray(values[q.question]) ? values[q.question].length : String(values[q.question] ?? '').trim()));
  const learnedCount = (profile.learnedAnswers || []).length;

  const saveAnswers = async () => {
    const answers = filled.map(q => ({ question: q.question, answer: values[q.question], type: q.type, options: q.options || [] }));
    const next = { ...profile, learnedAnswers: mergeLearned(profile.learnedAnswers, answers) };
    await onSaveProfile(next);
    return next;
  };

  const run = async (kind) => {
    setBusy(kind);
    setMessage(null);
    try {
      if (kind === 'applied') {
        const res = await fetch(`${API}/api/review/mark-applied`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job }) });
        const body = await res.json();
        if (!body.success) throw new Error(body.message || 'Could not update the job.');
        onClose();
        return;
      }
      const nextProfile = filled.length ? await saveAnswers() : profile;
      if (kind === 'save') {
        setMessage({ ok: true, text: `Saved ${filled.length} answer${filled.length === 1 ? '' : 's'}. Penguin will use ${filled.length === 1 ? 'it' : 'them'} on every future form.` });
        return;
      }
      const res = await fetch(`${API}/api/review/retry`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job, profile: nextProfile }) });
      const body = await res.json();
      if (!body.success) throw new Error(body.message || 'Could not start.');
      setMessage({ ok: true, text: 'Penguin is applying again in a new Chrome tab. The status in the table updates when it finishes.' });
      setTimeout(onClose, 1800);
    } catch (e) {
      setMessage({ ok: false, text: e.message === 'Failed to fetch' ? 'Backend is not running. Start it with: npm run server' : e.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="pg-modal-backdrop" onClick={onClose}>
      <div className="pg-modal pg-settings pg-review-modal" role="dialog" aria-modal="true" aria-labelledby="rf-title" onClick={(e) => e.stopPropagation()}>
        <div className="pg-modal-head">
          <div>
            <h2 id="rf-title">Finish this application</h2>
            <p><strong>{job.company}</strong> · {job.title}</p>
          </div>
          <button className="pg-icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="pg-settings-body">
          <div className="pg-rq-reason">
            <AlertTriangle size={16} />
            <div>
              <strong>{job.reviewReason || 'Needs a look'}</strong>
              {job.reviewDetail && <span>{job.reviewDetail}</span>}
            </div>
          </div>

          {questions.length > 0 ? (
            <>
              <p className="pg-rq-intro">
                Answer these once. Penguin saves your answers and uses them on every future application{learnedCount ? ` (it already knows ${learnedCount})` : ''}.
                Answers marked "Penguin guessed" were filled in automatically. Check them.
              </p>
              <ol className="pg-rq-list">
                {questions.map(q => (
                  <li key={q.question}>
                    <div className="pg-rq-q">
                      <span>{q.question}</span>
                      {q.guess != null && <em>Penguin guessed</em>}
                    </div>
                    <QuestionField q={q} value={values[q.question]} onChange={(v) => setValues(prev => ({ ...prev, [q.question]: v }))} />
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="pg-rq-intro">
              {external
                ? 'This job is applied on the company’s own website. Open it, apply there, then mark it as applied so it counts.'
                : 'Penguin didn’t record specific questions for this job. Open it to see what is needed, or let Penguin try again.'}
            </p>
          )}
        </div>

        {message && (
          <p className={`pg-rq-message ${message.ok ? 'is-ok' : 'is-error'}`}>
            {message.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />} {message.text}
          </p>
        )}

        <div className="pg-modal-foot">
          <div className="pg-settings-links">
            {job.url && <a className="pg-btn pg-btn-ghost" href={job.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open job</a>}
            <button type="button" className="pg-btn pg-btn-ghost" onClick={() => run('applied')} disabled={!!busy}>
              {busy === 'applied' ? <Loader2 size={14} className="pg-spin" /> : <CheckCircle2 size={14} />} I applied myself
            </button>
          </div>
          <div className="pg-modal-foot-right">
            {questions.length > 0 && (
              <button type="button" className="pg-btn" onClick={() => run('save')} disabled={!!busy || !filled.length}>
                {busy === 'save' ? <Loader2 size={14} className="pg-spin" /> : <BookmarkCheck size={14} />} Save answers
              </button>
            )}
            {!external && (
              <button type="button" className="pg-btn pg-btn-primary" onClick={() => run('retry')} disabled={!!busy || (questions.length > 0 && filled.length < questions.length)}>
                {busy === 'retry' ? <Loader2 size={14} className="pg-spin" /> : <RotateCcw size={14} />}
                {questions.length ? 'Save & apply again' : 'Try again'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
