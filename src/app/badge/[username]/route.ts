import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/public';

export const revalidate = 3600;
const esc = (s: string) => s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Embeddable SVG badge:  ![Provenly](https://YOUR-SITE/badge/username)  */
export async function GET(_: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  let label = 'not found';
  if (/^[a-z0-9_-]{3,30}$/i.test(username)) {
    const { data } = await createPublicClient().rpc('get_public_profile', { p_username: username });
    if (data) label = `${(data as { total: number }).total} projects delivered`;
  }
  const w1 = 92, w2 = Math.max(110, label.length * 7 + 22), W = w1 + w2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="24" role="img" aria-label="Provenly: ${esc(label)}"><rect width="${w1}" height="24" rx="5" fill="#061038"/><rect x="${w1}" width="${w2}" height="24" rx="5" fill="#1951fc"/><rect x="${w1}" width="8" height="24" fill="#1951fc"/><g font-family="Verdana,sans-serif" font-size="11" text-anchor="middle"><text x="${w1 / 2}" y="16" fill="#eaf2ff">Provenly</text><text x="${w1 + w2 / 2}" y="16" fill="#ffffff" font-weight="bold">${esc(label)}</text></g></svg>`;
  return new NextResponse(svg, { headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
}
