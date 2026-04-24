# IVAMIND STUDIO — UX Brief v1

> **Source**: UX-designer agent, 2026-04-24
> **Target user**: Joe Radoine (solo creator + designer)
> **Product**: Fork Open-Generative-AI → studio manga/anime production IVAMIND (série TikTok islam niche, 49 EPs)
> **Channels**: Web `http://localhost:3000/studio` + Electron `.dmg` macOS Apple Silicon

---

## 0. Design System

### Accent recommandé : Gold `#f9b233`

**Justification.** L'app est un outil de production pour une IP de contenu — IVAMIND est le nom public, IVAEYES le système de marque. Le gold crée une continuité directe entre le rendu final (captions actives gold dans Remotion, header Oswald gold, TypoFlash gold) et l'outil qui les produit. Joe voit du gold 40h/semaine dans ses rendus : l'outil doit parler la même langue visuelle. Vert Matrix = réservé au statut "running" semantic uniquement.

### Tokens

**Palette neutre (12 shades — base `#0a0a12`)**

```
neutral-50:  #f2f2f7   (text primary)
neutral-100: #d4d4e0   (text secondary)
neutral-200: #a0a0b8   (text muted)
neutral-300: #6b6b82   (text disabled)
neutral-400: #4a4a60   (border strong)
neutral-500: #3a3a4c   (border mid)
neutral-600: #2a2a38   (border subtle)
neutral-700: #1a1a24   (surface elevated)
neutral-800: #12121a   (surface base)
neutral-900: #0e0e16   (surface sunken)
neutral-950: #08080c   (background deep)
neutral-1000:#0a0a12   (background root)
```

**Accent gold**

```
gold-100:  #fef3d1   (gold tint bg)
gold-400:  #fbc84a   (gold hover)
gold-500:  #f9b233   (gold default — primary CTA)
gold-600:  #e09b1e   (gold pressed)
gold-glow: rgba(249,178,51,0.18)  (focus ring bg)
```

**Semantic colors**

```
success:   #00c853   (delivered, match OK)
warning:   #ffab00   (partial, retrying)
error:     #ff3b30   (failed, gate blocked)
info:      #2979ff   (running, processing)
matrix:    #00ff41   (running node edge pulse ONLY)
```

**Spacing scale (4px base)**

```
sp-1: 4px  | sp-2: 8px  | sp-3: 12px | sp-4: 16px
sp-5: 20px | sp-6: 24px | sp-8: 32px | sp-10: 40px
sp-12: 48px| sp-16: 64px| sp-20: 80px| sp-24: 96px
```

**Border-elevation scale (no shadows, borders only)**

```
elev-0: none
elev-1: border 1px solid #1a1a24
elev-2: border 1px solid #2a2a38
elev-3: border 1px solid #3a3a4c
elev-4: border 1px solid #4a4a60
elev-5: border 1px solid #6b6b82
```

**Radius**

```
r-0: 0px | r-1: 2px | r-2: 4px | r-3: 6px | r-4: 8px | r-6: 12px | r-8: 16px
```

**Typography scale**

```
Display:  Oswald 700, 32px/36px, tracking 0.32em — screen headings only
Heading1: Inter 700, 24px/32px
Heading2: Inter 600, 18px/24px
Heading3: Inter 600, 14px/20px
Body:     Inter 400, 14px/20px
BodySm:   Inter 400, 12px/16px
Label:    Inter 500, 12px/16px, tracking 0.04em (all caps for status)
Mono:     JetBrains Mono 400, 12px/18px (costs, IDs, timecodes)
MonoSm:   JetBrains Mono 400, 11px/16px
```

**Contrast ratios (WCAG 2.1 AA)**

```
neutral-50 on #0a0a12:   16.8:1  (AAA)
neutral-100 on #0a0a12:  11.2:1  (AAA)
gold-500 on #0a0a12:      8.4:1  (AAA)
gold-500 on #12121a:      8.1:1  (AAA)
neutral-200 on #12121a:   6.1:1  (AA)
```

### Composants de base

