// Personajes jugadores (reglas de 2024, SRD 5.2.1): creación desde plantilla, estadísticas derivadas y subida de nivel.
const { mod, profBonus, levelForXp, XP_TABLE, ABILITIES } = require('./rules');
const PREMADE = require('./data/characters');
const ITEMS = require('./data/items');
const SPELLS = require('./data/spells');
const SKILLS = require('./data/skills');
const FEATURES = require('./data/features');
const SPECIES = require('./data/species');
const CLASSES = require('./data/classes');
const BACKGROUNDS = require('./data/backgrounds');
const BEASTS = require('./data/beasts');
const CREATION = require('./creation');
const Choices = require('../public/choices');

const { POINT_COST, STD_ARRAY } = CREATION;
const TEMPLATES = {}; // id -> plantilla (pre-hechos al cargar; los creados en las salas se añaden después)
const ABIL_KEYS = Object.keys(ABILITIES);
const avgHitDie = (hd) => hd / 2 + 1;
const tplOf = (pc) => TEMPLATES[pc.templateId];

// Nombres de los recursos que se muestran en la ficha
const RES_NAMES = {
  rage: 'Furia', second_wind: 'Tomar aliento', action_surge: 'Oleada de acción', inspiration: 'Inspiración bárdica',
  channel: 'Canalizar divinidad', wild_shape: 'Forma salvaje', lay_on_hands: 'Imposición de manos (reserva de PG)',
  free_divine_smite: 'Castigo divino sin espacio', free_hunters_mark: 'Marca del cazador sin espacio', innate: 'Hechicería innata',
  points: 'Puntos de hechicería', cunning: 'Astucia mágica', arcane_recovery: 'Recuperación arcana', focus: 'Puntos de concentración',
  metabolism: 'Metabolismo asombroso', breath: 'Ataque de aliento', relentless: 'Aguante incansable', adrenaline: 'Descarga de adrenalina',
  giant: 'Linaje gigante', heroic: 'Inspiración heroica',
};
const resName = (k) => RES_NAMES[k] || (k.startsWith('free_') && SPELLS[k.slice(5)] ? `${SPELLS[k.slice(5)].name} sin espacio` : k);

// ------------------------------------------------------------------ niveles, PG y recursos
function slotsFor(t, level) {
  if (!t.caster) return {};
  return { ...(CLASSES.SLOTS[t.caster.type][level] || {}) };
}

function maxHpFor(t, level) {
  const con = mod(t.abilities.con);
  let hp = t.hitDie + con + (level - 1) * (avgHitDie(t.hitDie) + con);
  if (t.toughness) hp += level;
  if (t.draconic && level >= 3) hp += level;
  return Math.max(level, hp);
}

/** Usos máximos de cada recurso a un nivel dado */
function usesFor(t, level) {
  const out = {};
  for (const [k, v] of Object.entries(t.res || {})) {
    const n = v === 'cha' ? Math.max(1, mod(t.abilities.cha)) : v[Math.min(level, 3) - 1];
    if (n > 0) out[k] = n;
  }
  return out;
}
const usesMax = (pc) => usesFor(tplOf(pc), pc.level);

function createPC(templateId, xp = 0) {
  const t = TEMPLATES[templateId];
  if (!t) throw new Error('Personaje desconocido');
  const pc = {
    id: t.id, templateId: t.id, name: t.name, owner: null,
    level: 1, xp: 0,
    maxHp: maxHpFor(t, 1), hp: 0, tempHp: 0, bonusHp: 0,
    hitDice: 1,
    slots: slotsFor(t, 1),
    uses: usesFor(t, 1),
    conditions: {},
    deathSaves: { s: 0, f: 0 }, stable: false, dead: false,
    exhaustion: 0,
    inventory: { ...t.inventory },
    mageArmor: false, guidance: false, enhanced: false, concentration: null, shape: null, images: 0,
    reactionUsed: false,
  };
  pc.hp = pc.maxHp;
  if (xp > 0) gainXp(pc, xp);
  return pc;
}

