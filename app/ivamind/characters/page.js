'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CHARACTERS } from '@/src/data/ivamind-mock';
import { Badge, I, Kbd } from '@/src/components/studio-chrome';
import { useActiveCharacter, setActiveCharacter } from '@/src/lib/active-character';

// Matrice 5×4 = 20 refs/persona (4 base + 16 dérivés Gemini i2i)
const REFS_MATRIX = [
  { line: 'L1', theme: 'Base bible',        slugs: ['01-front', '02-three-quarter-left', '03-three-quarter-right', '04-profile'], ext: 'png', prefix: '' },
  { line: 'L2', theme: 'Expressions',       slugs: ['l2-expr-smile-soft', 'l2-expr-determination', 'l2-expr-eyes-closed', 'l2-expr-piercing-gaze'], ext: 'png', prefix: '' },
  { line: 'L3', theme: 'Poses',             slugs: ['l3-pose-arms-crossed', 'l3-pose-hand-to-chin', 'l3-pose-back-glancing', 'l3-pose-seated-composed'], ext: 'png', prefix: '' },
  { line: 'L4', theme: 'Angles',            slugs: ['l4-angle-low-angle', 'l4-angle-high-angle', 'l4-angle-shoulder-85', 'l4-angle-dutch-15'], ext: 'png', prefix: '' },
  { line: 'L5', theme: 'Lighting/context',  slugs: ['l5-light-golden-backlit', 'l5-light-neon-blue-night', 'l5-light-hlm-interior', 'l5-light-chiaroscuro'], ext: 'png', prefix: '' },
];

// Toutes les refs vivent dans public/character-refs/<id>/ (L1-L5 = 20 refs/persona).
// L1 01-front.png est aussi copié à /character-refs/<id>-01-front.png pour le picker primaire.
function refSrc(id, line, slug) {
  if (line === 'L1' && slug === '01-front') {
    return `/character-refs/${id}-01-front.png`; // version "flat" utilisée par CHARACTERS[].refUrl
  }
  return `/character-refs/${id}/${slug}.png`;
}