- `Button` — 4 variants: Primary (gold fill), Secondary (elev-3 border), Ghost, Destructive
- `IconButton` — 32/28/24px
- `Input` — height 36px, elev-2 border, focus ring 2px gold-glow offset 2px
- `Textarea` — resizable vertical, char count inline
- `Select` / `Combobox` / `Tabs` / `Card` / `Badge` / `Toast` / `Modal` / `Drawer`
- `Tooltip` / `Dropdown` / `Toggle` / `Slider` / `Progress` / `Skeleton` / `Spinner`
- `Avatar` (24/32/40px circle) / `Kbd` (JetBrains Mono 11px) / `CommandPalette` (Cmd+K)

### Layout primitives

```
TopBar:      h-48px, elev-1 border-bottom, sticky top-0, z-50
Sidebar:     w-60px (collapsed) / w-240px (expanded), Cmd+B toggle
Main:        flex-1, overflow-y-auto, padding sp-6
RightPanel:  w-320px (inspector), slide-in 240ms
BottomBar:   h-36px, elev-1 border-top, job queue + status only
StatusBar:   h-20px, innermost BottomBar, mono text, costs live
```

### Motion tokens

```
fast:   120ms  cubic-bezier(0.2, 0.8, 0.2, 1)  — hover, active, tooltip
normal: 180ms  cubic-bezier(0.2, 0.8, 0.2, 1)  — modal open, tab switch
slow:   240ms  cubic-bezier(0.2, 0.8, 0.2, 1)  — drawer, sidebar, canvas
pulse:  1500ms cubic-bezier(0.4, 0, 0.6, 1) infinite  — running node edge
```

### Keyboard shortcuts globaux

```
Cmd+K        CommandPalette ouvrir
Cmd+1-6      Switch écrans (Dashboard / Character / Voice / Scene / Grid / Workflow)
Cmd+N        New Episode / New Shot (contextuel)
Cmd+S        Save current state
Cmd+Z / Y    Undo/redo
Cmd+/        Help overlay (shortcuts cheat sheet)
Cmd+B        Toggle sidebar collapsed/expanded
Escape       Close modal / drawer / cancel generation
```

---

## 1. Dashboard Episodes (Cmd+1)

**User intent** : voir d'un coup d'œil l'état de la série (49 EPs), reprendre un épisode, ou en créer un nouveau.

**Wireframe**

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR: [▲] IVAMIND Studio          [Cmd+K search...]         [Budget ¥] [Settings]   │
├──────┬──────────────────────────────────────────────────────────────────────────────────┤
│ SB   │  Episodes                                                    [+ New Episode]     │
│      │  [All] [Idée] [Script] [TTS] [Visual] [Compositing] [Review] [Delivered]        │
│      │  Season: [All ▾]   Sort: [Last Updated ▾]           3 delivered · 49 total      │
│      │  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐     │
│      │  │ [thumbnail 16:9]    │  │ [thumbnail 16:9]    │  │ [thumbnail 16:9]    │     │
│      │  │ S1E1 · La fatigue   │  │ EP-Partage          │  │ EP02 · Enfants      │     │
│      │  │ invisible d'une mère│  │ Ce qu'on aime       │  │ Ce que ces enfants  │     │
│      │  │ ████████████ 100%   │  │ ████████████ 100%   │  │ ████████░░  72%     │     │
│      │  │ Delivered           │  │ Delivered           │  │ Compositing         │     │
│      │  │ 72s · $2.37 · 38u   │  │ 88s · $1.94 · 22u   │  │ 81s · $0.88 · 14u   │     │
│      │  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘     │
├──────┴──────────────────────────────────────────────────────────────────────────────────┤
│ BOTTOMBAR:  3 running jobs  ·  Budget total: $7.19 / 74u  ·  iCloud sync: OK            │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**States** : empty / loading / success / error / partial / filtered-empty

**Annotations premium** :
1. **Progress bar segmentée** — 9 segments pipeline visibles (complet gold, running pulse, todo neutral-700)
2. **Cost dual** — `$2.37` + `38 units Kling` sur 2 lignes mono
3. **Thumbnail fallback** — EP## Oswald 700 56px gold centré + grain overlay si pas de thumb

---

## 2. Character Library + Character Detail (Cmd+2)

**User intent** : accéder aux refs visuelles d'un perso, vérifier cohérence bible, ajouter/tagger après génération.

**Wireframe Library** (2x3 grid fixe)