const fmtSlots = (s) => Object.entries(s).map(([l, n]) => `${n} de nivel ${l}`).join(', ');

/** Suma XP y sube de nivel si corresponde. Devuelve lista de mensajes de subida de nivel. */
function gainXp(pc, amount) {
  const t = tplOf(pc);
  pc.xp += amount;
  const msgs = [];
  const target = levelForXp(pc.xp);
  while (pc.level < target) {
    const oldMax = maxHpFor(t, pc.level);
    const oldSlots = slotsFor(t, pc.level);
    const oldUses = usesFor(t, pc.level);
    pc.level += 1;
    const gain = maxHpFor(t, pc.level) - oldMax;
    pc.maxHp += gain;
    if (!pc.dead) pc.hp += gain;
    pc.hitDice += 1;
    const newSlots = slotsFor(t, pc.level);
    const pact = t.caster && t.caster.type === 'pact';
    if (pact) pc.slots = { ...newSlots }; // los espacios de pacto cambian de nivel: se recargan
    else for (const lvl of Object.keys(newSlots)) pc.slots[lvl] = Math.max(0, (pc.slots[lvl] || 0) + newSlots[lvl] - (oldSlots[lvl] || 0));
    const newUses = usesFor(t, pc.level);
    for (const [k, n] of Object.entries(newUses)) pc.uses[k] = Math.max(0, (pc.uses[k] || 0) + n - (oldUses[k] || 0));
    const feats = (t.features[pc.level] || []).filter((f) => FEATURES[f]).map((f) => FEATURES[f].name);
    const spells = [...((t.caster && t.caster.spells[pc.level]) || []), ...((t.caster && t.caster.always[pc.level]) || []), ...t.extraSpells.flatMap((x) => x.spells[pc.level] || [])];
    let text = `⭐ ¡${pc.name} sube a nivel ${pc.level}! +${gain} PG máximos (ahora ${pc.maxHp}).`;
    if (pc.level === 3 && t.subclass) text += ` Subclase: ${t.subclass.replace(/ \(a nivel 3\)/, '')}.`;
    if (feats.length) text += ` Nuevos rasgos: ${feats.join(', ')}.`;
    if (spells.length) text += ` Nuevos conjuros: ${[...new Set(spells)].map((s) => SPELLS[s].name).join(', ')}.`;
    if (t.sneak && t.sneak[pc.level] !== t.sneak[pc.level - 1]) text += ` Ataque furtivo: ${t.sneak[pc.level]}.`;
    if (Object.keys(newSlots).some((l) => newSlots[l] !== (oldSlots[l] || 0)) || Object.keys(oldSlots).some((l) => !newSlots[l])) text += ` Espacios de conjuro: ${fmtSlots(newSlots)}.`;
    msgs.push(text);
  }
  return msgs;
}

function hasFeature(pc, f) {
  const t = tplOf(pc);
  for (let l = 1; l <= pc.level; l++) if ((t.features[l] || []).includes(f)) return true;
  return false;
}
const hasOpt = (pc, opt, val) => { const t = tplOf(pc); return !!(t.options[opt] && t.options[opt].includes(val)) && hasFeature(pc, val); };

// ------------------------------------------------------------------ conjuros
/** Conjuros de clase y de otras fuentes que conoce el personaje a su nivel */
function knownSpells(pc) {
  const t = tplOf(pc);
  const out = [];
  if (t.caster) for (let l = 0; l <= pc.level; l++) out.push(...(t.caster.spells[l] || []), ...(t.caster.always[l] || []));
  for (const src of t.extraSpells) for (let l = 0; l <= pc.level; l++) out.push(...(src.spells[l] || []));
  return [...new Set(out)];
}

