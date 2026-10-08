import fs from 'fs';
import path from 'path';
import { answerQuestion } from './questionAnswerer.js';

/**
 * LinkedIn Easy Apply (2026 layout).
 * - Opens the job page (/jobs/view/<id>/) and clicks "Easy Apply to this job".
 * - The form is a native <dialog> with obfuscated classes, so everything is found
 *   by role, label and button text rather than class names.
 * - Each step: fill contact/resume, answer every question (saved profile answers →
 *   rules → AI → auto-pick for required choices), then Next / Review / Submit.
 * - If a step can't be completed, the draft is discarded so the next job starts clean.
 */

const randomSleep = (minMs, maxMs) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs));

const DIALOG = 'dialog[open], .jobs-easy-apply-modal, [role="dialog"][aria-modal="true"]';

async function getDialog(page) {
  const d = page.locator(DIALOG).first();
  return (await d.isVisible().catch(() => false)) ? d : null;
}

async function clickButton(scope, pattern) {
  const btn = scope.locator('button', { hasText: pattern }).first();
  if (await btn.isVisible().catch(() => false) && await btn.isEnabled().catch(() => false)) {
    await btn.click().catch(() => {});
    return true;
  }
  return false;
}

// Closes an unfinished application and discards the draft
async function discardEasyApply(page) {
  try {
    const dialog = await getDialog(page);
    if (!dialog) return;
    const dismiss = dialog.locator('button[aria-label*="Dismiss"], button[aria-label*="Close"]').first();
    if (await dismiss.isVisible().catch(() => false)) await dismiss.click().catch(() => {});
    else await page.keyboard.press('Escape').catch(() => {});
    await randomSleep(900, 1300);
    await clickButton(page, /^Discard/);
    await randomSleep(500, 800);
  } catch { /* best effort */ }
}

/** Reads every question on the current step: label, type, options, required, empty. */
async function readFields(dialog) {
  return dialog.evaluate((d) => {
    const clean = (s = '') => s.replace(/\s+/g, ' ').replace(/\*\s*$/, '').replace(/\s*required\s*$/i, '').trim();
    const rawLabelOf = (el) => {
      const id = el.id;
      const byFor = id && d.querySelector(`label[for="${CSS.escape(id)}"]`);
      const lb = el.getAttribute('aria-labelledby');
      const byLb = lb && lb.split(' ').map(x => document.getElementById(x)?.innerText).filter(Boolean).join(' ');
      const direct = el.getAttribute('aria-label') || byFor?.innerText || byLb || el.closest('label')?.innerText || '';
      if (direct.trim()) return direct;
      // Fallbacks: placeholder, name/id hints, or the nearest text above the field
      if (el.placeholder) return el.placeholder;
      let node = el;
      for (let i = 0; i < 4 && node.parentElement && node.parentElement !== d; i++) {
        node = node.parentElement;
        const line = (node.innerText || '').split('\n').map(s => s.trim()).find(s => s && s !== el.value && s.length < 160);
        if (line) return line;
      }
      return (el.name || el.id || '').replace(/[-_]+/g, ' ').replace(/\d+/g, '').trim();
    };
    const isRequired = (el, raw) => el.required || el.getAttribute('aria-required') === 'true' || /\*\s*$/.test(raw.trim());
    const out = [];
    let idx = 0;
    const tag = (el) => { const k = `pg-f-${idx++}`; el.setAttribute('data-pg-field', k); return k; };

    // Text-like inputs, textareas, selects
    for (const el of d.querySelectorAll('input:not([type]), input[type="text"], input[type="number"], input[type="tel"], input[type="email"], input[type="url"], textarea, select')) {
      if (el.offsetParent === null || el.disabled) continue;
      const raw = rawLabelOf(el);
      const base = { key: tag(el), question: clean(raw), required: isRequired(el, raw) };
      if (el.tagName === 'SELECT') {
        const options = Array.from(el.options).map(o => o.text.trim()).filter(t => t && !/^select an option$/i.test(t));
        const selected = el.options[el.selectedIndex]?.text?.trim() || '';
        out.push({ ...base, type: 'select', options, empty: !el.value || /^select an option$/i.test(selected) });
      } else {
        // LinkedIn marks number-only text boxes with "numeric" in the id
        const numeric = el.type === 'number' || /numeric/i.test(el.id || '') || el.inputMode === 'numeric' || el.inputMode === 'decimal';
        const type = el.tagName === 'TEXTAREA' ? 'textarea' : (numeric ? 'number' : 'text');
        out.push({ ...base, type, empty: !el.value, combobox: el.getAttribute('role') === 'combobox' });
      }
    }

    // Radio groups (by name)
    const radiosByName = {};
    for (const r of d.querySelectorAll('input[type="radio"]')) (radiosByName[r.name || r.id] ||= []).push(r);
    for (const [name, radios] of Object.entries(radiosByName)) {
      const fs = radios[0].closest('fieldset');
      const legend = fs?.querySelector('legend')?.innerText || fs?.getAttribute('aria-label') || '';
      const options = radios.map(r => clean(rawLabelOf(r)) || r.value);
      const key = `pg-r-${idx++}`;
      radios.forEach((r, i) => r.setAttribute('data-pg-field', `${key}-${i}`));
      out.push({ key, type: 'radio', question: clean(legend) || name, options, required: true, empty: !radios.some(r => r.checked) });
    }

    // Checkboxes (consent / follow company)
    for (const c of d.querySelectorAll('input[type="checkbox"]')) {
      const raw = rawLabelOf(c);
      out.push({ key: tag(c), type: 'checkbox', question: clean(raw), required: isRequired(c, raw), empty: !c.checked, checked: c.checked });
    }
    return out;
  }).catch(() => []);
}

