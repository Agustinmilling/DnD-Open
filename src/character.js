// Personajes jugadores: creación desde plantilla, estadísticas derivadas y subida de nivel.
const { mod, profBonus, levelForXp, XP_TABLE } = require('./rules');
const TEMPLATES = require('./data/characters');
const ITEMS = require('./data/items');
const SPELLS = require('./data/spells');
const SKILLS = require('./data/skills');
const FEATURES = require('./data/features');
const RACES = require('./data/races');
const CLASSES = require('./data/classes');
const BACKGROUNDS = require('./data/backgrounds');
const { ABILITIES } = require('./rules');

const avgHitDie = (hd) => hd / 2 + 1;

function slotsFor(t, level) {
  if (!t.caster) return {};
  return { ...(t.caster.slots[level] || {}) };
}

function createPC(templateId, xp = 0) {
  const t = TEMPLATES[templateId];
  if (!t) throw new Error('Personaje desconocido');
  const conMod = mod(t.abilities.con);
  const pc = {
    id: t.id, templateId: t.id, name: t.name, owner: null,
    level: 1, xp: 0,
    maxHp: t.hitDie + conMod + (t.dwarfToughness ? 1 : 0),
    hp: 0, tempHp: 0,
    hitDice: 1,
    slots: slotsFor(t, 1),
    uses: { second_wind: 1, action_surge: 1, channel_divinity: 1, arcane_recovery: 1, breath: 1, relentless: 1, rebuke: 1 },
    conditions: {},
    deathSaves: { s: 0, f: 0 }, stable: false, dead: false,
    exhaustion: 0,
    inventory: { ...t.inventory },
    mageArmor: false, guidance: false, concentration: null, spiritualWeapon: 0,
    reactionUsed: false,
  };
  pc.hp = pc.maxHp;
  if (xp > 0) gainXp(pc, xp);
  return pc;
}

/** Suma XP y sube de nivel si corresponde. Devuelve lista de mensajes de subida de nivel. */
function gainXp(pc, amount) {
  const t = TEMPLATES[pc.templateId];
  pc.xp += amount;
  const msgs = [];
  const target = levelForXp(pc.xp);
  while (pc.level < target) {
    pc.level += 1;
    const gain = avgHitDie(t.hitDie) + mod(t.abilities.con) + (t.dwarfToughness ? 1 : 0);
    pc.maxHp += gain;
    if (!pc.dead) pc.hp += gain;
    pc.hitDice += 1;
    const newSlots = slotsFor(t, pc.level);
    const oldMax = slotsFor(t, pc.level - 1);
    for (const lvl of Object.keys(newSlots)) {
      pc.slots[lvl] = (pc.slots[lvl] || 0) + (newSlots[lvl] - (oldMax[lvl] || 0));
    }
    const feats = (t.features[pc.level] || []).map((f) => FEATURES[f].name);
    const newSpells = t.caster && t.caster.spells[pc.level] ? t.caster.spells[pc.level].map((s) => SPELLS[s].name) : [];
    let text = `⭐ ¡${pc.name} sube a nivel ${pc.level}! +${gain} PG máximos (ahora ${pc.maxHp}).`;
    if (feats.length) text += ` Nuevos rasgos: ${feats.join(', ')}.`;
    if (newSpells.length) text += ` Nuevos conjuros: ${newSpells.join(', ')}.`;
    if (t.sneak && t.sneak[pc.level] !== t.sneak[pc.level - 1]) text += ` Ataque furtivo: ${t.sneak[pc.level]}.`;
    if (Object.keys(newSlots).some((l) => newSlots[l] !== (oldMax[l] || 0))) text += ` Espacios de conjuro: ${fmtSlots(newSlots)}.`;
    msgs.push(text);
  }
  return msgs;
}

const fmtSlots = (s) => Object.entries(s).map(([l, n]) => `${n} de nivel ${l}`).join(', ');

function hasFeature(pc, f) {
  const t = TEMPLATES[pc.templateId];
  for (let l = 1; l <= pc.level; l++) if ((t.features[l] || []).includes(f)) return true;
  return false;
}

