# Audit complet — features du fork Anil-matcha/Open-Generative-AI

**Date** : 2026-04-24
**Branch** : `main` (HEAD `f8ed1fe`)
**Contexte** : Joe demande pourquoi on a pas exploité tout ce que le fork offre. Voici l'inventaire et le plan stratégique.

---

## 🎯 Résumé exécutif

Le fork est **massivement sous-exploité**. On a bypass le legacy via `BYOK_BYPASS=true` en partant du principe qu'il était inutile (car Muapi-dépendant). **C'était une erreur** : beaucoup de composants UI sont déjà codés et peuvent être re-wirés vers notre Provider Layer BYOK direct (Gemini/Kling/Fish) en arrachant juste les calls Muapi.

**Leverage estimé** : 3-4 semaines de dev économisées en réutilisant les studios existants au lieu de tout refaire côté `/ivamind/*`.

---

## 📦 Inventaire des studios déjà codés

### 1. Cinema Studio (`packages/studio/src/components/CinemaStudio.jsx`)
**Ce que ça fait** : interface photoréaliste cinéma avec **contrôles pro Lens / Focal Length / Aperture** → EXACTEMENT ce que Joe veut pour reproduire Higgsfield Cinema Studio 2.0.

**État** : ✅ UI complète, ❌ backend Muapi-only.

**Action** : arracher Muapi, replacer par `/api/byok/generate/image` avec `stylePreset` paramétrisé (cf. `src/data/camera-styles.js`).

### 2. Workflow Studio (`packages/studio/src/components/WorkflowStudio.jsx` + `WorkflowUI.jsx`)
**Ce que ça fait** : node-based pipeline builder visuel (inspiré ComfyUI/Weavy). Browse templates communautaires, créer ses propres workflows, run via playground interactif.

**État** : ✅ UI node editor complet, ❌ backend Muapi.

**Action stratégique** : **le réutiliser pour le pipeline IVAMIND** au lieu de hardcoder le wizard `/ivamind/new-episode`. Chaque étape (research → script → tts → storyboard → images → clips → mix → render) devient un node connectable.

### 3. Image Studio (legacy `/studio/*`)
**Ce que ça fait** :
- 50+ modèles text-to-image (Flux · Nano Banana 2 · Seedream 5.0 · Ideogram · GPT-4o · Midjourney)
- 55+ modèles image-to-image (Kontext · Nano Banana 2 Edit · Seedream 5.0 Edit · Upscaler)
- Auto-switch t2i/i2i selon présence de ref
- **Multi-Image Input : 14 refs max** (comme Gemini !)
- Upload History picker réutilisable cross-sessions

**État** : ❌ entièrement Muapi.

**Gain possible** : l'UI multi-ref 14 slots est exactement ce qu'il nous faudra quand on aura à gérer 20 refs bible + custom uploads. À récupérer.

### 4. Video Studio (legacy `/studio/*`)
**Ce que ça fait** : 40+ t2v + 60+ i2v models. Auto-switch selon start-frame présent.

**Gain possible** : liste exhaustive des modèles vidéo 2026 (Kling 3.0, Seedance 2.0, Veo 3.1, Sora 2, Happy Horse 1.0 Alibaba, etc.) — on en prend 2 mais on pourrait router parmi 60.

### 5. Lip Sync Studio
**Ce que ça fait** : 9 modèles dédiés :
- Portrait image + audio → talking video
- Video + audio → lipsync video

**Gain énorme pour IVAMIND** : permet de faire parler **Omar ou Radoine directement** avec un dialogue distinct de la voix narrateur. Jusqu'ici on ne faisait QUE narration Whistledown. Lip sync ouvre : dialogues inter-persos, trailer avec répliques, scènes dialoguées.

### 6. Local Model Inference (`components/LocalModelManager.js`)
**Ce que ça fait** : génération on-device sans clé API :
- Z-Image Turbo / Base
- Dreamshaper
- Realistic Vision
- Anything v5
- SDXL
- Powered by `stable-diffusion.cpp` + Metal GPU acceleration Apple Silicon

**Gain stratégique** :
1. **Fallback gratuit** quand Gemini rate limit 503 ou quota épuisé
2. **Confidentialité** : images sensibles générées 100% local
3. **Vitesse** : pas de round-trip API
4. **Mac Mini M4 Pro = GPU Metal idéal** → tout Joe est équipé pour ça

### 7. Packages / Monorepo (`packages/`)
- `packages/Open-Poe-AI` : alternative Poe multi-modal chatbot open-source
- `packages/Vibe-Workflow` : alternative Weavy / FloraFauna / Freepik Spaces / Krea nodes
- `packages/studio` : le monorepo studio lui-même

---

## 🔥 Features absentes qu'on doit ajouter

### Depuis Higgsfield (Perplexity research 2026-04-24)

