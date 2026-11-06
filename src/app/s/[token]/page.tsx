import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PasswordGate } from '@/features/share/PasswordGate';
import { SharedView } from '@/features/share/SharedView';
import { readShare } from '@/features/share/actions';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { token } = await params;
  const r = await readShare(token, { count: false });
  if (r.status !== 'ok' || !r.vm) return { title: 'Shared dashboard', robots: { index: false, follow: false } };
  const { dashboard, owner, link } = r.vm.payload;
  const title = `${dashboard.name}${owner.name ? ` · ${owner.name}` : ''}`;
  return {
    title,
    description: dashboard.description ?? `${r.vm.payload.projects.length} projects by ${owner.name ?? 'a freelancer'}.`,
    robots: link.noindex ? { index: false, follow: false } : { index: true, follow: true },
    alternates: { canonical: `/s/${token}` },
  };
}

export default async function Shared({ params }: P) {
  const { token } = await params;
  const r = await readShare(token, { count: true });
  if (r.status === 'unavailable') notFound();
  if (r.status !== 'ok' || !r.vm) return <PasswordGate token={token} name={r.name} locked={r.status === 'locked'} />;
  return <SharedView vm={r.vm} token={token} />;
}
