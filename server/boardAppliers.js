/**
 * Naukri and Indeed applications, built on the same engine as LinkedIn:
 * - every question type answered by questionAnswerer (learned answers, resume, rules, AI,
 *   answers written for this job from its description)
 * - questions Penguin can't answer are collected for the "Answer & finish" form
 * - short time limits on every page action, human-check detection, confirmed submit
 * - every result that needs the user carries a reason, a plain-English detail and questions
 *
 * Naukri asks recruiter questions in a chat drawer one at a time; Indeed uses multi-step
 * forms (handled by the shared form filler). Job-board markup changes often, so both look
 * for elements by role and text rather than exact class names.
 */
import { fillStep, humanCheck } from './playwrightApplier.js';
import { answerQuestion } from './questionAnswerer.js';
import { blockedReason, indeedBlocked } from './platforms.js';

const randomSleep = (min, max) => new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
const norm = (s = '') => String(s).toLowerCase().replace(/\s+/g, ' ').trim();

// Collects questions for Needs review and builds review results
function reviewKit(job, onProgress, onFinish = async () => {}) {
  const questions = new Map();
  const collect = (list = []) => list.forEach(q => { if (q?.question && !questions.has(q.question)) questions.set(q.question, q); });
  const review = async (reason, detail, tag = 'NEEDS REVIEW') => {
    onProgress({ type: 'warn', tag, message: `${job.company}: ${detail} Added to Needs review.` });
    await onFinish();
    return { success: false, reason, detail, questions: [...questions.values()].slice(0, 15) };
  };
  return { collect, review };
}

// Visible job-description text on a job page (used to write answers for this job)
async function pageDescription(page, selectors) {
  return page.evaluate((sels) => {
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim().length > 80) return el.innerText.trim().slice(0, 6000);
    }
    const heading = Array.from(document.querySelectorAll('h1, h2, h3, h4, div, span'))
      .find(h => /^(job description|about the job|full job description)$/i.test((h.innerText || '').trim()));
    const box = heading?.closest('section, article, div');
    return box ? box.innerText.trim().slice(0, 6000) : '';
  }, selectors).catch(() => '');
}

// ---------------- Naukri ----------------

/**
 * Answers Naukri's recruiter-question chat drawer, one question per turn.
 * @returns { success } | { stuck: question } | { closed: true }
 */
