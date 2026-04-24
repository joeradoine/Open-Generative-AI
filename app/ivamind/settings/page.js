'use client';

import { useEffect, useState } from 'react';
import { I } from '@/src/components/studio-chrome';

// Slot names doivent matcher les clés du MAPPED dans /api/byok/settings/keys (lowercase camelCase).
const PROVIDERS = [
  { id: 'gemini',           label: 'Gemini 2.5 / 3.1 Flash Image',  note: 'images BYOK (i2i bible + t2i décors) — Nano Banana 2 = 14 refs' },
  { id: 'klingAccessKey',   label: 'Kling Access Key',               note: 'vidéo 5s Omni/v3 + element_ids personnages' },
  { id: 'klingSecretKey',   label: 'Kling Secret Key',               note: 'signature requêtes Kling (paire avec Access)' },
  { id: 'seedance',         label: 'Seedance 1.0 Pro',               note: 'vidéo ByteDance Volcano Ark — 10× moins cher que Kling Omni' },
  { id: 'fish',             label: 'Fish Audio S1',                  note: 'TTS narrateur (Le Narrateur 4f2a0684 speed 1.18)' },
  { id: 'elevenlabs',       label: 'ElevenLabs Scribe v2',           note: 'STT word-level captions synchro vidéo' },
  { id: 'anthropic',        label: 'Anthropic Claude Sonnet 4.6',    note: 'Script Whistledown-Manga + recherche orchestrator' },
  { id: 'perplexity',       label: 'Perplexity Sonar Pro',           note: 'Recherche web 2026 pour alimenter les scripts' },
  { id: 'apify',            label: 'Apify',                          note: 'TikTok scraping veille (Sprint 1.5)' },
];

export default function SettingsPage() {
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/byok/settings/keys')
      .then(r => r.json())
      .then(data => { setStatus(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  return (
    <div className="col" style={{ padding: '20px 24px', maxWidth: 880, gap: 16 }}>
      <div className="col gap-1">
        <span className="section-label gold">Settings · BYOK</span>
        <h1 className="t-display t-24">Providers API keys</h1>
        <span className="t-12 muted">
          Clés chargées côté serveur depuis <span className="t-mono">.env.local</span> (chmod 600).
          Aucune clé n'est exposée au client — le toggle indique juste si le provider est configured server-side.
        </span>
      </div>

      <div className="col gap-2" style={{ marginTop: 8 }}>
        {PROVIDERS.map(p => {
          const configured = status[p.id];
          return (
            <div key={p.id} className="row gap-3 card" style={{ padding: 14, alignItems: 'center' }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: loading ? 'var(--muted-2)' : configured ? 'var(--green)' : 'var(--red)',
              }} />
              <div className="col grow">
                <span className="t-14" style={{ fontWeight: 500 }}>{p.label}</span>
                <span className="t-11 muted-2 t-mono">{p.id}</span>
                <span className="t-12 muted" style={{ marginTop: 2 }}>{p.note}</span>
              </div>
              <span className="t-11 t-mono" style={{ color: loading ? 'var(--muted-2)' : configured ? 'var(--green)' : 'var(--red)' }}>
                {loading ? 'checking…' : configured ? 'configured' : 'not set'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="col hairline-t" style={{ padding: '14px 0', marginTop: 8, gap: 6 }}>
        <span className="t-12 muted">Rotation clés</span>
        <span className="t-11 muted-2">
          Éditer <span className="t-mono">.env.local</span> puis restart dev server. Les fichiers sont gitignored
          (<span className="t-mono">.env.*</span>) et jamais pushés.
        </span>
      </div>
    </div>
  );
}
