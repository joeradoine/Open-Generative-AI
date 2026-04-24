// Smart ref picker — exploite la banque 20 refs/persona selon le contexte shot.
//
// Principe : on ne passe JAMAIS les 4 mêmes refs (front/3/4L/3/4R/profile) bêtement.
// On analyse le prompt + preset camera + style bundle → on pick les 4 refs LES PLUS PERTINENTES
// pour ce shot précis parmi les 20 disponibles (L1 base · L2 expr · L3 poses · L4 angles · L5 lighting).
//
// Best practice Gemini 2026 (Perplexity) : 4 refs max par prompt, mais bien choisies.
//
// Toutes les 20 refs existent en public/character-refs/<id>/ (L1 flat + L2-L5 nested).
//
// Usage :
//   import { pickSmartRefs } from '@/src/lib/ref-picker';
//   const refs = pickSmartRefs('soukaina', {
//     prompt: 'close-up contemplatif nuit',
//     cameraPresetId: 'low-angle',
//     styleBundleId: 'indie-sundance',
//   });
//   // → [
//   //   { url, angle: 'front',         reason: 'bible face anchor (always)' },
//   //   { url, angle: 'piercing-gaze', reason: 'expression matches "contemplatif"' },
//   //   { url, angle: 'low-angle',     reason: 'matches preset camera' },
//   //   { url, angle: 'neon-blue-night', reason: 'matches style bundle night' },
//   // ]

const REF_BANK = {
  // Base (L1) — 4 refs turnaround
  base: {
    'front':              { path: (id) => `/character-refs/${id}-01-front.png`, desc: 'face frontale' },
    'three-quarter-left': { path: (id) => `/character-refs/${id}/02-three-quarter-left.png`, desc: 'trois-quart gauche' },
    'three-quarter-right':{ path: (id) => `/character-refs/${id}/03-three-quarter-right.png`, desc: 'trois-quart droite' },
    'profile':            { path: (id) => `/character-refs/${id}/04-profile.png`, desc: 'profil' },
  },
  // Expressions (L2) — identité émotionnelle
  expressions: {
    'smile-soft':    { path: (id) => `/character-refs/${id}/l2-expr-smile-soft.png`,    keywords: ['sourire', 'smile', 'joy', 'doux', 'tendre', 'calme'] },
    'determination': { path: (id) => `/character-refs/${id}/l2-expr-determination.png`, keywords: ['determ', 'concentr', 'focused', 'brow', 'volonte', 'decid'] },
    'eyes-closed':   { path: (id) => `/character-refs/${id}/l2-expr-eyes-closed.png`,   keywords: ['yeux fermes', 'eyes closed', 'contempl', 'reflect', 'sujud', 'priere', 'sommeil'] },
    'piercing-gaze': { path: (id) => `/character-refs/${id}/l2-expr-piercing-gaze.png`, keywords: ['regard', 'gaze', 'perc', 'intens', 'direct', 'camera', 'yeux'] },
  },
  // Poses (L3) — silhouette waist-up
  poses: {
    'arms-crossed':     { path: (id) => `/character-refs/${id}/l3-pose-arms-crossed.png`,     keywords: ['bras croises', 'arms crossed', 'confident', 'stance'] },
    'hand-to-chin':     { path: (id) => `/character-refs/${id}/l3-pose-hand-to-chin.png`,     keywords: ['main au menton', 'pensive', 'thought', 'reflex', 'hand chin'] },
    'back-glancing':    { path: (id) => `/character-refs/${id}/l3-pose-back-glancing.png`,    keywords: ['dos', 'back', 'shoulder turn', 'glanc', 'over the shoulder'] },
    'seated-composed':  { path: (id) => `/character-refs/${id}/l3-pose-seated-composed.png`,  keywords: ['assis', 'seated', 'composed', 'sitting', 'tranquil'] },
  },
  // Angles cam (L4) — grammaire cinéma
  angles: {
    'low-angle':    { path: (id) => `/character-refs/${id}/l4-angle-low-angle.png`,    keywords: ['low angle', 'contre-plongee', 'hero', 'heroic', 'up'] },
    'high-angle':   { path: (id) => `/character-refs/${id}/l4-angle-high-angle.png`,   keywords: ['high angle', 'plongee', 'isolation', 'down'] },
    'shoulder-85':  { path: (id) => `/character-refs/${id}/l4-angle-shoulder-85.png`,  keywords: ['shoulder', 'close-up', 'tight', 'intim', 'over shoulder', '85mm', 'portrait'] },
    'dutch-15':     { path: (id) => `/character-refs/${id}/l4-angle-dutch-15.png`,     keywords: ['dutch', 'tilted', 'tension', 'psychological', 'disorient'] },
  },
  // Lighting (L5) — context/mood
  lighting: {
    'golden-backlit':  { path: (id) => `/character-refs/${id}/l5-light-golden-backlit.png`, keywords: ['golden', 'hour', 'warm', 'amber', 'sunset', 'backlit', 'rim', 'spiritual'] },
    'neon-blue-night': { path: (id) => `/character-refs/${id}/l5-light-neon-blue-night.png`, keywords: ['neon', 'night', 'nuit', 'blue', 'cool', 'street', 'sodium', 'urban'] },
    'hlm-interior':    { path: (id) => `/character-refs/${id}/l5-light-hlm-interior.png`,    keywords: ['hlm', 'interior', 'interieur', 'domest', 'appartement', 'flat daylight'] },
    'chiaroscuro':     { path: (id) => `/character-refs/${id}/l5-light-chiaroscuro.png`,     keywords: ['chiaroscuro', 'dramat', 'dark', 'contrast', 'shadow', 'caravag', 'moody'] },
  },
};

