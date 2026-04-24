'use client';

import { useState } from 'react';
import Link from 'next/link';
import { EPISODES, CHARACTERS, CHAR_BY_ID } from '@/src/data/ivamind-mock';
import { Badge, ProgressSegmented, I } from '@/src/components/studio-chrome';

const STATUS_FILTERS = ['All', 'Delivered', 'Voice', 'Storyboard', 'Script', 'Draft', 'Backlog'];

const KPIS = (eps) => {
  const delivered = eps.filter(e => e.status === 'Delivered');
  const totalDurationSec = delivered.reduce((a, e) => {
    const [m, s] = e.dur.split(':').map(Number);
    return a + (m * 60 + s);
  }, 0);
  const min = Math.floor(totalDurationSec / 60);
  const sec = totalDurationSec % 60;
  return {
    episodes: eps.length,
    delivered: delivered.length,
    runtime: `${min}m ${String(sec).padStart(2,'0')}s`,
    shots: eps.reduce((a, e) => a + e.shots, 0),
    costUSD: eps.reduce((a, e) => a + e.costUSD, 0).toFixed(2),
    kling: eps.reduce((a, e) => a + e.costKling, 0),
  };
};

export default function DashboardPage() {
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(EPISODES.find(e => e.active) || EPISODES[0]);
  const filtered = filter === 'All' ? EPISODES : EPISODES.filter(e => e.status === filter);
  const kpis = KPIS(EPISODES);

  return (
    <div className="col" style={{ padding: 0, minHeight: '100%' }}>
      {/* Sub-header : season context + KPIs */}
      <div className="col hairline-b" style={{ padding: '16px 24px 20px', gap: 12, background: 'var(--bg-0)' }}>
        <div className="row gap-3">
          <span className="section-label gold">Season 1 · In production</span>
          <span className="muted-2">·</span>
          <span className="t-12 muted">Kronos Infinity × IVAMIND</span>
        </div>
        <h1 className="t-24" style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>Série TikTok — manga islam contemporain</h1>

        <div className="row gap-6" style={{ marginTop: 8 }}>
          <KpiBlock label="Episodes" value={kpis.episodes} sub={`${kpis.delivered} delivered`} />
          <KpiBlock label="Runtime" value={kpis.runtime} sub="delivered only" />
          <KpiBlock label="Shots" value={kpis.shots.toLocaleString()} sub="total planned" />
          <KpiBlock label="Spend" value={`$${kpis.costUSD}`} sub="LLM + API" />
          <KpiBlock label="Kling" value={`${kpis.kling} u`} sub="Omni + basic v3" />
        </div>
      </div>

      {/* Toolbar : filter pills + sort + CTA */}
      <div className="row hairline-b" style={{ padding: '10px 24px', gap: 10, background: 'var(--bg-0)' }}>
        <div className="row gap-2">
          {STATUS_FILTERS.map(f =>
            <button key={f}
              className={`pill ${filter === f ? 'active-gold' : ''}`}
              onClick={() => setFilter(f)}
            >{f}<span className="count">{f === 'All' ? EPISODES.length : EPISODES.filter(e => e.status === f).length}</span></button>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <span className="t-mono t-11 muted-2">{filtered.length} / {EPISODES.length} episodes</span>
        <button className="btn btn-secondary btn-sm"><I.plus size={12} />Season</button>
        <button className="btn btn-primary btn-sm"><I.plus size={12} />New Episode</button>
      </div>

      {/* Main split : table (left) + inspector (right) */}
      <div className="row grow" style={{ minHeight: 0, overflow: 'hidden' }}>
        {/* Episodes table */}
        <div className="col grow" style={{ padding: '0 24px 24px', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr className="t-11 muted-2" style={{ letterSpacing: '.05em', textTransform: 'uppercase' }}>
                <th style={thStyle('left', 74)}>Episode</th>
                <th style={thStyle('left', 180)}>Title</th>
                <th style={thStyle('left', 100)}>Characters</th>
                <th style={thStyle('left', 100)}>Status</th>
                <th style={thStyle('left', 160)}>Pipeline</th>
                <th style={thStyle('right', 60)}>Shots</th>
                <th style={thStyle('right', 60)}>Dur.</th>
                <th style={thStyle('right', 60)}>Cost</th>
                <th style={thStyle('right', 80)}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ep =>
                <tr key={ep.num}
                  onClick={() => setSelected(ep)}
                  className="card-hov"
                  style={{
                    cursor: 'pointer',
                    background: selected.num === ep.num ? 'var(--bg-3)' : 'transparent',
                    borderBottom: '1px solid var(--border-700)',
                  }}>
                  <td style={{ padding: '10px 8px' }}>
                    <span className="t-display t-13 gold">{ep.num}</span>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <div className="col" style={{ gap: 2 }}>
                      <span className="t-13 truncate" style={{ maxWidth: 260 }}>{ep.title}</span>
                      {ep.running && <span className="t-11 muted row gap-1"><span className="dot dot-gold" /> generating</span>}
                    </div>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <CharactersAvatars ids={ep.char} />
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <Badge variant={ep.statusVariant} icon={I.dot}>{ep.status}</Badge>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <ProgressSegmented progress={ep.progress} />
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}><span className="t-mono t-12">{ep.shots}</span></td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}><span className="t-mono t-12 muted">{ep.dur}</span></td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <span className="t-mono t-12">{ep.costUSD > 0 ? `$${ep.costUSD}` : '—'}</span>
                    {ep.costKling > 0 && <div className="t-mono t-11 muted-2">{ep.costKling}u</div>}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <span className="t-mono t-11 muted">{ep.updated}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right inspector — selected episode */}
        <aside className="col hairline-l no-shrink" style={{ width: 320, background: 'var(--bg-1)', overflow: 'auto' }}>
          {/* Preview */}
          <div className="col hairline-b" style={{ padding: '14px 16px', gap: 8 }}>
            <div className="section-label">Selected episode</div>
            <div className="row gap-2">
              <span className="t-display t-16 gold">{selected.num}</span>
              <span className="t-14" style={{ fontWeight: 500 }}>{selected.title}</span>
            </div>
            <div className="row gap-2">
              <Badge variant={selected.statusVariant} icon={I.dot}>{selected.status}</Badge>
              <span className="t-mono t-11 muted">{selected.progress}/9</span>
              <span className="t-mono t-11 muted-2">·</span>
              <span className="t-11 muted">{selected.updated}</span>
            </div>
          </div>

          <div className="col hairline-b" style={{ padding: '14px 16px', gap: 10 }}>
            <div className="section-label">Preview thumbnail</div>
            <div className="ph-stripe gold" style={{ aspectRatio: '9/16', borderRadius: 'var(--r-3)' }}>
              {selected.dur !== '—' ? (
                <div className="col gap-1" style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <I.play size={24} />
                  <span className="t-mono t-11">{selected.dur}</span>
                </div>
              ) : <span>pending</span>}
            </div>
          </div>

          {/* Pipeline status */}
          <div className="col hairline-b" style={{ padding: '14px 16px', gap: 8 }}>
            <div className="section-label">Pipeline status</div>
            {['Script', 'TTS Fish', 'STT ElevenLabs', 'Gate', 'Storyboard', 'Images Gemini', 'Clips Kling', 'Audio Mix', 'Export'].map((step, i) => {
              const done = i < selected.progress;
              const active = i === selected.progress;
              return (
                <div key={step} className="row gap-2 t-12">
                  <span style={{
                    width: 14, height: 14, borderRadius: 999,
                    background: done ? 'var(--gold)' : active ? 'var(--gold-ghost)' : 'var(--bg-3)',
                    border: '1px solid ' + (done ? 'var(--gold)' : active ? 'var(--gold)' : 'var(--border-600)'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#1a1200', fontSize: 9, fontWeight: 600,
                  }}>{done ? '✓' : ''}</span>
                  <span className={done ? '' : active ? 'gold' : 'muted-2'} style={{ flex: 1 }}>{step}</span>
                  <span className="t-mono t-11 muted-2">{done ? 'done' : active ? 'active' : 'pending'}</span>
                </div>
              );
            })}
          </div>

          {/* Characters */}
          <div className="col hairline-b" style={{ padding: '14px 16px', gap: 8 }}>
            <div className="section-label">Cast ({selected.char.length})</div>
            {selected.char.map(id => {
              const c = CHAR_BY_ID[id]; if (!c) return null;
              return (
                <div key={id} className="row gap-2 t-12">
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: `hsl(${c.hue}, 32%, 28%)`,
                    color: '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 600, fontSize: 10,
                  }}>{c.name[0]}</span>
                  <div className="col" style={{ lineHeight: 1.1 }}>
                    <span className="t-12">{c.name}</span>
                    <span className="t-11 muted-2">{c.role}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="col" style={{ padding: '14px 16px', gap: 6 }}>
            <Link href={`/ivamind/storyboard?ep=${selected.num}`} className="btn btn-primary" style={{ justifyContent: 'center', textDecoration: 'none' }}>
              <I.layers size={12} />Open storyboard
            </Link>
            <Link href={`/ivamind/voice?ep=${selected.num}`} className="btn btn-secondary" style={{ justifyContent: 'center', textDecoration: 'none' }}>
              <I.mic size={12} />Voice studio
            </Link>
            <Link href={`/ivamind/workflow?ep=${selected.num}`} className="btn btn-ghost" style={{ justifyContent: 'center', textDecoration: 'none' }}>
              <I.workflow size={12} />Pipeline
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Small subcomponents ───
function KpiBlock({ label, value, sub }) {
  return (
    <div className="col" style={{ gap: 2 }}>
      <div className="t-11 muted-2" style={{ textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div className="t-display t-20 gold">{value}</div>
      {sub && <div className="t-11 muted-2 t-mono">{sub}</div>}
    </div>
  );
}

function CharactersAvatars({ ids }) {
  if (!ids?.length) return <span className="t-mono t-11 muted-2">—</span>;
  return (
    <div className="row" style={{ gap: -4 }}>
      {ids.slice(0, 4).map((id, i) => {
        const c = CHAR_BY_ID[id]; if (!c) return null;
        return (
          <span key={id} title={c.name} style={{
            width: 22, height: 22, borderRadius: '50%',
            background: `hsl(${c.hue}, 32%, 28%)`,
            color: '#fff',
            border: '1px solid var(--bg-0)',
            marginLeft: i === 0 ? 0 : -6,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 600, fontSize: 10,
          }}>{c.name[0]}</span>
        );
      })}
      {ids.length > 4 && <span className="t-mono t-11 muted-2" style={{ marginLeft: 4 }}>+{ids.length - 4}</span>}
    </div>
  );
}

const thStyle = (align, width) => ({
  padding: '10px 8px',
  textAlign: align,
  fontWeight: 500,
  fontSize: 10,
  borderBottom: '1px solid var(--border-700)',
  width,
});
