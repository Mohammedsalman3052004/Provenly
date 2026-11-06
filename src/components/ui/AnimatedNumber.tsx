'use client';
import { useEffect, useRef, useState } from 'react';

/** Counts up on mount. Server renders the final text so there is no layout shift or SEO loss. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const first = useRef(true);
  useEffect(() => {
    if (!first.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return; }
    first.current = false;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 700);
      setShown(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span>{format(shown)}</span>;
}