// Normalize text for matching (lowercase, no accent)
const normalize = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Score a ref against a context string.
// Use word-boundary regex pour éviter les faux positifs (ex: "up" matche "supermarket").
// Match entier du mot (ou multi-mots) — pas substring interne.
function scoreRef(refEntry, contextText) {
  if (!refEntry.keywords) return 0;
  const ctx = normalize(contextText);
  let score = 0;
  for (const kw of refEntry.keywords) {
    const nkw = normalize(kw).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${nkw}\\b`, 'i');
    if (re.test(ctx)) score += 1;
  }
  return score;
}

/**
 * Sélectionne 4 refs smart pour un perso donné selon le contexte.
 * @param {string} characterId ex. 'soukaina'
 * @param {Object} context
 * @param {string} context.prompt       — le prompt utilisateur
 * @param {string} [context.cameraPresetId] — id du camera preset sélectionné
 * @param {string} [context.styleBundleId]  — id du style bundle
 * @param {Object} [context.camera] — preset object entier { id, label, category, promptHint... }
 * @param {Object} [context.style]  — bundle object entier { id, label, extraHint... }
 * @returns {Array<{url:string, angle:string, reason:string, source:string}>}
 */
export function pickSmartRefs(characterId, context = {}) {
  const { prompt = '', camera, style } = context;

  // Contexte textuel combiné pour scoring
  const fullCtx = [
    prompt,
    camera?.promptHint, camera?.label, camera?.useCase, camera?.category,
    style?.extraHint, style?.label, style?.description,
  ].filter(Boolean).join(' ');

  const picks = [];

  // ─── Slot 1 : TOUJOURS front (anchor bible) ───
  picks.push({
    url: REF_BANK.base.front.path(characterId),
    angle: 'front',
    source: 'L1-base',
    reason: 'bible face anchor (toujours)',
  });

  // ─── Slot 2 : meilleure expression selon prompt ───
  const exprEntries = Object.entries(REF_BANK.expressions)
    .map(([k, v]) => ({ key: k, entry: v, score: scoreRef(v, fullCtx) }))
    .sort((a, b) => b.score - a.score);
  if (exprEntries[0].score > 0) {
    picks.push({
      url: exprEntries[0].entry.path(characterId),
      angle: exprEntries[0].key,
      source: 'L2-expr',
      reason: `expression match "${exprEntries[0].entry.keywords.find(k => normalize(fullCtx).includes(normalize(k))) || exprEntries[0].key}"`,
    });
  } else {
    // fallback 3/4 left pour avoir un 2e angle bible
    picks.push({
      url: REF_BANK.base['three-quarter-left'].path(characterId),
      angle: 'three-quarter-left',
      source: 'L1-base',
      reason: 'fallback bible 3/4 gauche (pas de match expression)',
    });
  }

  // ─── Slot 3 : meilleur angle caméra selon preset ───
  const angleEntries = Object.entries(REF_BANK.angles)
    .map(([k, v]) => ({ key: k, entry: v, score: scoreRef(v, fullCtx) }))
    .sort((a, b) => b.score - a.score);
  if (angleEntries[0].score > 0) {
    picks.push({
      url: angleEntries[0].entry.path(characterId),
      angle: angleEntries[0].key,
      source: 'L4-angle',
      reason: `angle match preset "${camera?.label || angleEntries[0].key}"`,
    });
  } else {
    picks.push({
      url: REF_BANK.base['three-quarter-right'].path(characterId),
      angle: 'three-quarter-right',
      source: 'L1-base',
      reason: 'fallback bible 3/4 droite',
    });
  }

  // ─── Slot 4 : lighting / context selon style bundle ───
  const lightEntries = Object.entries(REF_BANK.lighting)
    .map(([k, v]) => ({ key: k, entry: v, score: scoreRef(v, fullCtx) }))
    .sort((a, b) => b.score - a.score);
  if (lightEntries[0].score > 0) {
    picks.push({
      url: lightEntries[0].entry.path(characterId),
      angle: lightEntries[0].key,
      source: 'L5-light',
      reason: `lighting match style "${style?.label || lightEntries[0].key}"`,
    });
  } else {
    // fallback une pose pour diversité silhouette
    const poseEntries = Object.entries(REF_BANK.poses)
      .map(([k, v]) => ({ key: k, entry: v, score: scoreRef(v, fullCtx) }))
      .sort((a, b) => b.score - a.score);
    const topPose = poseEntries[0];
    if (topPose.score > 0) {
      picks.push({
        url: topPose.entry.path(characterId),
        angle: topPose.key,
        source: 'L3-pose',
        reason: `pose match "${topPose.entry.keywords.find(k => normalize(fullCtx).includes(normalize(k))) || topPose.key}"`,
      });
    } else {
      picks.push({
        url: REF_BANK.base.profile.path(characterId),
        angle: 'profile',
        source: 'L1-base',
        reason: 'fallback bible profile (silhouette)',
      });
    }
  }

  // Chaque ref = characterId attaché pour le label UI
  return picks.map(r => ({ ...r, characterId, role: 'face' }));
}

/**
 * Pick pour plusieurs persos — balance intelligemment le budget total.
 * @param {string[]} characterIds
 * @param {Object} context
 * @param {number} [maxRefs=4] — cap total (Gemini 2.5 = 4, Nano Banana 2 = 14).
 *
 * Répartition :
 *  maxRefs 4  : 1 perso → 4 / 2 persos → 2+2 / 3-4 → 1 chacun
 *  maxRefs 14 : 1 perso → 7 (L1 + expressions + angles + light best) / 2 persos → 4+4 / 3 → 3+3+3 / 4+ → 3 chacun
 */
export function pickSmartRefsMulti(characterIds, context, maxRefs = 4) {
  if (!characterIds.length) return [];
  if (characterIds.length === 1) {
    const full = pickSmartRefs(characterIds[0], context);
    // Avec Nano Banana 2 (14 refs), on enrichit avec L2-L5 supplémentaires + front second
    if (maxRefs > 4) {
      const extras = buildExtendedRefs(characterIds[0], context, maxRefs - full.length);
      return [...full, ...extras].slice(0, maxRefs);
    }
    return full.slice(0, maxRefs);
  }

  const perChar = Math.max(1, Math.floor(maxRefs / characterIds.length));
  const refs = [];
  for (const id of characterIds) {
    const smart = pickSmartRefs(id, context);
    if (maxRefs <= 4) {
      // mode Gemini 2.5 — mini 1-2 refs / perso
      for (let i = 0; i < perChar && refs.length < maxRefs; i++) {
        if (smart[i]) refs.push(smart[i]);
      }
    } else {
      // mode Nano Banana 2 — jusqu'à 4-7 refs / perso
      for (let i = 0; i < Math.min(perChar, smart.length) && refs.length < maxRefs; i++) {
        refs.push(smart[i]);
      }
      // extras L2/L3/L5 si budget restant
      if (refs.length < maxRefs) {
        const extras = buildExtendedRefs(id, context, perChar - smart.length);
        for (const e of extras) {
          if (refs.length >= maxRefs) break;
          refs.push(e);
        }
      }
    }
  }
  return refs.slice(0, maxRefs);
}

/**
 * Construit des refs supplémentaires au-delà des 4 L1+smart pour exploiter Nano Banana 2 (14 refs).
 * Ajoute expressions + poses + angles + lighting additionnels scorés secondaires.
 */
function buildExtendedRefs(characterId, context, count) {
  if (count <= 0) return [];
  const { prompt = '', camera, style } = context;
  const fullCtx = [
    prompt, camera?.promptHint, camera?.label, camera?.useCase,
    style?.extraHint, style?.label,
  ].filter(Boolean).join(' ');

  const allLevels = [
    ...Object.entries(REF_BANK.expressions).map(([k, v]) => ({ level: 'L2-expr', key: k, entry: v, score: scoreRef(v, fullCtx) })),
    ...Object.entries(REF_BANK.poses).map(([k, v]) => ({ level: 'L3-pose', key: k, entry: v, score: scoreRef(v, fullCtx) })),
    ...Object.entries(REF_BANK.angles).map(([k, v]) => ({ level: 'L4-angle', key: k, entry: v, score: scoreRef(v, fullCtx) })),
    ...Object.entries(REF_BANK.lighting).map(([k, v]) => ({ level: 'L5-light', key: k, entry: v, score: scoreRef(v, fullCtx) })),
  ];
  allLevels.sort((a, b) => b.score - a.score);

  const extras = [];
  const seen = new Set();
  for (const item of allLevels) {
    if (extras.length >= count) break;
    const url = item.entry.path(characterId);
    if (seen.has(url)) continue;
    seen.add(url);
    extras.push({
      url, angle: item.key, source: item.level, characterId, role: 'face',
      reason: item.score > 0 ? `secondary match "${item.key}"` : `fill ${item.level}`,
    });
  }
  return extras;
}
