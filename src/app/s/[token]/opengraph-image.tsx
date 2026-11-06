import { ImageResponse } from 'next/og';
import { readShare } from '@/features/share/actions';
import { APP_NAME } from '@/lib/config';

export const alt = 'Shared project portfolio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-dynamic';

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await readShare(token, { count: false });
  const ok = r.status === 'ok' && r.vm;
    const title = ok ? r.vm!.payload.dashboard.name : r.status === 'unavailable' ? 'Link unavailable' : 'Protected portfolio';
  const owner = ok ? r.vm!.payload.owner.name ?? '' : '';
  const count = ok ? `${r.vm!.payload.projects.length} projects` : '';
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(150deg, #03195b 0%, #0b2cb1 55%, #1951fc 100%)', color: '#ffffff', padding: 72, fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 30 }}><div style={{ width: 18, height: 18, background: '#cbe9fd', borderRadius: 6 }} />{APP_NAME}</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: title.length > 24 ? 84 : 112, lineHeight: 1.02, letterSpacing: -2 }}>{title}</div>
          <div style={{ marginTop: 26, fontSize: 34, color: '#cbe9fd', display: 'flex' }}>{[owner, count].filter(Boolean).join('  ·  ')}</div>
        </div>
      </div>
    ),
    size,
  );
}
