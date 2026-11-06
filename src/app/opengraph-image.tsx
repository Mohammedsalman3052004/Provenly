import { ImageResponse } from 'next/og';
import { APP_NAME } from '@/lib/config';

export const alt = `${APP_NAME} — project portfolio dashboard`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(150deg, #03195b 0%, #0b2cb1 55%, #1951fc 100%)', color: '#ffffff', padding: 72, fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 32 }}><div style={{ width: 20, height: 20, background: '#cbe9fd', borderRadius: 6 }} />{APP_NAME}</div>
        <div style={{ fontSize: 112, lineHeight: 1, letterSpacing: -2, display: 'flex' }}>Your client work, on the record.</div>
        <div style={{ fontSize: 32, color: '#cbe9fd', display: 'flex' }}>Project portfolio dashboard for freelancers</div>
      </div>
    ),
    size,
  );
}
