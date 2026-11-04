// Razas del SRD 5.1 (una subraza por raza, como en el SRD). Bonificadores, rasgos y competencias.
// cantrip: el alto elfo aprende un truco de mago (usa Inteligencia). innate: trucos raciales.
module.exports = {
  human: {
    name: 'Humano', fem: 'Humana', icon: '🧑',
    bonus: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    features: ['human_versatility'],
    desc: 'Versátiles y ambiciosos. +1 a todas las características.',
  },
  dwarf: {
    name: 'Enano de las colinas', fem: 'Enana de las colinas', icon: '⛏️',
    bonus: { con: 2, wis: 1 }, toughness: true, resist: ['veneno'],
    features: ['darkvision', 'dwarven_resilience', 'dwarven_toughness', 'stonecunning'],
    desc: 'Duros como la roca. +2 CON, +1 SAB, más puntos de golpe y resistencia al veneno.',
  },
  elf: {
    name: 'Alto elfo', fem: 'Alta elfa', icon: '🧝',
    bonus: { dex: 2, int: 1 }, elf: true, skills: ['perception'], cantrip: true,
    features: ['darkvision', 'keen_senses', 'fey_ancestry', 'trance', 'high_elf_cantrip'],
    desc: 'Gráciles y longevos. +2 DES, +1 INT, competencia en Percepción, un truco de mago y no les afecta la parálisis del necrófago.',
  },
  halfling: {
    name: 'Mediano piesligeros', fem: 'Mediana piesligeros', icon: '🍀',
    bonus: { dex: 2, cha: 1 },
    features: ['lucky', 'brave', 'halfling_nimbleness', 'naturally_stealthy'],
    desc: 'Pequeños y afortunados. +2 DES, +1 CAR y repiten los 1 naturales.',
  },
  dragonborn: {
    name: 'Dracónido', fem: 'Dracónida', icon: '🐉',
    bonus: { str: 2, cha: 1 }, ancestry: true,
    features: ['draconic_ancestry', 'breath_weapon', 'draconic_resistance'],
    desc: 'Descendientes de dragones. +2 FUE, +1 CAR, arma de aliento y resistencia a un tipo de daño.',
  },
  gnome: {
    name: 'Gnomo de las rocas', fem: 'Gnoma de las rocas', icon: '⚙️',
    bonus: { int: 2, con: 1 },
    features: ['darkvision', 'gnome_cunning', 'artificers_lore', 'tinker'],
    desc: 'Ingeniosos e inventores. +2 INT, +1 CON y ventaja en salvaciones de INT, SAB y CAR contra la magia.',
  },
  half_elf: {
    name: 'Semielfo', fem: 'Semielfa', icon: '🌗',
    bonus: { cha: 2 }, plus1: 2, extraSkills: 2,
    features: ['darkvision', 'fey_ancestry', 'skill_versatility'],
    desc: 'Entre dos mundos. +2 CAR, +1 a otras dos características y dos habilidades a elegir.',
  },
  half_orc: {
    name: 'Semiorco', fem: 'Semiorca', icon: '🪓',
    bonus: { str: 2, con: 1 }, skills: ['intimidation'],
    features: ['darkvision', 'menacing', 'relentless_endurance', 'savage_attacks'],
    desc: 'Fuerza y furia. +2 FUE, +1 CON, aguantan en pie con 1 PG una vez y sus críticos hacen más daño.',
  },
  tiefling: {
    name: 'Tiflin', fem: 'Tiflin', icon: '😈',
    bonus: { cha: 2, int: 1 }, resist: ['fuego'], innate: { ability: 'cha', spells: ['thaumaturgy'] }, rebuke: true,
    features: ['darkvision', 'hellish_resistance', 'infernal_legacy'],
    desc: 'Linaje infernal. +2 CAR, +1 INT, resistencia al fuego, Taumaturgia y, a nivel 3, Reprensión infernal.',
  },
};

// Linaje dracónico: tipo de daño, forma del aliento y salvación (tabla del SRD)
module.exports.ANCESTRIES = {
  black: { name: 'Negro', type: 'ácido', shape: 'line', save: 'dex' },
  blue: { name: 'Azul', type: 'relámpago', shape: 'line', save: 'dex' },
  brass: { name: 'Latón', type: 'fuego', shape: 'line', save: 'dex' },
  bronze: { name: 'Bronce', type: 'relámpago', shape: 'line', save: 'dex' },
  copper: { name: 'Cobre', type: 'ácido', shape: 'line', save: 'dex' },
  gold: { name: 'Oro', type: 'fuego', shape: 'cone', save: 'dex' },
  green: { name: 'Verde', type: 'veneno', shape: 'cone', save: 'con' },
  red: { name: 'Rojo', type: 'fuego', shape: 'cone', save: 'dex' },
  silver: { name: 'Plata', type: 'frío', shape: 'cone', save: 'con' },
  white: { name: 'Blanco', type: 'frío', shape: 'cone', save: 'con' },
};
