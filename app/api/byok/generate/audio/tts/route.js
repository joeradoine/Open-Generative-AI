import { NextResponse } from 'next/server';
import { buildRegistryFromRequest, CapabilityRouter } from '@/src/lib/providers/index.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const providerKeys = body.providerKeys || {};
    const registry = await buildRegistryFromRequest(providerKeys);
    const router = new CapabilityRouter(registry);

    const pick = router.pick('audio.tts', {
      forceProvider: body.forceProvider,
      language: body.language || 'fr',
      voice: body.voice,
    });

    const result = await pick.adapter.generateAudioTTS({
      text: body.text,
      voice: body.voice,
      voiceId: body.voiceId,
      speed: body.speed,
      language: body.language,
      format: body.format,
    });

    return NextResponse.json({ ...result, routerReason: pick.reason });
  } catch (err) {
    console.error('[byok/generate/audio/tts]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
