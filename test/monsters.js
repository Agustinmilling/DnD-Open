// Combates sueltos contra cada monstruo del SRD 5.2.1 con grupos al azar de nivel 1 a 3.
// Comprueba que todas sus habilidades funcionan sin errores y que el texto del registro está bien formado.
// Uso: node test/monsters.js [combates por monstruo=6]
const assert = require('assert');
const { Room } = require('../src/engine');
const C = require('../src/character');
const MONSTERS = require('../src/data/monsters');
const CLASSES = require('../src/data/classes');
const { XP_TABLE } = require('../src/rules');
const { botTurn } = require('./bot');

const N = Number(process.argv[2] || 6);
const CLS = Object.keys(CLASSES);
const result = {};
let k = 0;
for (const type of Object.keys(MONSTERS)) {
  const m = MONSTERS[type];
  assert.ok(m.name && m.ac && m.hp && m.avgHp && m.cr && m.attacks.length, `${type}: faltan datos`);
  for (const a of m.attacks) assert.ok(a.area || (a.bonus !== undefined && a.dmg), `${type}: ataque incompleto ${a.name}`);
  for (const i of m.multiattack || []) assert.ok(m.attacks[i], `${type}: multiataque con índice ${i}`);
  result[type] = { wins: 0, losses: 0 };
  for (let g = 0; g < N; g++) {
    const room = new Room('MON' + k++, { delay: 0 });
    const level = 1 + (g % 3);
    const n = 1 + Math.floor(Math.random() * 4);
    const pids = [];
    for (let i = 0; i < n; i++) {
      const { pid } = room.join('Bot' + i);
      room.players[pid].connected = true;
      room.handle(pid, { type: 'create', spec: C.randomSpec(Math.random, { cls: CLS[(g * 4 + i) % CLS.length] }) });
      pids.push(pid);
    }
    room.handle(pids[0], { type: 'adventure', id: 'robledal' });
    room.handle(pids[0], { type: 'start' });
    if (room.combat) room.combat = null;
    for (const pc of room.partyPCs()) { if (level > 1) C.gainXp(pc, XP_TABLE[level - 1]); pc.hp = pc.maxHp; }
    const count = Math.max(1, Math.round(n * (['2', '3'].includes(m.cr) ? 0.5 : m.cr === '1' ? 0.75 : 1.5)));
    let ended = null;
    room.sceneDef = () => ({ combat: { victory: { text: '' } } });
    room.victory = function () { ended = 'win'; this.combat = null; for (const pc of this.partyPCs()) this.cleanupAfterCombat(pc); };
    room.defeat = function () { ended = 'loss'; this.combat = null; for (const pc of this.partyPCs()) this.cleanupAfterCombat(pc); };
    room.startCombat({ enemies: () => Array(count).fill(type) });
    let steps = 0;
    while (room.combat && steps++ < 3000) {
      const cur = room.current();
      const pid = pids.find((p) => room.players[p].charId === cur.id);
      botTurn(room, pid);
    }
    assert.ok(ended, `${type}: el combate no terminó`);
    result[type][ended === 'win' ? 'wins' : 'losses']++;
    const bad = room.log.find((l) => /undefined|NaN|\[object/.test(l.text));
    assert.ok(!bad, `${type}: texto roto en el registro: ${bad && bad.text}`);
    for (const pc of room.partyPCs()) {
      assert.ok(pc.hp <= pc.maxHp && pc.hp >= 0 && Number.isFinite(pc.maxHp), `${type}: PG imposibles ${pc.hp}/${pc.maxHp}`);
      assert.ok(!pc.drained, `${type}: PG máximos sin restaurar`);
    }
    room.dispose();
  }
}
console.log(Object.entries(result).map(([t, r]) => `${t} ${r.wins}-${r.losses}`).join(' · '));
console.log(`✔ ${Object.keys(MONSTERS).length} monstruos probados en combate.`);
