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

    let capability = 'video.t2v';
    if (Array.isArray(body.elementIds) && body.elementIds.length > 0) capability = 'video.character-lock';
    else if (body.startFrameUrl) capability = 'video.i2v';

    const pick = router.pick(capability, {
      forceProvider: body.forceProvider,
      elementIds: body.elementIds,
      preferredQuality: body.mode === 'pro' ? 'pro' : 'standard',
    });

    const result = await pick.adapter.generateVideo({
      prompt: body.prompt,
      startFrameUrl: body.startFrameUrl,
      endFrameUrl: body.endFrameUrl,
      duration: body.duration || 5,
      aspectRatio: body.aspectRatio || '9:16',
      mode: body.mode,
      elementIds: body.elementIds,
      soundOn: body.soundOn ?? false,
    });

    if (result.jobId) {
      putJob(result.jobId, {
        providerId: pick.providerId,
        providerKeys,
        kind: 'video',
        status: result.status,
        providerTaskId: result.meta?.taskId || null,
        isI2V: Boolean(body.startFrameUrl),
      });
    }
    return NextResponse.json({ ...result, routerReason: pick.reason });
  } catch (err) {
    console.error('[byok/generate/video]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
