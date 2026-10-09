/**
 * Inbox tracker and follow-ups.
 *
 * Reads the user's mailbox (IMAP, same account and app password as email alerts), finds
 * job-related emails, lets the AI work out what each one means (confirmation, viewed,
 * assessment, interview, rejected, offer) and which application it belongs to, then
 * updates that application. Follow-ups: applications with no reply after N days get a
 * short email drafted for that job, sent from the user's own account only when they
 * approve it — as a reply in the recruiter's thread when there is one.
 *
 * An application's progress is stored with it in Supabase (applied_jobs.playwright_trace
 * JSON: { pipeline: { stage, events, contact, followUp } }).
 */
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { llmJson, hasLLM } from './llm.js';
import { emailAccount, sendFromUser, notify } from './notifier.js';
import { loadState, saveState } from './state.js';

export const STAGES = ['confirmation', 'viewed', 'assessment', 'interview', 'offer', 'rejected'];
const RANK = { confirmation: 1, viewed: 2, assessment: 3, interview: 4, offer: 5, rejected: 5 };
const STAGE_LABELS = { confirmation: 'Application received', viewed: 'Viewed by employer', assessment: 'Assessment', interview: 'Interview', offer: 'Offer', rejected: 'Not selected' };

const DEFAULTS = { enabled: false, followUpDays: 7, lookbackDays: 21 };
const SUBJECT_HINT = /applica|applied|interview|assessment|test|shortlist|selected|regret|unfortunately|moving forward|offer|hiring|recruit|talent|position|role|candidat|resume|\bcv\b|opportunit|next steps|your profile/i;
const FROM_HINT = /linkedin|naukri|indeed|career|\bhr\b|recruit|talent|jobs|hiring|workday|greenhouse|lever|smartrecruiters|icims|zoho|darwinbox|keka|hirist|instahyre|wellfound|unstop/i;
const NOT_JOB = /newsletter|digest|jobs for you|job alert|new jobs|recommended jobs|people you may know|webinar|course|discount|sale|otp|password/i;
const NO_REPLY = /no-?reply|donotreply|do-not-reply|notifications?@|jobs-noreply|alerts?@|mailer/i;