/** De dónde sale un conjuro: { ability, cls (de clase), free (recurso para lanzarlo sin espacio) } */
function spellSource(pc, sid) {
  const t = tplOf(pc);
  const classKnows = t.caster && [...Object.values(t.caster.spells), ...Object.values(t.caster.always)].some((l) => l.includes(sid));
  let src = null;
  for (const s of t.extraSpells) if (Object.values(s.spells).some((l) => l.includes(sid))) { src = s; break; }
  const free = pc.uses[`free_${sid}`] > 0 ? `free_${sid}` : null;
  if (classKnows) {
    // si otra fuente da el mismo conjuro con mejor característica, se usa la mejor (p. ej. un truco racial)
    const ab = src && mod(t.abilities[src.ability]) > mod(t.abilities[t.caster.ability]) ? src.ability : t.caster.ability;
    return { ability: ab, cls: true, free };
  }
  if (src) return { ability: src.ability, cls: false, free };
  return null;
}

/** Estadísticas mágicas (CD, ataque). Con sid, usa la característica de la fuente de ese conjuro. */
function spellStats(pc, sid) {
  const t = tplOf(pc);
  let ability = null;
  let cls = false;
  if (sid) { const s = spellSource(pc, sid); if (s) { ability = s.ability; cls = s.cls; } }
  if (!ability && t.caster) { ability = t.caster.ability; cls = true; }
  if (!ability && t.extraSpells.length) ability = t.extraSpells[0].ability;
  if (!ability) return null;
  const m = mod(t.abilities[ability]);
  const pb = profBonus(pc.level);
  const innate = cls && t.cls === 'sorcerer' && pc.conditions.innate_sorcery ? 1 : 0;
  return { ability, mod: m, dc: 8 + pb + m + innate, attack: pb + m, innate: !!innate };
}

function maxSlots(pc) { return slotsFor(tplOf(pc), pc.level); }

// ------------------------------------------------------------------ características, habilidades y defensa
function abilityScore(pc, k) {
  const t = tplOf(pc);
  if (pc.shape && ['str', 'dex', 'con'].includes(k)) return BEASTS[pc.shape].abilities[k];
  if (k === 'str' && pc.conditions && pc.conditions.str_drain) return Math.max(1, t.abilities.str - pc.conditions.str_drain.amount);
  return t.abilities[k];
}
const abilityMod = (pc, k) => mod(abilityScore(pc, k));

const isProficient = (t, skill, level) => t.skills.includes(skill) && (t.skillLevel[skill] || 1) <= level;
const hasExpertise = (t, skill, level) => t.expertise[skill] !== undefined && t.expertise[skill] <= level && isProficient(t, skill, level);

function skillMod(pc, skill) {
  const t = tplOf(pc);
  const s = SKILLS[skill];
  const pb = profBonus(pc.level);
  let m = abilityMod(pc, s.ability);
  if (isProficient(t, skill, pc.level)) m += pb * (hasExpertise(t, skill, pc.level) ? 2 : 1);
  else if (hasFeature(pc, 'jack_of_all_trades')) m += Math.floor(pb / 2);
  const wisBonus = Math.max(1, mod(t.abilities.wis));
  if (hasOpt(pc, 'order', 'order_thaumaturge') && (skill === 'arcana' || skill === 'religion')) m += wisBonus;
  if (hasOpt(pc, 'order', 'order_magician') && (skill === 'arcana' || skill === 'nature')) m += wisBonus;
  return m;
}

function saveMod(pc, ability) {
  const t = tplOf(pc);
  let m = abilityMod(pc, ability);
  if (t.saves.includes(ability)) m += profBonus(pc.level);
  if (pc.inventory.cloak_protection) m += 1;
  return m;
}

function initiativeMod(pc) {
  let m = abilityMod(pc, 'dex');
  if (hasFeature(pc, 'feat_alert')) m += profBonus(pc.level);
  return m;
}

