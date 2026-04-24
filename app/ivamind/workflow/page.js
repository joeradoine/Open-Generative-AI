'use client';

import { useState } from 'react';
import { Badge, I, Kbd } from '@/src/components/studio-chrome';

// IVAMIND Pipeline V7 — 9 nodes wired
const NODES = [
  { id:'script',   label:'Script',       provider:'LLM',          status:'done',    progress:100, cost:'$0.05', x:60,  y:60,  icon:I.file   },
  { id:'tts',      label:'TTS',          provider:'Fish S1',      status:'done',    progress:100, cost:'1.2 K chars', x:240, y:60,  icon:I.mic    },
  { id:'stt',      label:'STT',          provider:'Elevenlabs v2',status:'done',    progress:100, cost:'2 credits',   x:420, y:60,  icon:I.wave   },
  { id:'gate',     label:'Match Gate',   provider:'99% threshold',status:'done',    progress:100, cost:'—',           x:600, y:60,  icon:I.gate   },
  { id:'storyboard',label:'Storyboard',   provider:'Shot planner',status:'active',  progress:64,  cost:'—',           x:240, y:220, icon:I.layers },
  { id:'images',   label:'Images',       provider:'Gemini i2i',   status:'queued',  progress:0,   cost:'12 credits',  x:420, y:220, icon:I.image  },
  { id:'clips',    label:'Clips',        provider:'Kling v3-omni',status:'queued',  progress:0,   cost:'— u',         x:600, y:220, icon:I.video  },
  { id:'mix',      label:'Audio Mix',    provider:'ISLA + SFX',   status:'idle',    progress:0,   cost:'—',           x:420, y:380, icon:I.mix    },
  { id:'export',   label:'Export',       provider:'Remotion H264',status:'idle',    progress:0,   cost:'—',           x:600, y:380, icon:I.export },
];

const EDGES = [
  ['script','tts'], ['tts','stt'], ['stt','gate'],
  ['gate','storyboard'],
  ['storyboard','images'], ['storyboard','clips'],
  ['images','mix'], ['clips','mix'],
  ['mix','export'],
];

const RUN_HISTORY = [
  { v:'v-0007', label:'EP-02 final render — Delivered', status:'done', ago:'2 d' },
  { v:'v-0006', label:'EP-02 regen p09 Issa — flagship thumbnail', status:'done', ago:'2 d' },
  { v:'v-0005', label:'EP-02 STT scribe v2 + patch Zahied→Zayed', status:'done', ago:'3 d' },
  { v:'v-0004', label:'EP-02 Fish TTS Le Narrateur 1.18×', status:'done', ago:'3 d' },
  { v:'v-0003', label:'S1E1 Kling batch 38u delivered', status:'done', ago:'1 w' },
  { v:'v-0002', label:'S1E1 script + audio locked', status:'done', ago:'1 w' },
  { v:'v-0001', label:'Pipeline V7 initial setup', status:'done', ago:'2 w' },
];

const STATUS_COLORS = {
  done:    { bg:'var(--green-ghost)', border:'rgba(61,214,140,.45)', text:'#6dfbb5' },
  active:  { bg:'var(--gold-ghost)',  border:'rgba(249,178,51,.5)',  text:'var(--gold-hi)' },
  queued:  { bg:'var(--bg-3)',        border:'var(--border-500)',    text:'var(--text-1)' },
  idle:    { bg:'var(--bg-2)',        border:'var(--border-700)',    text:'var(--text-2)' },
  failed:  { bg:'var(--red-ghost)',   border:'rgba(229,72,77,.5)',   text:'#ff8a8e' },
};

