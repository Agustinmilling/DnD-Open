// Motor de partida: salas, escenas, pruebas, combate por turnos y progresión.
const { roll, d20, combineMode, critExpr } = require('./dice');
const { mod, fmtMod, XP_BY_CR, ABILITIES } = require('./rules');
const C = require('./character');
const SPELLS = require('./data/spells');
const ITEMS = require('./data/items');
const SKILLS = require('./data/skills');
const MONSTERS = require('./data/monsters');
const FEATURES = require('./data/features');
const CONDITIONS = require('./data/conditions');
const ADVENTURE = require('./data/adventure');

const clone = (o) => JSON.parse(JSON.stringify(o));
let logSeq = 0;

class Room {
  constructor(code, opts = {}) {
    this.code = code;
    this.delay = opts.delay ?? 900; // ms entre acciones de los enemigos
    this.players = {}; // pid -> {id,name,token,charId,connected,lastSeen}
    this.hostId = null;
    this.phase = 'lobby'; // lobby | adventure | ended
    this.pcs = {}; // charId -> pc
    this.flags = {};
    this.party = { gold: 0, loot: {} };
    this.sceneId = null;
    this.scene = null; // estado de la escena actual
    this.combat = null;
    this.log = [];
    this.chat = [];
    this.listeners = new Set();
    this.timers = new Set();
    this.lastActivity = Date.now();
  }

  // ---------------------------------------------------------------- utilidades
  emit() {
    for (const fn of this.listeners) fn();
  }
  schedule(fn, ms = this.delay) {
    if (ms <= 0) return fn();
    const t = setTimeout(() => { this.timers.delete(t); fn(); this.emit(); }, ms);
    this.timers.add(t);
  }
  destroy() { for (const t of this.timers) clearTimeout(t); this.timers.clear(); }
  addLog(kind, text, extra = {}) {
    this.log.push({ id: ++logSeq, t: Date.now(), kind, text, ...extra });
    if (this.log.length > 400) this.log.splice(0, this.log.length - 400);
  }
  addChat(entry) {
    this.chat.push({ id: ++logSeq, t: Date.now(), ...entry });
    if (this.chat.length > 200) this.chat.splice(0, this.chat.length - 200);
  }
  partyPCs() { return Object.values(this.pcs); }
  activePCs() { return this.partyPCs().filter((p) => !p.dead); }
  ownerOf(pc) { return pc.owner ? this.players[pc.owner] : null; }
  isOrphan(pc) {
    const o = this.ownerOf(pc);
    return !o || !o.connected;
  }

  // ---------------------------------------------------------------- jugadores
  join(name) {
    const id = 'p' + Math.random().toString(36).slice(2, 10);
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const clean = String(name || 'Aventurero').trim().slice(0, 24) || 'Aventurero';
    this.players[id] = { id, name: clean, token, charId: null, connected: false, lastSeen: Date.now() };
    if (!this.hostId) this.hostId = id;
    this.addLog('system', `${clean} se ha unido a la mesa.`);
    this.emit();
    return { pid: id, token };
  }
  auth(pid, token) {
    const p = this.players[pid];
    return p && p.token === token ? p : null;
  }
  setConnected(pid, on) {
    const p = this.players[pid];
    if (!p) return;
    p.connected = on;
    p.lastSeen = Date.now();
    if (!on && this.hostId === pid) {
      const other = Object.values(this.players).find((x) => x.connected);
      if (other) this.hostId = other.id;
    }
    if (on && this.combat) this.maybeAutoTurn();
    this.emit();
  }

  // ---------------------------------------------------------------- acciones
  handle(pid, msg) {
    this.lastActivity = Date.now();
    const player = this.players[pid];
    if (!player) throw new Error('Jugador desconocido');
    const pc = player.charId ? this.pcs[player.charId] : null;
    switch (msg.type) {
      case 'chat': return this.doChat(player, pc, msg.text);
      case 'roll': return this.doFreeRoll(player, pc, msg);
      case 'pick': return this.pickCharacter(player, msg.charId);
      case 'release': return this.releaseCharacter(player);
      case 'start': return this.startAdventure(player);
      case 'check': return this.doCheck(player, pc, msg.checkId);
      case 'vote': return this.doVote(player, pc, msg.exit);
      case 'rest': return this.doShortRest(player);
      case 'explore': return this.doExploreAction(player, pc, msg);
      case 'take': return this.takeLoot(player, pc, msg.item);
      case 'act': return this.doCombatAction(player, pc, msg);
      case 'restart': return this.restartAdventure(player);
      default: throw new Error('Acción desconocida');
    }
  }

  doChat(player, pc, text) {
    text = String(text || '').trim().slice(0, 500);
    if (!text) return;
    const m = text.match(/^\/(r|roll|tirar)\s+(.+)$/i);
    if (m) {
      let expr = m[2].trim();
      let mode = 'normal';
      if (/\s(adv|ventaja|v)$/i.test(expr)) { mode = 'adv'; expr = expr.replace(/\s\S+$/, ''); }
      else if (/\s(dis|desventaja|d)$/i.test(expr)) { mode = 'dis'; expr = expr.replace(/\s\S+$/, ''); }
      return this.doFreeRoll(player, pc, { expr, mode });
    }
    this.addChat({ kind: 'msg', author: player.name, char: pc ? pc.name : null, color: pc ? C.TEMPLATES[pc.templateId].color : null, text });
  }

  doFreeRoll(player, pc, { expr, mode = 'normal', label, sheet }) {
    let result;
    let lbl = label;
    if (sheet && pc) {
      // tirada desde la ficha: habilidad, salvación o característica
      let m = 0;
      if (sheet.kind === 'skill' && SKILLS[sheet.key]) { m = C.skillMod(pc, sheet.key); lbl = `Prueba de ${SKILLS[sheet.key].name}`; }
      else if (sheet.kind === 'save' && ABILITIES[sheet.key]) { m = C.saveMod(pc, sheet.key); lbl = `Salvación de ${ABILITIES[sheet.key].name}`; }
      else if (sheet.kind === 'ability' && ABILITIES[sheet.key]) { m = mod(C.TEMPLATES[pc.templateId].abilities[sheet.key]); lbl = `Prueba de ${ABILITIES[sheet.key].name}`; }
      else if (sheet.kind === 'init') { m = mod(C.TEMPLATES[pc.templateId].abilities.dex); lbl = 'Iniciativa'; }
      expr = `1d20${m >= 0 ? '+' : ''}${m}`;
    }
    if (!expr) throw new Error('Falta la expresión de dados');
    if (mode !== 'normal' && /^1?d20/i.test(expr)) {
      const r = d20(mode);
      const rest = expr.replace(/^1?d20/i, '') || '+0';
      const restRoll = roll('0' + rest);
      result = { total: r.natural + restRoll.total, detail: `d20(${r.dice.join(', ')}${mode === 'adv' ? ' ventaja' : ' desventaja'})${rest !== '+0' ? ' ' + rest : ''}`, natural: r.natural };
    } else {
      result = roll(expr);
      if (/^1?d20/i.test(result.expr)) result.natural = result.rolls[0].results[0];
    }
    this.addChat({
      kind: 'roll', author: player.name, char: pc ? pc.name : null, color: pc ? C.TEMPLATES[pc.templateId].color : null,
      label: lbl ? String(lbl).slice(0, 60) : null, expr, total: result.total, detail: result.detail,
      crit: result.natural === 20, fumble: result.natural === 1,
    });
  }

  pickCharacter(player, charId) {
    if (!C.TEMPLATES[charId]) throw new Error('Personaje desconocido');
    if (this.combat) throw new Error('No puedes cambiar de personaje durante un combate');
    const takenBy = Object.values(this.players).find((p) => p.charId === charId && p.id !== player.id);
    if (takenBy && takenBy.connected) throw new Error(`${takenBy.name} ya controla a ese personaje`);
    if (takenBy) takenBy.charId = null; // se libera un personaje de alguien desconectado
    if (player.charId && this.phase === 'lobby') delete this.pcs[player.charId];
    if (player.charId && this.pcs[player.charId]) this.pcs[player.charId].owner = null;
    player.charId = charId;
    if (this.phase === 'lobby') {
      this.pcs[charId] = C.createPC(charId);
    } else if (!this.pcs[charId]) {
      // incorporación a mitad de aventura: entra con la XP del miembro más rezagado del grupo
      const others = this.partyPCs();
      const xp = others.length ? Math.min(...others.map((p) => p.xp)) : 0;
      this.pcs[charId] = C.createPC(charId, xp);
      this.addLog('system', `${C.TEMPLATES[charId].name} se une al grupo.`);
    }
    this.pcs[charId].owner = player.id;
    this.addLog('system', `${player.name} juega con ${C.TEMPLATES[charId].name}.`);
  }

  releaseCharacter(player) {
    if (!player.charId) return;
    if (this.phase === 'lobby') delete this.pcs[player.charId];
    else if (this.pcs[player.charId]) this.pcs[player.charId].owner = null;
    player.charId = null;
  }

