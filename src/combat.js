// Combate por turnos, conjuros y acciones de los personajes (reglas de 2024, SRD 5.2.1).
// Son métodos de Room (engine.js): se añaden a su prototipo con Object.assign.
const { roll, d20, combineMode, critExpr } = require('./dice');
const { mod, fmtMod, profBonus, XP_BY_CR, ABILITIES } = require('./rules');
const C = require('./character');
const SPELLS = require('./data/spells');
const ITEMS = require('./data/items');
const MONSTERS = require('./data/monsters');
const FEATURES = require('./data/features');
const CONDITIONS = require('./data/conditions');
const BEASTS = require('./data/beasts');
const CLASSES = require('./data/classes');

const tpl = (pc) => C.TEMPLATES[pc.templateId];
const PROTECT_TYPES = ['aberración', 'celestial', 'elemental', 'feérico', 'infernal', 'muerto viviente'];
// estados que impiden actuar
const NO_ACTION = ['paralyzed', 'unconscious', 'stunned', 'incapacitated', 'laughing', 'drowsy', 'turned', 'commanded', 'charmed'];
const isIncap = (c) => NO_ACTION.some((k) => c.conditions[k]);
const CANTRIP_SCALE = (lvl) => (lvl >= 17 ? 4 : lvl >= 11 ? 3 : lvl >= 5 ? 2 : 1);
const PHYSICAL = ['contundente', 'cortante', 'perforante'];

/** Tira el daño. gwf: los 1 y 2 de los dados del arma cuentan como 3 (Combate con armas a dos manos). */
function rollDmg(expr, { crit = false, gwf = false } = {}) {
  const r = roll(crit ? critExpr(expr) : expr);
  if (!gwf) return r;
  let total = r.total;
  for (const d of r.rolls) for (const v of d.results) if (v < 3) total += 3 - v;
  return total !== r.total ? { ...r, total, detail: `${r.detail} (1-2 cuentan como 3)` } : r;
}
/** Suma dados extra a una expresión: addDice('2d8', 1, '1d8') -> '3d8' */
function addDice(expr, n, per) {
  if (!n || !per) return expr;
  const m = String(per).match(/^(\d*)d(\d+)$/);
  const k = (m[1] === '' ? 1 : +m[1]) * n;
  const same = String(expr).match(new RegExp(`^(\\d*)d${m[2]}(.*)$`));
  if (same) return `${(same[1] === '' ? 1 : +same[1]) + k}d${m[2]}${same[2]}`;
  return `${expr}+${k}d${m[2]}`;
}

/** Repite los dados más bajos (Conjuro potenciado): hasta n dados que hayan salido por debajo de la media */
function empower(r, n) {
  if (!n) return r;
  let total = r.total;
  const dice = [];
  for (const d of r.rolls) d.results.forEach((v) => dice.push({ sides: d.sides, v }));
  dice.sort((a, b) => a.v / a.sides - b.v / b.sides);
  const changed = [];
  for (const x of dice.slice(0, n)) {
    if (x.v > x.sides / 2) break;
    const nv = roll(`1d${x.sides}`).total;
    total += nv - x.v; changed.push(`${x.v}→${nv}`);
  }
  return changed.length ? { ...r, total, detail: `${r.detail} (potenciado: ${changed.join(', ')})` } : r;
}

