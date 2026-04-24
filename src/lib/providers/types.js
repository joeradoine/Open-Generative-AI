/**
 * Shared types for the BYOK Provider Layer (JSDoc).
 *
 * @typedef {'image.t2i'|'image.i2i'|'video.t2v'|'video.i2v'|'video.character-lock'|
 *           'audio.tts'|'audio.stt-word-level'|'lipsync.portrait'|'lipsync.video'} Capability
 *
 * @typedef {Object} ImageRef
 * @property {string} url
 * @property {number} [weight]
 * @property {'face'|'body'|'outfit'|'env'|'style'} [role]
 *
 * @typedef {Object} GenerateImageParams
 * @property {string} prompt
 * @property {string} [negativePrompt]
 * @property {'1:1'|'9:16'|'16:9'|'3:4'|'4:3'} [aspectRatio]
 * @property {'1K'|'2K'|'4K'} [resolution]
 * @property {ImageRef[]} [refs]
 * @property {number} [seed]
 * @property {string} [modelHint]
 *
 * @typedef {Object} GenerateVideoParams
 * @property {string} prompt
 * @property {string} [startFrameUrl]
 * @property {string} [endFrameUrl]
 * @property {5|10} [duration]
 * @property {'9:16'|'16:9'} [aspectRatio]
 * @property {'standard'|'pro'} [mode]
 * @property {string[]} [elementIds]
 * @property {boolean} [soundOn]
 *
 * @typedef {Object} GenerateAudioTTSParams
 * @property {string} text
 * @property {'ivamind-narrator-fr'|'kronos-narrator-fr'|'ivamind-narrator-en'|string} [voice]
 * @property {string} [voiceId]
 * @property {number} [speed]
 * @property {'fr'|'en'} [language]
 * @property {'mp3'|'wav'} [format]
 *
 * @typedef {Object} GenerateAudioSTTParams
 * @property {string} [audioUrl]
 * @property {Buffer|Blob} [audioBuffer]
 * @property {string} [filename]
 * @property {'fr'|'en'|string} [language]
 * @property {boolean} [diarize]
 * @property {'scribe_v1'|'scribe_v2'} [model]
 *
 * @typedef {Object} JobAsset
 * @property {string} url
 * @property {'image'|'video'|'audio'} kind
 * @property {number} [width]
 * @property {number} [height]
 * @property {number} [duration]
 *
 * @typedef {Object} JobResult
 * @property {string} jobId
 * @property {'queued'|'running'|'succeeded'|'failed'} status
 * @property {JobAsset[]} [assets]
 * @property {string} [error]
 * @property {number} [costUnits]
 * @property {string} providerId
 * @property {any} [meta]
 */

export const CAPABILITIES = /** @type {const} */ ([
  'image.t2i',
  'image.i2i',
  'video.t2v',
  'video.i2v',
  'video.character-lock',
  'audio.tts',
  'audio.stt-word-level',
  'lipsync.portrait',
  'lipsync.video',
]);

/**
 * Base adapter shape (duck-typed, JS enforced at runtime).
 * Each concrete adapter implements a subset of these.
 */
export class BaseAdapter {
  /** @type {string} */
  providerId = 'base';
  /** @type {Capability[]} */
  capabilities = [];

  /** @returns {boolean} */
  isConfigured() {
    return false;
  }

  // Optional methods — implemented by concrete adapters.
  // async generateImage(params: GenerateImageParams): Promise<JobResult>
  // async generateVideo(params: GenerateVideoParams): Promise<JobResult>
  // async generateAudioTTS(params: GenerateAudioTTSParams): Promise<JobResult>
  // async transcribe(params: GenerateAudioSTTParams): Promise<JobResult>
  // async pollJob(jobId: string): Promise<JobResult>
}

export function newJobId(prefix = 'job') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
