import { NextResponse } from 'next/server';
import { buildRegistryFromRequest } from '@/src/lib/providers/index.js';
import { getJob, putJob } from '@/src/lib/providers/jobStore.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { jobId } = await params;
    const record = getJob(jobId);
    if (!record) {
      return NextResponse.json({ error: 'Unknown jobId (server restarted or never seen)', jobId }, { status: 404 });
    }
    const registry = await buildRegistryFromRequest(record.providerKeys || {});
    const adapter = registry.get(record.providerId);
    if (!adapter) {
      return NextResponse.json({ error: `Provider ${record.providerId} not reconfigurable (missing keys)`, jobId }, { status: 400 });
    }
    const idToPoll = record.providerTaskId || jobId;
    const opts = record.providerId === 'kling' ? { isI2V: record.isI2V } : undefined;
    const result = await adapter.pollJob(idToPoll, opts);
    putJob(jobId, { ...record, status: result.status });
    return NextResponse.json({ ...result, jobId });
  } catch (err) {
    console.error('[byok/poll]', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