async function answerNaukriChat(page, job, profile, onProgress, collect) {
  let lastQuestion = '';
  let repeats = 0;
  for (let turn = 0; turn < 25; turn++) {
    const s = await page.evaluate(() => {
      const visible = (el) => !!(el && (el.offsetParent || el.getClientRects().length));
      const body = document.body.innerText || '';
      const success = /successfully applied|applied successfully|application (has been )?sent|you have applied/i.test(body);
      const drawer = Array.from(document.querySelectorAll('[class*="chatbot" i], [class*="chatBot" i]')).filter(visible)
        .sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0];
      if (!drawer) return { open: false, success };
      drawer.querySelectorAll('[data-pg-nk],[data-pg-nk-input],[data-pg-nk-send]').forEach(e => {
        e.removeAttribute('data-pg-nk'); e.removeAttribute('data-pg-nk-input'); e.removeAttribute('data-pg-nk-send');
      });

      // The question: the latest message from the recruiter bot
      const botMsgs = Array.from(drawer.querySelectorAll('[class*="botMsg" i], [class*="bot-msg" i], [class*="botItem" i], li[class*="bot" i], [class*="botText" i]'))
        .filter(visible).map(e => (e.innerText || '').trim()).filter(Boolean);
      let question = botMsgs[botMsgs.length - 1] || '';
      if (!question) {
        const texts = Array.from(drawer.querySelectorAll('li, p, span, div')).filter(e => visible(e) && !e.children.length)
          .map(e => (e.innerText || '').trim()).filter(t => t.length > 8);
        question = [...texts].reverse().find(t => /\?\s*$/.test(t)) || texts[texts.length - 1] || '';
      }

      // Choices: radio / checkbox inputs, else chip-style buttons
      const opts = [];
      let i = 0;
      for (const el of drawer.querySelectorAll('input[type="radio"], input[type="checkbox"]')) {
        if (!visible(el) && !visible(el.parentElement)) continue;
        const label = ((el.labels && el.labels[0]?.innerText) || el.parentElement?.innerText || el.value || '').trim();
        if (!label) continue;
        el.setAttribute('data-pg-nk', String(i));
        opts.push({ i: i++, label, multi: el.type === 'checkbox' });
      }
      if (!opts.length) {
        for (const el of drawer.querySelectorAll('[class*="chip" i], [role="radio"], [role="option"], [class*="option" i] label')) {
          const label = (el.innerText || '').trim();
          if (!visible(el) || !label || label.length > 90 || label === question) continue;
          el.setAttribute('data-pg-nk', String(i));
          opts.push({ i: i++, label, multi: false });
        }
      }
      const input = Array.from(drawer.querySelectorAll('[contenteditable="true"], textarea, input[type="text"], input[type="number"], input:not([type])')).find(visible);
      if (input) input.setAttribute('data-pg-nk-input', '1');
      // The Save/Send control itself, not a wrapper whose text happens to be "Save"
      const isSend = (e) => visible(e) && (/^(save|send|submit|next|done|continue)$/i.test((e.innerText || '').trim()) || /sendmsg|send-msg|send_msg/i.test(String(e.className || '')));
      const send = Array.from(drawer.querySelectorAll('button, div, span, a'))
        .filter(e => isSend(e) && !Array.from(e.querySelectorAll('button, div, span, a')).some(isSend))[0];
      if (send) send.setAttribute('data-pg-nk-send', '1');
      return {
        open: true, success, question, opts, hasInput: Boolean(input), hasSend: Boolean(send),
        numeric: Boolean(input && (input.type === 'number' || input.inputMode === 'numeric')),
      };
    }).catch(() => ({ open: false }));

    if (s.success) return { success: true };
    if (!s.open) return { closed: true };
    if (!s.question) return { stuck: 'a question Penguin could not read' };
    repeats = s.question === lastQuestion ? repeats + 1 : 0;
    lastQuestion = s.question;
    if (repeats >= 2) return { stuck: s.question };

    const options = s.opts.map(o => o.label);
    const type = options.length ? (s.opts.some(o => o.multi) ? 'multi' : 'radio')
      : (s.numeric || /how many|years|ctc|lpa|salary|notice|days|percentage|cgpa/i.test(s.question) ? 'number' : 'text');
    const r = await answerQuestion({ question: s.question, type, options }, profile, { force: true, job });
    if (!r) {
      collect([{ question: s.question, type, options }]);
      return { stuck: s.question };
    }
    if (r.source === 'auto-pick') collect([{ question: s.question, type, options, guess: r.answer }]);

    if (options.length) {
      const wanted = (Array.isArray(r.answer) ? r.answer : [r.answer])
        .map(a => options.findIndex(o => norm(o) === norm(a) || norm(o).includes(norm(a)) || norm(a).includes(norm(o))))
        .filter(i => i >= 0);
      for (const i of (wanted.length ? [...new Set(wanted)] : [0])) {
        await page.locator(`[data-pg-nk="${i}"]`).first().evaluate(el => el.click()).catch(() => {});
        await randomSleep(150, 300);
      }
    } else if (s.hasInput) {
      const value = type === 'number' ? (String(r.answer).match(/\d+(\.\d+)?/)?.[0] ?? '0') : String(r.answer);
      const input = page.locator('[data-pg-nk-input]').first();
      await input.fill(value, { timeout: 5000 }).catch(() => input.evaluate((el, v) => {
        if ('value' in el) el.value = v; else el.innerText = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, value).catch(() => {}));
    }
    onProgress({ type: 'llm', tag: r.source === 'tailored' ? 'WRITTEN FOR JOB' : r.source === 'learned' ? 'YOUR ANSWER' : 'NAUKRI ANSWER',
      message: `"${s.question.slice(0, 80)}" → ${(Array.isArray(r.answer) ? r.answer.join(', ') : String(r.answer)).slice(0, 60)}` });
    await randomSleep(400, 700);
    const send = page.locator('[data-pg-nk-send]').first();
    if (await send.count().catch(() => 0)) await send.click({ timeout: 5000 }).catch(() => send.evaluate(el => el.click()).catch(() => {}));
    else await page.locator('[data-pg-nk-input]').first().press('Enter').catch(() => {});
    await randomSleep(1500, 2300);
  }
  return { stuck: lastQuestion || 'too many questions' };
}