async function fillStep(dialog, profile, onProgress) {
  let answered = 0;
  const unanswered = [];

  // Resume: upload only if the step has a file input and no saved resume is chosen
  const fileInput = dialog.locator('input[type="file"]').first();
  if (await fileInput.count() && profile.resumePath && fs.existsSync(profile.resumePath)) {
    const hasChosenResume = await dialog.locator('input[type="radio"]:checked').count();
    if (!hasChosenResume) {
      await fileInput.setInputFiles(profile.resumePath).catch(() => {});
      onProgress({ type: 'playwright', tag: 'RESUME ATTACH', message: `Uploaded ${path.basename(profile.resumePath)}` });
      await randomSleep(1500, 2200);
    }
  }

  const fields = await readFields(dialog);
  for (const f of fields) {
    // Never auto-follow companies
    if (f.type === 'checkbox' && /follow/i.test(f.question)) {
      if (f.checked) await dialog.locator(`[data-pg-field="${f.key}"]`).uncheck({ force: true }).catch(() => {});
      continue;
    }
    if (!f.empty) continue;

    if (f.type === 'checkbox') {
      if (f.required) {
        await dialog.locator(`[data-pg-field="${f.key}"]`).check({ force: true }).catch(() => {});
        answered++;
      }
      continue;
    }

    // Resume radio list: pick the first saved resume
    if (f.type === 'radio' && f.options.length && f.options.every(o => /\.(pdf|docx?)$/i.test(o))) {
      await dialog.locator(`[data-pg-field="${f.key}-0"]`).check({ force: true }).catch(() => {});
      continue;
    }

    // Phone number (LinkedIn usually pre-fills it)
    if (/phone|mobile/i.test(f.question) && f.type !== 'select') {
      const digits = String(profile.phone || '').replace(/\D/g, '');
      const national = digits.length > 10 && digits.startsWith('91') ? digits.slice(2) : digits.slice(-10);
      if (national) {
        await dialog.locator(`[data-pg-field="${f.key}"]`).fill(national).catch(() => {});
        answered++;
        continue;
      }
    }

    // Never guess an answer for a field we can't identify
    if (!f.question || f.question.length < 3) {
      if (f.required) unanswered.push('A required field without a label');
      continue;
    }

    // LinkedIn uses plain text inputs for numeric answers
    const fieldType = f.type === 'text' && /how many|years|experience|number of|ctc|salary|notice period/i.test(f.question) ? 'number' : f.type;
    const result = await answerQuestion({ question: f.question, type: fieldType, options: f.options || [] }, profile, { force: f.required });
    if (!result) {
      if (f.required) unanswered.push(f.question || 'Unlabelled question');
      continue;
    }
    const { answer, source } = result;

    if (f.type === 'select') {
      await dialog.locator(`[data-pg-field="${f.key}"]`).selectOption({ label: answer }).catch(() => {});
    } else if (f.type === 'radio') {
      const i = Math.max(0, f.options.indexOf(answer));
      await dialog.locator(`[data-pg-field="${f.key}-${i}"]`).check({ force: true }).catch(() => {});
    } else {
      const input = dialog.locator(`[data-pg-field="${f.key}"]`);
      // Number boxes reject "5 years": keep just the number
      const value = fieldType === 'number' ? (String(answer).match(/\d+(\.\d+)?/)?.[0] ?? '0') : String(answer);
      await input.fill(value).catch(() => {});
      // Typeaheads (city, school, etc.) need a suggestion picked from their dropdown
      if (f.combobox || /city|location|town|school|college|university|company/i.test(f.question)) {
        await randomSleep(1200, 1700);
        const option = dialog.page().locator('[role="listbox"] [role="option"], [role="option"]').first();
        if (await option.isVisible().catch(() => false)) {
          await option.click().catch(() => {});
        } else {
          await input.press('ArrowDown').catch(() => {});
          await input.press('Enter').catch(() => {});
        }
        await randomSleep(400, 700);
      }
    }
    answered++;
    const tags = { ai: 'AI ANSWER', profile: 'PROFILE ANSWER', rules: 'AUTO ANSWER', 'auto-pick': 'AUTO PICK' };
    onProgress({
      type: source === 'auto-pick' ? 'warn' : 'llm',
      tag: tags[source] || 'AUTO ANSWER',
      message: `"${f.question.slice(0, 80)}" → ${(fieldType === 'number' ? (String(answer).match(/\d+(\.\d+)?/)?.[0] ?? '0') : String(answer)).slice(0, 60)}${source === 'auto-pick' ? ' (required; picked automatically — check later)' : ''}`
    });
    await randomSleep(250, 500);
  }
  return { answered, unanswered };
}

