/**
 * Admin API for the separate admin portal (/admin).
 *
 * Powers: platform overview stats, every user's details / profile / applications,
 * block & unblock, grant & revoke admin, delete users, view & delete any application,
 * and watch / stop the running agent.
 *
 * Security:
 * - Every request must carry the caller's Supabase access token
 *   (Authorization: Bearer <token>). The token is verified with Supabase here.
 * - Owners are the emails in ADMIN_EMAILS (.env). Owners can make other users admins
 *   (app_metadata.role = 'admin'; users can't edit app_metadata themselves).
 *   Owners can't be blocked, demoted or deleted from the portal.
 * - Blocking uses Supabase's built-in ban (stops sign-in and token refresh) plus
 *   app_metadata.blocked.
 */
import { SCREENING_QUESTIONS } from '../shared/screeningQuestions.js';

const BAN_FOREVER = '876000h'; // ~100 years
const TZ = 'Asia/Kolkata';

function ownerEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

/** Verifies the request's access token. Returns the Supabase user or null. */
export async function verifyRequestUser(supabaseAdmin, req) {
  const token = bearer(req);
  if (!token || !supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export function isBlocked(user) {
  if (!user) return false;
  if (user.app_metadata?.blocked) return true;
  return Boolean(user.banned_until && new Date(user.banned_until) > new Date());
}

const isOwner = (user) => Boolean(user?.email) && ownerEmails().includes(user.email.toLowerCase());
const isAdminUser = (user) => isOwner(user) || user?.app_metadata?.role === 'admin';

const platformOf = (url = '') => (/naukri\./i.test(url) ? 'naukri' : /indeed\./i.test(url) ? 'indeed' : 'linkedin');
const dayKey = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD

function summarize(user) {
  const meta = user.user_metadata || {};
  const cp = meta.candidate_profile || {};
  return {
    id: user.id,
    name: cp.name || meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : 'Unknown'),
    email: user.email || cp.email || '',
    avatar: cp.avatar || meta.avatar_url || meta.picture || null,
    blocked: isBlocked(user),
    isAdmin: isAdminUser(user),
    isOwner: isOwner(user),
    joinedAt: user.created_at || null,
    lastSignInAt: user.last_sign_in_at || null,
  };
}

function details(user, appliedCount) {
  const meta = user.user_metadata || {};
  const cp = meta.candidate_profile || {};
  const code = (cp.phoneCountryCode || '').match(/\(([^)]+)\)/)?.[1] || cp.phoneCountryCode || '';
  const answers = cp.screeningAnswers || {};
  return {
    ...summarize(user),
    phone: cp.phone ? `${code ? `${code} ` : ''}${cp.phone}` : (user.phone || ''),
    appliedCount,
    profile: {
      headline: cp.headline || '',
      location: cp.location || '',
      targetRole: cp.targetRole || '',
      experienceYears: cp.experienceYears ?? null,
      skills: Array.isArray(cp.skills) ? cp.skills : [],
      resumeFile: cp.resumeFile || null,
      linkedinUrl: cp.linkedinUrl || '',
      githubUrl: cp.githubUrl || '',
      salaryFloor: cp.salaryFloor || '',
      noticePeriod: cp.noticePeriod || '',
      workAuthorization: cp.workAuthorization || '',
      profileCompleted: Boolean(meta.profile_completed),
      answers: SCREENING_QUESTIONS
        .filter(q => String(answers[q.key] ?? '').trim())
        .map(q => ({ question: q.label, answer: String(answers[q.key]) })),
    },
  };
}

