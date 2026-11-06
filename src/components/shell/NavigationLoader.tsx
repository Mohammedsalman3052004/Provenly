'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Loader } from '@/components/ui/Loader';

/**
 * Shows a loader the instant an internal link is clicked, without waiting for Next.js
 * to compile/stream the next page. Hides itself when the new route is in place.
 */
export function NavigationLoader() {
  const path = usePathname();
  const [visible, setVisible] = useState(false);
  const show = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failsafe = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (show.current) clearTimeout(show.current);
    if (failsafe.current) clearTimeout(failsafe.current);
    show.current = failsafe.current = null;
  };

  useEffect(() => { clear(); setVisible(false); }, [path]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      clear();
      show.current = setTimeout(() => setVisible(true), 120); // skip the flash on instant navigations
      failsafe.current = setTimeout(() => setVisible(false), 15000);
    };
    document.addEventListener('click', onClick, true);
    return () => { document.removeEventListener('click', onClick, true); clear(); };
  }, []);

  if (!visible) return null;
  return <div className="nav-loader"><Loader label="Loading page" /></div>;
}
