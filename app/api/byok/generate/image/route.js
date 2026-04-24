import { NextResponse } from 'next/server';
import { buildRegistryFromRequest, CapabilityRouter } from '@/src/lib/providers/index.js';
import { putJob } from '@/src/lib/providers/jobStore.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const providerKeys = body.providerKeys || {};
    const registry = await buildRegistryFromRequest(providerKeys);
    const router = new CapabilityRouter(registry);

    const refCount = Array.isArray(body.refs) ? body.refs.length : 0;
    const capability = refCount > 0 ? 'image.i2i' : 'image.t2i';

    const pick = router.pick(capability, {
      forceProvider: body.forceProvider,
      refCount,
      maxCostUnits: body.maxCostUnits,
    });

    const result = await pick.adapter.generateImage({
      prompt: body.prompt,
      negativePrompt: body.negativePrompt,
      aspectRatio: body.aspectRatio,
      resolution: body.resolution,
      refs: body.refs,
      seed: body.seed,
      modelHint: body.modelHint,
      modelEndpoint: body.modelEndpoint,
    });

    if (result.jobId) {
      putJob(result.jobId, {
        providerId: pick.providerId,
        providerKeys,
        kind: 'image',
        status: result.status,
      });
    }
    return NextResponse.json({ ...result, routerReason: pick.reason });
  } catch (err) {
    console.error('[byok/generate/image]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
