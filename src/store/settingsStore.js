'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * BYOK keys stored client-side in localStorage.
 * Server-side mirror can be written via POST /api/byok/settings/keys.
 *
 * Slots (match MAPPED in the settings route):
 *   gemini, klingAccessKey, klingSecretKey, seedance, fish, elevenlabs, muapi
 */

const EMPTY = {
  gemini: '',
  klingAccessKey: '',
  klingSecretKey: '',
  seedance: '',
  fish: '',
  elevenlabs: '',
  muapi: '',
};

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      keys: { ...EMPTY },

      setKey: (slot, value) =>
        set((state) => ({ keys: { ...state.keys, [slot]: value } })),

      setKeys: (patch) =>
        set((state) => ({ keys: { ...state.keys, ...patch } })),

      clearKey: (slot) =>
        set((state) => ({ keys: { ...state.keys, [slot]: '' } })),

      clearAll: () => set({ keys: { ...EMPTY } }),

      /**
       * Keys that have a non-empty value (for request bodies).
       */
      activeKeys: () => {
        const k = get().keys;
        const out = {};
        for (const [slot, value] of Object.entries(k)) {
          if (value && String(value).length > 0) out[slot] = value;
        }
        return out;
      },

      /**
       * Persist to server (.env.local) via API.
       */
      persistToServer: async () => {
        const res = await fetch('/api/byok/settings/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(get().keys),
        });
        if (!res.ok) throw new Error(`persistToServer failed: ${res.status}`);
        return res.json();
      },

      /**
       * Pull server-configured status (booleans, never the actual keys).
       */
      fetchServerStatus: async () => {
        const res = await fetch('/api/byok/settings/keys');
        if (!res.ok) throw new Error(`fetchServerStatus failed: ${res.status}`);
        return res.json();
      },
    }),
    {
      name: 'ivamind-byok-keys',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? window.localStorage : null)),
    }
  )
);
