import React, { useEffect, useState } from 'react';
import { Code2, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import { authFetch } from '../lib/api';

const LEVELS = [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']];

/**
 * Coding problems from LeetCode, CodeChef and Codeforces for a DSA or programming-language
 * topic. Starts at the difficulty that fits the user's score; they can switch level.
 */
export default function CodingPractice({ topic, level: startLevel = 'medium' }) {
  const [level, setLevel] = useState(startLevel);
  const [results, setResults] = useState({}); // "topic|level" → { data } or { error }; switching back is instant
  const key = `${topic}|${level}`;
  const data = results[key]?.data;
  const error = results[key]?.error;

  useEffect(() => {
    if (results[key]) return undefined;
    let alive = true;
    authFetch(`/api/practice?${new URLSearchParams({ topic, level })}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
        return body;
      })
      .then(body => { if (alive) setResults(r => ({ ...r, [key]: { data: body } })); })
      .catch(e => { if (alive) setResults(r => ({ ...r, [key]: { error: e.message === 'Failed to fetch' ? 'Backend is not running. Start it with: npm run server' : e.message } })); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className="pg-cp">
      <div className="pg-cp-head">
        <span className="pg-cp-title"><Code2 size={14} /> Coding problems · {data?.label || topic}</span>
        <div className="pg-toggle-row" role="radiogroup" aria-label="Problem difficulty">
          {LEVELS.map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={level === k} className={`pg-chip ${level === k ? 'active' : ''}`} onClick={() => setLevel(k)}>{l}</button>
          ))}
        </div>
      </div>
      {data?.note && <p className="pg-cp-note">{data.note}</p>}
      {error && <p className="pg-rq-message is-error"><AlertTriangle size={14} /> {error}</p>}
      {!data && !error && <p className="pg-cp-note"><Loader2 size={13} className="pg-spin" /> Finding {level} problems on LeetCode, CodeChef and Codeforces…</p>}
      {data && (
        <div className="pg-cp-sites">
          {data.sites.map(site => (
            <section key={site.key} className="pg-cp-site" aria-label={`${site.name} problems`}>
              <div className="pg-cp-site-head">
                <strong>{site.name}</strong>
                {site.more && <a href={site.more} target="_blank" rel="noreferrer">More <ExternalLink size={11} /></a>}
              </div>
              {site.unavailable ? <p className="pg-cp-empty">{site.unavailable}</p>
                : site.error ? <p className="pg-cp-empty">Couldn't load {site.name} right now.</p>
                  : site.problems.length === 0 ? <p className="pg-cp-empty">No {level} problems found here.</p>
                    : (
                      <ol>
                        {site.problems.map(p => (
                          <li key={p.url}>
                            <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a>
                            <span className="pg-cp-meta">
                              {p.difficulty || (p.rating ? `Rating ${p.rating}` : 'Unrated')}
                              {p.tags?.length ? ` · ${p.tags.join(', ')}` : ''}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