export async function applyNaukriJob(page, job, profile, options = {}, onProgress = () => {}) {
  if (!page || page.isClosed()) return { success: false, reason: 'tab_closed' };
  page.setDefaultTimeout(10000);
  const { collect, review } = reviewKit(job, onProgress, () => page.keyboard.press('Escape').catch(() => {}));
  onProgress({ type: 'playwright', tag: 'NAUKRI OPEN', message: `Opening Naukri job: ${job.company} — "${job.title}"` });

  try {
    await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await randomSleep(1800, 2800);
    if (page.isClosed()) return { success: false, reason: 'tab_closed' };
    if (/nlogin|login\.naukri/i.test(page.url())) return { success: false, reason: 'login_required', detail: 'Signed out of Naukri.' };
    const blocked = await blockedReason(page);
    if (blocked === 'verification_required' || await humanCheck(page)) return review('verification_required', 'Naukri is asking for a human verification check.', 'HUMAN CHECK');
    if (blocked) return { success: false, reason: blocked };
    if (!job.description) job.description = await pageDescription(page, ['[class*="job-desc" i]', '[class*="JDC" i]', 'section.job-desc', '.dang-inner-html']);

    const state = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const text = (el) => (el.innerText || '').trim();
      return {
        alreadyApplied: buttons.some(b => /^applied$/i.test(text(b))) || Boolean(document.querySelector('#already-applied')),
        external: Boolean(document.querySelector('#company-site-button')) || buttons.some(b => /apply on company site/i.test(text(b))),
        hasApply: Boolean(document.querySelector('#apply-button')) || buttons.some(b => /^apply$/i.test(text(b))),
        loginToApply: buttons.some(b => /(login|register) to apply/i.test(text(b))),
      };
    }).catch(() => ({}));
    if (state.loginToApply) return { success: false, reason: 'login_required', detail: 'Signed out of Naukri.' };
    if (state.alreadyApplied) {
      onProgress({ type: 'success', tag: 'ALREADY APPLIED', message: `Already applied to ${job.company} on Naukri. Skipping.` });
      return { success: false, reason: 'already_applied' };
    }
    if (state.external || !state.hasApply) return review('external_apply', 'applies on the company website.', 'COMPANY WEBSITE');

    const applyBtn = page.locator('#apply-button, button.apply-button').first();
    const btn = (await applyBtn.count().catch(() => 0)) ? applyBtn : page.getByRole('button', { name: /^apply$/i }).first();
    await btn.click({ timeout: 8000 }).catch(() => {});
    onProgress({ type: 'playwright', tag: 'NAUKRI APPLY', message: `Clicked Apply for ${job.company}.` });
    await randomSleep(2500, 3500);
    if (/nlogin|login\.naukri/i.test(page.url())) return { success: false, reason: 'login_required', detail: 'Signed out of Naukri.' };

    for (let check = 0; check < 3; check++) {
      const after = await page.evaluate(() => {
        const body = document.body.innerText || '';
        const buttons = Array.from(document.querySelectorAll('button, a')).map(b => (b.innerText || '').trim());
        const visible = (el) => !!(el && (el.offsetParent || el.getClientRects().length));
        return {
          success: /successfully applied|applied successfully|application (has been )?sent|you have applied/i.test(body) || buttons.some(t => /^applied$/i.test(t)),
          questionnaire: Array.from(document.querySelectorAll('[class*="chatbot" i], [class*="chatBot" i]')).some(visible),
        };
      }).catch(() => ({}));
      if (after.success) break;
      if (after.questionnaire) {
        onProgress({ type: 'playwright', tag: 'NAUKRI QUESTIONS', message: `${job.company} asks recruiter questions — answering them...` });
        const chat = await answerNaukriChat(page, job, profile, onProgress, collect);
        if (chat.success) break;
        if (chat.stuck) return review('custom_screening_questions_needs_review', `couldn't answer "${String(chat.stuck).slice(0, 120)}".`);
      }
      if (await humanCheck(page)) return review('verification_required', 'Naukri asked for a human verification check.', 'HUMAN CHECK');
      await randomSleep(1500, 2200);
    }

    const sent = await page.evaluate(() => /successfully applied|applied successfully|application (has been )?sent|you have applied/i.test(document.body.innerText || '')
      || Array.from(document.querySelectorAll('button, a')).some(b => /^applied$/i.test((b.innerText || '').trim()))).catch(() => false);
    if (!sent) return review('unconfirmed', "Naukri didn't confirm the application.", 'NOT SENT');
    onProgress({ type: 'success', tag: 'SUBMITTED', message: `✅ Applied to ${job.company} — "${job.title}" on Naukri.` });
    return { success: true, pacingDelaySec: options.pacingDelaySec };
  } catch (err) {
    return review('unconfirmed', `something went wrong (${err.message.split('\n')[0].slice(0, 120)}).`, 'ERROR');
  }
}

