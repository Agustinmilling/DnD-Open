// Las 12 clases del SRD 5.2.1 (reglas de 2024), niveles 1 a 3, con la subclase del SRD a nivel 3.
//   features: rasgos por nivel (ids de features.js)
//   options: elecciones de la creación { id, label, at (nivel), count, from: [ids de rasgo o {id,name,desc}] }
//   caster: { ability, type: full | half | pact, list, cantrips, prepared: [nv1, nv2, nv3], always: { nivel: [conjuros] } }
//   res: recursos { clave: [usos a nv1, nv2, nv3] }; resShort: lo que se recupera con un descanso corto (n o 'all')
//   kits: equipo inicial. requires: { opción: valor } si el equipo necesita una elección (p. ej. Orden divina: Protector)
const ARMOR = {
  none: { base: 10, dexMax: 99, type: 'none', name: 'Sin armadura' },
  leather: { base: 11, dexMax: 99, type: 'light', name: 'Armadura de cuero' },
  studded: { base: 12, dexMax: 99, type: 'light', name: 'Cuero tachonado' },
  hide: { base: 12, dexMax: 2, type: 'medium', name: 'Armadura de pieles' },
  chainShirt: { base: 13, dexMax: 2, type: 'medium', name: 'Camisa de malla' },
  scale: { base: 14, dexMax: 2, type: 'medium', name: 'Cota de escamas' },
  chain: { base: 16, dexMax: 0, type: 'heavy', name: 'Cota de malla' },
};
const withShield = (a) => ({ ...a, shield: true, name: `${a.name} + escudo` });
const W = (...items) => items.map((item) => ({ item }));

const STYLES = ['style_defense', 'style_archery', 'style_great_weapon', 'style_two_weapon'];
const INV1 = ['inv_armor_of_shadows', 'inv_eldritch_mind', 'inv_pact_blade'];
const INV2 = ['inv_agonizing_blast', 'inv_fiendish_vigor', 'inv_devils_sight', 'inv_mask_of_many_faces', 'inv_repelling_blast'];
const LORE_SKILLS = ['arcana', 'history', 'investigation', 'medicine', 'nature', 'religion'];

const SPELLS = require('./spells');
const LANDS = {
  arid: { name: 'Árido', spells: ['blur', 'burning_hands', 'fire_bolt'], dmgType: 'fuego' },
  polar: { name: 'Polar', spells: ['fog_cloud', 'hold_person', 'ray_of_frost'], dmgType: 'frío' },
  temperate: { name: 'Templado', spells: ['misty_step', 'shocking_grasp', 'sleep'], dmgType: 'relámpago' },
  tropical: { name: 'Tropical', spells: ['acid_splash', 'ray_of_sickness', 'web'], dmgType: 'veneno' },
};