function knownSpells(pc) {
  const t = TEMPLATES[pc.templateId];
  const out = [];
  if (t.caster) for (let l = 1; l <= pc.level; l++) out.push(...(t.caster.spells[l] || []));
  if (t.innate) out.push(...t.innate.spells);
  return [...new Set(out)];
}

function skillMod(pc, skill) {
  const t = TEMPLATES[pc.templateId];
  const s = SKILLS[skill];
  let m = mod(t.abilities[s.ability]);
  if (t.skills.includes(skill)) m += profBonus(pc.level) * (t.expertise.includes(skill) ? 2 : 1);
  return m;
}

function saveMod(pc, ability) {
  const t = TEMPLATES[pc.templateId];
  let m = mod(t.abilities[ability]);
  if (t.saves.includes(ability)) m += profBonus(pc.level);
  if (pc.inventory.cloak_protection) m += 1;
  return m;
}

function armorClass(pc) {
  const t = TEMPLATES[pc.templateId];
  const dex = mod(t.abilities.dex);
  let ac;
  if (pc.mageArmor && t.armor.base === 10) ac = 13 + dex;
  else ac = t.armor.base + Math.min(dex, t.armor.dexMax);
  if (t.armor.shield) ac += 2;
  ac += t.acBonus || 0;
  if (pc.inventory.cloak_protection) ac += 1;
  if (pc.conditions.shielded) ac += 2;
  if (pc.conditions.shield_spell) ac += 5;
  return ac;
}

function weaponAttacks(pc) {
  const t = TEMPLATES[pc.templateId];
  const pb = profBonus(pc.level);
  const magic = pc.inventory.weapon_plus1 ? 1 : 0;
  return t.weapons.map((w, idx) => {
    const it = ITEMS[w.item];
    let ab = w.ability;
    if (it.finesse) ab = mod(t.abilities.dex) >= mod(t.abilities.str) ? 'dex' : 'str';
    const thrown = ['javelin', 'dagger'].includes(w.item);
    if (it.ranged && !thrown) ab = 'dex';
    const m = mod(t.abilities[ab]);
    const style = (t.style === 'dueling' && !it.ranged && !it.twoHanded ? 2 : 0);
    const archery = (t.style === 'archery' && it.ranged && !thrown ? 2 : 0);
    const dmgBonus = m + magic + style;
    return {
      idx, item: w.item, name: it.name + (magic ? ' +1' : ''), toHit: m + pb + magic + archery, die: it.dmg,
      dmg: `${it.dmg}${dmgBonus >= 0 ? '+' : ''}${dmgBonus}`, type: it.type,
      finesse: !!it.finesse, ranged: !!it.ranged, light: !!it.light,
      dmgOff: `${it.dmg}${magic + Math.min(0, m) ? (magic + Math.min(0, m) > 0 ? '+' : '') + (magic + Math.min(0, m)) : ''}`,
    };
  });
}

/** Estadísticas mágicas. Con sid, usa la característica del truco racial si el conjuro viene de la raza. */
function spellStats(pc, sid) {
  const t = TEMPLATES[pc.templateId];
  let ability = null;
  const classKnows = (x) => t.caster && Object.values(t.caster.spells).some((l) => l.includes(x));
  if (sid && t.innate && t.innate.spells.includes(sid) && !classKnows(sid)) ability = t.innate.ability;
  else if (t.caster) ability = t.caster.ability;
  else if (t.innate) ability = t.innate.ability;
  if (!ability) return null;
  const m = mod(t.abilities[ability]);
  const pb = profBonus(pc.level);
  return { ability, mod: m, dc: 8 + pb + m, attack: pb + m };
}

/** CD del arma de aliento del dracónido */
function breathDC(pc) {
  const t = TEMPLATES[pc.templateId];
  return 8 + mod(t.abilities.con) + profBonus(pc.level);
}

const isResistant = (pc, type) => !!(TEMPLATES[pc.templateId].resist || []).includes(type);

