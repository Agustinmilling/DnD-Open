// Comprueba el envío incremental: un cliente que solo recibe los cambios (viewJSON + public/viewsync.js)
// debe ver exactamente lo mismo que uno que recibe la vista completa, durante partidas enteras.
// Uso: node test/sync.js [partidas=6]
const assert = require('assert');
const { Room } = require('../src/engine');
const C = require('../src/character');
const ViewSync = require('../public/viewsync');
const ADVENTURES = require('../src/data/adventures');
const { botTurn, botExplore } = require('./bot');

const GAMES = Number(process.argv[2] || 6);
const plain = (x) => JSON.parse(JSON.stringify(x));
let messages = 0, skipped = 0, bytesDelta = 0, bytesFull = 0;

function check(room, clients) {
  for (const c of clients) {
    const full = plain(room.viewFor(c.pid));
    bytesFull += JSON.stringify(full).length;
    for (const [mode, sync] of [['directo', c.live], ['sondeo', c.poll]]) {
      const data = mode === 'directo' ? room.viewJSON(c.pid, c.conn) : room.viewJSON(c.pid, null, sync.since());
      if (mode === 'directo') { if (data) { messages++; bytesDelta += data.length; } else skipped++; }
      const got = data ? sync.apply(JSON.parse(data)) : c.lastLive;
      if (mode === 'directo') c.lastLive = got;
      const { log, chat, ...rest } = got;
      const { log: fLog, chat: fChat, ...fRest } = full;
      assert.deepStrictEqual(plain(rest), fRest, `${mode}: la vista recompuesta no coincide`);
      assert.deepStrictEqual(plain(log.slice(-fLog.length)), fLog, `${mode}: el registro no coincide`);
      assert.deepStrictEqual(plain(chat.slice(-fChat.length)), fChat, `${mode}: el chat no coincide`);
    }
  }
}

let k = 0;
for (let g = 0; g < GAMES; g++) {
  const advId = Object.keys(ADVENTURES)[g % Object.keys(ADVENTURES).length];
  const room = new Room('SYN' + k++, { delay: 0 });
  const n = 1 + (g % 4);
  const clients = [];
  for (let i = 0; i < n; i++) {
    const { pid } = room.join('Bot' + i);
    room.players[pid].connected = true;
    clients.push({ pid, conn: {}, live: ViewSync.create(), poll: ViewSync.create(), lastLive: null });
    check(room, clients);
    room.handle(pid, { type: 'create', spec: C.randomSpec() });
    check(room, clients);
  }
  // soltar y volver a elegir personaje: la ficha vuelve idéntica y el cliente debe tenerla
  const first = clients[0].pid;
  const charId = room.players[first].charId;
  room.handle(first, { type: 'release' }); check(room, clients);
  room.handle(first, { type: 'pick', charId }); check(room, clients);
  room.handle(first, { type: 'chat', text: 'hola' }); check(room, clients);
  room.handle(first, { type: 'adventure', id: advId });
  room.handle(first, { type: 'start' });
  check(room, clients);
  let steps = 0;
  while (room.phase === 'adventure' && steps++ < 2500) {
    const def = room.sceneDef();
    if (def && def.end) break;
    try {
      if (room.combat) {
        const cur = room.current();
        botTurn(room, clients.map((c) => c.pid).find((p) => room.players[p].charId === cur.id));
      } else {
        const v = room.viewFor(first);
        for (const c of clients) botExplore(room, c.pid);
        const checks = v.scene.checks.filter((x) => !x.done && !x.triedByMe);
        const exits = v.scene.exits.filter((x) => x.enabled);
        if (checks.length && Math.random() < 0.6) room.handle(first, { type: 'check', checkId: checks[Math.floor(Math.random() * checks.length)].id });
        else if (exits.length) { const ex = exits[Math.floor(Math.random() * exits.length)]; for (const c of clients) { try { room.handle(c.pid, { type: 'vote', exit: ex.idx }); } catch {} } }
        if (steps % 7 === 0) room.handle(first, { type: 'chat', text: `/r 1d20+${steps % 5}` });
      }
    } catch (e) { if (e instanceof assert.AssertionError) throw e; }
    check(room, clients);
  }
  // un cliente que se conecta a mitad de partida recibe todo de golpe
  const late = { pid: first, conn: {}, live: ViewSync.create(), poll: ViewSync.create(), lastLive: null };
  check(room, [late]);
  room.dispose();
}
console.log(`✔ Envío incremental correcto en ${GAMES} partidas: ${messages} mensajes (${skipped} sin cambios, no enviados), ${(bytesDelta / Math.max(1, messages) / 1024).toFixed(1)} KB de media frente a ${(bytesFull / (messages + skipped) / 1024).toFixed(1)} KB de la vista completa.`);