function armorClass(pc) {
  const t = tplOf(pc);
  const c = pc.conditions;
  let ac;
  if (pc.shape) ac = BEASTS[pc.shape].ac;
  else {
    const dex = abilityMod(pc, 'dex');
    const a = t.armor;
    const shield = a.shield ? 2 : 0;
    const opts = [];
    if (a.type !== 'none') opts.push(a.base + Math.min(dex, a.dexMax) + shield + (t.style === 'style_defense' ? 1 : 0));
    else {
      opts.push(10 + dex + shield);
      if (hasFeature(pc, 'unarmored_defense_barbarian')) opts.push(10 + dex + mod(t.abilities.con) + shield);
      if (hasFeature(pc, 'unarmored_defense_monk') && !a.shield) opts.push(10 + dex + mod(t.abilities.wis));
      if (hasFeature(pc, 'draconic_resilience')) opts.push(10 + dex + mod(t.abilities.cha) + shield);
      if (pc.mageArmor || hasFeature(pc, 'inv_armor_of_shadows')) opts.push(13 + dex + shield);
    }
    ac = Math.max(...opts);
  }
  if (pc.inventory.cloak_protection) ac += 1;
  if (c.shielded) ac += 2;
  if (c.shield_spell) ac += 5;
  if (c.barkskin) ac = Math.max(ac, 17);
  return ac;
}

const VERSATILE = { d6: 'd8', d8: 'd10', d10: 'd12' };
const DIE_SIZE = (die) => Number(String(die).replace(/^\d*d/, '')) || 0;

/** Ataques con arma (o de bestia si está transformado) con sus bonificadores ya calculados */
function weaponAttacks(pc) {
  const t = tplOf(pc);
  const pb = profBonus(pc.level);
  const c = pc.conditions;
  if (pc.shape) {
    const b = BEASTS[pc.shape];
    return b.attacks.map((a, idx) => ({ idx, item: null, beast: true, name: a.name, toHit: a.bonus, die: a.dmg, dmg: a.dmg, bonus: 0, type: a.type, ability: 'str', abilityMod: 0, ranged: false, melee: true, prone: !!a.prone, mastery: null }));
  }
  const magic = (pc.inventory.weapon_plus1 ? 1 : 0) + (c.magic_weapon ? 1 : 0);
  const monk = hasFeature(pc, 'martial_arts');
  const mDie = t.martialDie ? t.martialDie[pc.level] : null;
  const st = spellStats(pc);
  const weapons = t.weapons.map((w) => ({ ...w }));
  if (monk) weapons.push({ item: 'unarmed' });
  return weapons.map((w, idx) => {
    const it = ITEMS[w.item];
    const ranged = !!it.ranged;
    const melee = !ranged;
    let ab = ranged ? 'dex' : 'str';
    if (it.finesse) ab = abilityMod(pc, 'dex') >= abilityMod(pc, 'str') ? 'dex' : 'str';
    const monkWeapon = monk && melee && (w.item === 'unarmed' || !it.martial || it.light);
    if (monkWeapon && abilityMod(pc, 'dex') > abilityMod(pc, ab)) ab = 'dex';
    let die = it.dmg;
    if (it.versatile && !t.armor.shield && melee) die = die.replace(/d\d+/, (d) => VERSATILE[d] || d);
    if (monkWeapon && mDie && DIE_SIZE(mDie) > DIE_SIZE(die)) die = mDie;
    let ability = ab;
    let abMod = abilityMod(pc, ab);
    let type = it.type;
    if (c.shillelagh && (w.item === 'quarterstaff' || w.item === 'club') && st) {
      die = '1d8';
      if (mod(t.abilities[st.ability]) > abMod) { ability = st.ability; abMod = mod(t.abilities[st.ability]); }
    }
    if (w.pact && hasFeature(pc, 'inv_pact_blade') && mod(t.abilities.cha) > abMod) { ability = 'cha'; abMod = mod(t.abilities.cha); }
    const archery = t.style === 'style_archery' && ranged ? 2 : 0;
    const sacred = c.sacred_weapon && melee ? Math.max(1, mod(t.abilities.cha)) : 0;
    const rage = c.raging && ability === 'str' ? 2 : 0;
    const bonus = abMod + magic + rage;
    const toHit = abMod + pb + magic + archery + sacred;
    const mastery = w.mastery ? it.mastery : null;
    return {
      idx, item: w.item, name: it.name + (magic ? ` +${magic}` : '') + (w.pact && hasFeature(pc, 'inv_pact_blade') ? ' (arma de pacto)' : ''),
      toHit, die, bonus, dmg: `${die}${bonus >= 0 ? '+' : ''}${bonus}`, type, ability, abilityMod: abMod,
      finesse: !!it.finesse, ranged, melee, thrown: !!it.thrown, light: !!it.light, twoHanded: !!it.twoHanded || (it.versatile && !t.armor.shield),
      heavy: !!it.heavy, monk: !!monkWeapon, unarmed: w.item === 'unarmed', mastery,
      gwf: t.style === 'style_great_weapon' && melee && (it.twoHanded || it.versatile),
    };
  });
}