// Inputs LinkedIn flagged (error text lives in the aria-describedby element)
async function invalidInputs(dialog) {
  return dialog.evaluate((d) => Array.from(d.querySelectorAll('input, textarea, select')).map((el, i) => {
    const describedText = (el.getAttribute('aria-describedby') || '').split(' ').map(x => document.getElementById(x)?.innerText || '').join(' ');
    const bad = el.getAttribute('aria-invalid') === 'true' || /invalid|enter a (valid|whole|decimal)|must be|please (enter|make a selection)|required/i.test(describedText);
    if (!bad) return null;
    el.setAttribute('data-pg-invalid', String(i));
    return { key: String(i), value: el.value || '', message: describedText.split('\n').find(t => /invalid|enter|must|please|required/i.test(t))?.trim() || 'Invalid input' };
  }).filter(Boolean)).catch(() => []);
}

// Tries to repair rejected answers: numbers only, or years of experience when empty
async function repairInvalid(dialog, profile, onProgress) {
  const bad = await invalidInputs(dialog);
  let fixed = 0;
  for (const b of bad) {
    const digits = b.value.match(/\d+(\.\d+)?/)?.[0] ?? String(profile.experienceYears ?? 0);
    if (digits === b.value) continue;
    await dialog.locator(`[data-pg-invalid="${b.key}"]`).fill(digits).catch(() => {});
    onProgress({ type: 'llm', tag: 'FIXED ANSWER', message: `LinkedIn said "${b.message}" for "${b.value}" — changed to ${digits}.` });
    fixed++;
  }
  return { bad: bad.length, fixed, firstMessage: bad[0]?.message };
}

async function visibleErrors(dialog) {
  return dialog.evaluate(d => Array.from(d.querySelectorAll('[role="alert"], .artdeco-inline-feedback--error'))
    .filter(e => e.offsetParent !== null).map(e => e.innerText.trim()).filter(t => t && t.length < 200)).catch(() => []);
}

