import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sprint 1.1 — lightweight BYOK key storage.
 * GET  → returns which providers have a key configured (server-side only — never the key itself).
 * POST → writes/updates .env.local with provided keys (merge, no delete).
 *
 * NOTE: This is a local-dev convenience. Production should use a real secret store.
 */

const ENV_FILE = path.join(process.cwd(), '.env.local');

const MAPPED = {
  gemini: 'GEMINI_API_KEY',
  klingAccessKey: 'KLING_ACCESS_KEY',
  klingSecretKey: 'KLING_SECRET_KEY',
  seedance: 'SEEDANCE_API_KEY',
  fish: 'FISH_API_KEY',
  elevenlabs: 'ELEVENLABS_API_KEY',
  muapi: 'MUAPI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
  apify: 'APIFY_API_TOKEN',
};

async function readEnv() {
  try {
    const txt = await fs.readFile(ENV_FILE, 'utf8');
    const out = {};
    for (const line of txt.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

async function writeEnv(map) {
  const lines = Object.entries(map)
    .filter(([, v]) => v !== undefined && v !== null && String(v).length > 0)
    .map(([k, v]) => `${k}=${v}`);
  await fs.writeFile(ENV_FILE, lines.join('\n') + '\n', 'utf8');
}

export async function GET() {
  const env = await readEnv();
  const merged = { ...process.env, ...env };
  const status = {};
  for (const [slot, envKey] of Object.entries(MAPPED)) {
    status[slot] = Boolean(merged[envKey] && String(merged[envKey]).length > 0);
  }
  // Flat response (aligned with /ivamind/settings page reading status[p.id] directly).
  // envFile path NOT exposed (security — info de recon pour attaquant distant).
  return NextResponse.json(status);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const current = await readEnv();
    const updates = {};
    for (const [slot, envKey] of Object.entries(MAPPED)) {
      if (body[slot] !== undefined) updates[envKey] = body[slot];
    }
    const merged = { ...current, ...updates };
    await writeEnv(merged);
    return NextResponse.json({ ok: true, written: Object.keys(updates) });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
