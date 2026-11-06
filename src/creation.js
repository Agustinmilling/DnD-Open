// Datos para el asistente de creación de personaje (se generan a partir de los mismos datos del motor).
// La lógica de qué hay que elegir está en public/choices.js, compartida con el navegador.
const SPECIES = require('./data/species');
const CLASSES = require('./data/classes');
const BACKGROUNDS = require('./data/backgrounds');
const SKILLS = require('./data/skills');
const SPELLS = require('./data/spells');
const FEATURES = require('./data/features');
const ITEMS = require('./data/items');
const { ABILITIES } = require('./rules');
const { MASTERY, MASTERY_DESC } = require('./data/masteries');

const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const STD_ARRAY = [8, 10, 12, 13, 14, 15];
const STYLE_CANTRIPS = { style_blessed_warrior: { list: 'cleric', count: 2, ability: 'cha' }, style_druidic_warrior: { list: 'druid', count: 2, ability: 'wis' } };

const feat = (id) => ({ id, name: FEATURES[id].name, desc: FEATURES[id].desc, ...(STYLE_CANTRIPS[id] ? { cantrips: STYLE_CANTRIPS[id] } : {}) });

let cache = null;
function build() {
  if (cache) return cache;
  cache = {
    abilities: Object.entries(ABILITIES).map(([id, a]) => ({ id, name: a.name, short: a.short })),
    skills: Object.entries(SKILLS).map(([id, s]) => ({ id, name: s.name, ability: s.ability })),
    pointCost: POINT_COST,
    stdArray: STD_ARRAY,
    listNames: SPELLS.LIST_NAMES,
    maxSpellLevel: CLASSES.MAX_SPELL_LEVEL,
    spells: Object.fromEntries(Object.entries(SPELLS).map(([id, s]) => [id, { name: s.name, level: s.level, lists: s.lists, school: s.school, desc: s.desc }])),
    feats: Object.entries(BACKGROUNDS.ORIGIN_FEATS).map(([id, f]) => ({
      id, name: f.name, desc: FEATURES[f.feature].desc, skills: f.skills || 0, lists: f.lists || null, cantrips: f.cantrips || 0, level1: f.level1 || 0,
      repeatable: id === 'skilled' || id === 'magic_initiate',
    })),
    species: Object.entries(SPECIES).map(([id, s]) => ({
      id, name: s.name, fem: s.fem, icon: s.icon, desc: s.desc, speed: s.speed, small: !!s.small,
      features: s.features.map(feat), lineageLabel: s.lineageLabel || null,
      lineages: s.lineages ? Object.entries(s.lineages).map(([lid, l]) => ({ id: lid, name: l.name, desc: l.desc || '', type: l.type || null, spells: l.spells || {}, cantripFrom: l.cantripFrom || null })) : null,
      keenSenses: s.keenSenses || null, spellAbility: !!s.spellAbility, extraSkill: s.extraSkill || 0, extraFeat: !!s.extraFeat, alwaysSpells: s.alwaysSpells || [],
      toughness: !!s.toughness,
    })),
    backgrounds: Object.entries(BACKGROUNDS).map(([id, b]) => ({
      id, name: b.name, fem: b.fem || b.name, abilities: b.abilities, skills: b.skills, feat: b.feat, featList: b.featList || null, desc: b.desc,
      items: Object.entries(b.items).map(([k, n]) => `${ITEMS[k].name}${n > 1 ? ' ×' + n : ''}`),
    })),
    classes: Object.entries(CLASSES).map(([id, c]) => ({
      id, name: c.name, fem: c.fem, icon: c.icon, hitDie: c.hitDie, saves: c.saves, primary: c.primary, desc: c.desc, role: c.role, stats: c.stats,
      subclass: c.subclass, armorTraining: c.armorTraining, weaponTraining: c.weaponTraining, recommended: c.recommended,
      skillChoices: c.skillChoices, skillList: c.skillList, masteries: c.masteries || 0,
      options: (c.options || []).map((o) => ({ ...o, from: o.from ? o.from.map((x) => (typeof x === 'string' ? feat(x) : x)) : null })),
      caster: c.caster ? { ...c.caster, always: c.caster.always || {} } : null,
      kits: Object.entries(c.kits).map(([kid, k]) => ({ id: kid, name: k.name, desc: k.desc, requires: k.requires || null, weapons: k.weapons.map((w) => ITEMS[w.item].name), armor: k.armor,
        weaponInfo: k.weapons.map((w) => ({ id: w.item, name: ITEMS[w.item].name, dmg: ITEMS[w.item].dmg, type: ITEMS[w.item].type, mastery: ITEMS[w.item].mastery ? { name: MASTERY[ITEMS[w.item].mastery], desc: MASTERY_DESC[ITEMS[w.item].mastery] } : null })) })),
      features: Object.entries(c.features).flatMap(([lvl, list]) => list.map((f) => ({ level: +lvl, ...feat(f) }))),
    })),
  };
  return cache;
}

module.exports = { build, POINT_COST, STD_ARRAY, STYLE_CANTRIPS };
