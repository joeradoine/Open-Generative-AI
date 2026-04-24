#!/usr/bin/env node
/**
 * IVAMIND BYOK Provider Layer — smoke test.
 * Runs one minimal call against each configured adapter.
 * Usage: node scripts/smoke-test-providers.js
 * Keys are read from .env.local (auto-loaded).
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// --- Load .env.local -----------------------------------------------------
async function loadEnvLocal() {
  const p = path.join(ROOT, '.env.local');
  if (!existsSync(p)) return;
  const txt = await readFile(p, 'utf8');
  for (const line of txt.split('\n')) {
    const l = line.trim();
    if (!l || l.startsWith('#')) continue;
    const eq = l.indexOf('=');
    if (eq < 0) continue;
    const k = l.slice(0, eq).trim();
    const v = l.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}

async function main() {
  await loadEnvLocal();

  const results = {
    startedAt: new Date().toISOString(),
    env: {
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      KLING: !!(process.env.KLING_ACCESS_KEY && process.env.KLING_SECRET_KEY),
      FISH_API_KEY: !!process.env.FISH_API_KEY,
      ELEVENLABS_API_KEY: !!process.env.ELEVENLABS_API_KEY,
      SEEDANCE_API_KEY: !!process.env.SEEDANCE_API_KEY,
      MUAPI_API_KEY: !!process.env.MUAPI_API_KEY,
    },
    tests: {},
  };

  // Dynamic import AFTER env loaded.
  const mod = await import(path.join(ROOT, 'src/lib/providers/index.js'));
  const {
    GeminiAdapter, KlingAdapter, FishAudioAdapter, ElevenLabsAdapter,
    SeedanceAdapter, LocalInferenceAdapter, MuapiAdapter,
  } = mod;

  // --- Gemini --------------------------------------------------------------
  if (process.env.GEMINI_API_KEY) {
    console.log('→ Gemini: generating 1 image…');
    try {
      const adapter = new GeminiAdapter(process.env.GEMINI_API_KEY);
      const res = await adapter.generateImage({
        prompt: 'a red apple on a white table, cinematic lighting',
        aspectRatio: '1:1',
      });
      results.tests.gemini = { ok: true, status: res.status, asset: res.assets?.[0]?.url, cost: res.costUnits };
      console.log('  ✓', res.assets?.[0]?.url);
    } catch (err) {
      results.tests.gemini = { ok: false, error: err.message };
      console.error('  ✗', err.message);
    }
  } else {
    results.tests.gemini = { skipped: 'no GEMINI_API_KEY' };
  }

  // --- Kling (submit only, no poll) ---------------------------------------
  if (process.env.KLING_ACCESS_KEY && process.env.KLING_SECRET_KEY) {
    console.log('→ Kling: submitting 1 t2v (no poll)…');
    try {
      const adapter = new KlingAdapter({
        accessKey: process.env.KLING_ACCESS_KEY,
        secretKey: process.env.KLING_SECRET_KEY,
      });
      const res = await adapter.generateVideo({
        prompt: 'a quiet mosque at dawn, slow camera',
        duration: 5,
        aspectRatio: '9:16',
        mode: 'standard',
      });
      results.tests.kling = { ok: true, status: res.status, taskId: res.meta?.taskId, cost: res.costUnits };
      console.log('  ✓ taskId:', res.meta?.taskId);
    } catch (err) {
      results.tests.kling = { ok: false, error: err.message };
      console.error('  ✗', err.message);
    }
  } else {
    results.tests.kling = { skipped: 'no KLING keys' };
  }

  // --- Fish ---------------------------------------------------------------
  if (process.env.FISH_API_KEY) {
    console.log('→ Fish: TTS 5-word FR…');
    try {
      const adapter = new FishAudioAdapter(process.env.FISH_API_KEY);
      const res = await adapter.generateAudioTTS({
        text: 'La lumière révèle le cœur.',
        voice: 'ivamind-narrator-fr',
        language: 'fr',
      });
      const localPath = path.join(ROOT, 'public', res.assets[0].url.replace(/^\//, ''));
      const stat = existsSync(localPath) ? (await import('node:fs')).statSync(localPath) : null;
      results.tests.fish = { ok: true, asset: res.assets?.[0]?.url, bytes: stat?.size, durationBytesGt0: !!(stat && stat.size > 0) };
      console.log('  ✓', res.assets?.[0]?.url, stat?.size, 'bytes');
    } catch (err) {
      results.tests.fish = { ok: false, error: err.message };
      console.error('  ✗', err.message);
    }
  } else {
    results.tests.fish = { skipped: 'no FISH_API_KEY' };
  }

  // --- ElevenLabs STT (use the Fish output if available) ------------------
  if (process.env.ELEVENLABS_API_KEY) {
    console.log('→ ElevenLabs: STT on recent audio…');
    try {
      const adapter = new ElevenLabsAdapter(process.env.ELEVENLABS_API_KEY);
      // Use fish output if produced; else look for any mp3 under public/voices or public/byok-output/fish.
      let audioUrl = null;
      if (results.tests.fish?.asset) audioUrl = results.tests.fish.asset;
      if (!audioUrl) {
        const candidates = [
          'public/byok-output/fish',
          'public/voices',
        ];
        for (const dir of candidates) {
          const abs = path.join(ROOT, dir);
          if (!existsSync(abs)) continue;
          const files = (await import('node:fs')).readdirSync(abs).filter((f) => f.endsWith('.mp3'));
          if (files.length) { audioUrl = '/' + path.posix.join(dir.replace(/^public\//, ''), files[0]); break; }
        }
      }
      if (!audioUrl) throw new Error('No audio file found to transcribe (run Fish test first or drop an mp3 in public/voices).');
      const res = await adapter.transcribe({ audioUrl, language: 'fr', model: 'scribe_v1' });
      results.tests.elevenlabs = { ok: true, wordCount: res.meta?.wordCount, captions: res.assets?.[0]?.url };
      console.log('  ✓', res.meta?.wordCount, 'words ·', res.assets?.[0]?.url);
    } catch (err) {
      results.tests.elevenlabs = { ok: false, error: err.message };
      console.error('  ✗', err.message);
    }
  } else {
    results.tests.elevenlabs = { skipped: 'no ELEVENLABS_API_KEY' };
  }

  // --- Seedance (stub) ----------------------------------------------------
  if (process.env.SEEDANCE_API_KEY) {
    const adapter = new SeedanceAdapter(process.env.SEEDANCE_API_KEY);
    const res = await adapter.generateVideo({ prompt: 'stub', duration: 5 });
    results.tests.seedance = { ok: false, status: res.status, note: 'STUB — not yet implemented' };
  } else {
    results.tests.seedance = { skipped: 'no SEEDANCE_API_KEY' };
  }

  // --- Local --------------------------------------------------------------
  {
    const adapter = new LocalInferenceAdapter();
    const ok = await adapter.probe();
    results.tests.local = { healthy: ok };
  }

  // --- Muapi (health only, no call) ---------------------------------------
  results.tests.muapi = process.env.MUAPI_API_KEY
    ? { ok: true, note: 'key present (no call in smoke test)' }
    : { skipped: 'no MUAPI_API_KEY' };

  results.finishedAt = new Date().toISOString();

  const ok = Object.values(results.tests).every(
    (v) => v.skipped || v.ok === true || v.healthy === true
  );
  console.log('\n=== REPORT ===');
  console.log(JSON.stringify(results, null, 2));
  console.log('\n', ok ? 'ALL OK' : 'FAILURES PRESENT');
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(2);
});
