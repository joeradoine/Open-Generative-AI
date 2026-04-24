'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/src/store/settingsStore';

const GOLD = '#f9b233';
const BG = '#0a0a12';

export default function ByokVideoPage() {
  const activeKeys = useSettingsStore((s) => s.activeKeys);
  const [prompt, setPrompt] = useState('a slow push-in on an old mosque at dawn, golden light, volumetric dust, seinen manga style');
  const [startFrameUrl, setStartFrameUrl] = useState('');
  const [elementIdsText, setElementIdsText] = useState('');
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [mode, setMode] = useState('standard');
  const [soundOn, setSoundOn] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function submit() {
    setError('');
    setResult(null);
    setStatus('submitting');
    try {
      const elementIds = elementIdsText.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await fetch('/api/byok/generate/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerKeys: activeKeys(),
          prompt,
          startFrameUrl: startFrameUrl || undefined,
          duration,
          aspectRatio,
          mode,
          elementIds: elementIds.length ? elementIds : undefined,
          soundOn,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setJobId(data.jobId);
      setStatus(data.status);
      setResult(data);
    } catch (err) {
      setError(err.message);
      setStatus('failed');
    }
  }

  useEffect(() => {
    if (!jobId || !status || status === 'succeeded' || status === 'failed') return undefined;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/byok/poll/${encodeURIComponent(jobId)}`);
        const data = await res.json();
        if (!res.ok) {
          setStatus('failed');
          setError(data.error || 'Poll failed');
          return;
        }
        setStatus(data.status);
        if (data.status === 'succeeded' || data.status === 'failed') {
          setResult((prev) => ({ ...(prev || {}), ...data }));
          if (data.error) setError(data.error);
        }
      } catch (err) {
        setError(err.message);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [jobId, status]);

  return (
    <main style={{ minHeight: '100vh', background: BG, color: '#e7e7ec', padding: '48px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ color: GOLD, fontSize: 28, fontWeight: 700 }}>BYOK · Video (Kling)</h1>
        <p style={{ color: '#888', marginBottom: 24 }}>
          Router picks <code>kling-v3-omni</code> if elementIds or mode=pro; else <code>kling-v3</code>.
        </p>

        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Prompt</label>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4}
          style={{ width: '100%', padding: 12, background: '#111118', color: '#fff', border: '1px solid #333', borderRadius: 6, fontFamily: 'ui-monospace, monospace' }} />

        <label style={{ display: 'block', marginTop: 16, marginBottom: 8, fontWeight: 600 }}>Start Frame URL (optional → i2v)</label>
        <input value={startFrameUrl} onChange={(e) => setStartFrameUrl(e.target.value)} placeholder="https://…/frame.png"
          style={{ width: '100%', padding: 10, background: '#111118', color: '#fff', border: '1px solid #333', borderRadius: 6 }} />

        <label style={{ display: 'block', marginTop: 16, marginBottom: 8, fontWeight: 600 }}>Element IDs (comma-separated, enables character-lock)</label>
        <input value={elementIdsText} onChange={(e) => setElementIdsText(e.target.value)} placeholder="308527690409318"
          style={{ width: '100%', padding: 10, background: '#111118', color: '#fff', border: '1px solid #333', borderRadius: 6 }} />

        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Duration (s)</label>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}
              style={{ padding: '8px 12px', background: '#111118', color: '#fff', border: '1px solid #333', borderRadius: 6 }}>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Aspect</label>
            <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}
              style={{ padding: '8px 12px', background: '#111118', color: '#fff', border: '1px solid #333', borderRadius: 6 }}>
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}
              style={{ padding: '8px 12px', background: '#111118', color: '#fff', border: '1px solid #333', borderRadius: 6 }}>
              <option value="standard">standard (4u/5s)</option>
              <option value="pro">pro (10u/5s)</option>
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={soundOn} onChange={(e) => setSoundOn(e.target.checked)} />
              sound on
            </label>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={status === 'submitting' || status === 'running'}
          style={{ marginTop: 24, background: GOLD, color: BG, border: 'none', padding: '12px 24px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
        >
          {status === 'running' ? 'Polling…' : status === 'submitting' ? 'Submitting…' : 'Submit'}
        </button>

        {jobId && (
          <div style={{ marginTop: 16, color: '#888', fontSize: 12 }}>
            jobId: {jobId} · status: <b style={{ color: GOLD }}>{status}</b>
          </div>
        )}

        {error && (
          <pre style={{ marginTop: 24, color: '#ff6b6b', background: '#1a0a0a', padding: 16, borderRadius: 6, whiteSpace: 'pre-wrap' }}>{error}</pre>
        )}

        {result?.assets && result.assets.length > 0 && (
          <div style={{ marginTop: 24 }}>
            {result.assets.slice(0, 1).map((a) => (
              <video key={a.url} src={a.url} controls style={{ width: '100%', borderRadius: 6, border: '1px solid #333' }} />
            ))}
            <details style={{ marginTop: 12 }}>
              <summary style={{ color: '#888', cursor: 'pointer' }}>Raw JSON</summary>
              <pre style={{ fontSize: 11, color: '#aaa', whiteSpace: 'pre-wrap' }}>{JSON.stringify(result, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
    </main>
  );
}
