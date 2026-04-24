'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/src/store/settingsStore';

const GOLD = '#f9b233';
const BG = '#0a0a12';

const SECTIONS = [
  { slot: 'gemini', label: 'Gemini (Google Generative AI)', type: 'single', hint: 'GEMINI_API_KEY — image i2i/t2i' },
  { slot: 'klingAccessKey', label: 'Kling — Access Key', type: 'single', hint: 'KLING_ACCESS_KEY — used for JWT signing' },
  { slot: 'klingSecretKey', label: 'Kling — Secret Key', type: 'single', hint: 'KLING_SECRET_KEY — JWT HS256 secret' },
  { slot: 'seedance', label: 'Seedance (ByteDance Volcano Ark)', type: 'single', hint: 'Stub — not yet implemented' },
  { slot: 'fish', label: 'Fish Audio (TTS)', type: 'single', hint: 'FISH_API_KEY — canonical IVAMIND narrator voices' },
  { slot: 'elevenlabs', label: 'ElevenLabs (STT Scribe + backup TTS)', type: 'single', hint: 'ELEVENLABS_API_KEY — word-level STT' },
  { slot: 'muapi', label: 'Muapi fallback (exotic models)', type: 'single', hint: 'MUAPI_API_KEY — Nano Banana 2 / Flux Kontext' },
];

export default function ByokSettingsPage() {
  const { keys, setKey, persistToServer, fetchServerStatus } = useSettingsStore();
  const [serverStatus, setServerStatus] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchServerStatus().then((res) => setServerStatus(res.configured || {})).catch(() => {});
  }, [fetchServerStatus]);

  async function onSave() {
    setSaving(true);
    setMsg('');
    try {
      const res = await persistToServer();
      setMsg(`Saved to ${res.envFile} (${res.written?.length || 0} keys written).`);
      const st = await fetchServerStatus();
      setServerStatus(st.configured || {});
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: BG,
        color: '#e7e7ec',
        padding: '48px 24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ color: GOLD, fontSize: 28, fontWeight: 700, marginBottom: 8 }}>IVAMIND Studio — BYOK Settings</h1>
        <p style={{ color: '#888', marginBottom: 32 }}>
          Stored in localStorage + mirrored to <code>.env.local</code> on save. Keys never leave your machine.
        </p>

        {SECTIONS.map((s) => (
          <section
            key={s.slot}
            style={{
              border: '1px solid #2a2a35',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
              background: '#111118',
            }}
          >
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
              {s.label}{' '}
              <span
                style={{
                  color: serverStatus[s.slot] ? GOLD : '#555',
                  fontSize: 12,
                  fontWeight: 400,
                  marginLeft: 8,
                }}
              >
                {serverStatus[s.slot] ? '● server-configured' : '○ not set on server'}
              </span>
            </label>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>{s.hint}</div>
            <input
              type="password"
              autoComplete="new-password"
              value={keys[s.slot] || ''}
              onChange={(e) => setKey(s.slot, e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0a0a12',
                border: '1px solid #333',
                borderRadius: 6,
                color: '#fff',
                fontFamily: 'ui-monospace, monospace',
                fontSize: 13,
              }}
              placeholder={`Paste ${s.label} here…`}
            />
          </section>
        ))}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 24 }}>
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              background: GOLD,
              color: BG,
              border: 'none',
              padding: '12px 24px',
              borderRadius: 6,
              fontWeight: 700,
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save to .env.local'}
          </button>
          {msg && <span style={{ color: '#aaa', fontSize: 13 }}>{msg}</span>}
        </div>

        <div style={{ marginTop: 32, fontSize: 12, color: '#666' }}>
          Sprint 1.1 · <a href="/studio/byok-image" style={{ color: GOLD }}>→ BYOK Image</a> ·{' '}
          <a href="/studio/byok-video" style={{ color: GOLD }}>→ BYOK Video</a> ·{' '}
          <a href="/studio/byok-audio" style={{ color: GOLD }}>→ BYOK Audio</a>
        </div>
      </div>
    </main>
  );
}