function critRange(pc) {
  const t = tplOf(pc);
  let r = 20;
  if (t.critRange) for (const [lvl, v] of Object.entries(t.critRange)) if (pc.level >= +lvl) r = v;
  return r;
}
const sneakDice = (pc) => { const t = tplOf(pc); return t.sneak ? t.sneak[pc.level] : null; };
const martialDie = (pc) => { const t = tplOf(pc); return t.martialDie ? t.martialDie[pc.level] : null; };
const breathDC = (pc) => 8 + mod(tplOf(pc).abilities.con) + profBonus(pc.level);
const classDC = (pc, ability) => 8 + mod(tplOf(pc).abilities[ability]) + profBonus(pc.level);
const isResistant = (pc, type) => (tplOf(pc).resist || []).includes(type)
  || (pc.conditions.raging && ['contundente', 'cortante', 'perforante'].includes(type));
const isDown = (pc) => pc.dead || pc.hp <= 0;
const nextXp = (pc) => XP_TABLE[pc.level] ?? null;

// ------------------------------------------------------------------ creación de personajes (asistente)
function fail(msg) { throw new Error(msg); }

/**
 * Construye una plantilla de personaje a partir de lo elegido en el asistente.
 * Valida todo en el servidor (no se confía en el cliente).
 */
function buildTemplate(spec, id) {
  spec = spec && typeof spec === 'object' ? spec : {};
  const D = CREATION.build();
  const name = String(spec.name || '').trim().replace(/\s+/g, ' ').slice(0, 28);
  if (name.length < 2) fail('Ponle un nombre a tu personaje');
  const cls = Object.prototype.hasOwnProperty.call(CLASSES, spec.cls) ? CLASSES[spec.cls] : null; if (!cls) fail('Elige una clase');
  const bg = Object.prototype.hasOwnProperty.call(BACKGROUNDS, spec.background) ? BACKGROUNDS[spec.background] : null; if (!bg) fail('Elige un trasfondo');
  const sp = Object.prototype.hasOwnProperty.call(SPECIES, spec.species) ? SPECIES[spec.species] : null; if (!sp) fail('Elige una especie');
  const kit = Object.prototype.hasOwnProperty.call(cls.kits, spec.kit) ? cls.kits[spec.kit] : null; if (!kit) fail('Elige tu equipo');
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
  const bgPlus = {};
  for (const k of ABIL_KEYS) { const v = Number((spec.bgPlus || {})[k] || 0); if (v) bgPlus[k] = v; }
  const bgD = D.backgrounds.find((b) => b.id === spec.background);
  const bp = Choices.bonusProblem(bgD, bgPlus); if (bp) fail(bp);

  // elecciones (las mismas reglas que ve el navegador)
  const choices = {};
  for (const [k, v] of Object.entries(spec.choices || {})) if (Array.isArray(v)) choices[String(k)] = v.map(String);
  const norm = { ...spec, base, bgPlus, choices };
  const prob = Choices.choicesProblem(D, norm); if (prob) fail(prob);
  const ch = (k) => choices[k] || [];
  if (kit.requires) for (const [o, v] of Object.entries(kit.requires)) if (!ch(`opt:${o}`).includes(v)) fail('Ese equipo necesita otra elección de clase');
  const abilities = Choices.finalAbilities(D, norm);

  // linaje
  const lineageId = ch('sp:lineage')[0] || null;
  const lineage = lineageId ? sp.lineages[lineageId] : null;

  // rasgos por nivel
  const features = { 1: [], 2: [], 3: [] };
  for (const [lvl, list] of Object.entries(cls.features)) features[lvl].push(...list);
  const options = {};
  for (const o of cls.options || []) {
    const sel = ch(`opt:${o.id}`);
    options[o.id] = sel;
    if (o.from) for (const x of sel) if (FEATURES[x]) features[o.at].push(x);
  }
  if (cls === CLASSES.warlock) options.invocations = [...(options.invocations || []), ...(options.invocations2 || [])];
  features[1].push(...sp.features);
  const featIds = [bg.feat];
  if (sp.extraFeat) featIds.push(ch('hu:feat')[0]);
  for (const f of featIds) features[1].push(BACKGROUNDS.ORIGIN_FEATS[f].feature);

  // habilidades: { habilidad: nivel al que se gana }
  const skillLevel = {};
  const addSkill = (k, lvl = 1) => { if (!(k in skillLevel) || skillLevel[k] > lvl) skillLevel[k] = lvl; };
  bg.skills.forEach((k) => addSkill(k));
  [...ch('sp:keen'), ...ch('class:skills'), ...ch('hu:skill'), ...ch('feat:bg:skills'), ...ch('feat:hu:skills')].forEach((k) => addSkill(k));
  const expertise = {};
  for (const o of cls.options || []) {
    if (!o.skills) continue;
    for (const k of ch(`opt:${o.id}`)) { if (o.skills === 'proficient') expertise[k] = o.at; else addSkill(k, o.at); }
  }

  // conjuros de clase
  let caster = null;
  if (cls.caster) {
    const cs = cls.caster;
    caster = {
      ability: cs.ability, type: cs.type,
      spells: { 0: ch('spells:cantrips'), 1: ch('spells:1'), 2: ch('spells:2'), 3: ch('spells:3') },
      always: { ...(cs.always || {}) },
    };
    if (cls === CLASSES.druid && options.land && options.land[0]) caster.always = { ...caster.always, 3: CLASSES.LANDS[options.land[0]].spells.slice() };
  }
  // conjuros de otras fuentes (especie, dotes, estilos)
  const extraSpells = [];
  const res = JSON.parse(JSON.stringify(cls.res || {}));
  const resShort = { ...(cls.resShort || {}) };
  for (const [k, v] of Object.entries(sp.res || {})) res[k] = v;
  for (const [k, v] of Object.entries(sp.resShort || {})) resShort[k] = v;
  const spAbility = ch('sp:ability')[0] || 'cha';
  if (lineage && lineage.spells || sp.alwaysSpells || ch('sp:cantrip').length) {
    const spells = {};
    for (const [lvl, list] of Object.entries((lineage && lineage.spells) || {})) spells[lvl] = list.slice();
    spells[1] = [...(spells[1] || []), ...(sp.alwaysSpells || []), ...ch('sp:cantrip')];
    extraSpells.push({ source: sp.name, ability: spAbility, spells });
    for (const [lvl, list] of Object.entries(spells)) for (const s of list) if (SPELLS[s].level > 0) res[`free_${s}`] = [1, 2, 3].map((l) => (l >= +lvl ? (s === 'speak_with_animals' ? 2 : 1) : 0));
  }
  for (const src of ['bg', 'hu']) {
    const f = src === 'bg' ? bg.feat : ch('hu:feat')[0];
    if (f !== 'magic_initiate') continue;
    const list = src === 'bg' ? bg.featList : ch(`feat:${src}:list`)[0];
    const spell = ch(`feat:${src}:spell`)[0];
    extraSpells.push({ source: `Iniciado en la magia (${SPELLS.LIST_NAMES[list]})`, ability: ch(`feat:${src}:ability`)[0], spells: { 1: [...ch(`feat:${src}:cantrips`), spell] } });
    res[`free_${spell}`] = [1, 1, 1];
  }
  for (const o of cls.options || []) {
    const sel = ch(`opt:${o.id}:cantrips`);
    if (!sel.length) continue;
    const giver = (options[o.id] || []).map((x) => CREATION.STYLE_CANTRIPS[x]).find(Boolean);
    extraSpells.push({ source: FEATURES[options[o.id][0]].name, ability: giver.ability, spells: { [o.at]: sel } });
  }

  // armas: se asignan las maestrías a las primeras armas que la tengan
  const weapons = kit.weapons.map((w) => ({ ...w }));
  let masteries = cls.masteries || 0;
  const mastered = new Set();
  for (const w of weapons) {
    const it = ITEMS[w.item];
    if (masteries > 0 && it.mastery && !mastered.has(w.item)) { mastered.add(w.item); masteries -= 1; }
    w.mastery = mastered.has(w.item);
  }
  if (options.invocations && options.invocations.includes('inv_pact_blade')) { const m = weapons.find((w) => !ITEMS[w.item].ranged); if (m) m.pact = true; }

  const portrait = String(spec.portrait || sp.icon || cls.icon);
  if (!/^[^<>&"'\\]{1,8}$/u.test(portrait)) fail('Retrato no válido');
  const color = /^#[0-9a-fA-F]{6}$/.test(spec.color || '') ? spec.color : '#8e7cc3';
  const clsName = fem ? cls.fem : cls.name;
  const spName = fem ? sp.fem : sp.name;
  const raceName = spName + (lineage ? ` (${sp === SPECIES.dragonborn ? `linaje ${lineage.name.toLowerCase()}` : lineage.name})` : '');
  const bio = String(spec.bio || '').trim().slice(0, 400) || `${fem ? 'Una' : 'Un'} ${clsName.toLowerCase()} ${spName.toLowerCase()} en busca de su destino.`;

  const inventory = { ...cls.inventory };
  for (const [k, n] of Object.entries(bg.items)) inventory[k] = (inventory[k] || 0) + n;

  return {
    id, custom: true, name, gender: fem ? 'f' : 'm',
    race: raceName, species: spec.species, lineage: lineageId, className: clsName, cls: spec.cls, subclass: cls.subclass,
    portrait, color, role: cls.role, stats: cls.stats, background: fem ? (bg.fem || bg.name) : bg.name, bgKey: spec.background, bio,
    abilities, hitDie: cls.hitDie, saves: cls.saves.slice(),
    skills: Object.keys(skillLevel), skillLevel, expertise,
    armor: { ...kit.armor }, weapons, inventory,
    caster, extraSpells, features, options,
    style: (options.style || [])[0] || null,
    res, resShort,
    critRange: cls.critRange ? { ...cls.critRange } : undefined,
    sneak: cls.sneak ? { ...cls.sneak } : undefined,
    martialDie: cls.martialDie ? { ...cls.martialDie } : undefined,
    toughness: !!sp.toughness, draconic: cls === CLASSES.sorcerer, noSleep: !!sp.noSleep,
    resist: [...new Set([...(sp.resist || []), ...((lineage && lineage.resist) || []), ...(sp === SPECIES.dragonborn && lineage ? [lineage.type] : [])])],
    breath: sp === SPECIES.dragonborn && lineage ? { type: lineage.type, name: lineage.name } : null,
    giant: sp === SPECIES.goliath ? lineageId : null,
    land: (options.land || [])[0] || null, prey: (options.prey || [])[0] || null,
    speed: (lineage && lineage.speed) || sp.speed,
  };
}

/** Genera una elección válida al azar para el asistente (botón "Aleatorio" y pruebas). */
const RANDOM_NAMES = {
  m: ['Aldo', 'Bruno', 'Ciro', 'Dámaso', 'Eloy', 'Fermín', 'Gael', 'Hugo', 'Iker', 'Jacobo', 'Lucio', 'Mauro', 'Nuño', 'Olmo', 'Rodrigo', 'Tadeo'],
  f: ['Alma', 'Berta', 'Celia', 'Dalia', 'Elena', 'Fiona', 'Greta', 'Irene', 'Jimena', 'Lara', 'Mara', 'Nora', 'Olga', 'Rocío', 'Sara', 'Vera'],
};
function randomSpec(rnd = Math.random, fixed = {}) {
  const D = CREATION.build();
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const sample = (arr, n) => { const pool = arr.slice(); const out = []; while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]); return out; };
  const clsKey = fixed.cls || pick(Object.keys(CLASSES));
  const cls = CLASSES[clsKey];
  const bgKey = fixed.background || pick(Object.keys(BACKGROUNDS));
  const bg = BACKGROUNDS[bgKey];
  const gender = fixed.gender || (rnd() < 0.5 ? 'f' : 'm');
  const spKey = fixed.species || pick(Object.keys(SPECIES));
  // puntuaciones: la serie estándar ordenada según lo recomendado para la clase
  const base = { ...cls.recommended };
  // +2 a la mejor característica del trasfondo para la clase y +1 a la siguiente
  const order = Object.entries(base).sort((a, b) => b[1] - a[1]).map(([k]) => k).filter((k) => bg.abilities.includes(k));
  const bgPlus = order.length >= 2 ? { [order[0]]: 2, [order[1]]: 1 } : Object.fromEntries(bg.abilities.map((k) => [k, 1]));
  const spec = { name: pick(RANDOM_NAMES[gender]), gender, cls: clsKey, background: bgKey, species: spKey, method: 'array', base, bgPlus, choices: { ...(fixed.choices || {}) } };
  // elecciones: se rellenan una a una al azar (cada elección puede abrir otras)
  for (let guard = 0; guard < 30; guard++) {
    Choices.prune(D, spec);
    const pending = Choices.creationChoices(D, spec).find((c) => (spec.choices[c.key] || []).length < c.count);
    if (!pending) break;
    const have = spec.choices[pending.key] || [];
    const pool = pending.options.filter((o) => !o.disabled && !have.includes(o.id)).map((o) => o.id);
    spec.choices[pending.key] = [...have, ...sample(pool, pending.count - have.length)];
    if (!pool.length) break;
  }
  const kits = Object.entries(cls.kits).filter(([, k]) => !k.requires || Object.entries(k.requires).every(([o, v]) => (spec.choices[`opt:${o}`] || []).includes(v)));
  spec.kit = fixed.kit || pick(kits)[0];
  spec.portrait = fixed.portrait || SPECIES[spKey].icon;
  spec.color = fixed.color || pick(['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400', '#16a085', '#b7950b', '#7f8c8d']);
  return spec;
}

// Personajes pre-hechos: se construyen con las mismas reglas que el asistente
for (const [id, p] of Object.entries(PREMADE)) {
  const t = buildTemplate(p.spec, id);
  TEMPLATES[id] = { ...t, custom: false, portrait: p.portrait, color: p.color, bio: p.bio };
}

module.exports = {
  buildTemplate, randomSpec, breathDC, classDC, isResistant, POINT_COST, STD_ARRAY, RES_NAMES, resName,
  TEMPLATES, createPC, gainXp, hasFeature, hasOpt, knownSpells, spellSource, skillMod, saveMod, initiativeMod, armorClass, weaponAttacks,
  spellStats, maxSlots, critRange, sneakDice, martialDie, isDown, nextXp, avgHitDie, usesMax, abilityScore, abilityMod, isProficient, hasExpertise, maxHpFor,
};
