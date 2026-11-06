'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const params = useSearchParams();
  const next = params.get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/app';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(params.get('error') ? 'Sign-in failed. Please try again.' : '');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const sb = createClient();

  async function google() {
    setBusy(true);
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}` } });
    if (error) { setMsg(error.message); setBusy(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (cooldown) return;
    setBusy(true); setMsg('');
    const res = mode === 'login' ? await sb.auth.signInWithPassword({ email, password }) : await sb.auth.signUp({ email, password });
    setBusy(false);
    if (res.error) {
      setMsg(res.error.message);
      setCooldown(3); const t = setInterval(() => setCooldown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
      return;
    }
    if (!res.data.session) { setMsg('Account created, but your Supabase project still requires email confirmation. Turn it off under Authentication → Providers → Email.'); return; }
    window.location.assign(safeNext);
  }

  return (
    <div className="auth-form">
      <h1 style={{ fontSize: 48, marginBottom: 6 }}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
      <p className="muted" style={{ marginTop: 0 }}>{mode === 'login' ? 'Sign in to your dashboards.' : 'No email verification. You are in as soon as you sign up.'}</p>
      <button className="btn" style={{ width: '100%', height: 46, marginTop: 14 }} onClick={google} disabled={busy}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
        Continue with Google
      </button>
      <div className="divider">or</div>
      <form onSubmit={submit} className="stack" style={{ gap: 14 }}>
        <div><label className="label" htmlFor="email">Email</label><input id="email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label" htmlFor="pw">Password</label><input id="pw" className="input" type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />{mode === 'signup' && <div className="hint">At least 8 characters.</div>}</div>
        {msg && <div className="field-err" role="alert">{msg}</div>}
        <button className="btn btn-primary" style={{ height: 46 }} disabled={busy || cooldown > 0}>{cooldown ? `Wait ${cooldown}s` : busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
      <p className="muted" style={{ marginTop: 22 }}>{mode === 'login' ? <>New here? <Link href="/signup" style={{ textDecoration: 'underline' }}>Create an account</Link></> : <>Already have an account? <Link href="/login" style={{ textDecoration: 'underline' }}>Sign in</Link></>}</p>
    </div>
  );
}
