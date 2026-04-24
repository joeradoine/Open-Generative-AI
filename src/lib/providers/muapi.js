import fs from 'node:fs/promises';
import path from 'node:path';
import { newJobId } from './types.js';

const MUAPI_BASE = 'https://api.muapi.ai';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'byok-output', 'muapi');
const OUTPUT_URL_PREFIX = '/byok-output/muapi';

/**
 * MuapiAdapter — fallback for exotic models (Nano Banana 2, Flux Kontext, lipsync).
 * Wraps the existing muapi endpoints used by the legacy studios.
 */
export class MuapiAdapter {
  constructor(apiKey) {
    this.providerId = 'muapi';
    this.capabilities = ['image.t2i', 'image.i2i', 'video.t2v', 'video.i2v', 'lipsync.portrait', 'lipsync.video'];
    this.apiKey = apiKey || '';
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  _headers() {
    return { 'Content-Type': 'application/json', 'x-api-key': this.apiKey };
  }

  async _pollPrediction(requestId, { max = 60, intervalMs = 2000 } = {}) {
    for (let i = 0; i < max; i++) {
      await new Promise((r) => setTimeout(r, intervalMs));
      const res = await fetch(`${MUAPI_BASE}/api/v1/predictions/${requestId}/result`, {
        method: 'GET',
        headers: this._headers(),
      });
      if (!res.ok) {
        if (res.status >= 500) continue;
        const txt = await res.text();
        throw new Error(`muapi poll failed (${res.status}): ${txt.slice(0, 200)}`);
      }
      const data = await res.json();
      const status = String(data.status || '').toLowerCase();
      if (status === 'completed' || status === 'succeeded' || status === 'success') return data;
      if (status === 'failed' || status === 'error') throw new Error(`muapi failed: ${data.error || 'unknown'}`);
    }
    throw new Error('muapi poll timeout');
  }

  async _downloadAsset(remoteUrl, kind) {
    if (!remoteUrl) return null;
    try {
      await fs.mkdir(OUTPUT_DIR, { recursive: true });
      const ext = kind === 'video' ? 'mp4' : kind === 'audio' ? 'mp3' : 'png';
      const filename = `${newJobId('muapi')}.${ext}`;
      const res = await fetch(remoteUrl);
      if (!res.ok) return { url: remoteUrl, kind };
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(path.join(OUTPUT_DIR, filename), buf);
      return { url: `${OUTPUT_URL_PREFIX}/${filename}`, kind, remoteUrl };
    } catch {
      return { url: remoteUrl, kind };
    }
  }

  /**
   * Generic prediction flow: POST endpoint, poll, return asset.
   */
  async _runPrediction(endpoint, payload, kind = 'image') {
    if (!this.isConfigured()) throw new Error('MuapiAdapter: missing API key');
    const jobId = newJobId('muapi');
    const submitRes = await fetch(`${MUAPI_BASE}/api/v1/${endpoint}`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(payload),
    });
    if (!submitRes.ok) {
      const txt = await submitRes.text();
      throw new Error(`muapi submit failed (${submitRes.status}): ${txt.slice(0, 200)}`);
    }
    const submitJson = await submitRes.json();
    const requestId = submitJson.request_id || submitJson.id;
    if (!requestId) {
      // Direct response (rare).
      const url = submitJson.outputs?.[0] || submitJson.url;
      const asset = url ? await this._downloadAsset(url, kind) : null;
      return {
        jobId,
        status: 'succeeded',
        providerId: this.providerId,
        assets: asset ? [asset] : [],
        meta: submitJson,
      };
    }
    const result = await this._pollPrediction(requestId);
    const remote = result.outputs?.[0] || result.url || result.output?.url;
    const asset = await this._downloadAsset(remote, kind);
    return {
      jobId,
      status: 'succeeded',
      providerId: this.providerId,
      assets: asset ? [asset] : [],
      meta: { requestId, raw: result },
    };
  }

  /**
   * @param {import('./types.js').GenerateImageParams & {modelEndpoint?:string}} params
   */
  async generateImage(params) {
    const endpoint = params.modelEndpoint || 'flux-schnell';
    const body = {
      prompt: params.prompt,
      aspect_ratio: params.aspectRatio,
      resolution: params.resolution,
    };
    if (params.refs && params.refs.length > 0) {
      if (params.refs.length === 1) body.image_url = params.refs[0].url;
      else body.images_list = params.refs.map((r) => r.url);
    }
    if (params.seed && params.seed !== -1) body.seed = params.seed;
    return this._runPrediction(endpoint, body, 'image');
  }

  /**
   * @param {import('./types.js').GenerateVideoParams & {modelEndpoint?:string}} params
   */
  async generateVideo(params) {
    const endpoint = params.modelEndpoint || 'kling-video';
    const body = {
      prompt: params.prompt,
      aspect_ratio: params.aspectRatio,
      duration: params.duration,
      mode: params.mode,
    };
    if (params.startFrameUrl) body.image_url = params.startFrameUrl;
    return this._runPrediction(endpoint, body, 'video');
  }

  async pollJob(requestId) {
    if (!requestId) throw new Error('MuapiAdapter.pollJob: missing requestId');
    try {
      const result = await this._pollPrediction(requestId, { max: 1, intervalMs: 0 });
      const remote = result.outputs?.[0] || result.url;
      const asset = remote ? await this._downloadAsset(remote, 'image') : null;
      return { jobId: requestId, status: 'succeeded', providerId: this.providerId, assets: asset ? [asset] : [] };
    } catch (err) {
      return { jobId: requestId, status: 'running', providerId: this.providerId, meta: { note: String(err.message || err) } };
    }
  }
}