module.exports = {
  // ================================================================ inicio y turnos
  startCombat(spec) {
    const n = this.activePCs().length;
    let types = spec.enemies(n, this.flags);
    // Regla de la casa contra la frustración: cada derrota repetida en la misma escena debilita el encuentro.
    const retry = (this.retries && this.retries[this.sceneId]) || 0;
    if (retry >= 1 && types.length > 1) types = types.slice(0, Math.max(1, types.length - retry));
    const counts = {};
    const enemies = {};
    types.forEach((type, i) => {
      const m = MONSTERS[type];
      counts[type] = (counts[type] || 0) + 1;
      const total = types.filter((x) => x === type).length;
      const named = spec.names && spec.names[type] && counts[type] === 1;
      const hp = Math.max(roll(m.hp).total, Math.ceil(m.avgHp * 0.75));
      const id = 'e' + (i + 1);
      enemies[id] = { id, type, name: named ? spec.names[type] : total > 1 ? `${m.name} ${counts[type]}` : m.name, hp, maxHp: hp, ac: m.ac, conditions: {}, dead: false, uses: {} };
    });
    if (spec.adjust) spec.adjust(Object.values(enemies), this.flags, (t) => this.addLog('combat', t));
    if (retry >= 1) {
      const f = Math.max(0.4, 1 - 0.2 * retry);
      for (const e of Object.values(enemies)) { e.hp = Math.max(1, Math.ceil(e.hp * f)); e.maxHp = e.hp; }
      this.addLog('system', `🕯️ Lo intentáis de nuevo, con la lección aprendida: esta vez el enemigo parece ${retry > 1 ? 'mucho ' : ''}más débil. [Regla de la casa]`);
    }
    this.combat = { round: 1, order: [], turn: 0, enemies, surprised: [], turnState: null, busy: false, xp: 0 };
    this.scene.encounterStarted = true;
    const mode = spec.surprise ? spec.surprise(this.flags) : null;
    if (mode === 'enemies') {
      this.combat.surprised = Object.keys(enemies);
      this.addLog('combat', '¡Los enemigos están sorprendidos! Tendrán desventaja en la iniciativa y perderán su primer turno.');
    } else if (mode === 'party') {
      this.combat.surprised = this.activePCs().map((p) => p.id);
      this.addLog('combat', '¡El grupo ha sido sorprendido! Perdéis vuestro primer turno.');
    } else if (mode === 'perception') {
      const st = roll(`1d20+${spec.ambushStealth || 0}`).total;
      const surprised = this.activePCs().filter((p) => 10 + C.skillMod(p, 'perception') < st);
      this.combat.surprised = surprised.map((p) => p.id);
      this.addLog('combat', `Los enemigos acechaban (Sigilo ${st}). ${surprised.length ? `Sorprendidos (Percepción pasiva menor): ${surprised.map((p) => p.name).join(', ')}.` : '¡Pero nadie del grupo se deja sorprender!'}`);
    }
    // iniciativa (Alerta suma el bonificador por competencia; Atleta extraordinario tira con ventaja)
    const inits = [];
    for (const pc of this.activePCs()) {
      const m = C.initiativeMod(pc) - 2 * (pc.exhaustion || 0);
      const adv = C.hasFeature(pc, 'remarkable_athlete');
      const r = this.d20For(pc, combineMode(adv, this.combat.surprised.includes(pc.id)));
      inits.push({ id: pc.id, side: 'pc', init: r.natural + m, dex: m, text: `${pc.name} ${r.natural}${fmtMod(m)}=${r.natural + m}${adv ? ' (ventaja)' : ''}` });
    }
    for (const e of Object.values(enemies)) {
      const dex = mod(MONSTERS[e.type].abilities.dex);
      const r = d20(this.combat.surprised.includes(e.id) ? 'dis' : 'normal').natural;
      inits.push({ id: e.id, side: 'enemy', init: r + dex, dex, text: `${e.name} ${r + dex}` });
    }
    inits.sort((a, b) => b.init - a.init || b.dex - a.dex || (a.side === 'pc' ? -1 : 1));
    this.combat.order = inits.map(({ id, side, init }) => ({ id, side, init }));
    this.addLog('combat', `⚔️ ¡Combate! Iniciativa: ${inits.map((i) => i.text).join(', ')}.`, { fx: { kind: 'combatStart' } });
    // Metabolismo asombroso (monje 2): al tirar iniciativa recupera la concentración y algo de vida
    for (const pc of this.activePCs()) {
      if (pc.uses.metabolism && pc.uses.focus !== undefined && (pc.uses.focus < C.usesMax(pc).focus || pc.hp < pc.maxHp)) {
        pc.uses.metabolism -= 1;
        pc.uses.focus = C.usesMax(pc).focus;
        const r = roll(`${C.martialDie(pc)}+${pc.level}`);
        const h = this.healPC(pc, r.total);
        this.addLog('heal', `🧘 ${pc.name}: Metabolismo asombroso. Recupera sus puntos de concentración y ${h} PG (${r.detail}).`);
      }
    }
    this.beginTurn();
  },

  current() {
    const o = this.combat.order[this.combat.turn];
    return o ? this.getCombatant(o.id) : null;
  },
  getCombatant(id) {
    if (!this.combat) return this.pcs[id];
    return this.combat.enemies[id] || this.pcs[id];
  },
  isPC(c) { return !!c.templateId; },
  livingEnemies() { return this.combat ? Object.values(this.combat.enemies).filter((e) => !e.dead) : []; },
  allCombatants() { return [...this.partyPCs(), ...(this.combat ? Object.values(this.combat.enemies) : [])]; },

  /** Quita de todos los combatientes los estados que cumplen una condición */
  clearConds(pred) {
    for (const c of this.allCombatants()) for (const [k, v] of Object.entries(c.conditions)) if (v && pred(v, k, c)) delete c.conditions[k];
  },

  beginTurn() {
    const cb = this.combat;
    if (!cb) return;
    const c = this.current();
    if (!c) return this.endTurn();
    cb.turnState = { action: 1, bonus: 1, slotUsed: false, sneakUsed: false, surge: false, attacked: false, attackedLight: false, offhandUsed: false, nickUsed: false, lastHit: null, cleaveReady: null, hordeReady: false, lastWeapon: null, lastTargetId: null, once: {} };
    this.clearConds((v) => v.untilStartOf === c.id);
    delete c.conditions.dodging;
    delete c.conditions.focused_dodge;
    delete c.conditions.shield_spell;
    c.reactionUsed = false;
    if (c.dead) return this.endTurn(true);
    if (cb.round === 1 && cb.surprised.includes(c.id)) {
      this.addLog('combat', `${c.name} está sorprendido y no actúa este asalto.`);
      return this.endTurn();
    }
    // daño al principio del turno (en llamas, enredaderas)
    for (const [k, v] of Object.entries(c.conditions)) {
      if (!v || !v.dot || !v.dot.start || c.dead) continue;
      const d = roll(v.dot.dmg);
      this.addLog('damage', `${c.name} sufre ${d.total} de daño ${v.dot.type} (${CONDITIONS[k] ? CONDITIONS[k].name : k}: ${d.detail}).`);
      this.applyDamage(c, d.total, { type: v.dot.type, silentBreak: true });
      if (v.dot.save && c.conditions[k] && !c.dead) {
        const s = this.saveFor(c, v.dot.save, v.dot.dc);
        this.addLog('roll', `${c.name} intenta librarse (${ABILITIES[v.dot.save].name} ${s.text}) → ${s.success ? 'lo consigue' : 'sigue igual'}.`, { success: s.success });
        if (s.success) delete c.conditions[k];
      }
    }
    if (c.dead || (this.isPC(c) && c.hp <= 0 && !c.conditions.unconscious && c.dead)) return this.endTurn(true);
    if (this.checkCombatEnd()) return;
    // Hedor (ghast): quien empieza su turno junto a él
    if (this.isPC(c) && c.hp > 0) {
      for (const e of this.livingEnemies()) {
        const st = MONSTERS[e.type].stench;
        if (!st || e.lastTarget !== c.id || (c.stenchImmune || {})[e.id] || c.conditions.poisoned) continue;
        const sv = this.pcSave(c, 'con', st.dc, { poison: true });
        if (sv.success) { c.stenchImmune = { ...(c.stenchImmune || {}), [e.id]: true }; this.addLog('roll', `${c.name} aguanta el hedor de ${e.name} (${sv.text}).`, { success: true }); }
        else { c.conditions.poisoned = { untilStartOf: c.id }; this.addLog('combat', `🤢 El hedor de ${e.name} envenena a ${c.name} (${sv.text}).`); }
      }
    }
    if (c.conditions.heroism && this.isPC(c) && c.hp > 0) {
      const t = c.conditions.heroism.amount || 1;
      if (c.tempHp < t) { c.tempHp = t; this.addLog('heal', `🦁 Heroísmo: ${c.name} tiene ${t} PG temporales.`); }
    }
    if (c.conditions.prone && !c.conditions.laughing && !(this.isPC(c) && c.hp <= 0) && !isIncap(c)) {
      delete c.conditions.prone;
      this.addLog('combat', `${c.name} se levanta del suelo.`);
    }
    if (this.isPC(c)) {
      if (c.hp <= 0) {
        if (!c.stable) this.deathSave(c);
        return this.schedule(() => this.endTurn(), Math.min(this.delay, 600));
      }
      if (isIncap(c)) {
        const k = NO_ACTION.find((x) => c.conditions[x]);
        this.addLog('combat', `${c.name} está ${(CONDITIONS[k] ? CONDITIONS[k].name : k).toLowerCase()} y no puede actuar.`);
        return this.schedule(() => this.endTurn(), Math.min(this.delay, 600));
      }
      this.addLog('turn', `Turno de ${c.name}.`, { who: c.id, fx: { kind: 'turn', who: c.id } });
      this.maybeAutoTurn();
    } else {
      cb.busy = true;
      this.schedule(() => this.monsterTurn(c));
    }
  },

  maybeAutoTurn() {
    const cb = this.combat;
    if (!cb || cb.busy) return;
    const c = this.current();
    if (!c || !this.isPC(c) || c.hp <= 0) return;
    if (this.delay > 0 && cb.afkKey !== `${cb.round}:${cb.turn}`) {
      // Turno abandonado: si el jugador no hace nada en 2 minutos, su personaje esquiva y pasa el turno.
      const turnKey = (cb.afkKey = `${cb.round}:${cb.turn}`);
      cb.lastAct = Date.now();
      const check = () => {
        if (!this.combat || `${this.combat.round}:${this.combat.turn}` !== turnKey || this.combat.busy) return;
        const idle = Date.now() - (this.combat.lastAct || 0);
        if (idle < this.afkMs) return this.schedule(check, this.afkMs - idle + 50);
        const cur = this.current();
        if (!cur || !this.isPC(cur) || cur.hp <= 0) return;
        cur.conditions.dodging = {};
        this.addLog('combat', `⏳ ${cur.name} lleva demasiado tiempo sin actuar: adopta una postura defensiva (Esquivar) y pasa el turno.`);
        this.endTurn();
      };
      this.schedule(check, this.afkMs);
    }
    if (this.isOrphan(c) && this.delay > 0) {
      const turnKey = `${cb.round}:${cb.turn}`;
      cb.autoKey = turnKey;
      this.schedule(() => {
        if (!this.combat || this.combat.autoKey !== turnKey || `${this.combat.round}:${this.combat.turn}` !== turnKey) return;
        const cur = this.current();
        if (!cur || !this.isPC(cur) || !this.isOrphan(cur)) return;
        cur.conditions.dodging = {};
        this.addLog('combat', `${cur.name} no tiene jugador conectado: adopta una postura defensiva (Esquivar).`);
        this.endTurn();
      }, 4000);
    }
  },

  endTurn(skipEffects = false) {
    const cb = this.combat;
    if (!cb) return;
    const c = this.current();
    if (c && !skipEffects && !c.dead) {
      for (const [k, v] of Object.entries({ ...c.conditions })) {
        if (!v || !c.conditions[k]) continue;
        // Dormir: al final de su siguiente turno repite la salvación; si falla, se duerme
        if (k === 'drowsy') {
          delete c.conditions.drowsy;
          const s = this.saveFor(c, 'wis', v.dc, { spell: true });
          if (!s.success && this.concOk(v.conc)) {
            c.conditions.unconscious = { conc: v.conc, breakOnDamage: true };
            c.conditions.prone = {};
            this.addLog('combat', `💤 ${c.name} se queda profundamente dormido (${s.text}).`);
          } else this.addLog('roll', `${c.name} sacude la modorra (${s.text}).`, { success: true });
          continue;
        }
        if (v.saveEnds) {
          const s = this.saveFor(c, v.saveEnds.save, v.saveEnds.dc, { spell: !!v.conc });
          this.addLog('roll', `${c.name} intenta librarse de ${(CONDITIONS[k] ? CONDITIONS[k].name : k).toLowerCase()}: ${s.text} → ${s.success ? 'se libera' : 'no lo consigue'}.`, { success: s.success });
          if (s.success) { delete c.conditions[k]; if (k === 'laughing') delete c.conditions.prone; continue; }
        }
        if (v.dot && v.dot.end && v.dot.keep) {
          // área persistente (Esfera llameante, Rayo de luna): salvación al final de cada turno
          if (!this.concOk(v.conc)) { delete c.conditions[k]; continue; }
          const d = roll(v.dot.dmg);
          const s = this.saveFor(c, v.dot.save, v.dot.dc, { spell: true });
          const amt = s.success ? Math.floor(d.total / 2) : d.total;
          this.addLog('damage', `${c.name} termina su turno en ${(CONDITIONS[k] ? CONDITIONS[k].name : k).toLowerCase()}: salvación de ${ABILITIES[v.dot.save].name} ${s.text} → ${amt} de daño ${v.dot.type} (${d.detail}).`, { success: !s.success });
          this.applyDamage(c, amt, { type: v.dot.type, attacker: this.pcs[v.conc] });
          if (c.dead) break;
          continue;
        }
        if (v.dot && v.dot.end) {
          const d = roll(v.dot.dmg);
          delete c.conditions[k];
          this.addLog('damage', `${c.name} sufre ${d.total} de daño ${v.dot.type} (${d.detail}).`);
          this.applyDamage(c, d.total, { type: v.dot.type });
          if (c.dead) break;
          continue;
        }
        if (typeof v.rounds === 'number') { v.rounds -= 1; if (v.rounds <= 0) delete c.conditions[k]; }
      }
      // efectos que duran "hasta el final del siguiente turno de quien los causó"
      for (const o of this.allCombatants()) {
        for (const [k, v] of Object.entries(o.conditions)) {
          if (v && v.untilEndOf === c.id) { v.turns = (v.turns || 1) - 1; if (v.turns <= 0) delete o.conditions[k]; }
        }
      }
      if (this.isPC(c)) {
        if (c.concentration) {
          c.concentration.rounds -= 1;
          if (c.concentration.rounds <= 0) this.breakConcentration(c, 'se agota la duración');
        }
        if (c.conditions.raging && c.conditions.raging.rounds <= 0) this.endRage(c);
      }
    }
    if (this.checkCombatEnd()) return;
    cb.busy = false;
    cb.turn += 1;
    if (cb.turn >= cb.order.length) {
      cb.turn = 0;
      cb.round += 1;
      this.addLog('round', `— Asalto ${cb.round} —`);
    }
    this.beginTurn();
  },

  checkCombatEnd() {
    const cb = this.combat;
    if (!cb) return true;
    if (this.livingEnemies().length === 0) { this.victory(); return true; }
    if (this.activePCs().every((p) => p.hp <= 0)) { this.defeat(); return true; }
    return false;
  },

  /** Al terminar un combate: se acaban los efectos de combate (los de 1 hora o más se quedan). */
  cleanupAfterCombat(pc) {
    pc.concentration = null;
    pc.stenchImmune = null;
    if (pc.drained) { pc.maxHp += pc.drained; pc.drained = 0; }
    pc.images = 0;
    const keep = ['barkskin', 'magic_weapon', 'inspired'];
    for (const k of Object.keys(pc.conditions)) if (!keep.includes(k)) delete pc.conditions[k];
  },

  victory() {
    const def = this.sceneDef();
    const cb = this.combat;
    this.combat = null;
    this.scene.combatDone = true;
    for (const pc of this.partyPCs()) this.cleanupAfterCombat(pc);
    this.addLog('combat', '🏁 ¡Victoria!', { fx: { kind: 'victory' } });
    if (this.retries) delete this.retries[this.sceneId];
    const v = def.combat.victory;
    if (v.text) this.addLog('narration', this.txt(v.text));
    for (const f of v.flags || []) this.setFlag(f, true);
    for (const [k, val] of Object.entries(v.inc || {})) this.setFlag(k, (Number(this.flags[k]) || 0) + val);
    // Regla de la casa: los caídos sobreviven al terminar el combate
    for (const pc of this.partyPCs()) {
      if (pc.dead) {
        pc.dead = false; pc.hp = 1; pc.exhaustion = Math.min(6, pc.exhaustion + 1); pc.deathSaves = { s: 0, f: 0 }; pc.stable = false;
        this.addLog('system', `${pc.name} parecía muerto, pero sus compañeros consiguen reanimarlo in extremis (1 PG, 1 nivel de agotamiento). [Regla de la casa]`);
      } else if (pc.hp <= 0) {
        pc.hp = 1; pc.stable = false; pc.deathSaves = { s: 0, f: 0 };
        this.addLog('system', `${pc.name} recobra el sentido con 1 PG.`);
      }
    }
    const pcs = this.activePCs();
    const monsterXp = Object.values(cb.enemies).reduce((a, e) => a + XP_BY_CR[MONSTERS[e.type].cr], 0);
    const share = Math.floor(monsterXp / Math.max(1, pcs.length));
    const each = share + (v.milestoneXp || 0);
    this.addLog('xp', `✨ Experiencia: ${share} PX por los enemigos${v.milestoneXp ? ` + ${v.milestoneXp} PX por hito` : ''} = ${each} PX para cada personaje.`);
    for (const pc of pcs) this.giveXp(pc, each);
    if (v.gold) { const g = v.gold * Math.max(1, pcs.length); this.party.gold += g; this.addLog('loot', `+${g} po para el grupo.`); }
    if (v.items) this.addLoot(v.items);
    if (v.goto) {
      const to = this.txt(v.goto);
      this.scene.restarting = true;
      this.schedule(() => this.enterScene(to), this.delay ? 1800 : 0);
    }
  },

  defeat() {
    const spec = this.sceneDef().combat || {};
    if (spec.defeat && spec.defeat.to) {
      this.addLog('combat', '💀 Todo el grupo ha caído...', { fx: { kind: 'defeat' } });
      if (spec.defeat.text) this.addLog('narration', this.txt(spec.defeat.text));
      this.combat = null;
      this.scene.combatDone = true;
      for (const pc of this.partyPCs()) {
        pc.dead = false; pc.hp = Math.max(1, pc.hp); pc.deathSaves = { s: 0, f: 0 }; pc.stable = false; pc.shape = null;
        this.cleanupAfterCombat(pc);
        for (const k of Object.keys(pc.conditions)) delete pc.conditions[k];
      }
      for (const f of spec.defeat.flags || []) this.setFlag(f, true);
      const to = this.txt(spec.defeat.to);
      this.scene.restarting = true;
      this.schedule(() => this.enterScene(to), this.delay ? 2500 : 0);
      return;
    }
    this.addLog('combat', '💀 Todo el grupo ha caído...', { fx: { kind: 'defeat' } });
    this.retries = this.retries || {};
    this.retries[this.sceneId] = (this.retries[this.sceneId] || 0) + 1;
    this.addLog('narration', 'La oscuridad os envuelve. Pero esta no es la forma en que termina vuestra historia: el tiempo parece retroceder y volvéis a estar al principio de esta escena, con la lección aprendida.');
    const cp = JSON.parse(JSON.stringify(this.scene.checkpoint));
    const owners = {};
    for (const [id, pc] of Object.entries(this.pcs)) owners[id] = pc.owner;
    this.pcs = cp.pcs;
    for (const [id, pc] of Object.entries(this.pcs)) pc.owner = owners[id] ?? pc.owner;
    this.party = cp.party;
    this.flags = cp.flags;
    this.flagOrder = cp.flagOrder || Object.keys(cp.flags);
    this.combat = null;
    const id = this.sceneId;
    this.scene.restarting = true;
    this.schedule(() => this.enterScene(id), this.delay ? 2500 : 0);
  },

  // ================================================================ tiradas
  /** d20 de un personaje con Fortuna (mediano: repite los 1) */
  d20For(c, mode = 'normal') {
    let r = d20(mode);
    if (this.isPC(c) && r.natural === 1 && C.hasFeature(c, 'luck')) {
      const again = d20(mode);
      return { ...again, note: ' (Fortuna: repite el 1)' };
    }
    return { ...r, note: '' };
  },

  /**
   * Tras fallar una prueba con d20: Inspiración bárdica (suma el dado) o Inspiración heroica (repite).
   * Devuelve { total, nat, text } nuevos o null si no hay nada que hacer.
   */
  rescueRoll(pc, total, target, mode, bonus) {
    if (!this.isPC(pc)) return null;
    const insp = pc.conditions.inspired;
    if (insp) {
      const r = roll(insp.die || '1d6');
      delete pc.conditions.inspired;
      return { total: total + r.total, text: ` +${r.total} Inspiración bárdica` };
    }
    if (pc.uses.heroic > 0) {
      pc.uses.heroic -= 1;
      const r = this.d20For(pc, mode);
      return { total: r.natural + bonus, nat: r.natural, reroll: true, text: ` → Inspiración heroica: repite d20(${r.natural})${fmtMod(bonus)} = ${r.natural + bonus}` };
    }
    return null;
  },

  saveFor(c, ability, dc, opts = {}) { return this.isPC(c) ? this.pcSave(c, ability, dc, opts) : this.monsterSave(c, ability, dc, opts); },

  pcSave(pc, ability, dc, opts = {}) {
    const k = pc.conditions;
    if ((k.paralyzed || k.unconscious || k.stunned || pc.hp <= 0) && (ability === 'str' || ability === 'dex')) return { success: false, total: 0, nat: 0, text: 'falla automáticamente' };
    const m = C.saveMod(pc, ability) - 2 * (pc.exhaustion || 0); // agotamiento: −2 por nivel a las pruebas d20
    const why = [];
    const adv = (ability === 'dex' && (k.dodging || k.focused_dodge) && why.push('esquiva'))
      || (ability === 'dex' && C.hasFeature(pc, 'danger_sense') && !isIncap(pc) && why.push('sentir el peligro'))
      || (['int', 'wis', 'cha'].includes(ability) && C.hasFeature(pc, 'gnomish_cunning') && why.push('astucia gnoma'))
      || (opts.poison && C.hasFeature(pc, 'dwarven_resilience') && why.push('resistencia enana'))
      || (ability === 'str' && k.raging && why.push('furia'))
      || (opts.fear && C.hasFeature(pc, 'brave') && why.push('valiente'))
      || (opts.charm && C.hasFeature(pc, 'fey_ancestry') && why.push('linaje feérico'))
      || (opts.conc && C.hasFeature(pc, 'inv_eldritch_mind') && why.push('mente sobrenatural'))
      || (opts.conc && pc.concentration && pc.concentration.extended && why.push('conjuro extendido'))
      || opts.adv;
    const dis = ability === 'dex' && k.restrained;
    const mode = combineMode(adv, dis);
    const r = this.d20For(pc, mode);
    let total = r.natural + m;
    let extra = '';
    if (k.blessed) { const b = roll('1d4').total; total += b; extra += ` +${b} Bendición`; }
    if (k.baned) { const b = roll('1d4').total; total -= b; extra += ` −${b} Perdición`; }
    let success = total >= dc;
    if (!success && !opts.noRescue) {
      const res = this.rescueRoll(pc, total, dc, mode, m);
      if (res) { total = res.total; extra += res.text; success = total >= dc; }
    }
    const modeTxt = mode === 'normal' ? `d20(${r.natural})` : `d20(${r.dice.join(',')} ${mode === 'adv' ? 'ventaja' : 'desventaja'})`;
    return { success, total, nat: r.natural, text: `${modeTxt}${fmtMod(m)}${extra} = ${total} vs CD ${dc}${r.note}${why.length && mode === 'adv' ? ` [${why[0]}]` : ''}` };
  },

  monsterSave(e, ability, dc, opts = {}) {
    const m = MONSTERS[e.type];
    const k = e.conditions;
    if ((k.paralyzed || k.unconscious || k.stunned) && (ability === 'str' || ability === 'dex')) return { success: false, total: 0, nat: 0, text: 'falla automáticamente' };
    const bonus = m.saves[ability] ?? mod(m.abilities[ability]);
    const adv = (ability === 'dex' && k.dodging) || (opts.spell && m.magicResistance) || opts.adv;
    const dis = (ability === 'dex' && k.restrained) || opts.dis;
    const mode = combineMode(adv, dis);
    const r = d20(mode);
    let total = r.natural + bonus;
    let extra = '';
    if (k.baned) { const b = roll('1d4').total; total -= b; extra = ` −${b} Perdición`; }
    const modeTxt = mode === 'normal' ? `d20(${r.natural})` : `d20(${r.dice.join(',')} ${mode === 'adv' ? 'ventaja' : 'desventaja'})`;
    return { success: total >= dc, total, nat: r.natural, text: `${modeTxt}${fmtMod(bonus)}${extra} = ${total} vs CD ${dc}` };
  },

  deathSave(pc) {
    const r = this.d20For(pc).natural;
    let text;
    if (r === 20) {
      pc.hp = 1; pc.deathSaves = { s: 0, f: 0 }; delete pc.conditions.unconscious;
      text = '¡20 natural! Recupera 1 PG y vuelve en sí.';
    } else if (r === 1) { pc.deathSaves.f += 2; text = '1 natural: dos fallos.'; }
    else if (r >= 10) { pc.deathSaves.s += 1; text = 'éxito.'; }
    else { pc.deathSaves.f += 1; text = 'fallo.'; }
    if (pc.deathSaves.s >= 3) { pc.stable = true; pc.deathSaves = { s: 0, f: 0 }; text += ' Queda estable.'; }
    if (pc.deathSaves.f >= 3) { pc.dead = true; text += ` ☠️ ${pc.name} ha muerto.`; }
    this.addLog('roll', `${pc.name} hace una salvación contra muerte: d20(${r}) — ${text} [Éxitos ${pc.deathSaves.s}/3 · Fallos ${pc.deathSaves.f}/3]`, { success: r >= 10 });
  },

  // ================================================================ ataques y daño
  /**
   * Ataque genérico. attacker y target pueden ser PJ o monstruo.
   * opts: bonus, dmg, dmgType, ranged, label, critOn, isSpell, spellCls, weapon (ataque de PJ con arma),
   *       sneak, extraOnHit [{label, dmg, type}], onHit(target, info), onMiss(target), gwf, noMod (daño sin modificador)
   */
  resolveAttack(attacker, target, opts) {
    const { bonus: baseBonus, dmg, dmgType, ranged = false, label, critOn = 20, isSpell = false, weapon = null, onHit, onMiss } = opts;
    const atkPC = this.isPC(attacker);
    const bonus = baseBonus - (atkPC ? 2 * (attacker.exhaustion || 0) : 0);
    const tgtPC = this.isPC(target);
    const tc = target.conditions;
    const ac = attacker.conditions;
    const ts = this.combat ? this.combat.turnState : { once: {} };
    const melee = !ranged;
    let adv = false;
    let dis = false;
    const why = [];
    const A = (txt) => { adv = true; if (txt) why.push(txt); };
    const Dz = (txt) => { dis = true; if (txt) why.push(txt); };
    if (ac.hidden) { A('escondido'); delete ac.hidden; }
    if (ac.helped) { A('ayuda'); delete ac.helped; }
    if (ac.steady_aim) { A('puntería certera'); delete ac.steady_aim; }
    if (ac.invisible) A('invisible');
    if (ac.reckless && atkPC && weapon && weapon.ability === 'str') A('temerario');
    if (atkPC && isSpell && opts.spellCls && ac.innate_sorcery) A('hechicería innata');
    if (tc.guided) { A('saeta guía'); delete tc.guided; }
    if (tc.exposed) { A('expuesto'); delete tc.exposed; }
    if (opts.adv) A(opts.adv);
    if (ac.grappled && ac.grappled.by !== target.id) Dz('agarrado');
    if (tc.outlined) A('iluminado');
    if (tc.vexed && tc.vexed.by === attacker.id) { A('molestar'); delete tc.vexed; }
    if (tc.paralyzed || tc.unconscious || tc.stunned || (tgtPC && target.hp <= 0)) A('objetivo indefenso');
    if (tc.prone) { if (ranged) Dz('objetivo derribado a distancia'); else A('objetivo derribado'); }
    if (tc.restrained) A('objetivo apresado');
    if (tc.blinded) A('objetivo cegado');
    if (tc.reckless) A('objetivo temerario');
    if ((tc.dodging || tc.focused_dodge) && !isIncap(target)) Dz('esquiva');
    if (tc.blurred) Dz('contorno borroso');
    if (tc.invisible && !tc.outlined) Dz('objetivo invisible');
    if (tgtPC && tc.protected && !atkPC && PROTECT_TYPES.includes(MONSTERS[attacker.type].type)) Dz('protección contra el mal');
    if (ac.prone) Dz('atacante derribado');
    if (ac.poisoned) Dz('envenenado');
    if (ac.restrained) Dz('atacante apresado');
    if (ac.blinded) Dz('atacante cegado');
    if (ac.frightened) Dz('asustado');
    if (ac.sapped) { Dz('debilitado'); delete ac.sapped; }
    if (!atkPC) {
      const m = MONSTERS[attacker.type];
      if (m.bloodFrenzy && tgtPC && target.hp < target.maxHp) A('frenesí sanguinario');
      if (m.packTactics && this.livingEnemies().some((e) => e.id !== attacker.id && !isIncap(e))) A('tácticas de manada');
    } else if (attacker.shape) {
      const b = BEASTS[attacker.shape];
      if (b.packTactics && this.activePCs().some((p) => p.id !== attacker.id && p.hp > 0)) A('atacar en manada');
      if (b.bloodiedFury && attacker.hp <= attacker.maxHp / 2) A('furia maltrecha');
    }
    const mode = combineMode(adv, dis);
    const r = this.d20For(attacker, mode);
    let nat = r.natural;
    let total = nat + bonus;
    let extra = r.note;
    if (ac.blessed) { const b = roll('1d4').total; total += b; extra += ` +${b} Bendición`; }
    if (ac.baned) { const b = roll('1d4').total; total -= b; extra += ` −${b} Perdición`; }
    let targetAC = tgtPC ? C.armorClass(target) : target.ac;
    const autoCrit = (tc.paralyzed || tc.unconscious || (tgtPC && target.hp <= 0)) && melee;
    let crit = nat >= critOn || (autoCrit && nat !== 1 && total >= targetAC);
    let hit = nat !== 1 && (nat === 20 || crit || total >= targetAC);
    // Al fallar: metamagia buscadora, inspiración bárdica o heroica
    if (!hit && atkPC && nat !== 1) {
      if (isSpell && opts.seeking && attacker.uses.points >= 1) {
        attacker.uses.points -= 1;
        const r2 = this.d20For(attacker, mode);
        nat = r2.natural; total = nat + bonus; extra += ` → Conjuro buscador: repite d20(${nat})`;
        crit = nat >= critOn; hit = nat !== 1 && (nat === 20 || total >= targetAC);
      }
      if (!hit) {
        const res = this.rescueRoll(attacker, total, targetAC, mode, bonus);
        if (res) { total = res.total; if (res.nat) nat = res.nat; extra += res.text; crit = nat >= critOn; hit = nat !== 1 && (nat === 20 || total >= targetAC); }
      }
    }
    let shieldNote = '';
    // Reacción: conjuro Escudo
    if (hit && !crit && tgtPC && !target.reactionUsed && target.hp > 0 && !target.shape && C.knownSpells(target).includes('shield') && total < targetAC + 5 && this.slotFor(target, 1)) {
      target.slots[this.slotFor(target, 1)] -= 1;
      target.reactionUsed = true;
      target.conditions.shield_spell = {};
      targetAC += 5; hit = false;
      shieldNote = ` 🛡️ ${target.name} reacciona con el conjuro Escudo (+5 CA)`;
    }
    // Reacción: Palabras cortantes de un bardo del Colegio del conocimiento
    if (hit && !crit && tgtPC && !atkPC) {
      const bard = this.activePCs().find((p) => p.hp > 0 && !p.reactionUsed && p.uses.inspiration > 0 && C.hasFeature(p, 'cutting_words') && !isIncap(p));
      if (bard && total - targetAC < 6) {
        bard.uses.inspiration -= 1; bard.reactionUsed = true;
        const cw = roll('1d6').total;
        total -= cw;
        hit = total >= targetAC;
        shieldNote = ` 🎶 ${bard.name} usa Palabras cortantes (−${cw})${hit ? '' : ': ¡falla!'}`;
      }
    }
    // Imagen múltiple: un duplicado recibe el golpe
    if (hit && tgtPC && target.images > 0 && !ac.blinded) {
      const dice = Array.from({ length: target.images }, () => roll('1d6').total);
      if (dice.some((x) => x >= 3)) {
        target.images -= 1; hit = false;
        shieldNote = ` 🪞 El golpe atraviesa un duplicado ilusorio (d6: ${dice.join(',')}; quedan ${target.images})`;
      }
    }
    // Reacción de monstruo: Parada
    if (hit && !crit && !tgtPC && melee && !isSpell && !target.reactionUsed && !tc.addled) {
      const parry = MONSTERS[target.type].parry;
      if (parry && total < targetAC + parry) {
        target.reactionUsed = true; targetAC += parry; hit = false;
        shieldNote = ` ⚔️ ${target.name} detiene el golpe con una Parada (+${parry} CA)`;
      }
    }
    if (atkPC && (ac.invisible || ac.sanctuary)) { delete ac.invisible; delete ac.sanctuary; }
    const modeTxt = mode === 'normal' ? `d20(${nat})` : `d20(${r.dice.join(',')} ${mode === 'adv' ? 'ventaja' : 'desventaja'})`;
    const rollTxt = `${modeTxt}${fmtMod(bonus)}${extra} = ${total} vs CA ${targetAC}${why.length ? ` [${why.join(', ')}]` : ''}${shieldNote}`;
    const fx = { kind: 'attack', who: attacker.id, target: target.id, nat, total, hit, crit: hit && crit, shield: !!shieldNote && !hit };
    if (!hit) {
      // Maestría Rozar: al fallar, daño igual al modificador
      if (weapon && weapon.mastery === 'graze' && weapon.abilityMod > 0) {
        this.addLog('attack', `${attacker.name} ataca a ${target.name} con ${label}: ${rollTxt} → falla, pero lo roza (Rozar): ${weapon.abilityMod} de daño ${dmgType}.`, { success: false, who: attacker.id, fx });
        this.applyDamage(target, weapon.abilityMod, { type: dmgType, attacker });
      } else this.addLog('attack', `${attacker.name} ataca a ${target.name} con ${label}: ${rollTxt} → ${nat === 1 ? 'pifia, ' : ''}falla.`, { success: false, who: attacker.id, fx });
      if (onMiss) onMiss(target);
      return { hit: false, crit: false, mode };
    }
    if (dmg === '0') {
      this.addLog('attack', `${attacker.name} ataca a ${target.name} con ${label}: ${rollTxt} → ¡impacta!`, { success: true, who: attacker.id, fx });
      if (onHit) onHit(target, { crit });
      return { hit: true, crit: false, mode };
    }
    // ---- daño
    const parts = []; // [{ amount, type }]
    const txt = [];
    let d = empower(rollDmg(dmg, { crit, gwf: opts.gwf }), opts.empower || 0);
    if (weapon && atkPC && C.hasFeature(attacker, 'feat_savage_attacker') && !ts.once.savage) {
      ts.once.savage = true;
      const d2 = rollDmg(dmg, { crit, gwf: opts.gwf });
      if (d2.total > d.total) { txt.push(`Atacante salvaje: ${d.total}→${d2.total}`); d = d2; }
    }
    parts.push({ amount: Math.max(0, d.total), type: dmgType });
    txt.unshift(d.detail);
    const more = (labelTxt, expr, type) => {
      const x = roll(crit ? critExpr(expr) : expr);
      parts.push({ amount: x.total, type: type || dmgType });
      txt.push(`${labelTxt} ${x.detail}`);
    };
    if (opts.sneak && atkPC && !ts.sneakUsed && (mode === 'adv' || (mode !== 'dis' && this.activePCs().some((p) => p.id !== attacker.id && p.hp > 0)))) {
      ts.sneakUsed = true;
      more('furtivo', opts.sneak);
    }
    for (const x of opts.extraOnHit || []) more(x.label, x.dmg, x.type);
    if (opts.advExtra && mode === 'adv') more('golpe aprovechado', opts.advExtra);
    if (atkPC) {
      // daño extra de efectos del atacante
      if (tc.hexed && tc.hexed.by === attacker.id) more('maleficio', '1d6', 'necrótico');
      if (tc.marked && tc.marked.by === attacker.id) more('marca del cazador', '1d6', 'fuerza');
      if (weapon && ac.divine_favor) more('favor divino', '1d4', 'radiante');
      if (weapon && tpl(attacker).prey === 'colossus_slayer' && C.hasFeature(attacker, 'colossus_slayer') && !ts.once.colossus && target.hp < target.maxHp) { ts.once.colossus = true; more('asesino de colosos', '1d8'); }
      if (weapon && weapon.ability === 'str' && ac.raging && ac.reckless && C.hasFeature(attacker, 'frenzy') && !ts.once.frenzy) { ts.once.frenzy = true; more('frenesí', '2d6'); }
      const g = tpl(attacker).giant;
      if ((g === 'fire' || g === 'frost') && !ts.once.giant && attacker.uses.giant > 0) {
        ts.once.giant = true; attacker.uses.giant -= 1;
        if (g === 'fire') more('abrasión del fuego', '1d10', 'fuego'); else more('frío de la escarcha', '1d6', 'frío');
      }
    }
    const amount = parts.reduce((a, p) => a + p.amount, 0);
    const typeTxt = [...new Set(parts.map((p) => p.type))].join(' y ');
    this.addLog('attack', `${attacker.name} ataca a ${target.name} con ${label}: ${rollTxt} → ${crit ? '¡CRÍTICO! ' : '¡impacta! '}${amount} de daño ${typeTxt} (${txt.join(' + ')}).`, { success: true, crit, who: attacker.id, fx });
    // Desviar ataques (monje 3): reduce el daño físico de un ataque
    if (tgtPC && !atkPC && C.hasFeature(target, 'deflect_attacks') && !target.reactionUsed && target.hp > 0 && !isIncap(target) && PHYSICAL.includes(parts[0].type)) {
      target.reactionUsed = true;
      const red = roll(`1d10+${C.abilityMod(target, 'dex') + target.level}`);
      const before = parts[0].amount;
      parts[0].amount = Math.max(0, before - red.total);
      this.addLog('combat', `🥋 ${target.name} desvía el ataque: reduce el daño en ${red.total} (${red.detail}).`);
      if (parts[0].amount === 0 && target.uses.focus > 0) {
        target.uses.focus -= 1;
        const sv = this.monsterSave(attacker, 'dex', C.classDC(target, 'wis'));
        const back = sv.success ? 0 : roll(`2${C.martialDie(target).replace(/^1/, '')}+${C.abilityMod(target, 'dex')}`).total;
        this.addLog('combat', `…y le devuelve el golpe a ${attacker.name} (salvación de Destreza ${sv.text})${back ? `: ${back} de daño de fuerza` : ', que lo esquiva'}.`);
        if (back) this.applyDamage(attacker, back, { type: 'fuerza', attacker: target });
      }
    }
    for (const p of parts) if (!target.dead && p.amount > 0) this.applyDamage(target, p.amount, { type: p.type, crit, attacker });
    if (atkPC && weapon && target && !target.dead) this.weaponOnHit(attacker, target, weapon, crit);
    if (onHit && !target.dead && !(tgtPC && target.hp <= 0)) onHit(target, { crit });
    if (atkPC && weapon) ts.lastHit = { targetId: target.id, melee: weapon.melee, crit, weapon: weapon.idx };
    // reacciones al recibir daño
    if (tgtPC && !atkPC && !attacker.dead && target.hp > 0) this.pcDamagedBy(target, attacker);
    return { hit: true, crit, mode, amount };
  },

  /** Efectos al acertar con un arma: maestrías y linaje de las colinas */
  weaponOnHit(pc, target, w, crit) {
    const ts = this.combat.turnState;
    const isMon = !this.isPC(target);
    if (w.mastery === 'sap') { target.conditions.sapped = { untilStartOf: pc.id }; this.addLog('combat', `Debilitar: ${target.name} tendrá desventaja en su próximo ataque.`); }
    if (w.mastery === 'vex') { target.conditions.vexed = { by: pc.id, untilEndOf: pc.id, turns: 2 }; }
    if (w.mastery === 'topple' && !target.conditions.prone && !this.immuneTo(target, 'prone')) {
      const sv = this.saveFor(target, 'con', 8 + w.abilityMod + profBonus(pc.level));
      if (!sv.success) { target.conditions.prone = {}; this.addLog('combat', `Derribar: ${target.name} cae al suelo (${sv.text}).`); }
    }
    if (w.mastery === 'push' && isMon) this.addLog('combat', `Empujar: ${target.name} retrocede 3 m.`);
    if (w.mastery === 'slow' && isMon) this.addLog('combat', `Ralentizar: la velocidad de ${target.name} se reduce en 3 m.`);
    if (w.mastery === 'cleave' && w.melee && !ts.once.cleave && this.livingEnemies().length > 1) ts.cleaveReady = w.idx;
    if (w.prone && !target.conditions.prone && !this.immuneTo(target, 'prone')) { target.conditions.prone = {}; this.addLog('combat', `${target.name} queda derribado.`); }
    if (w.charge && !ts.once.charge) { /* el jabalí embiste: lo aplica la acción */ }
    if (tpl(pc).giant === 'hill' && !ts.once.giant && pc.uses.giant > 0 && !target.conditions.prone && !this.immuneTo(target, 'prone')) {
      ts.once.giant = true; pc.uses.giant -= 1; target.conditions.prone = {};
      this.addLog('combat', `⛰️ Caída de las colinas: ${pc.name} derriba a ${target.name}.`);
    }
    void crit;
  },

  /** Reacciones de un PJ cuando un monstruo le hace daño */
  pcDamagedBy(pc, attacker) {
    if (pc.reactionUsed || isIncap(pc) || pc.hp <= 0) return;
    // Reprensión infernal (brujo o tiefling infernal)
    if (C.knownSpells(pc).includes('hellish_rebuke') && !pc.conditions.raging && !pc.shape) {
      const free = pc.uses.free_hellish_rebuke > 0;
      const slot = free ? 1 : this.slotFor(pc, 1);
      if (slot) {
        if (free) pc.uses.free_hellish_rebuke -= 1; else pc.slots[slot] -= 1;
        pc.reactionUsed = true;
        const st = C.spellStats(pc, 'hellish_rebuke');
        const d = roll(addDice('2d10', slot - 1, '1d10'));
        const sv = this.monsterSave(attacker, 'dex', st.dc, { spell: true });
        const amt = sv.success ? Math.floor(d.total / 2) : d.total;
        this.addLog('spell', `🔥 ${pc.name} responde con Reprensión infernal: ${attacker.name} salva Destreza ${sv.text} → ${amt} de daño de fuego (${d.detail}).`, { fx: { kind: 'spell', who: pc.id, dmgType: 'fuego' } });
        this.applyDamage(attacker, amt, { type: 'fuego', attacker: pc });
        return;
      }
    }
    // Trueno de la tormenta (goliat)
    if (tpl(pc).giant === 'storm' && pc.uses.giant > 0) {
      pc.uses.giant -= 1; pc.reactionUsed = true;
      const d = roll('1d8');
      this.addLog('combat', `⚡ Trueno de la tormenta: ${pc.name} devuelve ${d.total} de daño de trueno a ${attacker.name}.`);
      this.applyDamage(attacker, d.total, { type: 'trueno', attacker: pc });
    }
  },

  applyDamage(target, amount, opts = {}) {
    if (this.isPC(target)) return this.damagePC(target, amount, opts);
    if (target.dead) return;
    const m = MONSTERS[target.type];
    let a = amount;
    if (m.vulnerable && m.vulnerable.includes(opts.type)) { a *= 2; this.addLog('combat', `${target.name} es vulnerable al daño ${opts.type}: ¡daño doble (${a})!`); }
    if (m.immune && m.immune.includes(opts.type)) { a = 0; this.addLog('combat', `${target.name} es inmune al daño ${opts.type}.`); }
    else if (m.resist && m.resist.includes(opts.type)) { a = Math.floor(a / 2); this.addLog('combat', `${target.name} resiste el daño ${opts.type}: solo recibe ${a}.`); }
    if (a <= 0) return;
    target.hp -= a;
    this.fxPush({ kind: 'dmg', target: target.id, amount: a, crit: !!opts.crit });
    // estados que terminan al recibir daño
    for (const [k, v] of Object.entries(target.conditions)) {
      if (v && v.breakOnDamage) { delete target.conditions[k]; if (!opts.silentBreak) this.addLog('combat', `${target.name} ${k === 'unconscious' ? 'se despierta de golpe' : `deja de estar ${(CONDITIONS[k] ? CONDITIONS[k].name : k).toLowerCase()}`}.`); }
    }
    if (target.conditions.laughing && target.hp > 0) {
      const v = target.conditions.laughing;
      const s = this.monsterSave(target, 'wis', v.saveEnds.dc, { adv: true, spell: true });
      if (s.success) { delete target.conditions.laughing; delete target.conditions.prone; this.addLog('roll', `El dolor saca a ${target.name} de su ataque de risa (${s.text}).`, { success: false }); }
    }
    if (target.hp <= 0) {
      if (m.undeadFortitude && opts.type !== 'radiante' && !opts.crit) {
        const s = this.monsterSave(target, 'con', 5 + a);
        if (s.success) { target.hp = 1; this.addLog('combat', `🧟 ${target.name} se niega a caer (Fortaleza de muerto viviente: ${s.text}). Queda con 1 PG.`); return; }
      }
      target.hp = 0;
      target.dead = true;
      target.conditions = {};
      this.addLog('kill', `💥 ${target.name} cae derrotado.`, { fx: { kind: 'kill', target: target.id } });
      // Bendición del Oscuro (brujo infernal 3)
      const k = opts.attacker;
      if (k && this.isPC(k) && C.hasFeature(k, 'dark_ones_blessing') && k.hp > 0) {
        const t = Math.max(1, mod(tpl(k).abilities.cha) + k.level);
        if (t > k.tempHp) { k.tempHp = t; this.addLog('heal', `😈 Bendición del Oscuro: ${k.name} obtiene ${t} PG temporales.`); }
      }
      // terminan los agarres y telarañas de ese monstruo
      this.clearConds((v) => v.by === target.id);
      // concentración que solo afectaba a ese objetivo
      for (const pc of this.partyPCs()) {
        const cc = pc.concentration;
        if (!cc || !cc.targets || !cc.targets.includes(target.id) || cc.markable) continue;
        if (!this.allCombatants().some((o) => !o.dead && Object.values(o.conditions).some((v) => v && v.conc === pc.id)) && !SPELLS[cc.spell].repeat) this.breakConcentration(pc, 'su objetivo ha caído');
      }
    }
  },

  damagePC(pc, amount, opts = {}) {
    if (pc.dead || amount <= 0) return;
    let a = amount;
    const t = tpl(pc);
    if (opts.type && C.isResistant(pc, opts.type)) {
      a = Math.floor(a / 2);
      this.addLog('combat', `${pc.name} resiste el daño ${opts.type}: recibe la mitad (${a}).`);
      if (a <= 0) return;
    }
    if (pc.conditions.resisting && this.combat && !this.combat.turnState.once[`res_${pc.id}`]) {
      this.combat.turnState.once[`res_${pc.id}`] = true;
      const r = roll('1d4').total; a = Math.max(0, a - r);
      this.addLog('combat', `Resistencia: ${pc.name} reduce el daño en ${r}.`);
      if (a <= 0) return;
    }
    // Resistencia de la piedra (goliat): reacción para reducir el daño
    if (t.giant === 'stone' && pc.uses.giant > 0 && !pc.reactionUsed && pc.hp > 0 && this.combat && (a >= 6 || a >= pc.hp)) {
      pc.uses.giant -= 1; pc.reactionUsed = true;
      const r = roll(`1d12+${mod(t.abilities.con)}`);
      a = Math.max(0, a - r.total);
      this.addLog('combat', `🪨 Resistencia de la piedra: ${pc.name} reduce el daño en ${r.total} (${r.detail}).`);
      if (a <= 0) return;
    }
    if (pc.tempHp > 0) { const tmp = Math.min(pc.tempHp, a); pc.tempHp -= tmp; a -= tmp; if (a <= 0) { this.fxPush({ kind: 'dmg', target: pc.id, amount: tmp }); return; } }
    if (pc.hp <= 0) {
      pc.stable = false;
      pc.deathSaves.f += opts.crit ? 2 : 1;
      this.addLog('combat', `${pc.name} recibe daño estando inconsciente: ${opts.crit ? 'dos fallos' : 'un fallo'} de salvación contra muerte (${pc.deathSaves.f}/3).`);
      if (pc.deathSaves.f >= 3) { pc.dead = true; this.addLog('kill', `☠️ ${pc.name} ha muerto.`); }
      return;
    }
    pc.hp -= a;
    this.fxPush({ kind: 'dmg', target: pc.id, amount: a, crit: !!opts.crit });
    delete pc.conditions.charmed;
    if (pc.hp <= 0 && !this.combat) {
      // Regla de la casa: fuera de combate (trampas, caídas, pruebas fallidas) nadie cae ni muere; queda a 1 PG.
      pc.hp = 1;
      this.addLog('down', `🩸 ${pc.name} queda malherido, a 1 PG.`, { fx: { kind: 'dmg', target: pc.id, amount: a } });
      return;
    }
    if (pc.hp <= 0) {
      const overflow = -pc.hp;
      pc.hp = 0;
      if (overflow >= pc.maxHp) {
        pc.dead = true;
        this.addLog('kill', `☠️ ${pc.name} muere instantáneamente por daño masivo.`);
      } else if (pc.uses.relentless > 0) {
        pc.uses.relentless -= 1;
        pc.hp = 1;
        this.addLog('combat', `💢 ${pc.name} se niega a caer: Aguante incansable lo deja con 1 PG.`);
        return;
      } else {
        pc.conditions = { unconscious: {}, prone: {} };
        pc.deathSaves = { s: 0, f: 0 };
        this.addLog('down', `🩸 ${pc.name} cae inconsciente a 0 PG. ¡Necesita ayuda!`, { fx: { kind: 'down', target: pc.id } });
      }
      if (pc.shape) { pc.shape = null; this.addLog('combat', `${pc.name} recupera su forma normal.`); }
      if (pc.concentration) this.breakConcentration(pc, 'ha caído');
      return;
    }
    if (pc.concentration) {
      const dc = Math.min(30, Math.max(10, Math.floor(a / 2)));
      const s = this.pcSave(pc, 'con', dc, { conc: true });
      if (!s.success) this.breakConcentration(pc, `falla la salvación de concentración (${s.text})`);
      else this.addLog('roll', `${pc.name} mantiene la concentración (${s.text}).`, { success: true });
    }
  },

  healPC(pc, amount) {
    if (pc.dead || amount <= 0) return 0;
    const before = pc.hp;
    pc.hp = Math.min(pc.maxHp, pc.hp + amount);
    if (pc.hp > before) this.fxPush({ kind: 'heal', target: pc.id, amount: pc.hp - before });
    if (before <= 0 && pc.hp > 0) {
      pc.deathSaves = { s: 0, f: 0 }; pc.stable = false; delete pc.conditions.unconscious;
      this.addLog('combat', `${pc.name} recupera la consciencia.`);
    }
    return pc.hp - before;
  },

  /** ¿Sigue activa la concentración de quien lanzó un efecto? */
  concOk(casterId) {
    if (!casterId) return true;
    const p = this.pcs[casterId];
    return !!(p && p.concentration);
  },
  breakConcentration(pc, reason) {
    const c = pc.concentration;
    if (!c) return;
    pc.concentration = null;
    this.clearConds((v, k, o) => {
      if (v.conc !== pc.id) return false;
      if (k === 'laughing' || k === 'unconscious') delete o.conditions.prone;
      return true;
    });
    this.addLog('spell', `${pc.name} pierde la concentración en ${SPELLS[c.spell] ? SPELLS[c.spell].name : c.spell} (${reason}).`);
  },
  startConcentration(pc, sid, extra = {}) {
    if (pc.concentration) this.breakConcentration(pc, `empieza a concentrarse en ${SPELLS[sid].name}`);
    pc.concentration = { spell: sid, rounds: 10, targets: [], ...extra };
  },

  slotFor(pc, level) {
    for (let l = level; l <= 9; l++) if ((pc.slots[l] || 0) > 0) return l;
    return null;
  },

  endRage(pc) {
    if (!pc.conditions.raging) return;
    delete pc.conditions.raging;
    this.addLog('combat', `${pc.name} se calma: termina su furia.`);
  },

  // ================================================================ turno de monstruo (IA sencilla)
  /** ¿Es inmune a un estado? (los monstruos tienen condImmune; los PJ, algunos rasgos) */
  immuneTo(c, key) {
    if (this.isPC(c)) return (key === 'drowsy' || key === 'unconscious') && !!tpl(c).noSleep;
    const m = MONSTERS[c.type];
    const list = m.condImmune || [];
    if (list.includes(key)) return true;
    if (key === 'drowsy' || key === 'unconscious') return list.includes('unconscious') || !!m.noSleep;
    if (key === 'turned') return list.includes('frightened');
    return false;
  },
  /** Aplica un estado si el objetivo no es inmune; devuelve true si se aplicó */
  setCond(c, key, val = {}, quiet = false) {
    if (this.immuneTo(c, key)) {
      if (!quiet) this.addLog('combat', `${c.name} es inmune a quedar ${(CONDITIONS[key] ? CONDITIONS[key].name : key).toLowerCase()}.`);
      return false;
    }
    c.conditions[key] = val;
    return true;
  },

  monsterTurn(e) {
    const cb = this.combat;
    if (!cb || e.dead) return this.endTurn();
    const m = MONSTERS[e.type];
    if (e.conditions.commanded) {
      e.conditions.prone = {};
      delete e.conditions.commanded;
      this.addLog('combat', `${e.name} obedece la orden: se postra en el suelo y pierde su turno.`);
      return this.endTurn();
    }
    if (isIncap(e)) {
      const k = NO_ACTION.find((x) => e.conditions[x]);
      const why = { paralyzed: 'está paralizado', unconscious: 'duerme profundamente', turned: 'huye aterrorizado por el poder divino', laughing: 'se retuerce de risa', drowsy: 'cabecea, adormecido', charmed: 'obedece la sugestión y no lucha', stunned: 'está aturdido' }[k] || 'no puede actuar';
      this.addLog('combat', `${e.name} ${why} y no actúa.`);
      return this.endTurn();
    }
    e.uses = e.uses || {};
    const alive = () => this.activePCs().filter((p) => p.hp > 0 && !p.dead);
    // Estirge enganchada: sigue chupando sangre
    if (e.attached) {
      const t = this.pcs[e.attached];
      const atk = m.attacks.find((a) => a.attach);
      if (t && t.hp > 0 && !t.dead && atk) {
        const d = roll(atk.attach.dmg);
        this.addLog('damage', `🩸 ${e.name} sigue enganchada a ${t.name} y le chupa la sangre: ${d.total} de daño ${atk.attach.type} (${d.detail}).`);
        this.applyDamage(t, d.total, { type: atk.attach.type, attacker: e });
        if (t.hp <= 0) e.attached = null;
        return this.endTurn();
      }
      e.attached = null;
    }
    // recarga de ataques especiales (Recarga 5-6)
    m.attacks.forEach((a, i) => { if (a.recharge && e.uses[i] === 0 && roll('1d6').total >= a.recharge) { e.uses[i] = 1; this.addLog('combat', `${e.name} recupera su ${a.name.toLowerCase()}.`); } });
    // Auxilio divino: cura a un aliado malherido (acción adicional)
    if (m.healAlly && (e.uses.heal ?? m.healAlly.uses) > 0) {
      const hurt = this.livingEnemies().filter((o) => o.hp <= o.maxHp / 2).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
      if (hurt) {
        e.uses.heal = (e.uses.heal ?? m.healAlly.uses) - 1;
        const r = roll(m.healAlly.dmg);
        hurt.hp = Math.min(hurt.maxHp, hurt.hp + r.total);
        this.addLog('heal', `✨ ${e.name} pronuncia una palabra de curación: ${hurt.name} recupera ${r.total} PG (${r.detail}).`);
      }
    }
    const pick = () => {
      let ts = alive();
      if (!ts.length) return null;
      const visible = ts.filter((p) => !p.conditions.invisible);
      if (visible.length) ts = visible;
      const grab = ts.find((p) => p.conditions.grappled && p.conditions.grappled.by === e.id);
      if (grab) return grab;
      if (Math.random() < 0.5) return ts.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      return ts[Math.floor(Math.random() * ts.length)];
    };
    /** Santuario: hay que superar una salvación de Sabiduría para atacar al protegido */
    const sanctuaryOk = (t) => {
      const s = t && t.conditions.sanctuary;
      if (!s) return t;
      const sv = this.monsterSave(e, 'wis', s.dc, { spell: true });
      if (sv.success) { this.addLog('roll', `${e.name} supera el Santuario de ${t.name} (${sv.text}).`, { success: false }); return t; }
      const other = alive().filter((p) => p.id !== t.id && !p.conditions.sanctuary);
      this.addLog('roll', `${e.name} no se atreve a atacar a ${t.name} (Santuario: ${sv.text})${other.length ? '' : ' y pierde el ataque'}.`, { success: true });
      return other.length ? other[Math.floor(Math.random() * other.length)] : null;
    };
    let target = pick();
    if (!target) return this.endTurn();
    const idxOf = (pred) => m.attacks.findIndex(pred);
    const meleeIdx = Math.max(0, idxOf((a) => !a.ranged && !a.uses && !a.area));
    const rangedIdx = idxOf((a) => a.ranged && !a.uses && !a.area);
    // acción con salvación (aliento, telaraña, conjuro) si está disponible
    const charges = (a, i) => e.uses[i] ?? (a.uses || 1);
    const areaIdx = idxOf((a, i) => a.area && charges(a, i) > 0);
    if (areaIdx >= 0) {
      const a = m.attacks[areaIdx];
      const ar = a.area;
      const cands = alive().filter((p) => !(ar.cond && p.conditions[ar.cond.key]));
      const want = ar.dmg ? (alive().length >= 2 || Math.random() < 0.4) : (cands.length && Math.random() < 0.5);
      if (cands.length && want) {
        e.uses[areaIdx] = a.recharge ? 0 : charges(a, areaIdx) - 1;
        const tg = cands.sort(() => Math.random() - 0.5).slice(0, ar.targets || 3);
        const d = ar.dmg ? roll(ar.dmg) : null;
        this.addLog('attack', `${ar.dmg ? '🐲' : '✴️'} ${e.name} usa ${a.name}${d ? ` (${d.detail})` : ''}.`, { fx: { kind: 'spell', who: e.id, dmgType: ar.type || null } });
        for (const p of tg) {
          const sv = this.pcSave(p, ar.save, ar.dc, { charm: ar.cond && ar.cond.key === 'charmed', spell: !!ar.cond });
          const amt = d ? (sv.success ? (ar.half ? Math.floor(d.total / 2) : 0) : d.total) : 0;
          const cn = ar.cond && CONDITIONS[ar.cond.key] ? CONDITIONS[ar.cond.key].name.toLowerCase() : null;
          this.addLog('roll', `${p.name}: salvación de ${ABILITIES[ar.save].name} ${sv.text} → ${[d ? `${amt} de daño ${ar.type}` : null, !sv.success && cn ? `queda ${cn}` : null].filter(Boolean).join(' y ') || 'se libra'}.`, { success: sv.success });
          if (amt > 0) this.applyDamage(p, amt, { type: ar.type, attacker: e });
          if (!sv.success && ar.drain && amt > 0 && !p.dead) this.drainMax(p, amt);
          if (!sv.success && ar.cond && !p.dead && p.hp > 0) this.setCond(p, ar.cond.key, this.monsterCond(e, p, ar.cond, ar.dc));
        }
        return this.endTurn();
      }
    }
    let plan;
    const special = idxOf((a, i) => a.uses && !a.area && (e.uses[i] ?? a.uses) > 0);
    if (special >= 0 && Math.random() < 0.45) {
      e.uses[special] = (e.uses[special] ?? m.attacks[special].uses) - 1;
      plan = [special];
    } else if (m.multiattack && !(rangedIdx >= 0 && Math.random() < 0.15)) plan = m.multiattack.slice();
    else if (rangedIdx >= 0 && Math.random() < 0.25 && !target.conditions.prone) plan = [rangedIdx];
    else plan = [meleeIdx];
    let checked = null;
    for (let n = 0; n < plan.length; n++) {
      if (!this.combat || e.dead || isIncap(e)) break;
      if (!target || target.hp <= 0 || target.dead) { target = pick(); if (!target) break; }
      if (checked !== target.id) { target = sanctuaryOk(target); if (!target) break; checked = target.id; }
      let atk = m.attacks[plan[n]];
      if (atk.paralyze && target.conditions.paralyzed) {
        const alt = idxOf((a) => !a.ranged && !a.paralyze && !a.uses && !a.area);
        if (alt >= 0) atk = m.attacks[alt];
      }
      const extra = [];
      if (atk.bonusDmg) extra.push({ label: atk.bonusDmg.label || atk.bonusDmg.type, dmg: atk.bonusDmg.dmg, type: atk.bonusDmg.type });
      const bloodied = target.hp <= target.maxHp / 2;
      const grabbed = target.conditions.grappled && target.conditions.grappled.by === e.id;
      e.lastTarget = target.id;
      const res = this.resolveAttack(e, target, {
        bonus: atk.bonus, dmg: atk.dmg, dmgType: atk.type, ranged: !!atk.ranged && !atk.spell, isSpell: !!atk.spell, label: atk.name, extraOnHit: extra,
        advExtra: atk.advExtra, adv: atk.advIfGrappled && grabbed ? 'lo tiene agarrado' : null,
        onHit: (t) => this.monsterOnHit(e, atk, t),
      });
      if (res && res.hit && atk.drain && res.amount > 0 && !target.dead) this.drainMax(target, res.amount);
      // Rabia del gnoll: tras herir a alguien maltrecho, ataca otra vez (una vez por combate)
      if (res && res.hit && m.rampage && bloodied && !e.uses.rampage && this.combat && !target.dead && target.hp > 0) {
        e.uses.rampage = 1;
        this.addLog('combat', `😤 ${e.name} entra en un frenesí de sangre y vuelve a atacar.`);
        plan.splice(n + 1, 0, meleeIdx);
      }
    }
    this.endTurn();
  },

  /** Estado que causa un monstruo con una salvación (telaraña, orden, parálisis, canción) */
  monsterCond(e, t, c, dc) {
    const v = { by: e.id };
    if (c.untilEndOf) { v.untilEndOf = c.untilEndOf === 'target' ? t.id : e.id; v.turns = c.turns || 1; }
    if (c.untilStartOf) v.untilStartOf = c.untilStartOf === 'target' ? t.id : e.id;
    if (c.saveEnds) v.saveEnds = { save: c.save || (c.key === 'paralyzed' || c.key === 'charmed' ? 'wis' : 'con'), dc };
    if (c.rounds) v.rounds = c.rounds;
    if (c.escape) v.escape = c.escape;
    return v;
  },

  /** Consumir vida: los PG máximos bajan hasta el final del combate */
  drainMax(pc, amount) {
    if (!this.isPC(pc) || amount <= 0) return;
    const a = Math.min(amount, pc.maxHp - 1);
    if (a <= 0) return;
    pc.maxHp -= a; pc.drained = (pc.drained || 0) + a;
    pc.hp = Math.min(pc.hp, pc.maxHp);
    this.addLog('combat', `💀 ${pc.name} siente que la vida se le escapa: sus PG máximos bajan a ${pc.maxHp} hasta que termine el combate.`);
  },

  monsterOnHit(e, atk, t) {
    if (!this.isPC(t) || t.dead || t.hp <= 0) return;
    if (atk.prone && !t.conditions.prone) { t.conditions.prone = {}; this.addLog('combat', `${t.name} queda derribado.`); }
    if (atk.knockdown && !t.conditions.prone) {
      const sv = this.pcSave(t, atk.knockdown.save, atk.knockdown.dc);
      if (!sv.success) { t.conditions.prone = {}; this.addLog('combat', `${t.name} queda derribado (${sv.text}).`); }
      else this.addLog('roll', `${t.name} resiste el derribo (${sv.text}).`, { success: true });
    }
    if (atk.paralyze && !t.conditions.paralyzed) {
      if (atk.paralyze.noElf && tpl(t).species === 'elf') this.addLog('combat', `${t.name} tiene sangre élfica: la parálisis no le afecta.`);
      else {
        const sv = this.pcSave(t, atk.paralyze.save, atk.paralyze.dc);
        if (!sv.success) { t.conditions.paralyzed = { untilEndOf: t.id, turns: 1 }; this.addLog('combat', `😱 ${t.name} queda PARALIZADO hasta el final de su siguiente turno (${sv.text}).`); }
        else this.addLog('roll', `${t.name} resiste la parálisis (${sv.text}).`, { success: true });
      }
    }
    if (atk.grapple && !t.conditions.grappled) {
      t.conditions.grappled = { by: e.id, escape: atk.grapple.dc };
      this.addLog('combat', `🤜 ${e.name} agarra a ${t.name} (CD ${atk.grapple.dc} para escapar).`);
    }
    if (atk.cond && !t.conditions[atk.cond.key]) {
      t.conditions[atk.cond.key] = this.monsterCond(e, t, atk.cond, 10);
      this.addLog('combat', `${t.name} queda ${CONDITIONS[atk.cond.key].name.toLowerCase()}.`);
    }
    if (atk.expose) { t.conditions.exposed = { untilStartOf: e.id }; this.addLog('combat', `${t.name} queda expuesto: el próximo ataque contra él tendrá ventaja.`); }
    if (atk.attach) { e.attached = t.id; this.addLog('combat', `🦟 ${e.name} se engancha a ${t.name}.`); }
    if (atk.strDrain) {
      const r = roll(atk.strDrain).total;
      const cur = (t.conditions.str_drain && t.conditions.str_drain.amount) || 0;
      t.conditions.str_drain = { amount: Math.min(cur + r, tpl(t).abilities.str - 1) };
      this.addLog('combat', `🌑 La sombra consume las fuerzas de ${t.name}: −${r} a su Fuerza (en total −${t.conditions.str_drain.amount}).`);
    }
    if (atk.poison) {
      const sv = this.pcSave(t, atk.poison.save, atk.poison.dc, { poison: true });
      const d = roll(atk.poison.dmg);
      const amt = sv.success ? Math.floor(d.total / 2) : d.total;
      this.addLog('combat', `🕷️ Veneno: ${t.name} salva Constitución ${sv.text} → ${amt} de daño de veneno (${d.detail}${sv.success ? ', la mitad' : ''}).`, { success: sv.success });
      this.applyDamage(t, amt, { type: 'veneno' });
    }
  },
};
// utilidades compartidas con actions.js (no enumerables: no se copian al prototipo de Room)
Object.defineProperty(module.exports, 'helpers', { value: { rollDmg, addDice, empower, isIncap, NO_ACTION } });
