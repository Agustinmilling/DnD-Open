// Acciones de los personajes (reglas de 2024, SRD 5.2.1): menú de acciones de combate, rasgos de clase,
// lanzamiento de conjuros y acciones de exploración. Son métodos de Room (engine.js), como combat.js.
const { roll, critExpr } = require('./dice');
const { mod, fmtMod, profBonus, ABILITIES } = require('./rules');
const C = require('./character');
const SPELLS = require('./data/spells');
const ITEMS = require('./data/items');
const MONSTERS = require('./data/monsters');
const FEATURES = require('./data/features');
const CONDITIONS = require('./data/conditions');
const BEASTS = require('./data/beasts');
const CLASSES = require('./data/classes');
const { addDice, empower, byHurt, CANTRIP_SCALE } = require('./combat').helpers;

const tpl = C.tplOf;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fdesc = (id) => (FEATURES[id] ? FEATURES[id].desc : '');

const { MASTERY, MASTERY_DESC } = require('./data/masteries');
const META = {
  empowered: { name: 'potenciado', cost: 1, desc: 'Repites los dados de daño más bajos (tantos como tu modificador de Carisma).' },
  extended: { name: 'extendido', cost: 1, desc: 'Duración doble y ventaja en las salvaciones para mantener la concentración.' },
  heightened: { name: 'intensificado', cost: 2, desc: 'Un objetivo tiene desventaja en la salvación contra el conjuro.' },
};
const AREA_COND = { flaming_sphere: 'sphere', moonbeam: 'moonlit' };
const UNDEAD_FIEND = ['muerto viviente', 'infernal'];

/** Tipo de objetivo que entiende el cliente */
const castTarget = (s) => (s.target === 'enemies' ? 'enemies3' : s.target || 'none');
const maxTargetsOf = (s, up) => (s.maxTargets || (s.target === 'enemies' ? 3 : 1)) + (s.upTargets || 0) * up;
/** Cómo se paga un conjuro, para las etiquetas del menú (opt viene de castOption) */
const spellTag = (s, opt) => (s.level === 0 ? 'truco' : opt.free ? 'sin gastar espacio' : `espacio nv ${opt.slot}`);

function aiOf(s) {
  if (s.kind === 'heal') return 'heal';
  if (s.target === 'dying') return 'revive';
  if (s.kind === 'mark') return 'mark';
  if (s.kind === 'smite') return 'smite';
  if (['magic_missile', 'scorching_ray', 'true_strike'].includes(s.id)) return 'attack';
  if ((s.kind === 'attack' || s.kind === 'save') && s.damage) return 'attack';
  if (s.kind === 'save') return 'control';
  if (['false_life', 'mirror_image', 'mage_armor', 'misty_step', 'blur'].includes(s.id)) return 'defend';
  if (s.kind === 'buff' || s.id === 'aid') return 'buff';
  return 'misc';
}
for (const [id, s] of Object.entries(SPELLS)) Object.defineProperty(s, 'id', { value: id, enumerable: false });

