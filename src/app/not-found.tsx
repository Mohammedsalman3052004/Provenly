import Link from 'next/link';
export default function NotFound() {
  return <main className="empty" style={{ paddingTop: '22vh' }}><div className="glyph">404</div><h2>Nothing here</h2><p>The page you wanted does not exist, or the link is no longer active.</p><Link className="btn btn-primary" href="/">Go home</Link></main>;
}
