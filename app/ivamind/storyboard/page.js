'use client';

import { useState } from 'react';
import { Badge, I, Kbd } from '@/src/components/studio-chrome';
import { EP02_STORYBOARD, CHAR_BY_ID } from '@/src/data/ivamind-mock';

export default function StoryboardPage() {
  const sb = EP02_STORYBOARD;
  const [selected, setSelected] = useState(sb.panels[6]); // Issa sait (flagship panel)

  const totalDur = sb.panels.reduce((a, p) => a + p.dur, 0).toFixed(1);

  return (
    <div className="col" style={{ minHeight: '100%' }}>
      {/* Sub-header : scene context */}
      <div className="col hairline-b" style={{ padding: '14px 24px 12px', gap: 10, background: 'var(--bg-0)' }}>
        <div className="row gap-3">
          <span className="section-label gold">Storyboard editor</span>
          <span className="muted-2">·</span>
          <span className="t-12 muted">Flagship EP-02 reference · base à améliorer</span>
        </div>

        <div className="row gap-3">
          <span className="t-display t-14 gold">{sb.ep}</span>
          <span className="t-14" style={{ fontWeight: 500 }}>{sb.title}</span>
          <span className="muted-2">·</span>
          <span className="t-13 muted">{sb.scene.name}</span>

          <div style={{ flex: 1 }} />

          <Badge variant="gold" icon={I.dot}>Flagship</Badge>
          <Badge variant="neutral">Locked {sb.version}</Badge>
          <span className="t-mono t-11 muted">{sb.panels.length} panels · {totalDur}s</span>

          <div className="tabs">
            <button className="active">Panels</button>
            <button>Script</button>
            <button>Timeline</button>
            <button>Animatic</button>
          </div>
        </div>

        <div className="row gap-2">
          <div className="card" style={{ padding: '10px 12px', flex: 1, background: 'var(--bg-1)' }}>
            <span className="t-12" style={{ lineHeight: 1.6 }}>
              <span className="t-mono t-11 muted-2" style={{ marginRight: 8 }}>SCRIPT · narrator whisper</span>
              {sb.script}
            </span>
          </div>
        </div>

        <StoryboardGuide />
      </div>

      {/* 2 columns : panel grid (left) + inspector (right) */}
      <div className="row grow" style={{ minHeight: 0, overflow: 'hidden' }}>
        {/* Grid of panels */}
        <div className="col grow" style={{ minWidth: 0, padding: '18px 24px', overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {sb.panels.map((p, i) => (
              <PanelCard key={p.id} panel={p} index={i}
                selected={selected.id === p.id}
                onClick={() => setSelected(p)} />
            ))}
          </div>

          {/* Timeline ribbon */}
          <div className="col hairline-t" style={{ marginTop: 20, paddingTop: 14, gap: 8 }}>
            <div className="row gap-2">
              <span className="section-label">Timeline</span>
              <div style={{ flex: 1 }} />
              <span className="t-mono t-11 muted-2">steps 1f · zoom 1x</span>
            </div>
            <div className="row" style={{ gap: 2, height: 44, background: 'var(--bg-2)', borderRadius: 'var(--r-2)', overflow: 'hidden', border: '1px solid var(--border-700)' }}>
              {sb.panels.map((p, i) => {
                const pct = (p.dur / totalDur) * 100;
                return (
                  <div key={p.id}
                    onClick={() => setSelected(p)}
                    style={{
                      width: `${pct}%`, minWidth: 40,
                      background: selected.id === p.id ? 'var(--gold-ghost)' : 'var(--bg-3)',
                      borderRight: '1px solid var(--border-700)',
                      padding: '4px 6px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    }}>
                    <span className="t-mono t-11" style={{ color: selected.id === p.id ? 'var(--gold)' : 'var(--text-2)' }}>{i + 1}</span>
                    <span className="t-mono t-11 muted-2">{p.dur}s</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shortcuts */}
          <div className="row gap-3 t-11 muted-2" style={{ marginTop: 12 }}>
            <span><Kbd>↑↓←→</Kbd> navigate</span>
            <span><Kbd>Space</Kbd> preview</span>
            <span><Kbd>R</Kbd> regen panel</span>
            <span><Kbd>L</Kbd> lock/unlock</span>
            <span><Kbd>N</Kbd> new panel</span>
          </div>
        </div>

        {/* Right inspector */}
        <aside className="col hairline-l no-shrink" style={{ width: 340, background: 'var(--bg-1)', overflow: 'auto' }}>
          <div className="col hairline-b" style={{ padding: 14, gap: 6 }}>
            <span className="section-label">Panel · inspector</span>
            <div className="row gap-2">
              <span className="t-display t-14 gold">#{sb.panels.findIndex(p => p.id === selected.id) + 1}</span>
              <span className="t-14" style={{ fontWeight: 500 }}>{selected.title}</span>
            </div>
            <span className="t-12 muted">{selected.note}</span>
          </div>

          {/* Preview */}
          <div className="col hairline-b" style={{ padding: 14, gap: 10 }}>
            <div className="row gap-2">
              <span className="section-label">Preview</span>
              <div style={{ flex: 1 }} />
              <Badge variant={selected.status === 'locked' ? 'gold' : 'neutral'}>{selected.status}</Badge>
            </div>
            {selected.image ? (
              <img src={selected.image} alt={selected.title} style={{
                width: '100%', aspectRatio: '9/16', objectFit: 'cover',
                borderRadius: 'var(--r-3)', border: '1px solid var(--border-500)',
              }} />
            ) : (
              <div className="ph-stripe gold" style={{ aspectRatio: '9/16', borderRadius: 'var(--r-3)', flexDirection: 'column', gap: 6 }}>
                <I.image size={22} />
                <span className="t-mono t-11">Panel {selected.id} · à générer</span>
              </div>
            )}
            <div className="row gap-2">
              <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                <I.refresh size={11} />Regen
              </button>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                <I.grid size={11} />Variants
              </button>
            </div>
          </div>

          {/* Shot */}
          <div className="col hairline-b" style={{ padding: 14, gap: 8 }}>
            <span className="section-label">Shot</span>
            <InspectorKV k="Type" v={selected.cam} />
            <InspectorKV k="Duration" v={`${selected.dur}s`} />
            <InspectorKV k="Scene" v={sb.scene.name} />
            <InspectorKV k="Mood" v={sb.scene.mood} />
          </div>

          {/* Characters */}
          <div className="col hairline-b" style={{ padding: 14, gap: 8 }}>
            <span className="section-label">Characters ({selected.chars.length})</span>
            {selected.chars.length === 0 ? (
              <span className="t-11 muted-2">Plan sans personnage · décor / objet</span>
            ) : selected.chars.map(id => {
              const c = CHAR_BY_ID[id]; if (!c) return null;
              return (
                <div key={id} className="row gap-2">
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: `hsl(${c.hue}, 32%, 28%)`, color:'#fff',
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    fontSize: 10, fontWeight: 600,
                  }}>{c.name[0]}</span>
                  <span className="t-12">{c.name}</span>
                  <span className="t-11 muted-2">element_id locked</span>
                </div>
              );
            })}
          </div>

          {/* Generation */}
          <div className="col" style={{ padding: 14, gap: 8 }}>
            <span className="section-label">Generation</span>
            <InspectorKV k="Model" v="Gemini 2.5 Flash Image" />
            <InspectorKV k="Style" v="Madhouse 90s · cel-shade" />
            <InspectorKV k="Aspect" v="9:16" />
            <InspectorKV k="Seed" v={'— (unlock to regen)'} />
            <button className="btn btn-primary btn-sm" style={{ marginTop: 8, justifyContent: 'center' }}>
              <I.sparkle size={12} />Generate 9 variants
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PanelCard({ panel, index, selected, onClick }) {
  return (
    <div onClick={onClick}
      style={{
        aspectRatio: '9/16',
        background: 'var(--bg-2)',
        border: '1px solid ' + (selected ? 'var(--gold)' : 'var(--border-700)'),
        borderRadius: 'var(--r-3)',
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: selected ? 'var(--focus)' : 'none',
        transition: 'border-color .12s, box-shadow .12s',
      }}>
      {/* Background : vraie image si dispo, sinon placeholder gradient + label */}
      {panel.image ? (
        <img src={panel.image} alt={panel.title} loading="lazy" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', display: 'block',
        }} />
      ) : (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(135deg, hsl(${28 + index * 18}, 30%, 18%), hsl(${28 + index * 18}, 22%, 10%))`,
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0.35, pointerEvents: 'none',
          }}>
            <span className="t-mono t-11 muted-2">No asset · generate →</span>
          </div>
        </>
      )}

      {/* Top-left index */}
      <div style={{ position: 'absolute', top: 8, left: 8, padding: '2px 6px',
        background: 'rgba(10,10,18,.85)', borderRadius: 'var(--r-1)' }}>
        <span className="t-mono t-11 muted">#{index + 1}</span>
      </div>

      {/* Top-right status */}
      <div style={{ position: 'absolute', top: 8, right: 8 }}>
        <Badge variant="gold">{panel.status}</Badge>
      </div>

      {/* Content */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '10px 12px 12px',
        background: 'linear-gradient(to top, rgba(10,10,18,.95), rgba(10,10,18,0))',
        color: 'var(--text-0)',
      }}>
        <div className="col" style={{ gap: 4 }}>
          <span className="t-13" style={{ fontWeight: 500, lineHeight: 1.25 }}>{panel.title}</span>
          <span className="t-11 muted" style={{ lineHeight: 1.3 }}>{panel.note}</span>
          <div className="row gap-2" style={{ marginTop: 4 }}>
            <span className="t-mono t-11 muted-2">{panel.cam}</span>
            <span className="t-mono t-11 gold">{panel.dur}s</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InspectorKV({ k, v }) {
  return (
    <div className="row gap-2 t-12">
      <span className="muted-2" style={{ width: 80 }}>{k}</span>
      <span style={{ flex: 1 }}>{v}</span>
    </div>
  );
}

// Guide onboarding 3 étapes — masquable localStorage
function StoryboardGuide() {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="row gap-3" style={{
      padding: '10px 12px',
      background: 'var(--gold-ghost)',
      border: '1px solid var(--gold)',
      borderRadius: 'var(--r-2)',
      alignItems: 'center',
    }}>
      <span className="section-label gold">Comment gérer</span>
      <span className="t-12 muted">
        <b style={{ color: 'var(--gold)' }}>1.</b> Click une vignette → preview à droite.
        <b style={{ color: 'var(--gold)', marginLeft: 12 }}>2.</b> Click <Kbd>Regen</Kbd> ou <Kbd>Variants</Kbd> → ouvre Generate studio avec le prompt du panel + bible refs lockées.
        <b style={{ color: 'var(--gold)', marginLeft: 12 }}>3.</b> Shortliste dans Generate, reviens ici pour lock le panel.
      </span>
      <div style={{ flex: 1 }} />
      <button className="iconbtn" onClick={() => setHidden(true)} title="Hide guide"><I.x size={12} /></button>
    </div>
  );
}
