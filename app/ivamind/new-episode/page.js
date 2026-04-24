'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { I, Kbd } from '@/src/components/studio-chrome';

const THEME_SUGGESTIONS = [
  { label: 'Zakat d\'un enfant', theme: 'Un enfant de 7 ans qui donne toute sa tirelire à un SDF pendant qu\'un millionnaire indifférent passe devant sans un regard — ce que le petit sait sur la richesse que l\'adulte a oublié.' },
  { label: 'Tawakkul — lâcher-prise', theme: 'Le jour où Omar a lâché. Pas de calcul, pas de plan B. Juste Tawakkul. Et ce qui s\'est passé ensuite aurait fait rire son père dix ans plus tôt.' },
  { label: 'Dignité silencieuse', theme: 'Une mère qui garde son hijab propre en faisant deux jobs de nuit. Personne ne voit l\'effort. Sauf Un.' },
  { label: 'Dhikr du petit frère', theme: 'Zayed, 4 ans, répète Allah Allah sans comprendre. Mais quand son cœur bat plus fort que ses mots, quelque chose se passe que personne ne remarque.' },
  { label: 'Le voisin ignoré', theme: 'Tous les jours la même porte. Jamais ouverte. Le jour où Issa a décidé de sonner a changé trois vies d\'un seul geste.' },
];

// Pipeline IVAMIND V7 — 9 étapes avec gates de validation humaine
const PIPELINE = [
  { id: 'research',   label: '0. Recherche triangulée',       icon: I.search,  cost: '$0.05', eta: '15s', provider: 'Perplexity Sonar Pro + Vault Obsidian + TikTok scrap (stub)' },
  { id: 'script',     label: '1. Script Whistledown-Manga',   icon: I.sparkle, cost: '$0.02', eta: '20s', provider: 'Claude Sonnet 4.6 · bible persos + recherche injectée' },
  { id: 'tts',        label: '2. Voix narrateur TTS',         icon: I.mic,     cost: '$0.15', eta: '10s', provider: 'Fish S1 · Le Narrateur speed 1.18 mono' },
  { id: 'stt',        label: '3. Captions word-level',        icon: I.wave,    cost: '$0.10', eta: '12s', provider: 'ElevenLabs Scribe v2' },
  { id: 'storyboard', label: '4. Storyboard grille 8 panels', icon: I.layers,  cost: '$0.01', eta: '10s', provider: 'Claude Sonnet 4.6 · split script → panels + prompts Gemini', stubbed: true },
  { id: 'images',     label: '5. Images Gemini i2i bible',    icon: I.image,   cost: '$0.40', eta: '2min', provider: 'Gemini 2.5 Flash · 8 panels × 4 variants', stubbed: true },
  { id: 'clips',      label: '6. Clips Kling (motion only)',  icon: I.video,   cost: '0-40u', eta: '3min', provider: 'Kling 3.0 Omni · element_ids bible', stubbed: true },
  { id: 'mix',        label: '7. Audio mix + captions',       icon: I.mix,     cost: '—',     eta: '15s',  provider: 'ISLA stems + SFX + word-sync', stubbed: true },
  { id: 'render',     label: '8. Render Remotion 9:16',       icon: I.video,   cost: '—',     eta: '40s',  provider: 'Remotion · camera 2D · export Hub', stubbed: true },
];

const STORAGE_KEY = 'ivamind:new-episode:v2';

