// Monstruos del SRD 5.1 (estadísticas oficiales, textos traducidos y resumidos).
module.exports = {
  goblin: {
    name: 'Goblin', type: 'humanoide', size: 'Pequeño', cr: '1/4', ac: 15, hp: '2d6', avgHp: 7, speed: '30 pies',
    abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 }, saves: {}, pp: 9, stealth: 6,
    attacks: [
      { name: 'Cimitarra', bonus: 4, dmg: '1d6+2', type: 'cortante' },
      { name: 'Arco corto', bonus: 4, dmg: '1d6+2', type: 'perforante', ranged: true },
    ],
    traits: ['Huida ágil: puede Destrabarse o Esconderse como acción adicional en cada uno de sus turnos.'],
    desc: 'Humanoides pequeños, crueles y oportunistas que viven en cuevas y ruinas. Atacan en grupo y huyen cuando la cosa se pone fea.',
  },
  wolf: {
    name: 'Lobo', type: 'bestia', size: 'Mediano', cr: '1/4', ac: 13, hp: '2d8+2', avgHp: 11, speed: '40 pies',
    abilities: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 }, saves: {}, pp: 13,
    attacks: [{ name: 'Mordisco', bonus: 4, dmg: '2d4+2', type: 'perforante', knockdown: { save: 'str', dc: 11 } }],
    packTactics: true,
    traits: ['Tácticas de manada: ventaja en ataques si un aliado del lobo está a 5 pies del objetivo.', 'Mordisco: si impacta, el objetivo debe superar una salvación de Fuerza CD 11 o quedar derribado.'],
    desc: 'Depredadores que cazan en manada. Los goblins los usan como monturas y perros de guerra.',
  },
  skeleton: {
    name: 'Esqueleto', type: 'muerto viviente', size: 'Mediano', cr: '1/4', ac: 13, hp: '2d8+4', avgHp: 13, speed: '30 pies',
    abilities: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 }, saves: {}, pp: 9,
    vulnerable: ['contundente'], immune: ['veneno'], undead: true, noSleep: true,
    attacks: [
      { name: 'Espada corta', bonus: 4, dmg: '1d6+2', type: 'perforante' },
      { name: 'Arco corto', bonus: 4, dmg: '1d6+2', type: 'perforante', ranged: true },
    ],
    traits: ['Vulnerable al daño contundente.', 'Inmune al veneno y a quedar agotado o envenenado.'],
    desc: 'Huesos animados por magia nigromántica que obedecen las últimas órdenes de su creador.',
  },
  zombie: {
    name: 'Zombi', type: 'muerto viviente', size: 'Mediano', cr: '1/4', ac: 8, hp: '3d8+9', avgHp: 22, speed: '20 pies',
    abilities: { str: 13, dex: 6, con: 16, int: 3, wis: 6, cha: 5 }, saves: { wis: 0 }, pp: 8,
    immune: ['veneno'], undead: true, noSleep: true, undeadFortitude: true,
    attacks: [{ name: 'Golpe', bonus: 3, dmg: '1d6+1', type: 'contundente' }],
    traits: ['Fortaleza de muerto viviente: si el daño lo deja a 0 PG, hace una salvación de Constitución CD 5 + el daño recibido; si la supera, queda a 1 PG. No funciona con daño radiante ni con críticos.'],
    desc: 'Cadáveres que se arrastran movidos por una voluntad ajena, incansables y lentos.',
  },
  giant_rat: {
    name: 'Rata gigante', type: 'bestia', size: 'Pequeño', cr: '1/8', ac: 12, hp: '2d6', avgHp: 7, speed: '30 pies',
    abilities: { str: 7, dex: 15, con: 11, int: 2, wis: 10, cha: 4 }, saves: {}, pp: 10,
    attacks: [{ name: 'Mordisco', bonus: 4, dmg: '1d4+2', type: 'perforante' }], packTactics: true,
    traits: ['Tácticas de manada.', 'Olfato agudo: ventaja en pruebas de Percepción basadas en el olfato.'],
    desc: 'Alimañas del tamaño de un perro que infestan alcantarillas y criptas.',
  },
  ghoul: {
    name: 'Necrófago', type: 'muerto viviente', size: 'Mediano', cr: '1', ac: 12, hp: '5d8', avgHp: 22, speed: '30 pies',
    abilities: { str: 13, dex: 15, con: 10, int: 7, wis: 10, cha: 6 }, saves: {}, pp: 10,
    immune: ['veneno'], undead: true, noSleep: true,
    attacks: [
      { name: 'Garras', bonus: 4, dmg: '2d4+2', type: 'cortante', paralyze: { save: 'con', dc: 10 } },
      { name: 'Mordisco', bonus: 2, dmg: '2d6+2', type: 'perforante' },
    ],
    traits: ['Garras: si impactan a una criatura que no sea un elfo ni un muerto viviente, debe superar una salvación de Constitución CD 10 o quedar paralizada 1 minuto (repite la salvación al final de cada uno de sus turnos).'],
    desc: 'Muertos hambrientos de carne que vagan por criptas y campos de batalla.',
  },
  bugbear: {
    name: 'Osgo', type: 'humanoide', size: 'Mediano', cr: '1', ac: 16, hp: '5d8+5', avgHp: 27, speed: '30 pies',
    abilities: { str: 15, dex: 14, con: 13, int: 8, wis: 11, cha: 9 }, saves: {}, pp: 10,
    attacks: [
      { name: 'Lucero del alba', bonus: 4, dmg: '2d8+2', type: 'perforante' },
      { name: 'Jabalina', bonus: 4, dmg: '2d6+2', type: 'perforante', ranged: true },
    ],
    brute: true, surpriseAttack: '2d6',
    traits: ['Bruto: sus armas cuerpo a cuerpo infligen un dado de daño adicional (ya incluido).', 'Ataque sorpresa: si sorprende a una criatura y la impacta en el primer asalto, inflige 2d6 de daño adicional.'],
    desc: 'Goblinoides grandes, peludos y sigilosos que disfrutan de la emboscada y someten a los goblins.',
  },
};
