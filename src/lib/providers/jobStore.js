/**
 * In-process job store for BYOK polling.
 * Maps our internal jobId -> { providerId, providerTaskId, keys, meta }.
 * NOT persistent — restarts lose state. Good enough for Sprint 1.1.
 */

/** @type {Map<string, any>} */
const _jobs = new Map();

export function putJob(jobId, record) {
  _jobs.set(jobId, { ...record, createdAt: Date.now() });
}

export function getJob(jobId) {
  return _jobs.get(jobId) || null;
}

export function deleteJob(jobId) {
  _jobs.delete(jobId);
}

export function listJobs() {
  return Array.from(_jobs.entries()).map(([k, v]) => ({ jobId: k, ...v }));
}
