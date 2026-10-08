import { supabase } from './supabase';
import { API_BASE } from './supabaseConfig';

export { API_BASE };

// fetch() to the backend with the signed-in user's Supabase access token, so the
// server can verify who is calling (admin checks, blocked-user checks).
export async function authFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession();
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
