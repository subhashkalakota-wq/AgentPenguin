/**
 * Alerts on Telegram, WhatsApp and email.
 *
 * - Telegram: the user's own bot (token from @BotFather) and their chat id.
 * - WhatsApp: CallMeBot's free API (the user gets an API key by messaging the bot).
 * - Email: SMTP, e.g. Gmail with an app password.
 *
 * Credentials are kept only in server/data/notify.json (readable by this user only)
 * and are never sent back to the browser: the dashboard only learns whether each one is set.
 */
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const FILE = path.resolve('server/data/notify.json');

export const EVENTS = {
  runFinished: 'A run finishes',
  inbox: 'An interview, test or offer arrives in your email',
  needsYou: 'Penguin needs you (sign in, security check)',
  scheduleSkipped: "A scheduled run couldn't start",
  walkIns: 'New walk-in drives for your roles and cities',
};

const DEFAULTS = {
  telegram: { enabled: false, token: '', chatId: '' },
  whatsapp: { enabled: false, phone: '', apiKey: '' },
  email: { enabled: false, host: 'smtp.gmail.com', port: 465, user: '', pass: '', to: '' },
  events: { runFinished: true, inbox: true, needsYou: true, scheduleSkipped: true, walkIns: true },
};

const SECRETS = { telegram: ['token'], whatsapp: ['apiKey'], email: ['pass'] };

function read() {
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { /* first use */ }
  return {
    telegram: { ...DEFAULTS.telegram, ...saved.telegram },
    whatsapp: { ...DEFAULTS.whatsapp, ...saved.whatsapp },
    email: { ...DEFAULTS.email, ...saved.email },
    events: { ...DEFAULTS.events, ...saved.events },
  };
}

function write(settings) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(settings, null, 2), { mode: 0o600 });
}

const ready = {
  telegram: (c) => Boolean(c.token && c.chatId),
  whatsapp: (c) => Boolean(c.phone && c.apiKey),
  email: (c) => Boolean(c.host && c.user && c.pass && c.to),
};

/** Settings for the dashboard, without secret values. */
export function publicSettings() {
  const s = read();
  const out = { events: s.events, eventLabels: EVENTS };
  for (const ch of ['telegram', 'whatsapp', 'email']) {
    const c = { ...s[ch] };
    for (const key of SECRETS[ch]) { c[`has${key[0].toUpperCase()}${key.slice(1)}`] = Boolean(c[key]); delete c[key]; }
    c.ready = ready[ch](s[ch]);
    out[ch] = c;
  }
  return out;
}

/** Saves changes. A blank secret keeps the saved one; `clear: true` on a channel wipes it. */
export function updateSettings(patch = {}) {
  const s = read();
  for (const ch of ['telegram', 'whatsapp', 'email']) {
    const p = patch[ch];
    if (!p) continue;
    if (p.clear) { s[ch] = { ...DEFAULTS[ch] }; continue; }
    for (const [k, v] of Object.entries(p)) {
      if (!(k in DEFAULTS[ch])) continue;
      if (SECRETS[ch].includes(k) && (v === '' || v == null)) continue;
      s[ch][k] = typeof v === 'string' ? v.trim() : v;
    }
    s[ch].port = Number(s[ch].port) || s[ch].port;
  }
  if (patch.events) for (const k of Object.keys(EVENTS)) if (k in patch.events) s.events[k] = Boolean(patch.events[k]);
  write(s);
  return publicSettings();
}

export function anyChannelOn() {
  const s = read();
  return ['telegram', 'whatsapp', 'email'].some(ch => s[ch].enabled && ready[ch](s[ch]));
}

/** The saved email account (for the inbox tracker and follow-ups), or null when not set up. */
export function emailAccount() {
  const c = read().email;
  if (!ready.email(c)) return null;
  const host = /gmail/i.test(c.host) ? 'imap.gmail.com' : /office365|outlook/i.test(c.host) ? 'outlook.office365.com' : c.host.replace(/^smtp\./i, 'imap.');
  return { user: c.user, pass: c.pass, smtpHost: c.host, smtpPort: Number(c.port) || 465, imapHost: host, imapPort: 993, to: c.to };
}