export default function WorkflowPage() {
  const [selectedNode, setSelectedNode] = useState('storyboard');
  const selected = NODES.find(n => n.id === selectedNode);

  const canvasW = 900, canvasH = 520;

  return (
    <div className="col" style={{ minHeight: '100%' }}>
      {/* Sub-header : run context */}
      <div className="col hairline-b" style={{ padding: '14px 24px 12px', gap: 10, background: 'var(--bg-0)' }}>
        <div className="row gap-3">
          <span className="section-label gold">Workflow orchestration</span>
          <span className="muted-2">·</span>
          <span className="t-12 muted">IVAMIND Pipeline V7 · 9 nodes wired</span>
        </div>

        <div className="row gap-3">
          <span className="t-display t-14 gold">EP-03</span>
          <span className="t-14" style={{ fontWeight: 500 }}>Tawakkul — le jour où j'ai lâché</span>
          <span className="muted-2">·</span>
          <Badge variant="gold" icon={I.dot}>Run #0008 · 42%</Badge>

          <div style={{ flex: 1 }} />

          <div className="tabs">
            <button className="active">Graph</button>
            <button>Runs</button>
            <button>Schedule</button>
            <button>Hooks</button>
          </div>

          <button className="btn btn-secondary btn-sm"><I.refresh size={11} />Re-run failed</button>
          <button className="btn btn-primary"><I.run size={12} />Run all<Kbd>⌘↵</Kbd></button>
        </div>
      </div>

      {/* Canvas + right panel */}
      <div className="row grow" style={{ minHeight: 0, overflow: 'hidden' }}>
        {/* Canvas */}
        <div className="col grow bg-dots" style={{ minWidth: 0, overflow: 'auto', position: 'relative' }}>
          <svg width={canvasW} height={canvasH} style={{ display: 'block', margin: 24 }}>
            {/* Edges */}
            {EDGES.map(([fromId, toId]) => {
              const from = NODES.find(n => n.id === fromId);
              const to = NODES.find(n => n.id === toId);
              if (!from || !to) return null;
              const fx = from.x + 140, fy = from.y + 46;
              const tx = to.x, ty = to.y + 46;
              const mx = (fx + tx) / 2;
              const fromDone = from.status === 'done';
              const toActive = to.status === 'active' || to.status === 'queued';
              const color = fromDone && toActive ? 'var(--gold)' : fromDone ? 'var(--green)' : 'var(--border-500)';
              return (
                <g key={`${fromId}-${toId}`}>
                  <path
                    d={`M ${fx} ${fy} C ${mx} ${fy}, ${mx} ${ty}, ${tx} ${ty}`}
                    fill="none" stroke={color} strokeWidth={1.5}
                    strokeDasharray={fromDone && toActive ? '4 4' : 'none'}
                    opacity={0.85}
                  />
                  <polygon
                    points={`${tx - 6},${ty - 4} ${tx},${ty} ${tx - 6},${ty + 4}`}
                    fill={color}
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {NODES.map(n => {
              const cs = STATUS_COLORS[n.status];
              const isSelected = selectedNode === n.id;
              return (
                <g key={n.id}
                  transform={`translate(${n.x}, ${n.y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedNode(n.id)}>
                  <rect
                    width={140} height={92}
                    rx={8}
                    fill={cs.bg}
                    stroke={isSelected ? 'var(--gold)' : cs.border}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                  {/* Title row */}
                  <foreignObject x={0} y={0} width={140} height={92}>
                    <div className="col" style={{ padding: '10px 12px', gap: 6, height: '100%', fontFamily: 'var(--f-sans)' }}>
                      <div className="row gap-2" style={{ color: cs.text }}>
                        {n.icon && <n.icon size={13} />}
                        <span className="t-13" style={{ fontWeight: 600 }}>{n.label}</span>
                      </div>
                      <div className="t-11 muted-2" style={{ lineHeight: 1.2 }}>{n.provider}</div>
                      {n.status === 'active' && (
                        <div className="row gap-2" style={{ marginTop: 'auto' }}>
                          <div style={{ flex: 1, height: 3, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${n.progress}%`, height: '100%', background: 'var(--gold)' }} />
                          </div>
                          <span className="t-mono t-11" style={{ color: cs.text }}>{n.progress}%</span>
                        </div>
                      )}
                      {n.status === 'done' && (
                        <div className="row gap-2" style={{ marginTop: 'auto' }}>
                          <span style={{ color: cs.text, fontSize: 11 }}>✓ done</span>
                          <span className="t-mono t-11 muted-2">{n.cost}</span>
                        </div>
                      )}
                      {(n.status === 'queued' || n.status === 'idle') && (
                        <div className="row" style={{ marginTop: 'auto' }}>
                          <span className="t-11 muted-2">{n.status}</span>
                        </div>
                      )}
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right panel : inspector + run history */}
        <aside className="col hairline-l no-shrink" style={{ width: 320, background: 'var(--bg-1)', overflow: 'auto' }}>
          {/* Inspector */}
          <div className="col hairline-b" style={{ padding: 14, gap: 10 }}>
            <span className="section-label">Node inspector</span>
            <div className="row gap-2">
              {selected.icon && <selected.icon size={16} />}
              <span className="t-display t-16 gold">{selected.label}</span>
            </div>
            <span className="t-12 muted">{selected.provider}</span>

            <div className="col gap-2" style={{ marginTop: 6 }}>
              <KV k="Status" v={<Badge variant={selected.status === 'done' ? 'green' : selected.status === 'active' ? 'gold' : 'neutral'} icon={I.dot}>{selected.status}</Badge>} />
              <KV k="Progress" v={`${selected.progress}%`} mono />
              <KV k="Cost" v={selected.cost} mono />
            </div>

            <div className="row gap-2" style={{ marginTop: 6 }}>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                <I.refresh size={11} />Retry
              </button>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                <I.run size={11} />Run from
              </button>
            </div>
          </div>

          {/* Run history */}
          <div className="col hairline-b" style={{ padding: 14, gap: 8 }}>
            <span className="section-label">Run history</span>
            {RUN_HISTORY.map(r => (
              <div key={r.v} className="row gap-2" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-700)' }}>
                <span className="dot dot-green" />
                <div className="col grow" style={{ lineHeight: 1.15 }}>
                  <span className="t-12 truncate">{r.label}</span>
                  <span className="t-mono t-11 muted-2">{r.v} · {r.ago}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Triggers */}
          <div className="col" style={{ padding: 14, gap: 6 }}>
            <span className="section-label">Triggers</span>
            <button className="btn btn-primary btn-sm" style={{ justifyContent: 'center' }}>
              <I.run size={12} />Run full pipeline
            </button>
            <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'center' }}>
              <I.refresh size={12} />Re-run from Storyboard
            </button>
            <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'center' }}>
              <I.image size={12} />Regenerate Images only
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function KV({ k, v, mono }) {
  return (
    <div className="row gap-2 t-12">
      <span className="muted-2" style={{ width: 70 }}>{k}</span>
      <span className={mono ? 't-mono' : ''} style={{ flex: 1 }}>{v}</span>
    </div>
  );
}