const C = {
  barbarian: {
    name: 'Bárbaro', fem: 'Bárbara', icon: '🪓', hitDie: 12, saves: ['str', 'con'], primary: 'str',
    subclass: 'Senda del berserker (a nivel 3)', armorTraining: 'ligera, media y escudos', weaponTraining: 'sencillas y marciales',
    skillChoices: 2, skillList: ['animal', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
    features: { 1: ['rage', 'unarmored_defense_barbarian', 'weapon_mastery'], 2: ['danger_sense', 'reckless_attack'], 3: ['primal_knowledge', 'frenzy'] },
    options: [{ id: 'primal', label: 'Conocimiento primigenio: una habilidad más', at: 3, count: 1, skills: 'class' }],
    masteries: 2, res: { rage: [2, 2, 3] }, resShort: { rage: 1 },
    kits: {
      hacha: { name: 'Hacha a dos manos', desc: 'Sin armadura (Defensa sin armadura), hacha a dos manos y hachas de mano', armor: ARMOR.none, weapons: W('greataxe', 'handaxe') },
      escudo: { name: 'Hacha y escudo', desc: 'Sin armadura y con escudo, hacha de guerra y jabalinas', armor: withShield(ARMOR.none), weapons: W('battleaxe', 'javelin') },
    },
    inventory: { potion_healing: 1, rope: 1, rations: 3 },
    role: 'Furia en primera línea: aguanta y golpea más fuerte que nadie', stats: { ataque: 5, defensa: 4, magia: 0, apoyo: 0, sigilo: 1 },
    recommended: { str: 15, con: 14, dex: 13, wis: 12, cha: 10, int: 8 },
    desc: 'Guerrero salvaje que entra en furia: resiste los golpes, pega más fuerte y se lanza temerario al combate.',
  },
  bard: {
    name: 'Bardo', fem: 'Barda', icon: '🎻', hitDie: 8, saves: ['dex', 'cha'], primary: 'cha',
    subclass: 'Colegio del conocimiento (a nivel 3)', armorTraining: 'ligera', weaponTraining: 'sencillas',
    skillChoices: 3, skillList: 'any',
    features: { 1: ['bardic_inspiration', 'spellcasting_bard'], 2: ['expertise_bard', 'jack_of_all_trades'], 3: ['lore_proficiencies', 'cutting_words'] },
    options: [
      { id: 'expertise', label: 'Pericia: duplica el bonificador en dos habilidades', at: 2, count: 2, skills: 'proficient' },
      { id: 'lore', label: 'Competencias adicionales: tres habilidades más', at: 3, count: 3, skills: 'any' },
    ],
    caster: { ability: 'cha', type: 'full', list: 'bard', cantrips: 2, prepared: [4, 5, 6] },
    res: { inspiration: 'cha' },
    kits: {
      dagas: { name: 'Dagas', desc: 'Armadura de cuero, dos dagas e instrumento', armor: ARMOR.leather, weapons: W('dagger', 'dagger') },
      ballesta: { name: 'Ballesta', desc: 'Armadura de cuero, ballesta ligera, daga e instrumento', armor: ARMOR.leather, weapons: W('light_crossbow', 'dagger') },
    },
    inventory: { potion_healing: 1, instrument: 1, rations: 3 },
    role: 'Apoyo y control: inspira, cura y desconcierta al enemigo', stats: { ataque: 2, defensa: 2, magia: 4, apoyo: 5, sigilo: 3 },
    recommended: { cha: 15, dex: 14, con: 13, wis: 12, int: 10, str: 8 },
    desc: 'Artista cuya música es magia. Inspira a sus aliados, cura, encanta y sabe un poco de todo.',
  },
  cleric: {
    name: 'Clérigo', fem: 'Clériga', icon: '✨', hitDie: 8, saves: ['wis', 'cha'], primary: 'wis',
    subclass: 'Dominio de la vida (a nivel 3)', armorTraining: 'ligera, media y escudos', weaponTraining: 'sencillas',
    skillChoices: 2, skillList: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
    features: { 1: ['spellcasting_cleric'], 2: ['channel_divinity_cleric'], 3: ['life_spells', 'disciple_of_life', 'preserve_life'] },
    options: [{ id: 'order', label: 'Orden divina', at: 1, count: 1, from: ['order_protector', 'order_thaumaturge'] }],
    caster: { ability: 'wis', type: 'full', list: 'cleric', cantrips: 3, prepared: [4, 5, 6], always: { 3: ['aid', 'bless', 'cure_wounds', 'lesser_restoration'] } },
    res: { channel: [0, 2, 2] }, resShort: { channel: 1 },
    kits: {
      maza: { name: 'Maza y camisa de malla', desc: 'Camisa de malla, escudo, maza y jabalinas', armor: withShield(ARMOR.chainShirt), weapons: W('mace', 'javelin') },
      martillo: { name: 'Martillo y cota de malla', desc: 'Cota de malla, escudo y martillo de guerra (necesita la orden Protector)', armor: withShield(ARMOR.chain), weapons: W('warhammer', 'javelin'), requires: { order: 'order_protector' } },
    },
    inventory: { potion_healing: 1, holy_symbol: 1, healers_kit: 1, rations: 3 },
    role: 'Sanador y apoyo: cura, bendice y expulsa muertos vivientes', stats: { ataque: 2, defensa: 4, magia: 3, apoyo: 5, sigilo: 0 },
    recommended: { wis: 15, con: 14, str: 13, cha: 12, dex: 10, int: 8 },
    desc: 'Canal de un poder divino. Cura al grupo, lo protege y castiga a los muertos vivientes.',
  },
  druid: {
    name: 'Druida', fem: 'Druida', icon: '🌿', hitDie: 8, saves: ['int', 'wis'], primary: 'wis',
    subclass: 'Círculo de la tierra (a nivel 3)', armorTraining: 'ligera y escudos', weaponTraining: 'sencillas',
    skillChoices: 2, skillList: ['arcana', 'animal', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
    features: { 1: ['druidic', 'spellcasting_druid'], 2: ['wild_shape', 'wild_companion'], 3: ['circle_spells', 'lands_aid'] },
    options: [
      { id: 'order', label: 'Orden primigenia', at: 1, count: 1, from: ['order_magician', 'order_warden'] },
      { id: 'land', label: 'Tierra del círculo', at: 3, count: 1, from: Object.entries(LANDS).map(([id, l]) => ({ id, name: l.name, desc: `Conjuros siempre preparados: ${l.spells.map((x) => (SPELLS[x] ? SPELLS[x].name : x)).join(', ')}` })) },
    ],
    caster: { ability: 'wis', type: 'full', list: 'druid', cantrips: 2, prepared: [4, 5, 6] },
    res: { wild_shape: [0, 2, 2] }, resShort: { wild_shape: 1 },
    kits: {
      hoz: { name: 'Hoz y escudo', desc: 'Armadura de cuero, escudo, hoz y canalizador druídico', armor: withShield(ARMOR.leather), weapons: W('sickle', 'javelin') },
      baston: { name: 'Bastón', desc: 'Armadura de cuero y bastón (ideal con Shillelagh)', armor: ARMOR.leather, weapons: W('quarterstaff', 'javelin') },
      guardian: { name: 'Guardián', desc: 'Armadura de pieles, escudo y cimitarra (necesita la orden Guardián)', armor: withShield(ARMOR.hide), weapons: W('scimitar', 'javelin'), requires: { order: 'order_warden' } },
    },
    inventory: { potion_healing: 1, druidic_focus: 1, healers_kit: 1, rations: 3 },
    role: 'Magia de la naturaleza: controla el campo, cura y se transforma en bestia', stats: { ataque: 3, defensa: 3, magia: 4, apoyo: 4, sigilo: 2 },
    recommended: { wis: 15, con: 14, dex: 13, int: 12, cha: 10, str: 8 },
    desc: 'Guardián de la naturaleza. Lanza conjuros de la tierra y puede adoptar la forma de un animal.',
  },
  fighter: {
    name: 'Guerrero', fem: 'Guerrera', icon: '⚔️', hitDie: 10, saves: ['str', 'con'], primary: 'str',
    subclass: 'Campeón (a nivel 3)', armorTraining: 'todas y escudos', weaponTraining: 'sencillas y marciales',
    skillChoices: 2, skillList: ['acrobatics', 'animal', 'athletics', 'history', 'insight', 'intimidation', 'persuasion', 'perception', 'survival'],
    features: { 1: ['second_wind', 'weapon_mastery'], 2: ['action_surge', 'tactical_mind'], 3: ['improved_critical', 'remarkable_athlete'] },
    options: [{ id: 'style', label: 'Estilo de combate', at: 1, count: 1, from: STYLES }],
    masteries: 3, critRange: { 3: 19 },
    res: { second_wind: [2, 2, 2], action_surge: [0, 1, 1] }, resShort: { second_wind: 1, action_surge: 'all' },
    kits: {
      defensor: { name: 'Defensor', desc: 'Cota de malla, escudo, espada larga y jabalinas', armor: withShield(ARMOR.chain), weapons: W('longsword', 'javelin') },
      mandoble: { name: 'Mandoble', desc: 'Cota de malla, espadón y jabalinas', armor: ARMOR.chain, weapons: W('greatsword', 'javelin') },
      arquero: { name: 'Arquero', desc: 'Cuero tachonado, arco largo, cimitarra y espada corta', armor: ARMOR.studded, weapons: W('longbow', 'scimitar', 'shortsword') },
    },
    inventory: { potion_healing: 1, rope: 1, rations: 3, torch: 2 },
    role: 'Primera línea: aguanta golpes y domina el combate', stats: { ataque: 4, defensa: 5, magia: 0, apoyo: 1, sigilo: 1 },
    recommended: { str: 15, con: 14, dex: 13, wis: 12, cha: 10, int: 8 },
    desc: 'Maestro de las armas y las armaduras. El que más aguanta y el más fiable en combate.',
  },
  monk: {
    name: 'Monje', fem: 'Monja', icon: '👊', hitDie: 8, saves: ['str', 'dex'], primary: 'dex',
    subclass: 'Guerrero de la mano abierta (a nivel 3)', armorTraining: 'ninguna', weaponTraining: 'sencillas y marciales ligeras',
    skillChoices: 2, skillList: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
    features: { 1: ['martial_arts', 'unarmored_defense_monk'], 2: ['monks_focus', 'unarmored_movement', 'uncanny_metabolism'], 3: ['deflect_attacks', 'open_hand_technique'] },
    martialDie: { 1: '1d6', 2: '1d6', 3: '1d6' },
    res: { focus: [0, 2, 3], metabolism: [0, 1, 1] }, resShort: { focus: 'all' },
    kits: {
      lanza: { name: 'Lanza', desc: 'Sin armadura, lanza y dagas', armor: ARMOR.none, weapons: W('spear', 'dagger') },
      espada: { name: 'Espada corta', desc: 'Sin armadura, espada corta y daga', armor: ARMOR.none, weapons: W('shortsword', 'dagger') },
    },
    inventory: { potion_healing: 1, rope: 1, rations: 3 },
    role: 'Golpes rápidos: varios ataques por turno, esquiva y desvía proyectiles', stats: { ataque: 4, defensa: 3, magia: 0, apoyo: 1, sigilo: 4 },
    recommended: { dex: 15, wis: 14, con: 13, str: 12, int: 10, cha: 8 },
    desc: 'Maestro de las artes marciales. Pelea sin armadura, golpea varias veces por turno y desvía ataques.',
  },
  paladin: {
    name: 'Paladín', fem: 'Paladina', icon: '🛡️', hitDie: 10, saves: ['wis', 'cha'], primary: 'str',
    subclass: 'Juramento de entrega (a nivel 3)', armorTraining: 'todas y escudos', weaponTraining: 'sencillas y marciales',
    skillChoices: 2, skillList: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
    features: { 1: ['lay_on_hands', 'spellcasting_paladin', 'weapon_mastery'], 2: ['paladins_smite'], 3: ['channel_divinity_paladin', 'devotion_spells', 'sacred_weapon'] },
    options: [{ id: 'style', label: 'Estilo de combate', at: 2, count: 1, from: [...STYLES, 'style_blessed_warrior'] }],
    masteries: 2,
    caster: { ability: 'cha', type: 'half', list: 'paladin', cantrips: 0, prepared: [2, 3, 4], always: { 2: ['divine_smite'], 3: ['protection_from_evil_and_good', 'shield_of_faith'] } },
    res: { lay_on_hands: [5, 10, 15], channel: [0, 0, 2], free_divine_smite: [0, 1, 1] }, resShort: { channel: 1 },
    kits: {
      escudo: { name: 'Espada y escudo', desc: 'Cota de malla, escudo, espada larga y jabalinas', armor: withShield(ARMOR.chain), weapons: W('longsword', 'javelin') },
      mandoble: { name: 'Mandoble', desc: 'Cota de malla, espadón y jabalinas', armor: ARMOR.chain, weapons: W('greatsword', 'javelin') },
    },
    inventory: { potion_healing: 1, holy_symbol: 1, rations: 3 },
    role: 'Caballero sagrado: castigos devastadores, curación y defensa', stats: { ataque: 5, defensa: 5, magia: 2, apoyo: 3, sigilo: 0 },
    recommended: { str: 15, cha: 14, con: 13, wis: 12, dex: 10, int: 8 },
    desc: 'Guerrero sagrado unido a un juramento. Cura con las manos y castiga a sus enemigos con poder divino.',
  },
  ranger: {
    name: 'Explorador', fem: 'Exploradora', icon: '🏹', hitDie: 10, saves: ['str', 'dex'], primary: 'dex',
    subclass: 'Cazador (a nivel 3)', armorTraining: 'ligera, media y escudos', weaponTraining: 'sencillas y marciales',
    skillChoices: 3, skillList: ['animal', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'],
    features: { 1: ['spellcasting_ranger', 'favored_enemy', 'weapon_mastery'], 2: ['deft_explorer'], 3: ['hunters_lore'] },
    options: [
      { id: 'expertise', label: 'Explorador hábil: pericia en una habilidad', at: 2, count: 1, skills: 'proficient' },
      { id: 'style', label: 'Estilo de combate', at: 2, count: 1, from: [...STYLES, 'style_druidic_warrior'] },
      { id: 'prey', label: 'Presa del cazador', at: 3, count: 1, from: ['colossus_slayer', 'horde_breaker'] },
    ],
    masteries: 2,
    caster: { ability: 'wis', type: 'half', list: 'ranger', cantrips: 0, prepared: [2, 3, 4], always: { 1: ['hunters_mark'] } },
    res: { free_hunters_mark: [2, 2, 2] },
    kits: {
      arco: { name: 'Arco largo', desc: 'Cuero tachonado, arco largo, cimitarra y espada corta', armor: ARMOR.studded, weapons: W('longbow', 'scimitar', 'shortsword') },
      hojas: { name: 'Hojas gemelas', desc: 'Camisa de malla, cimitarra, espada corta y arco corto', armor: ARMOR.chainShirt, weapons: W('scimitar', 'shortsword', 'shortbow') },
    },
    inventory: { potion_healing: 1, druidic_focus: 1, rope: 1, rations: 3 },
    role: 'Cazador a distancia: marca a su presa y la abate', stats: { ataque: 4, defensa: 3, magia: 2, apoyo: 2, sigilo: 4 },
    recommended: { dex: 15, wis: 14, con: 13, str: 12, int: 10, cha: 8 },
    desc: 'Rastreador de las tierras salvajes. Marca a su presa, la acosa con arco o espadas y conoce algo de magia natural.',
  },
  rogue: {
    name: 'Pícaro', fem: 'Pícara', icon: '🗡️', hitDie: 8, saves: ['dex', 'int'], primary: 'dex',
    subclass: 'Ladrón (a nivel 3)', armorTraining: 'ligera', weaponTraining: 'sencillas y marciales sutiles o ligeras',
    skillChoices: 4, skillList: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'persuasion', 'sleight', 'stealth'],
    features: { 1: ['expertise_rogue', 'sneak_attack', 'thieves_cant', 'weapon_mastery'], 2: ['cunning_action'], 3: ['steady_aim', 'fast_hands', 'second_story_work'] },
    options: [{ id: 'expertise', label: 'Pericia: duplica el bonificador en dos habilidades', at: 1, count: 2, skills: 'proficient' }],
    masteries: 2, sneak: { 1: '1d6', 2: '1d6', 3: '2d6' },
    kits: {
      estoque: { name: 'Estoque', desc: 'Armadura de cuero, estoque, arco corto y daga', armor: ARMOR.leather, weapons: W('rapier', 'shortbow', 'dagger') },
      dos_hojas: { name: 'Dos hojas', desc: 'Armadura de cuero, dos espadas cortas y arco corto', armor: ARMOR.leather, weapons: W('shortsword', 'shortbow', 'shortsword') },
    },
    inventory: { potion_healing: 1, thieves_tools: 1, rope: 1, rations: 3 },
    role: 'Sigilo y golpes certeros: ataque furtivo y mil habilidades', stats: { ataque: 4, defensa: 2, magia: 0, apoyo: 1, sigilo: 5 },
    recommended: { dex: 15, con: 14, wis: 13, int: 12, cha: 10, str: 8 },
    desc: 'Especialista en sigilo, trampas y engaños. Golpea donde más duele con el ataque furtivo.',
  },
  sorcerer: {
    name: 'Hechicero', fem: 'Hechicera', icon: '🔥', hitDie: 6, saves: ['con', 'cha'], primary: 'cha',
    subclass: 'Hechicería dracónica (a nivel 3)', armorTraining: 'ninguna', weaponTraining: 'sencillas',
    skillChoices: 2, skillList: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
    features: { 1: ['spellcasting_sorcerer', 'innate_sorcery'], 2: ['font_of_magic', 'metamagic'], 3: ['draconic_resilience', 'draconic_spells'] },
    options: [{ id: 'metamagic', label: 'Metamagia', at: 2, count: 2, from: ['meta_empowered', 'meta_extended', 'meta_heightened', 'meta_seeking'] }],
    caster: { ability: 'cha', type: 'full', list: 'sorcerer', cantrips: 4, prepared: [2, 4, 6], always: { 3: ['alter_self', 'chromatic_orb', 'command', 'dragons_breath'] } },
    res: { innate: [2, 2, 2], points: [0, 2, 3] },
    kits: {
      lanza: { name: 'Lanza', desc: 'Lanza y dos dagas', armor: ARMOR.none, weapons: W('spear', 'dagger') },
      ballesta: { name: 'Ballesta', desc: 'Ballesta ligera y daga', armor: ARMOR.none, weapons: W('light_crossbow', 'dagger') },
    },
    inventory: { potion_healing: 1, arcane_focus: 1, rations: 3 },
    role: 'Magia innata: conjuros potentes que puede moldear a su antojo', stats: { ataque: 3, defensa: 2, magia: 5, apoyo: 1, sigilo: 2 },
    recommended: { cha: 15, con: 14, dex: 13, wis: 12, int: 10, str: 8 },
    desc: 'Nació con la magia en la sangre. Pocos conjuros, pero puede potenciarlos con su metamagia.',
  },
  warlock: {
    name: 'Brujo', fem: 'Bruja', icon: '👁️', hitDie: 8, saves: ['wis', 'cha'], primary: 'cha',
    subclass: 'Patrón infernal (a nivel 3)', armorTraining: 'ligera', weaponTraining: 'sencillas',
    skillChoices: 2, skillList: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
    features: { 1: ['eldritch_invocations', 'pact_magic'], 2: ['magical_cunning'], 3: ['dark_ones_blessing', 'fiend_spells'] },
    options: [
      { id: 'invocations', label: 'Invocación sobrenatural', at: 1, count: 1, from: INV1 },
      { id: 'invocations2', label: 'Dos invocaciones más', at: 2, count: 2, from: [...INV1, ...INV2], excludeOption: 'invocations' },
    ],
    caster: { ability: 'cha', type: 'pact', list: 'warlock', cantrips: 2, prepared: [2, 3, 4], always: { 3: ['burning_hands', 'command', 'scorching_ray', 'suggestion'] } },
    res: { cunning: [0, 1, 1] },
    kits: {
      hoz: { name: 'Hoz', desc: 'Armadura de cuero, hoz y daga', armor: ARMOR.leather, weapons: W('sickle', 'dagger') },
      ballesta: { name: 'Ballesta', desc: 'Armadura de cuero, ballesta ligera y daga', armor: ARMOR.leather, weapons: W('light_crossbow', 'dagger') },
    },
    inventory: { potion_healing: 1, arcane_focus: 1, rations: 3 },
    role: 'Pacto oscuro: descargas sobrenaturales y trucos de su patrón', stats: { ataque: 4, defensa: 2, magia: 4, apoyo: 1, sigilo: 2 },
    recommended: { cha: 15, con: 14, dex: 13, wis: 12, int: 10, str: 8 },
    desc: 'Pactó con un ser poderoso. Pocos espacios de conjuro que se recuperan rápido y unas invocaciones que lo hacen único.',
  },
  wizard: {
    name: 'Mago', fem: 'Maga', icon: '🔮', hitDie: 6, saves: ['int', 'wis'], primary: 'int',
    subclass: 'Evocador (a nivel 3)', armorTraining: 'ninguna', weaponTraining: 'sencillas',
    skillChoices: 2, skillList: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'],
    features: { 1: ['spellcasting_wizard', 'ritual_adept', 'arcane_recovery'], 2: ['scholar'], 3: ['evocation_savant', 'potent_cantrip'] },
    options: [{ id: 'expertise', label: 'Académico: pericia en una habilidad de saber', at: 2, count: 1, skills: 'proficient', limit: LORE_SKILLS }],
    caster: { ability: 'int', type: 'full', list: 'wizard', cantrips: 3, prepared: [4, 5, 6] },
    res: { arcane_recovery: [1, 1, 1] },
    kits: {
      baston: { name: 'Bastón', desc: 'Bastón y daga', armor: ARMOR.none, weapons: W('quarterstaff', 'dagger') },
      ballesta: { name: 'Ballesta', desc: 'Ballesta ligera y daga', armor: ARMOR.none, weapons: W('light_crossbow', 'dagger') },
    },
    inventory: { potion_healing: 1, spellbook: 1, arcane_focus: 1, rations: 3 },
    role: 'Magia de área y control: fuego, sueño y proyectiles', stats: { ataque: 3, defensa: 1, magia: 5, apoyo: 1, sigilo: 2 },
    recommended: { int: 15, con: 14, dex: 13, wis: 12, cha: 10, str: 8 },
    desc: 'Estudioso de lo arcano. Frágil, pero el que más conjuros conoce: sus hechizos cambian el curso de un combate.',
  },
};

// Espacios de conjuro por tipo de lanzador y nivel de personaje (SRD 5.2.1)
const SLOTS = {
  full: { 1: { 1: 2 }, 2: { 1: 3 }, 3: { 1: 4, 2: 2 } },
  half: { 1: { 1: 2 }, 2: { 1: 2 }, 3: { 1: 3 } },
  pact: { 1: { 1: 1 }, 2: { 1: 2 }, 3: { 2: 2 } },
};
// Nivel máximo de conjuro que se puede preparar según el nivel de personaje
const MAX_SPELL_LEVEL = { full: { 1: 1, 2: 1, 3: 2 }, half: { 1: 1, 2: 1, 3: 1 }, pact: { 1: 1, 2: 1, 3: 2 } };

module.exports = C;
Object.defineProperty(module.exports, 'SLOTS', { value: SLOTS });
Object.defineProperty(module.exports, 'MAX_SPELL_LEVEL', { value: MAX_SPELL_LEVEL });
Object.defineProperty(module.exports, 'LANDS', { value: LANDS });
Object.defineProperty(module.exports, 'ARMOR', { value: ARMOR });
