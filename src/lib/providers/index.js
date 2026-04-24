export { BaseAdapter, CAPABILITIES, newJobId } from './types.js';
export { ProviderRegistry } from './registry.js';
export { CapabilityRouter } from './router.js';
export { GeminiAdapter } from './gemini.js';
export { KlingAdapter } from './kling.js';
export { SeedanceAdapter } from './seedance.js';
export { FishAudioAdapter, CANONICAL_VOICES, validateFishInput } from './fish.js';
export { ElevenLabsAdapter, applyNamePatches } from './elevenlabs.js';
export { LocalInferenceAdapter } from './local.js';
export { MuapiAdapter } from './muapi.js';

/**
 * Helper: build a populated ProviderRegistry from a "keys" bag.
 * @param {{
 *   gemini?:string,
 *   klingAccessKey?:string, klingSecretKey?:string,
 *   seedance?:string,
 *   fish?:string,
 *   elevenlabs?:string,
 *   muapi?:string,
 *   enableLocal?:boolean,
 * }} keys
 */
export async function buildRegistryFromKeys(keys = {}) {
  const { ProviderRegistry } = await import('./registry.js');
  const { GeminiAdapter } = await import('./gemini.js');
  const { KlingAdapter } = await import('./kling.js');
  const { SeedanceAdapter } = await import('./seedance.js');
  const { FishAudioAdapter } = await import('./fish.js');
  const { ElevenLabsAdapter } = await import('./elevenlabs.js');
  const { LocalInferenceAdapter } = await import('./local.js');
  const { MuapiAdapter } = await import('./muapi.js');

  const reg = new ProviderRegistry();
  if (keys.gemini) reg.register(new GeminiAdapter(keys.gemini));
  if (keys.klingAccessKey && keys.klingSecretKey) {
    reg.register(new KlingAdapter({ accessKey: keys.klingAccessKey, secretKey: keys.klingSecretKey }));
  }
  if (keys.seedance) reg.register(new SeedanceAdapter(keys.seedance));
  if (keys.fish) reg.register(new FishAudioAdapter(keys.fish));
  if (keys.elevenlabs) reg.register(new ElevenLabsAdapter(keys.elevenlabs));
  if (keys.muapi) reg.register(new MuapiAdapter(keys.muapi));
  if (keys.enableLocal !== false) {
    const local = new LocalInferenceAdapter();
    await local.probe().catch(() => null);
    reg.register(local);
  }
  return reg;
}

/**
 * Convenience: build registry from request body + process.env.
 */
export async function buildRegistryFromRequest(bodyKeys = {}, env = process.env) {
  return buildRegistryFromKeys({
    gemini: bodyKeys.gemini || env.GEMINI_API_KEY,
    klingAccessKey: bodyKeys.klingAccessKey || env.KLING_ACCESS_KEY,
    klingSecretKey: bodyKeys.klingSecretKey || env.KLING_SECRET_KEY,
    seedance: bodyKeys.seedance || env.SEEDANCE_API_KEY,
    fish: bodyKeys.fish || env.FISH_API_KEY,
    elevenlabs: bodyKeys.elevenlabs || env.ELEVENLABS_API_KEY,
    muapi: bodyKeys.muapi || env.MUAPI_API_KEY,
    enableLocal: bodyKeys.enableLocal !== false,
  });
}
