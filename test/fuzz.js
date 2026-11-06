// Fuzzing del motor: jugadores que envían acciones válidas e inválidas al azar.
// Busca excepciones de programación (TypeError, ReferenceError…) y estados imposibles.
// Uso: node test/fuzz.js [partidas=300]
const { Room } = require('../src/engine');
const ADVENTURES = require('../src/data/adventures');
const C = require('../src/character');

const R = (a) => a[Math.floor(Math.random() * a.length)];
const junk = () => R([undefined, null, '', 0, -1, 1e9, NaN, 'x', '__proto__', 'constructor', [], {}, { a: 1 }, '1d20', 'e1', 'p1', true]);
const PROGRAMMING = /is not a function|Cannot read|Cannot set|undefined|null|is not iterable|Maximum call stack|NaN/;
const bugs = new Map();
function record(kind, e, ctx) {
  const key = kind + ': ' + (e.message || e).split('\n')[0];
  if (!bugs.has(key)) bugs.set(key, { count: 0, stack: (e.stack || '').split('\n').slice(0, 4).join('\n'), ctx });
  bugs.get(key).count++;
}

function randomMsg(room, pid) {
  let v;
  try { v = room.viewFor(pid); } catch (e) { record('viewFor', e, {}); return { type: 'chat', text: 'x' }; }
  const t = R(['chat', 'roll', 'pick', 'release', 'start', 'adventure', 'create', 'deleteChar', 'check', 'vote', 'rest', 'explore', 'take', 'buy', 'act', 'act', 'act', 'act', 'restart', 'music', 'music', 'bogus']);
  const valid = Math.random() < 0.75;
  switch (t) {
    case 'chat': return { type: t, text: valid ? R(['hola', '/r 1d20+3', '/roll 2d6 adv', '/r 50d1000', '/r 1d0', '/r d']) : junk() };
    case 'roll': return { type: t, expr: valid ? R(['1d20', '2d6+3', '4d6kh3', '1d20-1']) : junk(), mode: R(['normal', 'adv', 'dis', junk()]), label: junk(), sheet: junk() };
    case 'pick': return { type: t, charId: valid && v.characters ? R(v.characters.map((c) => c.id).concat('darian')) : junk() };
    case 'adventure': return { type: t, id: valid ? R(Object.keys(ADVENTURES)) : junk() };
    case 'create': return { type: t, spec: valid ? 'random' : R([junk(), { race: 'elf' }, { race: 'elf', cls: 'wizard', name: 'x'.repeat(200) }, { race: '__proto__', cls: 'constructor' }]) };
    case 'deleteChar': return { type: t, charId: valid && v.characters ? R(v.characters.map((c) => c.id)) : junk() };
    case 'check': return { type: t, checkId: valid && v.scene ? R((v.scene.checks || []).map((c) => c.id).concat('x')) : junk() };
    case 'vote': return { type: t, exit: valid && v.scene ? R((v.scene.exits || []).map((e) => e.idx).concat(99)) : junk() };
    case 'explore': return { type: t, key: R(['help', 'hide', 'search', 'medicine', 'potion', junk()]), target: junk(), targets: junk() };
    case 'take': return { type: t, item: valid && v.party ? R(Object.keys(v.party.loot || {}).concat('x')) : junk() };
    case 'buy': return { type: t, item: valid && v.scene && v.scene.shop ? R(v.scene.shop.map((s) => s.id)) : junk() };
    case 'act': {
      if (valid && v.combat && v.combat.actions && v.combat.actions.length) {
        const a = R(v.combat.actions);
        const ids = (v.combat.enemies || []).filter((e) => !e.dead).map((e) => e.id).concat((v.pcs || []).map((p) => p.id));
        const n = Math.ceil(Math.random() * 3);
        return { type: t, key: a.key, targets: Math.random() < 0.9 ? Array.from({ length: n }, () => R(ids)) : junk(), slot: R([undefined, 1, 2, 3, 9, junk()]) };
      }
      return { type: t, key: R(['end', 'attack:0', 'attack:9', 'spell:fire_bolt', 'dash', junk()]), targets: R([junk(), ['e1'], ['e1', 'e1', 'e1', 'e1', 'e1']]) };
    }
    case 'music': return { type: t, op: R(['add', 'add', 'play', 'pause', 'seek', 'next', 'prev', 'jump', 'remove', 'clear', junk()]), text: R(['dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=abcdefghijk', 'list=PLx', junk()]), pos: R([0, 12.5, 90000, -1, junk()]), index: R([0, 1, 5, 25, -1, 1.5, junk()]) };
    default: return { type: t };
  }
}

const N = Number(process.argv[2] || 60);
let steps = 0, ended = 0;
const t0 = Date.now();
for (let g = 0; g < N; g++) {
  const room = new Room('FZ' + g, { delay: 0 });
  const nP = 1 + Math.floor(Math.random() * 5);
  const pids = Array.from({ length: nP }, (_, i) => { const { pid } = room.join(i === 0 ? junk() : 'J' + i); room.players[pid].connected = true; return pid; });
  for (let s = 0; s < 3000; s++) {
    const pid = R(pids);
    if (Math.random() < 0.02) room.setConnected(pid, Math.random() < 0.5);
    const msg = randomMsg(room, pid);
    steps++;
    const senders = msg.type === 'vote' && Math.random() < 0.8 ? pids : [pid]; // a veces votan todos lo mismo
    for (const who of senders) try { room.handle(who, msg); } catch (e) {
      if (!(e instanceof Error) || e.constructor !== Error || PROGRAMMING.test(e.message)) record(msg.type, e, msg);
    }
    try { room.emit(); for (const p of pids) JSON.stringify(room.viewFor(p)); } catch (e) { record('view', e, msg); }
    // invariantes
    for (const pc of Object.values(room.pcs)) {
      if (!Number.isFinite(pc.hp) || pc.hp > pc.maxHp || pc.hp < 0) record('inv', new Error(`PG imposibles ${pc.hp}/${pc.maxHp}`), msg);
      for (const [l, n] of Object.entries(pc.slots || {})) if (!(n >= 0)) record('inv', new Error(`espacios negativos nivel ${l}: ${n}`), msg);
    }
    if (!(room.party && room.party.gold >= 0)) record('inv', new Error(`oro imposible ${room.party && room.party.gold}`), msg);
    const mu = room.music;
    if (mu.queue.length > 20 || !Number.isInteger(mu.index) || mu.index < 0 || mu.index >= Math.max(1, mu.queue.length) || !(mu.pos >= 0) || !mu.queue.every((id) => /^[A-Za-z0-9_-]{11}$/.test(id))) record('inv', new Error(`música imposible ${JSON.stringify(mu)}`), msg);
    if (room.phase === 'ended') { ended++; break; }
  }
  room.dispose();
}
console.log(`${N} salas, ${steps} acciones, ${ended} aventuras terminadas, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (!bugs.size) { console.log('✔ Sin errores de programación ni estados imposibles.'); process.exit(0); }
for (const [k, b] of bugs) console.log(`\n✘ ${k} (×${b.count})\n  msg: ${JSON.stringify(b.ctx)}\n${b.stack}`);
process.exit(1);
