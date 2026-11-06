'use client';
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="empty" style={{ paddingTop: '20vh' }}>
      <div className="glyph">!</div>
      <h2>Something went wrong</h2>
      <p style={{ maxWidth: 520, margin: '0 auto 18px' }}>{error.message || 'Unexpected error.'}</p>
      <button className="btn btn-primary" onClick={reset}>Try again</button>
    </main>
  );
}
