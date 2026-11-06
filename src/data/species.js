// Especies del SRD 5.2.1 (CC BY 4.0). En las reglas de 2024 la especie no da bonificadores de característica:
// esos los da el trasfondo. Cada especie tiene rasgos, a veces un linaje a elegir, y conjuros innatos.
//   lineages: opciones a elegir (linaje élfico, gnomo, legado infernal, linaje gigante, ancestro dracónico)
//   spells: { nivel: [conjuros] } conjuros innatos; los de nivel 1+ se lanzan una vez gratis por descanso largo
//   spellAbility: true si se elige INT, SAB o CAR como aptitud mágica de esos conjuros
module.exports = {
  dragonborn: {
    name: 'Dracónido', fem: 'Dracónida', icon: '🐉', speed: 9,
    features: ['draconic_ancestry', 'breath_weapon', 'draconic_resistance', 'darkvision'],
    lineageLabel: 'Ancestro dracónico',
    lineages: {
      black: { name: 'Negro', type: 'ácido' }, blue: { name: 'Azul', type: 'relámpago' }, brass: { name: 'Oropel', type: 'fuego' },
      bronze: { name: 'Bronce', type: 'relámpago' }, copper: { name: 'Cobre', type: 'ácido' }, gold: { name: 'Oro', type: 'fuego' },
      green: { name: 'Verde', type: 'veneno' }, red: { name: 'Rojo', type: 'fuego' }, silver: { name: 'Plata', type: 'frío' }, white: { name: 'Blanco', type: 'frío' },
    },
    res: { breath: [2, 2, 2] },
    desc: 'Descendientes de dragones. Exhalan energía de su ancestro (1d10, salvación de Destreza) y resisten ese tipo de daño.',
  },
  elf: {
    name: 'Elfo', fem: 'Elfa', icon: '🧝', speed: 9, noSleep: true,
    features: ['elven_lineage', 'fey_ancestry', 'keen_senses', 'trance', 'darkvision'],
    keenSenses: ['insight', 'perception', 'survival'],
    lineageLabel: 'Linaje élfico', spellAbility: true,
    lineages: {
      high: { name: 'Alto elfo', spells: { 1: [], 3: ['detect_magic'] }, cantripFrom: 'wizard', desc: 'Un truco de mago a elegir (prestidigitación por defecto). A nivel 3, Detectar magia.' },
      drow: { name: 'Drow', spells: { 1: ['dancing_lights'], 3: ['faerie_fire'] }, desc: 'Visión en la oscuridad de 36 m y Luces danzantes. A nivel 3, Fuego feérico.' },
      wood: { name: 'Elfo de los bosques', spells: { 1: ['druidcraft'], 3: ['longstrider'] }, speed: 10.5, desc: 'Velocidad de 10,5 m y Saber druídico. A nivel 3, Zancada prodigiosa.' },
    },
    desc: 'Gráciles y longevos. No duermen ni pueden ser dormidos por magia, ven en la oscuridad y aprenden magia de su linaje.',
  },
  dwarf: {
    name: 'Enano', fem: 'Enana', icon: '⛏️', speed: 9, toughness: true, resist: ['veneno'],
    features: ['dwarven_resilience', 'dwarven_toughness', 'stonecunning', 'darkvision'],
    desc: 'Duros como la roca: +1 PG por nivel, resistencia al veneno y ventaja para no quedar envenenados.',
  },
  gnome: {
    name: 'Gnomo', fem: 'Gnoma', icon: '⚙️', speed: 9, small: true,
    features: ['gnomish_cunning', 'gnomish_lineage', 'darkvision'],
    lineageLabel: 'Linaje gnomo', spellAbility: true,
    lineages: {
      rock: { name: 'Gnomo de las rocas', spells: { 1: ['prestidigitation', 'mending'] }, desc: 'Prestidigitación y Reparar; fabrica pequeños juguetes mecánicos.' },
      forest: { name: 'Gnomo de los bosques', spells: { 1: ['minor_illusion', 'speak_with_animals'] }, desc: 'Ilusión menor y Hablar con los animales.' },
    },
    desc: 'Pequeños e ingeniosos. Ventaja en las salvaciones de Inteligencia, Sabiduría y Carisma.',
  },
  goliath: {
    name: 'Goliat', fem: 'Goliat', icon: '🗿', speed: 10.5,
    features: ['giant_ancestry', 'powerful_build'],
    lineageLabel: 'Linaje gigante',
    lineages: {
      fire: { name: 'Abrasión del fuego', desc: 'Al acertar con un ataque, +1d10 de daño de fuego.' },
      hill: { name: 'Caída de las colinas', desc: 'Al acertar con un ataque, derribas al objetivo.' },
      frost: { name: 'Frío de la escarcha', desc: 'Al acertar con un ataque, +1d6 de daño de frío y lo ralentizas.' },
      stone: { name: 'Resistencia de la piedra', desc: 'Reacción al recibir daño: lo reduces en 1d12 + CON.' },
      storm: { name: 'Trueno de la tormenta', desc: 'Reacción cuando te dañan: 1d8 de daño de trueno al atacante.' },
      cloud: { name: 'Excursión de las nubes', desc: 'Acción adicional: te teletransportas 9 m (te libras de agarres y redes).' },
    },
    res: { giant: [2, 2, 2] },
    desc: 'Descendientes de gigantes. Altos y fuertes, con un poder de su linaje que usan dos veces por descanso.',
  },
  human: {
    name: 'Humano', fem: 'Humana', icon: '🧑', speed: 9,
    features: ['resourceful', 'skillful', 'versatile'],
    extraSkill: 1, extraFeat: true,
    res: { heroic: [1, 1, 1] },
    desc: 'Versátiles y ambiciosos: una habilidad extra, una dote de origen extra e inspiración heroica.',
  },
  halfling: {
    name: 'Mediano', fem: 'Mediana', icon: '🍀', speed: 9, small: true,
    features: ['brave', 'halfling_nimbleness', 'luck', 'naturally_stealthy'],
    desc: 'Pequeños y afortunados: repiten los 1 en las tiradas de d20 y no se asustan fácilmente.',
  },
  orc: {
    name: 'Orco', fem: 'Orca', icon: '🪓', speed: 9,
    features: ['adrenaline_rush', 'relentless_endurance', 'darkvision'],
    res: { relentless: [1, 1, 1], adrenaline: [2, 2, 2] }, resShort: { adrenaline: 'all' },
    desc: 'Fuertes e incansables: aguantan en pie con 1 PG una vez y la adrenalina les da puntos de golpe temporales.',
  },
  tiefling: {
    name: 'Tiefling', fem: 'Tiefling', icon: '😈', speed: 9,
    features: ['fiendish_legacy', 'otherworldly_presence', 'darkvision'],
    lineageLabel: 'Legado infernal', spellAbility: true, alwaysSpells: ['thaumaturgy'],
    lineages: {
      abyssal: { name: 'Abisal', resist: ['veneno'], spells: { 1: ['poison_spray'], 3: ['ray_of_sickness'] }, desc: 'Resistencia al veneno y Rociada venenosa. A nivel 3, Rayo nauseabundo.' },
      chthonic: { name: 'Ctónico', resist: ['necrótico'], spells: { 1: ['chill_touch'], 3: ['false_life'] }, desc: 'Resistencia al daño necrótico y Toque helado. A nivel 3, Falsa vida.' },
      infernal: { name: 'Infernal', resist: ['fuego'], spells: { 1: ['fire_bolt'], 3: ['hellish_rebuke'] }, desc: 'Resistencia al fuego y Descarga de fuego. A nivel 3, Reprensión infernal.' },
    },
    desc: 'Con un legado de los planos inferiores: resistencia a un tipo de daño y magia innata.',
  },
};
