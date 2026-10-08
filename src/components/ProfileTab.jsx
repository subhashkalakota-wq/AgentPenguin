import React, { useRef, useState } from 'react';
import {
  Pencil,
  Mail,
  Phone,
  MapPin,
  FileText,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  X,
  Save
} from 'lucide-react';
import { SCREENING_QUESTIONS, missingScreeningAnswers } from '../../shared/screeningQuestions';
import { searchLocations } from '../../shared/locations';

const EXPERIENCE_LEVELS = ['Internship', 'Entry level', 'Associate', 'Mid-Senior level', 'Director', 'Executive'];

const PROFILE_DEFAULTS = {
  name: '', email: '', phoneCountryCode: 'India (+91)', phone: '', location: '', headline: '',
  linkedinUrl: '', githubUrl: '', portfolioUrl: '',
  experienceYears: '', workAuthorization: 'Yes', visaRequired: 'No', salaryFloor: '',
  noticePeriod: '', degree: '', relocation: '', skills: [],
};

const toList = (text) => text.split(',').map(s => s.trim()).filter(Boolean);

function buildDraft(profile, config) {
  const roles = Array.isArray(config.searchQueries) && config.searchQueries.length
    ? config.searchQueries
    : config.searchQuery ? [config.searchQuery] : [];
  return {
    ...PROFILE_DEFAULTS,
    ...profile,
    skillsText: (profile.skills || []).join(', '),
    screeningAnswers: { ...(profile.screeningAnswers || {}) },
    rolesText: roles.join(', '),
    searchLocation: searchLocations(config).join('; '),
    experienceLevel: config.experienceLevel || 'Mid-Senior level',
    maxApplications: config.maxApplications ?? 50,
    pacingDelaySec: config.pacingDelaySec ?? 6,
    parallelTabs: config.parallelTabs ?? 10,
  };
}

function Value({ children }) {
  const empty = children == null || children === '' || (Array.isArray(children) && children.length === 0);
  return empty ? <span className="pg-not-set">Not set</span> : <>{children}</>;
}

function LinkValue({ url }) {
  if (!url) return <Value />;
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="pg-ext-link">
      {url.replace(/^https?:\/\/(www\.)?/i, '')}
      <ExternalLink size={12} />
    </a>
  );
}