// ------------------------------------------------------------------ creación de personajes
const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const STD_ARRAY = [8, 10, 12, 13, 14, 15];
const ABIL_KEYS = Object.keys(ABILITIES);
const PORTRAIT_RE = /^[^<>&"'\\]{1,8}$/u;

function fail(msg) { throw new Error(msg); }
function pickList(val, count, from, what, exclude = []) {
  const list = Array.isArray(val) ? [...new Set(val.map(String))] : [];
  if (list.length !== count) fail(`Elige ${count} ${what}`);
  for (const x of list) {
    if (!from.includes(x)) fail(`Opción no válida en ${what}`);
    if (exclude.includes(x)) fail(`Has repetido una opción en ${what}`);
  }
  return list;
}

/**
 * Construye una plantilla de personaje a partir de lo elegido en el asistente.
 * Valida todo en el servidor (no se confía en el cliente).
 */
function buildTemplate(spec, id) {
  spec = spec && typeof spec === 'object' ? spec : {};
  const name = String(spec.name || '').trim().replace(/\s+/g, ' ').slice(0, 28);
  if (name.length < 2) fail('Ponle un nombre a tu personaje');
  const race = RACES[spec.race]; if (!race) fail('Elige una raza');
  const cls = CLASSES[spec.cls]; if (!cls) fail('Elige una clase');
  const bg = BACKGROUNDS[spec.background]; if (!bg) fail('Elige un trasfondo');
  const kit = cls.kits[spec.kit]; if (!kit) fail('Elige tu equipo');
  const fem = spec.gender === 'f';

  // características
  const base = {};
  for (const k of ABIL_KEYS) {
    const v = Number(spec.base && spec.base[k]);
    if (!Number.isInteger(v) || v < 8 || v > 15) fail('Las puntuaciones base deben estar entre 8 y 15');
    base[k] = v;
  }
  if (spec.method === 'array') {
    if (Object.values(base).sort((a, b) => a - b).join() !== STD_ARRAY.join()) fail('Usa cada valor de la serie estándar (15, 14, 13, 12, 10, 8) una vez');
  } else {
    const cost = Object.values(base).reduce((a, v) => a + POINT_COST[v], 0);
    if (cost > 27) fail(`Te has pasado de puntos (${cost} de 27)`);
  }
  const abilities = { ...base };
  for (const [k, v] of Object.entries(race.bonus)) abilities[k] += v;
  if (race.plus1) {
    const plus = pickList(spec.plus1, race.plus1, ABIL_KEYS.filter((k) => !race.bonus[k]), 'características para el +1');
    for (const k of plus) abilities[k] += 1;
  }

  // habilidades
  const fixed = [...new Set([...(race.skills || []), ...bg.skills])];
  const overlap = (race.skills || []).filter((x) => bg.skills.includes(x)).length;
  const classPicks = pickList(spec.skills, cls.skillChoices, cls.skillList, 'habilidades de clase', fixed);
  const anyCount = (race.extraSkills || 0) + overlap;
  const anyPicks = anyCount ? pickList(spec.anySkills, anyCount, Object.keys(SKILLS), 'habilidades libres', [...fixed, ...classPicks]) : [];
  const skills = [...fixed, ...classPicks, ...anyPicks];
  const expertise = cls.expertise ? pickList(spec.expertise, cls.expertise, skills, 'habilidades de pericia') : [];

  // estilo de combate
  let style = null;
  if (cls.styles) { style = cls.styles[spec.style] ? spec.style : null; if (!style) fail('Elige un estilo de combate'); }

  // linaje dracónico
  let ancestry = null;
  if (race.ancestry) { ancestry = RACES.ANCESTRIES[spec.ancestry]; if (!ancestry) fail('Elige tu linaje dracónico'); }

  // conjuros
  let caster = null;
  let innate = race.innate ? { ...race.innate, spells: [...race.innate.spells] } : null;
  const wizCantrips = CLASSES.wizard.spells.cantrips.from;
  if (cls.caster) {
    const sp = cls.spells;
    const cantrips = pickList(spec.cantrips, sp.cantrips.count, sp.cantrips.from, 'trucos');
    const lvl1 = pickList(spec.spells, sp.level1.count, sp.level1.from, 'conjuros de nivel 1');
    const spells = { 1: [...cantrips, ...(sp.level1.always || []), ...lvl1] };
    if (race.cantrip) {
      const extra = pickList([spec.elfCantrip], 1, wizCantrips, 'truco de alto elfo', cls.caster === 'int' ? cantrips : []);
      if (cls.caster === 'int') spells[1].push(...extra); else innate = { ability: 'int', spells: extra };
    }
    for (const [lvl, auto] of Object.entries(sp.auto || {})) {
      if (auto === 'rest1:2') spells[lvl] = sp.level1.from.filter((x) => !lvl1.includes(x)).slice(0, 2);
      else spells[lvl] = auto.slice();
    }
    caster = { ability: cls.caster, slots: cls.slots, spells };
  } else if (race.cantrip) {
    innate = { ability: 'int', spells: pickList([spec.elfCantrip], 1, wizCantrips, 'truco de alto elfo') };
  }

  // rasgos por nivel
  const features = {};
  for (const [lvl, list] of Object.entries(cls.features)) features[lvl] = list.slice();
  if (style) features[1].unshift(cls.styles[style].feature);
  features[1].push(...race.features);

  const portrait = String(spec.portrait || race.icon || cls.icon);
  if (!PORTRAIT_RE.test(portrait)) fail('Retrato no válido');
  const color = /^#[0-9a-fA-F]{6}$/.test(spec.color || '') ? spec.color : '#8e7cc3';
  const bio = String(spec.bio || '').trim().slice(0, 400) || `${fem ? 'Una' : 'Un'} ${(fem ? cls.fem : cls.name).toLowerCase()} ${(fem ? race.fem : race.name).toLowerCase()} en busca de su destino.`;
  const raceName = (fem ? race.fem : race.name) + (ancestry ? ` (linaje ${ancestry.name.toLowerCase()})` : '');

  const inventory = { ...cls.inventory };
  for (const [k, n] of Object.entries(bg.items)) inventory[k] = (inventory[k] || 0) + n;

  return {
    id, custom: true, name, gender: fem ? 'f' : 'm',
    race: raceName, raceKey: spec.race, className: fem ? cls.fem : cls.name, cls: spec.cls, subclass: cls.subclass,
    portrait, color, role: cls.role, stats: cls.stats, background: bg.name, bio,
    abilities, hitDie: cls.hitDie, saves: cls.saves.slice(), skills, expertise,
    armor: { ...kit.armor }, weapons: kit.weapons.map((w) => ({ ...w })), inventory,
    caster, innate, features, style,
    acBonus: style ? cls.styles[style].acBonus || 0 : 0,
    critRange: cls.critRange ? { ...cls.critRange } : undefined,
    sneak: cls.sneak ? { ...cls.sneak } : undefined,
    dwarfToughness: !!race.toughness, elf: !!race.elf,
    resist: [...(race.resist || []), ...(ancestry ? [ancestry.type] : [])],
    breath: ancestry ? { ...ancestry } : null, rebuke: !!race.rebuke,
  };
}

/** Genera una elección válida al azar para el asistente (botón "Aleatorio" y pruebas). */
const RANDOM_NAMES = {
  m: ['Aldo', 'Bruno', 'Ciro', 'Dámaso', 'Eloy', 'Fermín', 'Gael', 'Hugo', 'Iker', 'Jacobo', 'Lucio', 'Mauro', 'Nuño', 'Olmo', 'Rodrigo', 'Tadeo'],
  f: ['Alma', 'Berta', 'Celia', 'Dalia', 'Elena', 'Fiona', 'Greta', 'Irene', 'Jimena', 'Lara', 'Mara', 'Nora', 'Olga', 'Rocío', 'Sara', 'Vera'],
};
const PRIORITY = {
  fighter: ['str', 'con', 'dex', 'wis', 'cha', 'int'], fighter_archer: ['dex', 'con', 'wis', 'str', 'int', 'cha'],
  cleric: ['wis', 'con', 'str', 'dex', 'cha', 'int'], rogue: ['dex', 'con', 'wis', 'int', 'cha', 'str'], wizard: ['int', 'con', 'dex', 'wis', 'cha', 'str'],
};
function randomSpec(rnd = Math.random) {
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const sample = (arr, n, exclude = []) => {
    const pool = arr.filter((x) => !exclude.includes(x));
    const out = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    return out;
  };
  const raceKey = pick(Object.keys(RACES).filter((k) => k !== 'ANCESTRIES'));
  const clsKey = pick(Object.keys(CLASSES));
  const race = RACES[raceKey];
  const cls = CLASSES[clsKey];
  const bgKey = pick(Object.keys(BACKGROUNDS));
  const bg = BACKGROUNDS[bgKey];
  const gender = rnd() < 0.5 ? 'f' : 'm';
  const kit = pick(Object.keys(cls.kits));
  const style = cls.styles ? (kit === 'arquero' ? 'archery' : pick(Object.keys(cls.styles))) : undefined;
  const order = PRIORITY[clsKey === 'fighter' && kit === 'arquero' ? 'fighter_archer' : clsKey];
  const sorted = STD_ARRAY.slice().sort((a, b) => b - a);
  const base = {};
  order.forEach((k, i) => { base[k] = sorted[i]; });
  const spec = { name: pick(RANDOM_NAMES[gender]), gender, race: raceKey, cls: clsKey, background: bgKey, kit, style, method: 'array', base };
  if (race.plus1) spec.plus1 = sample(order.filter((k) => !race.bonus[k]).slice(0, 3), race.plus1);
  if (race.ancestry) spec.ancestry = pick(Object.keys(RACES.ANCESTRIES));
  const fixed = [...new Set([...(race.skills || []), ...bg.skills])];
  spec.skills = sample(cls.skillList, cls.skillChoices, fixed);
  const overlap = (race.skills || []).filter((x) => bg.skills.includes(x)).length;
  const anyCount = (race.extraSkills || 0) + overlap;
  if (anyCount) spec.anySkills = sample(Object.keys(SKILLS), anyCount, [...fixed, ...spec.skills]);
  if (cls.expertise) spec.expertise = sample([...fixed, ...spec.skills, ...(spec.anySkills || [])], cls.expertise);
  if (cls.caster) {
    spec.cantrips = sample(cls.spells.cantrips.from, cls.spells.cantrips.count);
    spec.spells = sample(cls.spells.level1.from, cls.spells.level1.count);
  }
  if (race.cantrip) spec.elfCantrip = sample(CLASSES.wizard.spells.cantrips.from, 1, clsKey === 'wizard' ? spec.cantrips : [])[0];
  spec.portrait = race.icon;
  spec.color = pick(['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400', '#16a085', '#b7950b', '#7f8c8d']);
  return spec;
}

function maxSlots(pc) {
  return slotsFor(TEMPLATES[pc.templateId], pc.level);
}

function critRange(pc) {
  const t = TEMPLATES[pc.templateId];
  let r = 20;
  if (t.critRange) for (const [lvl, v] of Object.entries(t.critRange)) if (pc.level >= +lvl) r = v;
  return r;
}

function sneakDice(pc) {
  const t = TEMPLATES[pc.templateId];
  return t.sneak ? t.sneak[pc.level] : null;
}

const isDown = (pc) => pc.dead || pc.hp <= 0;
const nextXp = (pc) => XP_TABLE[pc.level] ?? null;

module.exports = {
  buildTemplate, randomSpec, breathDC, isResistant, POINT_COST, STD_ARRAY,
  TEMPLATES, createPC, gainXp, hasFeature, knownSpells, skillMod, saveMod, armorClass, weaponAttacks,
  spellStats, maxSlots, critRange, sneakDice, isDown, nextXp, avgHitDie,
};
