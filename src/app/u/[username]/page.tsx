import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Heatmap } from '@/components/ui/Charts';
import { APP_NAME, SITE_URL } from '@/lib/config';
import { dayNum, initials, isoFromDay } from '@/lib/format';
import { createPublicClient } from '@/lib/supabase/public';

export const revalidate = 300;
type P = { params: Promise<{ username: string }> };
interface Pub { username: string; name: string | null; avatar_url: string | null; bio: string | null; total: number; dates: string[]; dashboards: { name: string; icon: string; color: string; description: string | null; projects: number }[] }

async function load(username: string): Promise<Pub | null> {
  if (!/^[a-z0-9_-]{3,30}$/i.test(username)) return null;
  const { data } = await createPublicClient().rpc('get_public_profile', { p_username: username });
  return (data as Pub | null) ?? null;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await load((await params).username);
  if (!p) return { title: 'Profile not found', robots: { index: false } };
  const title = `${p.name ?? p.username} (@${p.username})`;
  return { title, description: p.bio ?? `${p.total} projects delivered. Portfolio on ${APP_NAME}.`, alternates: { canonical: `/u/${p.username}` }, openGraph: { title, type: 'profile' } };
}

export default async function Profile({ params }: P) {
  const p = await load((await params).username);
  if (!p) notFound();
  const counts = new Map<string, number>();
  p.dates.forEach((d) => counts.set(d, (counts.get(d) ?? 0) + 1));
  const today = Math.floor(Date.now() / 86400000);
  const start = Math.floor((today + 3) / 7) * 7 - 3 - 52 * 7;
  const days = Array.from({ length: today - start + 1 }, (_, i) => { const date = isoFromDay(start + i); return { date, count: counts.get(date) ?? 0 }; });
  void dayNum;
  const ld = { '@context': 'https://schema.org', '@type': 'ProfilePage', mainEntity: { '@type': 'Person', name: p.name ?? p.username, description: p.bio ?? undefined, image: p.avatar_url ?? undefined, url: `${SITE_URL}/u/${p.username}` } };
  return (
    <main className="shared-top" style={{ paddingBottom: 90 }}>
      <Link href="/" className="brand" style={{ padding: 0, marginBottom: 40 }}><i />{APP_NAME}</Link>
      <div className="row gap-lg wrap" style={{ alignItems: 'flex-start' }}>
        {p.avatar_url ? <img className="avatar" style={{ width: 96, height: 96 }} src={p.avatar_url} alt="" referrerPolicy="no-referrer" /> : <span className="avatar" style={{ width: 96, height: 96, fontSize: 30 }}>{initials(p.name ?? p.username)}</span>}
        <div className="grow"><h1>{p.name ?? p.username}</h1><div className="muted">@{p.username}</div>{p.bio && <p style={{ fontSize: 19, maxWidth: '56ch', marginTop: 14 }}>{p.bio}</p>}</div>
        <div style={{ textAlign: 'right' }}><div className="k-val" style={{ fontFamily: 'var(--font-display)', fontSize: 64, lineHeight: 1 }}>{p.total}</div><div className="k-label" style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--faint)' }}>projects delivered</div></div>
      </div>
      <h2 className="sec-title">Delivery activity <small>last 12 months</small></h2>
      <Heatmap days={days} />
      <h2 className="sec-title">Pinned dashboards</h2>
      {p.dashboards.length === 0 && <p className="muted">Nothing published yet.</p>}
      {p.dashboards.map((d) => (
        <div key={d.name} className="row between" style={{ padding: '18px 0', borderBottom: '1px solid var(--line)' }}>
          <span className="row"><span style={{ color: d.color, fontSize: 24 }}>{d.icon}</span><span><b style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 500 }}>{d.name}</b>{d.description && <><br /><span className="muted">{d.description}</span></>}</span></span>
          <span className="num muted">{d.projects} projects</span>
        </div>
      ))}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    </main>
  );
}
