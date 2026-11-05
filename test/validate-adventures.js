// Revisión estática de las aventuras: busca errores de estructura antes de simular partidas.
// Uso: node test/validate-adventures.js [idAventura]
// Comprueba escenas que no existen, monstruos, objetos, habilidades o ilustraciones desconocidas,
// combates sin salida de pelea, escenas inalcanzables, finales y banderas que nunca se activan.
const fs = require('fs');
const path = require('path');
const ADVENTURES = require('../src/data/adventures');
const MONSTERS = (() => { const m = require('../src/data/monsters'); return m.MONSTERS || m; })();
const ITEMS = (() => { const m = require('../src/data/items'); return m.ITEMS || m; })();
const SKILLS = (() => { const m = require('../src/data/skills'); return m.SKILLS || m; })();

const fx = fs.readFileSync(path.join(__dirname, '..', 'public', 'fx.js'), 'utf8');
const ARTS = new Set((fx.slice(fx.indexOf('ART = {')).match(/^ {4}([a-z]+)\(r\)/gm) || []).map((s) => s.trim().replace('(r)', '')));
const TONES = ['good', 'mixed', 'bad'];

function validate(adv) {
  const errors = [];
  const warnings = [];
  const err = (where, msg) => { const m = `${where}: ${msg}`; if (!errors.includes(m)) errors.push(m); };
  const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
  const scenes = adv.scenes || {};
  const ids = new Set(Object.keys(scenes));
  const flagsSet = new Set(Object.keys(adv.startFlags || {}));
  const flagsRead = new Map();
  const edges = new Map([...ids].map((id) => [id, new Set()]));

  for (const k of ['id', 'title', 'summary', 'start', 'scenes']) if (!adv[k]) err(adv.id || '?', `falta el campo "${k}"`);
  if (adv.art && !ARTS.has(adv.art)) err(adv.id, `ilustración desconocida "${adv.art}"`);
  if (!ids.has(adv.start)) err(adv.id, `la escena inicial "${adv.start}" no existe`);

  const fnTargets = (fn) => (String(fn).match(/['"`]([a-z0-9_]+)['"`]/g) || []).map((s) => s.slice(1, -1)).filter((s) => ids.has(s));
  const target = (from, to, where) => {
    if (!to) return;
    if (typeof to === 'function') { for (const t of fnTargets(to)) edges.get(from).add(t); return; }
    if (!ids.has(to)) err(where, `lleva a una escena que no existe: "${to}"`);
    else edges.get(from).add(to);
  };
  const read = (list, where) => { for (const f of list || []) if (!flagsRead.has(f)) flagsRead.set(f, where); };
  const outcome = (from, out, where) => {
    if (!out) return;
    for (const f of out.flags || []) flagsSet.add(f);
    for (const k of Object.keys(out.set || {})) flagsSet.add(k);
    for (const k of Object.keys(out.inc || {})) flagsSet.add(k);
    for (const id of Object.keys(out.items || {})) if (!ITEMS[id]) err(where, `objeto desconocido "${id}"`);
    for (const d of [out.damageFailed, out.damageAll]) if (d && (!d.expr || !d.type)) err(where, 'el daño necesita "expr" y "type"');
    target(from, out.goto, where);
  };

  for (const [sid, s] of Object.entries(scenes)) {
    const at = `${adv.id}/${sid}`;
    if (!s.title) err(at, 'falta "title"');
    if (s.art && !ARTS.has(s.art)) err(at, `ilustración desconocida "${s.art}" (disponibles: ${[...ARTS].join(', ')})`);
    if (s.redirect) { for (const t of fnTargets(s.redirect)) edges.get(sid).add(t); if (!fnTargets(s.redirect).length) err(at, 'el redirect no nombra ninguna escena existente'); }
    outcome(sid, s.onEnter, `${at}/onEnter`);
    for (const id of Object.keys(s.shop || {})) if (!ITEMS[id]) err(`${at}/shop`, `objeto desconocido "${id}"`);
    if (s.trap) { if (!s.trap.save || !s.trap.dc || !s.trap.damage || !s.trap.type) err(`${at}/trap`, 'la trampa necesita save, dc, damage y type'); read([s.trap.unless], `${at}/trap`); }
    if (s.ending && !TONES.includes(s.ending.tone)) err(at, `tono de final inválido "${s.ending.tone}" (good, mixed o bad)`);
    if (s.end && !s.ending && adv.endingCount > 1) warn(at, 'escena final sin "ending { title, tone }"');

    const checkIds = new Set();
    for (const c of s.checks || []) {
      const cat = `${at}/check:${c.id}`;
      if (!c.id) err(at, `una prueba no tiene "id" (${c.label})`);
      else if (checkIds.has(c.id)) err(cat, 'id repetido en la misma escena');
      checkIds.add(c.id);
      if (!c.label) err(cat, 'falta "label"');
      if (!c.auto && !c.skill) err(cat, 'una prueba sin "auto: true" necesita "skill" y "dc"');
      if (!c.auto && typeof c.dc !== 'number') err(cat, 'falta "dc" numérica');
      for (const sk of [c.skill, c.altSkill]) if (sk && !SKILLS[sk]) err(cat, `habilidad desconocida "${sk}" (válidas: ${Object.keys(SKILLS).join(', ')})`);
      for (const id of [c.needsItem, c.advIfItem]) if (id && !ITEMS[id]) err(cat, `objeto desconocido "${id}"`);
      if (!c.success) err(cat, 'falta "success"');
      if (c.preCombat && !s.combat) err(cat, 'preCombat en una escena sin combate');
      if ((c.success && c.success.startCombat) || (c.fail && c.fail.startCombat)) { if (!s.combat) err(cat, 'startCombat en una escena sin combate'); }
      read(c.requires, cat); read(c.showIf, cat); read(c.advIf, cat); read(c.disIf, cat);
      outcome(sid, c.success, cat); outcome(sid, c.fail, cat);
    }

    const exits = s.exits || [];
    for (const [i, ex] of exits.entries()) {
      const eat = `${at}/exit#${i + 1}`;
      if (!ex.label) err(eat, 'falta "label"');
      if (!ex.fight && !ex.to) err(eat, 'una salida necesita "to" o "fight: true"');
      target(sid, ex.to, eat);
      outcome(sid, ex.effects, `${eat}/effects`);
      read(ex.requires, eat); read(ex.showIf, eat);
    }
    const free = exits.filter((ex) => ex.to && !ex.requires && !ex.showIf && !ex.when);
    // Banderas que la escena garantiza: pruebas automáticas o repetibles, o que se activan tanto con éxito como con fallo.
    const sure = new Set([...((s.onEnter && s.onEnter.flags) || []), ...((s.combat && s.combat.victory && s.combat.victory.flags) || [])]);
    for (const c of s.checks || []) {
      const ok = (c.success && c.success.flags) || [];
      const ko = (c.fail && c.fail.flags) || [];
      for (const f of ok) if (c.auto || ko.includes(f)) sure.add(f); // retry no basta: si todos fallan, se cierra
    }
    if (!s.end && !s.redirect && !exits.some((ex) => ex.to) && !(s.checks || []).some((c) => (c.success && c.success.goto) || (c.fail && c.fail.goto))) err(at, 'escena sin salida (ni exits, ni redirect, ni goto, ni end)');
    const gatedOk = exits.some((ex) => {
      const req = [...(ex.requires || []), ...(ex.showIf || [])];
      if (!ex.to) return false;
      if (req.some((f) => sure.has(f))) return true;
      // Una prueba cuyo éxito y fallo activan, cada uno, alguna de las banderas que pide la salida.
      return (s.checks || []).some((c) => ((c.success && c.success.flags) || []).some((f) => req.includes(f)) && ((c.fail && c.fail.flags) || []).some((f) => req.includes(f)));
    });
    if (!s.end && !s.redirect && exits.some((ex) => ex.to) && !free.length && !gatedOk) {
      warn(at, 'todas las salidas están condicionadas: asegúrate de que siempre se puede activar alguna (si todos fallan las pruebas, ¿hay una prueba automática u otra salida?)');
    }

    if (s.combat) {
      const cb = s.combat;
      if (typeof cb.enemies !== 'function') err(`${at}/combat`, 'enemies debe ser una función (n, flags) => [ids]');
      else {
        for (let n = 1; n <= 4; n++) {
          let list = [];
          try { list = cb.enemies(n, { ...(adv.startFlags || {}) }); } catch (e) { err(`${at}/combat`, `enemies(${n}) lanza un error: ${e.message}`); continue; }
          if (!Array.isArray(list) || !list.length) err(`${at}/combat`, `enemies(${n}) no devuelve monstruos`);
          for (const m of list || []) if (!MONSTERS[m]) err(`${at}/combat`, `monstruo desconocido "${m}" (disponibles: ${Object.keys(MONSTERS).join(', ')})`);
        }
      }
      // Sin combat.auto el combate empieza solo al entrar. Si auto puede devolver false, hace falta una salida de pelea.
      if (cb.auto && !exits.some((ex) => ex.fight)) err(at, 'un combate con "auto" necesita una salida { label, fight: true } (el grupo puede elegir pelear)');
      if (!cb.auto && (s.checks || []).some((c) => c.preCombat)) warn(at, 'hay pruebas preCombat pero el combate empieza solo (añade combat.auto)');
      if (!cb.victory || !cb.victory.text) err(`${at}/combat`, 'falta victory.text');
      outcome(sid, cb.victory, `${at}/victory`);
      if (cb.defeat) { target(sid, cb.defeat.to, `${at}/defeat`); for (const f of cb.defeat.flags || []) flagsSet.add(f); }
    }
  }

  // Alcanzabilidad desde la escena inicial.
  const seen = new Set();
  const stack = ids.has(adv.start) ? [adv.start] : [];
  while (stack.length) { const id = stack.pop(); if (seen.has(id)) continue; seen.add(id); for (const t of edges.get(id) || []) stack.push(t); }
  for (const id of ids) if (!seen.has(id)) err(`${adv.id}/${id}`, 'escena inalcanzable desde el inicio');

  const ends = Object.entries(scenes).filter(([, s]) => s.end);
  if (!ends.length) err(adv.id, 'no hay ninguna escena con "end: true"');
  if (adv.endingCount && adv.endingCount !== ends.length) err(adv.id, `endingCount es ${adv.endingCount} pero hay ${ends.length} escenas finales`);

  for (const [f, where] of flagsRead) if (!flagsSet.has(f) && f) warn(where, `la bandera "${f}" se consulta pero nunca se activa de forma visible (si la activa una función, ignora este aviso)`);
  for (const k of Object.keys(adv.journal || {})) if (!flagsSet.has(k)) warn(`${adv.id}/journal`, `la entrada "${k}" del diario usa una bandera que nunca se activa`);
  return { errors, warnings: [...new Set(warnings)] };
}

module.exports = { validate };

if (require.main === module) {
  const only = process.argv.find((a) => ADVENTURES[a]);
  let bad = 0;
  for (const [id, adv] of Object.entries(ADVENTURES)) {
    if (only && id !== only) continue;
    if (adv.id !== id) { console.log(`✘ ${id}: el id del archivo ("${adv.id}") no coincide con su clave en index.js`); bad++; continue; }
    const { errors, warnings } = validate(adv);
    const n = Object.keys(adv.scenes || {}).length;
    for (const w of warnings) console.log(`  ⚠ ${w}`);
    for (const e of errors) console.log(`  ✘ ${e}`);
    console.log(`${errors.length ? '✘' : '✔'} ${id}: ${n} escenas, ${errors.length} errores, ${warnings.length} avisos`);
    bad += errors.length;
  }
  if (bad) { console.log(`\n${bad} errores. Corrígelos antes de simular partidas.`); process.exit(1); }
}
