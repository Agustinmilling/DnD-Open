// Datos para el asistente de creación de personaje del cliente (se generan a partir de los mismos datos del motor).
const RACES = require('./data/races');
const CLASSES = require('./data/classes');
const BACKGROUNDS = require('./data/backgrounds');
const SKILLS = require('./data/skills');
const SPELLS = require('./data/spells');
const FEATURES = require('./data/features');
const ITEMS = require('./data/items');
const { ABILITIES } = require('./rules');
const { POINT_COST, STD_ARRAY } = require('./character');

const feat = (id) => ({ id, name: FEATURES[id] ? FEATURES[id].name : id, desc: FEATURES[id] ? FEATURES[id].desc : '' });
const spell = (id) => ({ id, name: SPELLS[id].name, level: SPELLS[id].level, desc: SPELLS[id].desc });
const STYLE_NAMES = { defense: 'Defensa', dueling: 'Duelo', archery: 'Tiro con arco' };

function build() {
  return {
    abilities: Object.entries(ABILITIES).map(([id, a]) => ({ id, name: a.name, short: a.short })),
    skills: Object.entries(SKILLS).map(([id, s]) => ({ id, name: s.name, ability: s.ability })),
    pointCost: POINT_COST,
    stdArray: STD_ARRAY,
    races: Object.entries(RACES).filter(([id]) => id !== 'ANCESTRIES').map(([id, r]) => ({
      id, name: r.name, fem: r.fem, icon: r.icon, desc: r.desc, bonus: r.bonus, plus1: r.plus1 || 0,
      extraSkills: r.extraSkills || 0, skills: r.skills || [], cantrip: !!r.cantrip, ancestry: !!r.ancestry,
      features: r.features.map(feat),
    })),
    ancestries: Object.entries(RACES.ANCESTRIES).map(([id, a]) => ({ id, ...a })),
    classes: Object.entries(CLASSES).map(([id, c]) => ({
      id, name: c.name, fem: c.fem, icon: c.icon, hitDie: c.hitDie, saves: c.saves, desc: c.desc, role: c.role, stats: c.stats,
      subclass: c.subclass, recommended: c.recommended, skillChoices: c.skillChoices, skillList: c.skillList, expertise: c.expertise || 0,
      styles: c.styles ? Object.entries(c.styles).map(([sid, s]) => ({ id: sid, name: STYLE_NAMES[sid] || sid, desc: FEATURES[s.feature].desc })) : null,
      kits: Object.entries(c.kits).map(([kid, k]) => ({ id: kid, name: k.name, desc: k.desc, weapons: k.weapons.map((w) => ITEMS[w.item].name) })),
      caster: c.caster || null,
      spells: c.spells ? {
        cantrips: { count: c.spells.cantrips.count, from: c.spells.cantrips.from.map(spell) },
        level1: { count: c.spells.level1.count, from: c.spells.level1.from.map(spell), always: (c.spells.level1.always || []).map(spell) },
      } : null,
      features: Object.entries(c.features).flatMap(([lvl, list]) => list.map((f) => ({ level: +lvl, ...feat(f) }))),
    })),
    wizardCantrips: CLASSES.wizard.spells.cantrips.from.map(spell),
    backgrounds: Object.entries(BACKGROUNDS).map(([id, b]) => ({
      id, name: b.name, skills: b.skills, desc: b.desc, items: Object.entries(b.items).map(([k, n]) => `${ITEMS[k].name}${n > 1 ? ' ×' + n : ''}`),
    })),
  };
}

module.exports = { build };
