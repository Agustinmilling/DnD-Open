// Simula partidas completas con bots para comprobar que el motor no se rompe
// y que la aventura se puede terminar con 1, 2, 3 y 4 jugadores.
const assert = require('assert');
const { Room } = require('../src/engine');
const { roll } = require('../src/dice');
const C = require('../src/character');
const ADVENTURES = require('../src/data/adventures');

const { botTurn, botExplore, stats } = require('./bot');

function play(nPlayers, advId, verbose = false) {
  const room = new Room('TEST' + Math.floor(Math.random() * 1e6), { delay: 0 });
  const chars = ['darian', 'brenna', 'lia', 'ithriel'].slice(0, nPlayers);
  const custom = Math.random() < 0.7;
  const pids = chars.map((c, i) => {
    const { pid } = room.join('Bot' + i);
    room.players[pid].connected = true;
    if (custom && (i % 2 === 0 || Math.random() < 0.5)) room.handle(pid, { type: 'create', spec: C.randomSpec(Math.random, { cls: CLASS_IDS[(classCursor++) % CLASS_IDS.length] }) });
    else room.handle(pid, { type: 'pick', charId: c });
    return pid;
  });
  room.handle(pids[0], { type: 'adventure', id: advId });
  // Quien desenvaina es un jugador con el personaje consciente (como haría una persona).
  const awake = () => pids.find((pid) => { const pc = room.pcs[room.players[pid].charId]; return pc && pc.hp > 0; }) || pids[0];
  const origDefeat = room.defeat.bind(room);
  room.defeat = () => { const k = `${advId}:${room.sceneId}:${nPlayers}`; stats.defeatAt[k] = (stats.defeatAt[k] || 0) + 1; origDefeat(); };
  assert.strictEqual(room.advId, advId);
  room.handle(pids[0], { type: 'chat', text: 'Hola mesa' });
  room.handle(pids[0], { type: 'chat', text: '/r 2d6+3' });
  room.handle(pids[0], { type: 'roll', sheet: { kind: 'skill', key: 'athletics' }, mode: 'adv' });
  room.handle(pids[0], { type: 'start' });
  let steps = 0;
  let defeats = 0;
  while (room.phase !== 'ended' && steps++ < 5000) {
    if (room.combat) {
      const cur = room.current();
      const pid = pids.find((p) => room.players[p].charId === cur.id);
      if (!pid) throw new Error('turno atascado: ' + cur.name);
      botTurn(room, pid);
      continue;
    }
    const v = room.viewFor(pids[0]);
    if (!v.scene) { defeats++; room.enterScene(room.sceneId); continue; } // derrota pendiente (con delay 0 ya se reinició)
    // curarse fuera de combate
    for (const pid of pids) {
      botExplore(room, pid);
      for (const l of room.viewFor(pid).party.loot) room.handle(pid, { type: 'take', item: l.id });
    }
    if (v.scene.shortRest && room.activePCs().some((p) => p.hp < p.maxHp * 0.75)) room.handle(pids[0], { type: 'rest' });
    // tienda: comprar una poción si sobra oro
    if (v.scene.shop && v.party.gold >= 50 && Math.random() < 0.7) room.handle(pids[0], { type: 'buy', item: 'potion_healing' });
    // encuentro pendiente: probar a veces una opción previa, si no atacar
    if (v.scene.encounter) {
      const pre = v.scene.checks.filter((c) => c.pre && !c.done && !c.triedByMe && (!c.cost || v.party.gold >= c.cost));
      const fight = v.scene.exits.find((e) => e.fight);
      if (pre.length && Math.random() < 0.6) {
        const c = pre[Math.floor(Math.random() * pre.length)];
        try { room.handle(pids[Math.floor(Math.random() * pids.length)], { type: 'check', checkId: c.id }); } catch (e) { if (!/necesita|oro/.test(e.message)) throw e; room.handle(awake(), { type: 'vote', exit: fight.idx }); }
      } else room.handle(awake(), { type: 'vote', exit: fight.idx });
      stats.encounters[v.scene.id + (room.combat ? ':lucha' : ':paz')] = (stats.encounters[v.scene.id + (room.combat ? ':lucha' : ':paz')] || 0) + 1;
      continue;
    }
    const check = v.scene.checks.find((c) => !c.done && !c.triedByMe && c.id !== 'force' && !c.cost && !c.needsItem && Math.random() < 0.8);
    if (check) {
      const conscious = (p) => { const pc = room.pcs[room.players[p].charId]; return pc && pc.hp > 0; };
      const who = pids.find((p) => conscious(p) && !room.viewFor(p).scene.checks.find((c) => c.id === check.id).triedByMe) || awake();
      room.handle(who, { type: 'check', checkId: check.id });
      continue;
    }
    const force = v.scene.checks.find((c) => c.id === 'force' && !c.done);
    const exits = v.scene.exits.filter((e) => e.enabled && !e.fight);
    if (!exits.length && force) { room.handle(pids[0], { type: 'check', checkId: 'force' }); continue; }
    if (!exits.length) {
      // quizá falte una prueba obligatoria (p. ej. cruzar el vado)
      const pending = v.scene.checks.find((c) => !c.done && !c.triedByMe);
      if (pending) { room.handle(pids[0], { type: 'check', checkId: pending.id }); continue; }
      throw new Error('Escena sin salida: ' + v.scene.id);
    }
    const exit = exits[Math.floor(Math.random() * exits.length)];
    stats.scenes[exit.label] = (stats.scenes[exit.label] || 0) + 1;
    for (const pid of pids) if (room.sceneId === v.scene.id && !room.combat) room.handle(pid, { type: 'vote', exit: exit.idx });
  }
  if (verbose) for (const l of room.log) console.log(`[${l.kind}] ${l.text}`);
  const path = room.log.filter((l) => l.kind === 'scene' && l.title).map((l) => l.text).join(' → ');
  if (room.phase !== 'ended' || room.partyPCs().some((p) => p.level < 3)) {
    console.log('RUTA:', path);
    for (const l of room.log.slice(-25)) console.log(`  [${l.kind}] ${l.text.slice(0, 160)}`);
  }
  const badLog = room.log.find((l) => /undefined|NaN|\[object/.test(l.text));
  assert.ok(!badLog, 'texto roto en el registro: ' + (badLog && badLog.text));
  assert.strictEqual(room.phase, 'ended', 'la aventura debería terminar (' + advId + ' en ' + room.sceneId + ')');
  const endKey = advId + ':' + room.sceneId;
  stats.endings[endKey] = (stats.endings[endKey] || 0) + 1;
  for (const p of room.partyPCs()) { stats.races[C.TEMPLATES[p.templateId].race.split(' (')[0]] = 1; stats.classes[C.TEMPLATES[p.templateId].cls] = 1; }
  room.dispose();
  for (const p of room.partyPCs()) assert.strictEqual(p.level, 3, p.name + ' debería acabar en nivel 3 (' + p.xp + ' PX)');
  const lv = room.partyPCs().map((p) => `${p.name.split(' ')[0]} nv${p.level} ${p.xp}PX ${p.hp}/${p.maxHp}`);
  return { steps, lv, defeats: room.log.filter((l) => l.text.startsWith('💀')).length, deaths: room.log.filter((l) => l.text.includes('Regla de la casa')).length };
}

assert.ok(roll('2d6+3').total >= 5);
Object.assign(stats, { scenes: {}, encounters: {}, endings: {}, races: {}, classes: {}, defeatAt: {} });
const CLASS_IDS = Object.keys(require('../src/data/classes'));
let classCursor = Math.floor(Math.random() * CLASS_IDS.length);
const verbose = process.argv.includes('-v');
const only = process.argv.find((a) => ADVENTURES[a]);
const N = verbose ? 1 : Number(process.env.N || 10);
for (const advId of only ? [only] : Object.keys(ADVENTURES)) {
  for (const n of [1, 2, 3, 4]) {
    let defeats = 0; let deaths = 0; let last;
    for (let i = 0; i < N; i++) { last = play(n, advId, verbose && n === 4); defeats += last.defeats; deaths += last.deaths; }
    console.log(`[${advId}] ${n} jugador(es): ${N} partidas OK · derrotas ${defeats} · caídos reanimados ${deaths} · ej.: ${last.lv.join(' | ')}`);
  }
}
console.log('Encuentros:', JSON.stringify(stats.encounters));
console.log('Finales:', JSON.stringify(stats.endings));
console.log('Derrotas por escena:', JSON.stringify(stats.defeatAt));
console.log('Especies usadas:', Object.keys(stats.races).join(', '));
console.log('Clases usadas:', Object.keys(stats.classes).join(', '));
if (process.env.ACTIONS) console.log('Acciones usadas:', Object.keys(stats.actions).sort().join(' '));
console.log('✔ Todas las partidas simuladas terminaron correctamente.');