const norm = (s = '') => String(s).toLowerCase().replace(/\b(pvt|private|ltd|limited|inc|llp|technologies|technology|solutions|services|india)\b\.?/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export function inboxSettings() {
  return { ...DEFAULTS, ...(loadState().inbox || {}) };
}

export function updateInboxSettings(patch = {}) {
  const next = { ...inboxSettings() };
  if ('enabled' in patch) next.enabled = Boolean(patch.enabled);
  if ('followUpDays' in patch) next.followUpDays = Math.max(2, Math.min(30, Number(patch.followUpDays) || DEFAULTS.followUpDays));
  saveState({ inbox: next });
  return next;
}

const parseTrace = (raw) => { try { return raw ? JSON.parse(raw) : {}; } catch { return {}; } };

/**
 * @param deps { supabaseAdmin, getUserId, getProfile, log, onApplicationsChanged }
 */
export function createInbox(deps) {
  const { supabaseAdmin, getUserId, getProfile, log = () => {}, onApplicationsChanged = () => {} } = deps;
  let running = null;

  async function applications() {
    const userId = getUserId();
    if (!supabaseAdmin || !userId) return [];
    const { data, error } = await supabaseAdmin.from('applied_jobs')
      .select('id, job_id, title, company, location, status, applied_at, url, description, playwright_trace')
      .eq('user_id', userId).order('applied_at', { ascending: false }).limit(500);
    if (error) throw error;
    return (data || []).map(r => ({ ...r, trace: parseTrace(r.playwright_trace) }));
  }

  async function saveTrace(app, trace) {
    await supabaseAdmin.from('applied_jobs').update({ playwright_trace: JSON.stringify(trace) }).eq('id', app.id);
  }

  // ---- Reading the mailbox ----
  async function fetchCandidates(account, settings) {
    const client = new ImapFlow({
      host: account.imapHost, port: account.imapPort, secure: true,
      auth: { user: account.user, pass: account.pass }, logger: false, socketTimeout: 60000,
    });
    // A dropped connection (Gmail resets idle sockets) must not crash the backend:
    // log it; the next check reconnects
    client.on('error', (err) => log('warn', 'INBOX', `Email connection dropped (${err.code || err.message}); will retry on the next check.`));
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    const seen = new Set(loadState().inboxSeen || []);
    const found = [];
    try {
      const since = new Date(Date.now() - settings.lookbackDays * 86400000);
      const uids = (await client.search({ since }, { uid: true })) || [];
      const recent = uids.slice(-300);
      const heads = [];
      if (recent.length) {
        for await (const msg of client.fetch(recent, { envelope: true, uid: true }, { uid: true })) heads.push(msg);
      }
      const likely = heads.filter((m) => {
        const subject = m.envelope?.subject || '';
        const from = (m.envelope?.from || []).map(f => `${f.name || ''} ${f.address || ''}`).join(' ');
        const id = m.envelope?.messageId || `uid-${m.uid}`;
        return !seen.has(id) && !NOT_JOB.test(subject) && (SUBJECT_HINT.test(subject) || FROM_HINT.test(from));
      }).slice(-40);
      for (const m of likely) {
        const full = await client.fetchOne(String(m.uid), { source: true }, { uid: true }).catch(() => null);
        if (!full?.source) continue;
        const mail = await simpleParser(full.source).catch(() => null);
        if (!mail) continue;
        found.push({
          id: mail.messageId || `uid-${m.uid}`,
          messageId: mail.messageId || null,
          references: [].concat(mail.references || []).join(' ') || null,
          date: (mail.date || new Date()).toISOString(),
          fromName: mail.from?.value?.[0]?.name || '',
          fromAddress: mail.from?.value?.[0]?.address || '',
          replyTo: mail.replyTo?.value?.[0]?.address || '',
          subject: mail.subject || '',
          text: String(mail.text || '').replace(/\s+/g, ' ').slice(0, 1500),
        });
      }
    } finally {
      lock.release();
      await client.logout().catch(() => {});
    }
    return found;
  }

  // ---- Understanding each email ----
  async function classify(mails, apps) {
    if (!hasLLM() || !mails.length) return [];
    const list = apps.slice(0, 120).map((a, i) => `${i}: ${a.company} — ${a.title}`);
    const out = [];
    for (let i = 0; i < mails.length; i += 8) {
      const batch = mails.slice(i, i + 8);
      const res = await llmJson(
        'You sort a job seeker\'s emails. For each email decide if it is about one of their job applications and what it means. '
          + 'Stages: "confirmation" (application received), "viewed" (profile/application viewed), "assessment" (online test, assignment, coding round), '
          + '"interview" (invite or scheduling), "offer", "rejected" (not moving forward), "other" (job alerts, newsletters, unrelated). '
          + 'Match to the numbered applications by company (and role when there are several); null if none fits. Use only what the email says. '
          + 'Reply with JSON {"items":[{"id": string, "jobRelated": boolean, "stage": string, "company": string|null, "role": string|null, "application": integer|null, '
          + '"when": "ISO date-time of the interview/test"|null, "deadline": "ISO date"|null, "summary": string (max 20 words), "action": string|null (what the user should do), '
          + '"recruiterEmail": string|null (a person\'s address the user can reply to, not a no-reply address)}]}.',
        `Applications:\n${list.join('\n') || '(none)'}\n\nEmails:\n${JSON.stringify(batch.map(m => ({ id: m.id, from: `${m.fromName} <${m.fromAddress}>`, replyTo: m.replyTo, subject: m.subject, date: m.date, text: m.text })))}`,
      ).catch(() => null);
      out.push(...(res?.items || []));
    }
    return out;
  }

  /** Reads new job emails and updates the matching applications. */
  async function check({ reason = 'manual' } = {}) {
    if (running) return running;
    running = (async () => {
      const account = deps.fetchMails ? {} : emailAccount();
      if (!account) throw new Error('Set up Email in Automation → Alerts first (your Gmail and an app password).');
      const settings = inboxSettings();
      const [mails, apps] = await Promise.all([(deps.fetchMails || fetchCandidates)(account, settings), applications()]);
      const results = await classify(mails, apps);
      const byId = new Map(mails.map(m => [m.id, m]));
      const state = loadState();
      const events = state.inboxEvents || [];
      const seen = new Set(state.inboxSeen || []);
      const fresh = [];
      const touched = new Map();

      for (const r of results) {
        const mail = byId.get(r.id);
        if (!mail) continue;
        seen.add(mail.id);
        if (!r.jobRelated || !STAGES.includes(r.stage)) continue;
        let app = Number.isInteger(r.application) ? apps[r.application] : null;
        if (!app && r.company) app = apps.find(a => norm(a.company) && (norm(a.company).includes(norm(r.company)) || norm(r.company).includes(norm(a.company))));
        const event = {
          id: mail.id, date: mail.date, stage: r.stage, stageLabel: STAGE_LABELS[r.stage],
          company: r.company || app?.company || mail.fromName, role: r.role || app?.title || '',
          summary: r.summary || mail.subject, action: r.action || null, when: r.when || null, deadline: r.deadline || null,
          subject: mail.subject, from: mail.fromName || mail.fromAddress, jobId: app?.job_id || null,
        };
        fresh.push(event);
        if (app) {
          const trace = touched.get(app.id)?.trace || app.trace || {};
          const pipeline = trace.pipeline || { stage: null, events: [] };
          if (!pipeline.events.some(e => e.id === mail.id)) pipeline.events.push({ id: mail.id, date: mail.date, stage: r.stage, summary: event.summary, when: event.when });
          if (!pipeline.stage || RANK[r.stage] >= RANK[pipeline.stage]) pipeline.stage = r.stage;
          // Someone to follow up with: a real recruiter address, and the thread to reply in
          const person = [r.recruiterEmail, mail.replyTo, mail.fromAddress].find(a => a && !NO_REPLY.test(a));
          if (person) pipeline.contact = { email: person, messageId: mail.messageId, references: mail.references, subject: mail.subject };
          touched.set(app.id, { app, trace: { ...trace, pipeline } });
        }
      }
      // Emails the AI couldn't classify this time are retried next check; the rest are done
      for (const m of mails) if (!results.some(r => r.id === m.id) && !hasLLM()) seen.add(m.id);

      for (const { app, trace } of touched.values()) await saveTrace(app, trace).catch(err => log('warn', 'INBOX', `Couldn't update ${app.company}: ${err.message}`));
      saveState({
        inboxEvents: [...fresh, ...events].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 200),
        inboxSeen: [...seen].slice(-3000),
        inbox: { ...inboxSettings(), lastChecked: new Date().toISOString() },
      });
      if (touched.size) onApplicationsChanged();

      // Alerts for what matters most
      const important = fresh.filter(e => ['interview', 'assessment', 'offer'].includes(e.stage));
      if (important.length) {
        const subject = important.length === 1
          ? `${important[0].stageLabel}: ${important[0].company}${important[0].role ? ` — ${important[0].role}` : ''}`
          : `${important.length} updates: interviews, tests or offers`;
        const text = important.map(e => `• ${e.stageLabel} — ${e.company}${e.role ? ` (${e.role})` : ''}\n  ${e.summary}${e.when ? `\n  When: ${new Date(e.when).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}` : ''}${e.action ? `\n  To do: ${e.action}` : ''}`).join('\n\n')
          + '\n\nPractise in Agent Penguin → Mocks: http://localhost:5173/mocks';
        await notify('inbox', subject, text).catch(() => {});
      }
      log('cdp', 'INBOX', `Checked email (${reason}): ${mails.length} job email${mails.length === 1 ? '' : 's'}, ${fresh.length} update${fresh.length === 1 ? '' : 's'}, ${touched.size} application${touched.size === 1 ? '' : 's'} updated.`);
      return { checked: mails.length, updates: fresh.length, applicationsUpdated: touched.size };
    })();
    try { return await running; } finally { running = null; }
  }

  // ---- Follow-ups ----
  const contactFromDescription = (text = '') => (String(text).match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || []).find(a => !NO_REPLY.test(a)) || null;

  async function followUpsDue() {
    const days = inboxSettings().followUpDays;
    const cutoff = Date.now() - days * 86400000;
    const apps = await applications();
    return apps
      .filter(a => a.status === 'applied' && a.applied_at && new Date(a.applied_at).getTime() < cutoff)
      .filter(a => !['assessment', 'interview', 'offer', 'rejected'].includes(a.trace.pipeline?.stage))
      .filter(a => !a.trace.pipeline?.followUp)
      .map(a => ({
        jobId: a.job_id, company: a.company, title: a.title, url: a.url, appliedAt: a.applied_at,
        daysAgo: Math.floor((Date.now() - new Date(a.applied_at).getTime()) / 86400000),
        stage: a.trace.pipeline?.stage || null,
        to: a.trace.pipeline?.contact?.email || contactFromDescription(a.description),
        inThread: Boolean(a.trace.pipeline?.contact?.messageId),
      }))
      .slice(0, 50);
  }

  async function findApp(jobId) {
    const app = (await applications()).find(a => String(a.job_id) === String(jobId));
    if (!app) throw new Error('Application not found.');
    return app;
  }

  async function draftFollowUp(jobId) {
    const app = await findApp(jobId);
    const profile = getProfile() || {};
    const contact = app.trace.pipeline?.contact;
    const days = Math.max(1, Math.floor((Date.now() - new Date(app.applied_at).getTime()) / 86400000));
    let subject = contact?.subject ? `Re: ${contact.subject.replace(/^(re:\s*)+/i, '')}` : `Following up on my application — ${app.title}`;
    let body = '';
    if (hasLLM()) {
      const out = await llmJson(
        'Write a short, polite follow-up email from a job applicant to a recruiter in India. 60–110 words. Mention the role and when they applied, '
          + 'one concrete, true reason they fit (from the resume facts only), and ask about next steps. No flattery, no pressure, no invented facts. '
          + 'End with the sign-off and the candidate\'s name and phone. Reply with JSON {"subject": string, "body": string}.',
        JSON.stringify({
          role: app.title, company: app.company, appliedDaysAgo: days, replyingToThread: Boolean(contact?.messageId), threadSubject: contact?.subject || null,
          candidate: { name: profile.name, phone: profile.phone, summary: profile.resumeAnalysis?.summary || profile.headline, skills: (profile.resumeAnalysis?.skills || []).map(s => s.name).slice(0, 12) },
          jobDescription: String(app.description || '').slice(0, 800),
        }),
      ).catch(() => null);
      body = String(out?.body || '').trim();
      if (!contact?.subject && out?.subject) subject = String(out.subject).trim();
    }
    if (!body) {
      body = `Hello,\n\nI applied for the ${app.title} role at ${app.company} ${days} days ago and wanted to follow up. I'm still very interested and would be glad to share anything else you need.\n\nCould you let me know about the next steps?\n\nThank you,\n${profile.name || ''}${profile.phone ? `\n${profile.phone}` : ''}`;
    }
    return { jobId: app.job_id, company: app.company, title: app.title, to: contact?.email || contactFromDescription(app.description) || '', subject, body, inThread: Boolean(contact?.messageId) };
  }

  async function sendFollowUp({ jobId, to, subject, body }) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to || '').trim())) throw new Error('Enter a valid recipient email address.');
    if (!String(body || '').trim()) throw new Error('The email is empty.');
    const app = await findApp(jobId);
    const contact = app.trace.pipeline?.contact;
    const sameThread = contact?.messageId && contact.email && contact.email.toLowerCase() === String(to).trim().toLowerCase();
    await sendFromUser({
      to: String(to).trim(), subject: String(subject || '').trim() || `Following up — ${app.title}`, text: String(body),
      ...(sameThread ? { inReplyTo: contact.messageId, references: [contact.references, contact.messageId].filter(Boolean).join(' ') } : {}),
    });
    const pipeline = { stage: null, events: [], ...(app.trace.pipeline || {}) };
    pipeline.followUp = { sentAt: new Date().toISOString(), to: String(to).trim(), subject };
    await saveTrace(app, { ...app.trace, pipeline });
    log('success', 'FOLLOW-UP SENT', `Follow-up sent to ${to} for ${app.company} — "${app.title}".`);
    onApplicationsChanged();
    return { success: true };
  }

  async function skipFollowUp(jobId) {
    const app = await findApp(jobId);
    const pipeline = { stage: null, events: [], ...(app.trace.pipeline || {}) };
    pipeline.followUp = { skipped: true, at: new Date().toISOString() };
    await saveTrace(app, { ...app.trace, pipeline });
    return { success: true };
  }

  return { check, followUpsDue, draftFollowUp, sendFollowUp, skipFollowUp, events: () => loadState().inboxEvents || [] };
}
