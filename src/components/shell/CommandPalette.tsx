'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cycleTheme } from '@/components/ui/ThemeToggle';
import { searchProjects } from '@/features/projects/actions';
import type { Dashboard } from '@/types';

interface Item { id: string; label: string; hint?: string; run: () => void }

export function CommandPalette({ open, onClose, dashboards, currentId }: { open: boolean; onClose: () => void; dashboards: Dashboard[]; currentId: string | null }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const [found, setFound] = useState<{ id: string; dashboard_id: string; title: string; dashboard: string }[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setQ(''); setSel(0); setFound([]); setTimeout(() => input.current?.focus(), 20); } }, [open]);
  useEffect(() => {
    if (q.trim().length < 2) { setFound([]); return; }
    const t = setTimeout(() => void searchProjects(q).then(setFound).catch(() => setFound([])), 220);
    return () => clearTimeout(t);
  }, [q]);

  const go = (href: string) => () => { router.push(href); onClose(); };
  const items = useMemo<Item[]>(() => {
    const base: Item[] = [{ id: 'home', label: 'Go to Home', hint: 'all dashboards', run: go('/app') }, { id: 'new', label: 'New dashboard', run: go('/app/new') }, { id: 'acct', label: 'Account settings', run: go('/app/account') }];
    if (currentId) {
      const b = `/app/d/${currentId}`;
      base.unshift(
        { id: 'add', label: 'Add project', hint: 'current dashboard', run: go(`${b}/add`) },
        { id: 'proj', label: 'Projects', run: go(`${b}/projects`) }, { id: 'ana', label: 'Analytics', run: go(`${b}/analytics`) },
        { id: 'share', label: 'Share links', run: go(`${b}/share`) }, { id: 'fields', label: 'Fields', run: go(`${b}/fields`) }, { id: 'set', label: 'Dashboard settings', run: go(`${b}/settings`) },
      );
    }
    base.push(...dashboards.map((d) => ({ id: `d-${d.id}`, label: `${d.icon} ${d.name}`, hint: 'dashboard', run: go(`/app/d/${d.id}`) })));
    base.push({ id: 'theme', label: 'Toggle theme', hint: 'dark / light / system', run: () => { cycleTheme(); onClose(); } });
    const term = q.trim().toLowerCase();
    const filtered = term ? base.filter((i) => i.label.toLowerCase().includes(term)) : base;
    const projects = found.map((p) => ({ id: `p-${p.id}`, label: p.title, hint: p.dashboard, run: go(`/app/d/${p.dashboard_id}/projects?open=${p.id}`) }));
    return [...filtered, ...projects];
  }, [q, dashboards, currentId, found]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command palette">
        <input ref={input} value={q} placeholder="Jump to a dashboard or project, or run a command…" aria-label="Command"
          onChange={(e) => { setQ(e.target.value); setSel(0); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
            if (e.key === 'Enter') items[sel]?.run();
            if (e.key === 'Escape') onClose();
          }} />
        <ul role="listbox">
          {items.map((it, i) => <li key={it.id} role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={it.run}><span>{it.label}</span><span className="faint">{it.hint}</span></li>)}
          {items.length === 0 && <li className="faint">No matches</li>}
        </ul>
      </div>
    </>
  );
}
