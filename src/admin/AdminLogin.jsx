import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import AgentPenguinMark from '../components/AgentPenguinMark';
import { adminSupabase, adminFetch, readJson } from './adminClient';

// Sign-in for admins only. Any other account is signed straight back out.
export default function AdminLogin({ notice = '', onSignedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(notice);

  // Google: Supabase sends the admin back to /admin; AdminApp then checks admin access
  const google = async () => {
    setBusy(true);
    setError('');
    const { error: oauthError } = await adminSupabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/admin`, queryParams: { prompt: 'select_account' } },
    });
    if (oauthError) {
      setError(/provider is not enabled/i.test(oauthError.message)
        ? 'Google sign-in is not turned on in Supabase (Authentication → Providers → Google).'
        : oauthError.message);
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data, error: authError } = await adminSupabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw new Error(/invalid login/i.test(authError.message) ? 'Wrong email or password.' : authError.message);
      const me = await readJson(await adminFetch('/api/me'));
      if (!me.isAdmin || me.blocked) {
        await adminSupabase.auth.signOut().catch(() => {});
        throw new Error('This account does not have admin access. Use the user app instead.');
      }
      onSignedIn(data.user, me);
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Backend is not running. Start it with: npm run server' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-login">
      <div className="adm-login-card">
        <div className="adm-login-brand">
          <AgentPenguinMark size={34} />
          <div>
            <strong>Agent Penguin</strong>
            <span><ShieldCheck size={13} /> Admin console</span>
          </div>
        </div>

        <h1>Admin sign in</h1>
        <p className="adm-login-sub">Only accounts with admin access can sign in here.</p>

        {error && <p className="pg-notice is-error"><AlertTriangle size={15} /> {error}</p>}

        <button type="button" className="pg-btn adm-login-google" onClick={google} disabled={busy}>
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          Continue with Google
        </button>

        <div className="adm-login-or"><span>or use email</span></div>

        <form onSubmit={submit} className="adm-login-form">
          <label>
            <span>Email</span>
            <div className="adm-input">
              <Mail size={15} />
              <input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
          </label>
          <label>
            <span>Password</span>
            <div className="adm-input">
              <Lock size={15} />
              <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
          </label>
          <button className="pg-btn pg-btn-primary adm-login-submit" disabled={busy}>
            {busy ? <Loader2 size={15} className="pg-spin" /> : <ArrowRight size={15} />}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <a className="adm-login-back" href="/">Go to the user app</a>
      </div>
    </div>
  );
}
