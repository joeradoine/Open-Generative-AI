// Camera STYLES library — reproduction Cinema Studio 2.0 Higgsfield 2026 (Perplexity research)
// Contrôle cinématographique paramétrique : sensor · lens · focal · aperture · lighting · film stock.
//
// Chaque style augmente le prompt Gemini/Kling avec les specs cinéma correspondantes.
// Usage générique — pas spécifique série IVAMIND islam. Utilisable pour :
// documentaire, fiction, corporate, musique, comédie, horreur, etc.

// ─── LENSES / FOCAL LENGTHS ───
export const LENS_PRESETS = [
  { id: 'ultra-wide-14',  label: '14mm Ultra-Wide',     focal: 14,  style: 'Panoramique · architecture · immersion spatiale' , promptHint: '14mm ultra-wide-angle lens, expansive field of view, slight edge distortion, architectural or landscape feel' },
  { id: 'wide-24',        label: '24mm Wide',           focal: 24,  style: 'Environnement · context · documentaire',            promptHint: '24mm wide-angle lens, environmental context with subject framing' },
  { id: 'standard-35',    label: '35mm Standard',       focal: 35,  style: 'Naturaliste · documentaire · Street',               promptHint: '35mm standard lens, natural human-eye perspective, documentary feel' },
  { id: 'normal-50',      label: '50mm Normal',         focal: 50,  style: 'Cinéma classique · neutre · intemporel',             promptHint: '50mm normal lens, classic cinematic rendering, neutral perspective' },
  { id: 'short-tele-85',  label: '85mm Portrait',       focal: 85,  style: 'Portrait intime · bokeh lisse · close-up',          promptHint: '85mm portrait lens, beautiful subject isolation, smooth bokeh background separation' },
  { id: 'tele-135',       label: '135mm Telephoto',     focal: 135, style: 'Compression · intimité à distance · détail isolé',  promptHint: '135mm telephoto lens, compressed depth, subject isolated from distance' },
  { id: 'macro-100',      label: '100mm Macro',         focal: 100, style: 'Détail extrême · texture · micro-scène',            promptHint: '100mm macro lens, extreme detail, texture and micro-elements in focus' },
];

// ─── APERTURES / DEPTH OF FIELD ───
export const APERTURE_PRESETS = [
  { id: 'f1-2', label: 'f/1.2 Extreme Bokeh',    fstop: 1.2,  style: 'Dream · subject isolation · cinematic portrait',      promptHint: 'f/1.2 aperture, extreme shallow depth of field, dreamy bokeh, razor-thin focus plane' },
  { id: 'f1-4', label: 'f/1.4 Shallow Bokeh',    fstop: 1.4,  style: 'Portrait cinéma · subject-isolation soft',             promptHint: 'f/1.4 aperture, shallow depth of field, cinematic bokeh, soft background fall-off' },
  { id: 'f2-0', label: 'f/2.0 Subject Focus',    fstop: 2.0,  style: 'Portrait classique · balance bokeh/sharpness',         promptHint: 'f/2.0 aperture, subject in clear focus, pleasant bokeh, cinematic fall-off' },
  { id: 'f2-8', label: 'f/2.8 Cinema Standard',  fstop: 2.8,  style: 'Documentaire · interview · versatile',                 promptHint: 'f/2.8 aperture, standard cinematic depth, subject clearly resolved with soft background' },
  { id: 'f4-0', label: 'f/4.0 Medium DoF',       fstop: 4.0,  style: 'Group shot · narrative · multi-subject',                promptHint: 'f/4.0 aperture, medium depth of field, multiple subjects resolved' },
  { id: 'f5-6', label: 'f/5.6 Wide DoF',         fstop: 5.6,  style: 'Landscape · architectural · établissement',             promptHint: 'f/5.6 aperture, wide depth of field, everything in sharp focus, environmental shot' },
  { id: 'f8-0', label: 'f/8.0 Deep Focus',       fstop: 8.0,  style: 'Hyperfocal · paysage · architectural strict',           promptHint: 'f/8.0 aperture, deep focus, hyperfocal distance, foreground to infinity sharp' },
  { id: 'f16',  label: 'f/16 Max DoF',           fstop: 16,   style: 'Sun-star effect · diffraction · full scene',            promptHint: 'f/16 aperture, extreme deep focus, sun-star effect, diffraction-enhanced rendering' },
];

