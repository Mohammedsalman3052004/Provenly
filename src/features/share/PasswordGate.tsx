'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { unlockShare } from '@/features/share/actions';

export function PasswordGate({ token, name, locked }: { token: string; name?: string; locked?: boolean }) {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState(locked ? 'Too many attempts. Try again in 15 minutes.' : '');
  const [busy, setBusy] = useState(false);
  return (
    <main className="auth-form" style={{ minHeight: '100vh' }}>
      <div className="eyebrow">Protected link</div>
      <h1 style={{ fontSize: 52, margin: '8px 0 18px' }}>{name ?? 'Enter password'}</h1>
      <form onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setMsg('');
        const r = await unlockShare(token, pw);
        setBusy(false);
        if (r === 'ok') router.refresh(); else setMsg(r === 'wrong' ? 'That password is not right.' : r === 'locked' ? 'Too many attempts. Try again in 15 minutes.' : 'This link is not available.');
      }}>
        <label className="label" htmlFor="pw">Password</label>
        <input id="pw" className="input" type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} disabled={locked} />
        {msg && <div className="field-err" role="alert">{msg}</div>}
        <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={busy || !pw || locked}>{busy ? 'Checking…' : 'Open'}</button>
      </form>
    </main>
  );
}