```
── CHARACTER LIBRARY ──
Personnages                                               [6 Bible Locked]
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ [photo front]  │  │ [photo front]  │  │ [photo front]  │
│ Omar           │  │ Radoine        │  │ Soukaina       │
│ 16 ans · 157cm │  │ 40 ans · 179cm │  │ 37 ans · 165cm │
│ 23 refs · 🔒   │  │ 18 refs · 🔒   │  │ 15 refs · 🔒   │
└────────────────┘  └────────────────┘  └────────────────┘
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ Imran · 7 · 🔒 │  │ Issa  · 5 · 🔒 │  │ Zayed · 4 · 🔒 │
└────────────────┘  └────────────────┘  └────────────────┘
```

**Wireframe Detail (Omar)**

```
┌──────────────────────────────┐  ┌────────────────────────────────────────────────┐
│ IDENTITY PANEL (320px fixed) │  │ REF GALLERY (flex)                             │
│ [hero ref image 280x380px]   │  │ Filter: [All] [face] [full-body] [3/4] [back]  │
│ Omar — Protagoniste · S1     │  │         [neutral] [angry] [calm] [hoodie]      │
│ Âge 16 · 157 cm · 23 refs    │  │ [+ Add refs]  Sort: [Latest ▾]                 │
│ Hoodie navy K∞ brodé         │  │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│ Lunettes rectangulaires      │  │ │ img  │ │ img  │ │ img  │ │ img  │           │
│ Cheveux curly noir           │  │ │face  │ │3/4   │ │back  │ │full  │           │
│ ELEMENT ID Kling:            │  │ │ep01  │ │ep02  │ │●prim │ │calm  │           │
│ 308527690409318              │  │ └──────┘ └──────┘ └──────┘ └──────┘           │
│ [Copy] [Test generation]     │  │ ─── REFS PRIMAIRES (top 4 Kling) ────────────  │
└──────────────────────────────┘  │ [drag to reorder — 4 max]                      │
                                   └────────────────────────────────────────────────┘
```

**Annotations premium** :
1. **Used-in-ep dot** — chaque ref a pastille mono `EP01` si déjà utilisée
2. **Kling element ID copyable inline** — JetBrains Mono + `[Copy]` icône
3. **Test generation drawer** — drawer droit 640px, pas de modal bloquant

---

## 3. Voice Pipeline (Cmd+3)

**User intent** : passer d'un script FR brut à `voice-final.mp3` + `captions-word-level.json` en < 10 min, avec gate match 99%.

**Wireframe**

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ [FR] [EN]              Script · S1E1                    Lint: [2 warnings] [0 errors]  │
│ ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Elle entre dans le magasin. Ses enfants tirent sa manche. La caissière demande...   │ │
│ │                                                                                     │ │
│ │ ⚠ L. 3: "3" → écrire "trois"                                                        │ │
│ │ ⚠ L. 7: "[pause]" banni — supprimer                                                 │ │
│ │                                                           1247 / ~1350 mots cible   │ │
│ └─────────────────────────────────────────────────────────────────────────────────────┘ │
│ Voice: [Le Narrateur FR ▾]  Speed: [━━●━━] 1.18  [🔒 IVAMIND lock]                    │
│                                                           [Generate TTS  Cmd+Enter]    │
│ ── WAVEFORM (sticky) ───────────────────────────────────────────────────────────────── │
│ [▶] 00:00 / 01:12  ─────────────────────────[waveform]───────────────────────  01:12  │
│ ── STT WORD-LEVEL TIMELINE ─────────────────────────────────────────────────────────── │
│ [Elle][entre][dans][le][magasin][.][Ses][enfants][tirent][sa][manche][La][caissière]… │
│ ── MATCH GATE ──────────────────────────────────────────────────────────────────────── │
│ Match: 97.3%  [████████████████████░░░]  Target: 99%                                   │
│ 4 mots divergents — [voir diff ▾]    [Corriger script]  [Accepter quand même]         │
│ ── EXPORT BAR (sticky bottom) ──────────────────────────────────────────────────────── │
│ [voice-final.mp3 ✓]  [captions-word-level.json ✓]  [Export tout  Cmd+E]               │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Annotations premium** :
1. **Waveform sticky** — reste visible pendant scroll, click mot timeline = seek instantané
2. **Guard lint bloquant pré-TTS** — badge rouge `2` sur Generate si warnings, pas de génération gâchée
3. **Diff colorisé script vs STT** — comme `git diff`, rouge barré / vert, ligne par ligne