// ---------------- Indeed ----------------

const INDEED_NEXT = /^(continue|next|review your application|review application)\b/i;
const INDEED_SUBMIT = /^submit( your)? application/i;

// Marks the step's main button and says whether it submits or moves on (null while loading)
async function indeedAction(applyPage) {
  return applyPage.evaluate(([nextSrc, submitSrc]) => {
    const next = new RegExp(nextSrc, 'i');
    const submit = new RegExp(submitSrc, 'i');
    document.querySelectorAll('[data-pg-indeed-action]').forEach(e => e.removeAttribute('data-pg-indeed-action'));
    const vis = (el) => !!(el.offsetParent || el.getClientRects().length);
    const btns = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]'))
      .filter(b => vis(b) && !b.disabled && b.getAttribute('aria-disabled') !== 'true');
    const label = (b) => (b.innerText || b.value || b.getAttribute('aria-label') || '').trim();
    const s = btns.find(b => submit.test(label(b)));
    if (s) { s.setAttribute('data-pg-indeed-action', '1'); return 'submit'; }
    const n = btns.find(b => next.test(label(b)));
    if (n) { n.setAttribute('data-pg-indeed-action', '1'); return 'next'; }
    return null;
  }, [INDEED_NEXT.source, INDEED_SUBMIT.source]).catch(() => null);
}

async function waitIndeedAction(applyPage, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const a = await indeedAction(applyPage);
    if (a || Date.now() > deadline || applyPage.isClosed()) return a;
    await randomSleep(500, 600);
  }
}

// Clicks the marked button; falls back to a DOM click if a cookie banner covers it
async function clickIndeed(applyPage) {
  const btn = applyPage.locator('[data-pg-indeed-action]').first();
  await btn.click({ timeout: 5000 }).catch(() => btn.evaluate(el => el.click()).catch(() => {}));
}