export default function ProfileTab({ profile, onSaveProfile, config, onSaveConfig, currentUser, isProfileReady }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => buildDraft(profile, config));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const avatarUrl = profile.avatar || currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture;
  const displayName = profile.name || currentUser?.user_metadata?.full_name || currentUser?.email || 'Your name';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const roles = Array.isArray(config.searchQueries) && config.searchQueries.length
    ? config.searchQueries
    : config.searchQuery ? [config.searchQuery] : [];

  const missing = [
    !profile.name?.trim() && 'name',
    !profile.email?.includes('@') && 'email',
    !(profile.phone?.trim().length >= 5) && 'phone',
    !(profile.resumeFile && profile.resumePath) && 'resume',
    missingScreeningAnswers(profile.screeningAnswers).length > 0 && 'application answers',
  ].filter(Boolean);
  const missingAnswers = missingScreeningAnswers(profile.screeningAnswers);
  const setAnswer = (key) => (e) => setDraft(d => ({ ...d, screeningAnswers: { ...d.screeningAnswers, [key]: e.target.value } }));

  const set = (field) => (e) => setDraft(d => ({ ...d, [field]: e.target.value }));

  const startEdit = () => {
    setDraft(buildDraft(profile, config));
    setNotice(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setNotice(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.email.includes('@')) {
      setNotice({ type: 'error', text: 'Name and a valid email are required.' });
      return;
    }
    setSaving(true);
    const { skillsText, rolesText, searchLocation, experienceLevel, maxApplications, pacingDelaySec, parallelTabs, screeningAnswers, ...rest } = draft;
    const roleList = toList(rolesText);
    const nextProfile = {
      ...profile,
      ...rest,
      name: rest.name.trim(),
      email: rest.email.trim(),
      phone: rest.phone.trim(),
      experienceYears: rest.experienceYears === '' ? '' : Number(rest.experienceYears),
      skills: toList(skillsText),
      screeningAnswers: Object.fromEntries(Object.entries(screeningAnswers || {}).map(([k, v]) => [k, String(v ?? '').trim()])),
      targetRole: roleList[0] || profile.targetRole,
    };
    const nextConfig = {
      ...config,
      searchQueries: roleList.length ? roleList : config.searchQueries,
      searchQuery: roleList[0] || config.searchQuery,
      locations: searchLocation.split(';').map(l => l.trim()).filter(Boolean),
      location: searchLocation.split(';').map(l => l.trim()).find(Boolean) || '',
      experienceLevel,
      maxApplications: Math.max(1, Number(maxApplications) || 1),
      pacingDelaySec: Math.max(1, Number(pacingDelaySec) || 1),
      parallelTabs: Math.max(1, Math.min(15, Number(parallelTabs) || 10)),
    };
    try {
      onSaveConfig(nextConfig);
      await onSaveProfile(nextProfile);
      setEditing(false);
      setNotice({ type: 'ok', text: 'Profile saved.' });
    } catch (err) {
      setNotice({ type: 'error', text: `Could not save: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  // Resume changes save immediately, in both view and edit mode
  const applyResume = (resume) => {
    onSaveProfile({ ...profile, ...resume });
    setDraft(d => ({ ...d, ...resume }));
  };

  const handleResumeFile = (file) => {
    if (!file) return;
    if (!/\.(pdf|docx?)$/i.test(file.name)) {
      setNotice({ type: 'error', text: 'Please choose a PDF, DOC or DOCX file.' });
      return;
    }
    setUploading(true);
    setNotice(null);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/upload-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, fileData: reader.result, fileType: file.type })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Upload failed');
        applyResume({ resumeFile: data.fileName, resumePath: data.filePath, resumeSize: data.fileSize, resumeAnalysis: data.analysis || null });
        setNotice(data.analysis
          ? { type: 'ok', text: `Resume uploaded and analysed: ${data.analysis.totalExperienceYears} years experience, ${data.analysis.skills.length} skills found.` }
          : { type: 'error', text: `Resume uploaded, but it couldn't be analysed${data.analysisError ? `: ${data.analysisError}` : ''}.` });
      } catch (err) {
        setNotice({ type: 'error', text: `Resume upload failed: ${err.message}. Is the backend running (npm run server)?` });
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setNotice({ type: 'error', text: 'Could not read that file.' });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const [analysing, setAnalysing] = useState(false);
  const reanalyse = async () => {
    setAnalysing(true);
    setNotice(null);
    try {
      const res = await fetch('http://localhost:3001/api/resume/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumePath: profile.resumePath, force: true })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onSaveProfile({ ...profile, resumeAnalysis: data.analysis });
      setNotice({ type: 'ok', text: 'Resume re-analysed.' });
    } catch (err) {
      setNotice({ type: 'error', text: `Couldn't analyse the resume: ${err.message === 'Failed to fetch' ? 'backend is not running (npm run server)' : err.message}` });
    } finally {
      setAnalysing(false);
    }
  };

  const handleRemoveResume = () => {
    applyResume({ resumeFile: null, resumePath: null, resumeSize: null, resumeAnalysis: null });
    setNotice({ type: 'error', text: 'Resume removed. Upload one before starting the agent.' });
  };

  const field = (label, name, props = {}) => (
    <div className="pg-field">
      <label htmlFor={`pf-${name}`}>{label}</label>
      <input id={`pf-${name}`} className="pg-input" value={draft[name] ?? ''} onChange={set(name)} {...props} />
    </div>
  );

  const select = (label, name, options) => (
    <div className="pg-field">
      <label htmlFor={`pf-${name}`}>{label}</label>
      <select id={`pf-${name}`} className="pg-input" value={draft[name]} onChange={set(name)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <form className="pg-tab-body pg-profile" onSubmit={handleSave}>
      {/* Identity header */}
      <section className="pg-card pg-profile-hero">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="pg-profile-avatar" />
        ) : (
          <span className="pg-profile-avatar pg-profile-initials">{initials}</span>
        )}
        <div className="pg-profile-id">
          <div className="pg-profile-name-row">
            <h2>{displayName}</h2>
            {isProfileReady
              ? <span className="pg-pill pg-pill-ok"><CheckCircle2 size={13} /> Ready to apply</span>
              : <span className="pg-pill pg-pill-warn"><AlertTriangle size={13} /> Missing {missing.join(', ')}</span>}
          </div>
          <p className="pg-profile-headline"><Value>{profile.headline}</Value></p>
          <div className="pg-profile-meta">
            <span><Mail size={14} /><Value>{profile.email}</Value></span>
            <span><Phone size={14} /><Value>{profile.phone && `${(profile.phoneCountryCode || '').replace(/^.*\((.*)\)$/, '$1')} ${profile.phone}`}</Value></span>
            <span><MapPin size={14} /><Value>{profile.location}</Value></span>
          </div>
        </div>
        <div className="pg-profile-actions">
          {editing ? (
            <>
              <button type="button" className="pg-btn" onClick={cancelEdit} disabled={saving}>
                <X size={14} /> Cancel
              </button>
              <button type="submit" className="pg-btn pg-btn-primary" disabled={saving}>
                {saving ? <Loader2 size={14} className="pg-spin" /> : <Save size={14} />}
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          ) : (
            <button type="button" className="pg-btn pg-btn-primary" onClick={startEdit}>
              <Pencil size={14} /> Edit profile
            </button>
          )}
        </div>
      </section>

      {notice && (
        <p className={`pg-notice ${notice.type === 'error' ? 'is-error' : ''}`} role="status">
          {notice.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          {notice.text}
        </p>
      )}

      <div className="pg-profile-grid">
        {/* Personal & contact */}
        <section className="pg-card">
          <div className="pg-card-head"><h3 className="pg-card-title">Personal details</h3></div>
          {editing ? (
            <div className="pg-form-grid">
              {field('Full name', 'name', { required: true, autoComplete: 'name' })}
              {field('Email', 'email', { type: 'email', required: true, autoComplete: 'email' })}
              {field('Country code', 'phoneCountryCode')}
              {field('Phone', 'phone', { type: 'tel', autoComplete: 'tel' })}
              {field('Current location', 'location')}
              {field('Headline', 'headline')}
            </div>
          ) : (
            <dl className="pg-dl">
              <div><dt>Full name</dt><dd><Value>{profile.name}</Value></dd></div>
              <div><dt>Email</dt><dd><Value>{profile.email}</Value></dd></div>
              <div><dt>Phone</dt><dd><Value>{profile.phone && `${profile.phoneCountryCode || ''} ${profile.phone}`}</Value></dd></div>
              <div><dt>Location</dt><dd><Value>{profile.location}</Value></dd></div>
              <div><dt>Headline</dt><dd><Value>{profile.headline}</Value></dd></div>
            </dl>
          )}
        </section>

        {/* Resume */}
        <section className="pg-card">
          <div className="pg-card-head"><h3 className="pg-card-title">Resume</h3></div>
          <div className="pg-resume">
            <span className="pg-resume-icon"><FileText size={20} /></span>
            <div className="pg-resume-info">
              {profile.resumeFile ? (
                <>
                  <strong>{profile.resumeFile}</strong>
                  <span>{profile.resumeSize ? `${(profile.resumeSize / 1024).toFixed(1)} KB · ` : ''}Attached to every application</span>
                </>
              ) : (
                <>
                  <strong>No resume uploaded</strong>
                  <span>Required before the agent can apply</span>
                </>
              )}
            </div>
          </div>
          <div className="pg-resume-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              hidden
              onChange={(e) => { handleResumeFile(e.target.files?.[0]); e.target.value = ''; }}
            />
            <button type="button" className="pg-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 size={14} className="pg-spin" /> : <Upload size={14} />}
              {uploading ? 'Uploading…' : profile.resumeFile ? 'Replace' : 'Upload resume'}
            </button>
            {profile.resumeFile && (
              <button type="button" className="pg-btn pg-btn-ghost" onClick={handleRemoveResume} disabled={uploading}>
                <Trash2 size={14} /> Remove
              </button>
            )}
            {profile.resumeFile && (
              <button type="button" className="pg-btn pg-btn-ghost" onClick={reanalyse} disabled={analysing || uploading}>
                {analysing ? <Loader2 size={14} className="pg-spin" /> : <CheckCircle2 size={14} />}
                {analysing ? 'Analysing…' : 'Re-analyse'}
              </button>
            )}
          </div>
          {profile.resumeAnalysis && (
            <div className="pg-resume-analysis">
              <p className="pg-ra-title">What Penguin learned from your resume <span>(used to answer application questions — anything not on it counts as 0)</span></p>
              <dl className="pg-dl">
                <div><dt>Work experience</dt><dd>{profile.resumeAnalysis.totalExperienceYears} years{profile.resumeAnalysis.internshipMonths ? ` · ${profile.resumeAnalysis.internshipMonths} months internship` : ''}</dd></div>
                {profile.resumeAnalysis.highestDegree && <div><dt>Education</dt><dd>{(profile.resumeAnalysis.education || [])[0] ? `${profile.resumeAnalysis.education[0].degree} ${profile.resumeAnalysis.education[0].field ? `(${profile.resumeAnalysis.education[0].field})` : ''} — ${profile.resumeAnalysis.education[0].status}` : profile.resumeAnalysis.highestDegree}</dd></div>}
                <div><dt>Skills</dt><dd>
                  <div className="pg-tag-list pg-tag-list-inline">
                    {(profile.resumeAnalysis.skills || []).length
                      ? profile.resumeAnalysis.skills.map(s => <span key={s.name} className="pg-tag-chip">{s.name} · {s.years} yr{s.years === 1 ? '' : 's'}</span>)
                      : <span className="pg-not-set">None found</span>}
                  </div>
                </dd></div>
                {(profile.resumeAnalysis.certifications || []).length > 0 && <div><dt>Certifications</dt><dd>{profile.resumeAnalysis.certifications.length}</dd></div>}
              </dl>
            </div>
          )}
        </section>

        {/* Work details */}
        <section className="pg-card">
          <div className="pg-card-head"><h3 className="pg-card-title">Work details</h3></div>
          {editing ? (
            <div className="pg-form-grid">
              {field('Years of experience', 'experienceYears', { type: 'number', min: 0, max: 60 })}
              {field('Highest degree', 'degree')}
              {select('Authorized to work', 'workAuthorization', ['Yes', 'No'])}
              {select('Needs visa sponsorship', 'visaRequired', ['No', 'Yes'])}
              {field('Expected salary (minimum)', 'salaryFloor')}
              {field('Notice period', 'noticePeriod')}
              {field('Relocation', 'relocation')}
            </div>
          ) : (
            <dl className="pg-dl">
              <div><dt>Experience</dt><dd><Value>{profile.experienceYears !== '' && profile.experienceYears != null ? `${profile.experienceYears} years` : ''}</Value></dd></div>
              <div><dt>Highest degree</dt><dd><Value>{profile.degree}</Value></dd></div>
              <div><dt>Authorized to work</dt><dd><Value>{profile.workAuthorization}</Value></dd></div>
              <div><dt>Needs visa sponsorship</dt><dd><Value>{profile.visaRequired}</Value></dd></div>
              <div><dt>Expected salary</dt><dd><Value>{profile.salaryFloor}</Value></dd></div>
              <div><dt>Notice period</dt><dd><Value>{profile.noticePeriod}</Value></dd></div>
              <div><dt>Relocation</dt><dd><Value>{profile.relocation}</Value></dd></div>
            </dl>
          )}
        </section>

        {/* Links */}
        <section className="pg-card">
          <div className="pg-card-head"><h3 className="pg-card-title">Links</h3></div>
          {editing ? (
            <div className="pg-form-grid pg-form-grid-1">
              {field('LinkedIn', 'linkedinUrl', { type: 'url', placeholder: 'https://linkedin.com/in/…' })}
              {field('GitHub', 'githubUrl', { type: 'url', placeholder: 'https://github.com/…' })}
              {field('Portfolio', 'portfolioUrl', { type: 'url', placeholder: 'https://…' })}
            </div>
          ) : (
            <dl className="pg-dl">
              <div><dt>LinkedIn</dt><dd><LinkValue url={profile.linkedinUrl} /></dd></div>
              <div><dt>GitHub</dt><dd><LinkValue url={profile.githubUrl} /></dd></div>
              <div><dt>Portfolio</dt><dd><LinkValue url={profile.portfolioUrl} /></dd></div>
            </dl>
          )}
        </section>

        {/* Skills */}
        <section className="pg-card pg-span-2">
          <div className="pg-card-head"><h3 className="pg-card-title">Skills</h3></div>
          {editing ? (
            <div className="pg-form-grid pg-form-grid-1">
              <div className="pg-field">
                <label htmlFor="pf-skills">Skills (comma separated)</label>
                <textarea id="pf-skills" className="pg-input" rows={2} value={draft.skillsText} onChange={set('skillsText')} />
              </div>
            </div>
          ) : (
            <div className="pg-tag-list">
              {(profile.skills || []).length ? profile.skills.map(s => <span key={s} className="pg-tag-chip">{s}</span>) : <Value />}
            </div>
          )}
        </section>

        {/* Application questions the platforms ask */}
        <section className="pg-card pg-span-2" id="application-questions">
          <div className="pg-card-head">
            <div>
              <h3 className="pg-card-title">Application questions</h3>
              <p className="pg-card-sub">
                LinkedIn, Naukri and Indeed often ask these. Answer once — Penguin reuses your answers in every application.
                {missingAnswers.length > 0 && <strong className="pg-required-note"> {missingAnswers.length} required answer{missingAnswers.length === 1 ? '' : 's'} missing.</strong>}
              </p>
            </div>
          </div>
          {editing ? (
            <div className="pg-form-grid">
              {SCREENING_QUESTIONS.map(sq => (
                <div key={sq.key} className={`pg-field ${sq.type === 'textarea' ? 'pg-span-2' : ''}`}>
                  <label htmlFor={`sq-${sq.key}`}>
                    {sq.label}{sq.required && <span className="pg-req" aria-hidden="true"> *</span>}
                  </label>
                  {sq.type === 'textarea' ? (
                    <textarea
                      id={`sq-${sq.key}`}
                      className="pg-input"
                      rows={3}
                      required={sq.required}
                      placeholder={sq.placeholder || ''}
                      value={draft.screeningAnswers?.[sq.key] ?? ''}
                      onChange={setAnswer(sq.key)}
                    />
                  ) : (
                    <input
                      id={`sq-${sq.key}`}
                      className="pg-input"
                      type={sq.type === 'number' ? 'number' : 'text'}
                      min={sq.type === 'number' ? 0 : undefined}
                      required={sq.required}
                      placeholder={sq.placeholder || ''}
                      value={draft.screeningAnswers?.[sq.key] ?? ''}
                      onChange={setAnswer(sq.key)}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <dl className="pg-dl pg-dl-answers">
              {SCREENING_QUESTIONS.map(sq => (
                <div key={sq.key}>
                  <dt>{sq.label}{sq.required && <span className="pg-req"> *</span>}</dt>
                  <dd>
                    {String(profile.screeningAnswers?.[sq.key] ?? '').trim()
                      ? profile.screeningAnswers[sq.key]
                      : <span className={sq.required ? 'pg-not-set pg-not-set-required' : 'pg-not-set'}>{sq.required ? 'Required — not answered yet' : 'Not set'}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        {/* Job search preferences */}
        <section className="pg-card pg-span-2">
          <div className="pg-card-head">
            <div>
              <h3 className="pg-card-title">Job search preferences</h3>
              <p className="pg-card-sub">What the agent searches for on LinkedIn</p>
            </div>
          </div>
          {editing ? (
            <div className="pg-form-grid">
              <div className="pg-field pg-span-2">
                <label htmlFor="pf-roles">Target roles (comma separated)</label>
                <input id="pf-roles" className="pg-input" value={draft.rolesText} onChange={set('rolesText')} />
              </div>
              {field('Search locations (separate with ;)', 'searchLocation', { placeholder: 'Hyderabad; Bengaluru; Remote' })}
              {select('Experience level', 'experienceLevel', EXPERIENCE_LEVELS)}
              {field('Max applications per session', 'maxApplications', { type: 'number', min: 1, max: 200 })}
              {field('Delay between applications (seconds)', 'pacingDelaySec', { type: 'number', min: 1, max: 120 })}
              {field('Tabs at once (apply to this many jobs in parallel, 1–15)', 'parallelTabs', { type: 'number', min: 1, max: 15 })}
            </div>
          ) : (
            <dl className="pg-dl pg-dl-2col">
              <div className="pg-span-2"><dt>Target roles</dt><dd>
                {roles.length ? <div className="pg-tag-list pg-tag-list-inline">{roles.map(r => <span key={r} className="pg-tag-chip">{r}</span>)}</div> : <Value />}
              </dd></div>
              <div><dt>Search locations</dt><dd>
                {searchLocations(config).length
                  ? <div className="pg-tag-list pg-tag-list-inline">{searchLocations(config).map(l => <span key={l} className="pg-tag-chip">{l}</span>)}</div>
                  : <Value />}
              </dd></div>
              <div><dt>Experience level</dt><dd><Value>{config.experienceLevel}</Value></dd></div>
              <div><dt>Max applications</dt><dd><Value>{config.maxApplications}</Value></dd></div>
              <div><dt>Delay between applications</dt><dd><Value>{config.pacingDelaySec ? `${config.pacingDelaySec}s` : ''}</Value></dd></div>
              <div><dt>Tabs at once</dt><dd>{config.parallelTabs ?? 10}</dd></div>
            </dl>
          )}
        </section>
      </div>
    </form>
  );
}
