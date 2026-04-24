'use client';

import { create } from 'zustand';

/**
 * Jobs queue + cost tracker for the BYOK pipeline.
 * Pure in-memory (per-tab).
 */

export const useProviderStore = create((set, get) => ({
  /** @type {Array<{jobId:string, providerId:string, kind:'image'|'video'|'audio', status:string, costUnits?:number, assets?:any[], createdAt:number, error?:string, meta?:any}>} */
  jobs: [],
  totalCostUnits: 0,
  running: 0,

  addJob: (job) =>
    set((state) => {
      const entry = {
        createdAt: Date.now(),
        status: 'queued',
        ...job,
      };
      const jobs = [entry, ...state.jobs].slice(0, 200);
      return {
        jobs,
        totalCostUnits: state.totalCostUnits + (entry.costUnits || 0),
        running: state.running + (entry.status === 'running' || entry.status === 'queued' ? 1 : 0),
      };
    }),

  updateJob: (jobId, patch) =>
    set((state) => {
      const jobs = state.jobs.map((j) => (j.jobId === jobId ? { ...j, ...patch } : j));
      const prev = state.jobs.find((j) => j.jobId === jobId);
      let deltaRunning = 0;
      const wasRun = prev && (prev.status === 'running' || prev.status === 'queued');
      const isRun = patch.status === 'running' || patch.status === 'queued';
      if (wasRun && !isRun) deltaRunning -= 1;
      if (!wasRun && isRun) deltaRunning += 1;
      const deltaCost = (patch.costUnits || 0) - (prev?.costUnits || 0);
      return {
        jobs,
        running: Math.max(0, state.running + deltaRunning),
        totalCostUnits: state.totalCostUnits + deltaCost,
      };
    }),

  clearCompleted: () =>
    set((state) => ({ jobs: state.jobs.filter((j) => j.status !== 'succeeded' && j.status !== 'failed') })),

  resetCost: () => set({ totalCostUnits: 0 }),

  /**
   * Poll a running job once (call this from a setInterval in the UI).
   */
  pollJob: async (jobId, providerKeys = {}) => {
    const res = await fetch(`/api/byok/poll/${encodeURIComponent(jobId)}?` + new URLSearchParams({}).toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...(providerKeys ? {} : {}) },
    });
    if (!res.ok) {
      const errTxt = await res.text();
      get().updateJob(jobId, { status: 'failed', error: errTxt.slice(0, 200) });
      return null;
    }
    const data = await res.json();
    get().updateJob(jobId, { status: data.status, assets: data.assets, meta: data.meta, error: data.error });
    return data;
  },
}));
