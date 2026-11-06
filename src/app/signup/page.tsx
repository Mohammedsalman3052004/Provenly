import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthForm } from '@/components/ui/AuthForm';
import { APP_NAME } from '@/lib/config';

export const metadata: Metadata = { title: 'Create account', robots: { index: false } };

export default function Page() {
  return (
    <div className="auth">
      <aside className="auth-art">
        <Link href="/" className="brand"><i />{APP_NAME}</Link>
        <h2>Your work, <em style={{ color: 'var(--accent-text)' }}>on the record.</em></h2>
        <p className="muted" style={{ maxWidth: '40ch' }}>Track every project, hide the numbers you want private, and share one link that belongs on your resume.</p>
      </aside>
      <main><Suspense><AuthForm mode="signup" /></Suspense></main>
    </div>
  );
}
