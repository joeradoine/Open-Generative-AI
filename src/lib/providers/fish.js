import fs from 'node:fs/promises';
import path from 'node:path';
import { newJobId } from './types.js';

const FISH_BASE = 'https://api.fish.audio/v1';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'byok-output', 'fish');
const OUTPUT_URL_PREFIX = '/byok-output/fish';

export const CANONICAL_VOICES = {
  'ivamind-narrator-fr': { id: '4f2a0684dd0247dda68f339738c780e6', speed: 1.18, language: 'fr' },
  'kronos-narrator-fr': { id: '7e327849fe89489387cb3e016c714834', speed: 1.1, language: 'fr' },
  'ivamind-narrator-en': { id: 'bf322df2096a46f18c579d0baa36f41d', speed: 1.2, language: 'en' },
};

const FR_ACCENT_RE = /[éèêëàâùûôîïç]/;
const DIGIT_RE = /\b\d+\b/;
const FORBIDDEN_TAGS = ['[pause]', '[short pause]', '[long pause]'];

export function validateFishInput(text, language = 'fr') {
  const errors = [];
  const warnings = [];
  for (const tag of FORBIDDEN_TAGS) {
    if (text.toLowerCase().includes(tag.toLowerCase())) {
      errors.push(`Fish: forbidden tag "${tag}" (known artifact risk: produces "Twil"/"Vartor")`);
    }
  }
  if (DIGIT_RE.test(text)) {
    errors.push('Fish: digits detected — must be spelled in letters in TTS text (e.g. "14" -> "quatorze").');
  }
  if (language === 'fr' && !FR_ACCENT_RE.test(text)) {
    warnings.push('Fish: FR text without any accent (éèêëàâùûôîïç) — likely missing accents.');
  }
  return { errors, warnings };
}

export class FishAudioAdapter {
  constructor(apiKey) {
    this.providerId = 'fish';
    this.capabilities = ['audio.tts'];
    this.apiKey = apiKey || '';
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  /**
   * @param {import('./types.js').GenerateAudioTTSParams} params
   */
  async generateAudioTTS(params) {
    if (!this.isConfigured()) throw new Error('FishAudioAdapter: missing API key');
    const jobId = newJobId('fish');
    const text = params.text || '';
    if (!text.trim()) throw new Error('FishAudioAdapter: empty text');

    const voiceKey = params.voice || 'ivamind-narrator-fr';
    const canonical = CANONICAL_VOICES[voiceKey];
    const referenceId = params.voiceId || canonical?.id;
    if (!referenceId) {
      throw new Error(`FishAudioAdapter: unknown voice '${voiceKey}'. Use one of ${Object.keys(CANONICAL_VOICES).join(', ')} or pass voiceId.`);
    }
    const language = params.language || canonical?.language || 'fr';
    const speed = params.speed ?? canonical?.speed ?? 1.0;

    const { errors, warnings } = validateFishInput(text, language);
    if (errors.length > 0) {
      throw new Error(`Fish input validation failed:\n- ${errors.join('\n- ')}`);
    }

    const format = params.format || 'mp3';
    const body = {
      text,
      reference_id: referenceId,
      chunk_length: 200,
      format,
      mp3_bitrate: 128,
      normalize: true,
      latency: 'normal',
      speed,
    };

    const res = await fetch(`${FISH_BASE}/tts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Model: 's1',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Fish TTS failed (${res.status}): ${txt.slice(0, 300)}`);
    }
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const filename = `${jobId}.${format}`;
    const diskPath = path.join(OUTPUT_DIR, filename);
    await fs.writeFile(diskPath, buf);
    const publicUrl = `${OUTPUT_URL_PREFIX}/${filename}`;

    return {
      jobId,
      status: 'succeeded',
      providerId: this.providerId,
      assets: [{ url: publicUrl, kind: 'audio' }],
      meta: { voice: voiceKey, referenceId, speed, language, sizeBytes: buf.length, warnings },
    };
  }

  async pollJob(jobId) {
    return { jobId, status: 'succeeded', providerId: this.providerId, meta: { note: 'Fish TTS is synchronous.' } };
  }
}
