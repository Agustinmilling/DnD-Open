const crypto = require('crypto');
// Motor de partida: salas, escenas, pruebas, combate por turnos y progresión.
const { roll, d20, combineMode } = require('./dice');
const { mod, fmtMod, own, profBonus, ABILITIES, XP_TABLE } = require('./rules');
const C = require('./character');
const SPELLS = require('./data/spells');
const ITEMS = require('./data/items');
const SKILLS = require('./data/skills');
const MONSTERS = require('./data/monsters');
const FEATURES = require('./data/features');
const CONDITIONS = require('./data/conditions');
const BEASTS = require('./data/beasts');
const ADVENTURES = require('./data/adventures');

const clone = (o) => JSON.parse(JSON.stringify(o));
let logSeq = 0;

const AFK_MS = 120000;

// ---------------------------------------------------------------- partes de la vista que no cambian
const ADVENTURE_INFO = Object.fromEntries(Object.entries(ADVENTURES).map(([k, a]) => [k, {
  id: a.id, title: a.title, summary: a.summary, art: a.art || 'tavern', length: a.length || '', endings: a.endingCount || 0, tags: a.tags || [],
}]));
// PG y CA de nivel 1 de cada plantilla para el catálogo (se calculan una vez por plantilla)
const level1Cache = new WeakMap();
function level1Stats(t) {
  let e = level1Cache.get(t);
  if (!e) {
    const pre = C.createPC(t.id);
    level1Cache.set(t, (e = { hp: pre.maxHp, ac: C.armorClass(pre) }));
  }
  return e;
}
/** Espacios de conjuro de la ficha: los del nivel y los que sobran (p. ej. creados con Fuente de magia) */
function slotsView(pc) {
  const max = C.maxSlots(pc);
  const row = (l, cur, m) => ({ level: +l, cur, max: m });
  return [
    ...Object.entries(max).map(([l, m]) => row(l, pc.slots[l] || 0, m)),
    ...Object.entries(pc.slots).filter(([l, n]) => n > 0 && !max[l]).map(([l, n]) => row(l, n, 0)),
  ];
}

// ---------------------------------------------------------------- validación de mensajes
// Los mensajes llegan del navegador y no son de fiar: un id como "constructor" o "__proto__" apuntaría a
// propiedades de Object y podría romper la sala para todos. Se normalizan los tipos y se rechazan esas claves.
const isBadKey = (v) => typeof v === 'string' && (v === '__proto__' || v in Object.prototype);
function badDeep(v, depth = 0) {
  if (isBadKey(v)) return true;
  if (depth > 3 || !v || typeof v !== 'object') return false;
  return Object.keys(v).some((k) => isBadKey(k) || badDeep(v[k], depth + 1));
}
function sanitizeMsg(msg) {
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) throw new Error('Mensaje no válido');
  if (typeof msg.type !== 'string') throw new Error('Acción desconocida');
  const out = { type: msg.type };
  for (const k of ['charId', 'id', 'checkId', 'item', 'key', 'expr', 'mode', 'target', 'op']) {
    if (msg[k] === undefined || msg[k] === null) continue;
    if (typeof msg[k] !== 'string' || msg[k].length > 80 || isBadKey(msg[k])) throw new Error('Datos no válidos');
    out[k] = msg[k];
  }
  if (msg.text !== undefined) out.text = String(msg.text ?? '');
  if (msg.label !== undefined && msg.label !== null) out.label = String(msg.label);
  for (const k of ['pos', 'index']) {
    if (msg[k] === undefined || msg[k] === null) continue;
    if (typeof msg[k] !== 'number' || !Number.isFinite(msg[k])) throw new Error('Datos no válidos');
    out[k] = msg[k];
  }
  if (msg.exit !== undefined) {
    const e = Number(msg.exit);
    if (!Number.isInteger(e) || e < 0 || e > 50) throw new Error('Esa opción no está disponible ahora');
    out.exit = e;
  }
  if (msg.slot !== undefined && msg.slot !== null) {
    const sl = Number(msg.slot);
    if (!Number.isInteger(sl) || sl < 1 || sl > 9) throw new Error('Espacio de conjuro no válido');
    out.slot = sl;
  }
  if (msg.targets !== undefined && msg.targets !== null) {
    if (!Array.isArray(msg.targets) || msg.targets.length > 8 || msg.targets.some((t) => typeof t !== 'string' || isBadKey(t))) throw new Error('Objetivos no válidos');
    out.targets = msg.targets.slice();
  }
  if (msg.sheet !== undefined && msg.sheet !== null) {
    const sh = msg.sheet;
    if (typeof sh !== 'object' || typeof sh.kind !== 'string' || (sh.key !== undefined && typeof sh.key !== 'string') || badDeep(sh)) throw new Error('Datos no válidos');
    out.sheet = { kind: sh.kind, key: sh.key };
  }
  if (msg.spec !== undefined) {
    if (msg.spec !== 'random' && (typeof msg.spec !== 'object' || msg.spec === null || badDeep(msg.spec) || JSON.stringify(msg.spec).length > 4000)) throw new Error('Personaje no válido');
    out.spec = msg.spec;
  }
  return out;
}

