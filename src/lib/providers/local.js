import fs from 'node:fs/promises';
import path from 'node:path';
import { newJobId } from './types.js';

const LOCAL_BASE = process.env.LOCAL_INFERENCE_BASE || 'http://localhost:8900';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'byok-output', 'local');
const OUTPUT_URL_PREFIX = '/byok-output/local';

/**
 * LocalInferenceAdapter — talks to a local GPU server (Z-Image/SDXL).
 * Health probed lazily; adapter reports isConfigured() based on cached probe.
 */
export class LocalInferenceAdapter {
  constructor() {
    this.providerId = 'local';
    this.capabilities = ['image.t2i'];
    /** @type {boolean|null} */
    this._healthy = null;
    this._lastProbe = 0;
  }

  async _probe() {
    const now = Date.now();
    if (this._healthy !== null && now - this._lastProbe < 30000) return this._healthy;
    try {
      const res = await fetch(`${LOCAL_BASE}/health`, { method: 'GET' });
      this._healthy = res.ok;
    } catch {
      this._healthy = false;
    }
    this._lastProbe = now;
    return this._healthy;
  }

  /**
   * Synchronous best-effort check used by router. Returns last cached value.
   * Call probe() once at startup for accuracy.
   */
  isConfigured() {
    return this._healthy === true;
  }

  async probe() {
    return this._probe();
  }

  /**
   * @param {import('./types.js').GenerateImageParams} params
   */
  async generateImage(params) {
    const healthy = await this._probe();
    if (!healthy) throw new Error(`LocalInferenceAdapter: local server at ${LOCAL_BASE} unreachable`);
    const jobId = newJobId('local');
    const [w, h] = dimsForAR(params.aspectRatio);
    const res = await fetch(`${LOCAL_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.modelHint || 'z-image-turbo',
        prompt: params.prompt,
        width: w,
        height: h,
        negative_prompt: params.negativePrompt,
        seed: params.seed,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Local server failed (${res.status}): ${txt.slice(0, 200)}`);
    }
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const filename = `${jobId}.png`;
    await fs.writeFile(path.join(OUTPUT_DIR, filename), buf);
    const publicUrl = `${OUTPUT_URL_PREFIX}/${filename}`;
    return {
      jobId,
      status: 'succeeded',
      providerId: this.providerId,
      costUnits: 0,
      assets: [{ url: publicUrl, kind: 'image', width: w, height: h }],
      meta: { model: params.modelHint || 'z-image-turbo' },
    };
  }

  async pollJob(jobId) {
    return { jobId, status: 'succeeded', providerId: this.providerId, meta: { note: 'Local is synchronous.' } };
  }
}

function dimsForAR(ar) {
  switch (ar) {
    case '9:16': return [768, 1344];
    case '16:9': return [1344, 768];
    case '3:4': return [896, 1152];
    case '4:3': return [1152, 896];
    default: return [1024, 1024];
  }
}
