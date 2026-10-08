import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';
import { API_BASE } from '../lib/api';

// The admin portal keeps its own session (separate storage key), so signing in as an
// admin never signs the user app in or out, and the other way round.
export const adminSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: 'agent-penguin-admin-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/** fetch() to the backend with the admin's access token. */
export async function adminFetch(path, options = {}) {
  const { data } = await adminSupabase.auth.getSession();
  const token = data?.session?.access_token;
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

/** Parses a JSON response, throwing the server's error message on failure. */
export async function readJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const friendlyError = (e) => (e?.message === 'Failed to fetch' ? 'Backend is not running. Start it with: npm run server' : e?.message || 'Something went wrong.');

export const fmtDate = (iso, withTime = true) => (iso
  ? new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: true } : {}),
  })
  : '—');

export const PLATFORM_LABELS = { linkedin: 'LinkedIn', naukri: 'Naukri', indeed: 'Indeed' };
export const STATUS_LABELS = { applied: 'Applied', needs_review: 'Needs review', shortlisted: 'Shortlisted', discarded: 'Skipped' };
