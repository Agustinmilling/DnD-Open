// Simula partidas completas con bots para comprobar que el motor no se rompe
// y que la aventura se puede terminar con 1, 2, 3 y 4 jugadores.
const assert = require('assert');
const { Room } = require('../src/engine');
const { roll } = require('../src/dice');

function botTurn(room, pid) {
  const v = room.viewFor(pid);
  const acts = v.combat.actions;
  const me = v.pcs.find((p) => p.id === v.you.charId);
  const enemies = v.combat.enemies.filter((e) => !e.dead);
  const down = v.pcs.find((p) => p.down && !p.stable);
  const hurt = v.pcs.filter((p) => !p.dead && p.hp < p.maxHp / 2).sort((a, b) => a.hp - b.hp)[0];
  const pick = (pred) => acts.find(pred);
  let a =
    (down && pick((x) => x.key === 'spell:healing_word')) ||
    (down && pick((x) => x.key === 'spell:cure_wounds')) ||
    (hurt && hurt.id === me.id && pick((x) => x.key === 'second_wind')) ||
    (hurt && pick((x) => x.key.startsWith('item:potion'))) ||
    pick((x) => x.key === 'action_surge') ||
    pick((x) => x.key === 'spell:bless' && !me.concentration) ||
    pick((x) => x.key === 'spell:spiritual_weapon') ||
    pick((x) => x.key === 'spiritual_attack') ||
    pick((x) => x.key === 'hide') ||
    (enemies.length >= 2 && pick((x) => x.key === 'spell:sleep')) ||
    (enemies.some((e) => e.mtype === 'humanoide') && pick((x) => x.key === 'spell:hold_person' && !me.concentration)) ||
    (enemies.some((e) => e.mtype === 'muerto viviente') && pick((x) => x.key === 'turn_undead')) ||
    pick((x) => x.key === 'spell:scorching_ray') ||
    pick((x) => x.key === 'spell:magic_missile') ||
    pick((x) => x.key === 'spell:guiding_bolt') ||
    pick((x) => x.key === 'attack:0' && me.className !== 'Mago') ||
    pick((x) => x.key === 'spell:fire_bolt') ||
    pick((x) => x.key === 'spell:sacred_flame') ||
    pick((x) => x.key === 'end');
  let targets = [];
  if (['enemy', 'enemies3'].includes(a.target)) {
    let pool = enemies;
    if (a.key === 'spell:hold_person') pool = enemies.filter((e) => e.mtype === 'humanoide');
    targets = pool.slice(0, a.maxTargets || 1).map((e) => e.id);
  } else if (a.target === 'dying') targets = [down.id];
  else if (a.target === 'allies') targets = v.pcs.filter((p) => !p.dead).slice(0, 3).map((p) => p.id);
  else if (['ally', 'allyAny', 'allyOther'].includes(a.target)) targets = [(down || hurt || me).id];
  room.handle(pid, { type: 'act', key: a.key, targets });
}

function play(nPlayers, verbose = false) {
  const room = new Room('TEST', { delay: 0 });
  const chars = ['darian', 'brenna', 'lia', 'ithriel'].slice(0, nPlayers);
  const pids = chars.map((c, i) => {
    const { pid } = room.join('Bot' + i);
    room.players[pid].connected = true;
    room.handle(pid, { type: 'pick', charId: c });
    return pid;
  });
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
      const pv = room.viewFor(pid);
      const me = pv.pcs.find((p) => p.id === pv.you.charId);
      const cure = pv.exploreActions.find((x) => x.key === 'spell:cure_wounds');
      const hurt = pv.pcs.find((p) => !p.dead && p.hp < p.maxHp / 2);
      if (cure && hurt) room.handle(pid, { type: 'explore', key: cure.key, targets: [hurt.id] });
      for (const l of pv.party.loot) room.handle(pid, { type: 'take', item: l.id });
      void me;
    }
    if (v.scene.shortRest && room.activePCs().some((p) => p.hp < p.maxHp * 0.75)) room.handle(pids[0], { type: 'rest' });
    const check = v.scene.checks.find((c) => !c.done && !c.triedByMe && c.id !== 'force');
    if (check) {
      // que lo intente el primer personaje que aún no lo haya hecho
      const who = pids.find((p) => !room.viewFor(p).scene.checks.find((c) => c.id === check.id).triedByMe) || pids[0];
      room.handle(who, { type: 'check', checkId: check.id });
      continue;
    }
    const force = v.scene.checks.find((c) => c.id === 'force' && !c.done);
    const exit = v.scene.exits.find((e) => e.enabled);
    if (!exit && force) { room.handle(pids[0], { type: 'check', checkId: 'force' }); continue; }
    if (!exit) throw new Error('Escena sin salida: ' + v.scene.id);
    for (const pid of pids) if (room.sceneId === v.scene.id && !room.combat) room.handle(pid, { type: 'vote', exit: exit.idx });
  }
  if (verbose) for (const l of room.log) console.log(`[${l.kind}] ${l.text}`);
  assert.strictEqual(room.phase, 'ended', 'la aventura debería terminar');
  const lv = room.partyPCs().map((p) => `${p.name.split(' ')[0]} nv${p.level} ${p.xp}PX ${p.hp}/${p.maxHp}`);
  return { steps, lv, defeats: room.log.filter((l) => l.text.startsWith('💀')).length, deaths: room.log.filter((l) => l.text.includes('Regla de la casa')).length };
}

assert.ok(roll('2d6+3').total >= 5);
const verbose = process.argv.includes('-v');
const N = verbose ? 1 : 40;
for (const n of [1, 2, 3, 4]) {
  let defeats = 0; let deaths = 0; let last;
  for (let i = 0; i < N; i++) { last = play(n, verbose && n === 4); defeats += last.defeats; deaths += last.deaths; }
  console.log(`${n} jugador(es): ${N} partidas OK · derrotas totales ${defeats} · caídos reanimados ${deaths} · ejemplo final: ${last.lv.join(' | ')}`);
}
console.log('✔ Todas las partidas simuladas terminaron correctamente.');
