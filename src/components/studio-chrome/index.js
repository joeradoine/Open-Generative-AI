'use client';

// IVAMIND Studio — chrome (Sidebar/TopBar/BottomBar/CommandPalette/Badge/Kbd/ProgressSegmented)
// Adapted from Claude Design components.jsx — Next.js client component with ES exports.

import React, { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const h = React.createElement;

// ─── Icons — minimal Lucide subset, stroke 1.5 ───
const Icon = ({ d, size = 14, stroke = 1.5, fill = 'none', style, children }) =>
  h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill, stroke: 'currentColor',
    strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round', style,
    'aria-hidden': 'true' }, children || h('path', { d }));

export const I = {
  search:   (p) => h(Icon, p, h('circle', { cx:11, cy:11, r:7 }), h('path', { d:'m21 21-4.3-4.3' })),
  film:     (p) => h(Icon, p, h('rect', { x:2, y:2, width:20, height:20, rx:2 }), h('path', { d:'M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5' })),
  users:    (p) => h(Icon, p, h('path', { d:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }), h('circle', { cx:9, cy:7, r:4 }), h('path', { d:'M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' })),
  mic:      (p) => h(Icon, p, h('rect', { x:9, y:2, width:6, height:12, rx:3 }), h('path', { d:'M19 10v2a7 7 0 0 1-14 0v-2M12 19v3' })),
  layers:   (p) => h(Icon, p, h('path', { d:'m12 2 10 6-10 6L2 8l10-6z' }), h('path', { d:'m2 14 10 6 10-6M2 11l10 6 10-6' })),
  grid:     (p) => h(Icon, p, h('rect', { x:3, y:3, width:7, height:7 }), h('rect', { x:14, y:3, width:7, height:7 }), h('rect', { x:14, y:14, width:7, height:7 }), h('rect', { x:3, y:14, width:7, height:7 })),
  workflow: (p) => h(Icon, p, h('rect', { x:3, y:3, width:8, height:8, rx:1 }), h('rect', { x:13, y:13, width:8, height:8, rx:1 }), h('path', { d:'M7 11v4a2 2 0 0 0 2 2h4' })),
  settings: (p) => h(Icon, p, h('circle', { cx:12, cy:12, r:3 }), h('path', { d:'M12 1v6m0 10v6m11-11h-6m-10 0H1m17.4-7.4-4.2 4.2m-6.4 6.4-4.2 4.2m14.8 0-4.2-4.2M8.8 8.8L4.6 4.6' })),
  plus:     (p) => h(Icon, p, h('path', { d:'M12 5v14M5 12h14' })),
  chevD:    (p) => h(Icon, p, h('path', { d:'m6 9 6 6 6-6' })),
  x:        (p) => h(Icon, p, h('path', { d:'M18 6 6 18M6 6l12 12' })),
  play:     (p) => h(Icon, p, h('polygon', { points:'5 3 19 12 5 21 5 3', fill:'currentColor' })),
  refresh:  (p) => h(Icon, p, h('path', { d:'M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5' })),
  home:     (p) => h(Icon, p, h('path', { d:'m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }), h('path', { d:'M9 22V12h6v10' })),
  book:     (p) => h(Icon, p, h('path', { d:'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5' })),
  dot:      (p) => h(Icon, p, h('circle', { cx:12, cy:12, r:3, fill:'currentColor' })),
  sidebar:  (p) => h(Icon, p, h('rect', { x:3, y:3, width:18, height:18, rx:2 }), h('path', { d:'M9 3v18' })),
  sparkle:  (p) => h(Icon, p, h('path', { d:'M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12' })),
  file:     (p) => h(Icon, p, h('path', { d:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }), h('path', { d:'M14 2v6h6' })),
  image:    (p) => h(Icon, p, h('rect', { x:3, y:3, width:18, height:18, rx:2 }), h('circle', { cx:9, cy:9, r:2 }), h('path', { d:'m21 15-5-5L5 21' })),
  video:    (p) => h(Icon, p, h('rect', { x:2, y:6, width:14, height:12, rx:2 }), h('path', { d:'m22 8-6 4 6 4V8z' })),
  wave:     (p) => h(Icon, p, h('path', { d:'M3 12h2M7 6v12M11 3v18M15 8v8M19 5v14M23 12h-2' })),
  more:     (p) => h(Icon, p, h('circle',{cx:5,cy:12,r:1, fill:'currentColor'}), h('circle',{cx:12,cy:12,r:1, fill:'currentColor'}), h('circle',{cx:19,cy:12,r:1, fill:'currentColor'})),
  gate:     (p) => h(Icon, p, h('rect', { x:3, y:3, width:18, height:18, rx:2 }), h('path', { d:'M9 12h6M12 9v6' })),
  mix:      (p) => h(Icon, p, h('path', { d:'M3 12h3l3-9 6 18 3-9h3' })),
  export:   (p) => h(Icon, p, h('path', { d:'M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5' })),
  run:      (p) => h(Icon, p, h('polygon', { points:'6 3 20 12 6 21 6 3', fill:'currentColor', stroke:'none' })),
};

export const PIPELINE_STEPS = [
  { key: 'script',     label: 'Script',     icon: I.file  },
  { key: 'tts',        label: 'TTS',        icon: I.mic   },
  { key: 'stt',        label: 'STT',        icon: I.wave  },
  { key: 'gate',       label: 'Gate',       icon: I.gate  },
  { key: 'storyboard', label: 'Storyboard', icon: I.layers},
  { key: 'images',     label: 'Images',     icon: I.image },
  { key: 'clips',      label: 'Clips',      icon: I.video },
  { key: 'audio-mix',  label: 'Audio Mix',  icon: I.mix   },
  { key: 'export',     label: 'Export',     icon: I.export},
];

export function Badge({ variant = 'neutral', children, icon }) {
  return h('span', { className: `badge badge-${variant}` },
    icon && h(icon, { size: 10 }),
    children);
}

export function Kbd({ children, style }) {
  return h('span', { className: 'kbd', style }, children);
}

export function ProgressSegmented({ progress, error }) {
  return h('div', { className: 'pseg' },
    PIPELINE_STEPS.map((s, i) => {
      let cls = '';
      if (error === i) cls = 'error';
      else if (i < progress) cls = 'done';
      else if (i === progress) cls = 'active';
      return h('span', { key: s.key, className: cls, title: s.label });
    }));
}

// ─── Sidebar ───
const NAV_ITEMS = [
  { key:'dashboard',    href:'/ivamind/dashboard',    label:'Dashboard',  icon:I.home,     badge:null },
  { key:'episodes',     href:'/ivamind/dashboard',    label:'Episodes',   icon:I.film,     badge:'12' },
  { key:'characters',   href:'/ivamind/characters',   label:'Characters', icon:I.users,    badge:'6' },
  { key:'storyboard',   href:'/ivamind/storyboard',   label:'Storyboard', icon:I.layers,   badge:null },
  { key:'generate',     href:'/ivamind/generate',     label:'Generate',   icon:I.sparkle,  badge:null },
  { key:'voice',        href:'/ivamind/voice',        label:'Voice',      icon:I.mic,      badge:null },
  { key:'workflow',     href:'/ivamind/workflow',     label:'Workflow',   icon:I.workflow, badge:null },
  { key:'design-system',href:'/ivamind/design-system',label:'Design System', icon:I.book,  badge:null },
];

export function Sidebar({ collapsed, onToggle, episode }) {
  const pathname = usePathname();
  const W = collapsed ? 60 : 240;
  const isActive = (href) => pathname === href || (href !== '/ivamind/dashboard' && pathname.startsWith(href));

  return h('aside', {
    className: 'col no-shrink hairline-r',
    style: { width: W, background: 'var(--bg-0)', transition: 'width .18s', height: '100vh' }
  },
    h('div', { className: 'row hairline-b no-shrink', style: { height: 48, padding: collapsed ? '0' : '0 12px', justifyContent: collapsed ? 'center' : 'flex-start', gap: 8 } },
      h('div', { style: { width: 24, height: 24, borderRadius: 6, background: 'var(--gold)', color: '#1a1200', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--f-display)', fontWeight: 700, fontSize: 13, letterSpacing:'-.01em' } }, 'IV'),
      !collapsed && h('div', { className: 'col', style: { lineHeight: 1.1 } },
        h('div', { className: 't-display t-14' }, 'IVAMIND'),
        h('div', { className: 't-mono t-11 muted' }, 'STUDIO · 1.0')),
      !collapsed && h('div', { style: { flex: 1 } }),
      !collapsed && h('button', { className: 'iconbtn', onClick: onToggle, title: 'Collapse sidebar' }, h(I.sidebar, { size: 14 }))),

    h('nav', { className: 'col gap-1', style: { padding: collapsed ? 6 : 8 } },
      NAV_ITEMS.map(n => h(Link, {
        key: n.key, href: n.href,
        style: {
          display: 'flex', alignItems: 'center',
          height: 30, padding: collapsed ? 0 : '0 10px', gap: 10,
          background: isActive(n.href) ? 'var(--bg-3)' : 'transparent',
          color: isActive(n.href) ? 'var(--text-0)' : 'var(--text-1)',
          border: '1px solid ' + (isActive(n.href) ? 'var(--border-600)' : 'transparent'),
          borderRadius: 'var(--r-2)', cursor: 'pointer',
          justifyContent: collapsed ? 'center' : 'flex-start',
          width: '100%', textAlign: 'left', textDecoration: 'none',
        }
      },
        h(n.icon, { size: 15 }),
        !collapsed && h('span', { className: 't-13', style: { fontWeight: isActive(n.href) ? 500 : 400 } }, n.label),
        !collapsed && n.badge && h('span', { className: 't-mono t-11', style: { marginLeft: 'auto', color: 'var(--text-3)' } }, n.badge)))),

    h('div', { style: { flex: 1 } }),

    !collapsed && episode && h('div', { className: 'col hairline-b hairline-t', style: { padding: '10px 12px', gap: 6, background: 'var(--bg-1)' } },
      h('div', { className: 'section-label' }, 'Active episode'),
      h('div', { className: 'row gap-2' },
        h('span', { className: 't-display t-14 gold' }, episode.num),
        h('span', { className: 't-13 truncate', style: { flex: 1 } }, episode.title)),
      h('div', { className: 'row gap-2' },
        h(Badge, { variant: episode.statusVariant, icon: I.dot }, episode.status),
        h('span', { className: 't-mono t-11 muted' }, episode.progress + '/9'))),

    h('div', { className: 'row hairline-t no-shrink', style: { height: 40, padding: collapsed ? 0 : '0 12px', gap: 8, justifyContent: collapsed ? 'center' : 'flex-start' } },
      h('div', { style: { width: 22, height: 22, borderRadius: 999, background: 'var(--bg-4)', border: '1px solid var(--border-500)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 } }, 'JR'),
      !collapsed && h('div', { className: 'col grow', style: { lineHeight: 1.15 } },
        h('div', { className: 't-12' }, 'Joe Radoine'),
        h('div', { className: 't-11 muted t-mono' }, 'solo · byok')),
      !collapsed && h(Link, { href: '/studio/byok-settings', className: 'iconbtn' }, h(I.settings, { size: 13 }))),
  );
}

// ─── TopBar ───
export function TopBar({ breadcrumbs = [], onCmdK, right }) {
  return h('header', {
    className: 'row no-shrink hairline-b',
    style: { height: 48, padding: '0 16px', gap: 16, background: 'var(--bg-0)' }
  },
    h('div', { className: 'row gap-2 grow', style: { minWidth: 0 } },
      breadcrumbs.map((b, i) => h(Fragment, { key: i },
        i > 0 && h('span', { className: 't-12 muted-2' }, '/'),
        h('span', { className: 't-13 ' + (i === breadcrumbs.length - 1 ? '' : 'muted') }, b))),
    ),

    h('button', {
      onClick: onCmdK,
      className: 'row no-shrink',
      style: {
        height: 28, width: 300, padding: '0 10px', gap: 8,
        background: 'var(--bg-2)', border: '1px solid var(--border-600)',
        borderRadius: 'var(--r-2)', color: 'var(--text-3)',
        cursor: 'pointer', alignItems: 'center',
      }
    },
      h(I.search, { size: 13 }),
      h('span', { className: 't-12 grow', style: { textAlign:'left' } }, 'Search, run, jump to…'),
      h(Kbd, null, '⌘K')),

    right || h('div', { className: 'row gap-2 no-shrink' },
      h('button', { className: 'iconbtn' }, h(I.refresh, { size: 13 })),
      h('button', { className: 'btn btn-secondary btn-sm' }, h(I.plus, { size: 12 }), 'New episode')));
}

// ─── BottomBar ───
export function BottomBar({ jobs = [], budget }) {
  return h('footer', {
    className: 'row no-shrink hairline-t t-mono t-11',
    style: { height: 30, padding: '0 12px', gap: 16, background: 'var(--bg-1)', color: 'var(--text-2)' }
  },
    h('div', { className: 'row gap-4' },
      h('span', { className: 'row gap-2' }, h('span', { className: 'dot dot-green' }), jobs.length + ' running'),
      jobs.slice(0, 2).map((j, i) => h('span', { key: i, className: 'row gap-2' },
        h('span', { style: { color: 'var(--text-3)' } }, '·'),
        h('span', null, j.name),
        h('span', { style: { color: 'var(--gold)' } }, j.progress + '%')))),

    h('div', { style: { flex: 1 } }),

    budget && h('div', { className: 'row gap-4' },
      h('span', { className: 'row gap-2' },
        h('span', { style: { color: 'var(--text-3)' } }, 'today'),
        h('span', { style: { color: 'var(--text-0)' } }, '$' + budget.today.toFixed(2))),
      h('span', { className: 'row gap-2' },
        h('span', { style: { color: 'var(--text-3)' } }, 'kling'),
        h('span', { style: { color: 'var(--gold)' } }, budget.kling + ' u')),
      h('span', { className: 'row gap-2' },
        h('span', { style: { color: 'var(--text-3)' } }, 'budget'),
        h('span', null, '$' + budget.month + '/' + budget.budget),
        h('span', { style: { width: 60, height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' } },
          h('span', { style: { display: 'block', width: (budget.month/budget.budget*100)+'%', height: '100%', background: 'var(--gold)' } }))),
      h('span', { className: 'row gap-2' }, h('span', { className: 'dot dot-gold' }), 'byok · ready')),
  );
}

// ─── CommandPalette (overlay Cmd+K) ───
export function CommandPalette({ open, onClose }) {
  const [q, setQ] = useState('');
  const router = useRouter();
  const groups = [
    { label: 'Jump to', items: [
      { icon: I.home,   name: 'Dashboard · all episodes',           href: '/ivamind/dashboard' },
      { icon: I.users,  name: 'Characters · 6 bible-locked',        href: '/ivamind/characters' },
      { icon: I.mic,    name: 'Voice Studio · active episode',      href: '/ivamind/voice' },
      { icon: I.grid,   name: 'Generation Grid · current shot',     href: '/ivamind/generate' },
      { icon: I.workflow, name: 'Workflow · default pipeline',       href: '/ivamind/workflow' },
      { icon: I.settings, name: 'BYOK Settings · 6 providers',       href: '/studio/byok-settings' },
    ]},
    { label: 'Run', items: [
      { icon: I.run,    name: 'Run full pipeline · EP-03 Tawakkul', shortcut: ['⌘','⏎'] },
      { icon: I.image,  name: 'Regenerate shot · batch 9 variants', shortcut: ['⌘','R'] },
      { icon: I.export, name: 'Export master · 1080×1920 TikTok',   shortcut: ['⌘','E'] },
    ]},
    { label: 'Create', items: [
      { icon: I.plus, name: 'New episode from IVAMIND template', shortcut: ['N','E'] },
      { icon: I.plus, name: 'New character ref · upload',        shortcut: ['N','C'] },
    ]},
  ];

  const filtered = groups.map(g => ({ ...g, items: g.items.filter(i => i.name.toLowerCase().includes(q.toLowerCase())) })).filter(g => g.items.length);

  useEffect(() => {
    if (!open) return;
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [open, onClose]);

  if (!open) return null;

  const navigate = (item) => {
    if (item.href) { router.push(item.href); onClose(); }
  };

  return h('div', {
    style: {
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(10,10,18,.72)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', justifyContent: 'center', paddingTop: 120
    },
    onClick: onClose
  },
    h('div', {
      onClick: e => e.stopPropagation(),
      className: 'col',
      style: {
        width: 620, maxHeight: 480,
        background: 'var(--bg-1)',
        border: '1px solid var(--border-500)',
        borderRadius: 'var(--r-4)', overflow: 'hidden'
      }
    },
      h('div', { className: 'row hairline-b', style: { height: 44, padding: '0 14px', gap: 10 } },
        h(I.search, { size: 15, style: { color: 'var(--text-2)' } }),
        h('input', {
          autoFocus: true, value: q, onChange: e => setQ(e.target.value),
          placeholder: 'Search actions, episodes, characters…',
          style: { background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-0)', flex: 1 }
        }),
        h(Kbd, null, 'esc')),
      h('div', { className: 'col', style: { overflow: 'auto', padding: '6px 0' } },
        filtered.map((g, gi) => h('div', { key: gi, className: 'col' },
          h('div', { className: 'section-label', style: { padding: '8px 14px 4px' } }, g.label),
          g.items.map((it, ii) => h('div', { key: ii,
            onClick: () => navigate(it),
            className: 'row gap-3',
            style: { height: 34, padding: '0 14px', cursor: 'pointer', background: gi===0 && ii===0 ? 'var(--bg-3)' : 'transparent' }
          },
            h(it.icon, { size: 14, style: { color: 'var(--text-2)' } }),
            h('span', { className: 't-13 grow' }, it.name),
            it.shortcut && h('div', { className: 'row gap-1' }, it.shortcut.map((k, ki) => h(Kbd, { key: ki }, k))))))
        )),
      h('div', { className: 'row hairline-t t-11 muted', style: { height: 28, padding: '0 14px', gap: 12 } },
        h('span', { className: 'row gap-1' }, h(Kbd, null, '↵'), 'open'),
        h('span', { className: 'row gap-1' }, h(Kbd, null, '↑'), h(Kbd, null, '↓'), 'navigate'),
        h('span', { className: 'row gap-1' }, h(Kbd, null, '⌘K'), 'dismiss'),
        h('div', { style: { flex: 1 } }),
        h('span', { className: 't-mono' }, filtered.reduce((a,g) => a+g.items.length, 0) + ' results')
      )));
}

// ─── IVAMIND chrome layout wrapper ───
export function IvamindChrome({ children, breadcrumbs = ['IVAMIND', 'Dashboard'], episode, jobs = [], budget }) {
  const [collapsed, setCollapsed] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);

  useEffect(() => {
    const k = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdkOpen((o) => !o); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); setCollapsed((c) => !c); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);

  return h('div', { className: 'iv' },
    h('div', { className: 'row', style: { height: '100vh', width: '100vw', overflow: 'hidden' } },
      h(Sidebar, { collapsed, onToggle: () => setCollapsed((c) => !c), episode }),
      h('div', { className: 'col grow', style: { minWidth: 0, height: '100vh' } },
        h(TopBar, { breadcrumbs, onCmdK: () => setCmdkOpen(true) }),
        h('main', { className: 'grow', style: { overflow: 'auto', background: 'var(--bg-0)', minHeight: 0 } }, children),
        h(BottomBar, { jobs, budget }))),
    h(CommandPalette, { open: cmdkOpen, onClose: () => setCmdkOpen(false) }));
}
