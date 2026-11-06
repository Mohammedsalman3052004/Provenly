'use client';
import { useEffect, useState } from 'react';

type Mode = 'dark' | 'light' | 'system';
export function applyTheme(mode: Mode) {
  localStorage.setItem('fb-theme', mode);
  const t = mode === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : mode;
  document.documentElement.dataset.theme = t;
}
export function cycleTheme(): Mode {
  const cur = (localStorage.getItem('fb-theme') as Mode) || 'dark';
  const next: Mode = cur === 'dark' ? 'light' : cur === 'light' ? 'system' : 'dark';
  applyTheme(next);
  return next;
}
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>('dark');
  useEffect(() => setMode((localStorage.getItem('fb-theme') as Mode) || 'dark'), []);
  return (
    <button className="btn btn-sm" onClick={() => setMode(cycleTheme())} aria-label={`Theme: ${mode}. Click to change`} title="Change theme">
      {mode === 'dark' ? '☾' : mode === 'light' ? '☀' : '◐'} <span className="hide-sm">{mode}</span>
    </button>
  );
}