async function listAllUsers(supabaseAdmin) {
  const users = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

// Application rows (newest first), optionally for one user
async function applicationRows(supabaseAdmin, userId = null, max = 20000) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; from < max; from += pageSize) {
    let q = supabaseAdmin.from('applied_jobs')
      .select('id, user_id, job_id, title, company, location, status, applied_at, url, match_score')
      .order('applied_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (userId) q = q.eq('user_id', userId);
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows.map(r => ({ ...r, platform: platformOf(r.url) }));
}

const appliedCountsFrom = (rows) => rows.reduce((acc, r) => {
  if (r.status === 'applied') acc[r.user_id] = (acc[r.user_id] || 0) + 1;
  return acc;
}, {});

/**
 * @param system { snapshot(): object, stopAgent(adminEmail): boolean } — live agent state from index.js
 */
export function registerAdminRoutes(app, supabaseAdmin, system = {}) {
  // Middleware: caller must be a signed-in admin
  const requireAdmin = async (req, res, next) => {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase admin is not configured on the server.' });
    const user = await verifyRequestUser(supabaseAdmin, req);
    if (!user) return res.status(401).json({ error: 'Your admin session has expired. Sign in again.' });
    if (!isAdminUser(user) || isBlocked(user)) return res.status(403).json({ error: 'This account does not have admin access.' });
    req.adminUser = user;
    next();
  };

  const loadTarget = async (req, res) => {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(req.params.id);
    if (error || !data?.user) { res.status(404).json({ error: 'User not found.' }); return null; }
    return data.user;
  };

  // Who am I? The user app uses it to sign out blocked users; the admin portal to check access.
  app.get('/api/me', async (req, res) => {
    const user = await verifyRequestUser(supabaseAdmin, req);
    if (!user) return res.json({ signedIn: false, isAdmin: false, blocked: false });
    res.json({ signedIn: true, isAdmin: isAdminUser(user), isOwner: isOwner(user), blocked: isBlocked(user), email: user.email });
  });

  // ---- Overview ----
  app.get('/api/admin/overview', requireAdmin, async (req, res) => {
    try {
      const [users, rows] = await Promise.all([listAllUsers(supabaseAdmin), applicationRows(supabaseAdmin)]);
      const applied = rows.filter(r => r.status === 'applied');
      const today = dayKey(new Date().toISOString());
      const days = Array.from({ length: 14 }, (_, i) => dayKey(new Date(Date.now() - (13 - i) * 86400000).toISOString()));
      const perDay = Object.fromEntries(days.map(d => [d, 0]));
      for (const r of applied) { const d = r.applied_at && dayKey(r.applied_at); if (d in perDay) perDay[d]++; }
      const perPlatform = { linkedin: 0, naukri: 0, indeed: 0 };
      for (const r of applied) perPlatform[r.platform]++;
      const counts = appliedCountsFrom(rows);
      const byId = Object.fromEntries(users.map(u => [u.id, summarize(u)]));
      const weekAgo = Date.now() - 7 * 86400000;
      res.json({
        totals: {
          users: users.length,
          blocked: users.filter(isBlocked).length,
          admins: users.filter(isAdminUser).length,
          activeThisWeek: users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() > weekAgo).length,
          applied: applied.length,
          needsReview: rows.filter(r => r.status === 'needs_review').length,
          appliedToday: perDay[today] || 0,
          appliedThisWeek: days.slice(-7).reduce((n, d) => n + perDay[d], 0),
        },
        perDay: days.map(d => ({ date: d, count: perDay[d] })),
        perPlatform,
        topUsers: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
          .map(([id, count]) => ({ id, count, name: byId[id]?.name || 'Deleted user', email: byId[id]?.email || '' })),
        recent: applied.slice(0, 8).map(r => ({ ...r, userName: byId[r.user_id]?.name || 'Deleted user' })),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---- Users ----
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const [users, rows] = await Promise.all([listAllUsers(supabaseAdmin), applicationRows(supabaseAdmin)]);
      const counts = appliedCountsFrom(rows);
      const list = users
        .map(u => ({ ...summarize(u), appliedCount: counts[u.id] || 0 }))
        .sort((a, b) => a.name.localeCompare(b.name));
      res.json({ users: list });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const user = await loadTarget(req, res);
      if (!user) return;
      const rows = await applicationRows(supabaseAdmin, user.id, 2000);
      res.json({ user: details(user, appliedCountsFrom(rows)[user.id] || 0), applications: rows.slice(0, 300) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/users/:id/block', requireAdmin, async (req, res) => {
    const blocked = Boolean(req.body?.blocked);
    if (req.params.id === req.adminUser.id) return res.status(400).json({ error: "You can't block your own account." });
    try {
      const existing = await loadTarget(req, res);
      if (!existing) return;
      if (blocked && isOwner(existing)) return res.status(400).json({ error: 'Owners (ADMIN_EMAILS) can’t be blocked.' });
      if (blocked && isAdminUser(existing)) return res.status(400).json({ error: 'Remove admin access before blocking this user.' });
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        ban_duration: blocked ? BAN_FOREVER : 'none',
        app_metadata: { ...(existing.app_metadata || {}), blocked },
      });
      if (error) throw error;
      console.log(`[Admin] ${req.adminUser.email} ${blocked ? 'blocked' : 'unblocked'} ${data.user.email}`);
      const rows = await applicationRows(supabaseAdmin, existing.id, 2000);
      res.json({ user: details(data.user, appliedCountsFrom(rows)[existing.id] || 0) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Grant / revoke admin access
  app.post('/api/admin/users/:id/role', requireAdmin, async (req, res) => {
    const makeAdmin = Boolean(req.body?.admin);
    if (req.params.id === req.adminUser.id) return res.status(400).json({ error: "You can't change your own admin access." });
    try {
      const existing = await loadTarget(req, res);
      if (!existing) return;
      if (!makeAdmin && isOwner(existing)) return res.status(400).json({ error: 'Owners are set in ADMIN_EMAILS on the server and can’t be demoted here.' });
      if (makeAdmin && isBlocked(existing)) return res.status(400).json({ error: 'Unblock this user before making them an admin.' });
      const appMeta = { ...(existing.app_metadata || {}) };
      if (makeAdmin) appMeta.role = 'admin'; else delete appMeta.role;
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, { app_metadata: appMeta });
      if (error) throw error;
      console.log(`[Admin] ${req.adminUser.email} ${makeAdmin ? 'granted admin to' : 'revoked admin from'} ${data.user.email}`);
      const rows = await applicationRows(supabaseAdmin, existing.id, 2000);
      res.json({ user: details(data.user, appliedCountsFrom(rows)[existing.id] || 0) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Permanently delete a user and their applications
  app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
    if (req.params.id === req.adminUser.id) return res.status(400).json({ error: "You can't delete your own account." });
    try {
      const existing = await loadTarget(req, res);
      if (!existing) return;
      if (isOwner(existing)) return res.status(400).json({ error: 'Owners (ADMIN_EMAILS) can’t be deleted.' });
      await supabaseAdmin.from('applied_jobs').delete().eq('user_id', existing.id);
      await supabaseAdmin.from('profiles').delete().eq('id', existing.id).then(() => {}, () => {});
      const { error } = await supabaseAdmin.auth.admin.deleteUser(existing.id);
      if (error) throw error;
      console.log(`[Admin] ${req.adminUser.email} deleted user ${existing.email}`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---- Applications (all users) ----
  app.get('/api/admin/applications', requireAdmin, async (req, res) => {
    try {
      const [users, rows] = await Promise.all([listAllUsers(supabaseAdmin), applicationRows(supabaseAdmin, null, 5000)]);
      const byId = Object.fromEntries(users.map(u => [u.id, summarize(u)]));
      res.json({
        applications: rows.map(r => ({ ...r, userName: byId[r.user_id]?.name || 'Deleted user', userEmail: byId[r.user_id]?.email || '' })),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/applications/:id', requireAdmin, async (req, res) => {
    try {
      const { error } = await supabaseAdmin.from('applied_jobs').delete().eq('id', req.params.id);
      if (error) throw error;
      console.log(`[Admin] ${req.adminUser.email} deleted application ${req.params.id}`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---- Agent & system ----
  app.get('/api/admin/system', requireAdmin, async (req, res) => {
    const snap = system.snapshot ? system.snapshot() : {};
    let runUser = null;
    if (snap.runUserId) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(snap.runUserId).catch(() => ({ data: null }));
      if (data?.user) runUser = summarize(data.user);
    }
    res.json({ ...snap, runUser });
  });

  app.post('/api/admin/agent/stop', requireAdmin, (req, res) => {
    const stopped = system.stopAgent ? system.stopAgent(req.adminUser.email) : false;
    res.json({ success: true, stopped });
  });
}
