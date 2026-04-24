import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Character register — équivalent Higgsfield Soul ID / Kling Elements côté IVAMIND Studio.
 *
 * Flow MVP :
 *  1. Client upload N photos (10-20 recommandé) via POST body multipart-like { name, description, outfit, photos: [dataURIs] }
 *  2. Serveur écrit les photos dans public/character-refs/custom/<slug>/photo-{i}.png
 *  3. Retourne { id, refUrls: [...] } — id = slug, refUrls servent pour Gemini i2i direct
 *  4. Futur : appeler Kling /v1/elements/create avec task polling → stocker element_id
 *
 * Pour MVP : stockage filesystem local. Le client stocke l'inventaire dans localStorage.
 */

const OUTPUT_DIR_REL = 'public/character-refs/custom';

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || `char-${Date.now()}`;
}

function dataUriToBuffer(dataUri) {
  const m = dataUri.match(/^data:([^;,]+);base64,(.*)$/);
  if (!m) throw new Error('Invalid data URI (must be base64)');
  const mimeType = m[1];
  const ext = mimeType.includes('jpeg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png';
  return { buffer: Buffer.from(m[2], 'base64'), ext, mimeType };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, description, outfit, photos } = body;

    if (!name || typeof name !== 'string') return NextResponse.json({ error: 'name required' }, { status: 400 });
    if (!Array.isArray(photos) || photos.length === 0) return NextResponse.json({ error: 'photos[] required (min 1, recommended 10-20)' }, { status: 400 });
    if (photos.length > 20) return NextResponse.json({ error: 'max 20 photos' }, { status: 400 });

    const id = slugify(name);
    const ROOT = process.cwd();
    const dir = path.join(ROOT, OUTPUT_DIR_REL, id);
    await fs.mkdir(dir, { recursive: true });

    const refUrls = [];
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (typeof p !== 'string') continue;
      try {
        const { buffer, ext } = dataUriToBuffer(p);
        const filename = `photo-${String(i + 1).padStart(2, '0')}.${ext}`;
        await fs.writeFile(path.join(dir, filename), buffer);
        refUrls.push(`/character-refs/custom/${id}/${filename}`);
      } catch (e) {
        console.warn(`[characters/register] photo ${i} skipped: ${e.message}`);
      }
    }

    // Sidecar metadata pour les relectures ultérieures
    const meta = {
      id,
      name,
      description: description || '',
      outfit: outfit || '',
      refUrls,
      photosCount: refUrls.length,
      createdAt: new Date().toISOString(),
      source: 'ivamind-studio-register',
      // Futur : element_id Kling après appel /v1/elements/create
      klingElementId: null,
    };
    await fs.writeFile(path.join(dir, 'character.json'), JSON.stringify(meta, null, 2));

    return NextResponse.json({ status: 'succeeded', ...meta });
  } catch (err) {
    console.error('[byok/characters/register]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  // Liste tous les custom characters stockés côté serveur
  try {
    const ROOT = process.cwd();
    const dir = path.join(ROOT, OUTPUT_DIR_REL);
    try { await fs.access(dir); } catch { return NextResponse.json({ characters: [] }); }
    const slugs = await fs.readdir(dir);
    const chars = [];
    for (const slug of slugs) {
      try {
        const metaPath = path.join(dir, slug, 'character.json');
        const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
        chars.push(meta);
      } catch {}
    }
    return NextResponse.json({ characters: chars });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
