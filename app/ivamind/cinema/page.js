'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { I, Kbd } from '@/src/components/studio-chrome';
import { CHARACTERS, CHAR_BY_ID } from '@/src/data/ivamind-mock';
import { CAMERA_PRESETS } from '@/src/data/camera-presets';
import { STYLE_BUNDLES, buildStyleHint, LENS_PRESETS, APERTURE_PRESETS, SENSOR_PRESETS, LIGHTING_PRESETS } from '@/src/data/camera-styles';
import { parseMentions, mentionsToRefs } from '@/src/lib/mention-parser';
import { useActiveCharacter, setActiveCharacter } from '@/src/lib/active-character';

const HISTORY_KEY = 'ivamind:cinema:history';
const MAX_HISTORY = 40;
const ASPECT_OPTIONS = [
  { id: '9:16',  label: '9:16 TikTok' },
  { id: '16:9',  label: '16:9 Cinema' },
  { id: '1:1',   label: '1:1 Square' },
  { id: '4:5',   label: '4:5 Portrait' },
];
const MODE_OPTIONS = ['image', 'video'];

// Le Cinema Studio IVAMIND ne génère RIEN lui-même — il structure le prompt + refs + element_ids
// et route vers le modèle sous-jacent choisi. Modèles exposés par notre Provider Layer BYOK :
const IMAGE_MODELS = [
  { id: 'gemini-2.5',    label: 'Gemini 2.5 Flash Image',  provider: 'gemini',  cost: '~$0.04',  maxRefs: 4,  badge: 'default' },
  { id: 'nano-banana-2', label: 'Nano Banana 2 (Gemini 3.1)', provider: 'gemini', modelHint: 'nano-banana-2', cost: '~$0.05', maxRefs: 14, badge: 'best refs' },
];
const VIDEO_MODELS = [
  { id: 'kling-omni',       label: 'Kling 3.0 Omni Pro',       provider: 'kling',    modelHint: 'kling-v3-omni-pro',  cost: '10u/5s',  badge: 'best quality · element_ids' },
  { id: 'kling-basic',      label: 'Kling basic v3',           provider: 'kling',    modelHint: 'kling-v3-basic',     cost: '4u/5s',   badge: 'fast' },
  { id: 'seedance-pro',     label: 'Seedance 1.0 Pro',         provider: 'seedance', modelHint: 'seedance-1.0-pro-250528', cost: '~$0.10/5s', badge: 'cheapest · 10× Kling' },
  { id: 'seedance-lite',    label: 'Seedance 1.0 Lite',        provider: 'seedance', modelHint: 'seedance-1.0-lite-250528', cost: '~$0.05/5s', badge: 'ultra cheap' },
];

