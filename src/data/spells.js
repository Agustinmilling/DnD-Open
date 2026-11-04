// Conjuros del SRD 5.1 usados por los personajes pre-hechos.
// Campos de motor: kind = attack | save | auto | heal | buff | special | utility
// time: action | bonus | reaction ; conc = concentración ; combat/explore = dónde se puede usar desde la interfaz
module.exports = {
  // ---------- Trucos (nivel 0) ----------
  fire_bolt: {
    name: 'Descarga de fuego', level: 0, school: 'Evocación', classes: ['Mago'], time: 'action', range: '120 pies', components: 'V, S', duration: 'Instantánea',
    desc: 'Lanzas una mota de fuego contra una criatura u objeto. Haz un ataque de conjuro a distancia; si impacta, el objetivo sufre 1d10 de daño de fuego. Un objeto inflamable que no se lleve puesto se incendia. El daño aumenta en 1d10 a los niveles 5, 11 y 17.',
    kind: 'attack', damage: '1d10', dmgType: 'fuego', target: 'enemy', combat: true,
  },
  ray_of_frost: {
    name: 'Rayo de escarcha', level: 0, school: 'Evocación', classes: ['Mago'], time: 'action', range: '60 pies', components: 'V, S', duration: 'Instantánea',
    desc: 'Un haz de luz azul y gélida sale disparado hacia una criatura. Haz un ataque de conjuro a distancia; si impacta, sufre 1d8 de daño de frío y su velocidad se reduce en 10 pies hasta el inicio de tu siguiente turno.',
    kind: 'attack', damage: '1d8', dmgType: 'frío', target: 'enemy', combat: true, applies: 'slowed_frost',
  },
  sacred_flame: {
    name: 'Llama sagrada', level: 0, school: 'Evocación', classes: ['Clérigo'], time: 'action', range: '60 pies', components: 'V, S', duration: 'Instantánea',
    desc: 'Un resplandor similar a una llama desciende sobre una criatura que puedas ver. Debe superar una salvación de Destreza o sufrir 1d8 de daño radiante. No obtiene beneficio de la cobertura para esta salvación.',
    kind: 'save', save: 'dex', damage: '1d8', dmgType: 'radiante', half: false, target: 'enemy', combat: true,
  },
  spare_the_dying: {
    name: 'Piedad con los moribundos', level: 0, school: 'Nigromancia', classes: ['Clérigo'], time: 'action', range: 'Toque', components: 'V, S', duration: 'Instantánea',
    desc: 'Tocas a una criatura viva que tenga 0 puntos de golpe. La criatura pasa a estar estable. No tiene efecto en muertos vivientes ni constructos.',
    kind: 'special', target: 'dying', combat: true, explore: true,
  },
  guidance: {
    name: 'Orientación', level: 0, school: 'Adivinación', classes: ['Clérigo'], time: 'action', range: 'Toque', components: 'V, S', duration: 'Concentración, hasta 1 minuto',
    desc: 'Tocas a una criatura voluntaria. Una vez antes de que termine el conjuro, puede tirar un d4 y sumar el resultado a una prueba de característica de su elección.',
    kind: 'special', target: 'ally', explore: true,
  },
  light: {
    name: 'Luz', level: 0, school: 'Evocación', classes: ['Clérigo', 'Mago'], time: 'action', range: 'Toque', components: 'V, M', duration: '1 hora',
    desc: 'Tocas un objeto de no más de 10 pies en cualquier dimensión. Emite luz brillante en un radio de 20 pies y luz tenue 20 pies más allá.',
    kind: 'utility',
  },
  mage_hand: {
    name: 'Mano de mago', level: 0, school: 'Conjuración', classes: ['Mago'], time: 'action', range: '30 pies', components: 'V, S', duration: '1 minuto',
    desc: 'Aparece una mano espectral flotante que puedes usar para manipular objetos, abrir puertas o recipientes, o verter el contenido de un vial. No puede atacar, activar objetos mágicos ni cargar más de 10 libras.',
    kind: 'utility',
  },
  thaumaturgy: {
    name: 'Taumaturgia', level: 0, school: 'Transmutación', classes: ['Clérigo'], time: 'action', range: '30 pies', components: 'V', duration: 'Hasta 1 minuto',
    desc: 'Manifiestas una pequeña maravilla: tu voz retumba con el triple de fuerza, las llamas parpadean, la tierra tiembla levemente o las puertas se abren de golpe.',
    kind: 'utility', explore: true, target: 'self',
  },
  shocking_grasp: {
    name: 'Agarre electrizante', level: 0, school: 'Evocación', classes: ['Mago'], time: 'action', range: 'Toque', components: 'V, S', duration: 'Instantánea',
    desc: 'Un relámpago salta de tu mano. Haz un ataque de conjuro cuerpo a cuerpo (con ventaja si el objetivo lleva armadura metálica): si impacta, sufre 1d8 de daño de relámpago y no puede usar reacciones hasta el inicio de su siguiente turno.',
    kind: 'attack', damage: '1d8', dmgType: 'relámpago', target: 'enemy', combat: true, melee: true,
  },
  chill_touch: {
    name: 'Toque helado', level: 0, school: 'Nigromancia', classes: ['Mago'], time: 'action', range: '120 pies', components: 'V, S', duration: '1 asalto',
    desc: 'Una mano espectral y esquelética aferra a una criatura. Haz un ataque de conjuro a distancia: si impacta, sufre 1d8 de daño necrótico y no puede recuperar puntos de golpe hasta el inicio de tu siguiente turno.',
    kind: 'attack', damage: '1d8', dmgType: 'necrótico', target: 'enemy', combat: true,
  },
  // ---------- Nivel 1 ----------
  magic_missile: {
    name: 'Proyectil mágico', level: 1, school: 'Evocación', classes: ['Mago'], time: 'action', range: '120 pies', components: 'V, S', duration: 'Instantánea',
    desc: 'Creas tres dardos brillantes de fuerza mágica. Cada dardo impacta automáticamente a una criatura que elijas e inflige 1d4 + 1 de daño de fuerza. A niveles superiores: un dardo más por cada nivel de espacio por encima del 1.º.',
    kind: 'auto', darts: 3, damage: '1d4+1', dmgType: 'fuerza', target: 'enemy', combat: true,
  },
  burning_hands: {
    name: 'Manos ardientes', level: 1, school: 'Evocación', classes: ['Mago'], time: 'action', range: 'Personal (cono de 15 pies)', components: 'V, S', duration: 'Instantánea',
    desc: 'Una lámina de llamas brota de tus dedos. Cada criatura en un cono de 15 pies hace una salvación de Destreza: sufre 3d6 de daño de fuego si falla, o la mitad si la supera. A niveles superiores: +1d6 por nivel de espacio por encima del 1.º.',
    kind: 'save', save: 'dex', damage: '3d6', upcast: '1d6', dmgType: 'fuego', half: true, target: 'enemies3', combat: true,
  },
  sleep: {
    name: 'Dormir', level: 1, school: 'Encantamiento', classes: ['Mago'], time: 'action', range: '90 pies', components: 'V, S, M', duration: '1 minuto',
    desc: 'Tira 5d8: es la cantidad total de puntos de golpe de criaturas que el conjuro puede afectar, empezando por la que menos PG actuales tenga. Las afectadas quedan inconscientes hasta que termine el conjuro, reciban daño o alguien las despierte. Los muertos vivientes y las criaturas inmunes a ser hechizadas no se ven afectados. A niveles superiores: +2d8 por nivel.',
    kind: 'special', target: 'none', combat: true,
  },
  shield: {
    name: 'Escudo', level: 1, school: 'Abjuración', classes: ['Mago'], time: 'reaction', range: 'Personal', components: 'V, S', duration: '1 asalto',
    desc: 'Reacción que haces cuando te impacta un ataque o eres objetivo de Proyectil mágico. Una barrera invisible te protege: hasta el inicio de tu siguiente turno tienes +5 a la CA, incluido contra el ataque que la provocó. (En esta plataforma se lanza automáticamente si con ello evitas el impacto).',
    kind: 'reaction',
  },
  mage_armor: {
    name: 'Armadura de mago', level: 1, school: 'Abjuración', classes: ['Mago'], time: 'action', range: 'Toque', components: 'V, S, M', duration: '8 horas',
    desc: 'Tocas a una criatura voluntaria que no lleve armadura. Hasta que termine el conjuro, su CA base pasa a ser 13 + su modificador de Destreza.',
    kind: 'special', target: 'self', explore: true,
  },
  detect_magic: {
    name: 'Detectar magia', level: 1, school: 'Adivinación', classes: ['Clérigo', 'Mago'], time: 'action', range: 'Personal', components: 'V, S', duration: 'Concentración, hasta 10 minutos', ritual: true,
    desc: 'Mientras dure, percibes la presencia de magia a 30 pies de ti y puedes ver un aura tenue alrededor de cualquier criatura u objeto mágico visible, además de su escuela de magia, si la tiene.',
    kind: 'utility',
  },
  thunderwave: {
    name: 'Onda atronadora', level: 1, school: 'Evocación', classes: ['Mago'], time: 'action', range: 'Personal (cubo de 15 pies)', components: 'V, S', duration: 'Instantánea',
    desc: 'Una ola de fuerza atronadora sale de ti. Cada criatura en un cubo de 15 pies hace una salvación de Constitución: sufre 2d8 de daño de trueno y es empujada 10 pies si falla, o la mitad del daño si la supera. A niveles superiores: +1d8 por nivel.',
    kind: 'save', save: 'con', damage: '2d8', upcast: '1d8', dmgType: 'trueno', half: true, target: 'enemies3', combat: true,
  },
  inflict_wounds: {
    name: 'Infligir heridas', level: 1, school: 'Nigromancia', classes: ['Clérigo'], time: 'action', range: 'Toque', components: 'V, S', duration: 'Instantánea',
    desc: 'Haz un ataque de conjuro cuerpo a cuerpo contra una criatura a tu alcance. Si impacta, sufre 3d10 de daño necrótico. A niveles superiores: +1d10 por nivel.',
    kind: 'attack', damage: '3d10', upcast: '1d10', dmgType: 'necrótico', target: 'enemy', combat: true, melee: true,
  },
  cure_wounds: {
    name: 'Curar heridas', level: 1, school: 'Evocación', classes: ['Clérigo'], time: 'action', range: 'Toque', components: 'V, S', duration: 'Instantánea',
    desc: 'Una criatura que toques recupera 1d8 + tu modificador de aptitud mágica en puntos de golpe. No afecta a muertos vivientes ni constructos. A niveles superiores: +1d8 por nivel de espacio por encima del 1.º.',
    kind: 'heal', heal: '1d8', upcast: '1d8', target: 'ally', combat: true, explore: true,
  },
  healing_word: {
    name: 'Palabra de curación', level: 1, school: 'Evocación', classes: ['Clérigo'], time: 'bonus', range: '60 pies', components: 'V', duration: 'Instantánea',
    desc: 'Una criatura que puedas ver recupera 1d4 + tu modificador de aptitud mágica en puntos de golpe. A niveles superiores: +1d4 por nivel de espacio por encima del 1.º.',
    kind: 'heal', heal: '1d4', upcast: '1d4', target: 'ally', combat: true, explore: true,
  },
  bless: {
    name: 'Bendición', level: 1, school: 'Encantamiento', classes: ['Clérigo'], time: 'action', range: '30 pies', components: 'V, S, M', duration: 'Concentración, hasta 1 minuto', conc: true,
    desc: 'Bendices hasta a tres criaturas. Cada vez que un objetivo haga una tirada de ataque o de salvación antes de que termine el conjuro, puede tirar un d4 y sumarlo. A niveles superiores: una criatura más por nivel.',
    kind: 'buff', applies: 'blessed', maxTargets: 3, rounds: 10, target: 'allies', combat: true,
  },
  guiding_bolt: {
    name: 'Saeta guía', level: 1, school: 'Evocación', classes: ['Clérigo'], time: 'action', range: '120 pies', components: 'V, S', duration: '1 asalto',
    desc: 'Un destello de luz sale disparado hacia una criatura. Haz un ataque de conjuro a distancia; si impacta, sufre 4d6 de daño radiante y la siguiente tirada de ataque contra ella antes de tu próximo turno tiene ventaja. A niveles superiores: +1d6 por nivel.',
    kind: 'attack', damage: '4d6', upcast: '1d6', dmgType: 'radiante', target: 'enemy', combat: true, applies: 'guided',
  },
  shield_of_faith: {
    name: 'Escudo de fe', level: 1, school: 'Abjuración', classes: ['Clérigo'], time: 'bonus', range: '60 pies', components: 'V, S, M', duration: 'Concentración, hasta 10 minutos', conc: true,
    desc: 'Un campo resplandeciente rodea a una criatura que elijas y le otorga +2 a la CA mientras dure el conjuro.',
    kind: 'buff', applies: 'shielded', maxTargets: 1, rounds: 100, target: 'ally', combat: true,
  },
  // ---------- Nivel 2 ----------
  scorching_ray: {
    name: 'Rayo abrasador', level: 2, school: 'Evocación', classes: ['Mago'], time: 'action', range: '120 pies', components: 'V, S', duration: 'Instantánea',
    desc: 'Creas tres rayos de fuego y los lanzas contra objetivos a tu alcance. Haz un ataque de conjuro a distancia por cada rayo; si impacta, inflige 2d6 de daño de fuego. A niveles superiores: un rayo más por nivel por encima del 2.º.',
    kind: 'attack', rays: 3, damage: '2d6', dmgType: 'fuego', target: 'enemy', combat: true,
  },
  misty_step: {
    name: 'Paso brumoso', level: 2, school: 'Conjuración', classes: ['Mago'], time: 'bonus', range: 'Personal', components: 'V', duration: 'Instantánea',
    desc: 'Rodeado brevemente de una niebla plateada, te teletransportas hasta 30 pies a un espacio desocupado que puedas ver.',
    kind: 'utility',
  },
  hold_person: {
    name: 'Inmovilizar persona', level: 2, school: 'Encantamiento', classes: ['Clérigo', 'Mago'], time: 'action', range: '60 pies', components: 'V, S, M', duration: 'Concentración, hasta 1 minuto', conc: true,
    desc: 'Elige un humanoide que puedas ver. Debe superar una salvación de Sabiduría o quedar paralizado mientras dure el conjuro. Al final de cada uno de sus turnos repite la salvación y, si la supera, el conjuro termina.',
    kind: 'save', save: 'wis', applies: 'paralyzed', onlyType: 'humanoide', target: 'enemy', combat: true, rounds: 10, saveEnds: true,
  },
  shatter: {
    name: 'Romper', level: 2, school: 'Evocación', classes: ['Mago'], time: 'action', range: '60 pies', components: 'V, S, M', duration: 'Instantánea',
    desc: 'Un estallido de sonido doloroso brota en un punto. Cada criatura en una esfera de 10 pies hace una salvación de Constitución: sufre 3d8 de daño de trueno si falla, o la mitad si la supera. A niveles superiores: +1d8 por nivel.',
    kind: 'save', save: 'con', damage: '3d8', upcast: '1d8', dmgType: 'trueno', half: true, target: 'enemies3', combat: true,
  },
  aid: {
    name: 'Ayuda', level: 2, school: 'Abjuración', classes: ['Clérigo'], time: 'action', range: '30 pies', components: 'V, S, M', duration: '8 horas',
    desc: 'Tu conjuro refuerza a tus aliados. Hasta tres criaturas ven aumentados en 5 sus puntos de golpe máximos y actuales mientras dure. (Aquí: 5 puntos de golpe temporales a hasta tres aliados).',
    kind: 'special', target: 'allies', maxTargets: 3, combat: true, explore: true,
  },
  spiritual_weapon: {
    name: 'Arma espiritual', level: 2, school: 'Evocación', classes: ['Clérigo'], time: 'bonus', range: '60 pies', components: 'V, S', duration: '1 minuto',
    desc: 'Creas un arma espectral flotante. Al lanzarlo puedes hacer un ataque de conjuro cuerpo a cuerpo que inflige 1d8 + tu modificador de aptitud mágica de daño de fuerza. Como acción adicional en tus turnos siguientes puedes volver a atacar con ella.',
    kind: 'attack', damage: '1d8', addMod: true, dmgType: 'fuerza', target: 'enemy', combat: true, persistent: 'spiritual_weapon',
  },
  lesser_restoration: {
    name: 'Restablecimiento menor', level: 2, school: 'Abjuración', classes: ['Clérigo'], time: 'action', range: 'Toque', components: 'V, S', duration: 'Instantánea',
    desc: 'Tocas a una criatura y pones fin a una enfermedad o a una de estas condiciones: cegado, ensordecido, paralizado o envenenado.',
    kind: 'special', target: 'ally', combat: true, explore: true,
  },
};