| Feature Higgsfield | Équivalent IVAMIND actuel | Gap à combler |
|---|---|---|
| **Soul ID** (10-20 refs → LoRA fine-tune) | Gemini i2i bible 20 refs (pas de LoRA) | Fine-tuning LoRA local via `packages/studio` local inference + SDXL LoRA training |
| **Popcorn** (multi-shot storyboard avec mémoire) | Stub Sprint 1.4 | Route `/api/byok/storyboard/popcorn` qui génère 8 images connectées via chain prompting Gemini |
| **Cinema Studio 2.0** (sensor+lens+aperture déterministe) | `src/data/camera-styles.js` créé aujourd'hui | Wire CinemaStudio.jsx legacy vers nos presets |
| **50+ camera movements** | `src/data/camera-presets.js` (24 presets) créé | Passer de 24 → 50 presets, wire chaque preset vers Remotion component OU Kling motion prompt |
| **Motion Control Kling** (action transfer image + video ref) | Pas implémenté | Route `/api/byok/generate/video/motion-transfer` |
| **Voice Binding** (voix unique × 5 langues) | Fish Le Narrateur FR 1 langue | Ajouter autres voix fish + langues (EN Adrian déjà dispo) |
| **Recast** (character swap in existing video) | Pas implémenté | Stub Sprint 1.5 |
| **Angles 2.0** (généère n'importe quel angle d'une image) | Nos presets manuels | Route spécifique `/api/byok/angles` qui reçoit img + angle prompt |
| **Skin Enhancer** | Pas implémenté | Pass-through Muapi OU modèle local stable-diffusion |

### Fonctionnalités transversales

- **Marketplace apps** : système de presets communautaires partageables
- **Approval workflow 3-gates** : character / narrative / compliance
- **Real-time collaboration** (team mode via Electron multiprocess)
- **Islamic compliance classifier** : modèle qui valide le contenu IVAMIND avant publication

---

## 🎯 Plan stratégique recommandé

### Option A — Récupérer le legacy wholesale (rapide)
1. Arracher Muapi de `CinemaStudio.jsx` → replacer calls par `/api/byok/generate/image`
2. Arracher Muapi de `WorkflowStudio.jsx` → replacer par notre router
3. Arracher Muapi de `ImageStudio.js` → idem
4. Activer `LocalModelManager` pour Z-Image fallback
5. **Garder `/ivamind/*`** comme overlay série IVAMIND + utiliser les studios legacy comme "outils généralistes"

**Avantages** : ~3-4 semaines gagnées, écosystème 200+ modèles instantané.
**Inconvénients** : 2 UX parallèles (legacy gris + ivamind gold), risque confusion.

### Option B — Sélectivement porter vers `/ivamind/*` (propre)
1. Porter les contrôles Cinema Studio dans `/ivamind/generate` (notre design gold)
2. Porter Workflow Studio dans `/ivamind/workflow` (pour le pipeline orchestrator)
3. Porter Lip Sync Studio dans `/ivamind/voice` (ajouter dialogue character-speak)
4. Porter Local Inference dans settings

**Avantages** : UX unifiée, cohérence brand.
**Inconvénients** : ~6-8 semaines, plus de code custom.

### Option C — Hybride pragmatique ✅ RECOMMANDÉ
1. **Now (1 jour)** : ajouter le redirect `/studio` → `/ivamind/dashboard` **bidirectionnel** avec warning "tu es sur l'outil générique, reviens à IVAMIND Series" quand user clique sur legacy
2. **Sprint 1.4 (1 semaine)** : wire CinemaStudio legacy sur notre BYOK (Muapi→Gemini), ouvrir `/studio/cinema` en "outil générique avancé"
3. **Sprint 1.5 (2 semaines)** : importer les nodes Workflow Studio dans `/ivamind/workflow` pour pipeline visual
4. **Sprint 2 (1 mois)** : activer Local Inference + Lip Sync Studio côté IVAMIND

---

## ✅ Actions immédiates (ce Sprint)

- [x] Auditer le fork (ce document)
- [ ] Patcher `CinemaStudio.jsx` pour bypass Muapi → BYOK direct Gemini (arracher juste 1-2 fetch calls)
- [ ] Ajouter le lien sidebar "Cinema Studio (générique)" pointant vers `/studio/cinema` patché
- [ ] Tester Local Inference Z-Image sur Mac Mini → si fonctionne, fallback automatique quand Gemini rate limit

---

## 📊 Modèles disponibles dans le fork (à exploiter)

### Text-to-Image (50+)
Flux.1 Pro / Flux.1 Dev / Nano Banana 2 (Gemini 3.1 Flash Image 1K/2K/4K) / Seedream 5.0 / Ideogram / GPT-4o / Midjourney / Imagen 4 / Recraft V3 / Stable Image Ultra / DALL-E 3 / etc.

### Image-to-Image (55+)
Flux Kontext Dev (14 refs) / Nano Banana 2 Edit (14 refs) / Seedream 5.0 Edit / Seededit / Upscaler Magnific / Recraft Inpaint / etc.

### Text-to-Video (40+)
Kling 3.0 (Omni/basic) / Seedance 2.0 / Veo 3.1 / Sora 2 / Happy Horse 1.0 Alibaba / MiniMax Hailuo / Luma Dream Machine / Hunyuan Video / Runway Gen-3 / Pika Labs 1.5 / etc.

### Image-to-Video (60+)
Kling 3.0 i2v / Seedance 2.0 i2v / Luma i2v / Hailuo i2v / Runway i2v / Wan 2.2 / etc.

### Lip Sync (9)
Portrait + audio → Sync Labs / Gooey AI TalkHead / RightLine / Replicate lip-sync / etc.

### Local (GPU Metal M-series)
Z-Image Turbo / Z-Image Base / Dreamshaper / Realistic Vision / Anything v5 / SDXL

---

## 🔑 Conclusion

Le fork est un **trésor sous-exploité** que notre approche "BYOK_BYPASS + tout refaire côté ivamind" a enterré. L'option hybride pragmatique permet de monter **à niveau Higgsfield en 4-6 semaines** au lieu de 6 mois en solo, en capitalisant sur le code déjà présent.

**Prochain move** : dès que Joe valide Option C, je commence par patcher CinemaStudio.jsx pour le re-wire sur BYOK. 1-2 jours de dev pour débloquer un studio complet.
