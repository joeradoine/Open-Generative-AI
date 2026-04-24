'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Badge, I, Kbd } from '@/src/components/studio-chrome';

// Fish canonical voices + ElevenLabs backup
const VOICES = [
  { id:'ivamind-fr',  providerId:'fish',       voiceId:'4f2a0684dd0247dda68f339738c780e6', name:'Le Narrateur',         language:'fr', defaultSpeed:1.18, canonical:true, usage:'narrator', notes:'IVAMIND série S1+' },
  { id:'kronos-fr',   providerId:'fish',       voiceId:'7e327849fe89489387cb3e016c714834', name:'Hunter x Hunter Narrateur', language:'fr', defaultSpeed:1.10, canonical:true, usage:'narrator', notes:'Kronos Infinity EP25+' },
  { id:'ivamind-en',  providerId:'fish',       voiceId:'bf322df2096a46f18c579d0baa36f41d', name:'Adrian',               language:'en', defaultSpeed:1.20, canonical:true, usage:'narrator', notes:'EN backup' },
];

const EMOTION_TAGS = [
  { tag:'[whispering]',            label:'Whispering' },
  { tag:'[exhausted, but at peace]', label:'Exhausted but at peace' },
  { tag:'[contemplative]',          label:'Contemplative' },
  { tag:'[grave]',                  label:'Grave' },
];

const DEMO_SCRIPT = `Elle entre dans le magasin.\nSes enfants tirent sa manche.\nLa caissière demande si elle a la carte fidélité.\n\nSoukaina répond doucement qu'elle n'en a pas.\nMais regarde bien.\n\nEn haut, les trois petits. En bas, le tapis qu'elle vient de dérouler.\nQuand la prière commence, la sakina descend.\n\n[whispering] [exhausted, but at peace] Jusqu'à la prochaine confidence. [/whispering]`;

