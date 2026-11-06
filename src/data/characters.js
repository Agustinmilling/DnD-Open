// Personajes pre-hechos (nombres e historias originales; reglas de 2024 del SRD 5.2.1).
// Se construyen con las mismas elecciones que el asistente de creación (character.buildTemplate).
module.exports = {
  darian: {
    portrait: '🛡️', color: '#c0392b',
    bio: 'Exsargento de la guardia del paso de Montefrío. Desertó cuando le ordenaron quemar una aldea y desde entonces protege a quien no puede protegerse solo. Habla poco y duerme con la espada al alcance.',
    spec: {
      name: 'Darío Montefrío', gender: 'm', cls: 'fighter', background: 'soldier', species: 'human', kit: 'defensor', method: 'array',
      base: { str: 15, con: 14, dex: 13, wis: 12, cha: 10, int: 8 }, bgPlus: { str: 2, con: 1 },
      choices: { 'class:skills': ['perception', 'survival'], 'hu:skill': ['insight'], 'hu:feat': ['alert'], 'opt:style': ['style_defense'] },
    },
  },
  brenna: {
    portrait: '⚒️', color: '#d4a017',
    bio: 'Sacerdotisa de la forja del templo de su clan. Cree que todo lo roto puede repararse, sea una espada o una persona. Lleva al cuello el martillo sagrado de su abuela y una paciencia infinita para los heridos (no tanto para los cobardes).',
    spec: {
      name: 'Brenna Yunquebrasa', gender: 'f', cls: 'cleric', background: 'acolyte', species: 'dwarf', kit: 'martillo', method: 'array',
      base: { wis: 15, con: 14, str: 13, cha: 12, dex: 10, int: 8 }, bgPlus: { wis: 2, cha: 1 },
      choices: {
        'class:skills': ['medicine', 'persuasion'], 'opt:order': ['order_protector'],
        'feat:bg:ability': ['wis'], 'feat:bg:cantrips': ['light', 'thaumaturgy'], 'feat:bg:spell': ['bless'],
        'spells:cantrips': ['sacred_flame', 'guidance', 'spare_the_dying'],
        'spells:1': ['cure_wounds', 'healing_word', 'guiding_bolt', 'shield_of_faith'], 'spells:2': ['command'], 'spells:3': ['spiritual_weapon'],
      },
    },
  },
  lia: {
    portrait: '🗡️', color: '#27ae60',
    bio: 'Creció robando manzanas y bolsas en los mercados de Ribaseca. Debe dinero a gente peligrosa y busca un golpe de suerte que la saque del apuro. Encantadora, curiosa y absolutamente incapaz de resistirse a una cerradura.',
    spec: {
      name: 'Lía Zarzaleja', gender: 'f', cls: 'rogue', background: 'criminal', species: 'halfling', kit: 'dos_hojas', method: 'array',
      base: { dex: 15, con: 14, wis: 13, int: 12, cha: 10, str: 8 }, bgPlus: { dex: 2, con: 1 },
      choices: { 'class:skills': ['acrobatics', 'perception', 'deception', 'investigation'], 'opt:expertise': ['stealth', 'perception'] },
    },
  },
  ithriel: {
    portrait: '🔮', color: '#2980b9',
    bio: 'Erudito de la biblioteca de Aguaclara, expulsado por "tomar prestado" un grimorio prohibido. Busca en las ruinas antiguas el conocimiento que los libros le niegan. Pedante, valiente cuando no hay más remedio, y sorprendentemente buen cocinero.',
    spec: {
      name: 'Ithriel Velanor', gender: 'm', cls: 'wizard', background: 'sage', species: 'elf', kit: 'baston', method: 'array',
      base: { int: 15, con: 14, dex: 13, wis: 12, cha: 10, str: 8 }, bgPlus: { int: 2, con: 1 },
      choices: {
        'sp:lineage': ['high'], 'sp:ability': ['int'], 'sp:keen': ['perception'], 'sp:cantrip': ['prestidigitation'],
        'class:skills': ['investigation', 'insight'], 'opt:expertise': ['arcana'],
        'feat:bg:ability': ['int'], 'feat:bg:cantrips': ['light', 'mage_hand'], 'feat:bg:spell': ['mage_armor'],
        'spells:cantrips': ['fire_bolt', 'ray_of_frost', 'shocking_grasp'],
        'spells:1': ['magic_missile', 'sleep', 'shield', 'burning_hands'], 'spells:2': ['thunderwave'], 'spells:3': ['scorching_ray'],
      },
    },
  },
};
