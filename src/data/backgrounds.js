// Trasfondos (reglas de 2024). Cada trasfondo indica tres características (+2/+1 o +1/+1/+1, máx. 20),
// dos habilidades, una dote de origen y un pequeño equipo.
// Acólito, Criminal, Erudito y Soldado son los del SRD 5.2.1; el resto son trasfondos propios de este
// proyecto con la misma estructura.
//   feat: dote de origen; featList: lista de conjuros si la dote es Iniciado en la magia
module.exports = {
  acolyte: { name: 'Acólito', fem: 'Acólita', abilities: ['int', 'wis', 'cha'], skills: ['insight', 'religion'], feat: 'magic_initiate', featList: 'cleric', items: { holy_symbol: 1 }, desc: 'Serviste en un templo y conoces sus ritos.' },
  criminal: { name: 'Criminal', abilities: ['dex', 'con', 'int'], skills: ['sleight', 'stealth'], feat: 'alert', items: { thieves_tools: 1 }, desc: 'Tienes contactos en los bajos fondos.' },
  sage: { name: 'Erudito', fem: 'Erudita', abilities: ['con', 'int', 'wis'], skills: ['arcana', 'history'], feat: 'magic_initiate', featList: 'wizard', items: { torch: 1 }, desc: 'Pasaste años entre libros y pergaminos.' },
  soldier: { name: 'Soldado', abilities: ['str', 'dex', 'con'], skills: ['athletics', 'intimidation'], feat: 'savage_attacker', items: { healers_kit: 1 }, desc: 'Llevaste uniforme y sabes lo que es una guerra.' },
  outlander: { name: 'Forastero', fem: 'Forastera', abilities: ['str', 'dex', 'wis'], skills: ['athletics', 'survival'], feat: 'magic_initiate', featList: 'druid', items: { rations: 2 }, desc: 'Creciste lejos de las ciudades, en tierras salvajes.' },
  entertainer: { name: 'Artista', abilities: ['str', 'dex', 'cha'], skills: ['acrobatics', 'performance'], feat: 'skilled', items: { instrument: 1 }, desc: 'Te ganas la vida sobre un escenario.' },
  folk_hero: { name: 'Héroe del pueblo', fem: 'Heroína del pueblo', abilities: ['str', 'con', 'wis'], skills: ['animal', 'survival'], feat: 'savage_attacker', items: { rope: 1 }, desc: 'Plantaste cara a un tirano y tu aldea no lo olvida.' },
  noble: { name: 'Noble', abilities: ['str', 'int', 'cha'], skills: ['history', 'persuasion'], feat: 'skilled', items: { potion_healing: 1 }, desc: 'Naciste con título, privilegios y obligaciones.' },
  charlatan: { name: 'Charlatán', fem: 'Charlatana', abilities: ['dex', 'con', 'cha'], skills: ['deception', 'sleight'], feat: 'alert', items: { disguise_kit: 1 }, desc: 'Vives de vender humo con mucha labia.' },
  urchin: { name: 'Huérfano de la calle', fem: 'Huérfana de la calle', abilities: ['dex', 'wis', 'cha'], skills: ['sleight', 'stealth'], feat: 'alert', items: { rations: 1 }, desc: 'Sobreviviste solo en las calles de una gran ciudad.' },
  hermit: { name: 'Ermitaño', fem: 'Ermitaña', abilities: ['con', 'wis', 'cha'], skills: ['medicine', 'religion'], feat: 'magic_initiate', featList: 'druid', items: { healers_kit: 1 }, desc: 'Viviste apartado del mundo, buscando una verdad.' },
  sailor: { name: 'Marinero', fem: 'Marinera', abilities: ['str', 'dex', 'wis'], skills: ['athletics', 'perception'], feat: 'savage_attacker', items: { rope: 1 }, desc: 'Has navegado mares tranquilos y tormentas.' },
};

// Dotes de origen del SRD 5.2.1. feature = rasgo que se muestra en la ficha.
const ORIGIN_FEATS = {
  alert: { name: 'Alerta', feature: 'feat_alert' },
  savage_attacker: { name: 'Atacante salvaje', feature: 'feat_savage_attacker' },
  skilled: { name: 'Habilidoso', feature: 'feat_skilled', skills: 3 },
  magic_initiate: { name: 'Iniciado en la magia', feature: 'feat_magic_initiate', lists: ['cleric', 'druid', 'wizard'], cantrips: 2, level1: 1 },
};
const MI_LIST_NAMES = { cleric: 'clérigo', druid: 'druida', wizard: 'mago' };
// no enumerables: así Object.keys(BACKGROUNDS) solo devuelve trasfondos
Object.defineProperty(module.exports, 'ORIGIN_FEATS', { value: ORIGIN_FEATS });
Object.defineProperty(module.exports, 'MI_LIST_NAMES', { value: MI_LIST_NAMES });