export default function CharactersPage() {
  const [openId, setOpenId] = useState(null);
  const [customChars, setCustomChars] = useState([]);

  // Charger les custom characters depuis l'API (filesystem) + localStorage
  useEffect(() => {
    fetch('/api/byok/characters/register')
      .then(r => r.json())
      .then(data => setCustomChars(data.characters || []))
      .catch(() => {});
  }, []);

  const openChar = CHARACTERS.find(c => c.id === openId) || customChars.find(c => c.id === openId);

  return (
    <div style={{ padding: '24px' }}>
      <div className="col gap-3" style={{ marginBottom: 20 }}>
        <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
          <div className="col gap-2 grow">
            <span className="section-label gold">Characters · Bible locked</span>
            <h1 className="t-24" style={{ fontWeight: 600 }}>{CHARACTERS.length} bible + {customChars.length} custom</h1>
            <span className="t-12 muted">Bible IVAMIND verrouillée (Omar + famille · element_ids Kling) + personnages custom style Higgsfield Soul ID (10-20 refs). Click une card → voir refs.</span>
          </div>
          <Link href="/ivamind/characters/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <I.plus size={13} />Register new character
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {CHARACTERS.map(c => (
          <div
            key={c.id}
            className="card card-hov"
            onClick={() => setOpenId(c.id)}
            style={{ padding: 16, cursor: 'pointer', transition: 'border-color .12s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = ''}
          >
            <div className="row gap-3" style={{ marginBottom: 12 }}>
              {c.refUrl ? (
                <img
                  src={c.refUrl}
                  alt={c.name}
                  style={{
                    width: 56, height: 56, borderRadius: 12,
                    objectFit: 'cover',
                    border: '1px solid var(--border-500)',
                  }}
                />
              ) : (
                <div style={{
                  width: 56, height: 56, borderRadius: 12,
                  background: `linear-gradient(135deg, hsl(${c.hue},28%,30%), hsl(${c.hue},18%,18%))`,
                  border: '1px solid var(--border-500)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 22, fontWeight: 700,
                }}>{c.name[0]}</div>
              )}
              <div className="col" style={{ gap: 2 }}>
                <span className="t-display t-16">{c.name}</span>
                <span className="t-12 muted">{c.role}</span>
                <span className="t-11 muted-2 t-mono">{c.age} ans</span>
              </div>
            </div>
            <div className="t-12 muted" style={{ marginBottom: 12 }}>{c.outfit}</div>
            <div className="row gap-2" style={{ marginBottom: 10 }}>
              <Badge variant="gold" icon={I.dot}>Bible locked · 20 refs</Badge>
            </div>
            <div className="t-mono t-11 muted-2" style={{ wordBreak: 'break-all' }}>element_id: {c.element}</div>
          </div>
        ))}
      </div>

      {/* ═══ CUSTOM CHARACTERS (registered via Soul ID form) ═══ */}
      {customChars.length > 0 && (
        <>
          <div className="col gap-2" style={{ marginTop: 32, marginBottom: 14 }}>
            <span className="section-label">Custom characters · registered via /ivamind/characters/new</span>
            <h2 className="t-18" style={{ fontWeight: 600 }}>{customChars.length} personnage{customChars.length > 1 ? 's' : ''} custom</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {customChars.map(c => (
              <div
                key={c.id}
                className="card card-hov"
                onClick={() => setOpenId(c.id)}
                style={{ padding: 16, cursor: 'pointer', transition: 'border-color .12s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = ''}
              >
                <div className="row gap-3" style={{ marginBottom: 12 }}>
                  {c.refUrls?.[0] ? (
                    <img src={c.refUrls[0]} alt={c.name} style={{
                      width: 56, height: 56, borderRadius: 12,
                      objectFit: 'cover',
                      border: '1px solid var(--border-500)',
                    }} />
                  ) : (
                    <div style={{
                      width: 56, height: 56, borderRadius: 12,
                      background: 'var(--bg-3)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, fontWeight: 700,
                    }}>{c.name[0]}</div>
                  )}
                  <div className="col" style={{ gap: 2 }}>
                    <span className="t-display t-16">{c.name}</span>
                    <span className="t-12 muted">{c.photosCount || c.refUrls?.length || 0} refs</span>
                    <span className="t-11 muted-2 t-mono">custom</span>
                  </div>
                </div>
                {c.description && <div className="t-12 muted" style={{ marginBottom: 8 }}>{c.description.slice(0, 100)}{c.description.length > 100 ? '…' : ''}</div>}
                {c.outfit && <div className="t-12 muted" style={{ marginBottom: 12, fontStyle: 'italic' }}>{c.outfit.slice(0, 100)}{c.outfit.length > 100 ? '…' : ''}</div>}
                <div className="row gap-2" style={{ marginBottom: 6 }}>
                  <Badge variant="gold" icon={I.dot}>{c.klingElementId ? 'Kling element ✓' : 'Gemini i2i ready'}</Badge>
                </div>
                {c.klingElementId && <div className="t-mono t-11 muted-2">element_id: {c.klingElementId}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {openChar && (
        <CharacterDrawer char={openChar} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}

function CharacterDrawer({ char, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 90,
        background: 'rgba(10,10,18,.85)', backdropFilter: 'blur(10px)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        padding: '40px 20px', overflow: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="col"
        style={{
          maxWidth: 1200, width: '100%',
          background: 'var(--bg-1)',
          border: '1px solid var(--border-500)',
          borderRadius: 'var(--r-4)',
          padding: 24, gap: 20,
        }}
      >
        {/* Header */}
        <div className="row gap-4" style={{ alignItems: 'flex-start' }}>
          {char.refUrl && (
            <img src={char.refUrl} alt={char.name} style={{
              width: 96, height: 96, borderRadius: 14, objectFit: 'cover',
              border: '1px solid var(--gold)',
            }} />
          )}
          <div className="col grow" style={{ gap: 6 }}>
            <div className="row gap-2">
              <span className="section-label gold">Character bible · 20 refs</span>
            </div>
            <h2 className="t-display t-24">{char.name}</h2>
            <span className="t-13 muted">{char.role} · {char.age} ans</span>
            <span className="t-12 muted">{char.outfit}</span>
            <span className="t-mono t-11 muted-2" style={{ marginTop: 4 }}>Kling element_id: {char.element}</span>
          </div>
          <button className="iconbtn" onClick={onClose} title="Close (Esc)">
            <I.x size={14} />
            <Kbd>esc</Kbd>
          </button>
        </div>

        {/* Matrix */}
        {REFS_MATRIX.map(row => (
          <div key={row.line} className="col gap-2">
            <div className="row gap-2">
              <span className="section-label">
                <span className="gold">{row.line}</span> — {row.theme}
              </span>
              <div style={{ flex: 1 }} />
              <span className="t-11 muted-2">{row.slugs.length} refs</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {row.slugs.map(slug => {
                const src = refSrc(char.id, row.line, slug);
                const label = slug.replace(/^l\d+-[a-z]+-/, '').replace(/^\d+-/, '');
                return (
                  <div key={slug} className="col" style={{
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border-700)',
                    borderRadius: 'var(--r-2)',
                    overflow: 'hidden',
                  }}>
                    {src ? (
                      <img src={src} alt={label} loading="lazy" style={{
                        width: '100%', aspectRatio: '9/16', objectFit: 'cover', display: 'block',
                      }} onError={e => { e.target.style.display = 'none'; e.target.parentElement.querySelector('.ph').style.display = 'flex'; }} />
                    ) : null}
                    <div className="ph ph-stripe" style={{
                      display: src ? 'none' : 'flex', width: '100%', aspectRatio: '9/16',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span className="t-mono t-11 muted-2">n/a</span>
                    </div>
                    <div className="t-11" style={{ padding: '6px 8px' }}>
                      <div className="gold">{label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