export default function VoicePage() {
  const [script, setScript] = useState(DEMO_SCRIPT);
  const [voice, setVoice] = useState(VOICES[0]);
  const [speed, setSpeed] = useState(1.18);
  const [locked, setLocked] = useState(true);

  const [ttsJob, setTtsJob] = useState(null);   // {status, audioUrl, durationSec, error}
  const [sttJob, setSttJob] = useState(null);   // {status, words, text, match%, error}
  const [running, setRunning] = useState(false);

  const audioRef = useRef(null);

  // Lint live
  const lints = useMemo(() => {
    const out = [];
    if (/\[(short|long)?\s*pause\]/i.test(script)) out.push({ level:'error', msg:'[pause] tags interdits — risque artefacts narrateur FR' });
    if (/\b\d+\b/.test(script)) out.push({ level:'warn', msg:'Chiffres détectés — écrire en lettres pour TTS' });
    if (voice.language === 'fr' && !/[éèêëàâùûôîïç]/.test(script)) out.push({ level:'warn', msg:'Aucun accent FR détecté — TTS peut halluciner' });
    if (script.length < 50) out.push({ level:'warn', msg:'Script court (<50 chars)' });
    return out;
  }, [script, voice]);
  const blocking = lints.some(l => l.level === 'error');

  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;

  const generateTTS = async () => {
    if (blocking || running) return;
    setRunning(true); setTtsJob({ status: 'running' }); setSttJob(null);
    try {
      const resp = await fetch('/api/byok/generate/audio/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: script,
          voiceId: voice.voiceId,
          speed,
          language: voice.language,
          forceProvider: 'fish',
        }),
      });
      const data = await resp.json();
      if (data.status !== 'succeeded') throw new Error(data.error || 'TTS failed');
      setTtsJob({
        status: 'succeeded',
        audioUrl: data.assets?.[0]?.url || data.meta?.audioUrl,
        durationSec: data.assets?.[0]?.duration || data.meta?.durationSec,
        cost: data.costUnits,
      });
    } catch (err) {
      setTtsJob({ status: 'failed', error: err.message });
    } finally { setRunning(false); }
  };

  const generateSTT = async () => {
    if (!ttsJob?.audioUrl || running) return;
    setRunning(true); setSttJob({ status: 'running' });
    try {
      const resp = await fetch('/api/byok/generate/audio/stt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: ttsJob.audioUrl,
          language: voice.language,
          wordLevel: true,
        }),
      });
      const data = await resp.json();
      if (data.status !== 'succeeded') throw new Error(data.error || 'STT failed');
      const words = data.meta?.words || [];
      const sttText = data.meta?.text || '';
      // rough match : count words overlap
      const scriptTokens = script.toLowerCase().replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean);
      const sttTokens = words.map(w => w.text.toLowerCase());
      const common = sttTokens.filter(t => scriptTokens.includes(t)).length;
      const matchPct = scriptTokens.length ? Math.round((common / scriptTokens.length) * 100) : 0;
      setSttJob({ status: 'succeeded', words, text: sttText, matchPct, cost: data.costUnits });
    } catch (err) {
      setSttJob({ status: 'failed', error: err.message });
    } finally { setRunning(false); }
  };

  return (
    <div className="col" style={{ minHeight: '100%' }}>
      {/* Sub-header */}
      <div className="col hairline-b" style={{ padding: '16px 24px 14px', gap: 8, background: 'var(--bg-0)' }}>
        <div className="row gap-3">
          <span className="section-label gold">Voice studio</span>
          <span className="muted-2">·</span>
          <span className="t-12 muted">Audio-first pipeline · Fish TTS + ElevenLabs STT</span>
        </div>
        <div className="row gap-3">
          <h1 className="t-20" style={{ fontWeight: 600, letterSpacing: '-0.015em' }}>EP-03 · Tawakkul — le jour où j'ai lâché</h1>
          <Badge variant="blue" icon={I.dot}>Voice</Badge>
        </div>
      </div>

      {/* 3 columns : script (left) · waveform+STT (center) · cast+engine (right) */}
      <div className="row grow" style={{ minHeight: 0, overflow: 'hidden' }}>
        {/* LEFT — script editor */}
        <div className="col hairline-r" style={{ width: 440, background: 'var(--bg-0)', overflow: 'auto' }}>
          <div className="col" style={{ padding: 16, gap: 12 }}>
            <div className="row gap-2">
              <span className="section-label">Script · FR</span>
              <div style={{ flex: 1 }} />
              <span className="t-mono t-11 muted">{wordCount} mots</span>
              <span className="t-mono t-11 muted-2">· target ~1350</span>
            </div>

            <textarea
              className="input"
              value={script}
              onChange={e => setScript(e.target.value)}
              rows={16}
              style={{
                height: 'auto', minHeight: 320, padding: 12,
                fontFamily: 'var(--f-sans)', fontSize: 13, lineHeight: 1.55,
                resize: 'vertical',
              }}
              placeholder="Colle ton script FR… chiffres en lettres · accents obligatoires · pas de [pause] tags"
            />

            {/* Lint panel */}
            {lints.length > 0 && (
              <div className="card" style={{ padding: 10, gap: 6 }}>
                {lints.map((l, i) => (
                  <div key={i} className="row gap-2 t-12" style={{ marginBottom: 4 }}>
                    <span style={{
                      color: l.level === 'error' ? 'var(--red)' : 'var(--gold)',
                      fontFamily: 'var(--f-mono)', fontSize: 10,
                    }}>{l.level === 'error' ? 'ERR' : 'WARN'}</span>
                    <span className="muted">{l.msg}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Emotion chips helper */}
            <div className="col gap-2">
              <span className="section-label">Tags émotionnels (à coller)</span>
              <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                {EMOTION_TAGS.map(t =>
                  <button key={t.tag} className="pill"
                    onClick={() => setScript(s => s + (s.endsWith('\n') ? '' : '\n') + t.tag)}>
                    <span className="t-mono t-11">{t.tag}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Voice controls */}
            <div className="col gap-2" style={{ marginTop: 8 }}>
              <span className="section-label">Voice</span>
              <div className="col gap-1">
                {VOICES.map(v => (
                  <button key={v.id}
                    onClick={() => { setVoice(v); if (locked) setSpeed(v.defaultSpeed); }}
                    className="row gap-2"
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--r-2)',
                      border: '1px solid ' + (voice.id === v.id ? 'var(--gold)' : 'var(--border-700)'),
                      background: voice.id === v.id ? 'var(--gold-ghost)' : 'var(--bg-2)',
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                    <div className="col grow" style={{ gap: 1, alignItems: 'flex-start' }}>
                      <span className="t-13" style={{ fontWeight: voice.id === v.id ? 500 : 400 }}>{v.name}</span>
                      <span className="t-11 muted">{v.notes}</span>
                    </div>
                    <span className="badge badge-neutral">{v.language.toUpperCase()}</span>
                    {v.canonical && <Badge variant="gold">canonical</Badge>}
                  </button>
                ))}
              </div>
            </div>

            <div className="col gap-2" style={{ marginTop: 6 }}>
              <div className="row gap-2">
                <span className="section-label">Speed</span>
                <div style={{ flex: 1 }} />
                <span className="t-mono t-13 gold">{speed.toFixed(2)}×</span>
                <button className="iconbtn" title={locked ? 'Unlock speed' : 'Lock IVAMIND speed'}
                  onClick={() => setLocked(l => !l)}>
                  {locked ? '🔒' : '🔓'}
                </button>
              </div>
              <input type="range" min={0.8} max={1.4} step={0.02}
                value={speed} disabled={locked}
                onChange={e => setSpeed(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--gold)' }} />
              {locked && <span className="t-11 muted-2">Speed verrouillé à {voice.defaultSpeed}× (canonical IVAMIND)</span>}
            </div>

            <button
              onClick={generateTTS}
              disabled={blocking || running}
              className={blocking ? 'btn btn-destructive btn-lg' : 'btn btn-primary btn-lg'}
              style={{ marginTop: 8, justifyContent: 'center', gap: 8 }}>
              {running ? <I.refresh size={14} /> : <I.play size={14} />}
              {blocking
                ? `Bloqué — ${lints.filter(l => l.level === 'error').length} erreur(s)`
                : running ? 'Generating TTS…' : 'Generate TTS'}
              <Kbd>⌘↵</Kbd>
            </button>
          </div>
        </div>

        {/* CENTER — waveform + STT */}
        <div className="col grow hairline-r" style={{ minWidth: 0, overflow: 'auto', background: 'var(--bg-0)' }}>
          <div className="col" style={{ padding: 16, gap: 16 }}>
            {/* Audio player + waveform */}
            <div className="card" style={{ padding: 14 }}>
              <div className="row gap-2" style={{ marginBottom: 10 }}>
                <span className="section-label">TTS output</span>
                {ttsJob?.status === 'succeeded' && <Badge variant="green" icon={I.dot}>succeeded</Badge>}
                {ttsJob?.status === 'running' && <Badge variant="blue" icon={I.dot}>generating…</Badge>}
                {ttsJob?.status === 'failed' && <Badge variant="red" icon={I.dot}>failed</Badge>}
                <div style={{ flex: 1 }} />
                {ttsJob?.durationSec && <span className="t-mono t-11 muted">{ttsJob.durationSec.toFixed(1)}s · {ttsJob.cost} credits</span>}
              </div>

              {!ttsJob && (
                <div className="ph-stripe gold" style={{ height: 96, borderRadius: 'var(--r-2)', flexDirection: 'column', gap: 6 }}>
                  <I.wave size={28} />
                  <span className="t-mono t-11">waveform en attente · click Generate TTS</span>
                </div>
              )}

              {ttsJob?.status === 'running' && (
                <div className="skel" style={{ height: 96, borderRadius: 'var(--r-2)' }} />
              )}

              {ttsJob?.status === 'failed' && (
                <div className="ph-stripe" style={{ height: 72, borderRadius: 'var(--r-2)', borderColor: 'var(--red)', color: 'var(--red)' }}>
                  {ttsJob.error}
                </div>
              )}

              {ttsJob?.status === 'succeeded' && (
                <div className="col gap-2">
                  <WaveformMock duration={ttsJob.durationSec || 0} />
                  <audio ref={audioRef} controls src={ttsJob.audioUrl} style={{ width: '100%', marginTop: 4 }} />
                </div>
              )}
            </div>

            {/* STT transcription */}
            <div className="card" style={{ padding: 14 }}>
              <div className="row gap-2" style={{ marginBottom: 10 }}>
                <span className="section-label">STT word-level · ElevenLabs Scribe v2</span>
                {sttJob?.status === 'succeeded' && <Badge variant="green" icon={I.dot}>succeeded</Badge>}
                {sttJob?.status === 'running' && <Badge variant="blue" icon={I.dot}>transcribing…</Badge>}
                {sttJob?.status === 'failed' && <Badge variant="red" icon={I.dot}>failed</Badge>}
                <div style={{ flex: 1 }} />
                {sttJob?.matchPct != null && (
                  <span className="t-mono t-11" style={{ color: sttJob.matchPct >= 95 ? 'var(--green)' : 'var(--gold)' }}>
                    match {sttJob.matchPct}% {sttJob.matchPct >= 99 && '· gate PASS'}
                  </span>
                )}
                <button
                  disabled={!ttsJob?.audioUrl || running}
                  onClick={generateSTT}
                  className="btn btn-secondary btn-sm">
                  {running && sttJob?.status === 'running' ? <I.refresh size={12} /> : <I.wave size={12} />}
                  Generate STT
                </button>
              </div>

              {!sttJob && !ttsJob?.audioUrl && (
                <div className="t-12 muted-2" style={{ padding: 14, textAlign: 'center' }}>
                  Transcription disponible après génération TTS.
                </div>
              )}

              {sttJob?.status === 'succeeded' && sttJob.words?.length > 0 && (
                <div className="col gap-3">
                  {/* Words as chips */}
                  <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                    {sttJob.words.slice(0, 80).map((w, i) => (
                      <button key={i}
                        onClick={() => { if (audioRef.current) audioRef.current.currentTime = w.start; audioRef.current?.play(); }}
                        className="pill" style={{ height: 22, fontSize: 11, padding: '0 8px' }}
                        title={`${w.start.toFixed(2)}s – ${w.end.toFixed(2)}s`}>
                        {w.text}
                      </button>
                    ))}
                    {sttJob.words.length > 80 && <span className="t-mono t-11 muted-2">+{sttJob.words.length - 80} more</span>}
                  </div>
                  <div className="row gap-4 t-mono t-11 muted-2" style={{ paddingTop: 6, borderTop: '1px solid var(--border-700)' }}>
                    <span>{sttJob.words.length} words</span>
                    <span>duration {sttJob.words.at(-1)?.end.toFixed(1) || 0}s</span>
                    <span>cost {sttJob.cost} credits</span>
                  </div>
                </div>
              )}

              {sttJob?.status === 'failed' && (
                <div className="t-12" style={{ color: 'var(--red)' }}>{sttJob.error}</div>
              )}
            </div>

            {/* Export bar */}
            {ttsJob?.status === 'succeeded' && (
              <div className="card row" style={{ padding: 12, gap: 10 }}>
                <span className="t-12 muted">Export livrables IVAMIND :</span>
                <div style={{ flex: 1 }} />
                <a href={ttsJob.audioUrl} download="voice-final.mp3" className="btn btn-secondary btn-sm">
                  <I.file size={12} />voice-final.mp3
                </a>
                <button disabled={!sttJob?.words} className="btn btn-secondary btn-sm">
                  <I.file size={12} />captions-word-level.json
                </button>
                <button className="btn btn-primary btn-sm"><I.export size={12} />Export all</button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — voice cast + engine */}
        <aside className="col no-shrink" style={{ width: 300, background: 'var(--bg-1)', overflow: 'auto' }}>
          <div className="col hairline-b" style={{ padding: 14, gap: 10 }}>
            <span className="section-label">Voice cast · {VOICES.length}</span>
            {VOICES.map(v => (
              <div key={v.id} className="row gap-2">
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: v.canonical ? 'var(--gold-ghost)' : 'var(--bg-3)',
                  border: '1px solid ' + (v.canonical ? 'var(--gold)' : 'var(--border-500)'),
                  color: v.canonical ? 'var(--gold)' : 'var(--text-2)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize: 10, fontWeight: 600,
                }}>{v.language.toUpperCase()}</div>
                <div className="col" style={{ lineHeight: 1.15 }}>
                  <span className="t-12">{v.name}</span>
                  <span className="t-11 muted-2">{v.notes}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="col hairline-b" style={{ padding: 14, gap: 8 }}>
            <span className="section-label">Engine</span>
            <div className="row gap-2 t-12">
              <span className="dot dot-green" />
              <span>Fish S1 · primary TTS</span>
            </div>
            <div className="row gap-2 t-12">
              <span className="dot dot-green" />
              <span>ElevenLabs Scribe v2 · STT</span>
            </div>
            <div className="row gap-2 t-12">
              <span className="dot dot-muted" />
              <span className="muted">ElevenLabs TTS fallback EN</span>
            </div>
          </div>

          <div className="col hairline-b" style={{ padding: 14, gap: 8 }}>
            <span className="section-label">Guard rails IVAMIND</span>
            <div className="t-11 muted" style={{ lineHeight: 1.5 }}>
              <div>❌ [pause] tags bannis</div>
              <div>❌ chiffres en digits</div>
              <div>✅ accents FR obligatoires</div>
              <div>✅ signature whispering outro</div>
              <div>✅ patch canon noms post-STT</div>
            </div>
          </div>

          <div className="col" style={{ padding: 14, gap: 8 }}>
            <span className="section-label">Canonical patches (STT)</span>
            <div className="t-11 t-mono muted-2">Zahied → Zayed</div>
            <div className="t-11 t-mono muted-2">Soukaïna → Soukaina</div>
            <div className="t-11 t-mono muted-2">Radouane → Radoine</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Subcomponents ───
function WaveformMock({ duration }) {
  // procedural "waveform" from seeded sine + noise — visually believable placeholder
  const BARS = 120;
  const bars = useMemo(() => {
    const seed = Math.floor(duration * 1000);
    const rnd = (n) => {
      const x = Math.sin(seed + n * 13.37) * 10000;
      return x - Math.floor(x);
    };
    return Array.from({ length: BARS }, (_, i) => {
      const envelope = Math.sin((i / BARS) * Math.PI); // fade-in/out shape
      const noise = rnd(i);
      const voiceOsc = 0.4 + 0.6 * Math.abs(Math.sin(i * 0.4)); // voice-like cadence
      return Math.max(0.06, envelope * voiceOsc * noise);
    });
  }, [duration]);

  return (
    <div className="row" style={{ height: 72, gap: 2, alignItems: 'center', padding: '0 2px' }}>
      {bars.map((v, i) => (
        <span key={i} style={{
          flex: 1,
          height: `${Math.round(v * 100)}%`,
          minHeight: 2,
          background: 'var(--gold)',
          opacity: 0.85,
          borderRadius: 1,
        }} />
      ))}
    </div>
  );
}