---

## 4. Scene Builder (Cmd+4)

**User intent** : définir contexte scène (lieu/persos/émotion/mode narratif) + construire shot list + lancer batch generation.

**Wireframe**

```
┌─ SCENE METADATA ────────────────────────────────────────────────────────── [▲ collapse] ┐
│ Lieu: [Caisse supermarché ▾]  Heure: [Après-midi ▾]  Mode: [Portrait intime ▾]         │
│ Persos: [Omar ×] [Soukaina ×] [+ Ajouter]  Émotion: [Fatigue épuisement ▾]             │
│ Style: [ULTRA-Madhouse ▾]     Durée scène: [72s]                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
├── SHOT LIST ──────────────────────────┬── TEMPLATE LIBRARY ─────────────────────────────│
│ [+ New Shot  Cmd+N]   4 shots · 72u   │ [Search templates...]                           │
│ ┌─── SHOT 01 ─────────────────────┐   │ ── ÉTABLISSEMENT ─────────────────────────────  │
│ │ ⠿  [thumb] Close-up · 5s        │   │ [Aerial wide]  [Street level pan]               │
│ │     Soukaina main panier        │   │ ── PERSONNAGE ────────────────────────────────  │
│ │     Gemini i2i · Tier 1         │   │ [Close-up face]  [OTS (over shoulder)]          │
│ │     [Edit] [Regen] [▶ to video] │   │ ── NATURE/DÉCOR ──────────────────────────────  │
│ └─────────────────────────────────┘   │ [Ken Burns landscape]  ...                       │
│ [🪄 Generate all prompts]             │ [drag template → shot list]                     │
│ [▶ Start batch  Cmd+Shift+Enter]      │                                                 │
│ ████████░░░░ 2/4 shots générés  50%   │                                                 │
└────────────────────────────────────────┴─────────────────────────────────────────────── │
```

**Annotations premium** :
1. **Tier cost badge par shot** — `Tier 1 · 0u` / `Tier 2 · 4u` / `Tier 3 · 10u` visible AVANT génération
2. **LLM prompt preview collapsible** — 2 lignes + `[...voir plus]`, pas de mur de texte
3. **Template library contextuelle** — filtrée auto par mode narratif scene metadata

---

## 5. Grid Batch Compare + Shortlist (Cmd+5)

**User intent** : comparer 4-16 variantes d'un même shot, shortlister, envoyer en vidéo — sans quitter l'écran.

**Wireframe**

```
┌─ TOOLBAR ──────────────────────────────────────────────────────────────────────────── ┐
│ Shot 02 · Omar yeux baissés   [4▦] [9▦] [16▦]  [↕ Score] [Compare 2-up]  16 generated│
├─ GRID (4x4) ─────────────────────────────────────────────────────┬─ SHORTLIST ────────┤
│ ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │ Shortlist (2)     │
│ │  [image]   │  │  [image]   │  │  [image]   │  │  [image]   │   │ ┌─────────┐       │
│ │  ●shortl.  │  │            │  │            │  │            │   │ │ Shot02#3│       │
│ │ char: 9.2  │  │ char: 8.7  │  │ char: 9.5  │  │ char: 7.1  │   │ └─────────┘       │
│ │ style: 8.8 │  │ style: 9.1 │  │ style: 9.3 │  │ style: 8.4 │   │ ┌─────────┐       │
│ │ comp: 9.0  │  │ comp: 8.5  │  │ comp: 9.1  │  │ comp: 7.8  │   │ │ Shot02#7│       │
│ │ $0.02      │  │ $0.02      │  │ $0.02      │  │ $0.02      │   │ └─────────┘       │
│ └────────────┘  └────────────┘  └────────────┘  └────────────┘   │ [Upscale ✓]       │
│ HOVER: [S Shortlist] [R Regen] [X Reject] [▶ to video] [⛶ zoom] │ [Export ✓]        │
└───────────────────────────────────────────────────────────────────┴───────────────────┘
```