export default function CinemaIvamindPage() {
  const [mode, setMode] = useState('image');
  const [imageModelId, setImageModelId] = useState('gemini-2.5');
  const [videoModelId, setVideoModelId] = useState('seedance-pro');  // cheapest default
  const [prompt, setPrompt] = useState('');
  const [cameraPreset, setCameraPreset] = useState(null);
  const [styleBundle, setStyleBundle] = useState('ivamind-manga-series');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [multiShot, setMultiShot] = useState(false);
  const [duration, setDuration] = useState(5);

  // Active model = celui sélectionné selon mode courant (toujours parmi available).
  const activeModel = mode === 'image'
    ? availableImageModels.find(m => m.id === imageModelId) || availableImageModels[0] || IMAGE_MODELS[0]
    : availableVideoModels.find(m => m.id === videoModelId) || availableVideoModels[0] || VIDEO_MODELS[0];
  const useNanoBanana2 = imageModelId === 'nano-banana-2';
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState([]);
  const [customBank, setCustomBank] = useState([]);
  const [focusedId, setFocusedId] = useState(null);
  const [error, setError] = useState(null);
  const [providersStatus, setProvidersStatus] = useState({}); // { gemini: true, kling: false, seedance: true, ... }
  const activeChar = useActiveCharacter();

  // Load providers keys status depuis /api/byok/settings/keys
  // Filter IMAGE_MODELS et VIDEO_MODELS pour ne garder que ceux dont le provider est configured.
  // Si Joe ajoute une clé dans /ivamind/settings, reload cette page → nouveau modèle dispo auto.
  const availableImageModels = IMAGE_MODELS.filter(m => providersStatus[m.provider] !== false);
  const availableVideoModels = VIDEO_MODELS.filter(m => {
    if (m.provider === 'kling') {
      // Kling requires both access + secret keys
      return providersStatus.klingAccessKey !== false && providersStatus.klingSecretKey !== false;
    }
    return providersStatus[m.provider] !== false;
  });

  // Load history + customs + providers keys status
  useEffect(() => {
    try {
      const h = localStorage.getItem(HISTORY_KEY);
      if (h) setHistory(JSON.parse(h));
    } catch {}
    fetch('/api/byok/characters/register')
      .then(r => r.json())
      .then(data => setCustomBank(data.characters || []))
      .catch(() => {});
    // Providers configured → filter available models
    fetch('/api/byok/settings/keys')
      .then(r => r.json())
      .then(data => setProvidersStatus(data || {}))
      .catch(() => {});
  }, []);

  const pushHistory = (entry) => {
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Build refs from @mentions + active character + bible fallback
  const allChars = [...CHARACTERS, ...customBank];
  const { mentions } = parseMentions(prompt, allChars);
  const cap = useNanoBanana2 ? 14 : 4;

  const buildRefs = () => {
    const refs = [];
    // 1. @mentions dans le prompt (priorité max)
    if (mentions.length > 0) {
      for (const r of mentionsToRefs(mentions, cap - refs.length)) refs.push(r);
    }
    // 2. Active character (global lock cross-studios)
    if (activeChar && refs.length < cap && !mentions.some(m => m.char.id === activeChar.id)) {
      if (activeChar.refUrl) {
        refs.push({ url: activeChar.refUrl, role: 'face', characterId: activeChar.id, label: activeChar.name, reason: 'active character lock' });
      } else if (Array.isArray(activeChar.refUrls)) {
        for (const url of activeChar.refUrls) {
          if (refs.length >= cap) break;
          refs.push({ url, role: 'custom-character', characterId: activeChar.id, label: activeChar.name });
        }
      }
    }
    return refs.slice(0, cap);
  };

  const buildFinalPrompt = () => {
    const parts = [];
    const refs = buildRefs();
    if (refs.length) parts.push('NEW SCENE described below. Reference images = FACE IDENTITY ANCHORS only, preserve identity, ignore refs background/pose.');
    parts.push(prompt);
    const cp = CAMERA_PRESETS.find(p => p.id === cameraPreset);
    if (cp?.promptHint) parts.push(cp.promptHint);
    const sh = buildStyleHint(styleBundle);
    if (sh) parts.push(sh);
    return parts.filter(Boolean).join('. ');
  };

  const generateOne = async (seed) => {
    const refs = buildRefs();
    const finalPrompt = buildFinalPrompt();
    // AI Director pattern : on route vers le modèle choisi, on ne génère rien nous-même.
    const model = activeModel;
    if (mode === 'image') {
      const resp = await fetch('/api/byok/generate/image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt, aspectRatio, seed,
          forceProvider: model.provider,
          modelHint: model.modelHint,
          refs: refs.length ? refs : undefined,
        }),
      });
      const d = await resp.json();
      if (!resp.ok || d.status !== 'succeeded') throw new Error(d.error || 'gen failed');
      return { url: d.assets?.[0]?.url, kind: 'image', provider: d.providerId, model: model.label, seed, prompt: finalPrompt, mentions: mentions.map(m => m.char.name), refCount: refs.length };
    } else {
      // Si on a des mentions avec element_id Kling locked, envoyer comme elementIds (Kling Omni)
      const elementIds = mentions.map(m => m.char.element || m.char.klingElementId).filter(Boolean);
      const resp = await fetch('/api/byok/generate/video', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt, aspectRatio, duration,
          forceProvider: model.provider,
          modelHint: model.modelHint,
          elementIds: elementIds.length ? elementIds : undefined,
        }),
      });
      const d = await resp.json();
      if (!resp.ok || d.status !== 'succeeded') throw new Error(d.error || 'gen failed');
      return { url: d.assets?.[0]?.url, kind: 'video', provider: d.providerId, model: model.label, duration, prompt: finalPrompt, mentions: mentions.map(m => m.char.name), elementIds };
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.length < 5) { setError('Prompt trop court'); return; }
    setRunning(true); setError(null);
    try {
      const shotsCount = multiShot ? 4 : 1;
      const seeds = Array.from({ length: shotsCount }, () => Math.floor(Math.random() * 1_000_000));
      for (const seed of seeds) {
        const entry = await generateOne(seed);
        pushHistory({ ...entry, id: `g${Date.now()}_${seed}`, timestamp: Date.now() });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="col" style={{ minHeight: '100%', position: 'relative', background: 'var(--bg-0)' }}>
      {/* Header inline mini */}
      <div className="row hairline-b" style={{ padding: '10px 24px', gap: 12, alignItems: 'center' }}>
        <span className="section-label gold">Cinema Studio · IVAMIND 3.0</span>
        <div style={{ flex: 1 }} />
        <div className="tabs">
          {MODE_OPTIONS.map(m => (
            <button key={m} onClick={() => setMode(m)} className={mode === m ? 'active' : ''}>
              {m === 'image' ? <I.image size={11} /> : <I.video size={11} />} {m}
            </button>
          ))}
        </div>
        <span className="t-mono t-11 muted-2">{history.length} gen · {cap} refs max</span>
      </div>

      {/* Gallery masonry — Higgsfield-style */}
      <div className="col grow" style={{ padding: '16px 24px 220px', overflow: 'auto' }}>
        {history.length === 0 ? (
          <div className="col" style={{ minHeight: 400, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <I.sparkle size={36} style={{ color: 'var(--gold)', opacity: 0.5 }} />
            <span className="t-display t-20 muted">What would you shoot with infinite budget?</span>
            <span className="t-12 muted-2">Tape ton prompt en bas. Utilise <span className="t-mono gold">@omar</span> / <span className="t-mono gold">@soukaina</span> pour auto-lock tes persos.</span>
          </div>
        ) : (
          <div style={{ columnCount: 3, columnGap: 12 }}>
            {history.map(h => (
              <div
                key={h.id}
                onClick={() => setFocusedId(h.id)}
                style={{
                  breakInside: 'avoid',
                  marginBottom: 12,
                  borderRadius: 'var(--r-3)',
                  overflow: 'hidden',
                  border: '1px solid ' + (focusedId === h.id ? 'var(--gold)' : 'var(--border-700)'),
                  background: 'var(--bg-2)',
                  cursor: 'pointer',
                }}
              >
                {h.kind === 'video' ? (
                  <video src={h.url} controls style={{ width: '100%', display: 'block' }} />
                ) : (
                  <img src={h.url} alt={h.prompt?.slice(0, 30)} style={{ width: '100%', display: 'block' }} />
                )}
                <div className="col gap-1" style={{ padding: '6px 8px' }}>
                  <span className="t-11" style={{ lineHeight: 1.3 }}>{h.prompt?.slice(0, 80)}{h.prompt?.length > 80 ? '…' : ''}</span>
                  <div className="row gap-2">
                    <span className="t-mono t-11 gold">{h.provider}</span>
                    {h.mentions?.length > 0 && <span className="t-11 muted-2">🔒 {h.mentions.join(', ')}</span>}
                    {h.kind === 'video' && <span className="t-11 muted-2">🎬 {h.duration}s</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ FLOATING DIRECTOR PANEL ═══ */}
      <div style={{
        position: 'fixed',
        left: 300,
        right: 20,
        bottom: 20,
        background: 'var(--bg-1)',
        border: '1px solid var(--gold)',
        borderRadius: 'var(--r-4)',
        padding: 14,
        boxShadow: '0 20px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(249,178,51,.15)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 40,
      }}>
        <div className="col gap-3">
          {/* Top row : character avatars + prompt */}
          <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
            {/* Character avatars slots (active + mentions) */}
            <div className="row gap-2 no-shrink" style={{ paddingTop: 2 }}>
              <CharSlot char={activeChar} onClear={() => setActiveCharacter(null)} primary />
              {mentions.slice(0, 2).map((m, i) => (
                <CharSlot key={i} char={m.char} small />
              ))}
              {!activeChar && mentions.length === 0 && (
                <Link href="/ivamind/characters" title="Pick active character"
                  style={{ width: 44, height: 44, borderRadius: '50%', border: '2px dashed var(--border-500)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    textDecoration: 'none', color: 'var(--text-3)', flexShrink: 0 }}>
                  <I.plus size={16} />
                </Link>
              )}
            </div>

            {/* Prompt textarea */}
            <div className="col grow gap-1">
              <textarea
                value={prompt}
                onChange={e => { setPrompt(e.target.value); setError(null); }}
                placeholder="Describe your shot. Use @omar / @soukaina / @radoine to auto-lock characters…"
                rows={2}
                className="input"
                style={{
                  padding: 10, fontSize: 13, lineHeight: 1.5,
                  background: 'var(--bg-2)', border: '1px solid var(--border-700)',
                  borderRadius: 'var(--r-2)', color: 'var(--text-0)',
                  fontFamily: 'var(--f-sans)', resize: 'none',
                }}
              />
              {error && <span className="t-11" style={{ color: 'var(--red)' }}>⚠ {error}</span>}
            </div>

            {/* Generate big CTA */}
            <button
              className="btn btn-primary no-shrink"
              onClick={handleGenerate}
              disabled={running || !prompt.trim()}
              style={{
                fontSize: 14, padding: '14px 24px', height: 'auto',
                boxShadow: running ? 'none' : '0 0 30px rgba(249,178,51,.4)',
                opacity: (running || !prompt.trim()) ? 0.6 : 1,
                minWidth: 140, justifyContent: 'center',
              }}
            >
              {running ? <I.refresh size={14} /> : <I.sparkle size={14} />}
              {running ? 'Shooting…' : 'Generate'}
              {!running && <Kbd>⌘↵</Kbd>}
            </button>
          </div>

          {/* Bottom tags row — Director Panel tags */}
          <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
            {/* AI Director pattern : sélecteur MODÈLE sous-jacent — filtré par clés API configurées */}
            {mode === 'image' ? (
              availableImageModels.length > 0 ? (
                <TagSelect label="Model" value={imageModelId} onChange={setImageModelId}
                  options={availableImageModels.map(m => ({ value: m.id, label: `${m.label} · ${m.cost}` }))} />
              ) : (
                <Link href="/ivamind/settings" className="row gap-2" style={{
                  padding: '6px 12px', borderRadius: 999,
                  border: '1px solid var(--red)', background: 'rgba(229,72,77,0.12)',
                  color: 'var(--red)', fontSize: 11, textDecoration: 'none',
                }}>⚠ Aucun modèle image configuré → Settings</Link>
              )
            ) : (
              availableVideoModels.length > 0 ? (
                <TagSelect label="Model" value={videoModelId} onChange={setVideoModelId}
                  options={availableVideoModels.map(m => ({ value: m.id, label: `${m.label} · ${m.cost}` }))} />
              ) : (
                <Link href="/ivamind/settings" className="row gap-2" style={{
                  padding: '6px 12px', borderRadius: 999,
                  border: '1px solid var(--red)', background: 'rgba(229,72,77,0.12)',
                  color: 'var(--red)', fontSize: 11, textDecoration: 'none',
                }}>⚠ Aucun modèle vidéo configuré → Settings</Link>
              )
            )}
            <TagSelect label="Movement" value={cameraPreset} onChange={setCameraPreset}
              options={[{ value: '', label: 'Static framing' }, ...CAMERA_PRESETS.filter(p => p.category === 'static').map(p => ({ value: p.id, label: p.label }))]} />
            <TagSelect label="Style" value={styleBundle} onChange={setStyleBundle}
              options={STYLE_BUNDLES.map(b => ({ value: b.id, label: b.label }))} />
            <TagSelect label="Aspect" value={aspectRatio} onChange={setAspectRatio}
              options={ASPECT_OPTIONS.map(a => ({ value: a.id, label: a.label }))} />
            {mode === 'video' && (
              <TagSelect label="Duration" value={duration} onChange={v => setDuration(Number(v))}
                options={[{ value: 5, label: '5s' }, { value: 10, label: '10s' }]} />
            )}
            <Tag onClick={() => setMultiShot(v => !v)} active={multiShot}>
              Multi-shot × 4 {multiShot ? '✓' : '—'}
            </Tag>
            <div style={{ flex: 1 }} />
            <span className="t-11 muted-2" style={{ alignSelf: 'center', display: 'flex', gap: 8 }}>
              <span>{buildRefs().length}/{cap} refs</span>
              <span>·</span>
              <span>{mentions.length} @mentions</span>
              <span>·</span>
              <span className="gold t-mono">→ {activeModel.provider}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CharSlot({ char, onClear, primary, small }) {
  if (!char) return null;
  const size = small ? 34 : 44;
  const pic = char.refUrl || char.refUrls?.[0];
  return (
    <div style={{ position: 'relative' }} title={char.name}>
      {pic ? (
        <img src={pic} alt={char.name} style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          border: '2px solid ' + (primary ? 'var(--gold)' : 'var(--border-500)'),
        }} />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: 'var(--bg-3)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700,
          border: '2px solid ' + (primary ? 'var(--gold)' : 'var(--border-500)'),
        }}>{char.name[0]}</div>
      )}
      {primary && onClear && (
        <button onClick={onClear} title="Unlock"
          style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%',
            background: 'rgba(10,10,18,.9)', color: 'var(--gold)', border: '1px solid var(--gold)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, padding: 0, lineHeight: 1,
          }}>×</button>
      )}
    </div>
  );
}

function Tag({ children, onClick, active }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px', borderRadius: 999,
      border: '1px solid ' + (active ? 'var(--gold)' : 'var(--border-600)'),
      background: active ? 'var(--gold-ghost)' : 'var(--bg-2)',
      color: active ? 'var(--gold)' : 'var(--text-1)',
      fontSize: 11, cursor: 'pointer', fontFamily: 'var(--f-sans)',
      whiteSpace: 'nowrap',
    }}>{children}</button>
  );
}

function TagSelect({ label, value, onChange, options }) {
  return (
    <label className="row gap-2" style={{
      padding: '6px 12px 6px 10px', borderRadius: 999,
      border: '1px solid var(--border-600)', background: 'var(--bg-2)',
      fontSize: 11, cursor: 'pointer',
    }}>
      <span className="t-mono" style={{ color: 'var(--text-3)' }}>{label}</span>
      <select value={value || ''} onChange={e => onChange(e.target.value || null)}
        style={{ background: 'none', border: 'none', color: 'var(--text-0)', outline: 'none', cursor: 'pointer', fontFamily: 'var(--f-sans)', fontSize: 11 }}>
        {options.map(o => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
