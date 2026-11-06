'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CommandPalette } from '@/components/shell/CommandPalette';
import { NavigationLoader } from '@/components/shell/NavigationLoader';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ToastProvider } from '@/components/ui/Toast';
import { signOut } from '@/features/dashboards/actions';
import { APP_NAME } from '@/lib/config';
import { initials } from '@/lib/format';
import type { Dashboard } from '@/types';

const DASH_NAV = [
  { href: '', label: 'Overview', ico: '◌' }, { href: '/add', label: 'Add project', ico: '＋' }, { href: '/projects', label: 'Projects', ico: '▤' },
  { href: '/analytics', label: 'Analytics', ico: '◔' }, { href: '/share', label: 'Share', ico: '↗' }, { href: '/fields', label: 'Fields', ico: '☰' }, { href: '/settings', label: 'Settings', ico: '⚙' },
];

export function AppShell({ dashboards, user, children }: { dashboards: Dashboard[]; user: { name: string; avatar: string | null; username: string | null }; children: React.ReactNode }) {
  const path = usePathname();
  const currentId = path.match(/^\/app\/d\/([0-9a-f-]{36})/)?.[1] ?? null;
  const current = dashboards.find((d) => d.id === currentId) ?? null;
  const [menu, setMenu] = useState(false);
  const [filter, setFilter] = useState('');
  const [palette, setPalette] = useState(false);
  const sw = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); } };
    const c = (e: MouseEvent) => { if (sw.current && !sw.current.contains(e.target as Node)) setMenu(false); };
    window.addEventListener('keydown', k); document.addEventListener('mousedown', c);
    return () => { window.removeEventListener('keydown', k); document.removeEventListener('mousedown', c); };
  }, []);
  useEffect(() => setMenu(false), [path]);

  const shown = useMemo(() => dashboards.filter((d) => d.name.toLowerCase().includes(filter.toLowerCase())), [dashboards, filter]);
  const base = currentId ? `/app/d/${currentId}` : null;
  const active = (href: string) => (href === '' ? path === base : path.startsWith(`${base}${href}`));

  return (
    <ToastProvider>
      <div className="shell" style={current ? { ['--dash' as string]: current.color } : undefined}>
        <aside className="side nav" aria-label="Sidebar">
          <Link href="/app" className="brand"><i />{APP_NAME}</Link>
          <div className="switcher" ref={sw}>
            <button className="switch-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="listbox">
              <span className="dot">{current?.icon ?? '◇'}</span>
              <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current?.name ?? 'All dashboards'}</span><span className="faint">⌄</span>
            </button>
            {menu && (
              <div className="menu" role="listbox">
                {dashboards.length > 5 && <input className="input" style={{ height: 34, marginBottom: 6 }} placeholder="Search…" value={filter} onChange={(e) => setFilter(e.target.value)} autoFocus />}
                <Link href="/app" className={!current ? 'on' : ''}>◇ All dashboards (Home)</Link>
                {shown.map((d) => <Link key={d.id} href={`/app/d/${d.id}`} className={d.id === currentId ? 'on' : ''}><span style={{ color: d.color }}>{d.icon}</span> {d.name}</Link>)}
                <Link href="/app/new" style={{ color: 'var(--accent-text)' }}>＋ New dashboard</Link>
              </div>
            )}
          </div>

          {base && <>
            <div className="nav-label">{current?.name}</div>
            {DASH_NAV.map((n) => <Link key={n.href} href={`${base}${n.href}`} aria-current={active(n.href) ? 'page' : undefined}><span className="ico">{n.ico}</span>{n.label}</Link>)}
          </>}
          <div className="nav-label">Account</div>
          <Link href="/app" aria-current={path === '/app' ? 'page' : undefined}><span className="ico">◇</span>Home</Link>
          <Link href="/app/account#profile" aria-current={path.startsWith('/app/account') ? 'page' : undefined}><span className="ico">☺</span>Public profile</Link>
          <Link href="/app/account" aria-current={undefined}><span className="ico">⚙</span>Account settings</Link>
          <span className="grow" />
          <div className="row" style={{ padding: '10px 6px 0', borderTop: '1px solid var(--line)' }}>
            {user.avatar ? <img className="avatar" src={user.avatar} alt="" referrerPolicy="no-referrer" /> : <span className="avatar">{initials(user.name)}</span>}
            <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13.5 }}>{user.name}</span>
            <form action={signOut}><button className="btn btn-sm" aria-label="Sign out">Sign out</button></form>
          </div>
        </aside>

        <div className="main">
          <div className="topbar">
            <Link href="/app" className="brand only-sm" style={{ padding: 0 }}><i />{APP_NAME}</Link>
            <button className="btn btn-sm grow hide-sm" style={{ justifyContent: 'flex-start', maxWidth: 360, color: 'var(--faint)' }} onClick={() => setPalette(true)}>Search or jump to… <span className="grow" /><kbd>Ctrl K</kbd></button>
            <span className="grow only-sm" />
            <button className="btn btn-sm only-sm" onClick={() => setPalette(true)} aria-label="Search">⌕</button>
            <span className="grow hide-sm" />
            {base && <Link className="btn btn-sm btn-primary" href={`${base}/add`}>+ Add project</Link>}
            <ThemeToggle />
          </div>
          {children}
        </div>

        <nav className="bottomnav" aria-label="Primary">
          <Link href="/app" aria-current={path === '/app' ? 'page' : undefined}>◇<span>Home</span></Link>
          {base ? <>
            <Link href={`${base}/projects`} aria-current={active('/projects') ? 'page' : undefined}>▤<span>Projects</span></Link>
            <Link href={`${base}/add`} aria-current={active('/add') ? 'page' : undefined}>＋<span>Add</span></Link>
            <Link href={`${base}/analytics`} aria-current={active('/analytics') ? 'page' : undefined}>◔<span>Stats</span></Link>
            <Link href={`${base}/share`} aria-current={active('/share') ? 'page' : undefined}>↗<span>Share</span></Link>
          </> : <>
            <Link href="/app/new" aria-current={path === '/app/new' ? 'page' : undefined}>＋<span>New</span></Link>
            <Link href="/app/account" aria-current={path.startsWith('/app/account') ? 'page' : undefined}>☺<span>Account</span></Link>
          </>}
        </nav>
      </div>
      <NavigationLoader />
      <CommandPalette open={palette} onClose={() => setPalette(false)} dashboards={dashboards} currentId={currentId} />
    </ToastProvider>
  );
}