  startAdventure(player) {
    if (player.id !== this.hostId) throw new Error('Solo el anfitrión puede comenzar la aventura');
    if (this.phase !== 'lobby') throw new Error('La aventura ya ha comenzado');
    if (!this.partyPCs().length) throw new Error('Elegid al menos un personaje');
    this.phase = 'adventure';
    this.addLog('narration', `— ${ADVENTURE.title} —`, { title: true });
    this.enterScene(ADVENTURE.start);
  }

  restartAdventure(player) {
    if (player.id !== this.hostId) throw new Error('Solo el anfitrión puede reiniciar');
    this.destroy();
    this.combat = null;
    this.flags = {};
    this.party = { gold: 0, loot: {} };
    for (const id of Object.keys(this.pcs)) {
      const owner = this.pcs[id].owner;
      this.pcs[id] = C.createPC(id);
      this.pcs[id].owner = owner;
    }
    this.phase = 'lobby';
    this.sceneId = null;
    this.scene = null;
    this.addLog('system', 'La mesa vuelve al principio. ¡Nueva partida!');
  }

  // ---------------------------------------------------------------- escenas
  sceneDef() { return ADVENTURE.scenes[this.sceneId]; }

  enterScene(id) {
    const def = ADVENTURE.scenes[id];
    this.sceneId = id;
    this.scene = { checks: {}, votes: {}, restUsed: false, combatDone: false, checkpoint: clone({ pcs: this.pcs, party: this.party, flags: this.flags }) };
    this.addLog('scene', def.title, { title: true });
    for (const p of def.text) this.addLog('narration', p);
    if (def.trap && !this.flags[def.trap.unless]) this.runTrap(def.trap);
    if (def.combat) this.startCombat(def.combat);
    if (def.reward) {
      if (def.reward.gold) { this.party.gold += def.reward.gold * this.partyPCs().length; this.addLog('loot', `Recompensa: ${def.reward.gold * this.partyPCs().length} po para el grupo.`); }
    }
    if (def.end) {
      this.phase = 'ended';
      this.addLog('system', '🏆 Aventura completada. El anfitrión puede empezar una nueva partida.');
    }
  }

  runTrap(trap) {
    this.addLog('narration', trap.text);
    const dmg = roll(trap.damage);
    for (const pc of this.activePCs()) {
      const s = this.pcSave(pc, trap.save, trap.dc);
      const amount = s.success ? Math.floor(dmg.total / 2) : dmg.total;
      this.addLog('roll', `${pc.name}: salvación de ${ABILITIES[trap.save].name} ${s.text} → ${s.success ? 'éxito' : 'fallo'}, ${amount} de daño ${trap.type}.`, { success: s.success });
      this.damagePC(pc, amount, { type: trap.type });
    }
  }

  checkVisible(c) {
    if (c.requires && !c.requires.some((f) => this.flags[f])) return false;
    if (c.hideIf && c.hideIf.some((f) => this.flags[f])) return false;
    return true;
  }

  doCheck(player, pc, checkId) {
    if (this.phase !== 'adventure') throw new Error('No hay aventura en curso');
    if (this.combat) throw new Error('Estáis en combate');
    if (!pc || pc.dead) throw new Error('Necesitas un personaje vivo');
    const def = this.sceneDef();
    const c = (def.checks || []).find((x) => x.id === checkId);
    if (!c || !this.checkVisible(c)) throw new Error('Esa opción no está disponible');
    if (def.combat && !this.scene.combatDone) throw new Error('Primero hay que superar el combate');
    const st = this.scene.checks[c.id] || (this.scene.checks[c.id] = { done: false, attempts: [] });
    if (st.done) throw new Error('Esa prueba ya se ha resuelto');
    if (c.mode !== 'group' && st.attempts.includes(pc.id)) throw new Error('Tu personaje ya lo ha intentado');

    let success;
    let failedPCs = [];
    if (c.auto) {
      success = true;
      this.addLog('action', `${pc.name}: ${c.label}`);
    } else if (c.mode === 'group') {
      const pcs = this.activePCs();
      let ok = 0;
      const parts = [];
      for (const p of pcs) {
        const r = this.pcCheck(p, c);
        if (r.success) ok++; else failedPCs.push(p);
        parts.push(`${p.name} ${r.text}${r.success ? ' ✔' : ' ✘'}`);
      }
      success = ok >= Math.ceil(pcs.length / 2);
      this.addLog('roll', `Prueba de grupo — ${c.label}: ${parts.join(' · ')} → ${success ? 'ÉXITO' : 'FALLO'} (${ok}/${pcs.length})`, { success });
    } else {
      const r = this.pcCheck(pc, c);
      success = r.success;
      if (!success) failedPCs = [pc];
      this.addLog('roll', `${pc.name} — ${c.label}: ${r.text} → ${success ? 'ÉXITO' : 'FALLO'}`, { success });
    }
    st.attempts.push(pc.id);
    const out = success ? c.success : c.fail;
    if (success || !c.retry) st.done = true;
    if (c.retry && !success && this.activePCs().every((p) => st.attempts.includes(p.id))) st.done = true;
    st.result = success ? 'success' : 'fail';
    if (!out) return;
    this.addLog('narration', out.text);
    for (const f of out.flags || []) this.flags[f] = true;
    if (out.gold) { const g = out.gold * this.partyPCs().length; this.party.gold += g; this.addLog('loot', `+${g} po para el grupo.`); }
    if (out.items) this.addLoot(out.items);
    if (out.xp) {
      const who = c.mode === 'group' ? this.activePCs() : [pc];
      for (const p of who) this.giveXp(p, out.xp);
    }
    if (out.damageFailed) {
      for (const p of failedPCs) {
        const d = roll(out.damageFailed.expr);
        this.addLog('damage', `${p.name} sufre ${d.total} de daño ${out.damageFailed.type}.`);
        this.damagePC(p, d.total, { type: out.damageFailed.type });
      }
    }
  }

  pcCheck(pc, c) {
    const t = C.TEMPLATES[pc.templateId];
    let skill = c.skill;
    if (c.altSkill && C.skillMod(pc, c.altSkill) > C.skillMod(pc, c.skill)) skill = c.altSkill;
    const m = C.skillMod(pc, skill);
    const adv = c.advIf && c.advIf.some((f) => this.flags[f]);
    const dis = pc.conditions.poisoned || pc.exhaustion > 0 || pc.conditions.frightened;
    const mode = combineMode(adv, dis);
    let r = d20(mode);
    let lucky = '';
    if (r.natural === 1 && C.hasFeature(pc, 'lucky')) { r = d20('normal'); lucky = ' (Afortunada: repite el 1)'; }
    let total = r.natural + m;
    let extra = '';
    if (pc.guidance) {
      const g = roll('1d4').total; total += g; extra = ` +${g} Orientación`; pc.guidance = false;
    }
    const success = total >= c.dc;
    void t;
    return { success, total, text: `[${SKILLS[skill].name}] d20${mode !== 'normal' ? `(${r.dice.join(',')})` : `(${r.natural})`}${fmtMod(m)}${extra} = ${total} vs CD ${c.dc}${lucky}` };
  }

  doVote(player, pc, exitIdx) {
    if (this.phase !== 'adventure') throw new Error('No hay aventura en curso');
    if (this.combat) throw new Error('Estáis en combate');
    if (!pc) throw new Error('Elige un personaje para votar');
    const def = this.sceneDef();
    const ex = def.exits[exitIdx];
    if (!ex) throw new Error('Salida no válida');
    if (def.combat && !this.scene.combatDone) throw new Error('Primero hay que superar el combate');
    if (ex.requires && !ex.requires.some((f) => this.flags[f])) throw new Error('Todavía no podéis ir por ahí');
    this.scene.votes[player.id] = exitIdx;
    const voters = Object.values(this.players).filter((p) => p.charId && this.pcs[p.charId] && (p.connected || p.id === player.id));
    const count = voters.filter((p) => this.scene.votes[p.id] === exitIdx).length;
    this.addLog('system', `${player.name} vota: "${ex.label}" (${count}/${voters.length})`);
    if (count > voters.length / 2) {
      this.addLog('system', `El grupo decide: ${ex.label}.`);
      this.enterScene(ex.to);
    }
  }

