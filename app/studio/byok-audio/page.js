'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/src/store/settingsStore';

const GOLD = '#f9b233';
const BG = '#0a0a12';

export default function ByokAudioPage() {
  const activeKeys = useSettingsStore((s) => s.activeKeys);

  // TTS state
  const [text, setText] = useState('Dans un supermarché ordinaire, une mère cherche les centimes qui lui manquent.');
  const [voice, setVoice] = useState('ivamind-narrator-fr');
  const [language, setLanguage] = useState('fr');
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsResult, setTtsResult] = useState(null);
  const [ttsError, setTtsError] = useState('');

  // STT state
  const [audioUrl, setAudioUrl] = useState('');
  const [sttFile, setSttFile] = useState(null);
  const [sttLoading, setSttLoading] = useState(false);
  const [sttResult, setSttResult] = useState(null);
  const [sttError, setSttError] = useState('');
  const [sttLang, setSttLang] = useState('fr');

  async function doTTS() {
    setTtsLoading(true);
    setTtsError('');
    setTtsResult(null);
    try {
      const res = await fetch('/api/byok/generate/audio/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerKeys: activeKeys(),
          text,
          voice,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setTtsResult(data);
    } catch (err) {
      setTtsError(err.message);
    } finally {
      setTtsLoading(false);
    }
  }

  async function doSTT() {
    setSttLoading(true);
    setSttError('');
    setSttResult(null);
    try {
      let res;
      if (sttFile) {
        const form = new FormData();
        form.append('file', sttFile);
        form.append('providerKeys', JSON.stringify(activeKeys()));
        form.append('language', sttLang);
        form.append('model', 'scribe_v1');
        res = await fetch('/api/byok/generate/audio/stt', { method: 'POST', body: form });
      } else {
        res = await fetch('/api/byok/generate/audio/stt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerKeys: activeKeys(), audioUrl, language: sttLang, model: 'scribe_v1' }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSttResult(data);
    } catch (err) {
      setSttError(err.message);
    } finally {
      setSttLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: BG, color: '#e7e7ec', padding: '48px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ color: GOLD, fontSize: 28, fontWeight: 700 }}>BYOK · Audio (TTS + STT)</h1>

        <section style={{ marginTop: 24, padding: 16, background: '#111118', borderRadius: 8, border: '1px solid #2a2a35' }}>
          <h2 style={{ color: GOLD, marginBottom: 12 }}>TTS — Fish Audio</h2>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
            style={{ width: '100%', padding: 12, background: '#0a0a12', color: '#fff', border: '1px solid #333', borderRadius: 6, fontFamily: 'ui-monospace, monospace' }} />
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <select value={voice} onChange={(e) => setVoice(e.target.value)}
              style={{ padding: '8px 12px', background: '#0a0a12', color: '#fff', border: '1px solid #333', borderRadius: 6 }}>
              <option value="ivamind-narrator-fr">ivamind-narrator-fr (1.18x)</option>
              <option value="kronos-narrator-fr">kronos-narrator-fr (1.10x)</option>
              <option value="ivamind-narrator-en">ivamind-narrator-en (1.20x)</option>
            </select>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              style={{ padding: '8px 12px', background: '#0a0a12', color: '#fff', border: '1px solid #333', borderRadius: 6 }}>
              <option value="fr">fr</option>
              <option value="en">en</option>
            </select>
            <button onClick={doTTS} disabled={ttsLoading}
              style={{ background: GOLD, color: BG, border: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
              {ttsLoading ? 'Generating…' : 'Generate TTS'}
            </button>
          </div>
          {ttsError && <pre style={{ marginTop: 12, color: '#ff6b6b', padding: 12, background: '#1a0a0a', borderRadius: 6 }}>{ttsError}</pre>}
          {ttsResult?.assets?.[0] && (
            <audio src={ttsResult.assets[0].url} controls style={{ width: '100%', marginTop: 12 }} />
          )}
        </section>

        <section style={{ marginTop: 24, padding: 16, background: '#111118', borderRadius: 8, border: '1px solid #2a2a35' }}>
          <h2 style={{ color: GOLD, marginBottom: 12 }}>STT — ElevenLabs Scribe (word-level)</h2>
          <input value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="Audio URL or /byok-output/fish/…mp3"
            style={{ width: '100%', padding: 10, background: '#0a0a12', color: '#fff', border: '1px solid #333', borderRadius: 6 }} />
          <div style={{ marginTop: 8 }}>
            <input type="file" accept="audio/*" onChange={(e) => setSttFile(e.target.files?.[0] || null)} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <select value={sttLang} onChange={(e) => setSttLang(e.target.value)}
              style={{ padding: '8px 12px', background: '#0a0a12', color: '#fff', border: '1px solid #333', borderRadius: 6 }}>
              <option value="fr">fr</option>
              <option value="en">en</option>
            </select>
            <button onClick={doSTT} disabled={sttLoading}
              style={{ background: GOLD, color: BG, border: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
              {sttLoading ? 'Transcribing…' : 'Transcribe'}
            </button>
          </div>
          {sttError && <pre style={{ marginTop: 12, color: '#ff6b6b', padding: 12, background: '#1a0a0a', borderRadius: 6 }}>{sttError}</pre>}
          {sttResult && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: '#eee', marginBottom: 8 }}>
                <b>{sttResult.meta?.wordCount ?? 0}</b> words · lang: {sttResult.meta?.language || '—'}
              </div>
              <div style={{ background: '#0a0a12', padding: 12, borderRadius: 6, color: '#ddd', fontSize: 14 }}>
                {sttResult.meta?.text}
              </div>
              <details style={{ marginTop: 12 }}>
                <summary style={{ color: '#888', cursor: 'pointer' }}>Words JSON</summary>
                <pre style={{ fontSize: 11, color: '#aaa', whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>
                  {JSON.stringify(sttResult.meta?.words?.slice(0, 40), null, 2)}
                </pre>
              </details>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
