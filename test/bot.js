// Bot genérico para las pruebas: juega cualquier clase eligiendo acciones por su categoría (ai).
const stats = { actions: {} };
const rnd = (list) => (list.length ? list[Math.floor(Math.random() * list.length)] : null);

/** Bot genérico: elige acciones por su categoría (ai) para que sirva con cualquier clase */
function botTurn(room, pid) {
  const v = room.viewFor(pid);
  const acts = v.combat.actions;
  const me = v.pcs.find((p) => p.id === v.you.charId);
  const enemies = v.combat.enemies.filter((e) => !e.dead);
  const alive = v.pcs.filter((p) => !p.dead && !p.down);
  const down = v.pcs.find((p) => p.down && !p.stable);
  const hurt = v.pcs.filter((p) => !p.dead && p.hp < p.maxHp / 2).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
  const ts = v.combat.turnState || {};
  const tk = `${room.combat.round}:${room.combat.turn}`;
  if (!room.botTurns || room.botTurns.key !== tk) room.botTurns = { key: tk, n: 0 };
  const count = ++room.botTurns.n;
  const by = (...ais) => acts.filter((x) => ais.includes(x.ai) && (x.target !== 'allyOther' || alive.some((p) => p.id !== me.id)));
  let a = null;
  if (count > 15) a = acts.find((x) => x.key === 'end');
  if (!a) a = rnd(by('escape'));
  if (!a && down) a = rnd(by('heal').filter((x) => x.target === 'ally')) || rnd(by('revive'));
  if (!a && hurt && Math.random() < 0.8) a = (hurt.id === me.id && rnd(by('selfheal'))) || rnd(by('heal'));
  if (!a) a = Math.random() < 0.9 ? rnd(by('smite')) : null;
  if (!a && Math.random() < 0.45) a = rnd([...by('self', 'surge', 'mark'), ...(me.concentration ? [] : by('buff', 'control'))]);
  if (!a && Math.random() < 0.15) a = rnd(by('defend', 'misc'));
  if (!a) a = rnd(by('attack'));
  if (!a) a = rnd(acts.filter((x) => x.cost !== 'free' && x.key !== 'end' && x.ai !== 'heal' && x.ai !== 'selfheal')) || acts.find((x) => x.key === 'end');
  if (process.env.DBG && a.key === 'end' && count === 1) { console.log('SOLO END', me.name, me.className, me.shape, JSON.stringify(me.conditions), acts.map((x) => x.key + '/' + x.ai).join(' ')); }
  stats.actions[a.key.split(/[:@]/)[0] + (a.key.startsWith('spell:') ? ':' + a.key.split(/[:@]/)[1] : '')] = 1;
  let targets = [];
  if (['enemy', 'enemies3'].includes(a.target)) {
    let pool = enemies;
    if (a.key === 'cleave' || a.key === 'horde_breaker') pool = enemies.filter((e) => e.id !== (a.key === 'cleave' ? ts.lastHit && ts.lastHit.targetId : ts.lastTargetId));
    targets = pool.slice().sort(() => Math.random() - 0.5).slice(0, a.maxTargets || 1).map((e) => e.id);
  } else if (a.target === 'dying') targets = [down.id];
  else if (a.target === 'allies') targets = alive.slice(0, a.maxTargets || 3).map((p) => p.id);
  else if (a.target === 'allyOther') targets = [rnd(alive.filter((p) => p.id !== me.id)).id];
  else if (a.target === 'ally') {
    const wounded = v.pcs.filter((p) => !p.dead && p.hp < p.maxHp);
    targets = [(a.ai === 'heal' ? (down || hurt || rnd(wounded) || me) : rnd(alive) || me).id];
  }
  room.handle(pid, { type: 'act', key: a.key, targets });
}

/** Fuera de combate: curarse y lanzar protecciones duraderas */
function botExplore(room, pid) {
  const pv = room.viewFor(pid);
  const hurt = pv.pcs.filter((p) => !p.dead && p.hp < p.maxHp / 2).sort((x, y) => x.hp - y.hp)[0];
  for (const x of pv.exploreActions) {
    const useful = (x.ai === 'heal' && hurt) || ['spell:mage_armor', 'spell:aid', 'spell:false_life', 'spell:barkskin', 'spell:pass_without_trace', 'fiendish_vigor', 'magical_cunning'].includes(x.key);
    if (!useful || Math.random() < 0.3) continue;
    const targets = x.target === 'allies' ? pv.pcs.filter((p) => !p.dead).slice(0, x.maxTargets || 3).map((p) => p.id) : [(hurt || pv.pcs.find((p) => p.id === pv.you.charId)).id];
    stats.actions['explore:' + x.key] = 1;
    room.handle(pid, { type: 'explore', key: x.key, targets });
    return;
  }
}

module.exports = { botTurn, botExplore, stats };