export default function NewEpisodePage() {
  const [theme, setTheme] = useState('');
  const [results, setResults] = useState({}); // { [stepId]: { status, data, error, elapsed } }
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const abortRef = useRef(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) { const p = JSON.parse(s); setTheme(p.theme || ''); setResults(p.results || {}); }
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, results })); } catch {}
  }, [theme, results]);

  const setStep = (id, patch) => setResults(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));

  // Lance UNE étape à la fois. Attend l'approbation Joe avant de passer à la suivante.
  const runStep = async (stepId) => {
    const step = PIPELINE.find(p => p.id === stepId);
    if (!step || running) return;
    if (step.stubbed) {
      setStep(stepId, { status: 'stub' });
      return;
    }

    setRunning(true);
    setCurrentStep(stepId);
    setStep(stepId, { status: 'running', startedAt: Date.now(), error: null });

    try {
      let data;
      if (stepId === 'research') {
        const r = await fetch('/api/byok/research', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme }),
        });
        data = await r.json();
        if (!r.ok) throw new Error(data.error);
      }
      else if (stepId === 'script') {
        const research = results.research?.data;
        const r = await fetch('/api/byok/script/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme, research }),
        });
        data = await r.json();
        if (!r.ok) throw new Error(data.error);
      }
      else if (stepId === 'tts') {
        const scriptData = results.script?.data;
        if (!scriptData?.script) throw new Error('script requis — lance étape 1 d\'abord');
        const r = await fetch('/api/byok/generate/audio/tts', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: scriptData.script, forceProvider: 'fish',
            voiceId: '4f2a0684dd0247dda68f339738c780e6',
            speed: 1.18, language: 'fr', format: 'mp3',
          }),
        });
        data = await r.json();
        if (!r.ok || data.status !== 'succeeded') throw new Error(data.error || 'tts failed');
      }
      else if (stepId === 'stt') {
        const ttsData = results.tts?.data;
        const audioUrl = ttsData?.assets?.[0]?.url;
        if (!audioUrl) throw new Error('TTS requis — lance étape 2 d\'abord');
        const r = await fetch('/api/byok/generate/audio/stt', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioUrl: audioUrl.startsWith('http') ? audioUrl : `${window.location.origin}${audioUrl}`,
            forceProvider: 'elevenlabs', language: 'fr', wordLevel: true,
          }),
        });
        data = await r.json();
        if (!r.ok || data.status !== 'succeeded') throw new Error(data.error || 'stt failed');
      }

      setStep(stepId, { status: 'done', data, elapsed: Date.now() - (results[stepId]?.startedAt || Date.now()) });
    } catch (err) {
      setStep(stepId, { status: 'failed', error: err.message });
    } finally {
      setRunning(false);
      setCurrentStep(null);
    }
  };

  const approveAndNext = (stepId) => {
    setStep(stepId, { approved: true });
    const idx = PIPELINE.findIndex(p => p.id === stepId);
    const next = PIPELINE[idx + 1];
    if (next) runStep(next.id);
  };

  const regen = (stepId) => {
    setResults(prev => {
      const n = { ...prev };
      delete n[stepId];
      // Invalider aussi toutes les étapes après
      const idx = PIPELINE.findIndex(p => p.id === stepId);
      for (let i = idx + 1; i < PIPELINE.length; i++) delete n[PIPELINE[i].id];
      return n;
    });
    runStep(stepId);
  };

  const progress = Object.values(results).filter(r => r.status === 'done').length;
  const failed = Object.values(results).filter(r => r.status === 'failed').length;

  return (
    <div className="row" style={{ minHeight: '100%' }}>
      {/* Colonne gauche : input + run */}
      <div className="col hairline-r no-shrink" style={{ width: 440, padding: '28px 28px', gap: 20, overflow: 'auto' }}>
        <div className="col gap-2">
          <span className="section-label gold">Nouveau épisode · orchestrator</span>
          <h1 className="t-display t-24">Thème → épisode complet</h1>
          <span className="t-13 muted">Tape un thème, click <b>Lancer la pipeline</b>. Les 8 étapes s'enchaînent automatiquement. Tu vois l'ordonnancement en direct à droite.</span>
        </div>

        {/* Suggestions */}
        <div className="col gap-2">
          <span className="t-12 muted-2">Pas d'idée ? Pique une suggestion :</span>
          <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
            {THEME_SUGGESTIONS.map((s, i) => (
              <button key={i}
                onClick={() => setTheme(s.theme)}
                disabled={running}
                style={{
                  padding: '6px 12px', borderRadius: 999,
                  border: '1px solid var(--border-600)',
                  background: theme === s.theme ? 'var(--gold-ghost)' : 'var(--bg-2)',
                  color: theme === s.theme ? 'var(--gold)' : 'var(--text-1)',
                  cursor: running ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                }}>{s.label}</button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <div className="col gap-2">
          <label className="t-12 muted">Thème IVAMIND</label>
          <textarea
            className="input"
            placeholder="Décris une scène concrète + le twist qui rend visible l'action intérieure. Claude transformera ça en script Whistledown-Manga."
            value={theme}
            onChange={e => setTheme(e.target.value)}
            rows={6}
            disabled={running}
            style={{ padding: 12, fontSize: 13, lineHeight: 1.5, minHeight: 130 }}
          />
          <span className="t-11 muted-2">{theme.length} chars · min 10 requis</span>
        </div>

        {/* Run button — commence à research (étape 0) */}
        <div className="row gap-2">
          {!running && !results.research ? (
            <button className="btn btn-primary"
              onClick={() => runStep('research')}
              disabled={!theme || theme.length < 10}
              style={{ fontSize: 14, padding: '10px 18px', opacity: !theme || theme.length < 10 ? 0.5 : 1 }}>
              <I.run size={14} />🚀 Lancer — étape 0 : Recherche
            </button>
          ) : running ? (
            <span className="t-12 muted"><I.refresh size={11} /> {currentStep} en cours…</span>
          ) : (
            <span className="t-12 muted">Valide ou regen à droite pour avancer</span>
          )}
          {Object.keys(results).length > 0 && !running && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setResults({}); }}>
              <I.refresh size={11} />Reset
            </button>
          )}
        </div>

        {/* Status global */}
        <div className="col gap-2 hairline-t" style={{ paddingTop: 16 }}>
          <div className="row gap-3">
            <span className="t-12 muted">Progression</span>
            <div style={{ flex: 1, height: 6, background: 'var(--bg-3)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                width: `${(progress / PIPELINE.length) * 100}%`, height: '100%',
                background: failed > 0 ? 'var(--red)' : 'var(--gold)',
                transition: 'width .3s',
              }} />
            </div>
            <span className="t-mono t-12 gold">{progress} / {PIPELINE.length}</span>
          </div>
          {failed > 0 && <span className="t-11" style={{ color: 'var(--red)' }}>⚠ {failed} étape(s) en échec</span>}
        </div>
      </div>

      {/* Colonne droite : orchestrator timeline */}
      <div className="col grow" style={{ padding: '28px 32px', overflow: 'auto', background: 'var(--bg-0)' }}>
        <div className="row gap-2" style={{ marginBottom: 20 }}>
          <span className="section-label">Pipeline · ordonnancement</span>
          <div style={{ flex: 1 }} />
          <span className="t-11 muted-2 t-mono">8 étapes · ~6 min total</span>
        </div>

        <div className="col gap-3">
          {PIPELINE.map((step) => {
            const r = results[step.id] || { status: 'pending' };
            const isCurrent = currentStep === step.id;

            let statusColor = 'var(--muted-2)';
            let statusLabel = 'pending';
            if (r.status === 'running') { statusColor = 'var(--gold)'; statusLabel = 'running…'; }
            else if (r.status === 'done') { statusColor = 'var(--green)'; statusLabel = 'done'; }
            else if (r.status === 'failed') { statusColor = 'var(--red)'; statusLabel = 'failed'; }
            else if (r.status === 'stub') { statusColor = 'var(--muted)'; statusLabel = 'stubbed · Sprint 1.4'; }

            return (
              <div key={step.id} className="card" style={{
                padding: 14,
                border: '1px solid ' + (isCurrent ? 'var(--gold)' : r.status === 'done' ? 'var(--green)' : 'var(--border-700)'),
                background: isCurrent ? 'var(--bg-1)' : 'var(--bg-2)',
                opacity: step.stubbed && r.status !== 'stub' ? 0.55 : 1,
                transition: 'border-color .15s',
              }}>
                <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  {/* Status dot + icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: statusColor,
                    color: r.status === 'done' || r.status === 'running' ? '#0a0a12' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {r.status === 'running' ? (
                      <I.refresh size={14} />
                    ) : r.status === 'done' ? (
                      <span style={{ fontSize: 18, fontWeight: 700 }}>✓</span>
                    ) : r.status === 'failed' ? (
                      <I.x size={14} />
                    ) : (
                      <step.icon size={14} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="col grow" style={{ gap: 3 }}>
                    <div className="row gap-2">
                      <span className="t-14" style={{ fontWeight: 500 }}>{step.label}</span>
                      <span className="t-mono t-11" style={{ color: statusColor }}>{statusLabel}</span>
                    </div>
                    <span className="t-11 muted-2">
                      {step.provider} · <span className="t-mono">{step.cost}</span> · <span className="t-mono">ETA {step.eta}</span>
                    </span>

                    {/* Résultat inline */}
                    {r.status === 'done' && r.data && (
                      <div className="col" style={{ marginTop: 8, gap: 6 }}>
                        {step.id === 'research' && (
                          <details open className="card" style={{ padding: 10, background: 'var(--bg-1)', maxHeight: 320, overflow: 'auto' }}>
                            <summary className="t-12 muted" style={{ cursor: 'pointer' }}>
                              Recherche · {r.data.summary?.vault_files_found || 0} fichiers vault · Perplexity {r.data.summary?.perplexity_ok ? 'OK' : 'KO'}
                            </summary>
                            {r.data.perplexity?.findings && (
                              <div className="col gap-1" style={{ marginTop: 8 }}>
                                <span className="section-label">Perplexity (web 2026)</span>
                                <div className="t-12 muted" style={{ lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{r.data.perplexity.findings.slice(0, 800)}{r.data.perplexity.findings.length > 800 ? '…' : ''}</div>
                              </div>
                            )}
                            {r.data.vault?.contents?.length > 0 && (
                              <div className="col gap-1" style={{ marginTop: 10 }}>
                                <span className="section-label">Vault — {r.data.vault.contents.length} fichiers chargés</span>
                                {r.data.vault.contents.slice(0, 3).map((c, i) => (
                                  <div key={i} className="col gap-0">
                                    <span className="t-mono t-11 gold">{c.file}</span>
                                    <span className="t-11 muted">{c.excerpt.slice(0, 180)}…</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </details>
                        )}
                        {step.id === 'script' && (
                          <details open className="card" style={{ padding: 10, background: 'var(--bg-1)' }}>
                            <summary className="t-12 muted" style={{ cursor: 'pointer' }}>
                              Script généré · {r.data.meta?.chars} chars · ${r.data.meta?.costUSD}
                            </summary>
                            <div className="t-12" style={{ marginTop: 8, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                              {r.data.script}
                            </div>
                          </details>
                        )}
                        {step.id === 'tts' && (
                          <div className="col gap-2" style={{ marginTop: 4 }}>
                            <audio controls src={r.data.assets?.[0]?.url} style={{ width: '100%', height: 36 }} />
                            <span className="t-11 muted-2 t-mono">{r.data.assets?.[0]?.url}</span>
                          </div>
                        )}
                        {step.id === 'stt' && (
                          <span className="t-11 muted">
                            {r.data.meta?.wordCount || r.data.words?.length || '?'} mots timingués · {r.data.meta?.duration || '?'}s
                          </span>
                        )}

                        {/* Approve + Regen gates */}
                        <div className="row gap-2" style={{ marginTop: 6 }}>
                          {!r.approved && PIPELINE[PIPELINE.findIndex(p => p.id === step.id) + 1] && (
                            <button className="btn btn-primary btn-sm" onClick={() => approveAndNext(step.id)}>
                              <span style={{ fontSize: 11, fontWeight: 700 }}>✓</span>Approve → étape {PIPELINE.findIndex(p => p.id === step.id) + 2}
                            </button>
                          )}
                          <button className="btn btn-secondary btn-sm" onClick={() => regen(step.id)}>
                            <I.refresh size={11} />Regen
                          </button>
                          {r.approved && <span className="t-11" style={{ color: 'var(--green)' }}>✓ approved by Joe</span>}
                        </div>
                      </div>
                    )}
                    {r.status === 'failed' && (
                      <div className="col gap-2" style={{ marginTop: 6 }}>
                        <span className="t-11" style={{ color: 'var(--red)' }}>⚠ {r.error}</span>
                        <button className="btn btn-secondary btn-sm" onClick={() => regen(step.id)} style={{ alignSelf: 'flex-start' }}>
                          <I.refresh size={11} />Retry
                        </button>
                      </div>
                    )}
                    {r.status === 'stub' && (
                      <div className="row gap-2" style={{ marginTop: 6 }}>
                        <Link href={
                          step.id === 'storyboard' ? '/ivamind/storyboard' :
                          step.id === 'images' ? '/ivamind/generate' :
                          '/ivamind/workflow'
                        } className="btn btn-secondary btn-sm">
                          <I.run size={11} />Ouvrir l'écran dédié
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="col hairline-t" style={{ marginTop: 24, paddingTop: 16, gap: 6 }}>
          <span className="t-11 muted-2">
            Étapes 1-3 exécutées automatiquement · étapes 4-8 = Sprint 1.4 (on-screen dédiés ouvrables via sidebar ou bouton de chaque étape stubbée).
            Sauvegardé localement dans ton navigateur.
          </span>
        </div>
      </div>
    </div>
  );
}
