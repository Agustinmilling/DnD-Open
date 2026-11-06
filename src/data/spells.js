// Conjuros de nivel 0 a 2 del SRD 5.2.1 (CC BY 4.0) que se pueden elegir en este juego, resumidos.
// Campos de motor:
//   lists: listas de clase (bard, cleric, druid, paladin, ranger, sorcerer, warlock, wizard)
//   kind: attack | save | heal | buff | mark | smite | reaction | special | utility
//   time: action | bonus | reaction | long (fuera de combate)
//   target: enemy | enemies (hasta maxTargets) | ally | allies | self | dying | none
//   damage / upcast / dmgType / half / save / cond (estado que aplica) / combat / explore
const LIST_NAMES = { bard: 'bardo', cleric: 'clérigo', druid: 'druida', paladin: 'paladín', ranger: 'explorador', sorcerer: 'hechicero', warlock: 'brujo', wizard: 'mago' };

const S = {
  // =========================================================== Trucos
  acid_splash: {
    name: 'Salpicadura ácida', level: 0, school: 'Evocación', lists: ['sorcerer', 'wizard'], time: 'action', range: '18 m', duration: 'Instantáneo',
    desc: 'Una burbuja de ácido estalla en una esfera de 1,5 m de radio. Cada criatura en ella debe superar una salvación de Destreza o sufre 1d6 de daño de ácido.',
    kind: 'save', save: 'dex', damage: '1d6', dmgType: 'ácido', target: 'enemies', maxTargets: 2, combat: true, cantripDamage: true,
  },
  chill_touch: {
    name: 'Toque helado', level: 0, school: 'Nigromancia', lists: ['sorcerer', 'warlock', 'wizard'], time: 'action', range: 'Toque', duration: 'Instantáneo',
    desc: 'Haz un ataque de conjuro cuerpo a cuerpo. Si acierta, el objetivo sufre 1d10 de daño necrótico y no puede recuperar puntos de golpe hasta el final de tu siguiente turno.',
    kind: 'attack', damage: '1d10', dmgType: 'necrótico', melee: true, target: 'enemy', combat: true, cantripDamage: true,
  },
  dancing_lights: {
    name: 'Luces danzantes', level: 0, school: 'Ilusionismo', lists: ['bard', 'sorcerer', 'wizard'], time: 'action', range: '36 m', duration: 'Concentración, hasta 1 minuto',
    desc: 'Creas hasta cuatro luces del tamaño de una antorcha que flotan donde quieras y dan luz tenue en 3 m.', kind: 'utility',
  },
  druidcraft: {
    name: 'Saber druídico', level: 0, school: 'Transmutación', lists: ['druid'], time: 'action', range: '9 m', duration: 'Instantáneo',
    desc: 'Susurras a los espíritus de la naturaleza: predices el tiempo, haces florecer una planta, creas un efecto sensorial inofensivo o enciendes o apagas una pequeña llama.', kind: 'utility',
  },
  eldritch_blast: {
    name: 'Descarga sobrenatural', level: 0, school: 'Evocación', lists: ['warlock'], time: 'action', range: '36 m', duration: 'Instantáneo',
    desc: 'Lanzas un rayo de energía chisporroteante. Haz un ataque de conjuro a distancia; si acierta, el objetivo sufre 1d10 de daño de fuerza.',
    kind: 'attack', damage: '1d10', dmgType: 'fuerza', target: 'enemy', combat: true, cantripDamage: true,
  },
  elementalism: {
    name: 'Elementalismo', level: 0, school: 'Transmutación', lists: ['druid', 'sorcerer', 'wizard'], time: 'action', range: '9 m', duration: 'Instantáneo',
    desc: 'Controlas un poco los elementos: una ráfaga de aire, una brasa, una nube de polvo o un chorrito de agua.', kind: 'utility',
  },
  fire_bolt: {
    name: 'Descarga de fuego', level: 0, school: 'Evocación', lists: ['sorcerer', 'wizard'], time: 'action', range: '36 m', duration: 'Instantáneo',
    desc: 'Lanzas una mota de fuego. Haz un ataque de conjuro a distancia; si acierta, el objetivo sufre 1d10 de daño de fuego.',
    kind: 'attack', damage: '1d10', dmgType: 'fuego', target: 'enemy', combat: true, cantripDamage: true,
  },
  guidance: {
    name: 'Guía', level: 0, school: 'Adivinación', lists: ['cleric', 'druid'], time: 'action', range: 'Toque', duration: 'Concentración, hasta 1 minuto',
    desc: 'Tocas a una criatura voluntaria: añade 1d4 a su próxima prueba de característica.', kind: 'special', target: 'ally', explore: true,
  },
  light: {
    name: 'Luz', level: 0, school: 'Evocación', lists: ['bard', 'cleric', 'sorcerer', 'wizard'], time: 'action', range: 'Toque', duration: '1 hora',
    desc: 'Tocas un objeto, que emite luz brillante en un radio de 6 m y luz tenue otros 6 m.', kind: 'utility',
  },
  mage_hand: {
    name: 'Mano de mago', level: 0, school: 'Conjuración', lists: ['bard', 'sorcerer', 'warlock', 'wizard'], time: 'action', range: '9 m', duration: '1 minuto',
    desc: 'Aparece una mano espectral que puede manipular objetos, abrir puertas o recipientes y cargar hasta 5 kg. No puede atacar.', kind: 'utility',
  },
  mending: {
    name: 'Reparar', level: 0, school: 'Transmutación', lists: ['bard', 'cleric', 'druid', 'sorcerer', 'wizard'], time: 'minute', range: 'Toque', duration: 'Instantáneo',
    desc: 'Reparas una rotura o rasgadura de un objeto: un eslabón, una llave partida, una capa rasgada.', kind: 'utility',
  },
  message: {
    name: 'Mensaje', level: 0, school: 'Transmutación', lists: ['bard', 'druid', 'sorcerer', 'wizard'], time: 'action', range: '36 m', duration: '1 asalto',
    desc: 'Susurras un mensaje a una criatura a distancia, que puede responderte en susurros.', kind: 'utility',
  },
  minor_illusion: {
    name: 'Ilusión menor', level: 0, school: 'Ilusionismo', lists: ['bard', 'sorcerer', 'warlock', 'wizard'], time: 'action', range: '9 m', duration: '1 minuto',
    desc: 'Creas un sonido o la imagen de un objeto pequeño. Una prueba de Inteligencia (Investigación) revela que es una ilusión.', kind: 'utility',
  },
  poison_spray: {
    name: 'Rociada venenosa', level: 0, school: 'Nigromancia', lists: ['druid', 'sorcerer', 'warlock', 'wizard'], time: 'action', range: '9 m', duration: 'Instantáneo',
    desc: 'Rocías una niebla tóxica. Haz un ataque de conjuro a distancia; si acierta, el objetivo sufre 1d12 de daño de veneno.',
    kind: 'attack', damage: '1d12', dmgType: 'veneno', target: 'enemy', combat: true, cantripDamage: true,
  },
  prestidigitation: {
    name: 'Prestidigitación', level: 0, school: 'Transmutación', lists: ['bard', 'sorcerer', 'warlock', 'wizard'], time: 'action', range: '3 m', duration: 'Hasta 1 hora',
    desc: 'Pequeños trucos de magia: chispas, limpiar o ensuciar, enfriar o calentar, una marca, una baratija ilusoria.', kind: 'utility',
  },
  produce_flame: {
    name: 'Crear llama', level: 0, school: 'Conjuración', lists: ['druid'], time: 'action', range: '18 m', duration: '10 minutos',
    desc: 'Una llama aparece en tu mano y puedes arrojarla: haz un ataque de conjuro a distancia; si acierta, el objetivo sufre 1d8 de daño de fuego. (Aquí: crear y lanzar la llama es una sola acción).',
    kind: 'attack', damage: '1d8', dmgType: 'fuego', target: 'enemy', combat: true, cantripDamage: true,
  },
  ray_of_frost: {
    name: 'Rayo de escarcha', level: 0, school: 'Evocación', lists: ['sorcerer', 'wizard'], time: 'action', range: '18 m', duration: 'Instantáneo',
    desc: 'Un haz de luz gélida. Haz un ataque de conjuro a distancia; si acierta, el objetivo sufre 1d8 de daño de frío y su velocidad se reduce en 3 m hasta el principio de tu siguiente turno.',
    kind: 'attack', damage: '1d8', dmgType: 'frío', target: 'enemy', combat: true, cond: 'slowed_frost', cantripDamage: true,
  },
  resistance: {
    name: 'Resistencia', level: 0, school: 'Abjuración', lists: ['cleric', 'druid'], time: 'action', range: 'Toque', duration: 'Concentración, hasta 1 minuto', conc: true,
    desc: 'Tocas a una criatura voluntaria. Hasta que termine el conjuro, una vez por turno, cuando sufra daño lo reduce en 1d4. (Aquí: contra cualquier tipo de daño).',
    kind: 'buff', cond: 'resisting', target: 'ally', maxTargets: 1, rounds: 10, combat: true,
  },
  sacred_flame: {
    name: 'Llama sagrada', level: 0, school: 'Evocación', lists: ['cleric'], time: 'action', range: '18 m', duration: 'Instantáneo',
    desc: 'Un resplandor desciende sobre una criatura: debe superar una salvación de Destreza o sufre 1d8 de daño radiante. La cobertura no la protege.',
    kind: 'save', save: 'dex', damage: '1d8', dmgType: 'radiante', target: 'enemy', combat: true, cantripDamage: true,
  },
  shillelagh: {
    name: 'Shillelagh', level: 0, school: 'Transmutación', lists: ['druid'], time: 'bonus', range: 'Lanzador', duration: '1 minuto',
    desc: 'Tu bastón o garrote se impregna del poder de la naturaleza: usas tu aptitud mágica para atacar y dañar con él, y su dado de daño pasa a ser 1d8.',
    kind: 'buff', cond: 'shillelagh', target: 'self', rounds: 10, combat: true, needsWeapon: ['quarterstaff', 'club'],
  },
  shocking_grasp: {
    name: 'Agarre electrizante', level: 0, school: 'Evocación', lists: ['sorcerer', 'wizard'], time: 'action', range: 'Toque', duration: 'Instantáneo',
    desc: 'Un relámpago salta de tu mano. Haz un ataque de conjuro cuerpo a cuerpo; si acierta, el objetivo sufre 1d8 de daño de relámpago y no puede hacer ataques de oportunidad hasta el principio de su siguiente turno.',
    kind: 'attack', damage: '1d8', dmgType: 'relámpago', melee: true, target: 'enemy', combat: true, cond: 'addled', cantripDamage: true,
  },
  sorcerous_burst: {
    name: 'Estallido mágico', level: 0, school: 'Evocación', lists: ['sorcerer'], time: 'action', range: '36 m', duration: 'Instantáneo',
    desc: 'Lanzas energía mágica: haz un ataque de conjuro a distancia; si acierta, 1d8 de daño de ácido, frío, fuego, psíquico, relámpago, trueno o veneno (eliges). Cada 8 que saques añade otro d8, hasta tantos dados extra como tu modificador de aptitud mágica. (Aquí: se elige solo el tipo que el objetivo no resiste).',
    kind: 'attack', damage: '1d8', dmgType: 'relámpago', anyType: ['relámpago', 'fuego', 'frío', 'ácido', 'trueno', 'psíquico', 'veneno'], target: 'enemy', combat: true, cantripDamage: true,
  },
  spare_the_dying: {
    name: 'Piedad con los moribundos', level: 0, school: 'Nigromancia', lists: ['cleric', 'druid'], time: 'action', range: '4,5 m', duration: 'Instantáneo',
    desc: 'Eliges a una criatura con 0 puntos de golpe que no esté muerta: pasa a estar estable.', kind: 'special', target: 'dying', combat: true, explore: true,
  },
  starry_wisp: {
    name: 'Voluta estelar', level: 0, school: 'Evocación', lists: ['bard', 'druid'], time: 'action', range: '18 m', duration: 'Instantáneo',
    desc: 'Lanzas una mota de luz: haz un ataque de conjuro a distancia; si acierta, el objetivo sufre 1d8 de daño radiante y no puede beneficiarse de ser invisible hasta el final de tu siguiente turno.',
    kind: 'attack', damage: '1d8', dmgType: 'radiante', target: 'enemy', combat: true, cantripDamage: true,
  },
  thaumaturgy: {
    name: 'Taumaturgia', level: 0, school: 'Transmutación', lists: ['cleric'], time: 'action', range: '9 m', duration: 'Hasta 1 minuto',
    desc: 'Manifiestas una pequeña maravilla: tu voz retumba, las llamas parpadean, la tierra tiembla levemente o una puerta se abre de golpe.', kind: 'utility', explore: true, target: 'self',
  },
  true_strike: {
    name: 'Impacto certero', level: 0, school: 'Adivinación', lists: ['bard', 'sorcerer', 'warlock', 'wizard'], time: 'action', range: 'Lanzador', duration: 'Instantáneo',
    desc: 'Un destello de perspicacia te guía: haces un ataque con tu arma usando tu aptitud mágica para el ataque y el daño, y el daño puede ser radiante.',
    kind: 'special', target: 'enemy', combat: true, weaponSpell: true,
  },
  vicious_mockery: {
    name: 'Burla dañina', level: 0, school: 'Encantamiento', lists: ['bard'], time: 'action', range: '18 m', duration: 'Instantáneo',
    desc: 'Una sarta de insultos encantados: el objetivo debe superar una salvación de Sabiduría o sufre 1d6 de daño psíquico y tiene desventaja en su próxima tirada de ataque.',
    kind: 'save', save: 'wis', damage: '1d6', dmgType: 'psíquico', target: 'enemy', combat: true, cond: 'sapped', cantripDamage: true,
  },

  // =========================================================== Nivel 1
  bane: {
    name: 'Perdición', level: 1, school: 'Encantamiento', lists: ['bard', 'cleric', 'warlock'], time: 'action', range: '9 m', duration: 'Concentración, hasta 1 minuto', conc: true,
    desc: 'Hasta tres criaturas deben superar una salvación de Carisma o restar 1d4 a sus tiradas de ataque y de salvación mientras dure. A niveles superiores: +1 objetivo por nivel.',
    kind: 'save', save: 'cha', cond: 'baned', target: 'enemies', maxTargets: 3, upTargets: 1, combat: true,
  },
  bless: {
    name: 'Bendición', level: 1, school: 'Encantamiento', lists: ['cleric', 'paladin'], time: 'action', range: '9 m', duration: 'Concentración, hasta 1 minuto', conc: true,
    desc: 'Bendices hasta a tres criaturas: suman 1d4 a sus tiradas de ataque y de salvación mientras dure. A niveles superiores: +1 objetivo por nivel.',
    kind: 'buff', cond: 'blessed', target: 'allies', maxTargets: 3, upTargets: 1, rounds: 10, combat: true,
  },
  burning_hands: {
    name: 'Manos ardientes', level: 1, school: 'Evocación', lists: ['sorcerer', 'wizard'], time: 'action', range: 'Cono de 4,5 m', duration: 'Instantáneo',
    desc: 'Una lámina de llamas brota de tus manos: cada criatura en un cono de 4,5 m hace una salvación de Destreza y sufre 3d6 de daño de fuego, o la mitad si la supera. A niveles superiores: +1d6 por nivel.',
    kind: 'save', save: 'dex', damage: '3d6', upcast: '1d6', dmgType: 'fuego', half: true, target: 'enemies', maxTargets: 3, combat: true,
  },
  charm_person: {
    name: 'Hechizar persona', level: 1, school: 'Encantamiento', lists: ['bard', 'druid', 'sorcerer', 'warlock', 'wizard'], time: 'action', range: '9 m', duration: '1 hora',
    desc: 'Un humanoide debe superar una salvación de Sabiduría o queda hechizado por ti y te trata como a un conocido amistoso. (Aquí: útil en la historia, sin efecto en combate).', kind: 'utility',
  },
  chromatic_orb: {
    name: 'Orbe cromático', level: 1, school: 'Evocación', lists: ['sorcerer', 'wizard'], time: 'action', range: '27 m', duration: 'Instantáneo',
    desc: 'Lanzas un orbe de ácido, frío, fuego, relámpago, trueno o veneno: ataque de conjuro a distancia, 3d8 de daño. Si dos o más d8 sacan el mismo número, el orbe salta a otro objetivo. A niveles superiores: +1d8 y un salto más por nivel.',
    kind: 'attack', damage: '3d8', upcast: '1d8', dmgType: 'fuego', anyType: ['fuego', 'frío', 'relámpago', 'ácido', 'trueno', 'veneno'], target: 'enemy', combat: true,
  },
  color_spray: {
    name: 'Rociada de color', level: 1, school: 'Ilusionismo', lists: ['bard', 'sorcerer', 'wizard'], time: 'action', range: 'Cono de 4,5 m', duration: 'Instantáneo',
    desc: 'Una ráfaga de luces de colores: cada criatura en un cono de 4,5 m debe superar una salvación de Constitución o queda cegada hasta el final de tu siguiente turno.',
    kind: 'save', save: 'con', cond: 'blinded', untilCasterEnd: true, target: 'enemies', maxTargets: 3, combat: true,
  },
  command: {
    name: 'Orden imperiosa', level: 1, school: 'Encantamiento', lists: ['bard', 'cleric', 'paladin'], time: 'action', range: '18 m', duration: 'Instantáneo',
    desc: 'Das una orden de una palabra (acércate, detente, huye, póstrate, suelta). El objetivo debe superar una salvación de Sabiduría o la obedece en su próximo turno. (Aquí: "¡Póstrate!": cae derribado y pierde su turno). A niveles superiores: +1 objetivo por nivel.',
    kind: 'save', save: 'wis', cond: 'commanded', target: 'enemies', maxTargets: 1, upTargets: 1, combat: true,
  },
  comprehend_languages: {
    name: 'Entender idiomas', level: 1, school: 'Adivinación', lists: ['bard', 'sorcerer', 'warlock', 'wizard'], time: 'action', range: 'Lanzador', duration: '1 hora', ritual: true,
    desc: 'Entiendes el significado literal de cualquier idioma hablado o escrito que oigas o veas.', kind: 'utility',
  },
  cure_wounds: {
    name: 'Curar heridas', level: 1, school: 'Abjuración', lists: ['bard', 'cleric', 'druid', 'paladin', 'ranger'], time: 'action', range: 'Toque', duration: 'Instantáneo',
    desc: 'Una criatura que toques recupera 2d8 + tu modificador de aptitud mágica puntos de golpe. A niveles superiores: +2d8 por nivel.',
    kind: 'heal', heal: '2d8', upcast: '2d8', target: 'ally', combat: true, explore: true,
  },
  detect_magic: {
    name: 'Detectar magia', level: 1, school: 'Adivinación', lists: ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'], time: 'action', range: 'Lanzador', duration: 'Concentración, hasta 10 minutos', ritual: true,
    desc: 'Percibes la magia a 9 m de ti y ves un aura alrededor de las criaturas u objetos mágicos, además de su escuela de magia.', kind: 'utility',
  },
  disguise_self: {
    name: 'Disfrazarse', level: 1, school: 'Ilusionismo', lists: ['bard', 'sorcerer', 'wizard'], time: 'action', range: 'Lanzador', duration: '1 hora',
    desc: 'Cambias tu aspecto (ropa, armadura, armas y cuerpo) durante una hora. Es una ilusión: se descubre al tocarla.', kind: 'utility',
  },
  dissonant_whispers: {
    name: 'Susurros discordantes', level: 1, school: 'Encantamiento', lists: ['bard'], time: 'action', range: '18 m', duration: 'Instantáneo',
    desc: 'Una melodía discordante en la mente del objetivo: salvación de Sabiduría; si falla sufre 3d6 de daño psíquico y huye de ti; si la supera, la mitad. A niveles superiores: +1d6 por nivel.',
    kind: 'save', save: 'wis', damage: '3d6', upcast: '1d6', dmgType: 'psíquico', half: true, target: 'enemy', combat: true,
  },
  divine_favor: {
    name: 'Favor divino', level: 1, school: 'Transmutación', lists: ['paladin'], time: 'bonus', range: 'Lanzador', duration: '1 minuto',
    desc: 'Hasta que termine el conjuro, tus ataques con armas infligen 1d4 de daño radiante adicional al acertar.',
    kind: 'buff', cond: 'divine_favor', target: 'self', rounds: 10, combat: true,
  },
  divine_smite: {
    name: 'Castigo divino', level: 1, school: 'Evocación', lists: ['paladin'], time: 'bonus', range: 'Lanzador', duration: 'Instantáneo',
    desc: 'Justo después de acertar con un arma cuerpo a cuerpo o un ataque sin armas: el objetivo sufre 2d8 de daño radiante extra (+1d8 si es infernal o muerto viviente). A niveles superiores: +1d8 por nivel.',
    kind: 'smite', damage: '2d8', upcast: '1d8', dmgType: 'radiante', combat: true,
  },
  ensnaring_strike: {
    name: 'Golpe apresador', level: 1, school: 'Conjuración', lists: ['ranger'], time: 'bonus', range: 'Lanzador', duration: 'Concentración, hasta 1 minuto', conc: true,
    desc: 'Justo después de acertar con un arma: enredaderas atrapan al objetivo, que debe superar una salvación de Fuerza o queda apresado y sufre 1d6 de daño perforante al principio de cada uno de sus turnos. A niveles superiores: +1d6 por nivel.',
    kind: 'smite', anyWeapon: true, save: 'str', cond: 'ensnared', dot: '1d6', upcast: '1d6', combat: true,
  },
  entangle: {
    name: 'Enmarañar', level: 1, school: 'Conjuración', lists: ['druid', 'ranger'], time: 'action', range: '27 m', duration: 'Concentración, hasta 1 minuto', conc: true,
    desc: 'Plantas apresadoras brotan en un cuadrado de 6 m: cada criatura debe superar una salvación de Fuerza o queda apresada. Puede liberarse con una prueba de Fuerza (Atletismo) contra tu CD. (Aquí: lo intenta al final de cada uno de sus turnos).',
    kind: 'save', save: 'str', cond: 'restrained', saveEnds: 'str', target: 'enemies', maxTargets: 3, combat: true,
  },
  expeditious_retreat: {
    name: 'Retirada expeditiva', level: 1, school: 'Transmutación', lists: ['sorcerer', 'warlock', 'wizard'], time: 'bonus', range: 'Lanzador', duration: 'Concentración, hasta 10 minutos',
    desc: 'Puedes realizar la acción de Correr como acción adicional mientras dure.', kind: 'utility',
  },
  faerie_fire: {
    name: 'Fuego feérico', level: 1, school: 'Evocación', lists: ['bard', 'druid'], time: 'action', range: '18 m', duration: 'Concentración, hasta 1 minuto', conc: true,
    desc: 'Una luz de colores perfila a las criaturas de un cubo de 6 m que fallen una salvación de Destreza: no pueden ser invisibles y los ataques contra ellas tienen ventaja.',
    kind: 'save', save: 'dex', cond: 'outlined', target: 'enemies', maxTargets: 3, combat: true,
  },
  false_life: {
    name: 'Falsa vida', level: 1, school: 'Nigromancia', lists: ['sorcerer', 'wizard'], time: 'action', range: 'Lanzador', duration: 'Instantáneo',
    desc: 'Obtienes 2d4 + 4 puntos de golpe temporales. A niveles superiores: +5 por nivel.',
    kind: 'special', target: 'self', combat: true, explore: true,
  },
  feather_fall: {
    name: 'Caída de pluma', level: 1, school: 'Transmutación', lists: ['bard', 'sorcerer', 'wizard'], time: 'reaction', range: '18 m', duration: '1 minuto',
    desc: 'Hasta cinco criaturas que caen descienden despacio y no sufren daño por la caída.', kind: 'utility',
  },
  fog_cloud: {
    name: 'Nube de oscurecimiento', level: 1, school: 'Conjuración', lists: ['druid', 'ranger', 'sorcerer', 'wizard'], time: 'action', range: '36 m', duration: 'Concentración, hasta 1 hora',
    desc: 'Creas una esfera de niebla de 6 m de radio que tapa por completo la visión.', kind: 'utility',
  },
  goodberry: {
    name: 'Buenas bayas', level: 1, school: 'Conjuración', lists: ['druid', 'ranger'], time: 'action', range: 'Lanzador', duration: '24 horas',
    desc: 'Aparecen diez bayas mágicas; comer una devuelve 1 punto de golpe y alimenta un día. (Aquí: se reparten 10 PG entre el grupo, primero a los más heridos).',
    kind: 'special', target: 'none', explore: true,
  },
  grease: {
    name: 'Grasa', level: 1, school: 'Conjuración', lists: ['sorcerer', 'wizard'], time: 'action', range: '18 m', duration: '1 minuto',
    desc: 'Una grasa resbaladiza cubre un cuadrado de 3 m: cada criatura en él debe superar una salvación de Destreza o cae derribada.',
    kind: 'save', save: 'dex', cond: 'prone', target: 'enemies', maxTargets: 2, combat: true,
  },
  guiding_bolt: {
    name: 'Saeta guía', level: 1, school: 'Evocación', lists: ['cleric'], time: 'action', range: '36 m', duration: '1 asalto',
    desc: 'Un destello de luz: ataque de conjuro a distancia; si acierta, 4d6 de daño radiante y el siguiente ataque contra el objetivo antes del final de tu siguiente turno tiene ventaja. A niveles superiores: +1d6 por nivel.',
    kind: 'attack', damage: '4d6', upcast: '1d6', dmgType: 'radiante', target: 'enemy', combat: true, cond: 'guided',
  },
  healing_word: {
    name: 'Palabra de curación', level: 1, school: 'Abjuración', lists: ['bard', 'cleric', 'druid'], time: 'bonus', range: '18 m', duration: 'Instantáneo',
    desc: 'Una criatura que veas recupera 2d4 + tu modificador de aptitud mágica puntos de golpe. A niveles superiores: +2d4 por nivel.',
    kind: 'heal', heal: '2d4', upcast: '2d4', target: 'ally', combat: true, explore: true,
  },
  hellish_rebuke: {
    name: 'Reprensión infernal', level: 1, school: 'Evocación', lists: ['warlock'], time: 'reaction', range: '18 m', duration: 'Instantáneo',
    desc: 'Reacción al recibir daño de una criatura que veas: la rodean llamas verdes y hace una salvación de Destreza; sufre 2d10 de daño de fuego, o la mitad si la supera. A niveles superiores: +1d10 por nivel. (Aquí se lanza sola cuando te dañan).',
    kind: 'reaction', damage: '2d10', upcast: '1d10', dmgType: 'fuego', save: 'dex', half: true,
  },
  heroism: {
    name: 'Heroísmo', level: 1, school: 'Encantamiento', lists: ['bard', 'paladin'], time: 'action', range: 'Toque', duration: 'Concentración, hasta 1 minuto', conc: true,
    desc: 'Una criatura voluntaria es inmune al miedo y gana puntos de golpe temporales iguales a tu modificador de aptitud mágica al principio de cada uno de sus turnos. A niveles superiores: +1 objetivo por nivel.',
    kind: 'buff', cond: 'heroism', target: 'allies', maxTargets: 1, upTargets: 1, rounds: 10, combat: true,
  },
  hex: {
    name: 'Maleficio', level: 1, school: 'Encantamiento', lists: ['warlock'], time: 'bonus', range: '27 m', duration: 'Concentración, hasta 1 hora', conc: true,
    desc: 'Maldices a una criatura: le infliges 1d6 de daño necrótico extra cada vez que la aciertas con un ataque, y tiene desventaja en las pruebas de una característica. Si cae, puedes pasar la maldición a otra criatura con una acción adicional.',
    kind: 'mark', dmg: '1d6', dmgType: 'necrótico', target: 'enemy', combat: true,
  },
  hideous_laughter: {
    name: 'Risa horrible', level: 1, school: 'Encantamiento', lists: ['bard', 'warlock', 'wizard'], time: 'action', range: '9 m', duration: 'Concentración, hasta 1 minuto', conc: true,
    desc: 'El objetivo debe superar una salvación de Sabiduría o cae derribado e incapacitado por la risa. Repite la salvación al final de cada uno de sus turnos y cuando sufre daño (con ventaja). A niveles superiores: +1 objetivo por nivel.',
    kind: 'save', save: 'wis', cond: 'laughing', saveEnds: 'wis', target: 'enemies', maxTargets: 1, upTargets: 1, combat: true,
  },
  hunters_mark: {
    name: 'Marca del cazador', level: 1, school: 'Adivinación', lists: ['ranger'], time: 'bonus', range: '27 m', duration: 'Concentración, hasta 1 hora', conc: true,
    desc: 'Marcas a una criatura como tu presa: le infliges 1d6 de daño de fuerza extra cada vez que la aciertas con un ataque. Si cae, puedes pasar la marca a otra con una acción adicional.',
    kind: 'mark', dmg: '1d6', dmgType: 'fuerza', target: 'enemy', combat: true,
  },
  ice_knife: {
    name: 'Cuchillo de hielo', level: 1, school: 'Conjuración', lists: ['druid', 'sorcerer', 'wizard'], time: 'action', range: '18 m', duration: 'Instantáneo',
    desc: 'Lanzas una esquirla de hielo: ataque de conjuro a distancia, 1d10 de daño perforante. Acierte o falle, explota: el objetivo y quienes estén a 1,5 m deben superar una salvación de Destreza o sufren 2d6 de daño de frío. A niveles superiores: +1d6 de frío por nivel.',
    kind: 'attack', damage: '1d10', dmgType: 'perforante', target: 'enemy', combat: true, burst: { save: 'dex', damage: '2d6', upcast: '1d6', dmgType: 'frío', max: 3 },
  },
  identify: {
    name: 'Identificar', level: 1, school: 'Adivinación', lists: ['bard', 'wizard'], time: 'minute', range: 'Toque', duration: 'Instantáneo', ritual: true,
    desc: 'Aprendes las propiedades de un objeto mágico que tocas y cómo usarlo.', kind: 'utility',
  },
  inflict_wounds: {
    name: 'Infligir heridas', level: 1, school: 'Nigromancia', lists: ['cleric'], time: 'action', range: 'Toque', duration: 'Instantáneo',
    desc: 'Una criatura que toques hace una salvación de Constitución: sufre 2d10 de daño necrótico, o la mitad si la supera. A niveles superiores: +1d10 por nivel.',
    kind: 'save', save: 'con', damage: '2d10', upcast: '1d10', dmgType: 'necrótico', half: true, target: 'enemy', combat: true,
  },
  longstrider: {
    name: 'Zancada prodigiosa', level: 1, school: 'Transmutación', lists: ['bard', 'druid', 'ranger', 'wizard'], time: 'action', range: 'Toque', duration: '1 hora',
    desc: 'La velocidad de una criatura aumenta en 3 m durante una hora.', kind: 'utility',
  },
  mage_armor: {
    name: 'Armadura de mago', level: 1, school: 'Abjuración', lists: ['sorcerer', 'wizard'], time: 'action', range: 'Toque', duration: '8 horas',
    desc: 'Tocas a una criatura voluntaria sin armadura: su CA base pasa a ser 13 + su modificador de Destreza.', kind: 'special', target: 'self', explore: true, combat: true,
  },
  magic_missile: {
    name: 'Proyectil mágico', level: 1, school: 'Evocación', lists: ['sorcerer', 'wizard'], time: 'action', range: '36 m', duration: 'Instantáneo',
    desc: 'Creas tres dardos de fuerza que aciertan automáticamente: cada uno inflige 1d4 + 1 de daño de fuerza. A niveles superiores: un dardo más por nivel.',
    kind: 'special', darts: 3, damage: '1d4+1', dmgType: 'fuerza', target: 'enemy', combat: true,
  },
  protection_from_evil_and_good: {
    name: 'Protección contra el bien y el mal', level: 1, school: 'Abjuración', lists: ['cleric', 'druid', 'paladin', 'warlock', 'wizard'], time: 'action', range: 'Toque', duration: 'Concentración, hasta 10 minutos', conc: true,
    desc: 'Una criatura voluntaria queda protegida contra aberraciones, celestiales, elementales, feéricos, infernales y muertos vivientes: tienen desventaja al atacarla y no pueden asustarla ni hechizarla.',
    kind: 'buff', cond: 'protected', target: 'ally', maxTargets: 1, rounds: 100, combat: true,
  },
  ray_of_sickness: {
    name: 'Rayo nauseabundo', level: 1, school: 'Nigromancia', lists: ['sorcerer', 'wizard'], time: 'action', range: '18 m', duration: 'Instantáneo',
    desc: 'Un rayo verduzco: ataque de conjuro a distancia; si acierta, 2d8 de daño de veneno y el objetivo queda envenenado hasta el final de tu siguiente turno. A niveles superiores: +1d8 por nivel.',
    kind: 'attack', damage: '2d8', upcast: '1d8', dmgType: 'veneno', target: 'enemy', combat: true, cond: 'poisoned', untilCasterEnd: true,
  },
  sanctuary: {
    name: 'Santuario', level: 1, school: 'Abjuración', lists: ['cleric'], time: 'bonus', range: '9 m', duration: '1 minuto',
    desc: 'Proteges a una criatura: quien quiera atacarla debe superar antes una salvación de Sabiduría o elige otro objetivo. Termina si la criatura protegida ataca, lanza un conjuro o hace daño.',
    kind: 'buff', cond: 'sanctuary', target: 'ally', maxTargets: 1, rounds: 10, combat: true,
  },
  searing_smite: {
    name: 'Castigo abrasador', level: 1, school: 'Evocación', lists: ['paladin'], time: 'bonus', range: 'Lanzador', duration: '1 minuto',
    desc: 'Justo después de acertar con un arma cuerpo a cuerpo: +1d6 de daño de fuego, y el objetivo arde: sufre 1d6 de fuego al principio de cada uno de sus turnos hasta que supere una salvación de Constitución. A niveles superiores: +1d6 por nivel.',
    kind: 'smite', damage: '1d6', upcast: '1d6', dmgType: 'fuego', cond: 'burning', dot: '1d6', combat: true,
  },
  shield: {
    name: 'Escudo', level: 1, school: 'Abjuración', lists: ['sorcerer', 'wizard'], time: 'reaction', range: 'Lanzador', duration: '1 asalto',
    desc: 'Reacción cuando te aciertan con un ataque: +5 a la CA hasta el principio de tu siguiente turno, también contra ese ataque. (Aquí se lanza sola si así evitas el golpe).',
    kind: 'reaction',
  },
  shield_of_faith: {
    name: 'Escudo de fe', level: 1, school: 'Abjuración', lists: ['cleric', 'paladin'], time: 'bonus', range: '18 m', duration: 'Concentración, hasta 10 minutos', conc: true,
    desc: 'Un campo resplandeciente rodea a una criatura y le da +2 a la CA mientras dure.',
    kind: 'buff', cond: 'shielded', target: 'ally', maxTargets: 1, rounds: 100, combat: true,
  },
  sleep: {
    name: 'Dormir', level: 1, school: 'Encantamiento', lists: ['bard', 'sorcerer', 'wizard'], time: 'action', range: '18 m', duration: 'Concentración, hasta 1 minuto', conc: true,
    desc: 'Las criaturas que elijas en una esfera de 1,5 m deben superar una salvación de Sabiduría o quedan incapacitadas hasta el final de su siguiente turno; entonces repiten la salvación y, si fallan, se duermen hasta que termine el conjuro o reciban daño. No afecta a quien no duerme (elfos, muertos vivientes…).',
    kind: 'save', save: 'wis', cond: 'drowsy', target: 'enemies', maxTargets: 3, combat: true,
  },
  speak_with_animals: {
    name: 'Hablar con los animales', level: 1, school: 'Adivinación', lists: ['bard', 'druid', 'ranger', 'warlock'], time: 'action', range: 'Lanzador', duration: '10 minutos', ritual: true,
    desc: 'Puedes comprender a las bestias y comunicarte verbalmente con ellas.', kind: 'utility',
  },
  thunderwave: {
    name: 'Ola atronadora', level: 1, school: 'Evocación', lists: ['bard', 'druid', 'sorcerer', 'wizard'], time: 'action', range: 'Cubo de 4,5 m', duration: 'Instantáneo',
    desc: 'Una ola de fuerza atronadora: cada criatura en un cubo de 4,5 m hace una salvación de Constitución; sufre 2d8 de daño de trueno y es empujada 3 m, o la mitad del daño si la supera. A niveles superiores: +1d8 por nivel.',
    kind: 'save', save: 'con', damage: '2d8', upcast: '1d8', dmgType: 'trueno', half: true, target: 'enemies', maxTargets: 3, combat: true,
  },

  // =========================================================== Nivel 2
  acid_arrow: {
    name: 'Flecha ácida', level: 2, school: 'Evocación', lists: ['wizard'], time: 'action', range: '27 m', duration: 'Instantáneo',
    desc: 'Una flecha verde estalla en ácido: ataque de conjuro a distancia; si acierta, 4d4 de daño de ácido y otros 2d4 al final de su siguiente turno. Si falla, la mitad del daño inicial. A niveles superiores: +1d4 a ambos por nivel.',
    kind: 'attack', damage: '4d4', upcast: '1d4', dmgType: 'ácido', target: 'enemy', combat: true, missHalf: true, cond: 'acid', dot: '2d4',
  },
  aid: {
    name: 'Auxilio', level: 2, school: 'Abjuración', lists: ['bard', 'cleric', 'druid', 'paladin', 'ranger'], time: 'action', range: '9 m', duration: '8 horas',
    desc: 'Hasta tres criaturas aumentan en 5 sus puntos de golpe máximos y actuales mientras dure. A niveles superiores: +5 por nivel.',
    kind: 'special', target: 'allies', maxTargets: 3, combat: true, explore: true,
  },
  alter_self: {
    name: 'Alterar el propio aspecto', level: 2, school: 'Transmutación', lists: ['sorcerer', 'wizard'], time: 'action', range: 'Lanzador', duration: 'Concentración, hasta 1 hora',
    desc: 'Cambias tu forma: adaptarte al agua, cambiar de aspecto o hacer que te crezcan garras naturales.', kind: 'utility',
  },
  barkskin: {
    name: 'Piel robliza', level: 2, school: 'Transmutación', lists: ['druid', 'ranger'], time: 'bonus', range: 'Toque', duration: '1 hora',
    desc: 'La piel de una criatura voluntaria se vuelve como la corteza: su CA no puede ser inferior a 17.',
    kind: 'buff', cond: 'barkskin', target: 'ally', maxTargets: 1, rounds: 600, combat: true, explore: true,
  },
  blur: {
    name: 'Contorno borroso', level: 2, school: 'Ilusionismo', lists: ['sorcerer', 'wizard'], time: 'action', range: 'Lanzador', duration: 'Concentración, hasta 1 minuto', conc: true,
    desc: 'Tu cuerpo se vuelve borroso: las tiradas de ataque contra ti tienen desventaja.',
    kind: 'buff', cond: 'blurred', target: 'self', rounds: 10, combat: true,
  },
  darkvision: {
    name: 'Visión en la oscuridad', level: 2, school: 'Transmutación', lists: ['druid', 'ranger', 'sorcerer', 'wizard'], time: 'action', range: 'Toque', duration: '8 horas',
    desc: 'Una criatura voluntaria obtiene visión en la oscuridad de 45 m.', kind: 'utility',
  },
  dragons_breath: {
    name: 'Aliento de dragón', level: 2, school: 'Transmutación', lists: ['sorcerer', 'wizard'], time: 'bonus', range: 'Toque', duration: 'Concentración, hasta 1 minuto', conc: true,
    desc: 'Una criatura voluntaria puede usar su acción para exhalar un cono de 4,5 m de ácido, frío, fuego, relámpago o veneno: 3d6 de daño, salvación de Destreza para la mitad. A niveles superiores: +1d6 por nivel.',
    kind: 'buff', cond: 'dragon_breath', target: 'ally', maxTargets: 1, rounds: 10, combat: true,
  },
  enhance_ability: {
    name: 'Potenciar característica', level: 2, school: 'Transmutación', lists: ['bard', 'cleric', 'druid', 'ranger', 'sorcerer', 'wizard'], time: 'action', range: 'Toque', duration: 'Concentración, hasta 1 hora',
    desc: 'Una criatura tiene ventaja en las pruebas de una característica que elijas. (Aquí: ventaja en sus pruebas mientras el grupo siga en esta escena).',
    kind: 'special', target: 'ally', explore: true,
  },
  flaming_sphere: {
    name: 'Esfera de llamas', level: 2, school: 'Conjuración', lists: ['druid', 'sorcerer', 'wizard'], time: 'action', range: '18 m', duration: 'Concentración, hasta 1 minuto', conc: true,
    desc: 'Creas una esfera de fuego. Quien termine su turno junto a ella o sea arrollado por ella hace una salvación de Destreza: 2d6 de fuego, o la mitad. Como acción adicional puedes hacerla rodar contra otra criatura. A niveles superiores: +1d6 por nivel.',
    kind: 'save', save: 'dex', damage: '2d6', upcast: '1d6', dmgType: 'fuego', half: true, target: 'enemy', combat: true, repeat: 'bonus',
  },
  hold_person: {
    name: 'Inmovilizar persona', level: 2, school: 'Encantamiento', lists: ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard'], time: 'action', range: '18 m', duration: 'Concentración, hasta 1 minuto', conc: true,
    desc: 'Un humanoide debe superar una salvación de Sabiduría o queda paralizado. Repite la salvación al final de cada uno de sus turnos. A niveles superiores: +1 objetivo por nivel.',
    kind: 'save', save: 'wis', cond: 'paralyzed', saveEnds: 'wis', onlyType: 'humanoide', target: 'enemies', maxTargets: 1, upTargets: 1, combat: true,
  },
  invisibility: {
    name: 'Invisibilidad', level: 2, school: 'Ilusionismo', lists: ['bard', 'sorcerer', 'warlock', 'wizard'], time: 'action', range: 'Toque', duration: 'Concentración, hasta 1 hora', conc: true,
    desc: 'Una criatura que toques se vuelve invisible: los ataques contra ella tienen desventaja y los suyos ventaja. Termina cuando ataca, hace daño o lanza un conjuro. A niveles superiores: +1 objetivo por nivel.',
    kind: 'buff', cond: 'invisible', target: 'allies', maxTargets: 1, upTargets: 1, rounds: 600, combat: true,
  },
  knock: {
    name: 'Abrir', level: 2, school: 'Transmutación', lists: ['bard', 'sorcerer', 'wizard'], time: 'action', range: '18 m', duration: 'Instantáneo',
    desc: 'Un objeto cerrado, atascado o con cerradura se abre con un fuerte golpe.', kind: 'utility',
  },
  lesser_restoration: {
    name: 'Restablecimiento menor', level: 2, school: 'Abjuración', lists: ['bard', 'cleric', 'druid', 'paladin', 'ranger'], time: 'bonus', range: 'Toque', duration: 'Instantáneo',
    desc: 'Tocas a una criatura y pones fin a uno de estos estados: cegado, ensordecido, paralizado o envenenado.', kind: 'special', target: 'ally', combat: true, explore: true,
  },
  magic_weapon: {
    name: 'Arma mágica', level: 2, school: 'Transmutación', lists: ['paladin', 'ranger', 'sorcerer', 'wizard'], time: 'bonus', range: 'Toque', duration: '1 hora',
    desc: 'Tu arma se vuelve mágica con +1 a las tiradas de ataque y de daño.', kind: 'buff', cond: 'magic_weapon', target: 'self', rounds: 600, combat: true, explore: true,
  },
  mind_spike: {
    name: 'Clavo mental', level: 2, school: 'Adivinación', lists: ['sorcerer', 'warlock', 'wizard'], time: 'action', range: '36 m', duration: 'Concentración, hasta 1 hora',
    desc: 'Una púa psíquica: salvación de Sabiduría; 3d8 de daño psíquico, o la mitad si la supera. Si falla, sabes dónde está y no puede esconderse de ti. A niveles superiores: +1d8 por nivel.',
    kind: 'save', save: 'wis', damage: '3d8', upcast: '1d8', dmgType: 'psíquico', half: true, target: 'enemy', combat: true,
  },
  mirror_image: {
    name: 'Imagen múltiple', level: 2, school: 'Ilusionismo', lists: ['bard', 'sorcerer', 'warlock', 'wizard'], time: 'action', range: 'Lanzador', duration: '1 minuto',
    desc: 'Aparecen tres duplicados ilusorios. Cada vez que te acierten, tira 1d6 por duplicado: si alguno saca 3 o más, un duplicado recibe el golpe en tu lugar y desaparece.',
    kind: 'special', target: 'self', combat: true,
  },
  misty_step: {
    name: 'Paso brumoso', level: 2, school: 'Conjuración', lists: ['sorcerer', 'warlock', 'wizard'], time: 'bonus', range: 'Lanzador', duration: 'Instantáneo',
    desc: 'Te teletransportas hasta 9 m a un espacio que veas. (Aquí: te libras de agarres, redes y enredaderas).', kind: 'special', target: 'self', combat: true,
  },
  moonbeam: {
    name: 'Rayo de luna', level: 2, school: 'Evocación', lists: ['druid'], time: 'action', range: '36 m', duration: 'Concentración, hasta 1 minuto', conc: true,
    desc: 'Un cilindro de luz plateada: quien esté dentro hace una salvación de Constitución y sufre 2d10 de daño radiante, o la mitad. En turnos posteriores puedes mover el rayo con una acción. A niveles superiores: +1d10 por nivel.',
    kind: 'save', save: 'con', damage: '2d10', upcast: '1d10', dmgType: 'radiante', half: true, target: 'enemy', combat: true, repeat: 'action',
  },
  pass_without_trace: {
    name: 'Pasar sin rastro', level: 2, school: 'Abjuración', lists: ['druid', 'ranger'], time: 'action', range: 'Lanzador', duration: 'Concentración, hasta 1 hora',
    desc: 'Un velo de sombras y silencio: tú y tus aliados tenéis +10 a las pruebas de Destreza (Sigilo). (Aquí: mientras el grupo siga en esta escena).', kind: 'special', target: 'none', explore: true,
  },
  prayer_of_healing: {
    name: 'Plegaria de curación', level: 2, school: 'Abjuración', lists: ['cleric', 'paladin'], time: 'minute', range: '9 m', duration: 'Instantáneo',
    desc: 'Tras 10 minutos de oración, hasta cinco criaturas recuperan 2d8 puntos de golpe. A niveles superiores: +1d8 por nivel.', kind: 'special', target: 'none', explore: true,
  },
  scorching_ray: {
    name: 'Rayo abrasador', level: 2, school: 'Evocación', lists: ['sorcerer', 'wizard'], time: 'action', range: '36 m', duration: 'Instantáneo',
    desc: 'Lanzas tres rayos de fuego: un ataque de conjuro a distancia por rayo, 2d6 de daño de fuego cada uno. A niveles superiores: un rayo más por nivel.',
    kind: 'special', rays: 3, damage: '2d6', dmgType: 'fuego', target: 'enemy', combat: true,
  },
  see_invisibility: {
    name: 'Ver invisibilidad', level: 2, school: 'Adivinación', lists: ['bard', 'sorcerer', 'wizard'], time: 'action', range: 'Lanzador', duration: '1 hora',
    desc: 'Ves a las criaturas y objetos invisibles, y lo que hay en el plano Etéreo.', kind: 'utility',
  },
  shatter: {
    name: 'Hacer añicos', level: 2, school: 'Evocación', lists: ['bard', 'sorcerer', 'wizard'], time: 'action', range: '18 m', duration: 'Instantáneo',
    desc: 'Un estallido de sonido en una esfera de 3 m: salvación de Constitución; 3d8 de daño de trueno, o la mitad. A niveles superiores: +1d8 por nivel.',
    kind: 'save', save: 'con', damage: '3d8', upcast: '1d8', dmgType: 'trueno', half: true, target: 'enemies', maxTargets: 3, combat: true,
  },
  shining_smite: {
    name: 'Castigo brillante', level: 2, school: 'Transmutación', lists: ['paladin'], time: 'bonus', range: 'Lanzador', duration: 'Concentración, hasta 1 minuto', conc: true,
    desc: 'Justo después de acertar con un arma cuerpo a cuerpo: +2d6 de daño radiante, y el objetivo brilla: los ataques contra él tienen ventaja mientras dure. A niveles superiores: +1d6 por nivel.',
    kind: 'smite', damage: '2d6', upcast: '1d6', dmgType: 'radiante', cond: 'outlined', combat: true,
  },
  spiritual_weapon: {
    name: 'Arma espiritual', level: 2, school: 'Evocación', lists: ['cleric'], time: 'bonus', range: '18 m', duration: 'Concentración, hasta 1 minuto', conc: true,
    desc: 'Creas un arma espectral y haces con ella un ataque de conjuro cuerpo a cuerpo: 1d8 + tu modificador de aptitud mágica de daño de fuerza. En tus siguientes turnos puedes volver a atacar con ella como acción adicional. A niveles superiores: +1d8 por nivel.',
    kind: 'attack', damage: '1d8', upcast: '1d8', addMod: true, dmgType: 'fuerza', melee: true, target: 'enemy', combat: true, repeat: 'bonus',
  },
  suggestion: {
    name: 'Sugestión', level: 2, school: 'Encantamiento', lists: ['bard', 'sorcerer', 'warlock', 'wizard'], time: 'action', range: '9 m', duration: 'Concentración, hasta 8 horas', conc: true,
    desc: 'Sugieres un curso de acción a una criatura que te entienda; debe superar una salvación de Sabiduría o queda hechizada y lo cumple, hasta que tú o tus aliados le hagáis daño. (Aquí: "deja de luchar": no actúa hasta recibir daño).',
    kind: 'save', save: 'wis', cond: 'charmed', target: 'enemy', combat: true, breakOnDamage: true,
  },
  web: {
    name: 'Telaraña', level: 2, school: 'Conjuración', lists: ['sorcerer', 'wizard'], time: 'action', range: '18 m', duration: 'Concentración, hasta 1 hora', conc: true,
    desc: 'Una masa de telarañas pegajosas llena un cubo de 6 m: quien esté dentro debe superar una salvación de Destreza o queda apresado. Puede liberarse con una prueba de Fuerza (Atletismo). (Aquí: lo intenta al final de cada uno de sus turnos).',
    kind: 'save', save: 'dex', cond: 'restrained', saveEnds: 'str', target: 'enemies', maxTargets: 3, combat: true,
  },
};

for (const s of Object.values(S)) s.classes = s.lists.map((l) => LIST_NAMES[l]);
module.exports = S;
Object.defineProperty(module.exports, 'LIST_NAMES', { value: LIST_NAMES });
