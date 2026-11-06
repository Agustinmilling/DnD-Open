// Reglas básicas de 5ª edición (SRD 5.2.1)
const ABILITIES = {
  str: { name: 'Fuerza', short: 'FUE' },
  dex: { name: 'Destreza', short: 'DES' },
  con: { name: 'Constitución', short: 'CON' },
  int: { name: 'Inteligencia', short: 'INT' },
  wis: { name: 'Sabiduría', short: 'SAB' },
  cha: { name: 'Carisma', short: 'CAR' },
};

const mod = (score) => Math.floor((score - 10) / 2);
const fmtMod = (n) => (n >= 0 ? `+${n}` : `${n}`);
// Valor propio de un objeto (un id como "constructor" o "__proto__" no existe) o null
const own = (obj, key) => (Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : null);
// Tipos de daño físico (los que resiste la furia)
const PHYSICAL = ['contundente', 'cortante', 'perforante'];

// Bonificador por competencia según nivel
const profBonus = (level) => 2 + Math.floor((Math.max(1, level) - 1) / 4);

// Tabla de experiencia del SRD (niveles 1-5 para este prototipo; ampliable)
const XP_TABLE = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000];
const MAX_LEVEL = 3; // la aventura está pensada para niveles 1-3

function levelForXp(xp) {
  let lvl = 1;
  for (let i = 0; i < XP_TABLE.length; i++) if (xp >= XP_TABLE[i]) lvl = i + 1;
  return Math.min(lvl, MAX_LEVEL);
}

// XP por valor de desafío (CR) según el SRD
const XP_BY_CR = { '0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450, '3': 700 };

module.exports = { ABILITIES, mod, fmtMod, own, PHYSICAL, profBonus, XP_TABLE, levelForXp, XP_BY_CR };
