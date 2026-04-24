import { newJobId } from './types.js';

/**
 * Seedance 2.0 (ByteDance Volcano Ark).
 * STUB: Docs not available in this sprint — returns 'failed' so router can fall back.
 * Wire the real endpoint when we have the ByteDance Ark SDK doc.
 */
export class SeedanceAdapter {
  constructor(apiKey) {
    this.providerId = 'seedance';
    this.capabilities = ['video.i2v', 'video.t2v'];
    this.apiKey = apiKey || '';
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async generateVideo(_params) {
    const jobId = newJobId('seedance');
    return {
      jobId,
      status: 'failed',
      providerId: this.providerId,
      error: 'Seedance adapter not yet implemented — stub. Configure Kling instead or complete seedance.js.',
    };
  }

  async pollJob(jobId) {
    return {
      jobId,
      status: 'failed',
      providerId: this.providerId,
      error: 'Seedance stub — no polling implemented.',
    };
  }
}
