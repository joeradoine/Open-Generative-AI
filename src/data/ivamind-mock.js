// IVAMIND Studio — mock data
// Real state (Joe 2026-04-24) : 2 EPs postables récents = EP-Partage "Ce qu'on aime" + EP-02 "Issa sait".
// S1E1 "fatigue invisible" est un pilote palier premium — non-postable (benchmark interne seulement).
// EP01 PARDON v3 a été validé mais c'est ancien — status "archived".

export const EPISODES = [
  {
    num:'EP-Partage', title:'Ce qu\'on aime',
    status:'Delivered', statusVariant:'green',
    progress:9, costUSD:1.25, costKling:18, dur:'1:28', shots:11,
    char:['omar','radoine'], updated:'3 d ago',
    thumbnail:'ep-partage/thumbnail-partage-v22.png',
    note:'Delivered v22 FINAL — Omar et le partage · template IVAMIND EP02+',
  },
  {
    num:'EP-02', title:'Ce que ces enfants savent',
    status:'Delivered', statusVariant:'green',
    progress:9, costUSD:0.88, costKling:14, dur:'1:37', shots:12,
    char:['soukaina','imran','issa','zayed'], updated:'2 d ago',
    flagship:true,  // ← référence / base à améliorer
    thumbnail:'ep-enfants-priere/thumbnail-ep02-fr-v3-issa.png',
    note:'FLAGSHIP — base de référence · thumbnail "ISSA SAIT." validé',
  },
];

export const CHARACTERS = [
  { id:'omar',     name:'Omar',     age:16, role:'Protagoniste',        refs:34, primary:6, element:'308527690409318', hue:195, refUrl:'/character-refs/omar-01-front.png',     outfit:'Hoodie navy K∞, lunettes rectangulaires, cheveux curly' },
  { id:'radoine',  name:'Radoine',  age:40, role:'Père / narrateur',    refs:28, primary:5, element:'308527725425531', hue:28,  refUrl:'/character-refs/radoine-01-front.png',  outfit:'Thobe charcoal, crâne rasé, barbe courte, lunettes noires' },
  { id:'soukaina', name:'Soukaina', age:37, role:'Mère',                refs:24, primary:4, element:'308527741277318', hue:340, refUrl:'/character-refs/soukaina-01-front.png', outfit:'Hijab sage khaki, abaya olive' },
  { id:'imran',    name:'Imran',    age:7,  role:'Frère — 7 ans',       refs:19, primary:4, element:'308527777265535', hue:140, refUrl:'/character-refs/imran-01-front.png',    outfit:'Hoodie gris oversize K∞, raie côté' },
  { id:'issa',     name:'Issa',     age:5,  role:'Frère — 5 ans',       refs:17, primary:3, element:'308527792046305', hue:45,  refUrl:'/character-refs/issa-01-front.png',     outfit:'Lunettes rondes dark-green, hoodie olive dinosaures' },
  { id:'zayed',    name:'Zayed',    age:4,  role:'Frère — 4 ans',       refs:14, primary:3, element:'308527809772311', hue:220, refUrl:'/character-refs/zayed-01-front.png',    outfit:'Cheveux chaotiques, t-shirt kaki' },
];

export const CHAR_BY_ID = Object.fromEntries(CHARACTERS.map(c => [c.id, c]));

export const JOBS = [
  { name:'EP-03 · script draft', progress:42 },
];

export const BUDGET = { today: 0.05, kling: 0, month: 3.30, budget: 300 };

export const PIPELINE_STEPS = [
  { key: 'script',     label: 'Script' },
  { key: 'tts',        label: 'TTS' },
  { key: 'stt',        label: 'STT' },
  { key: 'gate',       label: 'Gate' },
  { key: 'storyboard', label: 'Storyboard' },
  { key: 'images',     label: 'Images' },
  { key: 'clips',      label: 'Clips' },
  { key: 'audio-mix',  label: 'Audio Mix' },
  { key: 'export',     label: 'Export' },
];

