/**
 * CapabilityRouter — given a capability + hints, pick the best registered adapter.
 * Rules tuned for IVAMIND Sprint 1.1:
 *
 *   image.t2i (refCount > 3) -> muapi (Nano Banana 2) if available, else gemini
 *   image.i2i (refCount <= 3) -> gemini (1u)
 *   video.character-lock (elementIds present) -> kling pro (10u)
 *   video.t2v / video.i2v (no persona) -> kling standard (4u)
 *   audio.tts + FR + narrator -> fish (canonical)
 *   audio.stt-word-level -> elevenlabs (scribe_v2)
 *   image.t2i maxCostUnits === 0 -> local if available
 */

export class CapabilityRouter {
  constructor(registry) {
    if (!registry) throw new Error('CapabilityRouter requires a ProviderRegistry');
    this.registry = registry;
  }

  /**
   * @param {string} capability
   * @param {Object} [hints]
   * @returns {{adapter:any, providerId:string, model?:any, reason:string}}
   */
  pick(capability, hints = {}) {
    const {
      forceProvider = null,
      refCount = 0,
      elementIds = null,
      preferredQuality = 'standard',
      maxCostUnits = null,
      language = null,
      voice = null,
    } = hints;

    // 1. Forced provider.
    if (forceProvider) {
      const adapter = this.registry.get(forceProvider);
      if (!adapter) throw new Error(`Router: forced provider '${forceProvider}' not registered`);
      if (!adapter.capabilities.includes(capability)) {
        throw new Error(`Router: '${forceProvider}' does not support '${capability}'`);
      }
      return { adapter, providerId: forceProvider, reason: 'forceProvider' };
    }

    // 2. Local free fallback.
    if (capability === 'image.t2i' && maxCostUnits === 0) {
      const local = this.registry.get('local');
      if (local && local.isConfigured()) {
        return { adapter: local, providerId: 'local', reason: 'zero-cost local' };
      }
    }

    // 3. image.t2i / image.i2i.
    if (capability === 'image.t2i' || capability === 'image.i2i') {
      // Many refs -> prefer muapi if configured (Nano Banana 2 / Flux Kontext).
      if (refCount > 3) {
        const muapi = this.registry.get('muapi');
        if (muapi && muapi.isConfigured()) {
          return { adapter: muapi, providerId: 'muapi', reason: 'refs>3 via muapi (Nano Banana 2)' };
        }
        const gemini = this.registry.get('gemini');
        if (gemini && gemini.isConfigured()) {
          return {
            adapter: gemini,
            providerId: 'gemini',
            reason: 'refs>3 but muapi missing — fallback gemini (max 3 refs will be used, others dropped)',
          };
        }
      }
      const gemini = this.registry.get('gemini');
      if (gemini && gemini.isConfigured()) {
        return { adapter: gemini, providerId: 'gemini', reason: 'gemini i2i/t2i (1u)' };
      }
      const muapi = this.registry.get('muapi');
      if (muapi && muapi.isConfigured()) {
        return { adapter: muapi, providerId: 'muapi', reason: 'muapi fallback' };
      }
      const local = this.registry.get('local');
      if (local && local.isConfigured()) {
        return { adapter: local, providerId: 'local', reason: 'local fallback' };
      }
      throw new Error('Router: no image provider configured');
    }

    // 4. Video.
    if (capability === 'video.character-lock' || (Array.isArray(elementIds) && elementIds.length > 0)) {
      const kling = this.registry.get('kling');
      if (!kling || !kling.isConfigured()) throw new Error('Router: kling not configured, required for character-lock');
      return { adapter: kling, providerId: 'kling', model: { id: 'kling-v3-omni', mode: 'pro' }, reason: 'character-lock (kling pro, 10u)' };
    }
    if (capability === 'video.t2v' || capability === 'video.i2v') {
      const kling = this.registry.get('kling');
      if (kling && kling.isConfigured()) {
        const mode = preferredQuality === 'premium' || preferredQuality === 'pro' ? 'pro' : 'standard';
        return { adapter: kling, providerId: 'kling', model: { id: mode === 'pro' ? 'kling-v3-omni' : 'kling-v3', mode }, reason: `kling ${mode}` };
      }
      const seedance = this.registry.get('seedance');
      if (seedance && seedance.isConfigured()) {
        return { adapter: seedance, providerId: 'seedance', reason: 'seedance fallback' };
      }
      throw new Error('Router: no video provider configured (need kling or seedance)');
    }

    // 5. Audio TTS.
    if (capability === 'audio.tts') {
      const fish = this.registry.get('fish');
      const el = this.registry.get('elevenlabs');
      const preferFish = !language || language === 'fr' || (voice && String(voice).includes('narrator-fr'));
      if (preferFish && fish && fish.isConfigured()) {
        return { adapter: fish, providerId: 'fish', reason: 'fish canonical TTS' };
      }
      if (el && el.isConfigured()) {
        return { adapter: el, providerId: 'elevenlabs', reason: 'elevenlabs TTS backup' };
      }
      if (fish && fish.isConfigured()) {
        return { adapter: fish, providerId: 'fish', reason: 'fish TTS fallback' };
      }
      throw new Error('Router: no TTS provider configured');
    }

    // 6. Audio STT.
    if (capability === 'audio.stt-word-level') {
      const el = this.registry.get('elevenlabs');
      if (!el || !el.isConfigured()) throw new Error('Router: elevenlabs required for STT word-level');
      return { adapter: el, providerId: 'elevenlabs', model: { id: 'scribe_v2' }, reason: 'elevenlabs scribe_v2' };
    }

    // 7. Lipsync (delegated to muapi only for now).
    if (capability === 'lipsync.portrait' || capability === 'lipsync.video') {
      const muapi = this.registry.get('muapi');
      if (!muapi || !muapi.isConfigured()) throw new Error('Router: lipsync requires muapi');
      return { adapter: muapi, providerId: 'muapi', reason: 'muapi lipsync' };
    }

    throw new Error(`Router: unknown capability '${capability}'`);
  }
}
