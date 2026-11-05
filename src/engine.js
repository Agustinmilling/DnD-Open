// Motor de partida: salas, escenas, pruebas, combate por turnos y progresión.
const { roll, d20, combineMode, critExpr } = require('./dice');
const { mod, fmtMod, XP_BY_CR, ABILITIES, XP_TABLE } = require('./rules');
const C = require('./character');
const SPELLS = require('./data/spells');
const ITEMS = require('./data/items');
const SKILLS = require('./data/skills');
const MONSTERS = require('./data/monsters');
const FEATURES = require('./data/features');
const CONDITIONS = require('./data/conditions');
const ADVENTURES = require('./data/adventures');

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
    this.advId = Object.keys(ADVENTURES)[0];
    this.flagOrder = []; // orden en que se activan las marcas (para el diario)
    this.customIds = []; // personajes creados en esta sala
  }

  get adv() { return ADVENTURES[this.advId]; }

  // ---------------------------------------------------------------- utilidades
  emit() {
    this.version = (this.version || 0) + 1; // lo usan los clientes que consultan por sondeo
    for (const fn of this.listeners) fn();
  }
  schedule(fn, ms = this.delay) {
    if (ms <= 0) return fn();
    const t = setTimeout(() => { this.timers.delete(t); fn(); this.emit(); }, ms);
    this.timers.add(t);
  }
  destroy() { for (const t of this.timers) clearTimeout(t); this.timers.clear(); }
  /** Libera la sala por completo (incluidos los personajes creados en ella). */
  dispose() { this.destroy(); for (const id of this.customIds) delete C.TEMPLATES[id]; this.customIds = []; }

  // ---------------------------------------------------------------- marcas (flags) y condiciones de la historia
  setFlag(k, v = true) {
    if (v === false || v === null || v === undefined) { delete this.flags[k]; return; }
    if (!(k in this.flags)) this.flagOrder.push(k);
    this.flags[k] = v;
  }
  /** ¿Se cumplen las condiciones de una opción? requires/showIf (alguna), hideIf (ninguna), when(flags) */
  condOk(o) {
    if (!o) return true;
    if (o.requires && !o.requires.some((f) => this.flags[f])) return false;
    if (o.showIf && !o.showIf.some((f) => this.flags[f])) return false;
    if (o.hideIf && o.hideIf.some((f) => this.flags[f])) return false;
    if (o.when && !o.when(this.flags)) return false;
    return true;
  }
  txt(v) { return typeof v === 'function' ? v(this.flags) : v; }

  addLog(kind, text, extra = {}) {
    const { fx, ...rest } = extra;
    this.log.push({ id: ++logSeq, t: Date.now(), kind, text, ...rest, fx: fx ? [fx] : [] });
    if (this.log.length > 400) this.log.splice(0, this.log.length - 400);
  }
  /** Añade un efecto visual a la última entrada del registro (daño, curación…) */
  fxPush(f) {
    const last = this.log[this.log.length - 1];
    if (last) last.fx.push(f);
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
      case 'adventure': return this.chooseAdventure(player, msg.id);
      case 'create': return this.createCharacter(player, msg.spec === 'random' ? C.randomSpec() : msg.spec);
      case 'deleteChar': return this.deleteCharacter(player, msg.charId);
      case 'check': return this.doCheck(player, pc, msg.checkId);
      case 'vote': return this.doVote(player, pc, msg.exit);
      case 'rest': return this.doShortRest(player);
      case 'explore': return this.doExploreAction(player, pc, msg);
      case 'take': return this.takeLoot(player, pc, msg.item);
      case 'buy': return this.doBuy(player, pc, msg.item);
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
    if (!this.pcs[charId] && !(player.charId && this.phase === 'lobby') && this.partyPCs().length >= 4) throw new Error('El grupo ya tiene 4 personajes');
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

  chooseAdventure(player, id) {
    if (player.id !== this.hostId) throw new Error('Solo el anfitrión elige la campaña');
    if (this.phase !== 'lobby') throw new Error('La aventura ya ha comenzado');
    if (!ADVENTURES[id]) throw new Error('Campaña desconocida');
    this.advId = id;
    this.addLog('system', `Campaña elegida: ${ADVENTURES[id].title}.`);
  }

  createCharacter(player, spec) {
    if (this.combat) throw new Error('No puedes crear un personaje durante un combate');
    if (this.customIds.length >= 12) throw new Error('Esta sala ya tiene demasiados personajes creados');
    const id = `c_${this.code}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const t = C.buildTemplate(spec, id);
    t.room = this.code;
    t.creator = player.id;
    C.TEMPLATES[id] = t;
    this.customIds.push(id);
    this.addLog('system', `${player.name} ha creado a ${t.name} (${t.race}, ${t.className}).`);
    this.pickCharacter(player, id);
  }

  deleteCharacter(player, charId) {
    const t = C.TEMPLATES[charId];
    if (!t || !t.custom || t.room !== this.code) throw new Error('Ese personaje no se puede borrar');
    if (t.creator !== player.id && player.id !== this.hostId) throw new Error('Solo quien lo creó puede borrarlo');
    if (this.phase !== 'lobby' && this.pcs[charId]) throw new Error('No se puede borrar un personaje que está en la aventura');
    for (const p of Object.values(this.players)) if (p.charId === charId) p.charId = null;
    delete this.pcs[charId];
    delete C.TEMPLATES[charId];
    this.customIds = this.customIds.filter((x) => x !== charId);
    this.addLog('system', `${player.name} borra a ${t.name}.`);
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
    this.flags = {}; this.flagOrder = []; this.retries = {};
    for (const [k, v] of Object.entries(this.adv.startFlags || {})) this.setFlag(k, v);
    this.addLog('narration', `— ${this.adv.title} —`, { title: true });
    if (this.adv.startGold) { this.party.gold = this.adv.startGold * this.partyPCs().length; this.addLog('loot', `💰 El grupo empieza con ${this.party.gold} po.`); }
    this.enterScene(this.adv.start);
  }

  restartAdventure(player) {
    if (player.id !== this.hostId) throw new Error('Solo el anfitrión puede reiniciar');
    this.destroy();
    this.combat = null;
    this.flags = {};
    this.flagOrder = [];
    this.retries = {};
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
  sceneDef() { return this.adv.scenes[this.sceneId]; }

  /** Textos de escena: string o { if: (flags) => bool, text } */
  sceneTexts(list) {
    return (list || []).filter((p) => typeof p === 'string' || (p.if ? p.if(this.flags) : true)).map((p) => (typeof p === 'string' ? p : p.text));
  }

  enterScene(id) {
    for (let guard = 0; guard < 5; guard++) {
      const d = this.adv.scenes[id];
      if (!d) throw new Error(`Escena desconocida: ${id}`);
      const to = d.redirect ? d.redirect(this.flags) : null;
      if (!to || to === id) break;
      id = to;
    }
    const def = this.adv.scenes[id];
    this.sceneId = id;
    this.scene = { checks: {}, votes: {}, restUsed: false, combatDone: false, encounterStarted: false, checkpoint: clone({ pcs: this.pcs, party: this.party, flags: this.flags, flagOrder: this.flagOrder }) };
    if (def.onEnter) this.applyOutcome(def.onEnter, { silent: true });
    this.addLog('scene', def.title, { title: true, fx: { kind: 'scene', id, title: def.title } });
    for (const p of this.sceneTexts(def.text)) this.addLog('narration', p);
    if (def.trap && !this.flags[def.trap.unless]) this.runTrap(def.trap);
    if (def.reward) {
      if (def.reward.gold) { const g = def.reward.gold * this.partyPCs().length; this.party.gold += g; this.addLog('loot', `Recompensa: ${g} po para el grupo.`, { fx: { kind: 'gold', amount: g } }); }
      if (def.reward.xp) { this.addLog('xp', `✨ +${def.reward.xp} PX para cada personaje.`); for (const p of this.activePCs()) this.giveXp(p, def.reward.xp); }
    }
    // Hito de nivel: asegura que el grupo llega al menos a cierto nivel (subida por hitos)
    if (def.milestoneLevel) {
      const need = XP_TABLE[def.milestoneLevel - 1] || 0;
      const behind = this.activePCs().filter((p) => p.xp < need);
      if (behind.length) {
        this.addLog('xp', `✨ Hito de la aventura: ${behind.map((p) => p.name).join(', ')} ${behind.length > 1 ? 'alcanzan' : 'alcanza'} el nivel ${def.milestoneLevel}.`);
        for (const p of behind) this.giveXp(p, need - p.xp);
      }
    }
    if (def.combat) {
      const auto = def.combat.auto ? def.combat.auto(this.flags) : true;
      if (auto) this.startCombat(def.combat);
      else this.addLog('system', 'Podéis intentar resolverlo de otra forma… o atacar.');
    }
    if (def.end) {
      this.phase = 'ended';
      if (def.ending) this.addLog('scene', `Final: ${def.ending.title}`, { title: true, ending: def.ending.tone || 'good' });
      this.addLog('system', '🏆 Aventura completada. El anfitrión puede empezar una nueva partida.');
    }
  }

  /** ¿Hay un encuentro pendiente en esta escena? */
  encounterPending() {
    const def = this.sceneDef();
    return !!(def && def.combat && !this.scene.combatDone);
  }

  /** Resolver el encuentro sin combate (negociación, intimidación, pago…) */
  resolvePeacefully() {
    const def = this.sceneDef();
    if (!def.combat || this.scene.combatDone) return;
    this.scene.combatDone = true;
    const p = def.combat.peaceful || {};
    if (p.text) this.addLog('narration', this.txt(p.text));
    const ms = (def.combat.victory && def.combat.victory.milestoneXp) || 0;
    const xp = ms + (p.xp || 0);
    if (xp) {
      this.addLog('xp', `✨ Encuentro superado sin combate: ${xp} PX para cada personaje.`);
      for (const pc of this.activePCs()) this.giveXp(pc, xp);
    }
    if (p.gold) { const g = p.gold * this.partyPCs().length; this.party.gold += g; this.addLog('loot', `+${g} po para el grupo.`, { fx: { kind: 'gold', amount: g } }); }
    if (p.items) this.addLoot(p.items);
  }

  runTrap(trap) {
    this.addLog('narration', trap.text);
    const dmg = roll(trap.damage);
    for (const pc of this.activePCs()) {
      const s = this.pcSave(pc, trap.save, trap.dc);
      const amount = s.success ? Math.floor(dmg.total / 2) : dmg.total;
      this.addLog('roll', `${pc.name}: salvación de ${ABILITIES[trap.save].name} ${s.text} → ${s.success ? 'éxito' : 'fallo'}, ${amount} de daño ${trap.type}.`, { success: s.success, fx: { kind: 'd20', who: pc.id, nat: s.nat, total: s.total, success: s.success } });
      this.damagePC(pc, amount, { type: trap.type });
    }
  }

  checkVisible(c) {
    if (this.scene.restarting) return false;
    if (!this.condOk(c)) return false;
    // las opciones previas al combate desaparecen cuando el encuentro se resuelve
    if (c.preCombat && (!this.encounterPending() || this.combat)) return false;
    // el resto de opciones de una escena con encuentro pendiente esperan a que se resuelva
    if (!c.preCombat && this.encounterPending()) return false;
    return true;
  }

  exitVisible(ex) {
    if (this.scene.restarting) return false;
    if (ex.hideIf && ex.hideIf.some((f) => this.flags[f])) return false;
    if (ex.showIf && !ex.showIf.some((f) => this.flags[f])) return false;
    if (ex.when && !ex.when(this.flags)) return false;
    if (ex.fight) return this.encounterPending() && !this.combat;
    return !this.encounterPending();
  }

  doCheck(player, pc, checkId) {
    if (this.phase !== 'adventure') throw new Error('No hay aventura en curso');
    if (this.combat) throw new Error('Estáis en combate');
    if (!pc || pc.dead || pc.hp <= 0) throw new Error('Necesitas un personaje consciente');
    const def = this.sceneDef();
    const c = (def.checks || []).find((x) => x.id === checkId);
    if (!c || !this.checkVisible(c)) throw new Error('Esa opción no está disponible');
    const st = this.scene.checks[c.id] || (this.scene.checks[c.id] = { done: false, attempts: [] });
    if (st.done) throw new Error('Esa prueba ya se ha resuelto');
    if (c.mode !== 'group' && st.attempts.includes(pc.id)) throw new Error('Tu personaje ya lo ha intentado');
    const n = this.partyPCs().length;
    if (c.cost && this.party.gold < c.cost * n) throw new Error(`No tenéis suficiente oro (hacen falta ${c.cost * n} po)`);
    if (c.needsItem && !pc.inventory[c.needsItem]) throw new Error(`Tu personaje necesita: ${ITEMS[c.needsItem].name}`);

    let success;
    let failedPCs = [];
    if (c.auto) {
      success = true;
      this.addLog('action', `${pc.name}: ${c.label}`);
    } else if (c.mode === 'group') {
      const pcs = this.activePCs().filter((p) => p.hp > 0);
      let ok = 0;
      const parts = [];
      for (const p of pcs) {
        const r = this.pcCheck(p, c);
        if (r.success) ok++; else failedPCs.push(p);
        parts.push(`${p.name} ${r.text}${r.success ? ' ✔' : ' ✘'}`);
      }
      success = ok >= Math.ceil(pcs.length / 2);
      this.addLog('roll', `Prueba de grupo — ${c.label}: ${parts.join(' · ')} → ${success ? 'ÉXITO' : 'FALLO'} (${ok}/${pcs.length})`, { success, fx: { kind: 'group', success, ok, total: pcs.length } });
    } else {
      const r = this.pcCheck(pc, c);
      success = r.success;
      if (!success) failedPCs = [pc];
      this.addLog('roll', `${pc.name} — ${c.label}: ${r.text} → ${success ? 'ÉXITO' : 'FALLO'}`, { success, fx: { kind: 'd20', who: pc.id, nat: r.nat, total: r.total, success } });
    }
    if (c.cost) { this.party.gold -= c.cost * n; this.addLog('loot', `−${c.cost * n} po del grupo.`, { fx: { kind: 'gold', amount: -c.cost * n } }); }
    if (c.needsItem) { pc.inventory[c.needsItem] -= 1; if (!pc.inventory[c.needsItem]) delete pc.inventory[c.needsItem]; }
    st.attempts.push(pc.id);
    const out = success ? c.success : c.fail;
    if (success || !c.retry) st.done = true;
    if (c.retry && !success && this.activePCs().every((p) => st.attempts.includes(p.id))) st.done = true;
    st.result = success ? 'success' : 'fail';
    if (!out) return;
    this.applyOutcome(out, { pc, group: c.mode === 'group', failedPCs, combat: def.combat });
  }

  /** Aplica las consecuencias de una prueba, una decisión o la entrada en una escena. */
  applyOutcome(out, { pc = null, group = true, failedPCs = [], combat = null, silent = false } = {}) {
    const n = this.partyPCs().length;
    const def = this.sceneDef();
    if (out.text) this.addLog('narration', this.txt(out.text));
    for (const f of out.flags || []) this.setFlag(f, true);
    for (const f of out.unset || []) this.setFlag(f, false);
    for (const [k, v] of Object.entries(out.set || {})) this.setFlag(k, v);
    for (const [k, v] of Object.entries(out.inc || {})) this.setFlag(k, (Number(this.flags[k]) || 0) + v);
    if (out.journal && !silent) this.addLog('system', `📜 ${out.journal}`);
    if (out.gold) {
      const g = out.gold * n; this.party.gold = Math.max(0, this.party.gold + g);
      this.addLog('loot', `${g > 0 ? '+' : ''}${g} po para el grupo.`, { fx: { kind: 'gold', amount: g } });
    }
    if (out.items) this.addLoot(out.items);
    if (out.xp) {
      const who = group || !pc ? this.activePCs() : [pc];
      for (const p of who) this.giveXp(p, out.xp);
    }
    if (out.tempHp) {
      for (const p of this.activePCs()) p.tempHp = Math.max(p.tempHp, out.tempHp);
      this.addLog('heal', `🛡️ Todo el grupo obtiene ${out.tempHp} puntos de golpe temporales.`, { fx: { kind: 'buff', targets: this.activePCs().map((p) => p.id) } });
    }
    if (out.heal) {
      for (const p of this.activePCs()) {
        const h = this.healPC(p, roll(out.heal).total);
        if (h) this.addLog('heal', `${p.name} recupera ${h} PG.`, { fx: { kind: 'heal', target: p.id, amount: h } });
      }
    }
    if (out.damageFailed) {
      for (const p of failedPCs) {
        const d = roll(out.damageFailed.expr);
        this.addLog('damage', `${p.name} sufre ${d.total} de daño ${out.damageFailed.type}.`);
        this.damagePC(p, d.total, { type: out.damageFailed.type });
      }
    }
    if (out.damageAll) {
      for (const p of this.activePCs().filter((x) => x.hp > 0)) {
        const d = roll(out.damageAll.expr);
        this.addLog('damage', `${p.name} sufre ${d.total} de daño ${out.damageAll.type}.`);
        this.damagePC(p, d.total, { type: out.damageAll.type });
      }
    }
    if (out.peaceful) this.resolvePeacefully();
    if (out.startCombat && this.encounterPending() && !this.combat) this.startCombat((combat || def.combat));
    if (out.goto) {
      const to = this.txt(out.goto);
      this.scene.restarting = true; // oculta opciones mientras se cambia de escena
      this.schedule(() => this.enterScene(to), this.delay ? 1200 : 0);
    }
  }

  pcCheck(pc, c) {
    let skill = c.skill;
    if (c.altSkill && C.skillMod(pc, c.altSkill) > C.skillMod(pc, c.skill)) skill = c.altSkill;
    const m = C.skillMod(pc, skill);
    const adv = (c.advIf && c.advIf.some((f) => this.flags[f])) || (c.advIfItem && this.activePCs().some((p) => p.inventory[c.advIfItem]));
    const disFlag = c.disIf && c.disIf.some((f) => this.flags[f]);
    const dis = pc.conditions.poisoned || pc.exhaustion > 0 || pc.conditions.frightened || disFlag;
    const mode = combineMode(adv, dis);
    let r = d20(mode);
    let lucky = '';
    if (r.natural === 1 && C.hasFeature(pc, 'lucky')) { r = d20('normal'); lucky = ' (Afortunada: repite el 1)'; }
    let total = r.natural + m;
    let extra = '';
    if (pc.guidance) {
      const g = roll('1d4').total; total += g; extra = ` +${g} Orientación`; pc.guidance = false;
    }
    const dc = c.dc + (c.dcMod ? c.dcMod(this.flags) : 0);
    const success = total >= dc;
    return { success, total, nat: r.natural, text: `[${SKILLS[skill].name}] d20${mode !== 'normal' ? `(${r.dice.join(',')} ${mode === 'adv' ? 'ventaja' : 'desventaja'})` : `(${r.natural})`}${fmtMod(m)}${extra} = ${total} vs CD ${dc}${lucky}` };
  }

  doVote(player, pc, exitIdx) {
    if (this.phase !== 'adventure') throw new Error('No hay aventura en curso');
    if (this.combat) throw new Error('Estáis en combate');
    if (!pc) throw new Error('Elige un personaje para votar');
    const def = this.sceneDef();
    const ex = def.exits[exitIdx];
    if (!ex || !this.exitVisible(ex)) throw new Error('Esa opción no está disponible ahora');
    if (ex.requires && !ex.requires.some((f) => this.flags[f])) throw new Error('Todavía no podéis ir por ahí');
    if (ex.fight) {
      // atacar no se vota: cualquiera puede desenvainar
      // Si todo el grupo está inconsciente fuera de combate, se deja avanzar para no bloquear la partida.
      if (pc.hp <= 0 && this.activePCs().some((p) => p.hp > 0)) throw new Error('Tu personaje está inconsciente');
      this.addLog('action', `⚔️ ${pc.name}: ${ex.label}`);
      return this.startCombat(def.combat);
    }
    this.scene.votes[player.id] = exitIdx;
    const voters = Object.values(this.players).filter((p) => p.charId && this.pcs[p.charId] && (p.connected || p.id === player.id));
    const count = voters.filter((p) => this.scene.votes[p.id] === exitIdx).length;
    this.addLog('system', `${player.name} vota: "${this.txt(ex.label)}" (${count}/${voters.length})`);
    if (count > voters.length / 2) {
      this.addLog('system', `El grupo decide: ${this.txt(ex.label)}.`);
      if (ex.effects) this.applyOutcome(ex.effects, { group: true });
      this.enterScene(this.txt(ex.to));
    }
  }

  doBuy(player, pc, itemId) {
    const def = this.sceneDef();
    if (!def || !def.shop || this.combat) throw new Error('Aquí no hay tienda');
    if (!pc) throw new Error('Necesitas un personaje');
    const price = def.shop[itemId];
    if (price == null) throw new Error('Eso no se vende aquí');
    if (this.party.gold < price) throw new Error(`No tenéis suficiente oro (${price} po)`);
    this.party.gold -= price;
    pc.inventory[itemId] = (pc.inventory[itemId] || 0) + 1;
    this.addLog('loot', `🛒 ${pc.name} compra ${ITEMS[itemId].name} por ${price} po.`, { fx: { kind: 'gold', amount: -price } });
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
      pc.uses.second_wind = 1; pc.uses.action_surge = 1; pc.uses.channel_divinity = 1; pc.uses.breath = 1;
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
    for (const m of msgs) this.addLog('levelup', m, { fx: { kind: 'levelup', who: pc.id, level: pc.level, name: pc.name } });
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
    const list = this.resolveAllyTargets(msg.targets, a.target);
    this.performUtility(pc, a.key, a.target === 'allies' ? (list.length ? list : [pc]) : [list[0] || pc], false);
  }

  // ---------------------------------------------------------------- combate
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
      const hpRoll = roll(m.hp).total;
      const hp = Math.max(hpRoll, Math.ceil(m.avgHp * 0.75));
      const id = 'e' + (i + 1);
      enemies[id] = {
        id, type, name: named ? spec.names[type] : total > 1 ? `${m.name} ${counts[type]}` : m.name,
        hp, maxHp: hp, ac: m.ac, conditions: {}, dead: false,
      };
    });
    if (spec.adjust) spec.adjust(Object.values(enemies), this.flags, (t) => this.addLog('combat', t));
    if (retry >= 1) {
      const f = Math.max(0.4, 1 - 0.2 * retry);
      for (const e of Object.values(enemies)) { e.hp = Math.max(1, Math.ceil(e.hp * f)); e.maxHp = e.hp; }
      this.addLog('system', `🕯️ Lo intentáis de nuevo, con la lección aprendida: esta vez el enemigo parece ${retry > 1 ? 'mucho ' : ''}más débil. [Regla de la casa]`);
    }
    this.combat = { round: 1, order: [], turn: 0, enemies, surprised: [], turnState: null, busy: false, xp: 0 };
    this.scene.encounterStarted = true;
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
    this.addLog('combat', `⚔️ ¡Combate! Iniciativa: ${inits.map((i) => i.text).join(', ')}.`, { fx: { kind: 'combatStart' } });
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
    cb.turnState = { action: 1, bonus: 1, bonusSpell: false, leveledSpell: false, sneakUsed: false, surge: false, attackedLight: false, offhandUsed: false };
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
      this.addLog('turn', `Turno de ${c.name}.`, { who: c.id, fx: { kind: 'turn', who: c.id } });
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
    if (v.goto) {
      const to = this.txt(v.goto);
      this.scene.restarting = true;
      this.schedule(() => this.enterScene(to), this.delay ? 1800 : 0);
    }
  }

  defeat() {
    const spec = this.sceneDef().combat || {};
    if (spec.defeat && spec.defeat.to) {
      this.addLog('combat', '💀 Todo el grupo ha caído...', { fx: { kind: 'defeat' } });
      if (spec.defeat.text) this.addLog('narration', this.txt(spec.defeat.text));
      this.combat = null;
      this.scene.combatDone = true;
      for (const pc of this.partyPCs()) {
        pc.dead = false; pc.hp = Math.max(1, pc.hp); pc.deathSaves = { s: 0, f: 0 }; pc.stable = false;
        pc.concentration = null; pc.spiritualWeapon = 0;
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
    const cp = clone(this.scene.checkpoint);
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
  }

  // ---------------- tiradas de combate
  pcSave(pc, ability, dc, opts = {}) {
    if ((pc.conditions.paralyzed || pc.conditions.unconscious || pc.hp <= 0) && (ability === 'str' || ability === 'dex')) {
      return { success: false, total: 0, text: 'falla automáticamente' };
    }
    let m = C.saveMod(pc, ability);
    const adv = (ability === 'dex' && pc.conditions.dodging) || (['int', 'wis', 'cha'].includes(ability) && C.hasFeature(pc, 'gnome_cunning'))
      || (opts.poison && C.hasFeature(pc, 'dwarven_resilience'));
    const dis = pc.exhaustion >= 3 || (ability === 'dex' && pc.conditions.restrained);
    const mode = combineMode(adv, dis);
    let r = d20(mode);
    let note = '';
    if (r.natural === 1 && C.hasFeature(pc, 'lucky')) { r = d20('normal'); note = ' (Afortunada)'; }
    let total = r.natural + m;
    let extra = '';
    if (pc.conditions.blessed) { const b = roll('1d4').total; total += b; extra = ` +${b} Bendición`; }
    return { success: total >= dc, total, nat: r.natural, text: `d20(${r.dice.join(',')})${fmtMod(m)}${extra} = ${total} vs CD ${dc}${note}` };
  }

  monsterSave(e, ability, dc) {
    const m = MONSTERS[e.type];
    if ((e.conditions.paralyzed || e.conditions.unconscious) && (ability === 'str' || ability === 'dex')) {
      return { success: false, total: 0, text: 'falla automáticamente' };
    }
    const bonus = m.saves[ability] ?? mod(m.abilities[ability]);
    const r = d20(ability === 'dex' && e.conditions.dodging ? 'adv' : 'normal');
    const total = r.natural + bonus;
    return { success: total >= dc, total, nat: r.natural, text: `d20(${r.dice.join(',')})${fmtMod(bonus)} = ${total} vs CD ${dc}` };
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
  resolveAttack(attacker, target, { bonus, dmg, dmgType, ranged = false, label, critOn = 20, extraOnHit, isSpell = false, sneak = null, onHit, savage = null }) {
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
    if (ac.restrained) { dis = true; why.push('atacante apresado'); }
    if (!atkPC && MONSTERS[attacker.type].bloodFrenzy && tgtPC && target.hp < target.maxHp) { adv = true; why.push('frenesí sanguinario'); }
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
    // Reacción de monstruo: Parada
    if (hit && !crit && !tgtPC && !ranged && !isSpell && !target.reactionUsed) {
      const parry = MONSTERS[target.type].parry;
      if (parry && total < targetAC + parry) {
        target.reactionUsed = true;
        targetAC += parry;
        hit = false;
        shieldNote = ` ⚔️ ${target.name} detiene el golpe con una Parada (+${parry} CA)`;
      }
    }
    const modeTxt = mode === 'normal' ? `d20(${r.natural})` : `d20(${r.dice.join(',')} ${mode === 'adv' ? 'ventaja' : 'desventaja'})`;
    const rollTxt = `${modeTxt}${fmtMod(bonus)}${extra} = ${total} vs CA ${targetAC}${note}${why.length ? ` [${why.join(', ')}]` : ''}${shieldNote}`;
    if (!hit) {
      this.addLog('attack', `${attacker.name} ataca a ${target.name} con ${label}: ${rollTxt} → ${r.natural === 1 ? 'pifia, ' : ''}falla.`, { success: false, who: attacker.id, fx: { kind: 'attack', who: attacker.id, target: target.id, nat: r.natural, total, hit: false, shield: !!shieldNote } });
      return { hit: false, crit: false, mode };
    }
    if (dmg === '0') {
      this.addLog('attack', `${attacker.name} ataca a ${target.name} con ${label}: ${rollTxt} → ¡impacta!`, { success: true, who: attacker.id, fx: { kind: 'attack', who: attacker.id, target: target.id, nat: r.natural, total, hit: true } });
      if (onHit) onHit(target);
      return { hit: true, crit: false, mode };
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
    if (savage && crit) {
      const s = roll(savage);
      amount += s.total;
      dmgTxt += ` + ataques salvajes ${s.detail}`;
    }
    if (extraOnHit) {
      const s = roll(crit ? critExpr(extraOnHit.dmg) : extraOnHit.dmg);
      amount += s.total;
      dmgTxt += ` + ${extraOnHit.label} ${s.detail}`;
    }
    this.addLog('attack', `${attacker.name} ataca a ${target.name} con ${label}: ${rollTxt} → ${crit ? '¡CRÍTICO! ' : '¡impacta! '}${amount} de daño ${dmgType} (${dmgTxt}).`, { success: true, crit, who: attacker.id, fx: { kind: 'attack', who: attacker.id, target: target.id, nat: r.natural, total, hit: true, crit } });
    this.applyDamage(target, amount, { type: dmgType, crit, attacker });
    if (onHit && !target.dead && !(tgtPC && target.hp <= 0)) onHit(target);
    // Reprensión infernal (tiflin de nivel 3): reacción automática al recibir daño de un enemigo
    if (tgtPC && !atkPC && !attacker.dead && target.hp > 0 && !target.reactionUsed && target.uses.rebuke && target.level >= 3 && C.TEMPLATES[target.templateId].rebuke) {
      target.uses.rebuke = 0; target.reactionUsed = true;
      const st = C.spellStats(target, 'thaumaturgy') || { dc: 10 };
      const d = roll('2d10');
      const sv = this.monsterSave(attacker, 'dex', st.dc);
      const amt = sv.success ? Math.floor(d.total / 2) : d.total;
      this.addLog('spell', `🔥 ${target.name} responde con Reprensión infernal: ${attacker.name} salva Destreza ${sv.text} → ${amt} de daño de fuego.`, { fx: { kind: 'spell', who: target.id, dmgType: 'fuego' } });
      this.applyDamage(attacker, amt, { type: 'fuego' });
    }
    return { hit: true, crit, mode };
  }

  applyDamage(target, amount, opts = {}) {
    if (this.isPC(target)) return this.damagePC(target, amount, opts);
    const m = MONSTERS[target.type];
    let a = amount;
    if (m.vulnerable && m.vulnerable.includes(opts.type)) { a *= 2; this.addLog('combat', `${target.name} es vulnerable al daño ${opts.type}: ¡daño doble (${a})!`); }
    if (m.immune && m.immune.includes(opts.type)) { a = 0; this.addLog('combat', `${target.name} es inmune al daño ${opts.type}.`); }
    else if (m.resist && m.resist.includes(opts.type)) { a = Math.floor(a / 2); this.addLog('combat', `${target.name} resiste el daño ${opts.type}: solo recibe ${a}.`); }
    if (a <= 0) return;
    target.hp -= a;
    this.fxPush({ kind: 'dmg', target: target.id, amount: a, crit: !!opts.crit });
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
      this.addLog('kill', `💥 ${target.name} cae derrotado.`, { fx: { kind: 'kill', target: target.id } });
      // si estaba inmovilizado por concentración, se libera la concentración
      for (const pc of this.partyPCs()) if (pc.concentration && pc.concentration.enemies && pc.concentration.enemies.includes(target.id) && pc.concentration.spell === 'hold_person') this.breakConcentration(pc, 'el objetivo ha caído');
    }
  }

  damagePC(pc, amount, opts = {}) {
    if (pc.dead || amount <= 0) return;
    let a = amount;
    if (opts.type && C.isResistant(pc, opts.type)) {
      a = Math.floor(a / 2);
      this.addLog('combat', `${pc.name} resiste el daño ${opts.type}: recibe la mitad (${a}).`);
      if (a <= 0) return;
    }
    if (pc.tempHp > 0) { const t = Math.min(pc.tempHp, a); pc.tempHp -= t; a -= t; }
    if (pc.hp <= 0) {
      pc.stable = false;
      pc.deathSaves.f += opts.crit ? 2 : 1;
      this.addLog('combat', `${pc.name} recibe daño estando inconsciente: ${opts.crit ? 'dos fallos' : 'un fallo'} de salvación contra muerte (${pc.deathSaves.f}/3).`);
      if (pc.deathSaves.f >= 3) { pc.dead = true; this.addLog('kill', `☠️ ${pc.name} ha muerto.`); }
      return;
    }
    pc.hp -= a;
    this.fxPush({ kind: 'dmg', target: pc.id, amount: a, crit: !!opts.crit });
    if (pc.hp <= 0 && !this.combat) {
      // Regla de la casa: fuera de combate (trampas, caídas, pruebas fallidas) nadie cae ni muere; queda a 1 PG.
      // Así una trampa no puede matar a un personaje ni dejar la partida bloqueada sin nadie consciente.
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
      } else if (pc.uses.relentless && C.hasFeature(pc, 'relentless_endurance')) {
        pc.uses.relentless = 0;
        pc.hp = 1;
        this.addLog('combat', `💢 ${pc.name} se niega a caer: Aguante incansable lo deja con 1 PG.`);
        return;
      } else {
        pc.conditions.unconscious = {};
        pc.conditions.prone = {};
        pc.deathSaves = { s: 0, f: 0 };
        this.addLog('down', `🩸 ${pc.name} cae inconsciente a 0 PG. ¡Necesita ayuda!`, { fx: { kind: 'down', target: pc.id } });
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
    if (pc.hp > before) this.fxPush({ kind: 'heal', target: pc.id, amount: pc.hp - before });
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
    e.reactionUsed = false;
    e.uses = e.uses || {};
    const alive = () => this.activePCs().filter((p) => p.hp > 0 && !p.dead);
    const pick = () => {
      const ts = alive();
      if (!ts.length) return null;
      if (Math.random() < 0.5) return ts.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      return ts[Math.floor(Math.random() * ts.length)];
    };
    let target = pick();
    if (!target) return this.endTurn();
    const idxOf = (pred) => m.attacks.findIndex(pred);
    const meleeIdx = Math.max(0, idxOf((a) => !a.ranged && !a.uses));
    const rangedIdx = idxOf((a) => a.ranged && !a.uses);
    // plan de ataques del turno
    let plan;
    const special = idxOf((a, i) => a.uses && (e.uses[i] ?? a.uses) > 0);
    if (special >= 0 && Math.random() < 0.45 && !(m.attacks[special].restrain && target.conditions.restrained)) {
      e.uses[special] = (e.uses[special] ?? m.attacks[special].uses) - 1;
      plan = [special];
    } else if (m.multiattack && !(rangedIdx >= 0 && Math.random() < 0.15)) {
      plan = m.multiattack.slice();
    } else if (rangedIdx >= 0 && Math.random() < 0.25 && !target.conditions.prone) {
      plan = [rangedIdx];
    } else plan = [meleeIdx];
    let bonusDieUsed = false;
    for (let n = 0; n < plan.length; n++) {
      if (!this.combat || e.dead) break;
      if (!target || target.hp <= 0 || target.dead) { target = pick(); if (!target) break; }
      let ai = plan[n];
      let atk = m.attacks[ai];
      // con el objetivo ya paralizado, mejor el ataque que hace más daño
      if (atk.paralyze && target.conditions.paralyzed) {
        const alt = idxOf((a) => !a.ranged && !a.paralyze && !a.uses);
        if (alt >= 0) atk = m.attacks[alt];
      }
      let extra = null;
      if (n === 0 && m.surpriseAttack && cb.round === 1 && cb.surprised.includes(target.id)) extra = { label: 'ataque sorpresa', dmg: m.surpriseAttack };
      const friends = this.livingEnemies().filter((o) => o.id !== e.id && !o.conditions.unconscious && !o.conditions.paralyzed).length;
      if (!extra && !bonusDieUsed && !atk.uses) {
        if (m.martialAdvantage && friends) { extra = { label: 'ventaja marcial', dmg: m.martialAdvantage }; }
        else if (m.sneakAttack && (friends || target.conditions.prone || target.conditions.restrained)) { extra = { label: 'ataque furtivo', dmg: m.sneakAttack }; }
      }
      const res = this.resolveAttack(e, target, {
        bonus: atk.bonus, dmg: atk.dmg, dmgType: atk.type, ranged: !!atk.ranged && !atk.spell, isSpell: !!atk.spell, label: atk.name, extraOnHit: extra,
        onHit: (t) => {
          if (atk.knockdown) {
            const sv = this.pcSave(t, atk.knockdown.save, atk.knockdown.dc);
            if (!sv.success) { t.conditions.prone = {}; this.addLog('combat', `${t.name} queda derribado (${sv.text}).`); }
            else this.addLog('roll', `${t.name} resiste el derribo (${sv.text}).`, { success: true });
          }
          if (atk.paralyze) {
            if (C.TEMPLATES[t.templateId].elf) { this.addLog('combat', `${t.name} es elfo: la parálisis no le afecta.`); return; }
            const sv = this.pcSave(t, atk.paralyze.save, atk.paralyze.dc);
            if (!sv.success) { t.conditions.paralyzed = { rounds: 10, saveEnds: { save: 'con', dc: atk.paralyze.dc } }; this.addLog('combat', `😱 ${t.name} queda PARALIZADO (${sv.text}).`); }
            else this.addLog('roll', `${t.name} resiste la parálisis (${sv.text}).`, { success: true });
          }
          if (atk.poison) {
            const sv = this.pcSave(t, atk.poison.save, atk.poison.dc, { poison: true });
            const d = roll(atk.poison.dmg);
            const amt = sv.success ? Math.floor(d.total / 2) : d.total;
            this.addLog('combat', `🕷️ Veneno: ${t.name} salva Constitución ${sv.text} → ${amt} de daño de veneno (${d.detail}${sv.success ? ', la mitad' : ''}).`, { success: sv.success });
            this.applyDamage(t, amt, { type: 'veneno' });
          }
          if (atk.restrain) {
            t.conditions.restrained = { rounds: 1 };
            this.addLog('combat', `🕸️ ${t.name} queda APRESADO por ${atk.name.toLowerCase()} hasta el final de su próximo turno.`);
          }
        },
      });
      if (res && res.hit && extra && extra.label !== 'ataque sorpresa') bonusDieUsed = true;
      if (res && res.hit && extra && extra.label === 'ataque sorpresa') bonusDieUsed = true;
    }
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
    const offhand = C.weaponAttacks(pc).filter((w) => w.light && !w.ranged);
    if (ts.attackedLight && !ts.offhandUsed && ts.bonus > 0 && offhand.length >= 2) {
      const w = offhand[offhand.length - 1];
      out.push({ key: 'offhand', cost: 'bonus', group: 'Atacar', label: `Ataque con la mano torpe (${w.name}, ${w.dmgOff})`, target: 'enemy', desc: 'Combate con dos armas: tras atacar con un arma ligera, puedes atacar con la otra como acción adicional. No sumas tu modificador de característica al daño.' });
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
    if (t.breath && pc.uses.breath && ts.action > 0) {
      out.push({ key: 'breath', cost: 'action', group: 'Rasgos', label: `Arma de aliento (2d6 ${t.breath.type}, CD ${C.breathDC(pc)})`, target: 'enemies3', maxTargets: t.breath.shape === 'line' ? 2 : 3, desc: FEATURES.breath_weapon.desc });
    }
    // acciones generales
    if (ts.action > 0) {
      out.push({ key: 'shove', cost: 'action', group: 'Atacar', label: `Empujar y derribar (Atletismo ${fmtMod(C.skillMod(pc, 'athletics'))})`, target: 'enemy', desc: 'Prueba enfrentada de Atletismo contra el Atletismo o las Acrobacias del objetivo. Si ganas, queda derribado: los ataques cuerpo a cuerpo contra él tienen ventaja hasta que se levante en su turno.' });
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
      if (w.light && !w.ranged) ts.attackedLight = true;
      this.resolveAttack(pc, enemyT[0], {
        bonus: w.toHit, dmg: w.dmg, dmgType: w.type, ranged: w.ranged, label: w.name, critOn: C.critRange(pc),
        sneak: (w.finesse || w.ranged) ? C.sneakDice(pc) : null,
        savage: !w.ranged && C.hasFeature(pc, 'savage_attacks') ? w.die.replace(/^\d+/, '1') : null,
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
    } else if (a.key === 'offhand') {
      spend(); ts.offhandUsed = true;
      const ws = C.weaponAttacks(pc).filter((x) => x.light && !x.ranged);
      const w = ws[ws.length - 1];
      this.resolveAttack(pc, enemyT[0], { bonus: w.toHit, dmg: w.dmgOff, dmgType: w.type, label: `${w.name} (mano torpe)`, critOn: C.critRange(pc), sneak: w.finesse ? C.sneakDice(pc) : null });
    } else if (a.key === 'shove') {
      spend();
      const e = enemyT[0];
      const m = MONSTERS[e.type];
      const pr = d20().natural; const pm = C.skillMod(pc, 'athletics'); const pt = pr + pm;
      const em = Math.max(mod(m.abilities.str), mod(m.abilities.dex));
      const er = e.conditions.paralyzed || e.conditions.unconscious ? null : d20().natural;
      const et = er === null ? -99 : er + em;
      const ok = pt > et || (pt === et && false);
      if (ok) e.conditions.prone = {};
      this.addLog('roll', `${pc.name} intenta derribar a ${e.name}: Atletismo d20(${pr})${fmtMod(pm)} = ${pt} vs ${er === null ? 'indefenso' : `d20(${er})${fmtMod(em)} = ${et}`} → ${ok ? '¡lo tira al suelo!' : 'aguanta en pie'}.`, { success: ok, fx: { kind: 'attack', who: pc.id, target: e.id, nat: pr, total: pt, hit: ok, shove: true } });
    } else if (a.key === 'breath') {
      spend(); pc.uses.breath = 0;
      const t = C.TEMPLATES[pc.templateId];
      const b = t.breath;
      const dc = C.breathDC(pc);
      const d = roll('2d6');
      this.addLog('spell', `🐉 ${pc.name} exhala su aliento de ${b.type} (${d.detail}).`, { fx: { kind: 'spell', who: pc.id, dmgType: b.type } });
      for (const e of enemyT.slice(0, b.shape === 'line' ? 2 : 3)) {
        const sv = this.monsterSave(e, b.save, dc);
        const amount = sv.success ? Math.floor(d.total / 2) : d.total;
        this.addLog('attack', `${e.name}: salvación de ${ABILITIES[b.save].name} ${sv.text} → ${sv.success ? 'éxito' : 'fallo'}; ${amount} de daño de ${b.type}.`, { success: !sv.success });
        this.applyDamage(e, amount, { type: b.type });
      }
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
    const st = C.spellStats(pc, sid);
    const ts = this.combat ? this.combat.turnState : null;
    let slot = 0;
    if (s.level > 0) {
      slot = this.slotFor(pc, s.level);
      pc.slots[slot] -= 1;
      if (ts) { if (s.time === 'bonus') ts.bonusSpell = true; else ts.leveledSpell = true; }
    }
    const up = Math.max(0, slot - s.level);
    const upDice = (base, per) => (per && up ? `${base}+${up}${per.replace(/^1/, '')}` : base);
    this.addLog('spell', `✨ ${pc.name} lanza ${s.name}${slot ? ` (espacio de nivel ${slot})` : ''}.`, { fx: { kind: 'spell', who: pc.id, school: s.school, dmgType: s.dmgType || null, heal: s.kind === 'heal' } });
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
      case 'thunderwave':
      case 'shatter':
      case 'sacred_flame': {
        const dmgExpr = upDice(s.damage, s.upcast);
        const d = roll(dmgExpr);
        for (const e of enemies.slice(0, s.target === 'enemies3' ? 3 : 1)) {
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
            bonus: st.attack, dmg: upDice(s.damage, s.upcast) + (s.addMod ? `+${st.mod}` : ''), dmgType: s.dmgType, ranged: !s.melee, label: s.name, isSpell: true,
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
      const st = C.spellStats(pc, sid);
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
        case 'aid': {
          const tg = (targets.length ? targets : [pc]).slice(0, 3 + up);
          for (const p of tg) p.tempHp = Math.max(p.tempHp, 5 + 5 * up);
          this.addLog('heal', `🛡️ ${tg.map((p) => p.name).join(', ')} ${tg.length > 1 ? 'reciben' : 'recibe'} ${5 + 5 * up} PG temporales.`, { fx: { kind: 'buff', targets: tg.map((p) => p.id) } });
          break;
        }
        case 'thaumaturgy':
          this.addLog('spell', `La voz de ${pc.name} retumba como un trueno lejano y las llamas cercanas parpadean.`);
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
      catalog: Object.values(C.TEMPLATES).filter((t) => !t.custom || t.room === this.code).map((t) => {
        const taken = Object.values(this.players).find((p) => p.charId === t.id);
        const pre = C.createPC(t.id);
        return {
          id: t.id, name: t.name, race: t.race, className: t.className, subclass: t.subclass, portrait: t.portrait, color: t.color, bio: t.bio, background: t.background, role: t.role, stats: t.stats, hp: pre.maxHp, ac: C.armorClass(pre),
          takenBy: taken ? taken.name : null, takenById: taken ? taken.id : null, custom: !!t.custom, mine: !!(t.custom && t.creator === pid),
        };
      }),
      adventure: { id: this.advId, title: this.adv.title, summary: this.adv.summary, art: this.adv.art || 'tavern', length: this.adv.length || '', endings: this.adv.endingCount || 0, tags: this.adv.tags || [] },
      adventures: Object.values(ADVENTURES).map((a) => ({ id: a.id, title: a.title, summary: a.summary, art: a.art || 'tavern', length: a.length || '', endings: a.endingCount || 0, tags: a.tags || [] })),
      journal: this.phase === 'lobby' ? [] : this.flagOrder.filter((k) => this.flags[k] && this.adv.journal && this.adv.journal[k]).map((k) => this.txt(this.adv.journal[k])),
      pcs: this.partyPCs().map((p) => this.pcView(p)),
      party: { gold: this.party.gold, loot: Object.entries(this.party.loot).map(([id, n]) => ({ id, name: ITEMS[id].name, qty: n, desc: ITEMS[id].desc })) },
      log: this.log.slice(-200),
      chat: this.chat.slice(-120),
    };
    if (def && this.phase !== 'lobby') {
      const voters = Object.values(this.players).filter((p) => p.charId && this.pcs[p.charId] && p.connected);
      const n = this.partyPCs().length;
      v.scene = {
        id: this.sceneId, title: this.txt(def.title), end: !!def.end, art: this.txt(def.art) || this.sceneId, ending: def.end && def.ending ? def.ending : null,
        encounter: this.encounterPending() && !this.combat,
        checks: (def.checks || []).filter((c) => this.checkVisible(c)).map((c) => {
          const st = this.scene.checks[c.id];
          return {
            id: c.id, label: this.txt(c.label), group: c.mode === 'group', auto: !!c.auto, pre: !!c.preCombat, cost: c.cost ? c.cost * n : 0, needsItem: c.needsItem ? ITEMS[c.needsItem].name : null,
            done: !!(st && st.done), result: st ? st.result : null, triedByMe: !!(st && myPc && st.attempts.includes(myPc.id)),
          };
        }),
        exits: (def.exits || []).map((ex, i) => ({ ex, i })).filter(({ ex }) => this.exitVisible(ex)).map(({ ex, i }) => ({
          idx: i, label: this.txt(ex.label), fight: !!ex.fight, hint: ex.hint ? this.txt(ex.hint) : null, enabled: !ex.requires || ex.requires.some((f) => this.flags[f]),
          votes: Object.entries(this.scene.votes).filter(([, x]) => x === i).map(([p]) => this.players[p] && this.players[p].name).filter(Boolean),
          myVote: me ? this.scene.votes[me.id] === i : false,
        })),
        voters: voters.length,
        shortRest: !!def.shortRest && !this.scene.restUsed && !this.combat && !this.encounterPending() && !this.scene.restarting,
        shop: def.shop && !this.combat ? Object.entries(def.shop).map(([id, price]) => ({ id, name: ITEMS[id].name, price, desc: ITEMS[id].desc })) : null,
      };
    }
    if (this.combat) {
      const cb = this.combat;
      const cur = this.current();
      v.combat = {
        round: cb.round, currentId: cur ? cur.id : null, busy: cb.busy,
        order: cb.order.map((o) => {
          const c = this.getCombatant(o.id);
          return { id: o.id, side: o.side, init: o.init, name: c ? c.name : '?', dead: c ? !!c.dead : true, type: c && c.type ? c.type : null, portrait: c && c.templateId ? C.TEMPLATES[c.templateId].portrait : null };
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
