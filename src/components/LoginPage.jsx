import React, { useState } from 'react';
import { 
  Sparkles, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Database
} from 'lucide-react';
import PenguinAvatar from './PenguinAvatar';
import { supabase } from '../lib/supabase';

export default function LoginPage({ onLoginSuccess, notice = '' }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(notice);
  const [successMsg, setSuccessMsg] = useState('');

  // Real Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      if (error) throw error;
    } catch (err) {
      setErrorMsg(
        err.message?.includes('provider is not enabled')
          ? 'Google provider needs to be enabled in your Supabase dashboard (Authentication -> Providers -> Google).'
          : (err.message || 'Google sign in could not be initiated.')
      );
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split('@')[0],
              headline: 'Senior Software Engineer'
            }
          }
        });

        if (error) throw error;

        // Try creating profile in profiles table via admin if available
        if (data.user) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              email: data.user.email,
              name: name || email.split('@')[0],
              headline: 'Senior Software Engineer'
            });
          } catch (e) {
            // Ignored if table not created yet
          }
        }

        setSuccessMsg('Account created successfully in Supabase! Logging you in...');
        setTimeout(() => {
          onLoginSuccess(data.user || { id: 'temp-id', email, user_metadata: { name: name || email.split('@')[0] } });
        }, 800);

      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setErrorMsg(/banned/i.test(err.message || '')
        ? 'Your account has been blocked by an administrator. Contact support if you think this is a mistake.'
        : (err.message || 'Authentication failed. Please verify credentials.'));
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="login-page-container">
      {/* Background Decorative Glow Elements */}
      <div className="login-bg-glow glow-1"></div>
      <div className="login-bg-glow glow-2"></div>

      <div className="login-card-wrapper animate-slide-up">
        {/* Brand Header */}
        <div className="login-header">
          <div className="login-brand-icon" style={{ background: 'none', border: 'none' }}>
            <PenguinAvatar mode="idle" size={54} />
          </div>
          <h1 className="login-title">
            Penguin<span className="text-teal">AI</span>
          </h1>
          <p className="login-subtitle">
            Autonomous LinkedIn Job Application Agent &bull; Powered by Baby Penguin &amp; Chrome CDP
          </p>
        </div>

        {/* Real Google Sign In Button */}
        <button 
          type="button" 
          onClick={handleGoogleSignIn} 
          className="btn-google-signin"
          disabled={loading}
        >
          <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="login-divider">
          <span>or continue with email</span>
        </div>

        {/* Tab Toggle */}
        <div className="login-tabs">
          <button 
            type="button"
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
          >
            Sign In
          </button>
          <button 
            type="button"
            className={`login-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
          >
            Create Account
          </button>
        </div>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="login-alert alert-error animate-slide-up">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="login-alert alert-success animate-slide-up">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'signup' && (
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Subhash Kalakota"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="clean-input"
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Email Address</label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input 
                type="email" 
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="clean-input"
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-wrapper">
              <Lock size={16} className="input-icon" />
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="clean-input"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-login-primary"
            disabled={loading}
          >
            <span>{loading ? 'Authenticating...' : (mode === 'login' ? 'Sign In to Dashboard' : 'Register in Supabase')}</span>
            <ArrowRight size={16} />
          </button>
        </form>


        {/* Footer Database Badge */}
        <div className="login-footer">
          <div className="supabase-status-pill">
            <Database size={13} className="text-teal" />
            <span className="dot-live"></span>
            <span>Cloud Database Connected &bull; Enterprise Secure</span>
          </div>
        </div>
      </div>
    </div>
  );
}
