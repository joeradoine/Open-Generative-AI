import { NextResponse } from 'next/server';
import { buildRegistryFromRequest, CapabilityRouter } from '@/src/lib/providers/index.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Accepts either:
 *  - application/json: { providerKeys, audioUrl, language, diarize, model }
 *  - multipart/form-data: file=<blob> + fields providerKeys (JSON string), language, diarize, model
 */
export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let providerKeys = {};
    let params = {};
    /** @type {Buffer|null} */
    let audioBuffer = null;
    let filename = 'audio.mp3';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (file && typeof file === 'object' && 'arrayBuffer' in file) {
        audioBuffer = Buffer.from(await file.arrayBuffer());
        filename = file.name || filename;
      }
      const keysStr = form.get('providerKeys');
      if (keysStr) {
        try { providerKeys = JSON.parse(String(keysStr)); } catch { /* ignore */ }
      }
      params.language = form.get('language') || undefined;
      params.diarize = form.get('diarize') === 'true';
      params.model = form.get('model') || undefined;
    } else {
      const body = await request.json();
      providerKeys = body.providerKeys || {};
      params = { audioUrl: body.audioUrl, language: body.language, diarize: body.diarize, model: body.model };
    }

    const registry = await buildRegistryFromRequest(providerKeys);
    const router = new CapabilityRouter(registry);
    const pick = router.pick('audio.stt-word-level', {});

    const result = await pick.adapter.transcribe({
      audioUrl: params.audioUrl,
      audioBuffer,
      filename,
      language: params.language,
      diarize: params.diarize,
      model: params.model,
    });

    return NextResponse.json({ ...result, routerReason: pick.reason });
  } catch (err) {
    console.error('[byok/generate/audio/stt]', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
