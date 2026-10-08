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
