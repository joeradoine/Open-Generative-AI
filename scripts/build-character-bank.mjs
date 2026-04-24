#!/usr/bin/env node
/**
 * Build character bank — 20 refs/persona (4 base + 16 additionnels).
 *
 * Génère 16 images Gemini i2i par personnage pour enrichir la bible IVAMIND.
 * Matrice 5x4 : L1 base (skip, existant) · L2 expressions · L3 poses · L4 angles · L5 lighting.
 * Wardrobe bible-locked par personnage (anti-drift).
 *
 * Usage :
 *   node scripts/build-character-bank.mjs           # full batch (96 imgs)
 *   node scripts/build-character-bank.mjs --persona omar    # 1 persona (16 imgs)
 *   node scripts/build-character-bank.mjs --dry-run         # affiche matrice sans appeler API
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REFS_DIR = path.join(ROOT, 'public', 'character-refs');
const KRONOS_REFS_DIR = '/Users/joeradoine/Library/Mobile Documents/com~apple~CloudDocs/IVAEYES-Kronos-Tests/character-refs';
const MODEL_ID = 'gemini-2.5-flash-image';
const CONCURRENCY = 2; // Gemini rate limit — 4 parallèles cause 503
const MAX_RETRIES = 3;

// ─── Bible personnages IVAMIND (wardrobe LOCKED) ───
const PERSONAS = {
  omar: {
    age: 16, identity: 'Franco-Moroccan teenager',
    locked: 'navy blue K∞ hoodie, rectangular black-frame glasses, curly black hair, light olive skin',
  },
  radoine: {
    age: 40, identity: 'Moroccan father figure',
    locked: 'shaved head, short dark beard neatly trimmed, black rectangular glasses, charcoal dark-grey thobe with mao collar, olive skin',
  },
  soukaina: {
    age: 37, identity: 'Moroccan mother figure',
    locked: 'sage khaki hijab framing face softly, olive-green modest abaya, warm olive skin, gentle features',
  },
  imran: {
    age: 7, identity: 'young boy brother',
    locked: 'oversized grey K∞ hoodie, neatly side-parted black hair, round innocent face, light olive skin',
  },
  issa: {
    age: 5, identity: 'young boy brother',
    locked: 'oversized dark-green round glasses too big for his face, olive-green hoodie with small dinosaur prints, curly hair',
  },
  zayed: {
    age: 4, identity: 'toddler brother',
    locked: 'chaotic curly dark hair, simple khaki t-shirt, chubby toddler cheeks, intense dark eyes',
  },
};

// ─── Matrice 5x4 : 16 variantes par persona (skip L1 base déjà existant) ───
const MATRIX = [
  // L2 EXPRESSIONS (4) — identité émotionnelle
  { line: 'l2-expr', slug: 'smile-soft',        brief: 'soft gentle smile, eyes slightly crinkled, calm expression',           frame: 'head-and-shoulders close-up 85mm' },
  { line: 'l2-expr', slug: 'determination',     brief: 'determined concentrated expression, brow slightly furrowed, focused',   frame: 'head-and-shoulders close-up 85mm' },
  { line: 'l2-expr', slug: 'eyes-closed',       brief: 'eyes peacefully closed, contemplative reflective expression',           frame: 'head-and-shoulders close-up 85mm' },
  { line: 'l2-expr', slug: 'piercing-gaze',     brief: 'piercing direct gaze straight at camera, intense eye contact',          frame: 'extreme close-up on face' },

  // L3 POSES (4) — silhouette waist-up
  { line: 'l3-pose', slug: 'arms-crossed',      brief: 'standing with arms crossed, confident but neutral stance',              frame: 'medium shot waist-up 50mm' },
  { line: 'l3-pose', slug: 'hand-to-chin',      brief: 'hand thoughtfully placed near chin, pensive gesture',                   frame: 'medium shot waist-up 50mm' },
  { line: 'l3-pose', slug: 'back-glancing',     brief: 'three-quarter back view, head turned over shoulder to camera',          frame: 'medium shot waist-up 50mm' },
  { line: 'l3-pose', slug: 'seated-composed',   brief: 'seated with composed posture, hands resting, tranquil',                 frame: 'medium shot waist-up 50mm' },

  // L4 ANGLES (4) — grammaire cinéma 90s Madhouse
  { line: 'l4-angle', slug: 'low-angle',        brief: 'dramatic low-angle shot looking up, heroic cinema composition',         frame: 'low-angle 35mm' },
  { line: 'l4-angle', slug: 'high-angle',       brief: 'slight high-angle plongée shot looking down, isolation mood',           frame: 'high-angle 35mm' },
  { line: 'l4-angle', slug: 'shoulder-85',      brief: 'intimate over-the-shoulder 85mm tight framing of face',                 frame: 'over-shoulder 85mm tight' },
  { line: 'l4-angle', slug: 'dutch-15',         brief: 'subtle Dutch angle tilt 15 degrees, psychological tension',             frame: 'Dutch-angle 35mm tilted 15°' },

  // L5 LIGHTING/CONTEXT (4) — cohérence cross-scène (wardrobe LOCKED)
  { line: 'l5-light', slug: 'golden-backlit',   brief: 'golden hour warm backlight, amber rim light on hair and shoulders',     frame: 'medium close-up 50mm' },
  { line: 'l5-light', slug: 'neon-blue-night',  brief: 'cool blue sodium-neon street light at night, half-face lit',            frame: 'medium close-up 50mm' },
  { line: 'l5-light', slug: 'hlm-interior',     brief: 'French HLM apartment interior, muted neutral flat daylight',            frame: 'medium close-up 50mm' },
  { line: 'l5-light', slug: 'chiaroscuro',      brief: 'strong chiaroscuro dramatic contrast, single key light casting shadow', frame: 'medium close-up 50mm' },
];

const STYLE_SUFFIX =
  'anime manga 90s Madhouse style (Hajime no Ippo + Monster + Urasawa), cel-shaded 2-tone hatching, ' +
  'thick variable brush-pen linework, 35mm Fujifilm Velvia grain, halation on highlights, ' +
  'aspect ratio 9:16 portrait, no text, no logos, no watermark';

const LINE_DIRECTIVE =
  'CRITICAL: preserve EXACT facial identity from reference images — same face shape, same eye shape, ' +
  'same nose, same hair style, same hairline. Only change expression/pose/angle/lighting as instructed. ' +
  'Wardrobe MUST remain bible-locked as described. Do not add or remove accessories.';

// ─── Charge la clé Gemini depuis .env.local ───
async function loadGeminiKey() {
  const envPath = path.join(ROOT, '.env.local');
  const content = await fs.readFile(envPath, 'utf8');
  const match = content.match(/^GEMINI_API_KEY=(.+)$/m);
  if (!match) throw new Error('GEMINI_API_KEY introuvable dans .env.local');
  return match[1].trim();
}

// ─── Charge une image locale en base64 ───
async function loadRef(personaId, refFile) {
  const candidates = [
    path.join(KRONOS_REFS_DIR, personaId, refFile),
    path.join(REFS_DIR, `${personaId}-01-front.png`), // fallback
  ];
  for (const p of candidates) {
    try {
      const buf = await fs.readFile(p);
      return { base64: buf.toString('base64'), mimeType: 'image/png', path: p };
    } catch {}
  }
  throw new Error(`Ref introuvable pour ${personaId} (${refFile})`);
}

// ─── Construit le prompt i2i pour une variante ───
function buildPrompt(personaId, variant) {
  const p = PERSONAS[personaId];
  return [
    `Portrait of a ${p.age}-year-old ${p.identity} character.`,
    `Locked identity (MUST preserve): ${p.locked}.`,
    `New variant: ${variant.brief}.`,
    `Framing: ${variant.frame}.`,
    STYLE_SUFFIX + '.',
    LINE_DIRECTIVE,
  ].join(' ');
}

// ─── Appel Gemini avec retry/backoff ───
async function generateOne(client, personaId, variant, refs) {
  const model = client.getGenerativeModel({ model: MODEL_ID });
  const parts = [
    ...refs.map(r => ({ inlineData: { data: r.base64, mimeType: r.mimeType } })),
    { text: buildPrompt(personaId, variant) },
  ];

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
      });
      const response = result.response;
      for (const cand of (response?.candidates || [])) {
        for (const p of (cand?.content?.parts || [])) {
          if (p.inlineData?.data) {
            return { ok: true, base64: p.inlineData.data, mimeType: p.inlineData.mimeType || 'image/png' };
          }
        }
      }
      throw new Error('Gemini returned no image (safety or text echo)');
    } catch (err) {
      const is503 = /503|high demand|Service Unavailable/i.test(err.message);
      if (attempt < MAX_RETRIES && is503) {
        const backoff = 2000 * Math.pow(2, attempt - 1); // 2s, 4s, 8s
        console.log(`  ⏳ 503 retry ${attempt}/${MAX_RETRIES} in ${backoff}ms — ${personaId}/${variant.slug}`);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      return { ok: false, error: err.message };
    }
  }
  return { ok: false, error: 'max retries exceeded' };
}

// ─── p-limit simple (pas de dep externe) ───
async function runWithLimit(tasks, limit) {
  const results = [];
  const queue = [...tasks];
  const workers = Array.from({ length: limit }, async () => {
    while (queue.length) {
      const task = queue.shift();
      if (!task) break;
      results.push(await task());
    }
  });
  await Promise.all(workers);
  return results;
}

// ─── Main ───
async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');
  const personaArg = [...args].find(a => a.startsWith('--persona='))?.split('=')[1];

  const personas = personaArg ? [personaArg] : Object.keys(PERSONAS);
  const totalJobs = personas.length * MATRIX.length;

  console.log(`\n🎨 IVAMIND Character Bank Builder`);
  console.log(`   Personas : ${personas.join(', ')}`);
  console.log(`   Variants : ${MATRIX.length} × ${personas.length} = ${totalJobs} images`);
  console.log(`   Matrix   : L2 expressions · L3 poses · L4 angles · L5 lighting`);
  console.log(`   Est. cost: ~$${(totalJobs * 0.039).toFixed(2)} · ~${Math.ceil(totalJobs * 10 / CONCURRENCY / 60)} min @ concurrency ${CONCURRENCY}\n`);

  if (dryRun) {
    console.log('--dry-run : matrice affichée, aucun appel API.');
    for (const pid of personas) {
      console.log(`\n${pid.toUpperCase()} — ${PERSONAS[pid].locked}`);
      for (const v of MATRIX) {
        console.log(`  [${v.line}] ${v.slug.padEnd(18)} → ${v.brief.slice(0, 70)}...`);
      }
    }
    return;
  }

  const apiKey = await loadGeminiKey();
  const client = new GoogleGenerativeAI(apiKey);

  let done = 0, ok = 0, failed = 0;
  const tasks = [];

  for (const pid of personas) {
    // Load 3 base refs (front, 3/4L, 3/4R) pour injection bible à chaque gen
    const refs = await Promise.all([
      loadRef(pid, '01-front.png'),
      loadRef(pid, '02-three-quarter-left.png'),
      loadRef(pid, '03-three-quarter-right.png'),
    ]);
    console.log(`📌 ${pid} refs loaded : ${refs.map(r => path.basename(r.path)).join(', ')}`);

    const outDir = path.join(REFS_DIR, pid);
    await fs.mkdir(outDir, { recursive: true });

    for (const variant of MATRIX) {
      tasks.push(async () => {
        const started = Date.now();
        const res = await generateOne(client, pid, variant, refs);
        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        done++;
        if (res.ok) {
          const ext = res.mimeType.includes('jpeg') ? 'jpg' : 'png';
          const filename = `${variant.line}-${variant.slug}.${ext}`;
          const diskPath = path.join(outDir, filename);
          await fs.writeFile(diskPath, Buffer.from(res.base64, 'base64'));
          ok++;
          console.log(`  ✅ [${done}/${totalJobs}] ${pid}/${filename} (${elapsed}s)`);
          return { pid, variant: variant.slug, ok: true, path: diskPath };
        } else {
          failed++;
          console.log(`  ❌ [${done}/${totalJobs}] ${pid}/${variant.slug} — ${res.error.slice(0, 80)}`);
          return { pid, variant: variant.slug, ok: false, error: res.error };
        }
      });
    }
  }

  const results = await runWithLimit(tasks, CONCURRENCY);

  console.log(`\n📊 Done: ${ok} ok · ${failed} failed · ${totalJobs} total`);
  if (failed > 0) {
    console.log(`\nFailed items :`);
    results.filter(r => !r.ok).forEach(r => console.log(`  - ${r.pid}/${r.variant}: ${r.error?.slice(0, 100)}`));
    console.log(`\nRerun manquants : node scripts/build-character-bank.mjs --persona=<id>`);
  }
}

main().catch(err => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});
