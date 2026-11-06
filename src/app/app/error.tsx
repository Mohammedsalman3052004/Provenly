'use client';
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page"><div className="empty"><div className="glyph">!</div><h2>Something went wrong</h2><p>{error.message || 'Unexpected error.'}</p><button className="btn btn-primary" onClick={reset}>Try again</button></div></div>
  );
}
