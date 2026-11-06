// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Landing } from '@/features/landing/Landing';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (q: string) => ({ matches: q.includes('min-width') ? true : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false, onchange: null }),
  });
  class RO { observe() {} unobserve() {} disconnect() {} }
  (globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;
  (document as unknown as { fonts: { ready: Promise<void> } }).fonts = { ready: Promise.resolve() };
  window.scrollTo = () => undefined;
});
afterEach(() => { document.body.innerHTML = ''; });

describe('landing page', () => {
  it('mounts, runs every GSAP/Lenis setup without throwing, and unmounts cleanly', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => { root.render(<Landing />); });
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    const lp = host.querySelector('.lp')!;
    const animationErrors = err.mock.calls.filter((c) => String(c[0]).includes('Landing animation failed'));
    expect(animationErrors.map((c) => String(c[1]))).toEqual([]);
    expect(lp.classList.contains('lp-static')).toBe(false);
    for (const s of ['.lp-hero', '.lp-mtrack', '.lp-manifesto', '.lp-htrack', '.lp-dash', '.lp-slist', '.lp-cta-box']) expect(host.querySelector(s), s).not.toBeNull();
    expect(host.querySelectorAll('.lp-hcard').length).toBe(6);
    expect(host.querySelectorAll('details').length).toBeGreaterThanOrEqual(5);
    await act(async () => { root.unmount(); });
    err.mockRestore();
  });
});
