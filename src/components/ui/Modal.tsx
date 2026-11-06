'use client';
import { useEffect } from 'react';

export function Overlay({ onClose, kind, label, children }: { onClose: () => void; kind: 'modal' | 'drawer'; label: string; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className={kind} role="dialog" aria-modal="true" aria-label={label}>{children}</div>
    </>
  );
}
