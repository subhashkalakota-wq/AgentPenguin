/**
 * Admin API: list users, view a user's details, block / unblock.
 *
 * Security:
 * - Every request must carry the caller's Supabase access token
 *   (Authorization: Bearer <token>). The token is verified with Supabase here.
 * - Only emails listed in ADMIN_EMAILS (comma separated, in .env) are admins.
 * - Blocking uses Supabase's built-in ban (stops sign-in and token refresh) plus
 *   app_metadata.blocked (users can't edit app_metadata, unlike user_metadata).
 */

const BAN_FOREVER = '876000h'; // ~100 years

function adminEmails() {
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

const isAdminUser = (user) => Boolean(user?.email) && adminEmails().includes(user.email.toLowerCase());

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
  };
}

function details(user, appliedCount) {
  const meta = user.user_metadata || {};
  const cp = meta.candidate_profile || {};
  const code = (cp.phoneCountryCode || '').match(/\(([^)]+)\)/)?.[1] || cp.phoneCountryCode || '';
  return {
    ...summarize(user),
    phone: cp.phone ? `${code ? `${code} ` : ''}${cp.phone}` : (user.phone || ''),
    appliedCount,
    joinedAt: user.created_at || null,
    lastSignInAt: user.last_sign_in_at || null,
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

// Applied-application counts per user (status = applied)
async function appliedCounts(supabaseAdmin, userId = null) {
  const counts = {};
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let q = supabaseAdmin.from('applied_jobs').select('user_id').eq('status', 'applied').range(from, from + pageSize - 1);
    if (userId) q = q.eq('user_id', userId);
    const { data, error } = await q;
    if (error) throw error;
    for (const row of data) counts[row.user_id] = (counts[row.user_id] || 0) + 1;
    if (data.length < pageSize) break;
  }
  return counts;
}

export function registerAdminRoutes(app, supabaseAdmin) {
  // Middleware: caller must be a signed-in admin
  const requireAdmin = async (req, res, next) => {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase admin is not configured on the server.' });
    const user = await verifyRequestUser(supabaseAdmin, req);
    if (!user) return res.status(401).json({ error: 'Not signed in.' });
    if (!isAdminUser(user)) return res.status(403).json({ error: 'Admins only.' });
    req.adminUser = user;
    next();
  };

  // Who am I? Used by the UI to decide whether to show the Admin tab, and to
  // sign out users who were blocked while already signed in.
  app.get('/api/me', async (req, res) => {
    const user = await verifyRequestUser(supabaseAdmin, req);
    if (!user) return res.json({ signedIn: false, isAdmin: false, blocked: false });
    res.json({ signedIn: true, isAdmin: isAdminUser(user), blocked: isBlocked(user) });
  });

  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const [users, counts] = await Promise.all([listAllUsers(supabaseAdmin), appliedCounts(supabaseAdmin)]);
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
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(req.params.id);
      if (error || !data?.user) return res.status(404).json({ error: 'User not found.' });
      const counts = await appliedCounts(supabaseAdmin, req.params.id);
      res.json({ user: details(data.user, counts[req.params.id] || 0) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/users/:id/block', requireAdmin, async (req, res) => {
    const blocked = Boolean(req.body?.blocked);
    const targetId = req.params.id;
    if (targetId === req.adminUser.id) {
      return res.status(400).json({ error: "You can't block your own account." });
    }
    try {
      const { data: existing, error: getErr } = await supabaseAdmin.auth.admin.getUserById(targetId);
      if (getErr || !existing?.user) return res.status(404).json({ error: 'User not found.' });
      if (blocked && isAdminUser(existing.user)) {
        return res.status(400).json({ error: "Admins can't be blocked. Remove them from ADMIN_EMAILS first." });
      }
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
        ban_duration: blocked ? BAN_FOREVER : 'none',
        app_metadata: { ...(existing.user.app_metadata || {}), blocked },
      });
      if (error) throw error;
      console.log(`[Admin] ${req.adminUser.email} ${blocked ? 'blocked' : 'unblocked'} ${data.user.email}`);
      const counts = await appliedCounts(supabaseAdmin, targetId);
      res.json({ user: details(data.user, counts[targetId] || 0) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
