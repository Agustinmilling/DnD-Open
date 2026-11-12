// Medición de rendimiento del servidor: cuánto cuesta preparar y serializar la vista de cada jugador.
// Uso: node test/bench.js [jugadores=4] [repeticiones=2000]
const { Room } = require('../src/engine');
const C = require('../src/character');
const { XP_TABLE } = require('../src/rules');
const { botTurn } = require('./bot');

const PLAYERS = Math.min(4, Number(process.argv[2] || 4)); // el grupo admite hasta 4 personajes
const REPS = Number(process.argv[3] || 2000);
const CLS = ['wizard', 'cleric', 'fighter', 'rogue', 'druid', 'paladin', 'bard', 'warlock'];

function setup() {
  const room = new Room('BENCH', { delay: 0 });
  const pids = [];
  for (let i = 0; i < PLAYERS; i++) {
    const { pid } = room.join('Jugador' + i);
    room.players[pid].connected = true;
    room.handle(pid, { type: 'create', spec: C.randomSpec(Math.random, { cls: CLS[i % CLS.length] }) });
    pids.push(pid);
  }
  room.handle(pids[0], { type: 'adventure', id: 'robledal' });
  room.handle(pids[0], { type: 'start' });
  if (room.combat) room.combat = null;
  for (const pc of room.partyPCs()) { C.gainXp(pc, XP_TABLE[2]); pc.hp = pc.maxHp; }
  room.sceneDef = () => ({ combat: { victory: { text: '' } } });
  room.victory = function () { this.combat = null; for (const pc of this.partyPCs()) this.cleanupAfterCombat(pc); };
  room.defeat = room.victory;
  // varios combates para llenar el registro, como en una partida larga
  for (let f = 0; f < 6 && room.log.length < 260; f++) {
    for (const pc of room.partyPCs()) { pc.hp = pc.maxHp; pc.dead = false; pc.conditions = {}; }
    room.startCombat({ enemies: () => ['goblin', 'goblin', 'wolf', 'goblin'] });
    let steps = 0;
    while (room.combat && steps++ < 400) botTurn(room, pids.find((p) => room.players[p].charId === room.current().id));
  }
  for (let i = 0; i < 40; i++) room.handle(pids[i % PLAYERS], { type: 'chat', text: `Mensaje de prueba número ${i}, para que el chat tenga historial.` });
  for (const pc of room.partyPCs()) { pc.hp = pc.maxHp; pc.dead = false; pc.conditions = {}; }
  room.monsterTurn = function () { return this.endTurn(); };
  room.startCombat({ enemies: () => ['goblin', 'goblin', 'wolf', 'goblin'] });
  return { room, pids };
}

const { room, pids } = setup();
const time = (fn) => { const t = process.hrtime.bigint(); fn(); return Number(process.hrtime.bigint() - t) / 1e6; };

// Un cambio típico en la sala: un personaje pierde o recupera 1 PG y se añade una línea al registro.
const pcs = room.partyPCs();
let tick = 0;
const change = () => { const pc = pcs[tick++ % pcs.length]; pc.hp = pc.hp > 1 ? pc.hp - 1 : pc.maxHp; room.addLog('combat', `Cambio de prueba ${tick}.`); };

// 1) como se hacía antes: vista completa, recalculada y serializada para cada jugador
let bytes = 0;
for (let i = 0; i < 200; i++) { change(); for (const p of pids) JSON.stringify(room.viewFor(p)); } // calentamiento
const full = time(() => { for (let i = 0; i < REPS; i++) { change(); for (const p of pids) bytes = JSON.stringify(room.viewFor(p)).length; } });
console.log(`Vista completa:    ${(full / REPS).toFixed(3)} ms por cambio (${PLAYERS} jugadores) · ${(bytes / 1024).toFixed(1)} KB por jugador`);

// 2) como se hace ahora: cada conexión recibe solo lo que cambia
if (room.viewJSON) {
  const conns = pids.map(() => ({}));
  let b2 = 0, n2 = 0;
  for (let i = 0; i < 200; i++) { change(); pids.forEach((p, j) => room.viewJSON(p, conns[j])); }
  const inc = time(() => { for (let i = 0; i < REPS; i++) { change(); pids.forEach((p, j) => { const d = room.viewJSON(p, conns[j]); if (d) { b2 += d.length; n2++; } }); } });
  console.log(`Envío incremental: ${(inc / REPS).toFixed(3)} ms por cambio (${PLAYERS} jugadores) · ${(b2 / Math.max(1, n2) / 1024).toFixed(2)} KB por jugador · ${(full / inc).toFixed(1)}× más rápido`);
}

// 3) menú de acciones de combate
const cur = room.current();
const acts = time(() => { for (let i = 0; i < REPS; i++) room.combatActions(cur); });
console.log(`Menú de acciones: ${(acts / REPS * 1000).toFixed(1)} µs`);
room.dispose();
