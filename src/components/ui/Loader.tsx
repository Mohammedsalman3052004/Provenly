'use client';
import { DotWave } from 'ldrs/react';
import 'ldrs/react/DotWave.css';

export function Loader({ size = 47, label = 'Loading' }: { size?: number; label?: string }) {
  return (
    <div className="loader-wrap" role="status" aria-live="polite">
      <DotWave size={size} speed={1} color="var(--accent)" />
      <span className="sr">{label}</span>
    </div>
  );
}
