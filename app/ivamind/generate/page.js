'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge, I, Kbd } from '@/src/components/studio-chrome';
import { CHARACTERS, CHAR_BY_ID } from '@/src/data/ivamind-mock';
import { CAMERA_PRESETS, PRESET_CATEGORIES, FREE_PRESETS } from '@/src/data/camera-presets';
import { STYLE_BUNDLES, buildStyleHint } from '@/src/data/camera-styles';
import { pickSmartRefsMulti } from '@/src/lib/ref-picker';

const SHOT_PRESETS = [
  {
    id:'ep3-s04', ep:'EP-03', shot:'Shot 04',
    subject:'Soukaina entrée Carrefour',
    prompt:'A muslim woman in sage-khaki hijab and olive abaya enters a French supermarket at golden hour. Medium shot 35mm, warm amber light from setting sun through automatic doors, ambient dust particles, anime manga style ink line art 90s Madhouse, cel-shaded 2-tone hatching, linework thick brush-pen variable, grain 35mm Fujifilm Velvia, 9:16 aspect. No text. No logos.',
    characters:['soukaina'], aspectRatio:'9:16',
  },
  {
    id:'ep3-s07', ep:'EP-03', shot:'Shot 07',
    subject:'Omar contemplatif fenêtre HLM',
    prompt:'A 16-year-old franco-marocain teenager with curly black hair and rectangular glasses, wearing navy blue K∞ hoodie, looking through an HLM apartment window at dusk. Close-up 85mm, sodium street light painting half his face, cool blue wash, contemplative expression, anime manga seinen style Hajime no Ippo + Monster, cel-shaded limited animation feel, grain analog, 9:16. No text.',
    characters:['omar'], aspectRatio:'9:16',
  },
  {
    id:'ep3-s11', ep:'EP-03', shot:'Shot 11',
    subject:'Radoine père thobe mosquée',
    prompt:'A 40-year-old father with shaved head, short beard, black rectangular glasses, wearing charcoal thobe with mao collar, performing sujood in an empty mosque at fajr dawn. Wide shot 24mm, warm golden light from the mihrab, manga style 90s Madhouse, detailed architecture, cel-shaded, ink brush variable linework, 9:16. No text. Non-figurative interior details.',
    characters:['radoine'], aspectRatio:'9:16',
  },
];

