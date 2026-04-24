import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'node:fs/promises';
import path from 'node:path';
import { newJobId } from './types.js';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'byok-output', 'gemini');
const OUTPUT_URL_PREFIX = '/byok-output/gemini';

// Models disponibles côté Gemini Image :
// - gemini-2.5-flash-image : cap 4 refs (existant, stable)
// - gemini-3.1-flash-image (Nano Banana 2) : cap 14 refs, 1K/2K/4K resolution, Google Search enhancement
// Le modelHint body override via params.modelHint, défaut = 2.5 pour rétrocompat.
const MODEL_ID_DEFAULT = 'gemini-2.5-flash-image';
const MODEL_ID_NANO_BANANA_2 = 'gemini-3.1-flash-image';
const MAX_REFS_25 = 4;
const MAX_REFS_NANO_BANANA_2 = 14;

function resolveModelConfig(modelHint) {
  if (modelHint === 'nano-banana-2' || modelHint === 'gemini-3.1-flash-image' || modelHint === 'nano-banana-pro') {
    return { modelId: MODEL_ID_NANO_BANANA_2, maxRefs: MAX_REFS_NANO_BANANA_2 };
  }
  return { modelId: MODEL_ID_DEFAULT, maxRefs: MAX_REFS_25 };
}

/**
 * Fetch a URL (http(s), data:, or local /public/...) and return {base64, mimeType}.
 */
async function fetchRefAsInline(refUrl) {
  if (!refUrl) throw new Error('fetchRefAsInline: empty URL');

  // data URI support.
  if (refUrl.startsWith('data:')) {
    const match = refUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/);
    if (!match) throw new Error('Invalid data URI');
    const mimeType = match[1] || 'image/png';
    const isB64 = !!match[2];
    const body = match[3];
    const base64 = isB64 ? body : Buffer.from(decodeURIComponent(body)).toString('base64');
    return { base64, mimeType };
  }

  // Local public asset: /byok-output/... or /public/... .
  if (refUrl.startsWith('/')) {
    const localPath = path.join(process.cwd(), 'public', refUrl.replace(/^\//, ''));
    const buf = await fs.readFile(localPath);
    const mimeType = guessMime(localPath);
    return { base64: buf.toString('base64'), mimeType };
  }

  // HTTP(s).
  const res = await fetch(refUrl);
  if (!res.ok) throw new Error(`Failed to fetch ref ${refUrl}: ${res.status}`);
  const mimeType = res.headers.get('content-type') || 'image/png';
  const ab = await res.arrayBuffer();
  return { base64: Buffer.from(ab).toString('base64'), mimeType };
}

function guessMime(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/png';
}

export class GeminiAdapter {
  /**
   * @param {string} apiKey
   */
  constructor(apiKey) {
    this.providerId = 'gemini';
    this.capabilities = ['image.t2i', 'image.i2i'];
    this.apiKey = apiKey;
    this._client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  isConfigured() {
    return Boolean(this.apiKey && this._client);
  }

  /**
   * @param {import('./types.js').GenerateImageParams} params
   * @returns {Promise<import('./types.js').JobResult>}
   */
  async generateImage(params) {
    if (!this.isConfigured()) throw new Error('GeminiAdapter: missing API key');
    const jobId = newJobId('gemini');
    const refs = Array.isArray(params.refs) ? params.refs : [];

    // Resolve model — default 2.5 (4 refs cap), nano-banana-2 hint unlock 14 refs cap
    const { modelId, maxRefs } = resolveModelConfig(params.modelHint);

    if (refs.length > maxRefs) {
      throw new Error(`GeminiAdapter ${modelId}: max ${maxRefs} refs supported (got ${refs.length}). Switch to modelHint='nano-banana-2' pour 14 refs.`);
    }

    const model = this._client.getGenerativeModel({ model: modelId });

    // Build multimodal parts.
    const parts = [];
    for (const ref of refs) {
      const { base64, mimeType } = await fetchRefAsInline(ref.url);
      parts.push({ inlineData: { data: base64, mimeType } });
    }
    const textPrompt = [
      params.prompt || '',
      params.aspectRatio ? `Aspect ratio: ${params.aspectRatio}.` : '',
      params.negativePrompt ? `Avoid: ${params.negativePrompt}.` : '',
    ]
      .filter(Boolean)
      .join(' ');
    parts.push({ text: textPrompt });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: params.seed ? { seed: params.seed } : undefined,
    });

    // Extract image bytes from response.
    const response = result.response;
    const candidates = response?.candidates || [];
    /** @type {string|null} */
    let imageB64 = null;
    /** @type {string} */
    let mimeType = 'image/png';

    for (const cand of candidates) {
      const candParts = cand?.content?.parts || [];
      for (const p of candParts) {
        if (p.inlineData?.data) {
          imageB64 = p.inlineData.data;
          mimeType = p.inlineData.mimeType || 'image/png';
          break;
        }
      }
      if (imageB64) break;
    }

    if (!imageB64) {
      const textEcho = response?.text?.() || '';
      throw new Error(`Gemini returned no image. Text: ${textEcho.slice(0, 200)}`);
    }

    // Save to disk.
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const ext = mimeType.includes('jpeg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png';
    const filename = `${jobId}.${ext}`;
    const diskPath = path.join(OUTPUT_DIR, filename);
    await fs.writeFile(diskPath, Buffer.from(imageB64, 'base64'));
    const publicUrl = `${OUTPUT_URL_PREFIX}/${filename}`;

    return {
      jobId,
      status: 'succeeded',
      providerId: this.providerId,
      costUnits: 1,
      assets: [{ url: publicUrl, kind: 'image' }],
      meta: { model: modelId, maxRefs, refCount: refs.length, mimeType },
    };
  }

  async pollJob(jobId) {
    // Gemini image gen is synchronous — no polling.
    return {
      jobId,
      status: 'succeeded',
      providerId: this.providerId,
      meta: { note: 'Gemini image gen is synchronous; no polling needed.' },
    };
  }
}
