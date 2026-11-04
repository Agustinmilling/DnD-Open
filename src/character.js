// Personajes jugadores: creación desde plantilla, estadísticas derivadas y subida de nivel.
const { mod, profBonus, levelForXp, XP_TABLE } = require('./rules');
const TEMPLATES = require('./data/characters');
const ITEMS = require('./data/items');
const SPELLS = require('./data/spells');
const SKILLS = require('./data/skills');
const FEATURES = require('./data/features');

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
    uses: { second_wind: 1, action_surge: 1, channel_divinity: 1, arcane_recovery: 1 },
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
  if (!t.caster) return [];
  const out = [];
  for (let l = 1; l <= pc.level; l++) out.push(...(t.caster.spells[l] || []));
  return out;
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
    if (it.ranged && !['javelin', 'dagger'].includes(w.item)) ab = 'dex';
    const m = mod(t.abilities[ab]);
    const dmgBonus = m + magic;
    return {
      idx, item: w.item, name: it.name + (magic ? ' +1' : ''), toHit: m + pb + magic,
      dmg: `${it.dmg}${dmgBonus >= 0 ? '+' : ''}${dmgBonus}`, type: it.type,
      finesse: !!it.finesse, ranged: !!it.ranged, light: !!it.light,
      dmgOff: `${it.dmg}${magic + Math.min(0, m) ? (magic + Math.min(0, m) > 0 ? '+' : '') + (magic + Math.min(0, m)) : ''}`,
    };
  });
}

function spellStats(pc) {
  const t = TEMPLATES[pc.templateId];
  if (!t.caster) return null;
  const m = mod(t.abilities[t.caster.ability]);
  const pb = profBonus(pc.level);
  return { ability: t.caster.ability, mod: m, dc: 8 + pb + m, attack: pb + m };
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
  TEMPLATES, createPC, gainXp, hasFeature, knownSpells, skillMod, saveMod, armorClass, weaponAttacks,
  spellStats, maxSlots, critRange, sneakDice, isDown, nextXp, avgHitDie,
};
