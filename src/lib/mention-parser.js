// Parse @mentions dans un prompt — lock automatique du personnage comme Higgsfield.
//
// Usage :
//   const { mentions, cleanPrompt } = parseMentions('Omar @omar walks under the rain', allChars);
//   → mentions = [{ char: { id: 'omar', ... }, raw: '@omar' }]
//   → cleanPrompt = 'Omar  walks under the rain' (mention retirée pour pas pourrir le prompt IA)
//
// Les mentions sont détectées par @<id> ou @<name> (case-insensitive, normalized).
// Utilisé dans Generate studio + Cinema Studio + Video Studio pour inject refs/element_ids auto.

const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

/**
 * @param {string} prompt                                — texte utilisateur
 * @param {Array<{id, name, refUrls?, klingElementId?}>} allChars — bible + customs concat
 * @returns {{ mentions: Array<{char, raw}>, cleanPrompt: string }}
 */
export function parseMentions(prompt, allChars = []) {
  const mentions = [];
  const seen = new Set();
  let cleanPrompt = prompt;

  // Regex : @ suivi d'au moins 1 lettre/chiffre/tiret (IDs slugifiés) ou mots avec accents
  const re = /@([\p{L}\p{N}_-]+)/giu;
  const matches = [...prompt.matchAll(re)];

  for (const m of matches) {
    const raw = m[0];                         // "@omar"
    const needle = normalize(m[1]);           // "omar"
    const char = allChars.find(c => normalize(c.id) === needle || normalize(c.name) === needle);
    if (char && !seen.has(char.id)) {
      seen.add(char.id);
      mentions.push({ char, raw });
    }
  }

  // Nettoyer le prompt des @mentions pour pas pourrir la génération IA
  // (on garde le nom du perso dans le prompt si l'utilisateur l'a tapé à côté,
  //  ou on remplace par le nom propre du perso mentionné)
  for (const m of mentions) {
    cleanPrompt = cleanPrompt.replace(m.raw, m.char.name);
  }

  return { mentions, cleanPrompt };
}

/**
 * Construit les refs[] Gemini à partir des mentions détectées.
 * @param {Array} mentions — retour de parseMentions().mentions
 * @param {number} cap     — 4 (Gemini 2.5) ou 14 (Nano Banana 2)
 */
export function mentionsToRefs(mentions, cap = 4) {
  const refs = [];
  for (const m of mentions) {
    const char = m.char;
    // Bible IVAMIND : char.refUrl (front unique) + char.id pour lookup L1-L5 nested
    if (char.refUrl) {
      refs.push({ url: char.refUrl, role: 'face', characterId: char.id, label: char.name, reason: `@${char.id} mention bible` });
      // Ajouter aussi 3/4 left / right si dispo et budget
      const extras = [
        `/character-refs/${char.id}/02-three-quarter-left.png`,
        `/character-refs/${char.id}/03-three-quarter-right.png`,
        `/character-refs/${char.id}/04-profile.png`,
      ];
      for (const url of extras) {
        if (refs.length >= cap) break;
        refs.push({ url, role: 'face', characterId: char.id, label: char.name, reason: `@${char.id} mention bible extra` });
      }
    } else if (Array.isArray(char.refUrls)) {
      // Custom character registered : inject toutes ses refUrls up to cap
      for (const url of char.refUrls) {
        if (refs.length >= cap) break;
        refs.push({ url, role: 'custom-character', characterId: char.id, label: char.name, reason: `@${char.id} mention custom` });
      }
    }
    if (refs.length >= cap) break;
  }
  return refs.slice(0, cap);
}

/**
 * Extrait les element_ids Kling des mentions (pour video gen cohérente cross-plans).
 * @param {Array} mentions
 * @returns {string[]} — array of Kling element_ids disponibles
 */
export function mentionsToKlingElementIds(mentions) {
  return mentions
    .map(m => m.char.element || m.char.klingElementId)
    .filter(Boolean);
}
