import jwt from 'jsonwebtoken';
import fs from 'node:fs/promises';
import path from 'node:path';
import { newJobId } from './types.js';

const KLING_BASE = 'https://api-singapore.klingai.com';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'byok-output', 'kling');
const OUTPUT_URL_PREFIX = '/byok-output/kling';

function signToken(accessKey, secretKey) {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { iss: accessKey, exp: now + 1800, nbf: now - 5 },
    secretKey,
    { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } }
  );
}

export class KlingAdapter {
  /**
   * @param {{accessKey:string, secretKey:string}} keys
   */
  constructor(keys = {}) {
    this.providerId = 'kling';
    this.capabilities = ['video.t2v', 'video.i2v', 'video.character-lock'];
    this.accessKey = keys.accessKey || '';
    this.secretKey = keys.secretKey || '';
  }

  isConfigured() {
    return Boolean(this.accessKey && this.secretKey);
  }

  _authHeaders() {
    if (!this.isConfigured()) throw new Error('KlingAdapter: missing accessKey/secretKey');
    const token = signToken(this.accessKey, this.secretKey);
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  _resolveModel(elementIds, mode) {
    if (Array.isArray(elementIds) && elementIds.length > 0) {
      return { model_name: 'kling-v3-omni', mode: 'pro', costPer5s: 10 };
    }
    if (mode === 'pro') return { model_name: 'kling-v3-omni', mode: 'pro', costPer5s: 10 };
    return { model_name: 'kling-v3', mode: 'std', costPer5s: 4 };
  }

  /**
   * @param {import('./types.js').GenerateVideoParams} params
   */
  async generateVideo(params) {
    const jobId = newJobId('kling');
    const duration = params.duration || 5;
    const aspectRatio = params.aspectRatio || '9:16';
    const { model_name, mode, costPer5s } = this._resolveModel(params.elementIds, params.mode);
    const isI2V = Boolean(params.startFrameUrl);
    const endpoint = isI2V ? '/v1/videos/image2video' : '/v1/videos/text2video';

    const payload = {
      model_name,
      mode,
      prompt: params.prompt || '',
      duration: String(duration),
      aspect_ratio: aspectRatio,
      cfg_scale: 0.5,
    };
    if (isI2V) payload.image = params.startFrameUrl;
    if (params.endFrameUrl) payload.image_tail = params.endFrameUrl;
    if (Array.isArray(params.elementIds) && params.elementIds.length > 0) {
      payload.element_ids = params.elementIds;
    }
    if (typeof params.soundOn === 'boolean') payload.sound_on = params.soundOn;

    const submitRes = await fetch(`${KLING_BASE}${endpoint}`, {
      method: 'POST',
      headers: this._authHeaders(),
      body: JSON.stringify(payload),
    });
    const submitTxt = await submitRes.text();
    let submitJson;
    try {
      submitJson = JSON.parse(submitTxt);
    } catch {
      throw new Error(`Kling submit non-JSON response: ${submitTxt.slice(0, 200)}`);
    }
    if (!submitRes.ok || submitJson.code !== 0) {
      throw new Error(`Kling submit failed (${submitRes.status}): ${submitJson.message || submitTxt.slice(0, 200)}`);
    }
    const taskId = submitJson.data?.task_id;
    if (!taskId) throw new Error('Kling submit: missing task_id');

    return {
      jobId,
      status: 'running',
      providerId: this.providerId,
      costUnits: costPer5s * (duration / 5),
      meta: { taskId, endpoint, mode, model_name, aspectRatio, duration },
    };
  }

  /**
   * Polls a Kling task by its task_id (meta.taskId from generateVideo).
   */
  async pollJob(taskId, opts = {}) {
    if (!taskId) throw new Error('KlingAdapter.pollJob: missing taskId');
    const isI2V = opts.isI2V || false;
    const base = isI2V ? '/v1/videos/image2video' : '/v1/videos/text2video';
    const res = await fetch(`${KLING_BASE}${base}/${taskId}`, {
      method: 'GET',
      headers: this._authHeaders(),
    });
    const txt = await res.text();
    let json;
    try { json = JSON.parse(txt); } catch { throw new Error(`Kling poll non-JSON: ${txt.slice(0, 200)}`); }
    if (!res.ok || json.code !== 0) {
      return { jobId: taskId, status: 'failed', providerId: this.providerId, error: json.message || txt.slice(0, 200) };
    }
    const status = json.data?.task_status;
    if (status === 'submitted' || status === 'processing') {
      return { jobId: taskId, status: 'running', providerId: this.providerId, meta: json.data };
    }
    if (status === 'succeed') {
      const videoUrl = json.data?.task_result?.videos?.[0]?.url;
      if (!videoUrl) {
        return { jobId: taskId, status: 'failed', providerId: this.providerId, error: 'Kling succeed but no video URL' };
      }
      // Download locally.
      await fs.mkdir(OUTPUT_DIR, { recursive: true });
      const filename = `${taskId}.mp4`;
      const diskPath = path.join(OUTPUT_DIR, filename);
      try {
        const videoRes = await fetch(videoUrl);
        if (videoRes.ok) {
          const buf = Buffer.from(await videoRes.arrayBuffer());
          await fs.writeFile(diskPath, buf);
        }
      } catch (err) {
        // If download fails we still return the remote URL.
        console.warn('[kling] download failed:', err.message);
      }
      const localUrl = `${OUTPUT_URL_PREFIX}/${filename}`;
      return {
        jobId: taskId,
        status: 'succeeded',
        providerId: this.providerId,
        assets: [{ url: localUrl, kind: 'video' }, { url: videoUrl, kind: 'video' }],
        meta: { remoteUrl: videoUrl, ...json.data },
      };
    }
    return { jobId: taskId, status: 'failed', providerId: this.providerId, error: `Kling task_status=${status}`, meta: json.data };
  }
}