// ─── SENSORS / FILM STOCKS ───
export const SENSOR_PRESETS = [
  { id: 'arri-alexa-35', label: 'ARRI Alexa 35',       style: 'Cinéma Hollywood moderne · texture organique',        promptHint: 'ARRI Alexa 35 sensor rendering, organic cinematic texture, natural skin tones, film-like grain' },
  { id: 'red-komodo-6k', label: 'RED Komodo 6K',       style: 'Cinéma haute définition · couleur saturée',          promptHint: 'RED Komodo 6K sensor, sharp ultra-detailed rendering, saturated cinematic color' },
  { id: 'sony-venice-2', label: 'Sony Venice 2',        style: 'Cinéma Netflix · palette riche · highlight soft',    promptHint: 'Sony Venice 2 sensor rendering, rich color palette, soft highlight roll-off, Netflix-grade cinematic look' },
  { id: 'panavision-dxl2',label: 'Panavision DXL2',     style: 'Blockbuster · prestige · contraste dramatique',      promptHint: 'Panavision DXL2 sensor, blockbuster cinematic prestige, dramatic contrast, large-format look' },
  { id: 'blackmagic-urs12k', label: 'Blackmagic URSA 12K', style: 'Indie cinéma · hi-res · dynamic range',           promptHint: 'Blackmagic URSA 12K sensor, ultra-high resolution, indie cinema feel, wide dynamic range' },
  { id: 'super-16',      label: 'Super 16mm film',     style: 'Nostalgie analogique · grain visible · indie 90s',    promptHint: 'Super 16mm film stock, visible film grain, analog nostalgic texture, indie 90s documentary feel' },
  { id: '35mm-kodak',    label: '35mm Kodak Portra',   style: 'Halation · skin tones doux · cinéma classique',       promptHint: '35mm Kodak Portra 400 film stock, soft skin tones, halation on highlights, classic cinema warmth' },
  { id: 'fujifilm-velvia',label: 'Fujifilm Velvia 50', style: 'Saturation intense · vert-rouge-bleu · paysage',      promptHint: 'Fujifilm Velvia 50 film stock, intense saturation, vibrant landscape color, punchy cinematic feel' },
];

// ─── LIGHTING PRESETS ───
export const LIGHTING_PRESETS = [
  { id: 'golden-hour',    label: 'Golden Hour',         mood: 'Chaleur · espoir · spiritualité',        promptHint: 'golden hour natural light, warm amber-golden tones, soft shadows, backlit subject with rim light' },
  { id: 'blue-hour',      label: 'Blue Hour',           mood: 'Mélancolie · contemplation · nuit tombée',promptHint: 'blue hour twilight light, cool cyan-violet tones, ambient city lights emerging, pensive mood' },
  { id: 'chiaroscuro',    label: 'Chiaroscuro',         mood: 'Drame · gravité · révélation',           promptHint: 'chiaroscuro dramatic single-source key light, deep shadow areas, Caravaggio-style contrast' },
  { id: 'high-key',       label: 'High Key',            mood: 'Léger · optimiste · commercial',         promptHint: 'high key bright even lighting, minimal shadows, clean commercial polished look' },
  { id: 'low-key',        label: 'Low Key',             mood: 'Sombre · intime · thriller',             promptHint: 'low key dark moody lighting, deep blacks, subject emerging from shadow, intimate feel' },
  { id: 'neon-night',     label: 'Neon Night',          mood: 'Urbain · futuriste · cyberpunk',         promptHint: 'neon night lighting, cyan-magenta color contrast, urban reflections on wet surfaces' },
  { id: 'sodium-street',  label: 'Sodium Street',       mood: 'Urbain réaliste · 90s · documentaire',   promptHint: 'sodium vapor street light, amber-orange cast, gritty urban documentary feel' },
  { id: 'window-soft',    label: 'Window Soft',         mood: 'Intime · domestique · Vermeer',          promptHint: 'soft window light, Vermeer-style natural indoor illumination, intimate domestic feel' },
  { id: 'halation-film',  label: 'Halation Film',       mood: 'Nostalgie · film analogique · lyrique',  promptHint: 'analog film halation on highlights, red-orange bleed around bright sources, nostalgic texture' },
  { id: 'practical-lamps',label: 'Practical Lamps',     mood: 'Authentique · diegetic · cinéma réaliste',promptHint: 'practical diegetic lamp lighting in frame, realistic interior warm glow, visible fixtures in shot' },
];