  doShortRest(player) {
    const def = this.sceneDef();
    if (!def || !def.shortRest || this.combat) throw new Error('Aquí no podéis descansar');
    if (this.scene.restUsed) throw new Error('Ya habéis descansado aquí');
    if (!player.charId) throw new Error('Necesitas un personaje');
    this.scene.restUsed = true;
    this.addLog('narration', `${player.name} propone un descanso corto. El grupo se sienta una hora a vendarse las heridas y recuperar fuerzas.`);
    for (const pc of this.activePCs()) {
      const t = C.TEMPLATES[pc.templateId];
      const parts = [];
      if (pc.hp <= 0) { pc.hp = 1; pc.stable = false; pc.deathSaves = { s: 0, f: 0 }; delete pc.conditions.unconscious; parts.push('recupera el sentido (1 PG)'); }
      while (pc.hp < pc.maxHp * 0.75 && pc.hitDice > 0) {
        const r = roll(`1d${t.hitDie}`);
        const heal = Math.max(1, r.total + mod(t.abilities.con));
        pc.hp = Math.min(pc.maxHp, pc.hp + heal);
        pc.hitDice -= 1;
        parts.push(`gasta un dado de golpe (d${t.hitDie}: ${r.total}${fmtMod(mod(t.abilities.con))}) y recupera ${heal} PG`);
      }
      pc.uses.second_wind = 1; pc.uses.action_surge = 1; pc.uses.channel_divinity = 1;
      if (t.cls === 'wizard' && pc.uses.arcane_recovery) {
        const max = C.maxSlots(pc);
        let budget = Math.ceil(pc.level / 2);
        const got = [];
        for (const lvl of Object.keys(max).sort((a, b) => b - a)) {
          while (budget >= +lvl && (pc.slots[lvl] || 0) < max[lvl]) { pc.slots[lvl] = (pc.slots[lvl] || 0) + 1; budget -= +lvl; got.push(lvl); }
        }
        if (got.length) { pc.uses.arcane_recovery = 0; parts.push(`usa Recuperación arcana (recupera espacio${got.length > 1 ? 's' : ''} de nivel ${got.join(', ')})`); }
      }
      this.addLog('action', `${pc.name}: ${parts.length ? parts.join('; ') : 'descansa'}. PG ${pc.hp}/${pc.maxHp}.`);
    }
  }

  addLoot(items) {
    for (const [id, n] of Object.entries(items)) {
      this.party.loot[id] = (this.party.loot[id] || 0) + n;
      this.addLog('loot', `Botín: ${ITEMS[id].name}${n > 1 ? ' ×' + n : ''}`);
    }
  }

  takeLoot(player, pc, itemId) {
    if (!pc) throw new Error('Necesitas un personaje');
    if (!this.party.loot[itemId]) throw new Error('Ese objeto ya no está');
    this.party.loot[itemId] -= 1;
    if (!this.party.loot[itemId]) delete this.party.loot[itemId];
    pc.inventory[itemId] = (pc.inventory[itemId] || 0) + 1;
    this.addLog('loot', `${pc.name} se queda con: ${ITEMS[itemId].name}.`);
  }

  giveXp(pc, amount) {
    if (pc.dead) return;
    const msgs = C.gainXp(pc, amount);
    for (const m of msgs) this.addLog('levelup', m);
  }

  // ---------------------------------------------------------------- exploración (fuera de combate)
  exploreActions(pc) {
    if (!pc || pc.dead || pc.hp <= 0 || this.combat || this.phase !== 'adventure') return [];
    const out = [];
    for (const sid of C.knownSpells(pc)) {
      const s = SPELLS[sid];
      if (!s.explore) continue;
      if (s.level > 0 && !this.slotFor(pc, s.level)) continue;
      if (sid === 'mage_armor' && pc.mageArmor) continue;
      if (s.target === 'dying' && !this.activePCs().some((p) => p.hp <= 0)) continue;
      out.push({ key: 'spell:' + sid, label: `${s.name}${s.level ? ` (nv ${s.level})` : ' (truco)'}`, target: s.target, desc: s.desc });
    }
    for (const [id, n] of Object.entries(pc.inventory)) {
      if (n > 0 && ITEMS[id].heal) out.push({ key: 'item:' + id, label: `${ITEMS[id].name} (×${n})`, target: 'allyAny', desc: ITEMS[id].desc });
    }
    if (pc.inventory.healers_kit && this.activePCs().some((p) => p.hp <= 0 && !p.stable)) out.push({ key: 'stabilize', label: 'Estabilizar (kit de sanador)', target: 'dying', desc: ITEMS.healers_kit.desc });
    return out;
  }

  doExploreAction(player, pc, msg) {
    if (this.combat) return this.doCombatAction(player, pc, { ...msg, type: 'act' });
    const acts = this.exploreActions(pc);
    const a = acts.find((x) => x.key === msg.key);
    if (!a) throw new Error('Acción no disponible');
    const target = this.resolveAllyTargets(msg.targets, a.target)[0] || pc;
    this.performUtility(pc, a.key, [target], false);
  }

  // ---------------------------------------------------------------- combate
  startCombat(spec) {
    const n = this.activePCs().length;
    const types = spec.enemies(n);
    const counts = {};
    const enemies = {};
    types.forEach((type, i) => {
      const m = MONSTERS[type];
      counts[type] = (counts[type] || 0) + 1;
      const total = types.filter((x) => x === type).length;
      const named = spec.names && spec.names[type] && counts[type] === 1;
      const hpRoll = roll(m.hp).total;
      const hp = Math.max(hpRoll, Math.ceil(m.avgHp * 0.75));
      const id = 'e' + (i + 1);
      enemies[id] = {
        id, type, name: named ? spec.names[type] : total > 1 ? `${m.name} ${counts[type]}` : m.name,
        hp, maxHp: hp, ac: m.ac, conditions: {}, dead: false,
      };
    });
    this.combat = { round: 1, order: [], turn: 0, enemies, surprised: [], turnState: null, busy: false, xp: 0 };
    // sorpresa
    const mode = spec.surprise ? spec.surprise(this.flags) : null;
    if (mode === 'enemies') {
      this.combat.surprised = Object.keys(enemies);
      this.addLog('combat', '¡Los enemigos están sorprendidos! Perderán su primer turno.');
    } else if (mode === 'party') {
      this.combat.surprised = this.activePCs().map((p) => p.id);
      this.addLog('combat', '¡El grupo ha sido sorprendido! Perdéis vuestro primer turno.');
    } else if (mode === 'perception') {
      const st = roll(`1d20+${spec.ambushStealth || 0}`).total;
      const surprised = this.activePCs().filter((p) => 10 + C.skillMod(p, 'perception') < st);
      this.combat.surprised = surprised.map((p) => p.id);
      this.addLog('combat', `Los enemigos acechaban (Sigilo ${st}). ${surprised.length ? `Sorprendidos (Percepción pasiva menor): ${surprised.map((p) => p.name).join(', ')}.` : '¡Pero nadie del grupo se deja sorprender!'}`);
    }
    // iniciativa
    const inits = [];
    for (const pc of this.activePCs()) {
      const dex = mod(C.TEMPLATES[pc.templateId].abilities.dex);
      const r = d20().natural;
      inits.push({ id: pc.id, side: 'pc', init: r + dex, dex, text: `${pc.name} ${r}${fmtMod(dex)}=${r + dex}` });
    }
    for (const e of Object.values(enemies)) {
      const dex = mod(MONSTERS[e.type].abilities.dex);
      const r = d20().natural;
      inits.push({ id: e.id, side: 'enemy', init: r + dex, dex, text: `${e.name} ${r + dex}` });
    }
    inits.sort((a, b) => b.init - a.init || b.dex - a.dex || (a.side === 'pc' ? -1 : 1));
    this.combat.order = inits.map(({ id, side, init }) => ({ id, side, init }));
    this.addLog('combat', `⚔️ ¡Combate! Iniciativa: ${inits.map((i) => i.text).join(', ')}.`);
    this.beginTurn();
  }

  current() {
    const o = this.combat.order[this.combat.turn];
    return o ? this.getCombatant(o.id) : null;
  }
  getCombatant(id) {
    if (!this.combat) return this.pcs[id];
    return this.combat.enemies[id] || this.pcs[id];
  }
  isPC(c) { return !!c.templateId; }
  livingEnemies() { return this.combat ? Object.values(this.combat.enemies).filter((e) => !e.dead) : []; }

  beginTurn() {
    const cb = this.combat;
    if (!cb) return;
    const c = this.current();
    if (!c) return this.endTurn();
    cb.turnState = { action: 1, bonus: 1, bonusSpell: false, leveledSpell: false, sneakUsed: false, surge: false };
    // efectos que terminan al inicio del turno
    delete c.conditions.dodging;
    delete c.conditions.shield_spell;
    if (this.isPC(c)) c.reactionUsed = false;
    if (c.dead) return this.endTurn(true);
    if (cb.round === 1 && cb.surprised.includes(c.id)) {
      this.addLog('combat', `${c.name} está sorprendido y no actúa este asalto.`);
      return this.endTurn();
    }
    if (c.conditions.prone && !(this.isPC(c) && c.hp <= 0)) {
      delete c.conditions.prone;
      this.addLog('combat', `${c.name} se levanta del suelo.`);
    }
    if (this.isPC(c)) {
      if (c.hp <= 0) {
        if (!c.stable) this.deathSave(c);
        return this.schedule(() => this.endTurn(), Math.min(this.delay, 600));
      }
      if (c.conditions.paralyzed || c.conditions.unconscious) {
        this.addLog('combat', `${c.name} está ${c.conditions.paralyzed ? 'paralizado' : 'inconsciente'} y no puede actuar.`);
        return this.schedule(() => this.endTurn(), Math.min(this.delay, 600));
      }
      this.addLog('turn', `Turno de ${c.name}.`, { who: c.id });
      this.maybeAutoTurn();
    } else {
      cb.busy = true;
      this.schedule(() => this.monsterTurn(c));
    }
  }

  maybeAutoTurn() {
    const cb = this.combat;
    if (!cb || cb.busy) return;
    const c = this.current();
    if (!c || !this.isPC(c) || c.hp <= 0) return;
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
  }

