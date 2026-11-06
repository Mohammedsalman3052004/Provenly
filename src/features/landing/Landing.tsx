/* eslint-disable react/no-unescaped-entities */
'use client';
import Link from 'next/link';
import { Fragment, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import './landing.css';
import { FAQ } from '@/features/landing/content';
import { APP_NAME } from '@/lib/config';

const Words = ({ text }: { text: string }) => (
  <>{text.split(' ').map((w, i) => (<Fragment key={i}><span className="lp-wm"><span className="lp-w">{w}</span></span>{' '}</Fragment>))}</>
);
const MANIFESTO = 'Spreadsheets forget. Folders get buried. Your best work deserves a record you can prove: organised by client, measured by month, and shared only on your terms.';
const MARQUEE = ['Dashboards', 'Custom fields', 'Pro table', 'Share links', 'Analytics', 'Delivery heatmap', 'Public profile', 'CSV import', 'Board view', 'Timeline', 'Goals', 'Dark & light'];
const BARS = [34, 46, 41, 62, 55, 76, 70, 90, 82, 100, 94, 100].map((h, i) => (i === 11 ? 100 : h));
const MONTHS = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
const HEAT = Array.from({ length: 182 }, (_, i) => { const n = (i * 7919 + (i % 7) * 31) % 13; return n < 5 ? '' : n < 8 ? 'a' : n < 10 ? 'b' : n < 12 ? 'c' : 'd'; });

type K = 'client' | 'amount' | 'profit';
const ROWS = [
  { name: 'Aurora Interiors', client: 'Aurora Group', amount: '₹1,20,000', profit: '₹94,500' },
  { name: 'Northwind Realty', client: 'Northwind', amount: '₹85,000', profit: '₹61,200' },
  { name: 'Kite & Co. Store', client: 'Kite & Co.', amount: '₹64,500', profit: '₹48,300' },
];
const LABEL: Record<K, string> = { client: 'Client', amount: 'Amount', profit: 'Profit' };

function HideDemo() {
  const [shown, setShown] = useState<Record<K, boolean>>({ client: true, amount: true, profit: true });
  const keys = (['client', 'amount', 'profit'] as K[]).filter((k) => shown[k]);
  const template = ['1.5fr', ...keys.map(() => '1fr')].join(' ');
  const hidden = (['client', 'amount', 'profit'] as K[]).filter((k) => !shown[k]);
  const r0 = ROWS[0];
  return (
    <div className="lp-glass lp-demo" data-r>
      <div className="lp-demo-chips" role="group" aria-label="Choose what your viewer sees">
        <span style={{ color: 'var(--soft)', fontSize: 13, marginRight: 4 }}>Viewer can see:</span>
        {(['client', 'amount', 'profit'] as K[]).map((k) => (
          <button key={k} className="lp-toggle" aria-pressed={shown[k]} onClick={() => setShown((s) => ({ ...s, [k]: !s[k] }))}>{shown[k] ? '👁' : '⌀'} {LABEL[k]}</button>
        ))}
      </div>
      <div className="lp-dtable">
        <div className="lp-drow hd" style={{ gridTemplateColumns: template }}><span>Project</span>{keys.map((k) => <span key={k}>{LABEL[k]}</span>)}</div>
        {ROWS.map((r) => (
          <div className="lp-drow" key={r.name} style={{ gridTemplateColumns: template }}><span>{r.name}</span>{keys.map((k) => <span key={k}>{r[k]}</span>)}</div>
        ))}
      </div>
      <div className="lp-code" aria-live="polite">
        <div className="lp-code-h"><span>What the viewer’s browser receives</span><span>GET /s/9f2c…e41a</span></div>
        <div>{'{'}</div>
        <div>&nbsp;&nbsp;<b>"project"</b>: <span className="v">"{r0.name}"</span>{keys.length ? ',' : ''}</div>
        {keys.map((k, i) => <div key={k}>&nbsp;&nbsp;<b>"{k}"</b>: <span className="v">"{r0[k]}"</span>{i < keys.length - 1 ? ',' : ''}</div>)}
        <div>{'}'}</div>
        <div style={{ marginTop: 8 }}>{hidden.length ? <>{'// '}<span className="zero">0</span> hidden values sent ({hidden.map((k) => LABEL[k]).join(', ')} removed on the server)</> : '// nothing hidden yet: untick a field above'}</div>
      </div>
    </div>
  );
}

const fmt = {
  inr: (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`,
  int: (v: number) => String(Math.round(v)),
  pct: (v: number) => `${Math.round(v)}%`,
} as const;

export function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.classList.add('lp-static'); return; }

    gsap.registerPlugin(ScrollTrigger);
    const q = gsap.utils.selector(el);
    const cleanups: (() => void)[] = [];
    let tick: ((t: number) => void) | null = null;
    let mm: gsap.MatchMedia | null = null;

    const ctx = gsap.context(() => {
      try {
        // ---------- smooth scroll (Lenis) wired into GSAP ----------
        const lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
        lenisRef.current = lenis;
        lenis.on('scroll', ScrollTrigger.update);
        tick = (time: number) => lenis.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);

        // ---------- progress bar + nav ----------
        gsap.to(q('.lp-progress'), { scaleX: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.2 } });
        const nav = el.querySelector<HTMLElement>('.lp-nav');
        ScrollTrigger.create({
          start: 0, end: 'max',
          onUpdate: (self) => {
            const y = self.scroll();
            nav?.classList.toggle('lp-nav-solid', y > 40);
            nav?.classList.toggle('lp-nav-hide', self.direction === 1 && y > 520);
            if (self.direction === -1) nav?.classList.remove('lp-nav-hide');
          },
        });

        // ---------- cursor glow, hero tilt + parallax ----------
        const glow = el.querySelector<HTMLElement>('.lp-glow');
        if (glow) {
          const gx = gsap.quickTo(glow, 'x', { duration: 0.9, ease: 'power3' });
          const gy = gsap.quickTo(glow, 'y', { duration: 0.9, ease: 'power3' });
          const move = (e: PointerEvent) => { gx(e.clientX); gy(e.clientY); };
          window.addEventListener('pointermove', move);
          cleanups.push(() => window.removeEventListener('pointermove', move));
        }
        const stage = el.querySelector<HTMLElement>('.lp-stage');
        const tilt = el.querySelector<HTMLElement>('.lp-tilt');
        if (stage && tilt) {
          const rx = gsap.quickTo(tilt, 'rotationX', { duration: 0.9, ease: 'power3' });
          const ry = gsap.quickTo(tilt, 'rotationY', { duration: 0.9, ease: 'power3' });
          gsap.set(tilt, { transformPerspective: 1400 });
          const floats = gsap.utils.toArray<HTMLElement>('.lp-float', el);
          const onMove = (e: PointerEvent) => {
            const r = stage.getBoundingClientRect();
            const nx = (e.clientX - r.left) / r.width - 0.5;
            const ny = (e.clientY - r.top) / r.height - 0.5;
            ry(nx * 12); rx(-ny * 9);
            floats.forEach((f) => { const d = Number(f.dataset.depth ?? 1); gsap.to(f, { x: nx * 34 * d, y: ny * 26 * d, duration: 0.8, ease: 'power3.out', overwrite: 'auto' }); });
          };
          const onLeave = () => { ry(0); rx(0); floats.forEach((f) => gsap.to(f, { x: 0, y: 0, duration: 1, ease: 'power3.out', overwrite: 'auto' })); };
          stage.addEventListener('pointermove', onMove);
          stage.addEventListener('pointerleave', onLeave);
          cleanups.push(() => { stage.removeEventListener('pointermove', onMove); stage.removeEventListener('pointerleave', onLeave); });
        }

        // ---------- hero intro ----------
        gsap.timeline({ defaults: { ease: 'power4.out' } })
          .fromTo(q('.lp-hero .lp-w'), { yPercent: 118, rotate: 5 }, { yPercent: 0, rotate: 0, duration: 1.15, stagger: 0.06 }, 0.1)
          .fromTo(q('[data-hero]'), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.1 }, 0.45)
          .fromTo(q('.lp-mock'), { y: 110, rotateX: 16, scale: 0.92, opacity: 0 }, { y: 0, rotateX: 0, scale: 1, opacity: 1, duration: 1.5 }, 0.5)
          .fromTo(q('.lp-float'), { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.9, stagger: 0.12, ease: 'back.out(1.7)' }, 1.2);
        gsap.to(q('.lp-hero-in'), { yPercent: -14, opacity: 0.1, ease: 'none', scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to(q('.lp-orb-a'), { y: 260, ease: 'none', scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to(q('.lp-orb-b'), { y: -160, ease: 'none', scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to(q('.lp-orb-a'), { x: 60, duration: 7, ease: 'sine.inOut', yoyo: true, repeat: -1 });

        // ---------- marquee reacts to scroll speed ----------
        const track = el.querySelector<HTMLElement>('.lp-mtrack');
        if (track) {
          const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 40, repeat: -1 });
          ScrollTrigger.create({
            onUpdate: (self) => { loop.timeScale(1 + Math.min(Math.abs(self.getVelocity()) / 320, 7)); gsap.to(loop, { timeScale: 1, duration: 1.2, overwrite: true }); },
          });
        }

        // ---------- manifesto: words light up with scroll ----------
        gsap.fromTo(q('.lp-mw'), { opacity: 0.14 }, { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: '.lp-manifesto', start: 'top 72%', end: 'bottom 58%', scrub: true } });

        // ---------- generic reveals ----------
        ScrollTrigger.batch(q('[data-r]'), {
          start: 'top 89%', once: true,
          onEnter: (batch) => gsap.fromTo(batch, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.05, ease: 'power3.out', stagger: 0.09, overwrite: true }),
        });

        // ---------- counters ----------
        gsap.utils.toArray<HTMLElement>('[data-count]', el).forEach((n) => {
          const to = Number(n.dataset.count);
          const f = fmt[(n.dataset.fmt as keyof typeof fmt) ?? 'int'];
          const o = { v: 0 };
          n.textContent = f(0);
          gsap.to(o, { v: to, duration: 2, ease: 'power2.out', onUpdate: () => { n.textContent = f(o.v); }, scrollTrigger: { trigger: n, start: 'top 92%', once: true } });
        });

        // ---------- analytics: bars + heatmap ----------
        gsap.fromTo(q('.lp-abar'), { scaleY: 0 }, { scaleY: 1, duration: 1.2, ease: 'power3.out', stagger: 0.07, scrollTrigger: { trigger: '.lp-achart', start: 'top 78%', once: true } });
        gsap.fromTo(q('.lp-hm i'), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)', stagger: { each: 0.006, from: 'random' }, scrollTrigger: { trigger: '.lp-hm', start: 'top 88%', once: true } });

        // ---------- how it works: progress line ----------
        gsap.fromTo(q('.lp-sline i'), { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.lp-slist', start: 'top 65%', end: 'bottom 70%', scrub: true } });

        // ---------- tile spotlight + magnetic buttons ----------
        gsap.utils.toArray<HTMLElement>('.lp-tile', el).forEach((t) => {
          const mv = (e: PointerEvent) => { const r = t.getBoundingClientRect(); t.style.setProperty('--mx', `${e.clientX - r.left}px`); t.style.setProperty('--my', `${e.clientY - r.top}px`); };
          t.addEventListener('pointermove', mv);
          cleanups.push(() => t.removeEventListener('pointermove', mv));
        });
        gsap.utils.toArray<HTMLElement>('.lp-magnet', el).forEach((b) => {
          const bx = gsap.quickTo(b, 'x', { duration: 0.6, ease: 'power3' });
          const by = gsap.quickTo(b, 'y', { duration: 0.6, ease: 'power3' });
          const mv = (e: PointerEvent) => { const r = b.getBoundingClientRect(); bx((e.clientX - (r.left + r.width / 2)) * 0.28); by((e.clientY - (r.top + r.height / 2)) * 0.4); };
          const lv = () => { bx(0); by(0); };
          b.addEventListener('pointermove', mv); b.addEventListener('pointerleave', lv);
          cleanups.push(() => { b.removeEventListener('pointermove', mv); b.removeEventListener('pointerleave', lv); });
        });
        gsap.fromTo(q('.lp-cta-box h2'), { yPercent: 14 }, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: '.lp-cta-box', start: 'top bottom', end: 'bottom top', scrub: true } });

        // ---------- desktop-only pinned sections ----------
        mm = gsap.matchMedia();
        mm.add('(min-width: 961px)', () => {
          const hTrack = el.querySelector<HTMLElement>('.lp-htrack');
          const hPin = el.querySelector<HTMLElement>('.lp-hpin');
          if (hTrack && hPin) {
            const dist = () => Math.max(0, hTrack.scrollWidth - window.innerWidth + 80);
            const tween = gsap.to(hTrack, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: hPin, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true } });
            gsap.utils.toArray<HTMLElement>('.lp-hcard', el).forEach((c) => {
              gsap.fromTo(c, { opacity: 0.35, scale: 0.94 }, { opacity: 1, scale: 1, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: tween, start: 'left 88%', end: 'left 52%', scrub: true } });
            });
            gsap.to(q('.lp-hbar'), { scaleX: 1, ease: 'none', scrollTrigger: { trigger: hPin, start: 'top top', end: () => `+=${dist()}`, scrub: true } });
          }
          const dash = el.querySelector<HTMLElement>('.lp-dash');
          if (dash) {
            const tl = gsap.timeline({ scrollTrigger: { trigger: dash, start: 'top top', end: '+=1500', pin: true, scrub: 0.7, anticipatePin: 1 } });
            gsap.utils.toArray<HTMLElement>('.lp-dcard', el).forEach((c, i) => {
              tl.to(c, { x: (i - 1.5) * 340, y: i % 2 ? 36 : -24, rotate: (i - 1.5) * 2.5, ease: 'power2.out', duration: 1 }, 0);
            });
            tl.fromTo(q('.lp-dash-title'), { opacity: 0.35, y: 30 }, { opacity: 1, y: 0, duration: 0.8 }, 0);
          }
        });

        document.fonts?.ready.then(() => ScrollTrigger.refresh());
      } catch (err) {
        console.error('Landing animation failed, showing static page', err);
        el.classList.add('lp-static');
      }
    }, el);

    return () => {
      cleanups.forEach((fn) => fn());
      mm?.revert();
      if (tick) gsap.ticker.remove(tick);
      lenisRef.current?.destroy();
      lenisRef.current = null;
      ctx.revert();
    };
  }, []);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.querySelector(id);
    if (!target || !lenisRef.current) return;
    e.preventDefault();
    lenisRef.current.scrollTo(target as HTMLElement, { offset: -70, duration: 1.6 });
  };

  return (
    <div className="lp" ref={root}>
      <div className="lp-bg" /><div className="lp-grid-bg" /><div className="lp-glow" /><div className="lp-progress" />

      <header className="lp-nav" aria-label="Main">
        <Link href="/" className="lp-brand"><i />{APP_NAME}</Link>
        <nav className="lp-links" aria-label="Sections">
          {[['#features', 'Features'], ['#share', 'Sharing'], ['#analytics', 'Analytics'], ['#how', 'How it works'], ['#faq', 'FAQ']].map(([h, t]) => <a key={h} href={h} onClick={(e) => go(e, h)}>{t}</a>)}
        </nav>
        <div className="lp-nav-cta"><Link className="lp-btn lp-btn-sm lp-btn-ghost" href="/login">Sign in</Link><Link className="lp-btn lp-btn-sm lp-btn-primary" href="/signup">Get started</Link></div>
      </header>

      <main>
        {/* HERO */}
        <section className="lp-hero" id="top">
          <div className="lp-orb lp-orb-a" /><div className="lp-orb lp-orb-b" />
          <div className="lp-hero-in">
            <span className="lp-tag" data-hero><b>NEW</b> Share your work without sharing your prices</span>
            <h1 className="lp-h1"><Words text="Your client work," /><br /><em><Words text="on the record." /></em></h1>
            <p className="lp-lead" data-hero>Track every project you deliver, watch your weekly and monthly progress, and share one beautiful link, with the numbers you want private left out.</p>
            <div className="lp-cta" data-hero>
              <Link className="lp-btn lp-btn-primary lp-magnet" href="/signup">Create your dashboard →</Link>
              <a className="lp-btn lp-magnet" href="#features" onClick={(e) => go(e, '#features')}>See what’s inside</a>
            </div>
            <div className="lp-note" data-hero>Sign in with Google or email · No email verification · Free to start</div>
          </div>

          <div className="lp-stage">
            <div className="lp-tilt">
              <div className="lp-glass lp-mock">
                <div className="lp-bar"><i /><i /><i /><span>Provenly.app / Freelancing Projects</span></div>
                <div className="lp-app">
                  <aside className="lp-side">
                    <div className="sw">◆ Freelancing Projects</div><div className="on">Overview</div><div>Add project</div><div>Projects</div><div>Analytics</div><div>Share</div><div>Fields</div>
                  </aside>
                  <div className="lp-main">
                    <div className="lp-kpis">
                      <div className="lp-kpi"><small>Revenue</small><strong data-count="248000" data-fmt="inr">₹2,48,000</strong><em>▲ 24%</em></div>
                      <div className="lp-kpi"><small>Delivered</small><strong data-count="18" data-fmt="int">18</strong><em>▲ 6</em></div>
                      <div className="lp-kpi"><small>Margin</small><strong data-count="72" data-fmt="pct">72%</strong><em>▲ 4%</em></div>
                    </div>
                    <div className="lp-trow hd"><span>Project</span><span>Status</span><span>Amount</span><span>Timeline</span></div>
                    {[['Aurora Interiors', 'Completed', '#34d399', '₹1,20,000', 62, 26], ['Northwind Realty', 'In progress', '#3781fc', '₹85,000', 44, 38], ['Kite & Co. Store', 'Completed', '#34d399', '₹64,500', 20, 30], ['Lumen Studio', 'Planned', '#8aa0c8', '₹52,000', 70, 22]].map(([n, s, c, a, l, w]) => (
                      <div className="lp-trow" key={String(n)}>
                        <span><span className="lp-ava">{String(n)[0]}</span>{n}</span>
                        <span><span className="lp-pillst" style={{ ['--c' as string]: String(c) }}>{s}</span></span>
                        <span>{a}</span>
                        <span className="lp-tl"><i style={{ left: `${l}%`, width: `${w}%` }} /></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lp-glass lp-float lp-f1" data-depth="1.3"><span className="ic">🔒</span><span>Amount hidden<small>for “Resume link”</small></span></div>
              <div className="lp-glass lp-float lp-f2" data-depth="0.8"><span className="ic">📈</span><span>+24% revenue<small>vs last month</small></span></div>
              <div className="lp-glass lp-float lp-f3" data-depth="1.5"><span className="ic">↗</span><span>Resume link<small>128 views · expires in 30 days</small></span></div>
              <div className="lp-glass lp-float lp-f4" data-depth="1"><span className="ic">⇪</span><span>CSV imported<small>240 projects in 3 seconds</small></span></div>
            </div>
          </div>
        </section>

        {/* MARQUEE */}
        <div className="lp-marquee" aria-hidden>
          <div className="lp-mtrack">{[...MARQUEE, ...MARQUEE, ...MARQUEE, ...MARQUEE].map((m, i) => <span key={i}>{m}</span>)}</div>
        </div>

        {/* MANIFESTO */}
        <section className="lp-manifesto" aria-labelledby="mf">
          <div className="lp-wrap">
            <div className="lp-kicker" data-r>Why {APP_NAME}</div>
            <h2 id="mf" className="lp-mtext" style={{ marginTop: 26 }}>{MANIFESTO.split(' ').map((w, i) => <span className="lp-mw" key={i}>{w}</span>)}</h2>
          </div>
        </section>

        {/* FEATURES (pinned, horizontal) */}
        <section id="features" className="lp-hpin" aria-labelledby="ft">
          <div className="lp-hhead"><div className="lp-wrap"><div className="lp-kicker">Everything inside</div><h2 id="ft" className="lp-h2">One place for the <em>whole</em> story of your work.</h2></div></div>
          <div className="lp-htrack">
            <article className="lp-glass lp-hcard"><div><span className="no">01</span><h3>Your fields, your way</h3><p>Start from a template or design your own. Text, money, dates, tags, status, ratings, images and calculated profit.</p></div>
              <div className="lp-vis"><div className="lp-chips">{['Text', 'Currency', 'Date range', 'Status', 'Tags', 'URL', 'Rating', 'Image', 'Checkbox', 'Formula'].map((c) => <span key={c} className={`lp-chip ${c === 'Formula' || c === 'Currency' ? 'hot' : ''}`}>{c}</span>)}</div></div></article>
            <article className="lp-glass lp-hcard"><div><span className="no">02</span><h3>A table that isn’t just a table</h3><p>Thumbnails, status pills, profit bars and timeline bars. Search, sort, resize, reorder and edit inline, even with thousands of rows.</p></div>
              <div className="lp-vis"><div className="lp-minitable"><div className="lp-trow hd"><span>Project</span><span>Status</span><span>Profit</span></div>{[['Aurora', '#34d399', 'Done'], ['Northwind', '#3781fc', 'Active'], ['Kite & Co.', '#34d399', 'Done']].map(([n, c, s]) => <div className="lp-trow" key={n}><span>{n}</span><span><span className="lp-pillst" style={{ ['--c' as string]: c }}>{s}</span></span><span className="lp-tl"><i style={{ left: 0, width: n === 'Aurora' ? '78%' : n === 'Northwind' ? '52%' : '64%' }} /></span></div>)}</div></div></article>
            <article className="lp-glass lp-hcard"><div><span className="no">03</span><h3>Four ways to see it</h3><p>Switch between a table, a gallery, a status board with drag and drop, and a timeline. Your choice is remembered.</p></div>
              <div className="lp-vis"><div className="lp-views">{['Table', 'Gallery', 'Board', 'Timeline'].map((v) => <div key={v}><b>{v}</b><span><i /><i /></span></div>)}</div></div></article>
            <article className="lp-glass lp-hcard"><div><span className="no">04</span><h3>Analytics that explain</h3><p>Weekly to yearly revenue, margin, average value, delivery streaks, best month and a GitHub-style heatmap, all calculated on the server.</p></div>
              <div className="lp-vis"><div className="lp-minibars">{[30, 44, 38, 62, 54, 78, 70, 92].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div></div></article>
            <article className="lp-glass lp-hcard"><div><span className="no">05</span><h3>One dashboard per client</h3><p>Keep every company or goal separate, then see everything combined on your Home page in your own base currency.</p></div>
              <div className="lp-vis"><div className="lp-stack"><div>Agency Websites</div><div>Design Work</div><div>Freelancing Projects</div></div></div></article>
            <article className="lp-glass lp-hcard"><div><span className="no">06</span><h3>Bring it in, take it out</h3><p>Import a CSV with column matching, export CSV or a clean resume-style PDF, or download your entire account as JSON.</p></div>
              <div className="lp-vis"><div className="lp-chips">{['Import CSV', 'Export CSV', 'Export PDF', 'Full JSON export', 'Duplicate dashboard'].map((c, i) => <span key={c} className={`lp-chip ${i === 0 ? 'hot' : ''}`}>{c}</span>)}</div></div></article>
          </div>
          <div className="lp-hbarwrap"><div className="lp-hbar" /></div>
        </section>

        {/* SHARING */}
        <section id="share" className="lp-sec" aria-labelledby="sh">
          <div className="lp-wrap lp-share">
            <div>
              <div className="lp-kicker" data-r>Share without oversharing</div>
              <h2 id="sh" className="lp-h2" data-r>Show the work. <em>Keep the numbers.</em></h2>
              <p className="lp-lead" data-r>Every share link has its own visible fields, password, expiry and view counter. Hide the amount, the profit or the client for one link and show them on another.</p>
              <p className="lp-lead" style={{ marginTop: 16 }} data-r>Hidden values are removed on the server before the page is built, so they never reach the browser, the page source or any chart. Try it on the right.</p>
            </div>
            <HideDemo />
          </div>
        </section>

        {/* ANALYTICS */}
        <section id="analytics" className="lp-sec" aria-labelledby="an">
          <div className="lp-wrap lp-an">
            <div>
              <div className="lp-kicker" data-r>Progress you can read</div>
              <h2 id="an" className="lp-h2" data-r>Weekly. Monthly. <em>Undeniable.</em></h2>
              <p className="lp-lead" data-r>See revenue, expenses, profit and margin move from week to week, with comparisons to the previous period, delivery streaks and your best month.</p>
              <div className="lp-counts">
                <div className="lp-count" data-r><strong data-count="1248000" data-fmt="inr">₹12,48,000</strong><span>revenue tracked across dashboards</span></div>
                <div className="lp-count" data-r><strong data-count="86" data-fmt="int">86</strong><span>projects delivered on the record</span></div>
              </div>
            </div>
            <div className="lp-glass lp-achart" data-r>
              <div className="lp-abars">{BARS.map((h, i) => <div className="lp-abar" key={i} style={{ height: `${h}%` }} />)}</div>
              <div className="lp-alabels">{MONTHS.map((m) => <span key={m}>{m}</span>)}</div>
              <div className="lp-hm" aria-hidden>{HEAT.map((l, i) => <i key={i} className={l} />)}</div>
              <div className="lp-hm-cap"><span>Delivery activity, last 6 months</span><span>less ▫ ▪ more</span></div>
            </div>
          </div>
        </section>

        {/* DASHBOARDS FAN (pinned) */}
        <section className="lp-dash" aria-labelledby="ds" id="dashboards">
          <div className="lp-dash-title"><div className="lp-kicker">Separate by design</div><h2 id="ds" className="lp-h2">Every client gets <em>its own dashboard.</em></h2><p className="lp-lead">Different fields, different projects, different share links. Nothing mixes unless you want it to.</p></div>
          <div className="lp-dcards">
            {[['◆', 'Freelancing Projects', '24 projects', '₹8.4L'], ['▤', 'Agency Websites', '17 projects', '₹5.1L'], ['◐', 'Design Work', '31 projects', '₹3.2L'], ['◈', 'Open Source', '12 repositories', '★ 2.4k']].map(([i, n, c, v]) => (
              <article className="lp-glass lp-dcard" key={n}><div><span className="ico">{i}</span><h4>{n}</h4><p>{c}</p></div><div className="st"><strong>{v}</strong><span>all time</span></div></article>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="lp-sec" aria-labelledby="hw">
          <div className="lp-wrap lp-steps">
            <div className="lp-steps-sticky">
              <div className="lp-kicker" data-r>How it works</div>
              <h2 id="hw" className="lp-h2" data-r>From first project to <em>shareable proof</em> in minutes.</h2>
              <p className="lp-lead" data-r>No setup call, no spreadsheet templates to maintain. Sign in and the first dashboard is a minute away.</p>
              <div style={{ marginTop: 34 }} data-r><Link className="lp-btn lp-btn-primary lp-magnet" href="/signup">Start free →</Link></div>
            </div>
            <div className="lp-slist">
              <div className="lp-sline"><i /></div>
              {[['1', 'Create a dashboard', 'Name it, pick a template (Freelancing, Agency, Design, Open Source or Blank) and choose the fields you track.'], ['2', 'Add your projects', 'A form is generated from your fields. Paste a URL for an instant preview, upload a thumbnail, or import a CSV.'], ['3', 'Watch the numbers build', 'Your table, board, timeline and analytics fill in automatically, with weekly and monthly progress.'], ['4', 'Share the link', 'Choose what each viewer sees, add a password or expiry, preview it, and put the link on your resume.']].map(([n, t, d]) => (
                <div className="lp-glass lp-step" key={n} data-r><span className="n">{n}</span><h3>{t}</h3><p>{d}</p></div>
              ))}
            </div>
          </div>
        </section>

        {/* BUILT FOR */}
        <section className="lp-sec" aria-labelledby="bf" id="built-for" style={{ paddingTop: 40 }}>
          <div className="lp-wrap">
            <div className="lp-kicker" data-r>Built for</div>
            <h2 id="bf" className="lp-h2" data-r>People who <em>sell their work.</em></h2>
            <div className="lp-tiles">
              {[['✦', 'Freelancers', 'Track clients, income and profit per project, and send prospects a link that proves your track record.'], ['⌘', 'Developers', 'A living portfolio with live URLs, stack tags and delivery history that beats a static résumé line.'], ['◐', 'Designers', 'Show covers and case studies in a gallery, rate your own work and keep fees private.'], ['▤', 'Agencies', 'One dashboard per client company, combined reporting on Home, and links safe to share with the client.']].map(([i, t, d]) => (
                <article className="lp-glass lp-tile" key={t} data-r><div className="ic">{i}</div><h3>{t}</h3><p>{d}</p></article>
              ))}
            </div>
          </div>
        </section>

        {/* PRIVACY */}
        <section id="privacy" className="lp-sec" aria-labelledby="pv">
          <div className="lp-wrap lp-sec-grid">
            <div>
              <div className="lp-kicker" data-r>Privacy and security</div>
              <h2 id="pv" className="lp-h2" data-r>Private by <em>construction.</em></h2>
              <p className="lp-lead" data-r>Privacy is enforced in the database and on the server, never with CSS tricks.</p>
              <div className="lp-points">
                {[['Row Level Security on every table', 'Each user can only ever read and write their own rows.'], ['Hidden fields never leave the server', 'Hidden values and anything derived from them, such as profit, are stripped before the response is built.'], ['Passwords, expiry and revoke', 'Link passwords are hashed with bcrypt, failed attempts are rate limited, and you can revoke any link instantly.'], ['Unguessable links', '192-bit random tokens, no-index by default, and a view counter that keeps only a count.']].map(([t, d]) => (
                  <div className="lp-glass lp-point" key={t} data-r><span className="ck">✓</span><div><b>{t}</b><span>{d}</span></div></div>
                ))}
              </div>
            </div>
            <div className="lp-glass lp-term" data-r>
              <div className="lp-bar"><i /><i /><i /><span>what a visitor’s browser receives</span></div>
              <pre><span className="k">GET</span> /s/9f2c…e41a  →  <span className="s">200</span>{'\n\n{\n  '}<span className="k">"project"</span>{': '}<span className="s">"Aurora Interiors"</span>{',\n  '}<span className="k">"status"</span>{': '}<span className="s">"Completed"</span>{',\n  '}<span className="k">"start"</span>{': '}<span className="s">"2026-08-01"</span>{',\n  '}<span className="k">"end"</span>{': '}<span className="s">"2026-09-10"</span>{'\n}\n\n// amount · client · profit\n// not in the response. not in the page source.'}</pre>
            </div>
          </div>
        </section>

        {/* PROFILE */}
        <section id="profile" className="lp-sec" aria-labelledby="pf">
          <div className="lp-wrap lp-prof">
            <div className="lp-glass lp-pcard" data-r>
              <div className="lp-phead"><span className="lp-pava">Y</span><div><h4>Your Name</h4><small>@yourname</small></div><div className="lp-pstat"><strong data-count="128" data-fmt="int">128</strong><small>projects delivered</small></div></div>
              <div className="lp-hm" aria-hidden style={{ marginTop: 0 }}>{HEAT.slice(0, 130).map((l, i) => <i key={i} className={l} />)}</div>
              <div className="lp-badge"><span>Provenly</span><span>128 projects delivered</span></div>
            </div>
            <div>
              <div className="lp-kicker" data-r>Public profile</div>
              <h2 id="pf" className="lp-h2" data-r>A profile worth <em>linking to.</em></h2>
              <p className="lp-lead" data-r>Publish the dashboards you choose on a page like GitHub’s: your delivery heatmap, project counts and an embeddable badge for your README or portfolio. Project details stay private.</p>
              <div style={{ marginTop: 32 }} data-r><Link className="lp-btn lp-btn-primary lp-magnet" href="/signup">Claim your profile →</Link></div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="lp-sec" aria-labelledby="fq">
          <div className="lp-wrap" style={{ textAlign: 'center' }}>
            <div className="lp-kicker" data-r>Questions</div>
            <h2 id="fq" className="lp-h2" data-r>Good to know.</h2>
            <div className="lp-faq" style={{ textAlign: 'left' }}>{FAQ.map((f) => <details key={f.q} data-r><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
          </div>
        </section>

        {/* CTA */}
        <section className="lp-cta-sec">
          <div className="lp-wrap"><div className="lp-cta-box" data-r>
            <h2>Put your best work on the record.</h2>
            <p>Create your first dashboard in a minute. Sign in with Google or email, no verification needed.</p>
            <Link className="lp-btn lp-btn-primary lp-magnet" href="/signup" style={{ height: 60, padding: '0 42px', fontSize: 17 }}>Get started free →</Link>
          </div></div>
        </section>
      </main>

      <footer className="lp-foot"><div className="lp-wrap lp-foot-in">
        <Link href="/" className="lp-brand"><i />{APP_NAME}</Link>
        <nav aria-label="Footer"><a href="#features" onClick={(e) => go(e, '#features')}>Features</a><a href="#faq" onClick={(e) => go(e, '#faq')}>FAQ</a><Link href="/login">Sign in</Link><Link href="/signup">Sign up</Link></nav>
        <span>© {new Date().getFullYear()} {APP_NAME}</span>
      </div></footer>
    </div>
  );
}