export async function applyIndeedJob(page, job, profile, options = {}, onProgress = () => {}) {
  if (!page || page.isClosed()) return { success: false, reason: 'tab_closed' };
  page.setDefaultTimeout(10000);
  let popup = null;
  const closePopup = async () => { if (popup && !popup.isClosed()) await popup.close().catch(() => {}); };
  const { collect, review } = reviewKit(job, onProgress, closePopup);
  onProgress({ type: 'playwright', tag: 'INDEED OPEN', message: `Opening Indeed job: ${job.company} — "${job.title}"` });

  try {
    await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await randomSleep(1800, 2800);
    if (page.isClosed()) return { success: false, reason: 'tab_closed' };
    const blocked = await indeedBlocked(page);
    if (blocked === 'login_required') return { success: false, reason: 'login_required', detail: 'Signed out of Indeed.' };
    if (blocked) return review('verification_required', 'Indeed is asking for a human verification check.', 'HUMAN CHECK');
    if (!job.description) job.description = await pageDescription(page, ['#jobDescriptionText', '[class*="jobDescription" i]']);

    // Indeed's own form: an "Apply now" link to smartapply.indeed.com (older pages: #indeedApplyButton).
    // The company's site: "Apply on company site" → /applystart. The button loads a moment after the page.
    let kind = null;
    for (let t = 0; t < 20 && !kind; t++) {
      kind = await page.evaluate(() => {
        const vis = (el) => !!(el.offsetParent || el.getClientRects().length);
        const els = Array.from(document.querySelectorAll('a, button, [role="button"]')).filter(vis);
        const text = (el) => (el.innerText || el.getAttribute('aria-label') || '').trim();
        const own = els.find(el => /smartapply\.indeed\.com|indeedapply/i.test(el.getAttribute('href') || '') || el.id === 'indeedApplyButton' || String(el.id).includes('indeedApplyButton')
          || (/^apply now$/i.test(text(el)) && !/applystart/i.test(el.getAttribute('href') || '')));
        if (own) { own.setAttribute('data-pg-indeed-apply', '1'); return 'indeed'; }
        if (els.some(el => /apply on company site/i.test(text(el)) || /\/applystart/i.test(el.getAttribute('href') || ''))) return 'external';
        if (els.some(el => /^applied$/i.test(text(el))) || /you applied|application submitted/i.test(document.body.innerText.slice(0, 3000))) return 'applied';
        return null;
      }).catch(() => null);
      if (!kind) await randomSleep(400, 500);
    }
    if (kind === 'applied') {
      onProgress({ type: 'success', tag: 'ALREADY APPLIED', message: `Already applied to ${job.company} on Indeed. Skipping.` });
      return { success: false, reason: 'already_applied' };
    }
    if (kind !== 'indeed') return review('external_apply', 'applies on the company website.', 'COMPANY WEBSITE');

    // Indeed Apply opens in this tab (current pages) or a new one (older pages)
    const popupPromise = page.context().waitForEvent('page', { timeout: 4000 }).catch(() => null);
    await page.locator('[data-pg-indeed-apply]').first().click({ timeout: 8000 }).catch(() => {});
    popup = await popupPromise;
    const applyPage = popup || page;
    applyPage.setDefaultTimeout(10000);
    if (!popup) await page.waitForURL(/smartapply\.indeed\.com|indeedapply/i, { timeout: 12000 }).catch(() => {});
    await applyPage.waitForLoadState('domcontentloaded').catch(() => {});
    await randomSleep(2000, 3000);
    onProgress({ type: 'playwright', tag: 'INDEED APPLY', message: `Started Indeed Apply for ${job.company}.` });

    let lastStep = '';
    let sameStep = 0;
    for (let step = 1; step <= 14; step++) {
      if (applyPage.isClosed()) return { success: false, reason: 'tab_closed' };
      const stepBlocked = await indeedBlocked(applyPage);
      if (stepBlocked || await humanCheck(applyPage)) return review('verification_required', 'Indeed asked for a human verification check.', 'HUMAN CHECK');

      const body = await applyPage.evaluate(() => document.body?.innerText || '').catch(() => '');
      if (/application has been submitted|your application has been sent|application submitted/i.test(body)) {
        onProgress({ type: 'success', tag: 'SUBMITTED', message: `✅ Applied to ${job.company} — "${job.title}" on Indeed.` });
        await closePopup();
        return { success: true, pacingDelaySec: options.pacingDelaySec };
      }

      // Did the last click move the form on?
      const marker = `${applyPage.url()}|${(body.match(/^.{0,200}/s) || [''])[0]}`;
      sameStep = marker === lastStep ? sameStep + 1 : 0;
      lastStep = marker;
      if (sameStep >= 3) return review('custom_screening_questions_needs_review', "couldn't get past a step of the Indeed form.");

      const fileInput = applyPage.locator('input[type="file"]').first();
      if (profile.resumePath && (await fileInput.count().catch(() => 0)) && /resume|cv/i.test(body)) {
        await fileInput.setInputFiles(profile.resumePath).catch(() => {});
        onProgress({ type: 'playwright', tag: 'INDEED RESUME', message: `Attached ${profile.resumeFile || 'resume'}.` });
        await randomSleep(1500, 2200);
      }

      // Same form filler as LinkedIn: every question type, learned answers, written answers
      const form = (await applyPage.locator('main').count().catch(() => 0)) ? applyPage.locator('main').first() : applyPage.locator('body');
      const out = await fillStep(form, profile, onProgress, { job, forceAll: sameStep > 0 });
      collect(out.needsInput);
      if (out.answered) onProgress({ type: 'llm', tag: `INDEED STEP ${step}`, message: `Filled ${out.answered} field${out.answered === 1 ? '' : 's'} for ${job.company}.` });

      // Indeed loads each step with a spinner: wait for Continue / Submit to appear (up to 15s)
      const action = await waitIndeedAction(applyPage, 15000);
      if (action === 'submit') {
        if (options.dryRun) {
          onProgress({ type: 'success', tag: 'DRY RUN', message: `Reached Submit for ${job.company} — not submitting (dry run).` });
          await closePopup();
          return { success: false, reason: 'dry_run', reachedSubmit: true };
        }
        onProgress({ type: 'playwright', tag: 'SUBMITTING', message: `Submitting application to ${job.company}...` });
        await clickIndeed(applyPage);
        await randomSleep(2500, 3500);
        continue;
      }
      if (action === 'next') {
        await clickIndeed(applyPage);
        await randomSleep(1800, 2600);
        continue;
      }
      return review('unconfirmed', "couldn't find Continue or Submit on the Indeed form.", 'STUCK');
    }
    return review('unconfirmed', 'the Indeed form had more steps than expected.');
  } catch (err) {
    return review('unconfirmed', `something went wrong (${err.message.split('\n')[0].slice(0, 120)}).`, 'ERROR');
  }
}
