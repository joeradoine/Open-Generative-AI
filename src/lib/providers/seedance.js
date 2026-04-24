import fs from 'node:fs/promises';
import path from 'node:path';
import { newJobId } from './types.js';

/**
 * Seedance 2.0 — ByteDance Volcano Ark video generation (t2v + i2v).
 * Doc : https://www.volcengine.com/docs/82379/1520757 (2026-04)
 *
 * Flow :
 *   1. POST /api/v2/video/generate → { task_id, status: 'pending' }
 *   2. Poll GET /api/v2/video/tasks/{task_id} jusqu'à status === 'succeeded'
 *   3. Download video_url → save local public/byok-output/seedance/
 */

const BASE_URL = process.env.SEEDANCE_BASE_URL || 'https://ark.cn-beijing.volcengine.com/api/v2';
const OUTPUT_DIR_REL = 'public/byok-output/seedance';
const OUTPUT_URL_PREFIX = '/byok-output/seedance';
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 80; // ~4 min max
const DEFAULT_MODEL = 'seedance-1.0-pro-250528';

export class SeedanceAdapter {
  constructor(apiKey) {
    this.providerId = 'seedance';
    this.capabilities = ['video.t2v', 'video.i2v'];
    this.apiKey = apiKey || '';
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  /**
   * Generate video — accepte t2v (prompt seul) OU i2v (prompt + startFrame url).
   * Polling intégré — retourne quand le task est succeeded/failed.
   */
  async generateVideo(params) {
    if (!this.isConfigured()) {
      return {
        jobId: newJobId('seedance'),
        status: 'failed',
        providerId: this.providerId,
        error: 'SeedanceAdapter: missing SEEDANCE_API_KEY',
      };
    }

    const jobId = newJobId('seedance');

    // Resolve start frame : l'API Seedance attend une URL publique.
    let imageUrl = params.startFrame || params.image_url;
    if (imageUrl && !/^https?:\/\//i.test(imageUrl) && !imageUrl.startsWith('data:')) {
      return {
        jobId,
        status: 'failed',
        providerId: this.providerId,
        error: 'Seedance i2v : startFrame doit être une URL publique (https) ou un data-URI. Local paths /public/... non supportés en direct — upload vers CDN avant.',
      };
    }

    const body = {
      model: params.modelHint || DEFAULT_MODEL,
      prompt: params.prompt || '',
      resolution: params.resolution || '1024x576',
      duration: Number(params.duration) || 5,
      aspect_ratio: params.aspectRatio || '9:16',
    };
    if (imageUrl) body.image_url = imageUrl;
    if (params.seed) body.seed = params.seed;
    if (params.negativePrompt) body.negative_prompt = params.negativePrompt;

    try {
      // 1. POST create task
      const createResp = await fetch(`${BASE_URL}/video/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!createResp.ok) {
        const errTxt = await createResp.text();
        throw new Error(`Seedance create ${createResp.status}: ${errTxt.slice(0, 300)}`);
      }
      const createData = await createResp.json();
      const taskId = createData.task_id || createData.id;
      if (!taskId) throw new Error('Seedance: no task_id returned');

      // 2. Poll until succeeded/failed
      let videoUrl = null;
      let attempts = 0;
      while (attempts < POLL_MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        attempts++;
        const pollResp = await fetch(`${BASE_URL}/video/tasks/${taskId}`, {
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
        });
        if (!pollResp.ok) {
          const errTxt = await pollResp.text();
          throw new Error(`Seedance poll ${pollResp.status}: ${errTxt.slice(0, 200)}`);
        }
        const pollData = await pollResp.json();
        const status = pollData.status;
        if (status === 'succeeded') {
          videoUrl = pollData.video_url || pollData.result?.video_url || pollData.output?.video_url;
          break;
        }
        if (status === 'failed' || status === 'error') {
          throw new Error(`Seedance task ${status}: ${pollData.error || pollData.message || 'unknown'}`);
        }
      }

      if (!videoUrl) throw new Error(`Seedance timeout after ${attempts} polls (~${(attempts * POLL_INTERVAL_MS / 1000).toFixed(0)}s)`);

      // 3. Download to public/byok-output/seedance/
      const ROOT = process.cwd();
      const outputDir = path.join(ROOT, OUTPUT_DIR_REL);
      await fs.mkdir(outputDir, { recursive: true });
      const filename = `${jobId}.mp4`;
      const diskPath = path.join(outputDir, filename);
      const videoResp = await fetch(videoUrl);
      if (!videoResp.ok) throw new Error(`Seedance download ${videoResp.status}`);
      const buf = Buffer.from(await videoResp.arrayBuffer());
      await fs.writeFile(diskPath, buf);
      const publicUrl = `${OUTPUT_URL_PREFIX}/${filename}`;

      return {
        jobId,
        status: 'succeeded',
        providerId: this.providerId,
        costUnits: Math.ceil(body.duration / 5),
        assets: [{ url: publicUrl, kind: 'video' }],
        meta: {
          model: body.model,
          taskId,
          duration: body.duration,
          resolution: body.resolution,
          pollAttempts: attempts,
          originalUrl: videoUrl,
        },
      };
    } catch (err) {
      return {
        jobId,
        status: 'failed',
        providerId: this.providerId,
        error: err.message,
      };
    }
  }

  async pollJob(jobId) {
    return {
      jobId,
      status: 'succeeded',
      providerId: this.providerId,
      meta: { note: 'Seedance polling is internal to generateVideo(); no separate poll needed.' },
    };
  }
}
