/**
 * ProviderRegistry — simple in-memory map of providerId → adapter.
 * Not a singleton: instantiate per-request on the server to scope BYOK keys.
 */

export class ProviderRegistry {
  constructor() {
    /** @type {Map<string, any>} */
    this._adapters = new Map();
  }

  register(adapter) {
    if (!adapter || !adapter.providerId) {
      throw new Error('ProviderRegistry.register: adapter must have providerId');
    }
    this._adapters.set(adapter.providerId, adapter);
    return this;
  }

  get(providerId) {
    return this._adapters.get(providerId) || null;
  }

  has(providerId) {
    return this._adapters.has(providerId);
  }

  list() {
    return Array.from(this._adapters.values());
  }

  /**
   * Return all adapters that declare the capability.
   */
  byCapability(capability) {
    return this.list().filter((a) => Array.isArray(a.capabilities) && a.capabilities.includes(capability));
  }
}
