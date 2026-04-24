import fs from 'node:fs/promises';
import path from 'node:path';
import { newJobId } from './types.js';

const EL_BASE = 'https://api.elevenlabs.io/v1';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'byok-output', 'elevenlabs');
const OUTPUT_URL_PREFIX = '/byok-output/elevenlabs';

/**
 * IVAMIND canonical name patches — applied post-STT to ALL transcription text + word tokens.
 * Order matters: longest/most-specific first.
 */
const NAME_PATCHES = [
  { re: /Soukaïna/g, to: 'Soukaina' },
  { re: /Soukaina/g, to: 'Soukaina' },
  { re: /Radouane/g, to: 'Radoine' },
  { re: /Zahied/g, to: 'Zayed' },
];

function applyNamePatches(str) {
  if (typeof str !== 'string') return str;
  let out = str;
  for (const p of NAME_PATCHES) out = out.replace(p.re, p.to);
  return out;
}

export class ElevenLabsAdapter {
  constructor(apiKey) {
    this.providerId = 'elevenlabs';
    this.capabilities = ['audio.stt-word-level', 'audio.tts'];
    this.apiKey = apiKey || '';
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  /**
   * @param {import('./types.js').GenerateAudioSTTParams} params
   */
  async transcribe(params) {
    if (!this.isConfigured()) throw new Error('ElevenLabsAdapter: missing API key');
    const jobId = newJobId('el');
    // scribe_v2 par défaut (doctrine IVAMIND 2026-04 — précision word-level supérieure v1).
    const modelId = params.model || 'scribe_v2';

    // Resolve audio source to a Blob.
    /** @type {Blob} */
    let audioBlob;
    let filename = params.filename || 'audio.mp3';
    if (params.audioBuffer) {
      audioBlob = new Blob([params.audioBuffer], { type: 'audio/mpeg' });
    } else if (params.audioUrl) {
      // Local or remote URL.
      if (params.audioUrl.startsWith('/')) {
        const localPath = path.join(process.cwd(), 'public', params.audioUrl.replace(/^\//, ''));
        const buf = await fs.readFile(localPath);
        audioBlob = new Blob([buf], { type: 'audio/mpeg' });
        filename = path.basename(localPath);
      } else {
        const res = await fetch(params.audioUrl);
        if (!res.ok) throw new Error(`ElevenLabs: failed to fetch audio ${params.audioUrl}: ${res.status}`);
        const ab = await res.arrayBuffer();
        audioBlob = new Blob([ab], { type: res.headers.get('content-type') || 'audio/mpeg' });
        filename = path.basename(new URL(params.audioUrl).pathname) || filename;
      }
    } else {
      throw new Error('ElevenLabs.transcribe: audioUrl or audioBuffer required');
    }

    const form = new FormData();
    form.append('file', audioBlob, filename);
    form.append('model_id', modelId);
    form.append('timestamps_granularity', 'word');
    if (params.language) form.append('language_code', params.language);
    if (params.diarize) form.append('diarize', 'true');

    const res = await fetch(`${EL_BASE}/speech-to-text`, {
      method: 'POST',
      headers: { 'xi-api-key': this.apiKey },
      body: form,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`ElevenLabs STT failed (${res.status}): ${txt.slice(0, 300)}`);
    }
    const raw = await res.json();

    // Normalize + patch canonical names.
    const text = applyNamePatches(raw.text || '');
    const words = (raw.words || []).map((w) => ({
      text: applyNamePatches(w.text || w.word || ''),
      start: w.start,
      end: w.end,
      speaker_id: w.speaker_id,
      logprob: w.logprob,
    }));
    const payload = { text, words, language: raw.language_code || params.language, model: modelId };

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const captionsFile = `${jobId}.json`;
    await fs.writeFile(path.join(OUTPUT_DIR, captionsFile), JSON.stringify(payload, null, 2));
    const publicUrl = `${OUTPUT_URL_PREFIX}/${captionsFile}`;

    return {
      jobId,
      status: 'succeeded',
      providerId: this.providerId,
      assets: [{ url: publicUrl, kind: 'audio' }],
      meta: { ...payload, captionsUrl: publicUrl, wordCount: words.length },
    };
  }

  /**
   * Backup TTS (EN).
   * @param {import('./types.js').GenerateAudioTTSParams & {voiceId?:string}} params
   */
  async generateAudioTTS(params) {
    if (!this.isConfigured()) throw new Error('ElevenLabsAdapter: missing API key');
    if (!params.voiceId) throw new Error('ElevenLabs TTS requires voiceId');
    const jobId = newJobId('el-tts');
    const url = `${EL_BASE}/text-to-speech/${params.voiceId}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: params.text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`ElevenLabs TTS failed (${res.status}): ${txt.slice(0, 300)}`);
    }
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const filename = `${jobId}.mp3`;
    await fs.writeFile(path.join(OUTPUT_DIR, filename), buf);
    const publicUrl = `${OUTPUT_URL_PREFIX}/${filename}`;
    return {
      jobId,
      status: 'succeeded',
      providerId: this.providerId,
      assets: [{ url: publicUrl, kind: 'audio' }],
      meta: { voiceId: params.voiceId, sizeBytes: buf.length },
    };
  }

  async pollJob(jobId) {
    return { jobId, status: 'succeeded', providerId: this.providerId, meta: { note: 'ElevenLabs is synchronous.' } };
  }
}

export { applyNamePatches };
