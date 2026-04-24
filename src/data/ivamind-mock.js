// IVAMIND Studio — mock data
// Real state : 2 EPs validés Joe (S1E1 + EP-02 flagship "Issa sait")

export const EPISODES = [
  {
    num:'S1E1', title:'La fatigue invisible d\'une mère',
    status:'Delivered', statusVariant:'green',
    progress:9, costUSD:2.37, costKling:38, dur:'1:12', shots:11,
    char:['soukaina','omar','imran','issa','zayed'], updated:'1 w ago',
    thumbnail:'ivamind-bank-unified/s1e1/p04-soukaina-entree-carrefour.png',
    note:'Pilote série S1 — fatigue invisible maman caissière Carrefour',
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
  {
    num:'EP-03', title:'Tawakkul — le jour où j\'ai lâché',
    status:'Script', statusVariant:'gold',
    progress:2, costUSD:0.05, costKling:0, dur:'—', shots:12,
    char:['omar','radoine'], updated:'today', active:true,
    note:'En cours — script en rédaction',
  },
  {
    num:'EP-04', title:'La zakat d\'un enfant',
    status:'Backlog', statusVariant:'neutral',
    progress:0, costUSD:0, costKling:0, dur:'—', shots:0,
    char:['imran','issa'], updated:'—',
  },
  {
    num:'EP-05', title:'Laylat al-Qadr',
    status:'Backlog', statusVariant:'neutral',
    progress:0, costUSD:0, costKling:0, dur:'—', shots:0,
    char:['omar','radoine','soukaina'], updated:'—',
  },
  {
    num:'EP-06', title:'Sabr — l\'attente',
    status:'Backlog', statusVariant:'neutral',
    progress:0, costUSD:0, costKling:0, dur:'—', shots:0,
    char:['omar','zayed'], updated:'—',
  },
  {
    num:'EP-07', title:'Luqman et son fils',
    status:'Backlog', statusVariant:'neutral',
    progress:0, costUSD:0, costKling:0, dur:'—', shots:0,
    char:['omar','imran'], updated:'—',
  },
  {
    num:'EP-08', title:'Le bon voisin',
    status:'Backlog', statusVariant:'neutral',
    progress:0, costUSD:0, costKling:0, dur:'—', shots:0,
    char:['zayed','issa'], updated:'—',
  },
  {
    num:'EP-09', title:'Dhikr — le cœur qui se rappelle',
    status:'Backlog', statusVariant:'neutral',
    progress:0, costUSD:0, costKling:0, dur:'—', shots:0,
    char:[], updated:'—',
  },
  {
    num:'EP-10', title:'Pourquoi on prie',
    status:'Backlog', statusVariant:'neutral',
    progress:0, costUSD:0, costKling:0, dur:'—', shots:0,
    char:[], updated:'—',
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

// EP-02 storyboard canonical — flagship reference
export const EP02_STORYBOARD = {
  ep:'EP-02', title:'Ce que ces enfants savent', locked:true, version:'v7',
  scene:{ name:'Caisse supermarché · Prière', location:'Carrefour Paris', time:'afternoon', mood:'Tender · revelation' },
  script:'La caissière demande si elle a la carte fidélité. Soukaina répond doucement qu\'elle n\'en a pas. Mais regarde bien. En haut, les trois petits. En bas, le tapis qu\'elle vient de dérouler. Quand la prière commence, la sakina descend.',
  panels:[
    { id:'p01', title:'Soukaina caisse',         status:'locked',  note:'Carte fidélité?', chars:['soukaina'], cam:'medium-35mm', dur:2.8 },
    { id:'p02', title:'Les trois petits agités', status:'locked',  note:'Imran/Issa/Zayed', chars:['imran','issa','zayed'], cam:'wide-24mm', dur:3.1 },
    { id:'p03', title:'Tapis de prière déroulé', status:'locked',  note:'Geste invisible', chars:[], cam:'insert-50', dur:1.8 },
    { id:'p04', title:'Pivot — mais regarde bien', status:'locked', note:'Narrator whisper', chars:[], cam:'extreme-close', dur:2.4 },
    { id:'p05', title:'Sakina descend',          status:'locked',  note:'Acte 4 révélation', chars:['soukaina'], cam:'low-angle', dur:4.2 },
    { id:'p06', title:'Les enfants calmés',      status:'locked',  note:'Silence imposé', chars:['imran','issa','zayed'], cam:'wide-symmetric', dur:3.7 },
    { id:'p07', title:'Issa contemplatif',       status:'locked',  note:'ISSA SAIT — thumbnail shot', chars:['issa'], cam:'close-up-85', dur:2.0 },
    { id:'p08', title:'Mains qui joignent',      status:'locked',  note:'Geste imitation', chars:['soukaina','issa'], cam:'insert-macro', dur:1.5 },
  ],
};
