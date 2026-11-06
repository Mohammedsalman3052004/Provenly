import Link from 'next/link';
export default function NotFound() {
  return <div className="page"><div className="empty"><div className="glyph">?</div><h2>Dashboard not found</h2><p>It may have been deleted, or it belongs to another account.</p><Link className="btn btn-primary" href="/app">Back to Home</Link></div></div>;
}
