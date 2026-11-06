// Bestias para la Forma salvaje del druida (VD 1/4 o menos, sin vuelo). Estadísticas del SRD 5.2.1 (CC BY 4.0).
// En las reglas de 2024 el druida conserva sus PG y gana PG temporales iguales a su nivel de druida.
module.exports = {
  wolf: {
    name: 'Lobo', icon: '🐺', ac: 12, speed: '12 m', abilities: { str: 14, dex: 15, con: 12 },
    attacks: [{ name: 'Mordisco', bonus: 4, dmg: '1d6+2', type: 'perforante', prone: true }],
    packTactics: true,
    desc: 'Rápido y en manada: ventaja si un aliado está junto al objetivo; su mordisco derriba.',
  },
  boar: {
    name: 'Jabalí', icon: '🐗', ac: 11, speed: '12 m', abilities: { str: 13, dex: 11, con: 14 },
    attacks: [{ name: 'Colmillos', bonus: 3, dmg: '1d6+1', type: 'perforante', charge: '1d6' }],
    bloodiedFury: true,
    desc: 'Embiste: el primer golpe hace 1d6 extra y derriba. Con la mitad de PG o menos ataca con ventaja.',
  },
  panther: {
    name: 'Pantera', icon: '🐆', ac: 13, speed: '15 m, trepar 12 m', abilities: { str: 14, dex: 16, con: 10 },
    attacks: [{ name: 'Desgarro', bonus: 5, dmg: '1d6+3', type: 'cortante' }],
    stealth: 7,
    desc: 'Sigilosa y certera: puede esconderse como acción adicional.',
  },
};
