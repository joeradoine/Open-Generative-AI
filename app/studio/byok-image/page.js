'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/src/store/settingsStore';

const GOLD = '#f9b233';
const BG = '#0a0a12';

export default function ByokImagePage() {
  const activeKeys = useSettingsStore((s) => s.activeKeys);
  const [prompt, setPrompt] = useState('a red apple on a white table, cinematic lighting, 9:16');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [refsText, setRefsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function generate() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const refs = refsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3)
        .map((url) => ({ url }));

      const res = await fetch('/api/byok/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerKeys: activeKeys(),
          prompt,
          aspectRatio,
          refs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: BG, color: '#e7e7ec', padding: '48px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ color: GOLD, fontSize: 28, fontWeight: 700 }}>BYOK · Image</h1>
        <p style={{ color: '#888', marginBottom: 24 }}>
          Router picks Gemini (&le;3 refs) or Muapi (&gt;3 refs). Set keys in{' '}
          <a href="/studio/byok-settings" style={{ color: GOLD }}>settings</a>.
        </p>

        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          style={{ width: '100%', padding: 12, background: '#111118', color: '#fff', border: '1px solid #333', borderRadius: 6, fontFamily: 'ui-monospace, monospace' }}
        />

        <label style={{ display: 'block', marginTop: 16, marginBottom: 8, fontWeight: 600 }}>Aspect Ratio</label>
        <select
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value)}
          style={{ padding: '8px 12px', background: '#111118', color: '#fff', border: '1px solid #333', borderRadius: 6 }}
        >
          <option value="1:1">1:1</option>
          <option value="9:16">9:16</option>
          <option value="16:9">16:9</option>
          <option value="3:4">3:4</option>
          <option value="4:3">4:3</option>
        </select>

        <label style={{ display: 'block', marginTop: 16, marginBottom: 8, fontWeight: 600 }}>Reference URLs (one per line, max 3)</label>
        <textarea
          value={refsText}
          onChange={(e) => setRefsText(e.target.value)}
          rows={3}
          placeholder="https://.../face.png"
          style={{ width: '100%', padding: 12, background: '#111118', color: '#fff', border: '1px solid #333', borderRadius: 6, fontFamily: 'ui-monospace, monospace' }}
        />

        <button
          onClick={generate}
          disabled={loading}
          style={{ marginTop: 24, background: GOLD, color: BG, border: 'none', padding: '12px 24px', borderRadius: 6, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Generating…' : 'Generate'}
        </button>

        {error && (
          <pre style={{ marginTop: 24, color: '#ff6b6b', background: '#1a0a0a', padding: 16, borderRadius: 6, whiteSpace: 'pre-wrap' }}>
            {error}
          </pre>
        )}

        {result && (
          <div style={{ marginTop: 24, background: '#111118', padding: 16, borderRadius: 6 }}>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
              provider: <b style={{ color: GOLD }}>{result.providerId}</b> · jobId: {result.jobId} · cost: {result.costUnits ?? '—'} · reason: {result.routerReason}
            </div>
            {result.assets?.map((a) => (
              <img key={a.url} src={a.url} alt="" style={{ width: '100%', borderRadius: 6, marginTop: 8, border: '1px solid #333' }} />
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
