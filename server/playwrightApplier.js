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

// LinkedIn asks "Save this application?" when a form is closed; always answer Discard
// so unfinished applications are never left behind as saved drafts.
async function answerSavePrompt(page) {
  for (let i = 0; i < 6; i++) {
    const discard = page.locator('button', { hasText: /^\s*Discard\s*$/ }).last();
    if (await discard.isVisible().catch(() => false)) {
      await discard.click().catch(() => {});
      await randomSleep(500, 800);
      return true;
    }
    await randomSleep(300, 400);
  }
  return false;
}

// Closes an unfinished application and discards the draft
export async function discardEasyApply(page) {
  try {
    if (!page || page.isClosed()) return;
    if (await answerSavePrompt(page).catch(() => false)) return;
    const dialog = await getDialog(page);
    if (!dialog) return;
    const dismiss = dialog.locator('button[aria-label*="Dismiss"], button[aria-label*="Close"]').first();
    if (await dismiss.isVisible().catch(() => false)) await dismiss.click().catch(() => {});
    else await page.keyboard.press('Escape').catch(() => {});
    await randomSleep(700, 1000);
    await answerSavePrompt(page);
  } catch { /* best effort */ }
}

/** Reads every question on the current step: label, type, options, required, empty. */
async function readFields(dialog) {
  return dialog.evaluate((d) => {
    const clean = (s = '') => s.replace(/\s+/g, ' ').replace(/\*\s*$/, '').replace(/\s*required\s*$/i, '').trim();
    // Lines that are never the question itself
    const NOISE = /^(this field is required\.?|please (make a selection|enter|select)[^]*|required|select an option|\d+\s*\/\s*\d+.*|\d+%|optional)$/i;
    const visible = (el) => !!(el.offsetParent || el.getClientRects().length);
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
        const line = (node.innerText || '').split('\n').map(s => s.trim()).find(s => s && s !== el.value && s.length < 160 && !NOISE.test(s));
        if (line) return line;
      }
      return (el.name || el.id || '').replace(/[-_]+/g, ' ').replace(/\d+/g, '').trim();
    };
    const isRequired = (el, raw) => el.required || el.getAttribute('aria-required') === 'true' || /\*\s*$/.test(raw.trim());
    // The deepest element containing every node in the list
    const commonAncestor = (nodes) => {
      let a = nodes[0].parentElement;
      while (a && a !== d && !nodes.every(n => a.contains(n))) a = a.parentElement;
      return a || d;
    };
    // Text of one choice (radio/checkbox): its <label>, aria-label, or the wrapper that holds only this choice
    const choiceText = (el, group) => {
      const viaLabels = el.labels && Array.from(el.labels).map(l => l.innerText || l.textContent).join(' ').trim();
      const lb = el.getAttribute('aria-labelledby');
      const byLb = lb && lb.split(' ').map(x => document.getElementById(x)?.innerText).filter(Boolean).join(' ');
      let t = viaLabels || el.getAttribute('aria-label') || byLb || '';
      if (!t.trim()) {
        let node = el;
        while (node.parentElement && node.parentElement !== d && group.filter(g => node.parentElement.contains(g)).length === 1) {
          node = node.parentElement;
          if ((node.innerText || '').trim()) break;
        }
        t = node.innerText || node.textContent || '';
      }
      if (!t.trim() && el.value && !/^(on|true|false|\d+)$/i.test(el.value)) t = el.value;
      // Drop drawn radio/check glyphs and bullets in front of the text
      return clean((t.split('\n').map(x => x.replace(/^[^\p{L}\p{N}]+/u, '').trim()).filter(Boolean)[0]) || '');
    };
    // The question for a group of choices: legend / group label, else the closest text above the options
    const groupQuestion = (els, optionTexts) => {
      const fs = els[0].closest('fieldset');
      const group = els[0].closest('[role="radiogroup"], [role="group"]');
      const lb = (group || fs)?.getAttribute('aria-labelledby');
      const byLb = lb && lb.split(' ').map(x => document.getElementById(x)?.innerText).filter(Boolean).join(' ');
      const named = fs?.querySelector('legend')?.innerText || byLb || (group || fs)?.getAttribute('aria-label') || '';
      if (clean(named) && !optionTexts.includes(clean(named))) return { text: named, raw: named };
      let node = commonAncestor(els);
      for (let i = 0; i < 6 && node && node !== d.parentElement; i++) {
        const line = (node.innerText || '').split('\n').map(x => x.replace(/^[^\p{L}\p{N}]+/u, '').trim())
          .find(x => x.length > 1 && !NOISE.test(x) && !optionTexts.includes(clean(x)));
        if (line) return { text: line, raw: line };
        node = node.parentElement;
      }
      return { text: '', raw: '' };
    };

    const out = [];
    let idx = 0;
    const tag = (el) => { const k = `pg-f-${idx++}`; el.setAttribute('data-pg-field', k); return k; };

    // Text-like inputs, textareas, selects
    for (const el of d.querySelectorAll('input:not([type]), input[type="text"], input[type="number"], input[type="tel"], input[type="email"], input[type="url"], input[type="date"], textarea, select')) {
      if (!visible(el) || el.disabled || el.readOnly) continue;
      const raw = rawLabelOf(el);
      const base = { key: tag(el), question: clean(raw), required: isRequired(el, raw) };
      if (el.tagName === 'SELECT') {
        const options = Array.from(el.options).map(o => o.text.trim()).filter(t => t && !/^(select an option|select|choose.*|--.*)$/i.test(t));
        const selected = el.options[el.selectedIndex]?.text?.trim() || '';
        out.push({ ...base, type: 'select', options, empty: !el.value || /^(select an option|select|choose.*|--.*)$/i.test(selected) });
      } else {
        // LinkedIn marks number-only text boxes with "numeric" in the id
        const numeric = el.type === 'number' || /numeric/i.test(el.id || '') || el.inputMode === 'numeric' || el.inputMode === 'decimal';
        const type = el.tagName === 'TEXTAREA' ? 'textarea' : (el.type === 'date' ? 'date' : (numeric ? 'number' : 'text'));
        out.push({ ...base, type, empty: !el.value.trim(), combobox: el.getAttribute('role') === 'combobox' || el.getAttribute('aria-autocomplete') === 'list' });
      }
    }

    // Sliders (rating scales)
    for (const el of d.querySelectorAll('input[type="range"]')) {
      if (!visible(el) || el.disabled) continue;
      const min = Number(el.min || 0), max = Number(el.max || 100);
      const raw = rawLabelOf(el);
      // A slider always has a value, so "empty" means Penguin hasn't set it yet
      out.push({ key: tag(el), type: 'range', question: `${clean(raw)} (scale ${min} to ${max})`, min, max, required: true, empty: !el.dataset.pgSet });
    }

    // Choice groups: native radios by name, custom [role=radio] by their radiogroup
    const groups = new Map();
    for (const r of d.querySelectorAll('input[type="radio"], [role="radio"]:not(input)')) {
      if (r.matches('[role="radio"]') && r.querySelector('input[type="radio"]')) continue;
      const k = r.tagName === 'INPUT' ? `n:${r.name || r.id}` : `g:${(r.closest('[role="radiogroup"]') || r.parentElement).dataset.pgGroup ||= String(idx++)}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    }
    for (const els of groups.values()) {
      if (!els.some(visible)) continue;
      const key = `pg-r-${idx++}`;
      const options = els.map((r, i) => choiceText(r, els) || `Option ${i + 1}`);
      els.forEach((r, i) => {
        r.setAttribute('data-pg-field', `${key}-${i}`);
        r.labels?.[0]?.setAttribute('data-pg-label', `${key}-${i}`);
      });
      const q = groupQuestion(els, options);
      const isOn = (r) => r.checked === true || r.getAttribute('aria-checked') === 'true';
      out.push({ key, type: 'radio', question: clean(q.text), options, required: true, empty: !els.some(isOn) });
    }

    // Checkboxes: a lone box is consent / follow company; several boxes under one question are a multi-choice
    const boxes = Array.from(d.querySelectorAll('input[type="checkbox"]')).filter(c => visible(c) || visible(c.parentElement));
    const byGroup = new Map();
    for (const c of boxes) {
      const g = c.closest('fieldset, [role="group"]') || (c.name && boxes.filter(o => o.name === c.name).length > 1 ? `name:${c.name}` : c);
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push(c);
    }
    for (const els of byGroup.values()) {
      if (els.length === 1) {
        const c = els[0];
        const raw = choiceText(c, els) || rawLabelOf(c);
        const key = tag(c);
        c.labels?.[0]?.setAttribute('data-pg-label', key);
        out.push({ key, type: 'checkbox', question: clean(raw), required: isRequired(c, raw), empty: !c.checked, checked: c.checked });
        continue;
      }
      const key = `pg-c-${idx++}`;
      const options = els.map((c, i) => choiceText(c, els) || `Option ${i + 1}`);
      els.forEach((c, i) => {
        c.setAttribute('data-pg-field', `${key}-${i}`);
        c.labels?.[0]?.setAttribute('data-pg-label', `${key}-${i}`);
      });
      const q = groupQuestion(els, options);
      out.push({ key, type: 'checkbox-group', question: clean(q.text), options, required: true, empty: !els.some(c => c.checked) });
    }
    return out;
  }).catch(() => []);
}

// Selects a radio / checkbox and confirms it took: label click, then the input, then a DOM click
async function clickChoice(dialog, key) {
  const el = dialog.locator(`[data-pg-field="${key}"]`).first();
  const isOn = () => el.evaluate(e => e.checked === true || e.getAttribute('aria-checked') === 'true').catch(() => false);
  if (await isOn()) return true;
  const label = dialog.locator(`[data-pg-label="${key}"]`).first();
  if (await label.count().catch(() => 0)) {
    await label.scrollIntoViewIfNeeded().catch(() => {});
    await label.click({ timeout: 3000 }).catch(() => {});
    if (await isOn()) return true;
  }
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await el.click({ force: true, timeout: 3000 }).catch(() => {});
  if (await isOn()) return true;
  await el.evaluate(e => e.click()).catch(() => {});
  return isOn();
}

// Index of the option that matches an answer (exact, then prefix, then contains)
function optionIndex(options, answer) {
  const n = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const a = n(answer);
  let i = options.findIndex(o => n(o) === a);
  if (i < 0) i = options.findIndex(o => n(o).startsWith(a) || (a && a.startsWith(n(o)) && n(o).length > 1));
  if (i < 0 && a.length > 2) i = options.findIndex(o => n(o).includes(a) || a.includes(n(o)));
  return i;
}

async function fillStep(dialog, profile, onProgress, { forceAll = false } = {}) {
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
      // Required boxes (terms, consent, "I confirm...") get ticked
      if (f.required || forceAll || /agree|consent|confirm|acknowledge|certify|terms|privacy/i.test(f.question)) {
        if (await clickChoice(dialog, f.key)) answered++;
      }
      continue;
    }

    // Resume radio list: pick the first saved resume
    if (f.type === 'radio' && f.options.length && f.options.every(o => /\.(pdf|docx?)$/i.test(o))) {
      await clickChoice(dialog, `${f.key}-0`);
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

    // A field we can't identify: choices still get a safe pick when required, text is skipped
    if (!f.question || f.question.length < 3) {
      if (!(f.required || forceAll)) continue;
      if (!f.options?.length) { unanswered.push('A required field without a label'); continue; }
    }

    // LinkedIn uses plain text inputs for numeric answers
    const fieldType = f.type === 'text' && /how many|years|experience|number of|ctc|salary|notice period/i.test(f.question) ? 'number' : f.type;
    const askType = f.type === 'checkbox-group' ? 'multi' : (f.type === 'range' ? 'number' : fieldType);
    const result = await answerQuestion({ question: f.question || 'Select one option', type: askType, options: f.options || [] }, profile, { force: f.required || forceAll });
    if (!result) {
      if (f.required) unanswered.push(f.question || 'Unlabelled question');
      continue;
    }
    const { answer, source } = result;

    if (f.type === 'select') {
      const i = optionIndex(f.options, answer);
      await dialog.locator(`[data-pg-field="${f.key}"]`).selectOption({ label: f.options[Math.max(0, i)] }).catch(() => {});
    } else if (f.type === 'checkbox-group') {
      // Select all that apply: tick every chosen option
      const wanted = (Array.isArray(answer) ? answer : [answer]).map(a => optionIndex(f.options, a)).filter(i => i >= 0);
      let ticked = 0;
      for (const i of (wanted.length ? [...new Set(wanted)] : [0])) if (await clickChoice(dialog, `${f.key}-${i}`)) ticked++;
      if (!ticked) { unanswered.push(f.question || 'A multiple-choice question'); continue; }
    } else if (f.type === 'range') {
      // Slider: clamp to its range and fire the events a person's drag would
      const n = Number(String(answer).match(/\d+(\.\d+)?/)?.[0] ?? f.max);
      const v = Math.min(f.max, Math.max(f.min, n));
      await dialog.locator(`[data-pg-field="${f.key}"]`).evaluate((el, val) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(val));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dataset.pgSet = '1';
      }, v).catch(() => {});
    } else if (f.type === 'radio') {
      let i = optionIndex(f.options, answer);
      if (i < 0) i = Math.max(0, optionIndex(f.options, 'Yes'));
      if (!(await clickChoice(dialog, `${f.key}-${i}`))) {
        unanswered.push(f.question || 'A choice question');
        continue;
      }
    } else if (f.type === 'date') {
      await dialog.locator(`[data-pg-field="${f.key}"]`).fill(new Date().toISOString().slice(0, 10)).catch(() => {});
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
      message: `"${(f.question || 'Unlabelled question').slice(0, 80)}" → ${(Array.isArray(answer) ? answer.join(', ') : fieldType === 'number' ? (String(answer).match(/\d+(\.\d+)?/)?.[0] ?? '0') : String(answer)).slice(0, 60)}${source === 'auto-pick' ? ' (required; picked automatically — check later)' : ''}`
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
  return dialog.evaluate(d => {
    const shown = (e) => !!(e.offsetParent || e.getClientRects().length);
    const byRole = Array.from(d.querySelectorAll('[role="alert"], .artdeco-inline-feedback--error')).filter(shown).map(e => e.innerText.trim());
    // New layout: plain red text under the question
    const byText = Array.from(d.querySelectorAll('span, div, p')).filter(e => !e.children.length && shown(e)
      && /^(this field is required|please (make a selection|enter|select)|enter a (valid|whole|decimal)|invalid)/i.test(e.innerText.trim())).map(e => e.innerText.trim());
    return [...new Set([...byRole, ...byText])].filter(t => t && t.length < 200);
  }).catch(() => []);
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
        // Didn't advance: LinkedIn rejected or still wants something. Fix number answers and
        // answer every empty field (required or not), then try again — up to 3 times.
        await repairInvalid(dialog, profile, onProgress);
        if (sameStepCount <= 3) {
          const { answered } = await fillStep(dialog, profile, onProgress, { forceAll: true });
          const errs = await visibleErrors(dialog);
          onProgress({ type: 'llm', tag: 'RETRY STEP', message: `${job.company}: step ${progress} didn't move on${errs[0] ? ` ("${errs[0]}")` : ''} — answered ${answered} more field${answered === 1 ? '' : 's'}, trying again.` });
          await clickButton(dialog, /^(Next|Review|Continue)/i);
          await randomSleep(1800, 2600);
          continue;
        }
        const errs = await visibleErrors(dialog);
        onProgress({ type: 'warn', tag: 'NEEDS REVIEW', message: `${job.company}: stuck on step ${progress}${errs[0] ? ` ("${errs[0]}")` : ''}. Added to Needs review.` });
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
        await submit.scrollIntoViewIfNeeded().catch(() => {});
        await submit.click();

        // Wait for LinkedIn's confirmation; click Submit again if it's still there
        const confirmation = page.getByText(/your application was sent|application (was )?sent|application submitted|you applied/i).first();
        let sent = false;
        for (let t = 0; t < 20 && !sent; t++) {
          await randomSleep(500, 600);
          sent = await confirmation.isVisible().catch(() => false);
          if (!sent && t === 8) {
            const again = page.locator('dialog[open] button', { hasText: /^Submit( application)?$/i }).first();
            if (await again.isVisible().catch(() => false)) await again.click().catch(() => {});
          }
        }
        if (!sent) {
          // No confirmation and the form is gone: check the job page itself
          if (!(await getDialog(page))) {
            await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
            await randomSleep(2500, 3500);
            sent = await page.getByText(/^Applied\b|application submitted|you applied/i).first().isVisible().catch(() => false);
          }
        }
        await clickButton(page, /^(Done|Close|Not now)$/);
        if (!sent) {
          const errs = await getDialog(page) ? await invalidInputs(await getDialog(page)) : [];
          onProgress({ type: 'warn', tag: 'NOT SENT', message: `LinkedIn didn't confirm the application to ${job.company}${errs[0] ? ` ("${errs[0].message}")` : ''}. Added to Needs review.` });
          await discardEasyApply(page);
          return { success: false, reason: 'unconfirmed' };
        }
        const actualPacingSec = Number((pacingDelaySec + (Math.random() * 2.5 - 1)).toFixed(1));
        onProgress({ type: 'success', tag: 'SUBMITTED', message: `✅ Applied to ${job.company} — "${job.title}". Waiting ${actualPacingSec}s before the next job...` });
        await randomSleep(actualPacingSec * 1000, (actualPacingSec + 0.5) * 1000);
        return { success: true, pacingDelaySec: actualPacingSec };
      }

      const { answered, unanswered } = await fillStep(dialog, profile, onProgress);
      if (answered) onProgress({ type: 'llm', tag: `STEP ${progress || step}`, message: `Filled ${answered} field${answered === 1 ? '' : 's'} for ${job.company}.` });
      if (unanswered.length) {
        // Try to move on anyway; if LinkedIn refuses, the retry above answers everything it can
        onProgress({ type: 'warn', tag: 'UNSURE', message: `${job.company}: couldn't fill "${unanswered.slice(0, 2).join('", "').slice(0, 120)}" — trying to continue.` });
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
// For local form tests only
export const __test = { readFields, fillStep, clickChoice };
