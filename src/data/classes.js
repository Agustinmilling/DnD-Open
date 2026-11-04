// Opciones de creación de personaje por clase (SRD 5.1: una subclase por clase).
// kits: equipo inicial a elegir. spells: trucos y conjuros a elegir; auto = se aprenden solos al subir de nivel.
const COMMON_INV = {
  fighter: { potion_healing: 1, rope: 1, rations: 3, torch: 2 },
  cleric: { potion_healing: 1, holy_symbol: 1, healers_kit: 1, rations: 3 },
  rogue: { potion_healing: 1, thieves_tools: 1, rope: 1, rations: 3 },
  wizard: { potion_healing: 1, spellbook: 1, arcane_focus: 1, rations: 3 },
};
const CHAIN = { base: 16, dexMax: 0, heavy: true, name: 'Cota de malla' };
const LEATHER = { base: 11, dexMax: 99, name: 'Armadura de cuero' };

module.exports = {
  fighter: {
    name: 'Guerrero', fem: 'Guerrera', icon: '⚔️', hitDie: 10, saves: ['str', 'con'],
    subclass: 'Arquetipo: Campeón (a nivel 3)',
    skillChoices: 2, skillList: ['acrobatics', 'animal', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'],
    features: { 1: ['second_wind'], 2: ['action_surge'], 3: ['improved_critical'] },
    critRange: { 3: 19 },
    styles: {
      defense: { feature: 'fighting_style_defense', acBonus: 1 },
      dueling: { feature: 'fighting_style_dueling' },
      archery: { feature: 'fighting_style_archery' },
    },
    kits: {
      defensor: { name: 'Defensor', desc: 'Cota de malla, escudo, espada larga y jabalinas', armor: { ...CHAIN, shield: true, name: 'Cota de malla + escudo' }, weapons: [{ item: 'longsword', ability: 'str' }, { item: 'javelin', ability: 'str' }] },
      mandoble: { name: 'Mandoble', desc: 'Cota de malla, mandoble a dos manos y jabalinas', armor: { ...CHAIN }, weapons: [{ item: 'greatsword', ability: 'str' }, { item: 'javelin', ability: 'str' }] },
      arquero: { name: 'Arquero', desc: 'Armadura de cuero, arco largo y dos espadas cortas', armor: { ...LEATHER }, weapons: [{ item: 'longbow', ability: 'dex' }, { item: 'shortsword', ability: 'dex' }, { item: 'shortsword', ability: 'dex' }] },
    },
    inventory: COMMON_INV.fighter,
    role: 'Primera línea: aguanta golpes y domina el combate', stats: { ataque: 4, defensa: 5, magia: 0, apoyo: 1, sigilo: 1 },
    recommended: { str: 15, con: 14, dex: 13, wis: 12, cha: 10, int: 8 },
    desc: 'Maestro de las armas y las armaduras. El que más aguanta y el más fiable en combate.',
  },
  cleric: {
    name: 'Clérigo', fem: 'Clériga', icon: '✨', hitDie: 8, saves: ['wis', 'cha'],
    subclass: 'Dominio de la Vida',
    skillChoices: 2, skillList: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
    features: { 1: ['spellcasting_cleric', 'disciple_of_life', 'heavy_armor_life'], 2: ['channel_divinity'] },
    caster: 'wis', slots: { 1: { 1: 2 }, 2: { 1: 3 }, 3: { 1: 4, 2: 2 } },
    spells: {
      cantrips: { count: 3, from: ['sacred_flame', 'guidance', 'spare_the_dying', 'light', 'thaumaturgy'] },
      level1: { count: 3, from: ['healing_word', 'guiding_bolt', 'shield_of_faith', 'inflict_wounds'], always: ['bless', 'cure_wounds'] },
      auto: { 3: ['spiritual_weapon', 'lesser_restoration', 'hold_person', 'aid'] },
    },
    kits: {
      martillo: { name: 'Martillo y malla', desc: 'Cota de malla, escudo y martillo de guerra', armor: { ...CHAIN, shield: true, name: 'Cota de malla + escudo' }, weapons: [{ item: 'warhammer', ability: 'str' }] },
      maza: { name: 'Maza y ballesta', desc: 'Cota de escamas, escudo, maza y ballesta ligera', armor: { base: 14, dexMax: 2, shield: true, name: 'Cota de escamas + escudo' }, weapons: [{ item: 'mace', ability: 'str' }, { item: 'light_crossbow', ability: 'dex' }] },
    },
    inventory: COMMON_INV.cleric,
    role: 'Sanador y apoyo: cura, bendice y expulsa muertos', stats: { ataque: 2, defensa: 4, magia: 3, apoyo: 5, sigilo: 0 },
    recommended: { wis: 15, con: 14, str: 13, cha: 12, dex: 10, int: 8 },
    desc: 'Canal de un poder divino. Cura al grupo, lo protege y castiga a los muertos vivientes.',
  },
  rogue: {
    name: 'Pícaro', fem: 'Pícara', icon: '🗡️', hitDie: 8, saves: ['dex', 'int'],
    subclass: 'Arquetipo: Ladrón (a nivel 3)',
    skillChoices: 4, skillList: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleight', 'stealth'],
    expertise: 2,
    features: { 1: ['expertise', 'sneak_attack', 'thieves_cant'], 2: ['cunning_action'], 3: ['fast_hands', 'second_story_work'] },
    sneak: { 1: '1d6', 2: '1d6', 3: '2d6' },
    kits: {
      estoque: { name: 'Estoque', desc: 'Armadura de cuero, estoque, arco corto y daga', armor: { ...LEATHER }, weapons: [{ item: 'rapier', ability: 'dex' }, { item: 'shortbow', ability: 'dex' }, { item: 'dagger', ability: 'dex' }] },
      dos_hojas: { name: 'Dos hojas', desc: 'Armadura de cuero, dos espadas cortas y arco corto', armor: { ...LEATHER }, weapons: [{ item: 'shortsword', ability: 'dex' }, { item: 'shortbow', ability: 'dex' }, { item: 'shortsword', ability: 'dex' }] },
    },
    inventory: COMMON_INV.rogue,
    role: 'Sigilo y golpes certeros: ataque furtivo y mil habilidades', stats: { ataque: 4, defensa: 2, magia: 0, apoyo: 1, sigilo: 5 },
    recommended: { dex: 15, con: 14, wis: 13, cha: 12, int: 10, str: 8 },
    desc: 'Especialista en sigilo, trampas y engaños. Golpea donde más duele con el ataque furtivo.',
  },
  wizard: {
    name: 'Mago', fem: 'Maga', icon: '🔮', hitDie: 6, saves: ['int', 'wis'],
    subclass: 'Escuela de Evocación (a nivel 2)',
    skillChoices: 2, skillList: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'],
    features: { 1: ['spellcasting_wizard', 'arcane_recovery'], 2: ['evocation_savant', 'sculpt_spells'] },
    caster: 'int', slots: { 1: { 1: 2 }, 2: { 1: 3 }, 3: { 1: 4, 2: 2 } },
    spells: {
      cantrips: { count: 3, from: ['fire_bolt', 'ray_of_frost', 'shocking_grasp', 'chill_touch', 'mage_hand', 'light'] },
      level1: { count: 5, from: ['magic_missile', 'burning_hands', 'sleep', 'shield', 'mage_armor', 'thunderwave', 'detect_magic'] },
      auto: { 2: 'rest1:2', 3: ['scorching_ray', 'shatter', 'misty_step', 'hold_person'] },
    },
    kits: {
      baston: { name: 'Bastón', desc: 'Bastón y daga', armor: { base: 10, dexMax: 99, name: 'Sin armadura' }, weapons: [{ item: 'quarterstaff', ability: 'str' }, { item: 'dagger', ability: 'dex' }] },
      ballesta: { name: 'Ballesta', desc: 'Ballesta ligera y daga', armor: { base: 10, dexMax: 99, name: 'Sin armadura' }, weapons: [{ item: 'light_crossbow', ability: 'dex' }, { item: 'dagger', ability: 'dex' }] },
    },
    inventory: COMMON_INV.wizard,
    role: 'Magia de área y control: fuego, sueño y proyectiles', stats: { ataque: 3, defensa: 1, magia: 5, apoyo: 1, sigilo: 2 },
    recommended: { int: 15, con: 14, dex: 13, wis: 12, cha: 10, str: 8 },
    desc: 'Estudioso de lo arcano. Frágil, pero sus conjuros cambian el curso de un combate.',
  },
};