// Enlace o id de YouTube -> id de 11 caracteres (o null). Las listas (list=) no se soportan.
const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const YT_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be'];
function youtubeId(text) {
  text = String(text || '').trim().slice(0, 200);
  if (YT_ID.test(text)) return text;
  let u;
  try { u = new URL(/^https?:\/\//i.test(text) ? text : 'https://' + text); } catch { return null; }
  if (!YT_HOSTS.includes(u.hostname.toLowerCase())) return null;
  const parts = u.pathname.split('/').filter(Boolean);
  const id = u.hostname.toLowerCase().endsWith('youtu.be') ? parts[0]
    : u.pathname === '/watch' ? u.searchParams.get('v')
      : ['shorts', 'live', 'embed'].includes(parts[0]) ? parts[1] : null;
  return YT_ID.test(id || '') ? id : null;
}

// Nombre de pista: sin caracteres de control, espacios colapsados, máx. 40 caracteres ('' = sin nombre)
function trackName(text) {
  return String(text ?? '').slice(0, 400).replace(/\p{Cc}+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
}

class Room {
  constructor(code, opts = {}) {
    this.afkMs = opts.afkMs || AFK_MS;
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
    this.retries = {}; // escena -> derrotas seguidas (regla de la casa)
    this.rewarded = {}; // escenas cuya recompensa ya se cobró
    this.music = { queue: [], names: [], index: 0, playing: false, pos: 0, at: 0 }; // cola de ids de YouTube (+ nombres paralelos); cada navegador reproduce la suya
    this.version = 0;
    this.conns = {}; // pid -> conexiones SSE abiertas (lo usa server.js)
    this.pollSeen = {}; // pid -> última vez que sondeó (lo usa server.js)
  }

  get adv() { return ADVENTURES[this.advId]; }

  // ---------------------------------------------------------------- utilidades
  emit() {
    this.version += 1; // lo usan los clientes que consultan por sondeo
    for (const fn of this.listeners) fn();
  }
  schedule(fn, ms = this.delay) {
    if (ms <= 0) return fn();
    const t = setTimeout(() => {
      this.timers.delete(t);
      // un error dentro de un temporizador tumbaría el servidor entero: se registra y la sala sigue
      try { fn(); } catch (e) { console.error(`[sala ${this.code}] error en un temporizador:`, e); if (this.combat) this.combat.busy = false; }
      this.emit();
    }, ms);
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
  standingPCs() { return this.activePCs().filter((p) => p.hp > 0); } // vivos y conscientes
  ownerOf(pc) { return pc.owner ? this.players[pc.owner] : null; }
  isOrphan(pc) {
    const o = this.ownerOf(pc);
    return !o || !o.connected;
  }

  // ---------------------------------------------------------------- jugadores
  join(name) {
    let id;
    do { id = 'p' + crypto.randomBytes(5).toString('hex'); } while (this.players[id]);
    const token = crypto.randomBytes(18).toString('base64url'); // secreto de sesión: no debe ser adivinable
    const clean = String(name || 'Aventurero').trim().slice(0, 24) || 'Aventurero';
    this.players[id] = { id, name: clean, token, charId: null, connected: false, lastSeen: Date.now() };
    if (!this.hostId) this.hostId = id;
    this.addLog('system', `${clean} se ha unido a la mesa.`);
    this.emit();
    return { pid: id, token };
  }
  /** Hace sitio en una sala llena quitando a espectadores desconectados (sin personaje). */
  evictIdle() {
    const idle = Object.values(this.players).filter((p) => !p.connected && !p.charId && p.id !== this.hostId).sort((a, b) => a.lastSeen - b.lastSeen)[0];
    if (!idle) return false;
    delete this.players[idle.id];
    return true;
  }
  auth(pid, token) {
    const p = own(this.players, pid);
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
    // si el anfitrión sigue fuera, quien vuelve hereda el papel (si no, nadie podría empezar ni reiniciar)
    const host = this.players[this.hostId];
    if (on && (!host || !host.connected) && this.hostId !== pid) this.hostId = pid;
    if (this.combat) this.maybeAutoTurn();
    else if (!on) this.tallyVotes();
    this.emit();
  }

  // ---------------------------------------------------------------- acciones
  handle(pid, msg) {
    this.lastActivity = Date.now();
    const player = own(this.players, pid);
    if (!player) throw new Error('Jugador desconocido');
    msg = sanitizeMsg(msg);
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
      case 'music': return this.doMusic(player, msg);
      default: throw new Error('Acción desconocida');
    }
  }

  musicPos() {
    const m = this.music;
    return m.playing ? m.pos + (Date.now() - m.at) / 1000 : m.pos;
  }

  doMusic(player, msg) {
    if (player.id !== this.hostId) throw new Error('Solo el anfitrión controla la música');
    const m = this.music;
    const now = Date.now();
    const validIndex = () => {
      if (!Number.isInteger(msg.index) || msg.index < 0 || msg.index >= m.queue.length) throw new Error('Pista no válida');
      return msg.index;
    };
    const goto = (i) => { m.index = i; m.pos = 0; m.at = now; m.playing = true; };
    switch (msg.op) {
      case 'add': {
        const id = youtubeId(msg.text);
        if (!id) throw new Error('Pega el enlace de un vídeo de YouTube');
        if (m.queue.length >= 20) throw new Error('La lista de música está llena');
        m.queue.push(id);
        m.names.push(trackName(msg.label));
        if (m.queue.length === 1) goto(0);
        break;
      }
      case 'rename': m.names[validIndex()] = trackName(msg.label); break;
      case 'play': case 'pause': {
        if (!m.queue.length) break;
        const play = msg.op === 'play';
        if (play === m.playing) break;
        m.pos = this.musicPos();
        m.at = now;
        m.playing = play;
        break;
      }
      case 'seek':
        if (typeof msg.pos !== 'number' || msg.pos < 0 || msg.pos > 86400) throw new Error('Posición no válida');
        if (!m.queue.length) break;
        m.pos = msg.pos;
        m.at = now;
        break;
      case 'next':
        if (!m.queue.length) break;
        if (m.index + 1 < m.queue.length) goto(m.index + 1);
        else { m.playing = false; m.pos = 0; m.at = now; }
        break;
      case 'prev':
        if (!m.queue.length) break;
        goto(Math.max(0, m.index - 1));
        break;
      case 'jump': goto(validIndex()); break;
      case 'remove': {
        const i = validIndex();
        m.queue.splice(i, 1);
        m.names.splice(i, 1);
        if (!m.queue.length) { m.index = 0; m.playing = false; m.pos = 0; m.at = now; }
        else if (i < m.index) m.index--;
        else if (i === m.index) { if (m.index >= m.queue.length) m.index = m.queue.length - 1; m.pos = 0; m.at = now; }
        break;
      }
      case 'clear': this.music = { queue: [], names: [], index: 0, playing: false, pos: 0, at: now }; break;
      default: throw new Error('Acción de música desconocida');
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
    this.addChat({ kind: 'msg', author: player.name, char: pc ? pc.name : null, color: pc ? C.tplOf(pc).color : null, text });
  }

  doFreeRoll(player, pc, { expr, mode = 'normal', label, sheet }) {
    let result;
    let lbl = label;
    if (sheet && pc) {
      // tirada desde la ficha: habilidad, salvación o característica
      let m = 0;
      if (sheet.kind === 'skill' && SKILLS[sheet.key]) { m = C.skillMod(pc, sheet.key); lbl = `Prueba de ${SKILLS[sheet.key].name}`; }
      else if (sheet.kind === 'save' && ABILITIES[sheet.key]) { m = C.saveMod(pc, sheet.key); lbl = `Salvación de ${ABILITIES[sheet.key].name}`; }
      else if (sheet.kind === 'ability' && ABILITIES[sheet.key]) { m = C.abilityMod(pc, sheet.key); lbl = `Prueba de ${ABILITIES[sheet.key].name}`; }
      else if (sheet.kind === 'init') { m = C.initiativeMod(pc); lbl = 'Iniciativa'; }
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
      kind: 'roll', author: player.name, char: pc ? pc.name : null, color: pc ? C.tplOf(pc).color : null,
      label: lbl ? String(lbl).slice(0, 60) : null, expr, total: result.total, detail: result.detail,
      crit: result.natural === 20, fumble: result.natural === 1,
    });
  }

  pickCharacter(player, charId) {
    const tpl = own(C.TEMPLATES, charId);
    if (!tpl || (tpl.custom && tpl.room !== this.code)) throw new Error('Personaje desconocido');
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
    let id;
    do id = `c_${this.code}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`; while (C.TEMPLATES[id]); // sin repetir nunca un id existente
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
    this.resetRun();
    for (const [k, v] of Object.entries(this.adv.startFlags || {})) this.setFlag(k, v);
    this.addLog('narration', `— ${this.adv.title} —`, { title: true });
    if (this.adv.startGold) { this.party.gold = this.adv.startGold * this.partyPCs().length; this.addLog('loot', `💰 El grupo empieza con ${this.party.gold} po.`); }
    this.enterScene(this.adv.start);
  }

  /** Borra el progreso de la historia (marcas, derrotas y recompensas cobradas) */
  resetRun() {
    this.flags = {}; this.flagOrder = []; this.retries = {}; this.rewarded = {};
  }

  restartAdventure(player) {
    if (player.id !== this.hostId) throw new Error('Solo el anfitrión puede reiniciar');
    this.destroy();
    this.combat = null;
    this.resetRun();
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
    for (const pc of this.partyPCs()) pc.enhanced = false; // Potenciar característica dura una escena
    this.scene = { checks: {}, votes: {}, restUsed: false, combatDone: false, encounterStarted: false, checkpoint: clone({ pcs: this.pcs, party: this.party, flags: this.flags, flagOrder: this.flagOrder }) };
    if (def.onEnter) this.applyOutcome(def.onEnter, { silent: true });
    this.addLog('scene', def.title, { title: true, fx: { kind: 'scene', id, title: def.title } });
    for (const p of this.sceneTexts(def.text)) this.addLog('narration', p);
    if (def.trap && !this.flags[def.trap.unless]) this.runTrap(def.trap);
    // Las recompensas de escena se cobran una sola vez por aventura (ni al volver ni al repetir tras una derrota).
    if (def.reward && !this.rewarded[id]) {
      this.rewarded[id] = true;
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
      const pcs = this.standingPCs();
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
      for (const p of this.standingPCs()) {
        const d = roll(out.damageAll.expr);
        this.addLog('damage', `${p.name} sufre ${d.total} de daño ${out.damageAll.type}.`);
        this.damagePC(p, d.total, { type: out.damageAll.type });
      }
    }
    if (out.peaceful) this.resolvePeacefully();
    if (out.startCombat && this.encounterPending() && !this.combat) this.startCombat((combat || def.combat));
    if (out.goto) this.gotoScene(this.txt(out.goto), 1200);
  }

  /** Cambia de escena tras una pausa (ms, solo con retardo activo); mientras tanto se ocultan las opciones. */
  gotoScene(to, ms) {
    this.scene.restarting = true;
    this.schedule(() => this.enterScene(to), this.delay ? ms : 0);
  }

  pcCheck(pc, c) {
    let skill = c.skill;
    if (c.altSkill && C.skillMod(pc, c.altSkill) > C.skillMod(pc, c.skill)) skill = c.altSkill;
    const ability = SKILLS[skill].ability;
    let m = C.skillMod(pc, skill);
    const why = [];
    if (skill === 'stealth' && this.scene && this.scene.pwt) { m += 10; why.push('Pasar sin rastro +10'); }
    if (pc.exhaustion) { m -= 2 * pc.exhaustion; why.push(`agotamiento −${2 * pc.exhaustion}`); }
    const advFlag = (c.advIf && c.advIf.some((f) => this.flags[f])) || (c.advIfItem && this.activePCs().some((p) => p.inventory[c.advIfItem]));
    const adv = advFlag || pc.enhanced || (ability === 'str' && pc.conditions.raging)
      || (C.hasFeature(pc, 'remarkable_athlete') && (skill === 'athletics' || skill === 'acrobatics'));
    const disFlag = c.disIf && c.disIf.some((f) => this.flags[f]);
    const dis = pc.conditions.poisoned || pc.conditions.frightened || disFlag;
    const mode = combineMode(adv, dis);
    const r = this.d20For(pc, mode);
    let total = r.natural + m;
    let extra = r.note;
    if (pc.guidance) { const g = roll('1d4').total; total += g; extra += ` +${g} Orientación`; pc.guidance = false; }
    const dc = c.dc + (c.dcMod ? c.dcMod(this.flags) : 0);
    // Mente táctica (guerrero 2): si falla, gasta un uso de Tomar aliento para sumar 1d10
    if (total < dc && pc.uses.second_wind > 0 && C.hasFeature(pc, 'tactical_mind')) {
      const g = roll('1d10').total;
      if (total + g >= dc) { pc.uses.second_wind -= 1; total += g; extra += ` +${g} Mente táctica`; }
    }
    if (total < dc && pc.conditions.inspired) { const res = this.rescueRoll(pc, total, dc, mode, m); if (res) { total = res.total; extra += res.text; } }
    const success = total >= dc;
    const modeTxt = mode !== 'normal' ? `(${r.dice.join(',')} ${mode === 'adv' ? 'ventaja' : 'desventaja'})` : `(${r.natural})`;
    return { success, total, nat: r.natural, text: `[${SKILLS[skill].name}] d20${modeTxt}${fmtMod(m)}${extra} = ${total} vs CD ${dc}${why.length ? ` [${why.join(', ')}]` : ''}` };
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
    const voters = this.voters(player.id);
    const count = voters.filter((p) => this.scene.votes[p.id] === exitIdx).length;
    this.addLog('system', `${player.name} vota: "${this.txt(ex.label)}" (${count}/${voters.length})`);
    this.tallyVotes(player.id);
  }

  voters(extraId = null) {
    return Object.values(this.players).filter((p) => p.charId && this.pcs[p.charId] && (p.connected || p.id === extraId));
  }

  /** Si alguna salida tiene mayoría, el grupo avanza. Se vuelve a contar cuando alguien se desconecta. */
  tallyVotes(extraId = null) {
    if (this.phase !== 'adventure' || this.combat || !this.scene || this.scene.restarting) return;
    const def = this.sceneDef();
    const voters = this.voters(extraId);
    if (!voters.length) return;
    for (const [i, ex] of def.exits.entries()) {
      if (ex.fight || !this.exitVisible(ex) || (ex.requires && !ex.requires.some((f) => this.flags[f]))) continue;
      const count = voters.filter((p) => this.scene.votes[p.id] === i).length;
      if (count && count > voters.length / 2) {
        this.addLog('system', `El grupo decide: ${this.txt(ex.label)}.`);
        if (ex.effects) this.applyOutcome(ex.effects, { group: true });
        return this.enterScene(this.txt(ex.to));
      }
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
      const t = C.tplOf(pc);
      const parts = [];
      if (pc.hp <= 0) { pc.hp = 1; pc.stable = false; pc.deathSaves = { s: 0, f: 0 }; delete pc.conditions.unconscious; parts.push('recupera el sentido (1 PG)'); }
      while (pc.hp < pc.maxHp * 0.75 && pc.hitDice > 0) {
        const r = roll(`1d${t.hitDie}`);
        const heal = Math.max(1, r.total + mod(t.abilities.con));
        pc.hp = Math.min(pc.maxHp, pc.hp + heal);
        pc.hitDice -= 1;
        parts.push(`gasta un dado de golpe (d${t.hitDie}: ${r.total}${fmtMod(mod(t.abilities.con))}) y recupera ${heal} PG`);
      }
      // recursos que vuelven con un descanso corto (resShort: número o 'all')
      const max = C.usesMax(pc);
      const back = [];
      for (const [k, n] of Object.entries(t.resShort || {})) {
        if (max[k] === undefined || (pc.uses[k] || 0) >= max[k]) continue;
        pc.uses[k] = n === 'all' ? max[k] : Math.min(max[k], (pc.uses[k] || 0) + n);
        back.push(C.resName(k));
      }
      if (back.length) parts.push(`recupera ${back.join(', ')}`);
      // magia de pacto: los espacios vuelven con un descanso corto
      if (t.caster && t.caster.type === 'pact') {
        const ms = C.maxSlots(pc);
        if (Object.keys(ms).some((l) => (pc.slots[l] || 0) < ms[l])) { pc.slots = { ...ms }; parts.push('recupera sus espacios de pacto'); }
      }
      if (C.hasFeature(pc, 'arcane_recovery') && pc.uses.arcane_recovery > 0) {
        const ms = C.maxSlots(pc);
        let budget = Math.ceil(pc.level / 2);
        const got = [];
        for (const lvl of Object.keys(ms).sort((x, y) => y - x)) {
          while (budget >= +lvl && (pc.slots[lvl] || 0) < ms[lvl]) { pc.slots[lvl] = (pc.slots[lvl] || 0) + 1; budget -= +lvl; got.push(lvl); }
        }
        if (got.length) { pc.uses.arcane_recovery -= 1; parts.push(`usa Recuperación arcana (recupera espacio${got.length > 1 ? 's' : ''} de nivel ${got.join(', ')})`); }
      }
      // los conjuros de una hora terminan
      delete pc.conditions.barkskin; delete pc.conditions.magic_weapon;
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

  // ---------------------------------------------------------------- vista para el cliente
  pcView(pc) {
    const t = C.tplOf(pc);
    const st = C.spellStats(pc);
    const owner = this.ownerOf(pc);
    const feats = [];
    for (let l = 1; l <= pc.level; l++) for (const f of t.features[l] || []) if (FEATURES[f]) feats.push({ id: f, name: FEATURES[f].name, desc: FEATURES[f].desc, source: FEATURES[f].source, level: l });
    const max = C.usesMax(pc);
    const beast = pc.shape ? BEASTS[pc.shape] : null;
    return {
      id: pc.id, name: pc.name, race: t.race, className: t.className, subclass: pc.level >= 3 ? t.subclass : null, background: t.background, bio: t.bio,
      portrait: beast ? beast.icon : t.portrait, color: t.color, owner: owner ? owner.name : null, ownerId: pc.owner, connected: owner ? owner.connected : false,
      level: pc.level, xp: pc.xp, nextXp: C.nextXp(pc), hp: pc.hp, maxHp: pc.maxHp, tempHp: pc.tempHp, ac: C.armorClass(pc), speed: beast ? beast.speed : `${t.speed} m`,
      armor: beast ? `Forma salvaje (${beast.name})` : t.armor.name + (pc.mageArmor ? ' (Armadura de mago)' : ''), hitDice: `${pc.hitDice}d${t.hitDie}`, prof: profBonus(pc.level),
      initiative: C.initiativeMod(pc), shape: beast ? { id: pc.shape, name: beast.name, icon: beast.icon } : null,
      abilities: Object.fromEntries(Object.keys(ABILITIES).map((k) => [k, { score: C.abilityScore(pc, k), mod: C.abilityMod(pc, k), save: C.saveMod(pc, k), saveProf: t.saves.includes(k) }])),
      skills: Object.entries(SKILLS).map(([k, s]) => ({ key: k, name: s.name, ability: s.ability, mod: C.skillMod(pc, k), prof: C.isProficient(t, k, pc.level), expertise: C.hasExpertise(t, k, pc.level) })),
      passivePerception: 10 + C.skillMod(pc, 'perception'),
      weapons: C.weaponAttacks(pc),
      spellcasting: st ? {
        ...st, abilityName: ABILITIES[st.ability].name,
        slots: slotsView(pc),
        spells: C.knownSpells(pc).map((s) => ({ id: s, name: SPELLS[s].name, level: SPELLS[s].level, desc: SPELLS[s].desc, conc: !!SPELLS[s].conc, ritual: !!SPELLS[s].ritual, time: SPELLS[s].time, free: pc.uses[`free_${s}`] > 0 })),
      } : null,
      features: feats,
      uses: Object.entries(pc.uses).filter(([k]) => max[k] !== undefined).map(([k, n]) => ({ key: k, name: C.resName(k), cur: n, max: max[k] })),
      inventory: Object.entries(pc.inventory).filter(([, n]) => n > 0).map(([id, n]) => ({ id, name: ITEMS[id].name, qty: n, desc: ITEMS[id].desc, magic: !!ITEMS[id].magic })),
      conditions: Object.entries(pc.conditions).map(([k, v]) => ({ key: k, name: CONDITIONS[k] ? CONDITIONS[k].name : k, desc: CONDITIONS[k] ? CONDITIONS[k].desc : '', rounds: v && typeof v.rounds === 'number' && v.rounds < 100 ? v.rounds : null })).concat(pc.exhaustion ? [{ key: 'exhaustion', name: `Agotamiento ${pc.exhaustion}`, desc: CONDITIONS.exhaustion.desc, rounds: null }] : []),
      deathSaves: pc.deathSaves, stable: pc.stable, dead: pc.dead, down: pc.hp <= 0 && !pc.dead,
      concentration: pc.concentration && SPELLS[pc.concentration.spell] ? SPELLS[pc.concentration.spell].name : null,
      images: pc.images || 0, guidance: pc.guidance, enhanced: pc.enhanced,
    };
  }

  viewFor(pid) {
    const me = this.players[pid];
    const myPc = me && me.charId ? this.pcs[me.charId] : null;
    const def = this.sceneDef();
    const takenBy = new Map(); // personaje -> primer jugador que lo controla
    for (const p of Object.values(this.players)) if (p.charId && !takenBy.has(p.charId)) takenBy.set(p.charId, p);
    const v = {
      code: this.code, phase: this.phase, hostId: this.hostId,
      you: me ? { id: me.id, name: me.name, charId: me.charId, isHost: me.id === this.hostId } : null,
      players: Object.values(this.players).map((p) => ({ id: p.id, name: p.name, charId: p.charId, connected: p.connected, isHost: p.id === this.hostId })),
      catalog: Object.values(C.TEMPLATES).filter((t) => !t.custom || t.room === this.code).map((t) => {
        const taken = takenBy.get(t.id);
        const l1 = level1Stats(t);
        return {
          id: t.id, name: t.name, race: t.race, className: t.className, subclass: t.subclass, portrait: t.portrait, color: t.color, bio: t.bio, background: t.background, role: t.role, stats: t.stats, hp: l1.hp, ac: l1.ac,
          takenBy: taken ? taken.name : null, takenById: taken ? taken.id : null, custom: !!t.custom, mine: !!(t.custom && t.creator === pid),
        };
      }),
      adventure: ADVENTURE_INFO[this.advId],
      adventures: Object.values(ADVENTURE_INFO),
      journal: this.phase === 'lobby' ? [] : this.flagOrder.filter((k) => this.flags[k] && this.adv.journal && this.adv.journal[k]).map((k) => this.txt(this.adv.journal[k])),
      pcs: this.partyPCs().map((p) => this.pcView(p)),
      party: { gold: this.party.gold, loot: Object.entries(this.party.loot).map(([id, n]) => ({ id, name: ITEMS[id].name, qty: n, desc: ITEMS[id].desc })) },
      log: this.log.slice(-200),
      chat: this.chat.slice(-120),
      music: { queue: this.music.queue.slice(), names: this.music.names.slice(), index: this.music.index, playing: this.music.playing, pos: Math.round(Math.min(this.musicPos(), 86400) * 10) / 10 },
    };
    if (def && this.phase !== 'lobby') {
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
        voters: this.voters().length,
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

// Combate (combat.js) y acciones de los personajes (actions.js)
Object.assign(Room.prototype, require('./combat'), require('./actions'));

module.exports = { Room };