**Shortcuts** : `1-9` shortlister / `R` regen / `X` reject / `Space` preview / `↑↓←→` nav / `Cmd+A` select all / `Cmd+U` upscale / `Cmd+E` export

**Annotations premium** :
1. **Score composite trié auto** — meilleure tile toujours top-left
2. **Tile pending transparente** — placeholders semi-transparents pour batch à venir
3. **Shortlist drag-drop + keyboard** — deux modes equally first-class

---

## 6. Workflow Graph (Cmd+6)

**User intent** : voir état pipeline complet EP, relancer un node en erreur, ajuster params sans naviguer.

**Wireframe**

```
┌── CANVAS ─────────────────────────────────────────────────────── [minimap] ──┐
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                               │
│  │ Script   │────▶│ TTS Fish │────▶│STT Eleven│                               │
│  │ ✓ done   │     │ ✓ done   │     │ ✓ 99.3%  │                               │
│  └──────────┘     └──────────┘     └────┬─────┘                               │
│                                    ┌────▼─────┐                               │
│                                    │  Gate    │                               │
│                                    └────┬─────┘                               │
│                       ┌─────────────────▼──────────────┐                      │
│                  ┌────▼────┐                     ┌─────▼────┐                 │
│                  │ Images  │                     │  Clips   │                 │
│                  │Gemini   │                     │Kling 3.0 │                 │
│                  │⟳ 5/9    │                     │⟳ 3/9     │                 │
│                  │ $0.45   │                     │ 40u      │                 │
│                  └────┬────┘                     └────┬─────┘                 │
│                       └──────────┬───────────────────┘                        │
│                            ┌─────▼─────┐                                      │
│                            │AudioMix   │                                      │
│                            └─────┬─────┘                                      │
│                            ┌─────▼─────┐                                      │
│                            │Export Rem │                                      │
│                            └───────────┘                                      │
├── CONTROLS ────────────────────────────────────────────────────────────────── │
│ [▶ Run all Cmd+R]  [▶ From Gate]  [■ Stop]  [↺ Retry failed]  4m32s · $0.85  │
└─────────────────────────────────────────────────────────────────────────────── ┘
```

**Annotations premium** :
1. **Edge couleur = état** — grise idle / verte pulse running / verte solide success / rouge error
2. **Cost running total live** — `$0.45 → $0.48 → $0.51...` en mono, live pendant le run
3. **"Run from node" dropdown** — reprise chirurgicale sans retaper tout le pipeline

---

## 7. Priorités implémentation

**V1 (Ship first — outils quotidiens)**
1. Design System tokens + composants de base (Button, Card, Input, Toast, Skeleton)
2. Écran 1 Dashboard
3. Écran 3 Voice Pipeline (goulot actuel le plus coûteux en temps Joe)
4. Écran 2 Character Library (CRUD simple)

**V2 (semaine 2-3)**
5. Écran 4 Scene Builder
6. Écran 5 Grid Compare
7. CommandPalette Cmd+K global

**V3 (non-critique V1)**
8. Écran 6 Workflow Graph — remplacer en V1 par Job Queue List linéaire dans BottomBar

**À couper V1** : Electron `.dmg` packaging — web-first localhost:3000 suffit.

---

## 8. Composants transversaux à construire en premier

Ordre strict — chacun débloque plusieurs écrans :

1. **`AssetCard`** — variant universel (thumbnail + metadata + actions hover + status)
2. **`JobQueueIndicator`** — BottomBar jobs actifs + progress + cost live + cancel
3. **`CommandPalette`** — Cmd+K global fuzzy search épisodes + persos + actions
4. **`ProviderRouter`** (logique Zustand) — `useProviderJob(type, params)` hook unifié
5. **`WaveformPlayer`** — wavesurfer.js + silence markers + word-level timeline

---

## Fichiers de référence produit

- `~/Library/Mobile Documents/com~apple~CloudDocs/Projets/IVAEYES/CLAUDE.md` — pipeline + règles DA + persos
- `~/Desktop/BIBLE_KRONOS_INFINITY.md` — bible personnages (dimensions exactes)
- `~/Desktop/style_anime_kronos.md` — charte visuelle détaillée
- `~/Library/Mobile Documents/com~apple~CloudDocs/Projets/IVAEYES/public/ivamind-bank-unified/catalog.json` — 558+ assets Tier 1