// ─── STYLE BUNDLES = combinaisons préformatées (comme Cinema Studio 2.0 Genre presets) ───
export const STYLE_BUNDLES = [
  {
    id: 'ivamind-manga-series',
    label: 'IVAMIND — Manga série 90s',
    description: 'Style signature série islam niche : Hajime no Ippo × Monster × Akira',
    lens: 'normal-50', aperture: 'f2-8', sensor: 'super-16', lighting: 'chiaroscuro',
    extraHint: 'anime manga 90s Madhouse style, cel-shaded 2-tone hatching, thick variable brush-pen linework, 35mm grain, halation',
    tags: ['manga', 'islam', 'series', 'whistledown'],
  },
  {
    id: 'cinema-netflix',
    label: 'Cinéma Netflix contemporain',
    description: 'Drama série premium · palette riche · soft highlight',
    lens: 'short-tele-85', aperture: 'f2-0', sensor: 'sony-venice-2', lighting: 'window-soft',
    extraHint: 'Netflix-grade cinematic drama, rich palette, soft highlight roll-off, prestige series aesthetic',
    tags: ['drama', 'series', 'premium'],
  },
  {
    id: 'indie-sundance',
    label: 'Indie Sundance',
    description: 'Grain · naturalisme · intime · 90s documentaire',
    lens: 'standard-35', aperture: 'f1-4', sensor: 'super-16', lighting: 'practical-lamps',
    extraHint: 'indie Sundance film aesthetic, visible grain, naturalistic intimate mood, 90s documentary hybrid',
    tags: ['indie', 'documentary', 'intimate'],
  },
  {
    id: 'blockbuster-hollywood',
    label: 'Blockbuster Hollywood',
    description: 'IMAX · contraste fort · DoF deep · spectacle',
    lens: 'wide-24', aperture: 'f5-6', sensor: 'panavision-dxl2', lighting: 'high-key',
    extraHint: 'IMAX blockbuster spectacle, deep focus, high production value, Hollywood prestige',
    tags: ['blockbuster', 'spectacle', 'action'],
  },
  {
    id: 'thriller-fincher',
    label: 'Thriller Fincher',
    description: 'Low-key · vert-yellow · tension psychologique',
    lens: 'normal-50', aperture: 'f2-8', sensor: 'red-komodo-6k', lighting: 'low-key',
    extraHint: 'David Fincher thriller aesthetic, low-key lighting, green-yellow color grade, psychological tension',
    tags: ['thriller', 'psychological'],
  },
  {
    id: 'commercial-clean',
    label: 'Commercial / Corporate',
    description: 'High key · clean · brand · product focus',
    lens: 'short-tele-85', aperture: 'f4-0', sensor: 'arri-alexa-35', lighting: 'high-key',
    extraHint: 'commercial clean aesthetic, high key even lighting, brand-friendly polished look',
    tags: ['commercial', 'brand'],
  },
  {
    id: 'music-video-lyrical',
    label: 'Music Video lyrical',
    description: 'Neon night · bokeh · color-wash · rythme',
    lens: 'short-tele-85', aperture: 'f1-2', sensor: 'red-komodo-6k', lighting: 'neon-night',
    extraHint: 'lyrical music video aesthetic, extreme bokeh, neon color-wash, rhythmic visual feel',
    tags: ['music', 'lyrical'],
  },
  {
    id: 'horror-subjective',
    label: 'Horror subjective',
    description: 'Handheld · low-key · Dutch angle · malaise',
    lens: 'wide-24', aperture: 'f2-0', sensor: 'super-16', lighting: 'low-key',
    extraHint: 'horror subjective POV, handheld uneasy framing, deep shadows, subconscious malaise',
    tags: ['horror', 'psychological'],
  },
];

// Helper : build full prompt augmentation from a style bundle
export function buildStyleHint(bundleId) {
  const bundle = STYLE_BUNDLES.find(b => b.id === bundleId);
  if (!bundle) return '';
  const lens = LENS_PRESETS.find(l => l.id === bundle.lens);
  const aperture = APERTURE_PRESETS.find(a => a.id === bundle.aperture);
  const sensor = SENSOR_PRESETS.find(s => s.id === bundle.sensor);
  const lighting = LIGHTING_PRESETS.find(l => l.id === bundle.lighting);
  return [
    lens?.promptHint,
    aperture?.promptHint,
    sensor?.promptHint,
    lighting?.promptHint,
    bundle.extraHint,
  ].filter(Boolean).join('. ');
}