// EP-02 storyboard — flagship reference "Ce que ces enfants savent" (enfants + prière)
export const EP02_STORYBOARD = {
  ep:'EP-02', title:'Ce que ces enfants savent', locked:true, version:'v7',
  scene:{ name:'Chambre familiale · Prière', location:'Intérieur maison', time:'late afternoon', mood:'Tender · revelation' },
  script:'Les trois petits explosent de joie. Zayed crie. Issa roule le tapis. Imran saute sur le lit. Mais quand Soukaina lève les mains, la sakina descend — et ce sont les enfants qui enseignent.',
  panels:[
    { id:'p01', title:'Les trois petits explosent',  status:'locked', note:'Acte 1 — chaos joyeux', chars:['imran','issa','zayed'], cam:'wide-24mm', dur:2.5, image:'/ep-enfants-priere/p01-trois-petits-explosent.png' },
    { id:'p02', title:'Issa roule le tapis',         status:'locked', note:'Geste spontané enfant',  chars:['issa'],                  cam:'medium-35mm', dur:2.2, image:'/ep-enfants-priere/h02-issa-roule-tapis.png' },
    { id:'p03', title:'Soukaina mains levées',       status:'locked', note:'Takbîr — entrée prière', chars:['soukaina'],              cam:'low-angle', dur:3.0, image:'/ep-enfants-priere/h05-soukaina-mains-levees.png' },
    { id:'p04', title:'Soukaina profil Allahu Akbar',status:'locked', note:'Révélation spirituelle', chars:['soukaina'],              cam:'close-up-85', dur:2.4, image:'/ep-enfants-priere/p06-soukaina-profil-allahou-akbar.png' },
    { id:'p05', title:'Sujud halo backlight',        status:'locked', note:'Sakina descend',         chars:['soukaina'],              cam:'wide-symmetric', dur:4.2, image:'/ep-enfants-priere/h06-sujud-halo-backlight.png' },
    { id:'p06', title:'Silhouette tahrim',           status:'locked', note:'Silence imposé',         chars:['soukaina'],              cam:'silhouette', dur:2.8, image:'/ep-enfants-priere/p05-soukaina-silhouette-tahrim.png' },
    { id:'p07', title:'Zayed sparkle yeux — ISSA SAIT',status:'locked', note:'Thumbnail flagship',     chars:['zayed'],                 cam:'extreme-close', dur:2.0, image:'/ep-enfants-priere/p04-zayed-sparkle-yeux.png' },
    { id:'p08', title:'Omar regard silencieux',      status:'locked', note:'Témoin révélation',      chars:['omar'],                  cam:'close-up-85', dur:2.0, image:'/ep-enfants-priere/h08-omar-regard-silencieux.png' },
  ],
};

// EP-Partage storyboard — delivered v22 "Ce qu'on aime" (Omar + partage)
export const EP_PARTAGE_STORYBOARD = {
  ep:'EP-Partage', title:'Ce qu\'on aime', locked:true, version:'v22',
  scene:{ name:'Chambre Omar · Partage', location:'Intérieur famille', time:'afternoon', mood:'Tension · rédemption' },
  script:'Omar compte les pièces. Son poing se serre sur la boîte. Le miroir montre les deux. Mais quand Zayed reçoit la carte, c\'est le poing qui s\'ouvre — et le mot qui n\'a pas de traduction trouve sa forme.',
  panels:[
    { id:'p01', title:'Omar pièces macro',             status:'locked', note:'Hook ouverture', chars:['omar'],    cam:'insert-macro', dur:2.0, image:'/ep-partage/p-hook-a-omar-pieces.png' },
    { id:'p02', title:'Omar conflit intérieur',        status:'locked', note:'Tension morale', chars:['omar'],    cam:'close-up-85', dur:2.5, image:'/ep-partage/p-hook-omar-conflit.png' },
    { id:'p03', title:'Omar poing serré sur la boîte', status:'locked', note:'Résistance',     chars:['omar'],    cam:'insert-50',   dur:2.2, image:'/ep-partage/p-hook-d-omar-poing-boite.png' },
    { id:'p04', title:'Miroir dualité',                status:'locked', note:'Double moral',   chars:['omar'],    cam:'medium-35mm', dur:2.6, image:'/ep-partage/p02-mirror.png' },
    { id:'p05', title:'Trois frères assis',            status:'locked', note:'Famille attend', chars:['imran','issa','zayed'], cam:'wide-24mm', dur:3.0, image:'/ep-partage/p03-trois-freres-assis.png' },
    { id:'p06', title:'Miroir dualité pleine',         status:'locked', note:'Acte III pivot', chars:['omar'],    cam:'medium-35mm', dur:2.6, image:'/ep-partage/p-miroir-dualite.png' },
    { id:'p07', title:'Zayed reçoit la carte',         status:'locked', note:'Don accompli',   chars:['zayed','omar'], cam:'wide-symmetric', dur:3.5, image:'/ep-partage/p-zayed-recoit-carte.png' },
    { id:'p08', title:'Mot intraduisible',             status:'locked', note:'Signature outro',chars:[],          cam:'text-frame', dur:2.0, image:'/ep-partage/p-mot-intraduisible.png' },
  ],
};

// Storyboards par EP — ajoute les nouveaux EPs ici au fur et à mesure
export const STORYBOARDS = {
  'EP-Partage': EP_PARTAGE_STORYBOARD,
  'EP-02': EP02_STORYBOARD,
};
