/**
 * Scheduled runs: on the chosen weekdays at the chosen time (India time), the backend
 * starts a run by itself. Checked every 30 seconds; if the backend was off at that
 * minute, a run still starts if it comes back within the following hour.
 */
const TZ = 'Asia/Kolkata';
export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABEL = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const CATCH_UP_MIN = 60;

export const DEFAULT_SCHEDULE = { enabled: false, days: ['mon', 'tue', 'wed', 'thu', 'fri'], time: '09:00', applications: 20 };

// Current day key, minutes since midnight and date, in India time
function nowIST(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit', hour12: false,
  }).formatToParts(date).map(p => [p.type, p.value]));
  return {
    day: parts.weekday.toLowerCase().slice(0, 3),
    minutes: Number(parts.hour) % 24 * 60 + Number(parts.minute),
    date: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

const toMinutes = (hhmm = '09:00') => { const [h, m] = String(hhmm).split(':').map(Number); return (h || 0) * 60 + (m || 0); };

export function normalizeSchedule(s = {}) {
  const days = (Array.isArray(s.days) ? s.days : DEFAULT_SCHEDULE.days).filter(d => DAYS.includes(d));
  const time = /^\d{2}:\d{2}$/.test(s.time || '') ? s.time : DEFAULT_SCHEDULE.time;
  return {
    enabled: Boolean(s.enabled),
    days: days.length ? DAYS.filter(d => days.includes(d)) : DEFAULT_SCHEDULE.days,
    time,
    applications: Math.max(1, Math.min(200, Number(s.applications) || DEFAULT_SCHEDULE.applications)),
  };
}

/** "Tue 9:00 AM" for the next scheduled run, or null when off. */
export function nextRunLabel(schedule, lastRunDate) {
  const s = normalizeSchedule(schedule);
  if (!s.enabled) return null;
  const now = nowIST();
  const start = toMinutes(s.time);
  for (let i = 0; i < 8; i++) {
    const d = new Date(Date.now() + i * 86400000);
    const { day, date } = nowIST(d);
    if (!s.days.includes(day)) continue;
    if (i === 0 && (now.minutes > start + CATCH_UP_MIN || lastRunDate === date)) continue;
    const h = Math.floor(start / 60), m = start % 60;
    const time = `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    return `${i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAY_LABEL[day]} ${time}`;
  }
  return null;
}

/**
 * @param getSchedule () => schedule
 * @param getLastRun  () => 'YYYY-MM-DD' of the last scheduled run
 * @param onDue       async (schedule, date) => void — start the run
 */
export function startScheduler({ getSchedule, getLastRun, onDue }) {
  let busy = false;
  const tick = async () => {
    if (busy) return;
    const s = normalizeSchedule(getSchedule());
    if (!s.enabled) return;
    const now = nowIST();
    const start = toMinutes(s.time);
    if (!s.days.includes(now.day) || getLastRun() === now.date) return;
    if (now.minutes < start || now.minutes > start + CATCH_UP_MIN) return;
    busy = true;
    try { await onDue(s, now.date); } finally { busy = false; }
  };
  const timer = setInterval(() => { tick().catch(err => console.warn('[scheduler]', err.message)); }, 30000);
  setTimeout(() => tick().catch(() => {}), 5000);
  return () => clearInterval(timer);
}