/** Sends an email from the user's own account (follow-ups). Replies stay in the thread. */
export async function sendFromUser({ to, subject, text, inReplyTo, references }) {
  const c = read().email;
  if (!ready.email(c)) throw new Error('Set up Email in Automation → Alerts first (your Gmail and an app password).');
  const transport = nodemailer.createTransport({ host: c.host, port: Number(c.port) || 465, secure: Number(c.port) === 465, auth: { user: c.user, pass: c.pass } });
  return transport.sendMail({ from: c.user, to, subject, text, ...(inReplyTo ? { inReplyTo, references: references || inReplyTo } : {}) });
}

// ---- Senders ----
async function sendTelegram(c, text) {
  const res = await fetch(`https://api.telegram.org/bot${c.token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: c.chatId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await res.json().catch(() => ({}));
  if (!body.ok) {
    if (res.status === 401) throw new Error('Telegram rejected the bot token. Copy it again from @BotFather.');
    if (/chat not found/i.test(body.description || '')) throw new Error('Telegram can’t find that chat. Send your bot a message, then click "Find my chat ID".');
    throw new Error(body.description || `Telegram error ${res.status}`);
  }
}

async function sendWhatsApp(c, text) {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(c.phone.replace(/[^\d+]/g, ''))}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(c.apiKey)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const body = await res.text();
  if (!res.ok || /error|invalid|not (valid|found)/i.test(body.slice(0, 400))) {
    throw new Error(`WhatsApp (CallMeBot): ${body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140) || res.status}`);
  }
}

async function sendEmail(c, subject, text) {
  const transport = nodemailer.createTransport({
    host: c.host, port: Number(c.port) || 465, secure: Number(c.port) === 465, auth: { user: c.user, pass: c.pass },
  });
  await transport.sendMail({ from: `Agent Penguin <${c.user}>`, to: c.to, subject, text });
}

async function sendOn(channel, c, subject, text) {
  if (channel === 'telegram') return sendTelegram(c, `${subject}\n\n${text}`);
  if (channel === 'whatsapp') return sendWhatsApp(c, `*${subject}*\n${text}`);
  return sendEmail(c, subject, text);
}

/**
 * Sends an alert on every enabled channel (if the user wants this kind of alert).
 * @returns [{ channel, ok, error? }]
 */
export async function notify(event, subject, text) {
  const s = read();
  if (event && s.events[event] === false) return [];
  const results = [];
  for (const ch of ['telegram', 'whatsapp', 'email']) {
    if (!s[ch].enabled || !ready[ch](s[ch])) continue;
    try {
      await sendOn(ch, s[ch], subject, text);
      results.push({ channel: ch, ok: true });
    } catch (err) {
      results.push({ channel: ch, ok: false, error: err.message });
    }
  }
  return results;
}

/** Sends a test message on one channel, even if it isn't switched on yet. */
export async function sendTest(channel) {
  const s = read();
  if (!s[channel]) throw new Error('Unknown channel');
  if (!ready[channel](s[channel])) throw new Error('Fill in and save the details for this channel first.');
  await sendOn(channel, s[channel], 'Agent Penguin test', 'Alerts are working. You will get run results, walk-ins and anything Penguin needs from you here.');
}

/** Telegram: finds the chat id from the newest message sent to the bot. */
export async function detectTelegramChat() {
  const s = read();
  if (!s.telegram.token) throw new Error('Save the bot token first.');
  const res = await fetch(`https://api.telegram.org/bot${s.telegram.token}/getUpdates`, { signal: AbortSignal.timeout(15000) });
  const body = await res.json().catch(() => ({}));
  if (!body.ok) throw new Error(res.status === 401 ? 'Telegram rejected the bot token. Copy it again from @BotFather.' : (body.description || 'Telegram rejected the token.'));
  const msg = [...(body.result || [])].reverse().map(u => u.message || u.channel_post).find(Boolean);
  if (!msg) throw new Error('Open your bot in Telegram, send it any message (like "hi"), then try again.');
  s.telegram.chatId = String(msg.chat.id);
  write(s);
  return { chatId: s.telegram.chatId, name: msg.chat.first_name || msg.chat.title || msg.chat.username || '' };
}