const GRID_SIZES = [4, 9, 16];

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const urlPrompt = searchParams?.get('prompt');
  const urlGrid = parseInt(searchParams?.get('grid') || '0', 10);
  const urlPanel = searchParams?.get('panel');

  const [preset, setPreset] = useState(SHOT_PRESETS[0]);
  const [prompt, setPrompt] = useState(urlPrompt || SHOT_PRESETS[0].prompt);
  const [gridSize, setGridSize] = useState([4, 9, 16].includes(urlGrid) ? urlGrid : 9);
  const [tiles, setTiles] = useState([]);           // [{id,seed,status,url,cost,error,score}]
  const [shortlist, setShortlist] = useState([]);   // array of tile ids (ordered)
  const [focused, setFocused] = useState(0);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [compareMode, setCompareMode] = useState(false); // fullscreen preview of focused tile
  const [lockToBible, setLockToBible] = useState(true);  // i2i refs injection toggle
  const [customRefs, setCustomRefs] = useState([]);      // user-uploaded data URIs for i2i
  const fileInputRef = useRef(null);
  const [cameraPreset, setCameraPreset] = useState(null);    // preset mouvement caméra (Dolly In, etc.)
  const [styleBundle, setStyleBundle] = useState(null);      // bundle style (IVAMIND manga, Netflix, etc.)
  const [useNanoBanana2, setUseNanoBanana2] = useState(false); // Gemini 3.1 Flash Image — 14 refs au lieu de 4
  const tilesRef = useRef(tiles);
  const focusedRef = useRef(focused);
  useEffect(() => { tilesRef.current = tiles; }, [tiles]);
  useEffect(() => { focusedRef.current = focused; }, [focused]);

  const gridCols = gridSize === 4 ? 2 : gridSize === 9 ? 3 : 4;

  const runTotal = useMemo(() => {
    const succeeded = tiles.filter(t => t.status === 'succeeded');
    const failed = tiles.filter(t => t.status === 'failed');
    const pending = tiles.filter(t => t.status === 'running' || t.status === 'queued');
    const cost = succeeded.reduce((a, t) => a + (t.cost || 0), 0);
    const elapsed = startedAt ? ((Date.now() - startedAt) / 1000).toFixed(1) : 0;
    return { succeeded, failed, pending, cost, elapsed };
  }, [tiles, startedAt]);

  const selectPreset = (p) => { setPreset(p); setPrompt(p.prompt); setTiles([]); setShortlist([]); };

  // Build refs[] via SMART PICKER — exploite la banque 20 refs/persona selon le contexte shot.
  // Cap : Gemini 2.5 = 4 refs · Nano Banana 2 (Gemini 3.1) = 14 refs.
  const buildRefs = () => {
    const cap = useNanoBanana2 ? 14 : 4;
    const refs = [];
    customRefs.forEach(r => refs.push({ url: r.dataUrl, role: 'custom', label: r.name, reason: 'uploadé par l\'utilisateur' }));

    if (lockToBible && refs.length < cap) {
      const context = {
        prompt,
        camera: CAMERA_PRESETS.find(p => p.id === cameraPreset),
        style: STYLE_BUNDLES.find(b => b.id === styleBundle),
      };
      const smart = pickSmartRefsMulti(
        preset.characters.filter(id => CHAR_BY_ID[id]?.refUrl),
        context,
        cap - refs.length,
      );
      for (const r of smart) {
        if (refs.length >= cap) break;
        refs.push(r);
      }
    }
    return refs.slice(0, cap);
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    const reads = files.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, dataUrl: reader.result, size: file.size });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }));
    const added = await Promise.all(reads);
    setCustomRefs(prev => [...prev, ...added].slice(0, 4));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Augmente le prompt avec camera preset + style bundle + directive anti-ref-copy.
  // Si refs présents, on ajoute une directive pour que Gemini traite le prompt comme LA NOUVELLE SCÈNE
  // et les refs uniquement comme CHARACTER IDENTITY ANCHORS (pas comme scène à copier).
  const buildFinalPrompt = () => {
    const parts = [];
    const hasRefs = (customRefs.length > 0) || (lockToBible && preset.characters.some(id => CHAR_BY_ID[id]?.refUrl));
    if (hasRefs) {
      parts.push('NEW SCENE (described below). Reference images are FACE IDENTITY ANCHORS only — preserve facial identity, ignore refs background/pose/lighting.');
    }
    parts.push(prompt);
    const cp = CAMERA_PRESETS.find(p => p.id === cameraPreset);
    if (cp?.promptHint) parts.push(cp.promptHint);
    const sb = buildStyleHint(styleBundle);
    if (sb) parts.push(sb);
    return parts.filter(Boolean).join('. ');
  };

  const generateTile = async (tile, idx) => {
    try {
      const refs = buildRefs();
      const finalPrompt = buildFinalPrompt();
      const resp = await fetch('/api/byok/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          aspectRatio: preset.aspectRatio,
          seed: tile.seed,
          forceProvider: 'gemini',
          modelHint: useNanoBanana2 ? 'nano-banana-2' : undefined,
          refs: refs.length ? refs : undefined,
        }),
      });
      const data = await resp.json();
      if (data.status !== 'succeeded') throw new Error(data.error || 'gen failed');
      const url = data.assets?.[0]?.url || data.meta?.url;
      const cost = data.costUnits || 1;
      // Fake score until Gemini-as-judge is wired — seeded pseudo-random 7-10 range
      const r = (tile.seed * 9301 + 49297) % 233280 / 233280;
      const score = (7 + r * 3).toFixed(1);
      const mode = refs.length ? 'i2i' : 't2i';
      setTiles(prev => prev.map(t => t.id === tile.id ? { ...t, status:'succeeded', url, cost, score, mode, refCount: refs.length } : t));
    } catch (err) {
      setTiles(prev => prev.map(t => t.id === tile.id ? { ...t, status:'failed', error: err.message } : t));
    }
  };

  const generateBatch = async () => {
    if (running) return;
    const seeds = Array.from({ length: gridSize }, () => Math.floor(Math.random() * 1_000_000));
    const newTiles = seeds.map((seed, i) => ({ id:`t${Date.now()}_${i}`, seed, status:'running' }));
    setTiles(newTiles); setShortlist([]); setFocused(0); setStartedAt(Date.now()); setRunning(true);
    await Promise.allSettled(newTiles.map((t, i) => generateTile(t, i)));
    setRunning(false);
  };

  const regenTile = async (tileId) => {
    const tile = tiles.find(t => t.id === tileId); if (!tile) return;
    const newSeed = Math.floor(Math.random() * 1_000_000);
    const newTile = { ...tile, seed: newSeed, status: 'running', url: undefined, error: undefined, score: undefined };
    setTiles(prev => prev.map(t => t.id === tileId ? newTile : t));
    await generateTile(newTile, tiles.indexOf(tile));
  };

  const rejectTile = (tileId) => {
    setTiles(prev => prev.filter(t => t.id !== tileId));
    setShortlist(prev => prev.filter(id => id !== tileId));
  };

  const toggleShortlist = (tileId) => {
    if (!tileId) return;
    setShortlist(prev => prev.includes(tileId) ? prev.filter(id => id !== tileId) : [...prev, tileId]);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key >= '1' && e.key <= '9') {
        const i = parseInt(e.key) - 1;
        toggleShortlist(tilesRef.current[i]?.id);
        setFocused(i);
        e.preventDefault(); return;
      }
      const fid = tilesRef.current[focusedRef.current]?.id;
      if (!fid && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

      if (e.key === 'r' || e.key === 'R') { if (fid) regenTile(fid); e.preventDefault(); }
      else if (e.key === 'x' || e.key === 'X') { if (fid) rejectTile(fid); e.preventDefault(); }
      else if (e.key === 's' || e.key === 'S') { if (fid) toggleShortlist(fid); e.preventDefault(); }
      else if (e.key === ' ') { setCompareMode(m => !m); e.preventDefault(); }
      else if (e.key === 'Escape') { setCompareMode(false); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { setFocused(f => Math.min(tilesRef.current.length - 1, f + 1)); e.preventDefault(); }
      else if (e.key === 'ArrowLeft')  { setFocused(f => Math.max(0, f - 1)); e.preventDefault(); }
      else if (e.key === 'ArrowDown')  { setFocused(f => Math.min(tilesRef.current.length - 1, f + gridCols)); e.preventDefault(); }
      else if (e.key === 'ArrowUp')    { setFocused(f => Math.max(0, f - gridCols)); e.preventDefault(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [gridCols]);

  return (
    <div className="col" style={{ minHeight: '100%' }}>
      {/* Sub-header : shot context + grid toggle + actions */}
      <div className="col hairline-b" style={{ padding: '14px 24px 12px', gap: 10, background: 'var(--bg-0)' }}>
        <div className="row gap-3">
          <span className="section-label gold">Generation studio</span>
          <span className="muted-2">·</span>
          <span className="t-12 muted">Batch parallel · Gemini 2.5 Flash Image · live BYOK</span>
        </div>

        <div className="row gap-3">
          <span className="t-display t-14 gold">{preset.ep}</span>
          <span className="t-14" style={{ fontWeight: 500 }}>{preset.shot}</span>
          <span className="muted-2">·</span>
          <span className="t-14 muted">{preset.subject}</span>

          <div style={{ flex: 1 }} />

          <div className="tabs">
            {GRID_SIZES.map(n => (
              <button key={n} className={gridSize === n ? 'active' : ''} onClick={() => setGridSize(n)}>{n} variants</button>
            ))}
          </div>

          <button
            onClick={generateBatch}
            disabled={running}
            className="btn btn-primary">
            {running ? <I.refresh size={13} /> : <I.sparkle size={13} />}
            {running ? `Generating ${runTotal.pending.length}/${tiles.length}…` : `Generate ${gridSize}`}
            <Kbd>⌘↵</Kbd>
          </button>
        </div>
      </div>

      {/* 3-column : presets (left) | grid (center) | shortlist (right) */}
      <div className="row grow" style={{ minHeight: 0, overflow: 'hidden' }}>
        {/* LEFT — shot presets + prompt */}
        <div className="col hairline-r no-shrink" style={{ width: 320, background: 'var(--bg-0)', overflow: 'auto' }}>
          <div className="col" style={{ padding: 14, gap: 12 }}>
            <span className="section-label">Shot presets · EP-03</span>
            <div className="col gap-1">
              {SHOT_PRESETS.map(p => (
                <button key={p.id}
                  onClick={() => selectPreset(p)}
                  className="col gap-1"
                  style={{
                    padding: '10px 12px', alignItems:'flex-start',
                    borderRadius: 'var(--r-2)',
                    border: '1px solid ' + (preset.id === p.id ? 'var(--gold)' : 'var(--border-700)'),
                    background: preset.id === p.id ? 'var(--gold-ghost)' : 'var(--bg-2)',
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                  <div className="row gap-2" style={{ width: '100%' }}>
                    <span className="t-display t-12 gold">{p.ep}</span>
                    <span className="t-12">{p.shot}</span>
                    <div style={{ flex: 1 }} />
                    <CharAvatarRow ids={p.characters} />
                  </div>
                  <span className="t-11 muted">{p.subject}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="col hairline-t" style={{ padding: 14, gap: 8 }}>
            <div className="row gap-2">
              <span className="section-label">Prompt</span>
              <div style={{ flex: 1 }} />
              <span className="t-mono t-11 muted-2">{prompt.length} chars · est. 1u/img</span>
            </div>
            <textarea
              className="input"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={10}
              style={{ height:'auto', minHeight: 160, padding: 10, fontFamily:'var(--f-sans)', fontSize: 12, lineHeight: 1.5, resize:'vertical' }}
            />

            {/* Camera preset picker */}
            <div className="row gap-2" style={{ marginTop: 4 }}>
              <span className="section-label">Framing & angle</span>
              <div style={{ flex: 1 }} />
              <span className="t-11 muted-2">image statique</span>
              {cameraPreset && <button className="t-11 muted-2" onClick={() => setCameraPreset(null)} style={{ background:'none', border:'none', cursor:'pointer', marginLeft: 6 }}>clear</button>}
            </div>
            <select
              value={cameraPreset || ''}
              onChange={e => setCameraPreset(e.target.value || null)}
              className="input"
              style={{
                padding: '10px 32px 10px 12px',
                fontSize: 13,
                lineHeight: 1.4,
                background: 'var(--bg-2)',
                border: '1px solid var(--border-600)',
                borderRadius: 'var(--r-2)',
                color: 'var(--text-0)',
                fontFamily: 'var(--f-sans)',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23f9b233\' stroke-width=\'2\'%3e%3cpath d=\'m6 9 6 6 6-6\'/%3e%3c/svg%3e")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                cursor: 'pointer',
              }}
            >
              <option value="">— Aucun cadrage spécifique —</option>
              {/* Seuls les presets applicables à une image statique (pas de mouvement video) */}
              {Object.entries(PRESET_CATEGORIES).map(([catKey, cat]) => {
                // Categories "dolly" / "pan" / "tilt" / "zoom" / "crane" / "arc" / "temporal" / "dynamic" = VIDEO-only movements — skip ici
                if (!['static'].includes(catKey)) return null;
                const items = CAMERA_PRESETS.filter(p => p.category === catKey);
                if (!items.length) return null;
                return (
                  <optgroup key={catKey} label={cat.label}>
                    {items.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.label} — {p.useCase}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            <span className="t-11 muted-2" style={{ lineHeight: 1.4 }}>
              💡 Les mouvements caméra (Dolly / Pan / Crane / Zoom etc.) seront dispos dans <a href="/studio/video" style={{ color:'var(--gold)', textDecoration:'underline' }}>/studio/video</a> pour générer des clips Kling.
            </span>
            {cameraPreset && (
              <span className="t-11 muted-2" style={{ lineHeight: 1.4 }}>
                {CAMERA_PRESETS.find(p => p.id === cameraPreset)?.useCase}
              </span>
            )}

            {/* Style bundle picker (Cinema Studio 2.0-like) */}
            <div className="row gap-2" style={{ marginTop: 8 }}>
              <span className="section-label">Style bundle</span>
              <div style={{ flex: 1 }} />
              {styleBundle && <button className="t-11 muted-2" onClick={() => setStyleBundle(null)} style={{ background:'none', border:'none', cursor:'pointer' }}>clear</button>}
            </div>
            <select
              value={styleBundle || ''}
              onChange={e => setStyleBundle(e.target.value || null)}
              className="input"
              style={{
                padding: '10px 32px 10px 12px',
                fontSize: 13,
                lineHeight: 1.4,
                background: 'var(--bg-2)',
                border: '1px solid var(--border-600)',
                borderRadius: 'var(--r-2)',
                color: 'var(--text-0)',
                fontFamily: 'var(--f-sans)',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23f9b233\' stroke-width=\'2\'%3e%3cpath d=\'m6 9 6 6 6-6\'/%3e%3c/svg%3e")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                cursor: 'pointer',
              }}
            >
              <option value="">— Aucun bundle (prompt tel quel) —</option>
              {STYLE_BUNDLES.map(b => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
            {styleBundle && (
              <span className="t-11 muted-2" style={{ lineHeight: 1.4 }}>
                {STYLE_BUNDLES.find(b => b.id === styleBundle)?.description}
              </span>
            )}

            {/* Prompt final preview */}
            {(cameraPreset || styleBundle) && (
              <details className="card" style={{ padding: 8, background: 'var(--bg-1)', marginTop: 6 }}>
                <summary className="t-11 muted" style={{ cursor: 'pointer' }}>Prompt final ({buildFinalPrompt().length} chars)</summary>
                <div className="t-11 muted" style={{ marginTop: 6, lineHeight: 1.5, whiteSpace: 'pre-wrap', fontFamily: 'var(--f-mono)' }}>
                  {buildFinalPrompt()}
                </div>
              </details>
            )}

            {/* Toggle Nano Banana 2 (Gemini 3.1) — 14 refs au lieu de 4 */}
            <div className="row gap-2" style={{ marginTop: 4 }}>
              <label className="row gap-2" style={{ cursor: 'pointer', userSelect: 'none', width: '100%' }} title="Active Gemini 3.1 Flash Image (Nano Banana 2) — cap 14 refs au lieu de 4. Cohérence bible 3.5× supérieure.">
                <input
                  type="checkbox"
                  checked={useNanoBanana2}
                  onChange={e => setUseNanoBanana2(e.target.checked)}
                  style={{ accentColor: 'var(--gold)', cursor: 'pointer' }}
                />
                <span className="t-12" style={{ color: useNanoBanana2 ? 'var(--gold)' : 'var(--muted)', fontWeight: useNanoBanana2 ? 600 : 400 }}>
                  Nano Banana 2 {useNanoBanana2 ? '(14 refs)' : '(active pour 14 refs)'}
                </span>
                <div style={{ flex: 1 }} />
                <span className="t-11 muted-2 t-mono">{useNanoBanana2 ? '3.1' : '2.5'}</span>
              </label>
            </div>

            <div className="row gap-2">
              <span className="section-label">Character refs</span>
              <div style={{ flex: 1 }} />
              <label className="row gap-2" style={{ cursor: 'pointer', userSelect: 'none' }} title="i2i injection Gemini — refs bible verrouillées en inline_data multi-part">
                <input
                  type="checkbox"
                  checked={lockToBible}
                  onChange={e => setLockToBible(e.target.checked)}
                  style={{ accentColor: 'var(--gold)', cursor: 'pointer' }}
                />
                <span className="t-11" style={{ color: lockToBible ? 'var(--gold)' : 'var(--muted-2)', fontWeight: lockToBible ? 600 : 400 }}>
                  Lock to bible {lockToBible ? '(i2i)' : '(t2i)'}
                </span>
              </label>
            </div>
            <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
              {preset.characters.map((id, i) => {
                const c = CHAR_BY_ID[id]; if (!c) return null;
                const active = lockToBible && i < 4; // max 4 refs Gemini (2026 best practice)
                return (
                  <div key={id} className="row gap-2 pill" style={{
                    borderColor: active ? 'var(--gold)' : 'var(--border-700)',
                    background: active ? 'var(--gold-ghost)' : 'var(--bg-2)',
                  }}>
                    {c.refUrl ? (
                      <img src={c.refUrl} alt={c.name} style={{
                        width: 22, height: 22, borderRadius: '50%', objectFit: 'cover',
                        border: active ? '1px solid var(--gold)' : '1px solid var(--border-700)',
                      }} />
                    ) : (
                      <span style={{
                        width: 22, height: 22, borderRadius:'50%',
                        background: `hsl(${c.hue}, 32%, 28%)`, color: '#fff',
                        display:'inline-flex', alignItems:'center', justifyContent:'center',
                        fontSize: 9, fontWeight: 600,
                      }}>{c.name[0]}</span>
                    )}
                    <span className="t-12">{c.name}</span>
                    {active && <span className="t-11 gold t-mono">ref</span>}
                  </div>
                );
              })}
            </div>
            {(() => {
              const currentRefs = buildRefs();
              if (!currentRefs.length) {
                return <span className="t-11 muted-2">→ text-only prompt · Gemini t2i (cohérence faible)</span>;
              }
              return (
                <div className="col gap-2" style={{ marginTop: 4 }}>
                  <span className="t-11" style={{ color: 'var(--gold)', fontWeight: 500 }}>
                    → {currentRefs.length} ref(s) envoyées à Gemini en inline_data
                  </span>
                  <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                    {currentRefs.map((r, i) => (
                      <div key={i} style={{
                        position: 'relative',
                        width: 48,
                        height: 64,
                        borderRadius: 'var(--r-1)',
                        border: '1px solid var(--gold)',
                        overflow: 'hidden',
                        background: 'var(--bg-2)',
                      }} title={`${r.characterId || r.role} · ${r.angle || r.label || ''}`}>
                        <img
                          src={r.url}
                          alt={r.angle || r.label || 'ref'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: '2px 4px',
                          background: 'linear-gradient(to top, rgba(10,10,18,0.95), transparent)',
                          fontSize: 8,
                          lineHeight: 1.1,
                          color: 'var(--gold)',
                          fontFamily: 'var(--f-mono)',
                          fontWeight: 600,
                        }}>
                          {r.angle || r.label?.slice(0, 8) || 'ref'}
                        </div>
                        <div style={{
                          position: 'absolute',
                          top: 2,
                          left: 2,
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: 'var(--gold)',
                          color: '#1a1200',
                          fontSize: 9,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'var(--f-mono)',
                        }}>{i + 1}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Upload custom refs */}
            <div className="row gap-2" style={{ marginTop: 8 }}>
              <span className="section-label">Custom upload</span>
              <div style={{ flex: 1 }} />
              <span className="t-11 muted-2">{customRefs.length}/4 slots</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={async (e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
                if (!files.length) return;
                const reads = files.map(file => new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve({ name: file.name, dataUrl: reader.result, size: file.size });
                  reader.readAsDataURL(file);
                }));
                const added = await Promise.all(reads);
                setCustomRefs(prev => [...prev, ...added].slice(0, 4));
              }}
              style={{
                border: '1px dashed var(--border-500)',
                borderRadius: 'var(--r-2)',
                padding: '12px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--bg-2)',
              }}
            >
              <div className="t-12 muted">Drop images or click to upload</div>
              <div className="t-11 muted-2" style={{ marginTop: 2 }}>PNG/JPG/WebP · max 4 · injectées avant bible refs</div>
            </div>
            {customRefs.length > 0 && (
              <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                {customRefs.map((r, i) => (
                  <div key={i} className="row gap-2" style={{
                    padding: 4,
                    border: '1px solid var(--gold)',
                    borderRadius: 'var(--r-2)',
                    background: 'var(--gold-ghost)',
                  }}>
                    <img src={r.dataUrl} alt={r.name} style={{
                      width: 28, height: 28, borderRadius: 4, objectFit: 'cover',
                    }} />
                    <span className="t-11 truncate" style={{ maxWidth: 100 }}>{r.name}</span>
                    <button
                      className="iconbtn"
                      onClick={(e) => { e.stopPropagation(); setCustomRefs(prev => prev.filter((_, j) => j !== i)); }}
                      title="Remove">
                      <I.x size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER — grid */}
        <div className="col grow" style={{ minWidth: 0, overflow: 'auto', background: 'var(--bg-0)', padding: '16px 20px' }}>
          {/* Grid status bar */}
          <div className="row gap-4" style={{ padding: '4px 2px 12px' }}>
            <span className="t-mono t-11 muted-2">{tiles.length} tiles · {runTotal.succeeded.length} ok · {runTotal.pending.length} pending · {runTotal.failed.length} failed</span>
            <div style={{ flex: 1 }} />
            {runTotal.cost > 0 && <span className="t-mono t-11 gold">{runTotal.cost} credits spent</span>}
            {runTotal.elapsed > 0 && <span className="t-mono t-11 muted-2">{runTotal.elapsed}s elapsed</span>}
          </div>

          {tiles.length === 0 ? (
            <div className="ph-stripe gold" style={{ minHeight: 480, borderRadius:'var(--r-3)', flexDirection:'column', gap: 10, fontFamily:'var(--f-sans)', fontSize: 13 }}>
              <I.sparkle size={32} />
              <div className="col gap-1" style={{ alignItems:'center' }}>
                <span className="t-14 gold">Ready to generate {gridSize} variants</span>
                <span className="t-11 muted-2">Adjust prompt left · press <Kbd>⌘↵</Kbd> or click Generate</span>
              </div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:`repeat(${gridCols}, 1fr)`, gap: 12 }}>
              {tiles.map((t, i) => (
                <Tile
                  key={t.id} tile={t} index={i}
                  focused={focused === i}
                  shortlistRank={shortlist.indexOf(t.id)}
                  onFocus={() => setFocused(i)}
                  onShortlist={() => toggleShortlist(t.id)}
                  onRegen={() => regenTile(t.id)}
                  onReject={() => rejectTile(t.id)}
                  onZoom={() => { setFocused(i); setCompareMode(true); }}
                />
              ))}
            </div>
          )}

          {/* Shortcuts hint */}
          {tiles.length > 0 && (
            <div className="row gap-3 t-11 muted-2" style={{ marginTop: 14, paddingTop: 10, borderTop:'1px solid var(--border-700)' }}>
              <span><Kbd>1-9</Kbd> shortlist</span>
              <span><Kbd>S</Kbd> toggle focused</span>
              <span><Kbd>R</Kbd> regen focused</span>
              <span><Kbd>X</Kbd> reject focused</span>
              <span><Kbd>Space</Kbd> preview</span>
              <span><Kbd>↑↓←→</Kbd> nav</span>
            </div>
          )}
        </div>

        {/* RIGHT — shortlist */}
        <aside className="col hairline-l no-shrink" style={{ width: 280, background: 'var(--bg-1)', overflow: 'auto' }}>
          <div className="col hairline-b" style={{ padding: 14, gap: 6 }}>
            <div className="row gap-2">
              <span className="section-label">Shortlist</span>
              <div style={{ flex: 1 }} />
              <span className="t-mono t-11 muted-2">{shortlist.length}</span>
            </div>
            <span className="t-11 muted-2">Press <Kbd>1-9</Kbd> to pick</span>
          </div>

          <div className="col" style={{ padding: 10, gap: 8 }}>
            {shortlist.length === 0 && (
              <div className="t-12 muted-2" style={{ padding: 20, textAlign:'center' }}>
                Aucun shortlist. Tape <Kbd>1</Kbd>…<Kbd>9</Kbd> pour valider une variante.
              </div>
            )}
            {shortlist.map((tid, i) => {
              const tile = tiles.find(t => t.id === tid); if (!tile) return null;
              return (
                <div key={tid} className="row gap-2 card" style={{ padding: 6 }}>
                  <div style={{
                    width: 56, height: 100, background: 'var(--bg-3)',
                    borderRadius: 'var(--r-1)',
                    backgroundImage: tile.url ? `url(${tile.url})` : 'none',
                    backgroundSize: 'cover', backgroundPosition: 'center',
                  }} />
                  <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
                    <span className="t-12 truncate">#{i + 1} · seed {tile.seed}</span>
                    <span className="t-mono t-11 gold">score {tile.score || '—'}</span>
                    <span className="t-11 muted-2">{preset.shot}</span>
                  </div>
                  <button className="iconbtn" onClick={() => toggleShortlist(tid)} title="Remove from shortlist">
                    <I.x size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          {shortlist.length > 0 && (
            <div className="col hairline-t" style={{ padding: 10, gap: 6 }}>
              <button className="btn btn-secondary btn-sm" style={{ justifyContent:'center' }}>
                <I.image size={12} />Upscale all
              </button>
              <button className="btn btn-secondary btn-sm" style={{ justifyContent:'center' }}>
                <I.video size={12} />Send to Kling (i2v)
              </button>
              <button className="btn btn-primary btn-sm" style={{ justifyContent:'center' }}>
                <I.export size={12} />Add to EP
              </button>
            </div>
          )}

          <div className="col hairline-t" style={{ padding: 10, gap: 4 }}>
            <span className="section-label">Batch summary</span>
            <div className="row gap-2 t-11 muted"><span className="dot dot-green" />succeeded {runTotal.succeeded.length}</div>
            <div className="row gap-2 t-11 muted"><span className="dot dot-gold" />pending {runTotal.pending.length}</div>
            <div className="row gap-2 t-11 muted"><span className="dot dot-red" />failed {runTotal.failed.length}</div>
            <div className="row gap-2 t-11 muted-2" style={{ marginTop: 4 }}>
              <span>cost</span>
              <span className="gold t-mono">{runTotal.cost} u</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Compare mode overlay (Space to toggle) */}
      {compareMode && tiles[focused] && (
        <div onClick={() => setCompareMode(false)} style={{
          position:'fixed', inset: 0, zIndex: 90,
          background:'rgba(10,10,18,.85)', backdropFilter:'blur(12px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          padding: 40,
        }}>
          <div className="col gap-3" style={{ alignItems:'center' }}>
            <img src={tiles[focused].url} alt="" style={{ maxHeight:'84vh', maxWidth:'90vw', borderRadius:'var(--r-3)', border:'1px solid var(--border-400)' }} />
            <div className="row gap-3 t-mono t-12 muted">
              <span>{preset.shot}</span>
              <span>·</span>
              <span>seed {tiles[focused].seed}</span>
              <span>·</span>
              <span className="gold">score {tiles[focused].score}</span>
              <span>·</span>
              <span>{focused + 1} / {tiles.length}</span>
              <span>·</span>
              <span className="muted-2"><Kbd>Esc</Kbd> close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tile ───
function Tile({ tile, index, focused, shortlistRank, onFocus, onShortlist, onRegen, onReject, onZoom }) {
  const isShortlisted = shortlistRank >= 0;
  return (
    <div
      onClick={onFocus}
      style={{
        position:'relative',
        aspectRatio: '9/16',
        background: 'var(--bg-2)',
        border: '1px solid ' + (focused ? 'var(--gold)' : isShortlisted ? 'rgba(249,178,51,.45)' : 'var(--border-700)'),
        borderRadius: 'var(--r-3)',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: focused ? 'var(--focus)' : 'none',
        transition: 'border-color .12s, box-shadow .12s',
      }}>
      {/* Image or placeholder */}
      {tile.status === 'succeeded' && tile.url ? (
        <img src={tile.url} alt="" loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
      ) : tile.status === 'running' ? (
        <div className="skel" style={{ width:'100%', height:'100%' }} />
      ) : tile.status === 'failed' ? (
        <div className="ph-stripe" style={{ width:'100%', height:'100%', flexDirection:'column', gap: 6, color:'var(--red)', borderColor:'rgba(229,72,77,.4)' }}>
          <I.x size={18} />
          <span className="t-mono t-11">{tile.error?.slice(0, 40) || 'failed'}</span>
        </div>
      ) : (
        <div className="ph-stripe gold" style={{ width:'100%', height:'100%' }}>
          <span className="t-mono t-11">queued</span>
        </div>
      )}

      {/* Top-left: tile index + mode badge */}
      <div style={{ position:'absolute', top: 6, left: 6, display:'flex', gap: 4 }}>
        <div style={{ padding:'2px 6px', background:'rgba(10,10,18,.8)', borderRadius:'var(--r-1)' }}>
          <span className="t-mono t-11 muted">{index + 1}</span>
        </div>
        {tile.mode && (
          <div style={{
            padding:'2px 6px',
            background: tile.mode === 'i2i' ? 'rgba(249,178,51,.22)' : 'rgba(10,10,18,.8)',
            borderRadius:'var(--r-1)',
            border: tile.mode === 'i2i' ? '1px solid var(--gold)' : 'none',
          }}>
            <span className="t-mono t-11" style={{ color: tile.mode === 'i2i' ? 'var(--gold)' : 'var(--muted-2)' }}>
              {tile.mode}{tile.refCount ? ` · ${tile.refCount}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Top-right: shortlist rank */}
      {isShortlisted && (
        <div style={{ position:'absolute', top: 6, right: 6, width: 20, height: 20, background:'var(--gold)', color:'#1a1200', borderRadius: '50%',
          display:'flex', alignItems:'center', justifyContent:'center', fontWeight: 700, fontSize: 11, fontFamily:'var(--f-mono)' }}>
          {shortlistRank + 1}
        </div>
      )}

      {/* Bottom: scores / status */}
      <div style={{ position:'absolute', left: 0, right: 0, bottom: 0, padding: '6px 8px 6px',
        background:'linear-gradient(to top, rgba(10,10,18,.95), rgba(10,10,18,0))',
        display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap: 6 }}>
        <div className="col" style={{ gap: 1, lineHeight: 1 }}>
          {tile.score && <span className="t-mono t-11 gold">{tile.score}</span>}
          <span className="t-mono t-11 muted-2">s{tile.seed}</span>
        </div>
        {tile.cost && <span className="t-mono t-11 muted">{tile.cost}u</span>}
      </div>

      {/* Hover actions */}
      <div style={{
        position:'absolute', top: 32, right: 6,
        display:'flex', flexDirection:'column', gap: 4,
        opacity: focused ? 1 : 0, transition:'opacity .12s',
      }}>
        <button className="iconbtn" onClick={(e) => { e.stopPropagation(); onShortlist(); }} title="Shortlist (S)">
          <I.dot size={12} />
        </button>
        <button className="iconbtn" onClick={(e) => { e.stopPropagation(); onRegen(); }} title="Regen (R)">
          <I.refresh size={12} />
        </button>
        <button className="iconbtn" onClick={(e) => { e.stopPropagation(); onZoom(); }} title="Zoom (Space)">
          <I.image size={12} />
        </button>
        <button className="iconbtn" onClick={(e) => { e.stopPropagation(); onReject(); }} title="Reject (X)">
          <I.x size={12} />
        </button>
      </div>
    </div>
  );
}

function CharAvatarRow({ ids }) {
  return (
    <div className="row" style={{ gap: 0 }}>
      {ids.slice(0, 3).map((id, i) => {
        const c = CHAR_BY_ID[id]; if (!c) return null;
        return (
          <span key={id} title={c.name} style={{
            width: 18, height: 18, borderRadius:'50%',
            background: `hsl(${c.hue}, 32%, 28%)`, color: '#fff',
            border: '1px solid var(--bg-0)', marginLeft: i === 0 ? 0 : -4,
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            fontSize: 9, fontWeight: 600,
          }}>{c.name[0]}</span>
        );
      })}
    </div>
  );
}