  endTurn(skipEffects = false) {
    const cb = this.combat;
    if (!cb) return;
    const c = this.current();
    if (c && !skipEffects && !c.dead) {
      // salvaciones al final del turno (parálisis)
      const par = c.conditions.paralyzed;
      if (par && par.saveEnds) {
        const s = this.isPC(c) ? this.pcSave(c, par.saveEnds.save, par.saveEnds.dc) : this.monsterSave(c, par.saveEnds.save, par.saveEnds.dc);
        this.addLog('roll', `${c.name} intenta librarse de la parálisis: ${s.text} → ${s.success ? 'se libera' : 'sigue paralizado'}.`, { success: s.success });
        if (s.success) {
          delete c.conditions.paralyzed;
          if (par.conc) this.breakConcentrationByCaster(par.conc, 'el objetivo se libera');
        }
      }
      for (const [k, v] of Object.entries(c.conditions)) {
        if (v && typeof v.rounds === 'number') {
          v.rounds -= 1;
          if (v.rounds <= 0) delete c.conditions[k];
        }
      }
      if (this.isPC(c)) {
        if (c.concentration) {
          c.concentration.rounds -= 1;
          if (c.concentration.rounds <= 0) this.breakConcentration(c, 'se agota la duración');
        }
        if (c.spiritualWeapon > 0) c.spiritualWeapon -= 1;
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
  }

  checkCombatEnd() {
    const cb = this.combat;
    if (!cb) return true;
    if (this.livingEnemies().length === 0) { this.victory(); return true; }
    if (this.activePCs().every((p) => p.hp <= 0)) { this.defeat(); return true; }
    return false;
  }

  victory() {
    const def = this.sceneDef();
    const cb = this.combat;
    this.combat = null;
    this.scene.combatDone = true;
    for (const pc of this.partyPCs()) {
      pc.concentration = null; pc.spiritualWeapon = 0;
      for (const k of ['blessed', 'shielded', 'dodging', 'shield_spell', 'guided', 'hidden', 'helped', 'slowed_frost', 'prone', 'paralyzed', 'frightened']) delete pc.conditions[k];
    }
    this.addLog('combat', '🏁 ¡Victoria!');
    const v = def.combat.victory;
    if (v.text) this.addLog('narration', v.text);
    // Regla de la casa: los caídos sobreviven al terminar el combate
    for (const pc of this.partyPCs()) {
      if (pc.dead) {
        pc.dead = false; pc.hp = 1; pc.exhaustion = Math.min(6, pc.exhaustion + 1); pc.deathSaves = { s: 0, f: 0 }; pc.stable = false;
        delete pc.conditions.unconscious;
        this.addLog('system', `${pc.name} parecía muerto, pero sus compañeros consiguen reanimarlo in extremis (1 PG, 1 nivel de agotamiento). [Regla de la casa]`);
      } else if (pc.hp <= 0) {
        pc.hp = 1; pc.stable = false; pc.deathSaves = { s: 0, f: 0 }; delete pc.conditions.unconscious;
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
  }

  defeat() {
    this.addLog('combat', '💀 Todo el grupo ha caído...');
    this.addLog('narration', 'La oscuridad os envuelve. Pero esta no es la forma en que termina vuestra historia: el tiempo parece retroceder y volvéis a estar al principio de esta escena, con la lección aprendida.');
    const cp = clone(this.scene.checkpoint);
    const owners = {};
    for (const [id, pc] of Object.entries(this.pcs)) owners[id] = pc.owner;
    this.pcs = cp.pcs;
    for (const [id, pc] of Object.entries(this.pcs)) pc.owner = owners[id] ?? pc.owner;
    this.party = cp.party;
    this.flags = cp.flags;
    this.combat = null;
    const id = this.sceneId;
    this.schedule(() => this.enterScene(id), this.delay ? 2500 : 0);
  }

  // ---------------- tiradas de combate
  pcSave(pc, ability, dc) {
    if ((pc.conditions.paralyzed || pc.conditions.unconscious || pc.hp <= 0) && (ability === 'str' || ability === 'dex')) {
      return { success: false, total: 0, text: 'falla automáticamente' };
    }
    let m = C.saveMod(pc, ability);
    const adv = ability === 'dex' && pc.conditions.dodging;
    const dis = pc.exhaustion >= 3;
    const mode = combineMode(adv, dis);
    let r = d20(mode);
    let note = '';
    if (r.natural === 1 && C.hasFeature(pc, 'lucky')) { r = d20('normal'); note = ' (Afortunada)'; }
    let total = r.natural + m;
    let extra = '';
    if (pc.conditions.blessed) { const b = roll('1d4').total; total += b; extra = ` +${b} Bendición`; }
    return { success: total >= dc, total, text: `d20(${r.dice.join(',')})${fmtMod(m)}${extra} = ${total} vs CD ${dc}${note}` };
  }

  monsterSave(e, ability, dc) {
    const m = MONSTERS[e.type];
    if ((e.conditions.paralyzed || e.conditions.unconscious) && (ability === 'str' || ability === 'dex')) {
      return { success: false, total: 0, text: 'falla automáticamente' };
    }
    const bonus = m.saves[ability] ?? mod(m.abilities[ability]);
    const r = d20(ability === 'dex' && e.conditions.dodging ? 'adv' : 'normal');
    const total = r.natural + bonus;
    return { success: total >= dc, total, text: `d20(${r.dice.join(',')})${fmtMod(bonus)} = ${total} vs CD ${dc}` };
  }

  deathSave(pc) {
    const r = d20().natural;
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
  }

  /** Ataque genérico. attacker y target pueden ser PJ o monstruo. */
  resolveAttack(attacker, target, { bonus, dmg, dmgType, ranged = false, label, critOn = 20, extraOnHit, isSpell = false, sneak = null, onHit }) {
    const atkPC = this.isPC(attacker);
    const tgtPC = this.isPC(target);
    const tc = target.conditions;
    const ac = attacker.conditions;
    let adv = false;
    let dis = false;
    const why = [];
    if (ac.hidden) { adv = true; why.push('escondido'); delete ac.hidden; }
    if (ac.helped) { adv = true; why.push('ayuda'); delete ac.helped; }
    if (tc.guided) { adv = true; why.push('saeta guía'); delete tc.guided; }
    if (tc.paralyzed || tc.unconscious || (tgtPC && target.hp <= 0)) { adv = true; why.push('objetivo indefenso'); }
    if (tc.prone) { if (ranged) { dis = true; why.push('objetivo derribado a distancia'); } else { adv = true; why.push('objetivo derribado'); } }
    if (tc.restrained) adv = true;
    if (tc.dodging) { dis = true; why.push('esquiva'); }
    if (ac.prone) { dis = true; why.push('atacante derribado'); }
    if (ac.poisoned) dis = true;
    if (atkPC && attacker.exhaustion >= 3) dis = true;
    if (!atkPC && MONSTERS[attacker.type].packTactics && this.livingEnemies().filter((e) => e.id !== attacker.id && !e.conditions.unconscious).length) {
      adv = true; why.push('tácticas de manada');
    }
    const mode = combineMode(adv, dis);
    let r = d20(mode);
    let note = '';
    if (atkPC && r.natural === 1 && C.hasFeature(attacker, 'lucky')) { r = d20(mode === 'normal' ? 'normal' : mode); note = ' (Afortunada)'; }
    let total = r.natural + bonus;
    let extra = '';
    if (ac.blessed) { const b = roll('1d4').total; total += b; extra = ` +${b} Bendición`; }
    let targetAC = tgtPC ? C.armorClass(target) : target.ac;
    const crit = r.natural >= critOn || ((tc.paralyzed || tc.unconscious || (tgtPC && target.hp <= 0)) && !ranged && r.natural !== 1 && total >= targetAC);
    let hit = r.natural !== 1 && (r.natural === 20 || crit || total >= targetAC);
    // Reacción: conjuro Escudo del mago
    let shieldNote = '';
    if (hit && !crit && tgtPC && !target.reactionUsed && target.hp > 0 && C.knownSpells(target).includes('shield') && total < targetAC + 5 && this.slotFor(target, 1)) {
      const lvl = this.slotFor(target, 1);
      target.slots[lvl] -= 1;
      target.reactionUsed = true;
      target.conditions.shield_spell = {};
      targetAC += 5;
      hit = false;
      shieldNote = ` 🛡️ ${target.name} reacciona con el conjuro Escudo (+5 CA hasta su próximo turno)`;
    }
    const modeTxt = mode === 'normal' ? `d20(${r.natural})` : `d20(${r.dice.join(',')} ${mode === 'adv' ? 'ventaja' : 'desventaja'})`;
    const rollTxt = `${modeTxt}${fmtMod(bonus)}${extra} = ${total} vs CA ${targetAC}${note}${why.length ? ` [${why.join(', ')}]` : ''}${shieldNote}`;
    if (!hit) {
      this.addLog('attack', `${attacker.name} ataca a ${target.name} con ${label}: ${rollTxt} → ${r.natural === 1 ? 'pifia, ' : ''}falla.`, { success: false, who: attacker.id });
      return { hit: false, crit: false, mode };
    }
    let expr = crit ? critExpr(dmg) : dmg;
    const d = roll(expr);
    let amount = Math.max(0, d.total);
    let dmgTxt = `${d.detail}`;
    if (sneak && atkPC && !this.combat.turnState.sneakUsed && (mode === 'adv' || (mode !== 'dis' && this.activePCs().some((p) => p.id !== attacker.id && p.hp > 0)))) {
      const s = roll(crit ? critExpr(sneak) : sneak);
      amount += s.total;
      dmgTxt += ` + furtivo ${s.detail}`;
      this.combat.turnState.sneakUsed = true;
    }
    if (extraOnHit) {
      const s = roll(crit ? critExpr(extraOnHit.dmg) : extraOnHit.dmg);
      amount += s.total;
      dmgTxt += ` + ${extraOnHit.label} ${s.detail}`;
    }
    this.addLog('attack', `${attacker.name} ataca a ${target.name} con ${label}: ${rollTxt} → ${crit ? '¡CRÍTICO! ' : '¡impacta! '}${amount} de daño ${dmgType} (${dmgTxt}).`, { success: true, crit, who: attacker.id });
    this.applyDamage(target, amount, { type: dmgType, crit, attacker });
    if (onHit && !target.dead && !(tgtPC && target.hp <= 0)) onHit(target);
    return { hit: true, crit, mode };
  }

  applyDamage(target, amount, opts = {}) {
    if (this.isPC(target)) return this.damagePC(target, amount, opts);
    const m = MONSTERS[target.type];
    let a = amount;
    if (m.vulnerable && m.vulnerable.includes(opts.type)) { a *= 2; this.addLog('combat', `${target.name} es vulnerable al daño ${opts.type}: ¡daño doble (${a})!`); }
    if (m.immune && m.immune.includes(opts.type)) { a = 0; this.addLog('combat', `${target.name} es inmune al daño ${opts.type}.`); }
    if (a <= 0) return;
    target.hp -= a;
    if (target.conditions.unconscious) { delete target.conditions.unconscious; this.addLog('combat', `${target.name} se despierta de golpe.`); }
    if (target.conditions.turned) { delete target.conditions.turned; }
    if (target.hp <= 0) {
      if (m.undeadFortitude && opts.type !== 'radiante' && !opts.crit) {
        const s = this.monsterSave(target, 'con', 5 + a);
        if (s.success) {
          target.hp = 1;
          this.addLog('combat', `🧟 ${target.name} se niega a caer (Fortaleza de muerto viviente: ${s.text}). Queda con 1 PG.`);
          return;
        }
      }
      target.hp = 0;
      target.dead = true;
      this.addLog('kill', `💥 ${target.name} cae derrotado.`);
      // si estaba inmovilizado por concentración, se libera la concentración
      for (const pc of this.partyPCs()) if (pc.concentration && pc.concentration.enemies && pc.concentration.enemies.includes(target.id) && pc.concentration.spell === 'hold_person') this.breakConcentration(pc, 'el objetivo ha caído');
    }
  }

  damagePC(pc, amount, opts = {}) {
    if (pc.dead || amount <= 0) return;
    let a = amount;
    if (pc.tempHp > 0) { const t = Math.min(pc.tempHp, a); pc.tempHp -= t; a -= t; }
    if (pc.hp <= 0) {
      pc.stable = false;
      pc.deathSaves.f += opts.crit ? 2 : 1;
      this.addLog('combat', `${pc.name} recibe daño estando inconsciente: ${opts.crit ? 'dos fallos' : 'un fallo'} de salvación contra muerte (${pc.deathSaves.f}/3).`);
      if (pc.deathSaves.f >= 3) { pc.dead = true; this.addLog('kill', `☠️ ${pc.name} ha muerto.`); }
      return;
    }
    pc.hp -= a;
    if (pc.hp <= 0) {
      const overflow = -pc.hp;
      pc.hp = 0;
      if (overflow >= pc.maxHp) {
        pc.dead = true;
        this.addLog('kill', `☠️ ${pc.name} muere instantáneamente por daño masivo.`);
      } else {
        pc.conditions.unconscious = {};
        pc.conditions.prone = {};
        pc.deathSaves = { s: 0, f: 0 };
        this.addLog('down', `🩸 ${pc.name} cae inconsciente a 0 PG. ¡Necesita ayuda!`);
      }
      if (pc.concentration) this.breakConcentration(pc, 'ha caído');
      pc.spiritualWeapon = 0;
      return;
    }
    if (pc.concentration) {
      const dc = Math.max(10, Math.floor(a / 2));
      const s = this.pcSave(pc, 'con', dc);
      if (!s.success) this.breakConcentration(pc, `falla la salvación de concentración (${s.text})`);
      else this.addLog('roll', `${pc.name} mantiene la concentración (${s.text}).`, { success: true });
    }
  }

  healPC(pc, amount, source) {
    if (pc.dead) return 0;
    const before = pc.hp;
    pc.hp = Math.min(pc.maxHp, pc.hp + amount);
    if (before <= 0 && pc.hp > 0) {
      pc.deathSaves = { s: 0, f: 0 }; pc.stable = false; delete pc.conditions.unconscious;
      this.addLog('combat', `${pc.name} recupera la consciencia.`);
    }
    return pc.hp - before;
  }

  breakConcentration(pc, reason) {
    const c = pc.concentration;
    if (!c) return;
    pc.concentration = null;
    for (const id of c.allies || []) { const p = this.pcs[id]; if (p) delete p.conditions[SPELLS[c.spell].applies]; }
    if (this.combat) for (const id of c.enemies || []) { const e = this.combat.enemies[id]; if (e) delete e.conditions[SPELLS[c.spell].applies]; }
    this.addLog('spell', `${pc.name} pierde la concentración en ${SPELLS[c.spell].name} (${reason}).`);
  }
  breakConcentrationByCaster(casterId, reason) {
    const pc = this.pcs[casterId];
    if (pc && pc.concentration) this.breakConcentration(pc, reason);
  }

  slotFor(pc, level) {
    for (let l = level; l <= 9; l++) if ((pc.slots[l] || 0) > 0) return l;
    return null;
  }

  // ---------------- turno de monstruo (IA sencilla)
  monsterTurn(e) {
    const cb = this.combat;
    if (!cb || e.dead) return this.endTurn();
    const m = MONSTERS[e.type];
    if (e.conditions.paralyzed || e.conditions.unconscious || e.conditions.turned) {
      const why = e.conditions.paralyzed ? 'está paralizado' : e.conditions.unconscious ? 'duerme profundamente' : 'huye aterrorizado por el poder divino';
      this.addLog('combat', `${e.name} ${why} y no actúa.`);
      return this.endTurn();
    }
    const targets = this.activePCs().filter((p) => p.hp > 0);
    if (!targets.length) return this.endTurn();
    let target;
    if (Math.random() < 0.5) target = targets.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    else target = targets[Math.floor(Math.random() * targets.length)];
    const melee = m.attacks.find((a) => !a.ranged) || m.attacks[0];
    const ranged = m.attacks.find((a) => a.ranged);
    let atk = melee;
    if (e.type === 'ghoul') atk = target.conditions.paralyzed ? m.attacks[1] : m.attacks[0];
    else if (ranged && Math.random() < 0.25 && !target.conditions.prone) atk = ranged;
    const extra = m.surpriseAttack && cb.round === 1 && cb.surprised.includes(target.id) ? { label: 'ataque sorpresa', dmg: m.surpriseAttack } : null;
    this.resolveAttack(e, target, {
      bonus: atk.bonus, dmg: atk.dmg, dmgType: atk.type, ranged: !!atk.ranged, label: atk.name, extraOnHit: extra,
      onHit: (t) => {
        if (atk.knockdown) {
          const s = this.pcSave(t, atk.knockdown.save, atk.knockdown.dc);
          if (!s.success) { t.conditions.prone = {}; this.addLog('combat', `${t.name} queda derribado (${s.text}).`); }
          else this.addLog('roll', `${t.name} resiste el derribo (${s.text}).`, { success: true });
        }
        if (atk.paralyze) {
          if (C.TEMPLATES[t.templateId].elf) { this.addLog('combat', `${t.name} es elfo: la parálisis del necrófago no le afecta.`); return; }
          const s = this.pcSave(t, atk.paralyze.save, atk.paralyze.dc);
          if (!s.success) { t.conditions.paralyzed = { rounds: 10, saveEnds: { save: 'con', dc: atk.paralyze.dc } }; this.addLog('combat', `😱 ${t.name} queda PARALIZADO (${s.text}).`); }
          else this.addLog('roll', `${t.name} resiste la parálisis (${s.text}).`, { success: true });
        }
      },
    });
    this.endTurn();
  }

  // ---------------- turno de PJ
  combatActions(pc) {
    const cb = this.combat;
    if (!cb || !pc) return [];
    const cur = this.current();
    if (!cur || cur.id !== pc.id || cb.busy || pc.hp <= 0) return [];
    const ts = cb.turnState;
    const t = C.TEMPLATES[pc.templateId];
    const out = [];
    const sneak = C.sneakDice(pc);
    if (ts.action > 0) {
      for (const w of C.weaponAttacks(pc)) {
        out.push({ key: 'attack:' + w.idx, cost: 'action', group: 'Atacar', label: `${w.name} (${fmtMod(w.toHit)}, ${w.dmg} ${w.type})`, target: 'enemy', desc: `Ataque con arma.${sneak && (w.finesse || w.ranged) ? ` Puede añadir Ataque furtivo (${sneak}).` : ''}` });
      }
    }
    // conjuros
    for (const sid of C.knownSpells(pc)) {
      const s = SPELLS[sid];
      if (!s.combat) continue;
      if (s.time === 'action' && ts.action <= 0) continue;
      if (s.time === 'bonus' && ts.bonus <= 0) continue;
      if (s.level > 0 && !this.slotFor(pc, s.level)) continue;
      // regla de conjuros con acción adicional
      if (s.time === 'bonus' && ts.leveledSpell) continue;
      if (s.time === 'action' && s.level > 0 && ts.bonusSpell) continue;
      if (sid === 'spiritual_weapon' && pc.spiritualWeapon > 0) continue;
      if (s.target === 'dying' && !this.activePCs().some((p) => p.hp <= 0 && !p.stable)) continue;
      const slot = s.level > 0 ? this.slotFor(pc, s.level) : 0;
      out.push({ key: 'spell:' + sid, cost: s.time, group: 'Conjuros', label: `${s.name}${s.level ? ` (espacio nv ${slot})` : ' (truco)'}`, target: s.target, maxTargets: s.maxTargets || (s.target === 'enemies3' ? 3 : 1), desc: s.desc });
    }
    // rasgos
    if (t.cls === 'fighter') {
      if (ts.bonus > 0 && pc.uses.second_wind) out.push({ key: 'second_wind', cost: 'bonus', group: 'Rasgos', label: `Tomar aliento (1d10+${pc.level} PG)`, target: 'none', desc: FEATURES.second_wind.desc });
      if (pc.level >= 2 && pc.uses.action_surge && !ts.surge) out.push({ key: 'action_surge', cost: 'free', group: 'Rasgos', label: 'Acción súbita (+1 acción)', target: 'none', desc: FEATURES.action_surge.desc });
    }
    if (t.cls === 'cleric' && pc.level >= 2 && pc.uses.channel_divinity && ts.action > 0) {
      out.push({ key: 'turn_undead', cost: 'action', group: 'Rasgos', label: 'Canalizar divinidad: Expulsar muertos vivientes', target: 'none', desc: FEATURES.channel_divinity.desc });
      out.push({ key: 'preserve_life', cost: 'action', group: 'Rasgos', label: `Canalizar divinidad: Preservar la vida (${5 * pc.level} PG)`, target: 'none', desc: FEATURES.channel_divinity.desc });
    }
    if (t.cls === 'rogue' && pc.level >= 2 && ts.bonus > 0 && !pc.conditions.hidden) {
      out.push({ key: 'hide', cost: 'bonus', group: 'Rasgos', label: 'Acción astuta: Esconderse (Sigilo)', target: 'none', desc: FEATURES.cunning_action.desc });
    }
    if (pc.spiritualWeapon > 0 && ts.bonus > 0) {
      out.push({ key: 'spiritual_attack', cost: 'bonus', group: 'Rasgos', label: 'Atacar con el Arma espiritual', target: 'enemy', desc: SPELLS.spiritual_weapon.desc });
    }
    // objetos
    const fast = C.hasFeature(pc, 'fast_hands');
    for (const [id, n] of Object.entries(pc.inventory)) {
      if (n > 0 && ITEMS[id].heal) {
        const cost = fast ? 'bonus' : 'action';
        if ((cost === 'action' ? ts.action : ts.bonus) > 0) out.push({ key: 'item:' + id, cost, group: 'Objetos', label: `${ITEMS[id].name} ×${n}`, target: 'allyAny', desc: ITEMS[id].desc });
      }
    }
    // acciones generales
    if (ts.action > 0) {
      out.push({ key: 'dodge', cost: 'action', group: 'Otras', label: 'Esquivar', target: 'none', desc: CONDITIONS.dodging.desc });
      if (this.activePCs().some((p) => p.id !== pc.id && p.hp > 0)) out.push({ key: 'help', cost: 'action', group: 'Otras', label: 'Ayudar a un aliado', target: 'allyOther', desc: 'El aliado elegido tiene ventaja en su próxima tirada de ataque.' });
      if (this.activePCs().some((p) => p.hp <= 0 && !p.stable)) {
        out.push({ key: 'stabilize', cost: 'action', group: 'Otras', label: pc.inventory.healers_kit ? 'Estabilizar (kit de sanador)' : 'Estabilizar (Medicina CD 10)', target: 'dying', desc: 'Estabiliza a un aliado moribundo: deja de hacer salvaciones contra muerte.' });
      }
    }
    out.push({ key: 'end', cost: 'free', group: 'Turno', label: 'Terminar turno', target: 'none', desc: '' });
    return out;
  }

  resolveAllyTargets(ids, kind) {
    const list = (ids || []).map((id) => this.pcs[id]).filter(Boolean);
    if (kind === 'dying') return list.filter((p) => p.hp <= 0 && !p.dead);
    return list.filter((p) => !p.dead);
  }
  resolveEnemyTargets(ids) {
    return (ids || []).map((id) => this.combat && this.combat.enemies[id]).filter((e) => e && !e.dead);
  }

  doCombatAction(player, pc, msg) {
    const cb = this.combat;
    if (!cb) throw new Error('No hay combate');
    if (!pc) throw new Error('No tienes personaje');
    const cur = this.current();
    if (!cur || cur.id !== pc.id) throw new Error('No es tu turno');
    if (cb.busy) throw new Error('Espera un momento');
    const acts = this.combatActions(pc);
    const a = acts.find((x) => x.key === msg.key);
    if (!a) throw new Error('Esa acción no está disponible ahora');
    const ts = cb.turnState;
    const spend = () => { if (a.cost === 'action') ts.action -= 1; else if (a.cost === 'bonus') ts.bonus -= 1; };
    const enemyT = this.resolveEnemyTargets(msg.targets);
    const allyT = this.resolveAllyTargets(msg.targets, a.target);
    const needEnemy = ['enemy', 'enemies3'].includes(a.target);
    if (needEnemy && !enemyT.length) throw new Error('Elige un objetivo enemigo');
    if (['ally', 'allies', 'allyAny', 'dying', 'allyOther'].includes(a.target) && !allyT.length) throw new Error('Elige un aliado');

    if (a.key === 'end') { this.addLog('turn', `${pc.name} termina su turno.`); return this.endTurn(); }

    if (a.key.startsWith('attack:')) {
      const w = C.weaponAttacks(pc)[+a.key.split(':')[1]];
      spend();
      this.resolveAttack(pc, enemyT[0], {
        bonus: w.toHit, dmg: w.dmg, dmgType: w.type, ranged: w.ranged, label: w.name, critOn: C.critRange(pc),
        sneak: (w.finesse || w.ranged) ? C.sneakDice(pc) : null,
      });
    } else if (a.key.startsWith('spell:')) {
      const sid = a.key.split(':')[1];
      spend();
      this.castSpell(pc, sid, enemyT, allyT);
    } else if (a.key.startsWith('item:')) {
      spend();
      this.performUtility(pc, a.key, allyT, true);
    } else if (a.key === 'stabilize') {
      spend();
      this.performUtility(pc, 'stabilize', allyT, true);
    } else if (a.key === 'dodge') {
      spend(); pc.conditions.dodging = {};
      this.addLog('action', `${pc.name} adopta una postura defensiva (Esquivar): los ataques contra él tienen desventaja.`);
    } else if (a.key === 'help') {
      spend();
      const ally = allyT.find((p) => p.id !== pc.id) || allyT[0];
      ally.conditions.helped = {};
      this.addLog('action', `${pc.name} distrae a los enemigos para ayudar a ${ally.name}: su próximo ataque tendrá ventaja.`);
    } else if (a.key === 'second_wind') {
      spend(); pc.uses.second_wind = 0;
      const r = roll(`1d10+${pc.level}`);
      const h = this.healPC(pc, r.total);
      this.addLog('heal', `${pc.name} usa Tomar aliento y recupera ${h} PG (${r.detail}).`);
    } else if (a.key === 'action_surge') {
      pc.uses.action_surge = 0; ts.action += 1; ts.surge = true;
      this.addLog('action', `⚡ ${pc.name} usa Acción súbita: ¡una acción adicional este turno!`);
    } else if (a.key === 'turn_undead') {
      spend(); pc.uses.channel_divinity = 0;
      const st = C.spellStats(pc);
      this.addLog('spell', `✨ ${pc.name} alza su símbolo sagrado: ¡Expulsar muertos vivientes!`);
      const undead = this.livingEnemies().filter((e) => MONSTERS[e.type].undead);
      if (!undead.length) this.addLog('combat', 'No hay muertos vivientes que expulsar.');
      for (const e of undead) {
        const s = this.monsterSave(e, 'wis', st.dc);
        if (!s.success) { e.conditions.turned = { rounds: 10 }; this.addLog('combat', `${e.name} queda expulsado (${s.text}).`); }
        else this.addLog('roll', `${e.name} resiste (${s.text}).`, { success: false });
      }
    } else if (a.key === 'preserve_life') {
      spend(); pc.uses.channel_divinity = 0;
      let pool = 5 * pc.level;
      const parts = [];
      for (const p of this.activePCs().sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)) {
        const cap = Math.floor(p.maxHp / 2) - p.hp;
        if (cap <= 0 || pool <= 0) continue;
        const h = this.healPC(p, Math.min(cap, pool));
        pool -= h;
        parts.push(`${p.name} +${h}`);
      }
      this.addLog('heal', `✨ ${pc.name} usa Preservar la vida: ${parts.length ? parts.join(', ') : 'nadie está por debajo de la mitad de sus PG'}.`);
    } else if (a.key === 'hide') {
      spend();
      const r = d20().natural;
      const total = r + C.skillMod(pc, 'stealth');
      const pp = Math.max(...this.livingEnemies().map((e) => MONSTERS[e.type].pp));
      const ok = total > pp;
      if (ok) pc.conditions.hidden = {};
      this.addLog('roll', `${pc.name} intenta esconderse: Sigilo d20(${r})${fmtMod(C.skillMod(pc, 'stealth'))} = ${total} vs Percepción pasiva ${pp} → ${ok ? 'se oculta en las sombras (ventaja en su próximo ataque)' : 'la ven'}.`, { success: ok });
    } else if (a.key === 'spiritual_attack') {
      spend();
      const st = C.spellStats(pc);
      this.resolveAttack(pc, enemyT[0], { bonus: st.attack, dmg: `1d8+${st.mod}`, dmgType: 'fuerza', label: 'el Arma espiritual', isSpell: true });
    }
    if (this.combat === cb && !this.checkCombatEnd()) {
      // fin automático del turno si ya no quedan opciones útiles
      const left = this.combatActions(pc).filter((x) => x.key !== 'end');
      if (!left.length || pc.hp <= 0) this.endTurn();
    }
  }

  castSpell(pc, sid, enemies, allies) {
    const s = SPELLS[sid];
    const st = C.spellStats(pc);
    const ts = this.combat ? this.combat.turnState : null;
    let slot = 0;
    if (s.level > 0) {
      slot = this.slotFor(pc, s.level);
      pc.slots[slot] -= 1;
      if (ts) { if (s.time === 'bonus') ts.bonusSpell = true; else ts.leveledSpell = true; }
    }
    const up = Math.max(0, slot - s.level);
    const upDice = (base, per) => (per && up ? `${base}+${up}${per.replace(/^1/, '')}` : base);
    this.addLog('spell', `✨ ${pc.name} lanza ${s.name}${slot ? ` (espacio de nivel ${slot})` : ''}.`);
    if (s.conc) {
      if (pc.concentration) this.breakConcentration(pc, `empieza a concentrarse en ${s.name}`);
    }
    switch (sid) {
      case 'magic_missile': {
        const target = enemies[0];
        const darts = s.darts + up;
        let total = 0; const parts = [];
        for (let i = 0; i < darts; i++) { const r = roll(s.damage); total += r.total; parts.push(r.total); }
        this.addLog('attack', `${darts} dardos de fuerza impactan automáticamente a ${target.name}: ${parts.join(' + ')} = ${total} de daño de fuerza.`, { success: true });
        this.applyDamage(target, total, { type: 'fuerza' });
        break;
      }
      case 'scorching_ray': {
        const rays = s.rays + up;
        let target = enemies[0];
        for (let i = 0; i < rays; i++) {
          if (!target || target.dead) target = this.livingEnemies()[0];
          if (!target) break;
          this.resolveAttack(pc, target, { bonus: st.attack, dmg: s.damage, dmgType: s.dmgType, ranged: true, label: `Rayo abrasador (${i + 1}/${rays})`, isSpell: true });
        }
        break;
      }
      case 'sleep': {
        let pool = roll(`${5 + 2 * up}d8`).total;
        this.addLog('spell', `Dormir afecta hasta ${pool} PG de criaturas.`);
        const cands = this.livingEnemies().filter((e) => !e.conditions.unconscious).sort((a, b) => a.hp - b.hp);
        const slept = [];
        for (const e of cands) {
          if (MONSTERS[e.type].noSleep) { this.addLog('combat', `${e.name} es un muerto viviente: Dormir no le afecta.`); continue; }
          if (e.hp > pool) break;
          pool -= e.hp;
          e.conditions.unconscious = { rounds: 10 };
          slept.push(e.name);
        }
        this.addLog('combat', slept.length ? `💤 Se quedan dormidos: ${slept.join(', ')}.` : 'Nadie sucumbe al sueño.');
        break;
      }
      case 'burning_hands':
      case 'sacred_flame': {
        const dmgExpr = upDice(s.damage, s.upcast);
        const d = roll(dmgExpr);
        for (const e of enemies.slice(0, sid === 'burning_hands' ? 3 : 1)) {
          const sv = this.monsterSave(e, s.save, st.dc);
          const amount = sv.success ? (s.half ? Math.floor(d.total / 2) : 0) : d.total;
          this.addLog('attack', `${e.name}: salvación de ${ABILITIES[s.save].name} ${sv.text} → ${sv.success ? 'éxito' : 'fallo'}; ${amount} de daño ${s.dmgType}${amount ? ` (${d.detail})` : ''}.`, { success: !sv.success });
          this.applyDamage(e, amount, { type: s.dmgType });
        }
        break;
      }
      case 'hold_person': {
        const e = enemies[0];
        if (MONSTERS[e.type].type !== 'humanoide') { this.addLog('combat', `${e.name} no es humanoide: el conjuro no tiene efecto.`); break; }
        const sv = this.monsterSave(e, 'wis', st.dc);
        if (!sv.success) {
          e.conditions.paralyzed = { saveEnds: { save: 'wis', dc: st.dc }, conc: pc.id };
          pc.concentration = { spell: sid, rounds: 10, enemies: [e.id] };
          this.addLog('combat', `🔒 ${e.name} queda PARALIZADO (${sv.text}). Los ataques cuerpo a cuerpo contra él serán críticos.`);
        } else this.addLog('roll', `${e.name} resiste (${sv.text}).`, { success: false });
        break;
      }
      case 'bless':
      case 'shield_of_faith': {
        const max = (s.maxTargets || 1) + (sid === 'bless' ? up : 0);
        const tg = allies.slice(0, max);
        for (const p of tg) p.conditions[s.applies] = {};
        pc.concentration = { spell: sid, rounds: s.rounds, allies: tg.map((p) => p.id) };
        this.addLog('spell', `${tg.map((p) => p.name).join(', ')} ${tg.length > 1 ? 'quedan' : 'queda'} bajo los efectos de ${s.name}.`);
        break;
      }
      case 'spiritual_weapon': {
        pc.spiritualWeapon = 10;
        this.resolveAttack(pc, enemies[0], { bonus: st.attack, dmg: `${1 + Math.floor(up / 2)}d8+${st.mod}`, dmgType: 'fuerza', label: 'el Arma espiritual', isSpell: true });
        break;
      }
      default: {
        if (s.kind === 'attack') {
          const target = enemies[0];
          this.resolveAttack(pc, target, {
            bonus: st.attack, dmg: upDice(s.damage, s.upcast) + (s.addMod ? `+${st.mod}` : ''), dmgType: s.dmgType, ranged: true, label: s.name, isSpell: true,
            onHit: (t) => { if (s.applies) t.conditions[s.applies] = s.applies === 'slowed_frost' ? { rounds: 1 } : {}; },
          });
        } else {
          this.performUtility(pc, 'spell:' + sid, allies, !!this.combat, slot);
        }
      }
    }
  }

  /** Curaciones, objetos y conjuros de utilidad (dentro o fuera de combate). */
  performUtility(pc, key, targets, inCombat, spentSlot = null) {
    const target = targets[0] || pc;
    if (key.startsWith('item:')) {
      const id = key.split(':')[1];
      if (!pc.inventory[id]) throw new Error('No te quedan');
      pc.inventory[id] -= 1;
      if (!pc.inventory[id]) delete pc.inventory[id];
      const r = roll(ITEMS[id].heal);
      const h = this.healPC(target, r.total);
      this.addLog('heal', `🧪 ${pc.name} ${target.id === pc.id ? 'bebe' : `le da a ${target.name}`} una ${ITEMS[id].name}: recupera ${h} PG (${r.detail}). PG ${target.hp}/${target.maxHp}.`);
      return;
    }
    if (key === 'stabilize') {
      if (pc.inventory.healers_kit) { target.stable = true; target.deathSaves = { s: 0, f: 0 }; this.addLog('heal', `${pc.name} estabiliza a ${target.name} con su kit de sanador.`); return; }
      const r = d20().natural; const total = r + C.skillMod(pc, 'medicine');
      if (total >= 10) { target.stable = true; target.deathSaves = { s: 0, f: 0 }; }
      this.addLog('roll', `${pc.name} intenta estabilizar a ${target.name}: Medicina d20(${r})${fmtMod(C.skillMod(pc, 'medicine'))} = ${total} vs CD 10 → ${total >= 10 ? 'estable' : 'falla'}.`, { success: total >= 10 });
      return;
    }
    if (key.startsWith('spell:')) {
      const sid = key.split(':')[1];
      const s = SPELLS[sid];
      const st = C.spellStats(pc);
      let slot = 0;
      if (spentSlot === null) {
        if (s.level > 0) { slot = this.slotFor(pc, s.level); if (!slot) throw new Error('No te quedan espacios'); pc.slots[slot] -= 1; }
        this.addLog('spell', `✨ ${pc.name} lanza ${s.name}${slot ? ` (espacio de nivel ${slot})` : ''}.`);
      } else slot = spentSlot;
      const up = Math.max(0, slot - s.level);
      switch (sid) {
        case 'cure_wounds':
        case 'healing_word': {
          const die = s.heal.replace(/^1/, '');
          const r = roll(`${1 + up}${die}+${st.mod}`);
          const bonus = C.hasFeature(pc, 'disciple_of_life') ? 2 + (slot || s.level) : 0;
          const h = this.healPC(target, r.total + bonus);
          this.addLog('heal', `${target.name} recupera ${h} PG (${r.detail}${bonus ? ` +${bonus} Discípulo de la vida` : ''}). PG ${target.hp}/${target.maxHp}.`);
          break;
        }
        case 'spare_the_dying':
          target.stable = true; target.deathSaves = { s: 0, f: 0 };
          this.addLog('heal', `${target.name} queda estable.`);
          break;
        case 'guidance':
          target.guidance = true;
          this.addLog('spell', `${target.name} sumará 1d4 a su próxima prueba de característica.`);
          break;
        case 'mage_armor':
          pc.mageArmor = true;
          this.addLog('spell', `La CA de ${pc.name} pasa a ser ${C.armorClass(pc)}.`);
          break;
        case 'lesser_restoration': {
          const removed = ['paralyzed', 'poisoned', 'blinded', 'deafened'].filter((k) => target.conditions[k]);
          for (const k of removed) delete target.conditions[k];
          this.addLog('heal', removed.length ? `${target.name} se libra de: ${removed.map((k) => CONDITIONS[k].name).join(', ')}.` : `${target.name} no tenía ninguna condición que curar.`);
          break;
        }
        default:
          this.addLog('spell', `(${s.name} no tiene efecto mecánico aquí.)`);
      }
    }
  }

  // ---------------------------------------------------------------- vista para el cliente
  pcView(pc) {
    const t = C.TEMPLATES[pc.templateId];
    const st = C.spellStats(pc);
    const owner = this.ownerOf(pc);
    const feats = [];
    for (let l = 1; l <= pc.level; l++) for (const f of t.features[l] || []) feats.push({ id: f, name: FEATURES[f].name, desc: FEATURES[f].desc, source: FEATURES[f].source });
    return {
      id: pc.id, name: pc.name, race: t.race, className: t.className, subclass: t.subclass, background: t.background, bio: t.bio,
      portrait: t.portrait, color: t.color, owner: owner ? owner.name : null, ownerId: pc.owner, connected: owner ? owner.connected : false,
      level: pc.level, xp: pc.xp, nextXp: C.nextXp(pc), hp: pc.hp, maxHp: pc.maxHp, tempHp: pc.tempHp, ac: C.armorClass(pc),
      armor: t.armor.name + (pc.mageArmor ? ' (Armadura de mago)' : ''), hitDice: `${pc.hitDice}d${t.hitDie}`, prof: 2 + Math.floor((pc.level - 1) / 4),
      abilities: Object.fromEntries(Object.entries(t.abilities).map(([k, v]) => [k, { score: v, mod: mod(v), save: C.saveMod(pc, k), saveProf: t.saves.includes(k) }])),
      skills: Object.entries(SKILLS).map(([k, s]) => ({ key: k, name: s.name, ability: s.ability, mod: C.skillMod(pc, k), prof: t.skills.includes(k), expertise: t.expertise.includes(k) })),
      passivePerception: 10 + C.skillMod(pc, 'perception'),
      weapons: C.weaponAttacks(pc),
      spellcasting: st ? { ...st, slots: Object.entries(C.maxSlots(pc)).map(([l, max]) => ({ level: +l, cur: pc.slots[l] || 0, max })), spells: C.knownSpells(pc).map((s) => ({ id: s, name: SPELLS[s].name, level: SPELLS[s].level })) } : null,
      features: feats,
      uses: pc.uses,
      inventory: Object.entries(pc.inventory).filter(([, n]) => n > 0).map(([id, n]) => ({ id, name: ITEMS[id].name, qty: n, desc: ITEMS[id].desc, magic: !!ITEMS[id].magic })),
      conditions: Object.keys(pc.conditions).map((k) => ({ key: k, name: CONDITIONS[k] ? CONDITIONS[k].name : k })).concat(pc.exhaustion ? [{ key: 'exhaustion', name: `Agotamiento ${pc.exhaustion}` }] : []),
      deathSaves: pc.deathSaves, stable: pc.stable, dead: pc.dead, down: pc.hp <= 0 && !pc.dead,
      concentration: pc.concentration ? SPELLS[pc.concentration.spell].name : null, spiritualWeapon: pc.spiritualWeapon,
      guidance: pc.guidance,
    };
  }

  viewFor(pid) {
    const me = this.players[pid];
    const myPc = me && me.charId ? this.pcs[me.charId] : null;
    const def = this.sceneDef();
    const v = {
      code: this.code, phase: this.phase, hostId: this.hostId,
      you: me ? { id: me.id, name: me.name, charId: me.charId, isHost: me.id === this.hostId } : null,
      players: Object.values(this.players).map((p) => ({ id: p.id, name: p.name, charId: p.charId, connected: p.connected, isHost: p.id === this.hostId })),
      catalog: Object.values(C.TEMPLATES).map((t) => {
        const taken = Object.values(this.players).find((p) => p.charId === t.id);
        return { id: t.id, name: t.name, race: t.race, className: t.className, subclass: t.subclass, portrait: t.portrait, color: t.color, bio: t.bio, background: t.background, takenBy: taken ? taken.name : null, takenById: taken ? taken.id : null };
      }),
      adventure: { title: ADVENTURE.title, summary: ADVENTURE.summary },
      pcs: this.partyPCs().map((p) => this.pcView(p)),
      party: { gold: this.party.gold, loot: Object.entries(this.party.loot).map(([id, n]) => ({ id, name: ITEMS[id].name, qty: n, desc: ITEMS[id].desc })) },
      log: this.log.slice(-200),
      chat: this.chat.slice(-120),
    };
    if (def && this.phase !== 'lobby') {
      const voters = Object.values(this.players).filter((p) => p.charId && this.pcs[p.charId] && p.connected);
      const blocked = !!def.combat && !this.scene.combatDone; // combate pendiente (p. ej. tras una derrota)
      v.scene = {
        id: this.sceneId, title: def.title, end: !!def.end,
        checks: (blocked ? [] : def.checks || []).filter((c) => this.checkVisible(c)).map((c) => {
          const st = this.scene.checks[c.id];
          return { id: c.id, label: c.label, group: c.mode === 'group', done: !!(st && st.done), result: st ? st.result : null, triedByMe: !!(st && myPc && st.attempts.includes(myPc.id)) };
        }),
        exits: (blocked ? [] : def.exits || []).map((ex, i) => ({
          idx: i, label: ex.label, enabled: !ex.requires || ex.requires.some((f) => this.flags[f]),
          votes: Object.entries(this.scene.votes).filter(([, x]) => x === i).map(([p]) => this.players[p] && this.players[p].name).filter(Boolean),
          myVote: me ? this.scene.votes[me.id] === i : false,
        })),
        voters: voters.length,
        shortRest: !!def.shortRest && !this.scene.restUsed && !this.combat && !blocked,
      };
    }
    if (this.combat) {
      const cb = this.combat;
      const cur = this.current();
      v.combat = {
        round: cb.round, currentId: cur ? cur.id : null, busy: cb.busy,
        order: cb.order.map((o) => {
          const c = this.getCombatant(o.id);
          return { id: o.id, side: o.side, init: o.init, name: c ? c.name : '?', dead: c ? !!c.dead : true };
        }),
        enemies: Object.values(cb.enemies).map((e) => {
          const m = MONSTERS[e.type];
          const pct = e.hp / e.maxHp;
          return {
            id: e.id, type: e.type, name: e.name, dead: e.dead, ac: e.ac, cr: m.cr, mtype: m.type,
            hpPct: Math.max(0, pct), status: e.dead ? 'Derrotado' : pct >= 1 ? 'Ileso' : pct > 0.5 ? 'Herido' : pct > 0.25 ? 'Malherido' : 'A punto de caer',
            conditions: Object.keys(e.conditions).map((k) => (CONDITIONS[k] ? CONDITIONS[k].name : k === 'turned' ? 'Expulsado' : k)),
          };
        }),
        turnState: cur && myPc && cur.id === myPc.id ? cb.turnState : null,
        actions: myPc ? this.combatActions(myPc) : [],
      };
    }
    v.exploreActions = myPc ? this.exploreActions(myPc) : [];
    return v;
  }
}

module.exports = { Room };