module.exports = {
  // ================================================================ utilidades
  /** Cómo se pagaría un conjuro ahora: { slot, free } o null si no se puede (regla de 2024: un espacio por turno) */
  castOption(pc, sid) {
    const s = SPELLS[sid];
    if (!s) return null;
    if (s.level === 0) return { slot: 0, free: null };
    const src = C.spellSource(pc, sid);
    if (src && src.free) return { slot: s.level, free: src.free };
    if (this.combat && this.combat.turnState && this.combat.turnState.slotUsed) return null;
    const slot = this.slotFor(pc, s.level);
    return slot ? { slot, free: null } : null;
  },

  /** El tipo de daño más eficaz contra un monstruo entre varios posibles */
  bestType(types, target) {
    if (!target || this.isPC(target)) return types[0];
    const m = MONSTERS[target.type];
    const score = (t) => ((m.vulnerable || []).includes(t) ? 3 : (m.immune || []).includes(t) ? -2 : (m.resist || []).includes(t) ? -1 : 0);
    return types.slice().sort((a, b) => score(b) - score(a))[0];
  },

  spellDamage(pc, s, up) {
    let e = s.damage;
    if (!e) return null;
    if (s.cantripDamage) {
      const n = CANTRIP_SCALE(pc.level);
      if (n > 1) e = e.replace(/^(\d*)d/, (_, k) => `${(k === '' ? 1 : +k) * n}d`);
    }
    if (up && s.upcast) e = addDice(e, up, s.upcast);
    const st = C.spellStats(pc, s.id);
    if (s.addMod) e += fmtMod(st.mod);
    if (s.id === 'eldritch_blast' && C.hasFeature(pc, 'inv_agonizing_blast')) e += fmtMod(st.mod);
    return e;
  },

  resolveAllyTargets(ids, kind) {
    const list = (Array.isArray(ids) ? ids : []).map((id) => this.pcs[id]).filter(Boolean);
    if (kind === 'dying') return list.filter((p) => p.hp <= 0 && !p.dead);
    return list.filter((p) => !p.dead);
  },
  resolveEnemyTargets(ids) {
    return [...new Set(Array.isArray(ids) ? ids : [])].map((id) => this.combat && this.combat.enemies[id]).filter((e) => e && !e.dead);
  },

  // ================================================================ menú de acciones en combate
  combatActions(pc) {
    const cb = this.combat;
    if (!cb || !pc) return [];
    const cur = this.current();
    if (!cur || cur.id !== pc.id || cb.busy || pc.hp <= 0 || pc.dead) return [];
    const ts = cb.turnState;
    const t = tpl(pc);
    const out = [];
    const add = (o) => out.push(o);
    const A = ts.action > 0;
    const B = ts.bonus > 0;
    const k = pc.conditions;
    const enemies = this.livingEnemies();
    const party = this.activePCs();
    const others = party.filter((p) => p.id !== pc.id);
    const dying = party.some((p) => p.hp <= 0 && !p.stable);
    const hurt = party.some((p) => p.hp < p.maxHp);
    const weapons = C.weaponAttacks(pc);
    const sneak = C.sneakDice(pc);
    const has = (f) => C.hasFeature(pc, f);
    const u = pc.uses;

    // ---- ataques con arma
    if (A) {
      for (const w of weapons) {
        const notes = [];
        if (w.mastery) notes.push(`maestría ${MASTERY[w.mastery]}: ${MASTERY_DESC[w.mastery]}`);
        if (sneak && (w.finesse || w.ranged)) notes.push(`Puede añadir Ataque furtivo (${sneak}).`);
        add({ key: `attack:${w.idx}`, cost: 'action', group: 'Atacar', ai: 'attack', label: `${w.name} (${fmtMod(w.toHit)}, ${w.dmg} ${w.type})`, target: 'enemy', desc: `Ataque con ${w.unarmed ? 'un golpe sin armas' : w.beast ? 'tu forma de bestia' : 'arma'}${w.ranged ? ' a distancia' : ''}. ${notes.map(cap).join(' ')}`.trim() });
      }
    }
    // Ligera: ataque extra con la otra arma ligera (Mellar: sin gastar la acción adicional)
    if (ts.attackedLight !== false && !ts.offhandUsed) {
      const ow = weapons.find((w) => w.light && w.melee && !w.unarmed && w.idx !== ts.attackedLight);
      const nick = ow && ow.mastery === 'nick' && !ts.nickUsed;
      if (ow && (nick || B)) {
        add({ key: 'offhand', cost: nick ? 'free' : 'bonus', group: 'Atacar', ai: 'attack', label: `Ataque con la otra mano (${ow.name})`, target: 'enemy', desc: `Combate con dos armas ligeras: un ataque extra con ${ow.name}${t.style === 'style_two_weapon' ? '' : ', sin sumar tu modificador al daño'}.${nick ? ' Mellar: no gasta tu acción adicional.' : ''}` });
      }
    }
    if (ts.cleaveReady !== undefined && ts.cleaveReady !== null && !ts.once.cleave && enemies.length > 1) {
      add({ key: 'cleave', cost: 'free', group: 'Atacar', ai: 'attack', label: `Hendir: ataca a otro enemigo (${weapons[ts.cleaveReady].name})`, target: 'enemy', desc: MASTERY_DESC.cleave });
    }
    if (ts.hordeReady && !ts.once.horde && enemies.length > 1 && weapons[ts.lastWeapon]) {
      add({ key: 'horde_breaker', cost: 'free', group: 'Atacar', ai: 'attack', label: `Rompehordas: ataca a otro enemigo (${weapons[ts.lastWeapon].name})`, target: 'enemy', desc: fdesc('horde_breaker') });
    }
    if (A && !pc.shape) {
      const dc = 8 + C.abilityMod(pc, 'str') + profBonus(pc.level);
      add({ key: 'shove', cost: 'action', group: 'Atacar', ai: 'misc', label: `Derribar de un empujón (CD ${dc})`, target: 'enemy', desc: 'Golpe sin armas especial: el objetivo hace una salvación de Fuerza o Destreza (la mejor) contra CD 8 + tu Fuerza + tu bonificador por competencia. Si falla, queda derribado: los ataques cuerpo a cuerpo contra él tienen ventaja.' });
    }
    if (t.breath && u.breath > 0 && A && !pc.shape) {
      add({ key: 'breath', cost: 'action', group: 'Rasgos', ai: 'attack', label: `Ataque de aliento (1d10 ${t.breath.type}, CD ${C.breathDC(pc)})`, target: 'enemies3', maxTargets: 3, desc: fdesc('breath_weapon') });
    }

    // ---- conjuros (no en furia ni transformado)
    const noSpells = k.raging || pc.shape;
    if (!noSpells) {
      for (const sid of C.knownSpells(pc)) {
        const s = SPELLS[sid];
        if (!s.combat || s.kind === 'reaction' || s.kind === 'smite') continue;
        if (s.time === 'action' ? !A : s.time === 'bonus' ? !B : true) continue;
        if (s.target === 'dying' && !dying) continue;
        if (s.needsWeapon && !t.weapons.some((w) => s.needsWeapon.includes(w.item))) continue;
        if (s.weaponSpell && !weapons.length) continue;
        if (s.kind === 'mark' && pc.concentration && pc.concentration.spell === sid) continue;
        if (sid === 'mage_armor' && (pc.mageArmor || t.armor.type !== 'none')) continue;
        if (pc.concentration && pc.concentration.spell === sid && s.repeat) continue;
        if (s.cond && s.target === 'self' && k[s.cond]) continue;
        if (sid === 'mirror_image' && pc.images > 0) continue;
        const opt = this.castOption(pc, sid);
        if (!opt) continue;
        const up = s.level ? opt.slot - s.level : 0;
        const base = { cost: s.time, group: 'Conjuros', ai: aiOf(s), target: castTarget(s), maxTargets: maxTargetsOf(s, up) };
        const tag = spellTag(s, opt);
        add({ key: 'spell:' + sid, ...base, label: `${s.name} (${tag})`, desc: s.desc + (s.conc ? ' Requiere concentración.' : '') });
        // Metamagia
        if (has('metamagic')) {
          for (const [m, M] of Object.entries(META)) {
            if (!has('meta_' + m) || (u.points || 0) < M.cost) continue;
            if (m === 'empowered' && !s.damage) continue;
            if (m === 'extended' && !s.conc && !(s.rounds >= 10)) continue;
            if (m === 'heightened' && s.kind !== 'save') continue;
            add({ key: `spell:${sid}@${m}`, ...base, group: 'Metamagia', label: `${s.name} ${M.name} (${tag}, ${M.cost} pto.)`, desc: `${M.desc} ${s.desc}` });
          }
        }
      }
      // Castigos: justo después de acertar con un arma
      const lh = ts.lastHit;
      const lt = lh && this.getCombatant(lh.targetId);
      if (lh && lt && !lt.dead && B) {
        for (const sid of C.knownSpells(pc)) {
          const s = SPELLS[sid];
          if (s.kind !== 'smite' || (!s.anyWeapon && !lh.melee)) continue;
          const opt = this.castOption(pc, sid);
          if (!opt) continue;
          add({ key: 'spell:' + sid, cost: 'bonus', group: 'Conjuros', ai: 'smite', label: `${s.name} sobre ${lt.name} (${spellTag(s, opt)})`, target: 'none', desc: s.desc });
        }
      }
    }
    // efectos de conjuros activos
    const cc = pc.concentration;
    if (cc && SPELLS[cc.spell]) {
      const s = SPELLS[cc.spell];
      const condKey = cc.spell === 'hex' ? 'hexed' : 'marked';
      if (s.kind === 'mark' && B && enemies.length && !enemies.some((e) => e.conditions[condKey] && e.conditions[condKey].by === pc.id)) {
        add({ key: 'move_mark', cost: 'bonus', group: 'Conjuros', ai: 'mark', label: `Mover ${s.name} a otro enemigo`, target: 'enemy', desc: 'Tu objetivo anterior ha caído: trasladas el conjuro a otra criatura.' });
      }
      if (cc.spell === 'spiritual_weapon' && B && !ts.once.spiritual) add({ key: 'spiritual_attack', cost: 'bonus', group: 'Conjuros', ai: 'attack', label: 'Atacar con el Arma espiritual', target: 'enemy', desc: s.desc });
      if (cc.spell === 'flaming_sphere' && B && !ts.once.sphere) add({ key: 'sphere_ram', cost: 'bonus', group: 'Conjuros', ai: 'attack', label: 'Embestir con la Esfera llameante', target: 'enemy', desc: s.desc });
      if (cc.spell === 'moonbeam' && A && !ts.once.moonbeam) add({ key: 'moonbeam_move', cost: 'action', group: 'Conjuros', ai: 'attack', label: 'Mover el Rayo de luna', target: 'enemy', desc: s.desc });
    }
    if (k.dragon_breath && A) add({ key: 'dragon_exhale', cost: 'action', group: 'Conjuros', ai: 'attack', label: `Exhalar aliento de dragón (${k.dragon_breath.dmg})`, target: 'enemies3', maxTargets: 3, desc: SPELLS.dragons_breath.desc });

    // ---- rasgos de clase y especie
    // Bárbaro
    if (u.rage > 0 && B && !k.raging && !pc.shape) add({ key: 'rage', cost: 'bonus', group: 'Rasgos', ai: 'self', label: `Furia (${u.rage} usos)`, target: 'none', desc: fdesc('rage') });
    if (has('reckless_attack') && A && !ts.attacked && !k.reckless) add({ key: 'reckless', cost: 'free', group: 'Rasgos', ai: 'self', label: 'Ataque temerario', target: 'none', desc: fdesc('reckless_attack') });
    // Bardo
    if (u.inspiration > 0 && B && others.some((p) => p.hp > 0 && !p.conditions.inspired)) add({ key: 'inspire', cost: 'bonus', group: 'Rasgos', ai: 'buff', label: `Inspiración bárdica (1d6, ${u.inspiration} usos)`, target: 'allyOther', desc: fdesc('bardic_inspiration') });
    // Clérigo
    if (has('channel_divinity_cleric') && u.channel > 0 && A) {
      add({ key: 'spark_heal', cost: 'action', group: 'Rasgos', ai: 'heal', label: `Chispa divina: curar (1d8${fmtMod(C.abilityMod(pc, 'wis'))})`, target: 'ally', desc: fdesc('channel_divinity_cleric') });
      add({ key: 'spark_harm', cost: 'action', group: 'Rasgos', ai: 'attack', label: 'Chispa divina: dañar (1d8 radiante o necrótico)', target: 'enemy', desc: fdesc('channel_divinity_cleric') });
      if (enemies.some((e) => MONSTERS[e.type].undead)) add({ key: 'turn_undead', cost: 'action', group: 'Rasgos', ai: 'control', label: 'Expulsar muertos vivientes', target: 'none', desc: fdesc('channel_divinity_cleric') });
      if (has('preserve_life') && party.some((p) => p.hp < p.maxHp / 2)) add({ key: 'preserve_life', cost: 'action', group: 'Rasgos', ai: 'heal', label: `Preservar la vida (${5 * pc.level} PG a repartir)`, target: 'none', desc: fdesc('preserve_life') });
    }
    // Druida
    if (has('wild_shape') && u.wild_shape > 0 && B && !pc.shape) {
      for (const [id, b] of Object.entries(BEASTS)) add({ key: `wild_shape:${id}`, cost: 'bonus', group: 'Rasgos', ai: 'self', label: `Forma salvaje: ${b.name} ${b.icon}`, target: 'none', desc: `CA ${b.ac}, ${b.attacks.map((a) => `${a.name} ${fmtMod(a.bonus)} (${a.dmg} ${a.type})`).join(', ')}. ${b.desc} Ganas ${pc.level} PG temporales y no puedes lanzar conjuros.` });
    }
    if (pc.shape && B) add({ key: 'revert', cost: 'bonus', group: 'Rasgos', ai: 'misc', label: 'Recuperar tu forma normal', target: 'none', desc: 'Dejas la Forma salvaje.' });
    if (pc.shape && BEASTS[pc.shape].stealth && B && !k.hidden) add({ key: 'hide', cost: 'bonus', group: 'Rasgos', ai: 'self', label: `Esconderse (Sigilo ${fmtMod(BEASTS[pc.shape].stealth)})`, target: 'none', desc: 'Prueba de Sigilo CD 15: si la superas, tu próximo ataque tiene ventaja.' });
    if (has('lands_aid') && u.wild_shape > 0 && A && !pc.shape) add({ key: 'lands_aid', cost: 'action', group: 'Rasgos', ai: 'attack', label: 'Ayuda de la tierra (2d6 necrótico y 2d6 de curación)', target: 'enemies3', maxTargets: 3, desc: fdesc('lands_aid') });
    // Guerrero
    if (u.second_wind > 0 && B) add({ key: 'second_wind', cost: 'bonus', group: 'Rasgos', ai: 'selfheal', label: `Tomar aliento (1d10+${pc.level} PG)`, target: 'none', desc: fdesc('second_wind') });
    if (u.action_surge > 0 && !ts.surge) add({ key: 'action_surge', cost: 'free', group: 'Rasgos', ai: 'surge', label: 'Oleada de acción (+1 acción)', target: 'none', desc: fdesc('action_surge') });
    // Monje
    const unarmed = weapons.find((w) => w.unarmed);
    if (unarmed && has('martial_arts') && B) {
      add({ key: 'martial_strike', cost: 'bonus', group: 'Rasgos', ai: 'attack', label: `Artes marciales: golpe sin armas (${unarmed.dmg})`, target: 'enemy', desc: fdesc('martial_arts') });
      if (u.focus > 0) {
        add({ key: 'flurry', cost: 'bonus', group: 'Rasgos', ai: 'attack', label: `Ráfaga de golpes (2 golpes, 1 pto. de concentración)`, target: 'enemy', desc: fdesc('monks_focus') + (has('open_hand_technique') ? ` ${fdesc('open_hand_technique')}` : '') });
        add({ key: 'patient_defense', cost: 'bonus', group: 'Rasgos', ai: 'defend', label: 'Defensa paciente (Esquivar, 1 pto.)', target: 'none', desc: fdesc('monks_focus') });
      }
    }
    // Paladín
    if (u.lay_on_hands > 0 && B && hurt) add({ key: 'lay_on_hands', cost: 'bonus', group: 'Rasgos', ai: 'heal', label: `Imposición de manos (reserva ${u.lay_on_hands})`, target: 'ally', desc: fdesc('lay_on_hands') });
    if (has('sacred_weapon') && u.channel > 0 && A && !k.sacred_weapon) add({ key: 'sacred_weapon', cost: 'free', group: 'Rasgos', ai: 'self', label: 'Arma sagrada (+Carisma al ataque)', target: 'none', desc: fdesc('sacred_weapon') });
    // Pícaro
    if (has('cunning_action') && B && !k.hidden && !pc.shape) add({ key: 'hide', cost: 'bonus', group: 'Rasgos', ai: 'self', label: `Acción astuta: esconderse (Sigilo ${fmtMod(C.skillMod(pc, 'stealth'))})`, target: 'none', desc: `${fdesc('cunning_action')} Prueba de Sigilo CD 15: si la superas, tu próximo ataque tiene ventaja.` });
    if (has('steady_aim') && B && !ts.attacked && !k.steady_aim) add({ key: 'steady_aim', cost: 'bonus', group: 'Rasgos', ai: 'self', label: 'Apuntar con cuidado (ventaja en tu próximo ataque)', target: 'none', desc: fdesc('steady_aim') });
    // Hechicero
    if (u.innate > 0 && B && !k.innate_sorcery) add({ key: 'innate_sorcery', cost: 'bonus', group: 'Rasgos', ai: 'self', label: `Hechicería innata (${u.innate} usos)`, target: 'none', desc: fdesc('innate_sorcery') });
    if (has('font_of_magic')) {
      const maxLvl = CLASSES.MAX_SPELL_LEVEL[t.caster.type][pc.level];
      if (B && u.points >= 2) add({ key: 'font:1', cost: 'bonus', group: 'Rasgos', ai: 'misc', label: 'Fuente de magia: crear espacio de nivel 1 (2 ptos.)', target: 'none', desc: fdesc('font_of_magic') });
      if (B && u.points >= 3 && maxLvl >= 2) add({ key: 'font:2', cost: 'bonus', group: 'Rasgos', ai: 'misc', label: 'Fuente de magia: crear espacio de nivel 2 (3 ptos.)', target: 'none', desc: fdesc('font_of_magic') });
      for (const [lvl, n] of Object.entries(pc.slots)) {
        if (n > 0 && (u.points || 0) + +lvl <= C.usesMax(pc).points) add({ key: `points:${lvl}`, cost: 'free', group: 'Rasgos', ai: 'misc', label: `Fuente de magia: espacio de nivel ${lvl} → ${lvl} pto.`, target: 'none', desc: fdesc('font_of_magic') });
      }
    }
    // Brujo
    if (has('inv_fiendish_vigor') && A && !noSpells && pc.tempHp < 12) add({ key: 'fiendish_vigor', cost: 'action', group: 'Rasgos', ai: 'defend', label: 'Vigor infernal (12 PG temporales)', target: 'none', desc: fdesc('inv_fiendish_vigor') });
    // Especies
    if (u.adrenaline > 0 && B) add({ key: 'adrenaline', cost: 'bonus', group: 'Rasgos', ai: 'self', label: `Descarga de adrenalina (+${profBonus(pc.level)} PG temporales)`, target: 'none', desc: fdesc('adrenaline_rush') });
    if (t.giant === 'cloud' && u.giant > 0 && B && (k.restrained || k.grappled)) add({ key: 'cloud_jaunt', cost: 'bonus', group: 'Rasgos', ai: 'self', label: 'Salto de las nubes (teletransporte)', target: 'none', desc: fdesc('giant_ancestry') });

    // ---- escapar de agarres y telarañas, arrancarse una estirge
    const hold = ['grappled', 'restrained'].find((x) => k[x] && k[x].escape);
    if (hold && A) add({ key: 'escape', cost: 'action', group: 'Otras', ai: 'escape', label: `Liberarte (${CONDITIONS[hold].name.toLowerCase()}, CD ${k[hold].escape})`, target: 'none', desc: hold === 'grappled' ? 'Prueba de Fuerza (Atletismo) o Destreza (Acrobacias), la que prefieras, contra la CD del agarre.' : 'Prueba de Fuerza (Atletismo) contra la CD para romper la telaraña.' });
    if (A && enemies.some((e) => e.attached === pc.id)) add({ key: 'detach', cost: 'action', group: 'Otras', ai: 'escape', label: 'Arrancarte la estirge', target: 'none', desc: 'Usas tu acción para desenganchar a la criatura que te chupa la sangre.' });

    // ---- objetos
    for (const [id, n] of Object.entries(pc.inventory)) {
      if (!(n > 0) || !ITEMS[id] || !ITEMS[id].heal) continue;
      if (B && pc.hp < pc.maxHp) add({ key: 'item:' + id, cost: 'bonus', group: 'Objetos', ai: 'selfheal', label: `Beber ${ITEMS[id].name} (×${n})`, target: 'none', desc: `${ITEMS[id].desc} Beberla es una acción adicional.` });
      if (A && others.some((p) => p.hp < p.maxHp)) add({ key: 'give:' + id, cost: 'action', group: 'Objetos', ai: 'heal', label: `Dar ${ITEMS[id].name} a un aliado`, target: 'ally', desc: `${ITEMS[id].desc} Dársela a otra criatura es una acción.` });
    }

    // ---- acciones generales
    if (A) {
      add({ key: 'dodge', cost: 'action', group: 'Otras', ai: 'defend', label: 'Esquivar', target: 'none', desc: CONDITIONS.dodging.desc });
      if (others.some((p) => p.hp > 0)) add({ key: 'help', cost: 'action', group: 'Otras', ai: 'misc', label: 'Ayudar a un aliado', target: 'allyOther', desc: 'El aliado elegido tiene ventaja en su próxima tirada de ataque.' });
      if (dying) add({ key: 'stabilize', cost: 'action', group: 'Otras', ai: 'revive', label: pc.inventory.healers_kit ? 'Estabilizar (kit de sanador)' : `Estabilizar (Medicina ${fmtMod(C.skillMod(pc, 'medicine'))} CD 10)`, target: 'dying', desc: 'Estabiliza a un aliado moribundo: deja de hacer salvaciones contra muerte.' });
    }
    add({ key: 'end', cost: 'free', group: 'Turno', ai: 'end', label: 'Terminar turno', target: 'none', desc: '' });
    return out;
  },

  doCombatAction(player, pc, msg) {
    const cb = this.combat;
    if (!cb) throw new Error('No hay combate');
    if (!pc) throw new Error('No tienes personaje');
    const cur = this.current();
    if (!cur || cur.id !== pc.id) throw new Error('No es tu turno');
    if (cb.busy) throw new Error('Espera un momento');
    cb.lastAct = Date.now();
    const a = this.combatActions(pc).find((x) => x.key === msg.key);
    if (!a) throw new Error('Esa acción no está disponible ahora');
    const ts = cb.turnState;
    const enemyT = this.resolveEnemyTargets(msg.targets);
    const allyT = this.resolveAllyTargets(msg.targets, a.target);
    if (['enemy', 'enemies3'].includes(a.target) && !enemyT.length) throw new Error('Elige un objetivo enemigo');
    if (['ally', 'allies', 'dying', 'allyOther'].includes(a.target) && !allyT.length) throw new Error('Elige un aliado');
    if (a.target === 'allyOther' && allyT[0].id === pc.id) throw new Error('Elige a otro aliado');
    const spend = () => { if (a.cost === 'action') ts.action -= 1; else if (a.cost === 'bonus') ts.bonus -= 1; };
    const t = tpl(pc);
    const weapons = C.weaponAttacks(pc);
    const target = enemyT[0];
    const ally = allyT[0];
    const key = a.key;

    if (key === 'end') { this.addLog('turn', `${pc.name} termina su turno.`); return this.endTurn(); }
    spend();
    const [head, arg] = key.split(':');
    switch (head) {
      case 'attack': {
        const w = weapons[+arg];
        if (w.light && w.melee && !w.unarmed) ts.attackedLight = w.idx;
        this.attackWith(pc, w, target);
        break;
      }
      case 'offhand': {
        const ow = weapons.find((w) => w.light && w.melee && !w.unarmed && w.idx !== ts.attackedLight);
        ts.offhandUsed = true;
        if (a.cost === 'free') ts.nickUsed = true;
        this.attackWith(pc, ow, target, { noMod: t.style !== 'style_two_weapon', label: ' (otra mano)' });
        break;
      }
      case 'cleave': {
        const w = weapons[ts.cleaveReady];
        if (ts.lastHit && target.id === ts.lastHit.targetId) throw new Error('Hendir: elige a otro enemigo');
        ts.once.cleave = true; ts.cleaveReady = null;
        this.attackWith(pc, w, target, { noMod: true, label: ' (Hendir)' });
        break;
      }
      case 'horde_breaker': {
        if (target.id === ts.lastTargetId) throw new Error('Rompehordas: elige a otro enemigo');
        ts.once.horde = true;
        this.attackWith(pc, weapons[ts.lastWeapon], target, { label: ' (Rompehordas)' });
        break;
      }
      case 'shove': {
        const m = MONSTERS[target.type];
        const dc = 8 + C.abilityMod(pc, 'str') + profBonus(pc.level);
        const sb = (ab) => (m.saves[ab] ?? mod(m.abilities[ab]));
        const ab = sb('str') >= sb('dex') ? 'str' : 'dex';
        const sv = this.monsterSave(target, ab, dc);
        ts.attacked = true;
        if (!sv.success && !this.setCond(target, 'prone', {})) break;
        this.addLog('roll', `${pc.name} intenta derribar a ${target.name} de un empujón: salvación de ${ABILITIES[ab].name} ${sv.text} → ${sv.success ? 'aguanta en pie' : '¡cae al suelo!'}.`, { success: !sv.success, fx: { kind: 'attack', who: pc.id, target: target.id, hit: !sv.success, shove: true } });
        break;
      }
      case 'breath': {
        pc.uses.breath -= 1;
        ts.attacked = true;
        const b = t.breath;
        const dc = C.breathDC(pc);
        const d = roll('1d10');
        this.addLog('spell', `🐉 ${pc.name} exhala su aliento de ${b.type} (${d.detail}).`, { fx: { kind: 'spell', who: pc.id, dmgType: b.type } });
        for (const e of enemyT.slice(0, 3)) this.saveDamage(pc, e, 'dex', dc, d, b.type, true);
        break;
      }
      case 'spell': {
        const [sid, meta] = arg.split('@');
        this.castSpell(pc, sid, enemyT, allyT, meta || null);
        break;
      }
      case 'move_mark': {
        const cc = pc.concentration;
        const condKey = cc.spell === 'hex' ? 'hexed' : 'marked';
        target.conditions[condKey] = { by: pc.id, conc: pc.id };
        cc.targets = [target.id];
        this.addLog('spell', `${pc.name} traslada ${SPELLS[cc.spell].name} a ${target.name}.`);
        break;
      }
      case 'spiritual_attack': {
        ts.once.spiritual = true;
        const st = C.spellStats(pc, 'spiritual_weapon');
        const s = SPELLS.spiritual_weapon;
        this.resolveAttack(pc, target, { bonus: st.attack, dmg: this.spellDamage(pc, s, pc.concentration.up || 0), dmgType: 'fuerza', label: 'el Arma espiritual', isSpell: true });
        break;
      }
      case 'sphere_ram': ts.once.sphere = true; this.placeArea(pc, 'flaming_sphere', target); break;
      case 'moonbeam_move': ts.once.moonbeam = true; this.placeArea(pc, 'moonbeam', target); break;
      case 'dragon_exhale': {
        const db = pc.conditions.dragon_breath;
        const d = roll(db.dmg);
        const type = this.bestType(db.types, enemyT[0]);
        this.addLog('spell', `🐲 ${pc.name} exhala un cono de energía (${d.detail}).`, { fx: { kind: 'spell', who: pc.id, dmgType: type } });
        for (const e of enemyT.slice(0, 3)) this.saveDamage(pc, e, 'dex', db.dc, d, type, true);
        break;
      }
      case 'rage': {
        pc.uses.rage -= 1;
        pc.conditions.raging = { rounds: 10 };
        if (pc.concentration) this.breakConcentration(pc, 'entra en furia');
        this.addLog('action', `😡 ${pc.name} entra en FURIA: resistencia al daño contundente, cortante y perforante, +2 al daño con Fuerza y ventaja en pruebas y salvaciones de Fuerza.`, { fx: { kind: 'buff', targets: [pc.id] } });
        break;
      }
      case 'reckless':
        pc.conditions.reckless = { untilStartOf: pc.id };
        this.addLog('action', `${pc.name} ataca de forma temeraria: ventaja en sus ataques con Fuerza este turno, pero los ataques contra él también tendrán ventaja hasta su próximo turno.`);
        break;
      case 'inspire':
        pc.uses.inspiration -= 1;
        ally.conditions.inspired = { die: '1d6' };
        this.addLog('action', `🎶 ${pc.name} inspira a ${ally.name}: podrá sumar 1d6 a una tirada con d20 que falle.`, { fx: { kind: 'buff', targets: [ally.id] } });
        break;
      case 'spark_heal': {
        pc.uses.channel -= 1;
        const r = roll(`1d8${fmtMod(C.abilityMod(pc, 'wis'))}`);
        const h = this.healPC(ally, Math.max(1, r.total));
        this.addLog('heal', `✨ ${pc.name} canaliza una Chispa divina: ${ally.name} recupera ${h} PG (${r.detail}). PG ${ally.hp}/${ally.maxHp}.`, { fx: { kind: 'spell', who: pc.id, heal: true } });
        break;
      }
      case 'spark_harm': {
        pc.uses.channel -= 1;
        const type = this.bestType(['radiante', 'necrótico'], target);
        this.addLog('spell', `✨ ${pc.name} canaliza una Chispa divina contra ${target.name}.`, { fx: { kind: 'spell', who: pc.id, dmgType: type } });
        this.saveDamage(pc, target, 'con', C.spellStats(pc).dc, roll(`1d8${fmtMod(C.abilityMod(pc, 'wis'))}`), type, true);
        break;
      }
      case 'turn_undead': {
        pc.uses.channel -= 1;
        const dc = C.spellStats(pc).dc;
        this.addLog('spell', `✨ ${pc.name} alza su símbolo sagrado: ¡Expulsar muertos vivientes!`, { fx: { kind: 'spell', who: pc.id, dmgType: 'radiante' } });
        for (const e of this.livingEnemies().filter((x) => MONSTERS[x.type].undead)) {
          const s = this.monsterSave(e, 'wis', dc);
          if (!s.success) { if (this.setCond(e, 'turned', { rounds: 10, breakOnDamage: true })) this.addLog('combat', `${e.name} huye aterrorizado (${s.text}).`); }
          else this.addLog('roll', `${e.name} resiste (${s.text}).`, { success: false });
        }
        break;
      }
      case 'preserve_life': {
        pc.uses.channel -= 1;
        let pool = 5 * pc.level;
        const parts = [];
        for (const p of this.activePCs().sort(byHurt)) {
          const room = Math.floor(p.maxHp / 2) - p.hp;
          if (room <= 0 || pool <= 0) continue;
          const h = this.healPC(p, Math.min(room, pool));
          pool -= h;
          parts.push(`${p.name} +${h}`);
        }
        this.addLog('heal', `✨ ${pc.name} usa Preservar la vida: ${parts.join(', ') || 'nadie lo necesita'}.`, { fx: { kind: 'spell', who: pc.id, heal: true } });
        break;
      }
      case 'wild_shape': {
        const b = BEASTS[arg];
        pc.uses.wild_shape -= 1;
        pc.shape = arg;
        pc.tempHp = Math.max(pc.tempHp, pc.level);
        this.addLog('action', `${b.icon} ${pc.name} adopta la Forma salvaje: ¡se convierte en ${b.name.toLowerCase()}! (CA ${b.ac}, ${pc.tempHp} PG temporales)`, { fx: { kind: 'buff', targets: [pc.id] } });
        break;
      }
      case 'revert':
        pc.shape = null;
        this.addLog('action', `${pc.name} recupera su forma normal.`);
        break;
      case 'lands_aid': {
        pc.uses.wild_shape -= 1;
        const dc = C.spellStats(pc).dc;
        const d = roll('2d6');
        this.addLog('spell', `🌿 ${pc.name} invoca la Ayuda de la tierra: brotan espinos (${d.detail}).`, { fx: { kind: 'spell', who: pc.id, dmgType: 'necrótico' } });
        for (const e of enemyT.slice(0, 3)) this.saveDamage(pc, e, 'con', dc, d, 'necrótico', true);
        const p = this.activePCs().filter((x) => x.hp < x.maxHp).sort(byHurt)[0];
        if (p) { const r = roll('2d6'); const h = this.healPC(p, r.total); this.addLog('heal', `${p.name} recupera ${h} PG (${r.detail}).`); }
        break;
      }
      case 'second_wind': {
        pc.uses.second_wind -= 1;
        const r = roll(`1d10+${pc.level}`);
        const h = this.healPC(pc, r.total);
        this.addLog('heal', `${pc.name} usa Tomar aliento y recupera ${h} PG (${r.detail}).`);
        break;
      }
      case 'action_surge':
        pc.uses.action_surge -= 1; ts.action += 1; ts.surge = true;
        this.addLog('action', `⚡ ${pc.name} usa Oleada de acción: ¡una acción más este turno!`);
        break;
      case 'martial_strike': this.attackWith(pc, weapons.find((w) => w.unarmed), target, { label: ' (artes marciales)' }); break;
      case 'flurry': {
        pc.uses.focus -= 1;
        const w = weapons.find((x) => x.unarmed);
        this.addLog('action', `👊 ${pc.name} desata una Ráfaga de golpes.`);
        let tg = target;
        for (let i = 0; i < 2; i++) {
          if (!this.combat || !tg || tg.dead) tg = this.livingEnemies()[0];
          if (!this.combat || !tg) break;
          this.attackWith(pc, w, tg, { label: ` (ráfaga ${i + 1}/2)`, openHand: C.hasFeature(pc, 'open_hand_technique') });
        }
        break;
      }
      case 'patient_defense':
        pc.uses.focus -= 1;
        pc.conditions.dodging = {};
        this.addLog('action', `${pc.name} adopta una Defensa paciente: los ataques contra él tienen desventaja.`);
        break;
      case 'lay_on_hands': this.layOnHands(pc, ally); break;
      case 'sacred_weapon':
        pc.uses.channel -= 1;
        pc.conditions.sacred_weapon = { rounds: 100 };
        this.addLog('action', `✨ ${pc.name} consagra su arma: suma su Carisma a las tiradas de ataque y el arma brilla con luz sagrada.`, { fx: { kind: 'buff', targets: [pc.id] } });
        break;
      case 'hide': {
        const m = pc.shape ? BEASTS[pc.shape].stealth : C.skillMod(pc, 'stealth');
        const r = this.d20For(pc);
        const total = r.natural + m;
        const ok = total >= 15;
        if (ok) pc.conditions.hidden = {};
        this.addLog('roll', `${pc.name} intenta esconderse: Sigilo d20(${r.natural})${fmtMod(m)} = ${total} vs CD 15 → ${ok ? 'se oculta (ventaja en su próximo ataque)' : 'no encuentra dónde'}.`, { success: ok });
        break;
      }
      case 'steady_aim':
        pc.conditions.steady_aim = { untilEndOf: pc.id, turns: 1 };
        this.addLog('action', `${pc.name} se queda quieto y apunta con cuidado: ventaja en su próximo ataque.`);
        break;
      case 'innate_sorcery':
        pc.uses.innate -= 1;
        pc.conditions.innate_sorcery = { rounds: 10 };
        this.addLog('action', `🔥 ${pc.name} desata su Hechicería innata: +1 a la CD de sus conjuros de hechicero y ventaja en sus ataques de conjuro.`, { fx: { kind: 'buff', targets: [pc.id] } });
        break;
      case 'font': {
        const lvl = +arg;
        pc.uses.points -= lvl === 1 ? 2 : 3;
        pc.slots[lvl] = (pc.slots[lvl] || 0) + 1;
        this.addLog('action', `${pc.name} convierte puntos de hechicería en un espacio de conjuro de nivel ${lvl}.`);
        break;
      }
      case 'points': {
        const lvl = +arg;
        pc.slots[lvl] -= 1;
        pc.uses.points = (pc.uses.points || 0) + lvl;
        this.addLog('action', `${pc.name} convierte un espacio de nivel ${lvl} en ${lvl} punto${lvl > 1 ? 's' : ''} de hechicería.`);
        break;
      }
      case 'fiendish_vigor':
        pc.tempHp = Math.max(pc.tempHp, 12);
        delete pc.conditions.sanctuary; delete pc.conditions.invisible;
        this.addLog('spell', `😈 ${pc.name} lanza Vida falsa con Vigor infernal: 12 PG temporales.`, { fx: { kind: 'buff', targets: [pc.id] } });
        break;
      case 'adrenaline': {
        pc.uses.adrenaline -= 1;
        const n = profBonus(pc.level);
        pc.tempHp = Math.max(pc.tempHp, n);
        this.addLog('action', `💢 ${pc.name} sufre una Descarga de adrenalina: corre como un rayo y gana ${n} PG temporales.`);
        break;
      }
      case 'cloud_jaunt':
        pc.uses.giant -= 1;
        delete pc.conditions.restrained; delete pc.conditions.grappled;
        this.addLog('action', `☁️ ${pc.name} se desvanece en una nube y reaparece unos metros más allá, libre.`);
        break;
      case 'item': this.useItem(pc, arg, pc); break;
      case 'give': this.useItem(pc, arg, ally); break;
      case 'dodge':
        pc.conditions.dodging = {};
        this.addLog('action', `${pc.name} adopta una postura defensiva (Esquivar): los ataques contra él tienen desventaja.`);
        break;
      case 'help':
        ally.conditions.helped = {};
        this.addLog('action', `${pc.name} distrae a los enemigos para ayudar a ${ally.name}: su próximo ataque tendrá ventaja.`);
        break;
      case 'stabilize': this.stabilize(pc, ally); break;
      case 'escape': {
        const key = ['grappled', 'restrained'].find((x) => pc.conditions[x] && pc.conditions[x].escape);
        const dc = pc.conditions[key].escape;
        const skill = key === 'grappled' && C.skillMod(pc, 'acrobatics') > C.skillMod(pc, 'athletics') ? 'acrobatics' : 'athletics';
        const m = C.skillMod(pc, skill);
        const r = this.d20For(pc, pc.conditions.raging && skill === 'athletics' ? 'adv' : 'normal');
        const ok = r.natural + m >= dc;
        if (ok) delete pc.conditions[key];
        this.addLog('roll', `${pc.name} intenta liberarse: ${skill === 'athletics' ? 'Atletismo' : 'Acrobacias'} d20(${r.natural})${fmtMod(m)} = ${r.natural + m} vs CD ${dc} → ${ok ? '¡se suelta!' : 'sigue atrapado'}.`, { success: ok });
        break;
      }
      case 'detach':
        for (const e of this.livingEnemies()) if (e.attached === pc.id) e.attached = null;
        this.addLog('action', `${pc.name} se arranca la estirge de un tirón.`);
        break;
      default: throw new Error('Acción desconocida');
    }
    if (this.combat === cb && !this.checkCombatEnd()) {
      // fin automático del turno si ya no quedan opciones útiles
      const useful = ['offhand', 'cleave', 'horde_breaker', 'action_surge'];
      const left = this.combatActions(pc).filter((x) => x.key !== 'end' && (x.cost !== 'free' || useful.includes(x.key)));
      if (!left.length || pc.hp <= 0) this.endTurn();
    }
  },

  /** Ataque con un arma (o forma de bestia). opts: noMod (sin modificador al daño), label, openHand */
  attackWith(pc, w, target, opts = {}) {
    const ts = this.combat.turnState;
    let dmg = w.dmg;
    if (opts.noMod && w.abilityMod > 0) {
      const keep = w.bonus - w.abilityMod;
      dmg = `${w.die}${keep ? fmtMod(keep) : ''}`;
    }
    const extra = [];
    let charge = false;
    if (w.beast) {
      const b = BEASTS[pc.shape].attacks[w.idx];
      if (b.charge && !ts.once.charge) { ts.once.charge = true; charge = true; extra.push({ label: 'embestida', dmg: b.charge }); }
    }
    const onHit = (tg) => {
      if (charge && !tg.conditions.prone && !this.immuneTo(tg, 'prone')) { tg.conditions.prone = {}; this.addLog('combat', `${tg.name} cae derribado por la embestida.`); }
      if (opts.openHand) {
        const dc = C.classDC(pc, 'wis');
        if (!tg.conditions.prone && !this.immuneTo(tg, 'prone')) {
          const sv = this.saveFor(tg, 'dex', dc);
          if (!sv.success) { tg.conditions.prone = {}; this.addLog('combat', `Mano abierta: ${tg.name} cae derribado (${sv.text}).`); }
        } else { tg.conditions.addled = { untilStartOf: tg.id }; this.addLog('combat', `Mano abierta: ${tg.name} queda aturdido y no puede reaccionar.`); }
      }
    };
    ts.attacked = true;
    ts.lastWeapon = w.idx; ts.lastTargetId = target.id;
    if (C.hasFeature(pc, 'horde_breaker')) ts.hordeReady = true;
    return this.resolveAttack(pc, target, {
      bonus: w.toHit, dmg, dmgType: w.type, ranged: w.ranged, label: w.name + (opts.label || ''), critOn: C.critRange(pc), weapon: w, gwf: w.gwf,
      sneak: (w.finesse || w.ranged) ? C.sneakDice(pc) : null, extraOnHit: extra, onHit,
    });
  },

  /** Salvación contra daño ya tirado: aplica todo o la mitad */
  saveDamage(pc, e, ability, dc, d, type, half, opts = {}) {
    const sv = this.saveFor(e, ability, dc, { spell: true, ...opts });
    const amount = sv.success ? (half ? Math.floor(d.total / 2) : 0) : d.total;
    this.addLog('attack', `${e.name}: salvación de ${ABILITIES[ability].name} ${sv.text} → ${sv.success ? 'éxito' : 'fallo'}; ${amount} de daño ${type}.`, { success: !sv.success, fx: { kind: 'attack', who: pc.id, target: e.id, hit: !sv.success } });
    if (amount > 0) this.applyDamage(e, amount, { type, attacker: pc });
    return sv;
  },

  useItem(pc, id, target) {
    if (!pc.inventory[id]) throw new Error('No te quedan');
    pc.inventory[id] -= 1;
    if (!pc.inventory[id]) delete pc.inventory[id];
    const r = roll(ITEMS[id].heal);
    const h = this.healPC(target, r.total);
    this.addLog('heal', `🧪 ${pc.name} ${target.id === pc.id ? 'bebe' : `le da a ${target.name}`} una ${ITEMS[id].name}: recupera ${h} PG (${r.detail}). PG ${target.hp}/${target.maxHp}.`, { fx: { kind: 'heal', target: target.id, amount: h } });
  },

  stabilize(pc, target) {
    if (pc.inventory.healers_kit) {
      target.stable = true; target.deathSaves = { s: 0, f: 0 };
      this.addLog('heal', `${pc.name} estabiliza a ${target.name} con su kit de sanador.`);
      return;
    }
    const m = C.skillMod(pc, 'medicine');
    const r = this.d20For(pc).natural;
    const ok = r + m >= 10;
    if (ok) { target.stable = true; target.deathSaves = { s: 0, f: 0 }; }
    this.addLog('roll', `${pc.name} intenta estabilizar a ${target.name}: Medicina d20(${r})${fmtMod(m)} = ${r + m} vs CD 10 → ${ok ? 'estable' : 'falla'}.`, { success: ok });
  },

  layOnHands(pc, target) {
    const need = target.maxHp - target.hp;
    if (need <= 0) throw new Error(`${target.name} no está herido`);
    const amount = Math.min(pc.uses.lay_on_hands, need);
    pc.uses.lay_on_hands -= amount;
    const h = this.healPC(target, amount);
    this.addLog('heal', `🙌 ${pc.name} impone las manos sobre ${target.name}: recupera ${h} PG (quedan ${pc.uses.lay_on_hands} en la reserva).`, { fx: { kind: 'spell', who: pc.id, heal: true } });
  },

  /** Coloca (o mueve) un efecto de área persistente sobre un enemigo: Esfera llameante o Rayo de luna */
  placeArea(pc, sid, target) {
    const s = SPELLS[sid];
    const cc = pc.concentration;
    const condKey = AREA_COND[sid];
    this.clearConds((v, k) => k === condKey && v.conc === pc.id);
    const expr = this.spellDamage(pc, s, (cc && cc.up) || 0);
    const dc = (cc && cc.dc) || C.spellStats(pc, sid).dc;
    if (cc) cc.targets = [target.id];
    const d = roll(expr);
    this.saveDamage(pc, target, s.save, dc, d, s.dmgType, true);
    if (!target.dead) target.conditions[condKey] = { conc: pc.id, dot: { dmg: expr, type: s.dmgType, save: s.save, dc, end: true, keep: true } };
  },

  // ================================================================ lanzar conjuros
  castSpell(pc, sid, enemies, allies, meta = null) {
    const s = SPELLS[sid];
    if (!s) throw new Error('Conjuro desconocido');
    const ts = this.combat ? this.combat.turnState : null;
    const opt = this.castOption(pc, sid);
    if (!opt) throw new Error('No puedes lanzar ese conjuro ahora');
    if (meta && (!META[meta] || (pc.uses.points || 0) < META[meta].cost)) throw new Error('No tienes puntos de hechicería');
    const st = C.spellStats(pc, sid);
    const src = C.spellSource(pc, sid) || {};
    const slot = opt.slot;
    if (opt.free) pc.uses[opt.free] -= 1;
    else if (s.level > 0) { pc.slots[slot] -= 1; if (ts) ts.slotUsed = true; }
    if (meta) pc.uses.points -= META[meta].cost;
    const up = s.level > 0 ? slot - s.level : 0;
    const ext = meta === 'extended' ? 2 : 1;
    const emp = meta === 'empowered' ? Math.max(1, C.abilityMod(pc, 'cha')) : 0;
    delete pc.conditions.sanctuary;
    delete pc.conditions.invisible;
    this.addLog('spell', `✨ ${pc.name} lanza ${s.name}${s.level && !opt.free ? ` (espacio de nivel ${slot})` : ''}${opt.free ? ' (sin gastar espacio)' : ''}${meta ? ` — conjuro ${META[meta].name}` : ''}.`, { fx: { kind: 'spell', who: pc.id, school: s.school, dmgType: s.dmgType || null, heal: s.kind === 'heal' } });
    if (s.conc) this.startConcentration(pc, sid, { rounds: (s.rounds || 10) * ext, extended: ext > 1, up, dc: st.dc, markable: s.kind === 'mark' });
    const target = enemies[0];
    const ally = allies[0] || pc;
    const potent = s.cantripDamage && C.hasFeature(pc, 'potent_cantrip');
    const condFor = (c, e) => {
      switch (c) {
        case 'slowed_frost': return { untilStartOf: pc.id };
        case 'addled': return { untilStartOf: e.id };
        case 'guided': return { untilEndOf: pc.id, turns: 2 };
        case 'sapped': return { untilEndOf: e.id, turns: 1 };
        case 'acid': return { dot: { dmg: addDice('2d4', up, '1d4'), type: 'ácido', end: true } };
        case 'drowsy': return { conc: pc.id, dc: st.dc };
        default: {
          const v = {};
          if (s.conc) v.conc = pc.id;
          if (s.untilCasterEnd) { v.untilEndOf = pc.id; v.turns = 2; }
          if (s.saveEnds) v.saveEnds = { save: s.saveEnds, dc: st.dc };
          if (s.breakOnDamage) v.breakOnDamage = true;
          return v;
        }
      }
    };

    switch (sid) {
      case 'magic_missile': {
        const darts = s.darts + up;
        const tg = enemies.slice(0, darts);
        const hits = {};
        for (let i = 0; i < darts; i++) { const e = tg[i % tg.length]; hits[e.id] = (hits[e.id] || 0) + 1; }
        for (const e of tg) {
          const n = hits[e.id];
          const r = empower(roll(`${n}d4+${n}`), emp);
          this.addLog('attack', `${n} dardo${n > 1 ? 's' : ''} de fuerza impacta${n > 1 ? 'n' : ''} automáticamente a ${e.name}: ${r.total} de daño de fuerza (${r.detail}).`, { success: true, fx: { kind: 'attack', who: pc.id, target: e.id, hit: true } });
          this.applyDamage(e, r.total, { type: 'fuerza', attacker: pc });
        }
        break;
      }
      case 'scorching_ray': {
        const rays = s.rays + up;
        for (let i = 0; i < rays; i++) {
          let e = enemies[i % enemies.length];
          if (!e || e.dead) e = this.livingEnemies()[0];
          if (!e || !this.combat) break;
          this.resolveAttack(pc, e, { bonus: st.attack, dmg: s.damage, dmgType: s.dmgType, ranged: true, label: `Rayo abrasador (${i + 1}/${rays})`, isSpell: true, spellCls: src.cls, seeking: C.hasFeature(pc, 'meta_seeking'), empower: emp });
        }
        break;
      }
      case 'true_strike': {
        const ws = C.weaponAttacks(pc);
        const w = ws.find((x) => x.melee) || ws[0];
        const magic = w.bonus - w.abilityMod - (pc.conditions.raging && w.ability === 'str' ? 2 : 0);
        const type = this.bestType([w.type, 'radiante'], target);
        const atk = { ...w, abilityMod: st.mod };
        this.resolveAttack(pc, target, { bonus: st.attack + (w.toHit - w.abilityMod - profBonus(pc.level)), dmg: `${w.die}${fmtMod(st.mod + magic)}`, dmgType: type, ranged: w.ranged, label: `${w.name} (Golpe certero)`, critOn: C.critRange(pc), weapon: atk, sneak: (w.finesse || w.ranged) ? C.sneakDice(pc) : null });
        ts && (ts.attacked = true);
        break;
      }
      case 'flaming_sphere':
      case 'moonbeam':
        if (ts) ts.once[sid === 'moonbeam' ? 'moonbeam' : 'sphere'] = true;
        this.placeArea(pc, sid, target);
        break;
      case 'spiritual_weapon':
        if (ts) ts.once.spiritual = true;
        this.resolveAttack(pc, target, { bonus: st.attack, dmg: this.spellDamage(pc, s, up), dmgType: 'fuerza', label: 'el Arma espiritual', isSpell: true, spellCls: src.cls });
        break;
      case 'ice_knife': {
        const expr = this.spellDamage(pc, s, 0);
        this.resolveAttack(pc, target, { bonus: st.attack, dmg: expr, dmgType: s.dmgType, ranged: true, label: s.name, isSpell: true, spellCls: src.cls, seeking: C.hasFeature(pc, 'meta_seeking'), empower: emp });
        if (!this.combat) break;
        const b = s.burst;
        const d = empower(roll(addDice(b.damage, up, b.upcast)), emp);
        this.addLog('spell', `El cuchillo estalla en esquirlas de hielo (${d.detail}).`);
        const near = [target, ...this.livingEnemies().filter((e) => e.id !== target.id)].filter((e) => !e.dead).slice(0, b.max);
        near.forEach((e, i) => this.saveDamage(pc, e, b.save, st.dc, d, b.dmgType, false, { dis: meta === 'heightened' && i === 0 }));
        break;
      }
      case 'spare_the_dying':
        ally.stable = true; ally.deathSaves = { s: 0, f: 0 };
        this.addLog('heal', `${ally.name} queda estable.`);
        break;
      case 'guidance':
        ally.guidance = true;
        this.addLog('spell', `${ally.name} sumará 1d4 a su próxima prueba de característica.`);
        break;
      case 'false_life': {
        const r = roll(`2d4+${4 + 5 * up}`);
        pc.tempHp = Math.max(pc.tempHp, r.total);
        this.addLog('heal', `${pc.name} se envuelve en vida falsa: ${pc.tempHp} PG temporales (${r.detail}).`, { fx: { kind: 'buff', targets: [pc.id] } });
        break;
      }
      case 'goodberry': {
        let pool = 10;
        const parts = [];
        for (const p of this.activePCs().sort(byHurt)) {
          if (pool <= 0 || p.hp >= p.maxHp) continue;
          const h = this.healPC(p, Math.min(pool, p.maxHp - p.hp, 4));
          pool -= h; parts.push(`${p.name} +${h}`);
        }
        this.addLog('heal', `🫐 Aparecen diez bayas mágicas. ${parts.length ? `Os las coméis: ${parts.join(', ')} PG.` : 'Las guardáis para más tarde.'}`);
        break;
      }
      case 'mage_armor':
        pc.mageArmor = true;
        this.addLog('spell', `Una fuerza protectora envuelve a ${pc.name}: su CA pasa a ser ${C.armorClass(pc)}.`);
        break;
      case 'aid': {
        const amount = 5 + 5 * up;
        const tg = (allies.length ? allies : [pc]).slice(0, 3);
        for (const p of tg) {
          if ((p.bonusHp || 0) >= amount) continue;
          const delta = amount - (p.bonusHp || 0);
          p.bonusHp = amount; p.maxHp += delta; if (p.hp > 0 || this.combat) p.hp += delta;
          if (p.hp > 0) { delete p.conditions.unconscious; p.stable = false; p.deathSaves = { s: 0, f: 0 }; }
        }
        this.addLog('heal', `🛡️ ${tg.map((p) => p.name).join(', ')}: +${amount} PG máximos y actuales mientras dure la aventura.`, { fx: { kind: 'buff', targets: tg.map((p) => p.id) } });
        break;
      }
      case 'enhance_ability':
        ally.enhanced = true;
        this.addLog('spell', `${ally.name} tiene ventaja en sus pruebas de característica en esta escena.`);
        break;
      case 'lesser_restoration': {
        const removed = ['blinded', 'deafened', 'paralyzed', 'poisoned'].filter((k) => ally.conditions[k]);
        for (const k of removed) delete ally.conditions[k];
        this.addLog('heal', removed.length ? `${ally.name} se libra de: ${removed.map((k) => CONDITIONS[k].name.toLowerCase()).join(', ')}.` : `${ally.name} no tenía ningún estado que curar.`);
        break;
      }
      case 'mirror_image':
        pc.images = 3;
        this.addLog('spell', `Aparecen tres duplicados ilusorios de ${pc.name} que imitan cada uno de sus movimientos.`, { fx: { kind: 'buff', targets: [pc.id] } });
        break;
      case 'misty_step':
        delete pc.conditions.grappled; delete pc.conditions.restrained;
        this.addLog('spell', `${pc.name} desaparece en una voluta de niebla plateada y reaparece a unos metros.`);
        break;
      case 'pass_without_trace':
        this.scene.pwt = true;
        this.addLog('spell', 'Un velo de sombras y silencio envuelve al grupo: +10 a las pruebas de Sigilo en esta escena.');
        break;
      case 'prayer_of_healing': {
        const parts = [];
        for (const p of this.activePCs().slice(0, 5)) {
          const r = roll(`${addDice('2d8', up, '1d8')}${fmtMod(st.mod)}`);
          parts.push(`${p.name} +${this.healPC(p, r.total)}`);
        }
        this.addLog('heal', `🙏 Plegaria de curación: ${parts.join(', ')} PG.`, { fx: { kind: 'spell', who: pc.id, heal: true } });
        break;
      }
      default:
        this.castGeneric(pc, s, { enemies, allies, ally, target, up, st, src, ext, emp, meta, potent, condFor, slot });
    }

    // Concentración sin ningún efecto activo: se termina
    const cc = pc.concentration;
    if (s.conc && cc && cc.spell === sid && !s.repeat && s.kind !== 'mark' && !this.allCombatants().some((o) => Object.values(o.conditions).some((v) => v && v.conc === pc.id))) {
      pc.concentration = null;
      this.addLog('spell', `Nadie queda bajo los efectos de ${s.name}: ${pc.name} deja de concentrarse.`);
    }
  },

  castGeneric(pc, s, x) {
    const { enemies, allies, target, up, st, src, ext, emp, meta, potent, condFor, slot } = x;
    const ts = this.combat ? this.combat.turnState : null;
    switch (s.kind) {
      case 'attack': {
        const expr = this.spellDamage(pc, s, up);
        const type = s.anyType ? this.bestType(s.anyType, target) : s.dmgType;
        this.resolveAttack(pc, target, {
          bonus: st.attack, dmg: expr, dmgType: type, ranged: !s.melee, label: s.name, isSpell: true, spellCls: src.cls,
          seeking: C.hasFeature(pc, 'meta_seeking'), empower: emp,
          onHit: (t) => { if (s.cond && !t.dead) this.setCond(t, s.cond, condFor(s.cond, t), true); },
          onMiss: (t) => {
            if (!s.missHalf && !potent) return;
            const d = roll(expr);
            const amt = Math.floor(d.total / 2);
            this.addLog('combat', `${s.missHalf ? 'Aun así, el ácido salpica' : 'Truco potente: la energía alcanza igualmente'} a ${t.name}: ${amt} de daño ${type}.`);
            if (amt > 0) this.applyDamage(t, amt, { type, attacker: pc });
          },
        });
        break;
      }
      case 'save': {
        let tg = enemies.slice(0, maxTargetsOf(s, up));
        if (s.onlyType) {
          for (const e of tg.filter((e) => MONSTERS[e.type].type !== s.onlyType)) this.addLog('combat', `${e.name} no es ${s.onlyType}: el conjuro no le afecta.`);
          tg = tg.filter((e) => MONSTERS[e.type].type === s.onlyType);
        }
        const expr = this.spellDamage(pc, s, up);
        const d = expr ? empower(roll(expr), emp) : null;
        if (d && tg.length) this.addLog('spell', `Daño del conjuro: ${d.detail} = ${d.total}.`);
        tg.forEach((e, i) => {
          if (e.dead) return;
          const m = MONSTERS[e.type];
          if (s.cond === 'drowsy' && (this.immuneTo(e, 'drowsy') || m.undead)) { this.addLog('combat', `${e.name} no duerme nunca: Dormir no le afecta.`); return; }
          const sv = this.monsterSave(e, s.save, st.dc, { spell: true, dis: meta === 'heightened' && i === 0 });
          let amount = 0;
          if (d) amount = sv.success ? (s.half || potent ? Math.floor(d.total / 2) : 0) : d.total;
          const condName = s.cond && CONDITIONS[s.cond] ? CONDITIONS[s.cond].name.toLowerCase() : null;
          const what = [d ? `${amount} de daño ${s.dmgType}` : null, !sv.success && condName ? `queda ${condName}` : null].filter(Boolean).join(' y ');
          this.addLog('attack', `${e.name}: salvación de ${ABILITIES[s.save].name} ${sv.text} → ${sv.success ? 'éxito' : 'fallo'}${what ? `; ${what}` : sv.success ? '; no le afecta' : ''}.`, { success: !sv.success, fx: { kind: 'attack', who: pc.id, target: e.id, hit: !sv.success } });
          if (amount > 0) this.applyDamage(e, amount, { type: s.dmgType, attacker: pc });
          if (!sv.success && s.cond && !e.dead) {
            if (this.setCond(e, s.cond, condFor(s.cond, e)) && s.cond === 'laughing') this.setCond(e, 'prone', { conc: pc.id }, true);
          }
        });
        break;
      }
      case 'heal': {
        const target = allies[0] || pc;
        const expr = `${addDice(s.heal, up, s.upcast)}${fmtMod(st.mod)}`;
        const r = roll(expr);
        const bonus = C.hasFeature(pc, 'disciple_of_life') ? 2 + slot : 0;
        const h = this.healPC(target, Math.max(1, r.total + bonus));
        this.addLog('heal', `${target.name} recupera ${h} PG (${r.detail}${bonus ? ` +${bonus} Discípulo de la vida` : ''}). PG ${target.hp}/${target.maxHp}.`, { fx: { kind: 'heal', target: target.id, amount: h } });
        break;
      }
      case 'buff': {
        const tg = s.target === 'self' ? [pc] : (allies.length ? allies : [pc]).slice(0, maxTargetsOf(s, up));
        for (const p of tg) {
          const v = { rounds: (s.rounds || 10) * ext };
          if (s.conc) v.conc = pc.id;
          if (s.cond === 'heroism') v.amount = Math.max(1, st.mod);
          if (s.cond === 'sanctuary') v.dc = st.dc;
          if (s.cond === 'dragon_breath') { v.dc = st.dc; v.dmg = addDice('3d6', up, '1d6'); v.types = ['fuego', 'frío', 'relámpago', 'ácido', 'veneno']; }
          p.conditions[s.cond] = v;
          if (s.cond === 'heroism') p.tempHp = Math.max(p.tempHp, v.amount);
        }
        const nm = CONDITIONS[s.cond] ? CONDITIONS[s.cond].name : s.name;
        this.addLog('spell', `${tg.map((p) => p.name).join(', ')} ${tg.length > 1 ? 'quedan' : 'queda'} bajo los efectos de ${s.name}${nm !== s.name ? ` (${nm.toLowerCase()})` : ''}.`, { fx: { kind: 'buff', targets: tg.map((p) => p.id) } });
        break;
      }
      case 'mark': {
        const key = s.id === 'hex' ? 'hexed' : 'marked';
        target.conditions[key] = { by: pc.id, conc: pc.id };
        pc.concentration.targets = [target.id];
        this.addLog('spell', `${target.name} queda marcado: ${pc.name} le hará ${s.dmg} de daño ${s.dmgType} extra cada vez que le acierte.`);
        break;
      }
      case 'smite': {
        const lh = ts && ts.lastHit;
        const e = lh && this.getCombatant(lh.targetId);
        if (!e || e.dead) break;
        ts.lastHit = null;
        const crit = lh.crit;
        const dmgRoll = (expr) => roll(crit ? critExpr(expr) : expr);
        if (s.id === 'divine_smite') {
          let expr = addDice('2d8', up, '1d8');
          const extra = UNDEAD_FIEND.includes(MONSTERS[e.type].type);
          if (extra) expr = addDice(expr, 1, '1d8');
          const d = empower(dmgRoll(expr), emp);
          this.addLog('attack', `⚡ El arma de ${pc.name} estalla en luz divina: ${d.total} de daño radiante a ${e.name} (${d.detail}${extra ? ', +1d8 contra muertos vivientes e infernales' : ''}${crit ? ', crítico' : ''}).`, { success: true, fx: { kind: 'attack', who: pc.id, target: e.id, hit: true } });
          this.applyDamage(e, d.total, { type: 'radiante', attacker: pc });
        } else if (s.id === 'searing_smite') {
          const d = empower(dmgRoll(addDice('1d6', up, '1d6')), emp);
          this.addLog('attack', `🔥 ${e.name} arde: ${d.total} de daño de fuego (${d.detail}).`, { success: true });
          this.applyDamage(e, d.total, { type: 'fuego', attacker: pc });
          if (!e.dead) e.conditions.burning = { dot: { dmg: '1d6', type: 'fuego', start: true, save: 'con', dc: st.dc } };
        } else if (s.id === 'shining_smite') {
          const d = empower(dmgRoll(addDice('2d6', up, '1d6')), emp);
          this.addLog('attack', `✨ ${e.name} recibe ${d.total} de daño radiante (${d.detail}) y queda rodeado de luz: los ataques contra él tienen ventaja.`, { success: true });
          this.applyDamage(e, d.total, { type: 'radiante', attacker: pc });
          if (!e.dead) e.conditions.outlined = { conc: pc.id };
        } else if (s.id === 'ensnaring_strike') {
          const sv = this.monsterSave(e, 'str', st.dc, { spell: true, dis: meta === 'heightened' });
          if (!sv.success) {
            if (this.setCond(e, 'restrained', { conc: pc.id, dot: { dmg: addDice('1d6', up, '1d6'), type: 'perforante', start: true, save: 'str', dc: st.dc } })) this.addLog('combat', `🌿 Enredaderas espinosas atrapan a ${e.name} (${sv.text}): queda apresado.`);
          } else this.addLog('roll', `${e.name} se libra de las enredaderas (${sv.text}).`, { success: false });
        }
        break;
      }
      default:
        this.addLog('spell', `(${s.name} no tiene efecto mecánico en combate.)`);
    }
  },

  // ================================================================ exploración (fuera de combate)
  exploreActions(pc) {
    if (!pc || pc.dead || pc.hp <= 0 || this.combat || this.phase !== 'adventure') return [];
    const out = [];
    const t = tpl(pc);
    const party = this.activePCs();
    const hurt = party.some((p) => p.hp < p.maxHp);
    if (!pc.shape) {
      for (const sid of C.knownSpells(pc)) {
        const s = SPELLS[sid];
        if (!s.explore) continue;
        if (sid === 'mage_armor' && (pc.mageArmor || t.armor.type !== 'none')) continue;
        if (s.target === 'dying') continue;
        if (s.kind === 'heal' && !hurt) continue;
        if (sid === 'pass_without_trace' && this.scene && this.scene.pwt) continue;
        if (s.cond && s.target === 'self' && pc.conditions[s.cond]) continue;
        const opt = this.castOption(pc, sid);
        if (!opt) continue;
        const up = s.level ? opt.slot - s.level : 0;
        out.push({ key: 'spell:' + sid, label: `${s.name} (${spellTag(s, opt)})`, target: castTarget(s), maxTargets: maxTargetsOf(s, up), desc: s.desc, ai: aiOf(s) });
      }
    }
    for (const [id, n] of Object.entries(pc.inventory)) {
      if (n > 0 && ITEMS[id] && ITEMS[id].heal && hurt) out.push({ key: 'item:' + id, label: `${ITEMS[id].name} (×${n})`, target: 'ally', desc: ITEMS[id].desc, ai: 'heal' });
    }
    if (pc.uses.lay_on_hands > 0 && hurt) out.push({ key: 'lay_on_hands', label: `Imposición de manos (reserva ${pc.uses.lay_on_hands})`, target: 'ally', desc: fdesc('lay_on_hands'), ai: 'heal' });
    if (C.hasFeature(pc, 'magical_cunning') && pc.uses.cunning > 0) {
      const max = C.maxSlots(pc);
      if (Object.keys(max).some((l) => (pc.slots[l] || 0) < max[l])) out.push({ key: 'magical_cunning', label: 'Astucia mágica (recuperar espacios de pacto)', target: 'none', desc: fdesc('magical_cunning'), ai: 'misc' });
    }
    if (C.hasFeature(pc, 'inv_fiendish_vigor') && pc.tempHp < 12 && !pc.shape) out.push({ key: 'fiendish_vigor', label: 'Vigor infernal (12 PG temporales)', target: 'none', desc: fdesc('inv_fiendish_vigor'), ai: 'defend' });
    if (pc.shape) out.push({ key: 'revert', label: 'Recuperar tu forma normal', target: 'none', desc: 'Dejas la Forma salvaje.', ai: 'misc' });
    return out;
  },

  doExploreAction(player, pc, msg) {
    if (this.combat) return this.doCombatAction(player, pc, { ...msg, type: 'act' });
    if (!pc) throw new Error('No tienes personaje');
    const a = this.exploreActions(pc).find((x) => x.key === msg.key);
    if (!a) throw new Error('Acción no disponible');
    const allies = this.resolveAllyTargets(msg.targets, a.target);
    const ally = allies[0] || pc;
    const [head, arg] = a.key.split(':');
    if (head === 'spell') return this.castSpell(pc, arg, [], allies.length ? allies : [pc]);
    if (head === 'item') return this.useItem(pc, arg, ally);
    if (head === 'lay_on_hands') return this.layOnHands(pc, ally);
    if (head === 'revert') { pc.shape = null; return this.addLog('action', `${pc.name} recupera su forma normal.`); }
    if (head === 'fiendish_vigor') { pc.tempHp = Math.max(pc.tempHp, 12); return this.addLog('spell', `😈 ${pc.name} lanza Vida falsa con Vigor infernal: 12 PG temporales.`); }
    if (head === 'magical_cunning') {
      pc.uses.cunning -= 1;
      const max = C.maxSlots(pc);
      const parts = [];
      for (const [l, n] of Object.entries(max)) {
        const gain = Math.min(n - (pc.slots[l] || 0), Math.ceil(n / 2));
        if (gain > 0) { pc.slots[l] = (pc.slots[l] || 0) + gain; parts.push(`${gain} de nivel ${l}`); }
      }
      return this.addLog('action', `🕯️ ${pc.name} realiza un rito de un minuto a su patrón y recupera espacios de pacto: ${parts.join(', ')}.`);
    }
    throw new Error('Acción no disponible');
  },
};