export async function applyToJobWithPlaywright(page, job, profile, options = {}, onProgress = () => {}) {
  const { pacingDelaySec = 6 } = options;
  if (!page || page.isClosed()) return { success: false, reason: 'tab_closed' };

  onProgress({ type: 'playwright', tag: 'OPEN JOB', message: `Opening ${job.company} — "${job.title}"` });

  try {
    const url = job.url || `https://www.linkedin.com/jobs/view/${job.id}/`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await randomSleep(3000, 4500);
    if (page.isClosed()) return { success: false, reason: 'tab_closed' };
    if (/\/(login|authwall|checkpoint|signup)/.test(page.url())) return { success: false, reason: 'login_required' };

    const easyApply = page.locator('button[aria-label^="Easy Apply"], button[aria-label*="Easy Apply to"]').first();
    if (!(await easyApply.isVisible().catch(() => false))) {
      const applied = await page.getByText(/^Applied\b|Application submitted|You applied/i).first().isVisible().catch(() => false);
      if (applied) {
        onProgress({ type: 'success', tag: 'ALREADY APPLIED', message: `Already applied to ${job.company}. Skipping.` });
        return { success: false, reason: 'already_applied' };
      }
      onProgress({ type: 'warn', tag: 'NO EASY APPLY', message: `${job.company} applies on its own website (no Easy Apply). Added to Needs review.` });
      return { success: false, reason: 'external_apply' };
    }

    await easyApply.click();
    await randomSleep(2500, 3500);

    let lastProgress = '';
    let sameStepCount = 0;
    for (let step = 1; step <= 15; step++) {
      if (page.isClosed()) return { success: false, reason: 'tab_closed' };
      const dialog = await getDialog(page);
      if (!dialog) {
        onProgress({ type: 'warn', tag: 'NO FORM', message: `Easy Apply form didn't open for ${job.company}. Added to Needs review.` });
        return { success: false, reason: 'unconfirmed' };
      }

      const progress = await dialog.evaluate(d => (d.innerText.match(/\d+\s*\/\s*\d+\s*pages?|\d+%/) || [''])[0]).catch(() => '');
      sameStepCount = progress && progress === lastProgress ? sameStepCount + 1 : 0;
      lastProgress = progress;
      if (sameStepCount >= 1) {
        // Didn't advance: LinkedIn rejected something. Try to repair once, then give up.
        const { fixed, firstMessage } = await repairInvalid(dialog, profile, onProgress);
        if (fixed && sameStepCount < 2) {
          await clickButton(dialog, /^(Next|Review|Continue)/i);
          await randomSleep(1800, 2600);
          continue;
        }
      }
      if (sameStepCount >= 2) {
        const errs = await invalidInputs(dialog);
        onProgress({ type: 'warn', tag: 'NEEDS REVIEW', message: `${job.company}: stuck on a step${errs[0] ? ` ("${errs[0].message}")` : ''}. Added to Needs review.` });
        await discardEasyApply(page);
        return { success: false, reason: 'custom_screening_questions_needs_review' };
      }

      // Final step: untick "follow company", then submit
      const submit = dialog.locator('button', { hasText: /^Submit( application)?$/i }).first();
      if (await submit.isVisible().catch(() => false)) {
        await fillStep(dialog, profile, onProgress); // handles the follow checkbox + any last fields
        if (options.dryRun) {
          onProgress({ type: 'success', tag: 'DRY RUN', message: `Reached Submit for ${job.company} — not submitting (dry run).` });
          await discardEasyApply(page);
          return { success: false, reason: 'dry_run', reachedSubmit: true };
        }
        onProgress({ type: 'playwright', tag: 'SUBMITTING', message: `Submitting application to ${job.company}...` });
        await submit.click();
        await randomSleep(3000, 4000);

        const sent = await page.getByText(/application (was )?sent|application submitted/i).first().isVisible().catch(() => false);
        await clickButton(page, /^(Done|Close)$/);
        if (!sent) {
          const stillOpen = await getDialog(page);
          if (stillOpen && (await visibleErrors(stillOpen)).length) {
            onProgress({ type: 'warn', tag: 'NOT SENT', message: `LinkedIn didn't accept the application to ${job.company}. Added to Needs review.` });
            await discardEasyApply(page);
            return { success: false, reason: 'unconfirmed' };
          }
        }
        const actualPacingSec = Number((pacingDelaySec + (Math.random() * 2.5 - 1)).toFixed(1));
        onProgress({ type: 'success', tag: 'SUBMITTED', message: `✅ Applied to ${job.company} — "${job.title}". Waiting ${actualPacingSec}s before the next job...` });
        await randomSleep(actualPacingSec * 1000, (actualPacingSec + 0.5) * 1000);
        return { success: true, pacingDelaySec: actualPacingSec };
      }

      const { answered, unanswered } = await fillStep(dialog, profile, onProgress);
      if (answered) onProgress({ type: 'llm', tag: `STEP ${progress || step}`, message: `Filled ${answered} field${answered === 1 ? '' : 's'} for ${job.company}.` });
      if (unanswered.length) {
        onProgress({ type: 'warn', tag: 'NEEDS REVIEW', message: `${job.company} asks something Penguin can't answer from your profile: "${unanswered.slice(0, 2).join('", "')}". Added to Needs review.` });
        await discardEasyApply(page);
        return { success: false, reason: 'custom_screening_questions_needs_review', questions: unanswered };
      }

      const moved = await clickButton(dialog, /^(Next|Review|Continue)/i);
      if (!moved) {
        onProgress({ type: 'warn', tag: 'STUCK', message: `Couldn't find Next / Review / Submit for ${job.company}. Added to Needs review.` });
        await discardEasyApply(page);
        return { success: false, reason: 'unconfirmed' };
      }
      await randomSleep(1800, 2600);
    }

    await discardEasyApply(page);
    return { success: false, reason: 'unconfirmed' };
  } catch (err) {
    onProgress({ type: 'warn', tag: 'ERROR', message: `Problem applying to ${job.company}: ${err.message.split('\n')[0]}. Moving on.` });
    await discardEasyApply(page);
    return { success: false, reason: 'unconfirmed', error: err.message };
  }
}
