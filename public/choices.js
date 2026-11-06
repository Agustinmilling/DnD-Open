// Elecciones de la creación de personaje (reglas de 2024). Lo usan el servidor (para validar) y el navegador
// (para dibujar el asistente), así las dos partes calculan exactamente lo mismo.
// D = datos de /api/creation; spec = lo que ha elegido el jugador hasta ahora.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Choices = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const byId = (list, id) => list.find((x) => x.id === id) || null;
  const picked = (spec, key) => ((spec.choices || {})[key] || []).slice();

  /** ¿Es válido el reparto +2/+1 o +1/+1/+1 entre las tres características del trasfondo? */
  function bonusProblem(bg, plus) {
    if (!bg) return 'Elige un trasfondo.';
    const entries = Object.entries(plus || {}).filter(([, v]) => v);
    if (entries.some(([k]) => !bg.abilities.includes(k))) return 'Solo puedes mejorar las tres características del trasfondo.';
    const vals = entries.map(([, v]) => v).sort().join();
    if (vals !== '1,2' && vals !== '1,1,1') return 'Reparte +2 y +1, o +1 a las tres características del trasfondo.';
    return null;
  }

  function finalAbilities(D, spec) {
    const out = {};
    for (const k of ABIL) out[k] = Math.min(20, (spec.base && spec.base[k]) + ((spec.bgPlus || {})[k] || 0));
    return out;
  }

  /** Lista de conjuros de una lista de clase hasta cierto nivel */
  function listSpells(D, list, minLevel, maxLevel) {
    return Object.entries(D.spells).filter(([, s]) => s.lists.includes(list) && s.level >= minLevel && s.level <= maxLevel).map(([id, s]) => ({ id, name: s.name, desc: s.desc, level: s.level }));
  }

  /**
   * Devuelve las elecciones pendientes, en orden, con sus opciones.
   * Cada una: { key, step, label, count, options: [{ id, name, desc, disabled }] }
   * step: origin | skills | features | magic
   */
  function creationChoices(D, spec) {
    const out = [];
    const cls = spec.cls ? byId(D.classes, spec.cls) : null;
    const bg = spec.background ? byId(D.backgrounds, spec.background) : null;
    const sp = spec.species ? byId(D.species, spec.species) : null;
    const skillName = (id) => (byId(D.skills, id) || {}).name || id;
    const prof = new Set(bg ? bg.skills : []);
    const known = new Set();
    const add = (c) => {
      const sel = picked(spec, c.key);
      out.push(c);
      return sel.filter((x) => c.options.some((o) => o.id === x && !o.disabled));
    };
    const skillOpts = (ids) => ids.map((id) => ({ id, name: skillName(id), disabled: prof.has(id) }));
    const allSkills = D.skills.map((s) => s.id);

    // ---- especie
    let lineage = null;
    if (sp) {
      if (sp.lineages && sp.lineages.length) {
        const sel = add({ key: 'sp:lineage', step: 'origin', label: sp.lineageLabel, count: 1, options: sp.lineages.map((l) => ({ id: l.id, name: l.name, desc: l.desc || (l.type ? `Daño de ${l.type}` : '') })) });
        lineage = sel[0] ? byId(sp.lineages, sel[0]) : null;
      }
      if (sp.spellAbility) add({ key: 'sp:ability', step: 'origin', label: 'Aptitud mágica de los conjuros de tu especie', count: 1, options: ['int', 'wis', 'cha'].map((k) => ({ id: k, name: byId(D.abilities, k).name })) });
      if (sp.keenSenses) {
        const sel = add({ key: 'sp:keen', step: 'skills', label: 'Sentidos agudos (elfo): una habilidad', count: 1, options: skillOpts(sp.keenSenses) });
        sel.forEach((x) => prof.add(x));
      }
      if (lineage) for (const s of Object.values(lineage.spells || {}).flat()) known.add(s);
      for (const s of sp.alwaysSpells || []) known.add(s);
      if (lineage && lineage.cantripFrom) {
        const opts = listSpells(D, lineage.cantripFrom, 0, 0).map((o) => ({ ...o, disabled: known.has(o.id) }));
        const sel = add({ key: 'sp:cantrip', step: 'magic', label: `Truco de ${lineage.name.toLowerCase()} (de la lista de mago)`, count: 1, options: opts });
        sel.forEach((x) => known.add(x));
      }
    }

    // ---- habilidades de clase
    if (cls) {
      const list = cls.skillList === 'any' ? allSkills : cls.skillList;
      const sel = add({ key: 'class:skills', step: 'skills', label: `Habilidades de ${cls.name.toLowerCase()}`, count: cls.skillChoices, options: skillOpts(list) });
      sel.forEach((x) => prof.add(x));
    }
    if (sp && sp.extraSkill) {
      const sel = add({ key: 'hu:skill', step: 'skills', label: 'Diestro (humano): una habilidad más', count: 1, options: skillOpts(allSkills) });
      sel.forEach((x) => prof.add(x));
    }

    // ---- dotes de origen (la del trasfondo y, si es humano, la de Versátil)
    const feats = [];
    if (bg) feats.push({ src: 'bg', id: bg.feat, list: bg.featList || null, label: `Dote del trasfondo: ${byId(D.feats, bg.feat).name}` });
    if (sp && sp.extraFeat) {
      const opts = D.feats.map((f) => ({ id: f.id, name: f.name, desc: f.desc, disabled: !!(bg && bg.feat === f.id && !f.repeatable) }));
      const sel = add({ key: 'hu:feat', step: 'origin', label: 'Versátil (humano): una dote de origen', count: 1, options: opts });
      if (sel[0]) feats.push({ src: 'hu', id: sel[0], list: null, label: `Dote de Versátil: ${byId(D.feats, sel[0]).name}` });
    }
    const usedLists = [];
    for (const f of feats) {
      const fd = byId(D.feats, f.id);
      if (fd.skills) {
        const sel = add({ key: `feat:${f.src}:skills`, step: 'skills', label: `${f.label}: ${fd.skills} habilidades`, count: fd.skills, options: skillOpts(allSkills) });
        sel.forEach((x) => prof.add(x));
      }
      if (fd.lists) {
        let list = f.list;
        if (!list) {
          const sel = add({ key: `feat:${f.src}:list`, step: 'magic', label: `${f.label}: lista de conjuros`, count: 1, options: fd.lists.map((l) => ({ id: l, name: D.listNames[l], disabled: usedLists.includes(l) })) });
          list = sel[0] || null;
        }
        if (list) {
          usedLists.push(list);
          add({ key: `feat:${f.src}:ability`, step: 'magic', label: `${f.label} (${D.listNames[list]}): aptitud mágica`, count: 1, options: ['int', 'wis', 'cha'].map((k) => ({ id: k, name: byId(D.abilities, k).name })) });
          const c = add({ key: `feat:${f.src}:cantrips`, step: 'magic', label: `${f.label} (${D.listNames[list]}): ${fd.cantrips} trucos`, count: fd.cantrips, options: listSpells(D, list, 0, 0).map((o) => ({ ...o, disabled: known.has(o.id) })) });
          c.forEach((x) => known.add(x));
          const s = add({ key: `feat:${f.src}:spell`, step: 'magic', label: `${f.label} (${D.listNames[list]}): un conjuro de nivel 1`, count: fd.level1, options: listSpells(D, list, 1, 1).map((o) => ({ ...o, disabled: known.has(o.id) })) });
          s.forEach((x) => known.add(x));
        }
      }
    }

    if (!cls) return out;

    // ---- opciones de clase (estilo, orden, invocaciones, metamagia, pericia…)
    const optSel = {};
    for (const o of cls.options || []) {
      const lvl = o.at > 1 ? ` (a nivel ${o.at})` : '';
      let options;
      if (o.skills === 'proficient') options = [...prof].filter((x) => !o.limit || o.limit.includes(x)).map((id) => ({ id, name: skillName(id) }));
      else if (o.skills) {
        options = skillOpts(o.skills === 'class' ? (cls.skillList === 'any' ? allSkills : cls.skillList) : allSkills);
        if (options.filter((x) => !x.disabled).length < o.count) options = skillOpts(allSkills); // ya las tiene todas: cualquiera
      }
      else options = o.from.map((x) => ({ ...x, disabled: !!(o.excludeOption && (optSel[o.excludeOption] || []).includes(x.id)) }));
      const sel = add({ key: `opt:${o.id}`, step: o.skills ? 'skills' : 'features', label: o.label + lvl, count: o.count, options, at: o.at });
      optSel[o.id] = sel;
      if (o.skills && o.skills !== 'proficient') sel.forEach((x) => prof.add(x));
      // estilos que dan trucos (Guerrero bendito / Guerrero druídico)
      const giver = sel.map((x) => byId(o.from || [], x)).find((x) => x && x.cantrips);
      if (giver) {
        const c = add({ key: `opt:${o.id}:cantrips`, step: 'magic', label: `${giver.name}: ${giver.cantrips.count} trucos de ${D.listNames[giver.cantrips.list]}`, count: giver.cantrips.count, options: listSpells(D, giver.cantrips.list, 0, 0).map((x) => ({ ...x, disabled: known.has(x.id) })), at: o.at });
        c.forEach((x) => known.add(x));
      }
    }

    // ---- conjuros de clase
    const cs = cls.caster;
    if (cs) {
      // los conjuros que la clase prepara sola a cierto nivel no se pueden elegir a partir de ese nivel
      const alwaysBy = (lvl) => Object.entries(cs.always || {}).filter(([l]) => +l <= lvl).flatMap(([, l]) => l);
      const extraCantrip = Object.values(optSel).flat().some((x) => x === 'order_thaumaturge' || x === 'order_magician') ? 1 : 0;
      if (cs.cantrips + extraCantrip) {
        const c = add({ key: 'spells:cantrips', step: 'magic', label: `Trucos de ${cls.name.toLowerCase()}`, count: cs.cantrips + extraCantrip, options: listSpells(D, cs.list, 0, 0).map((x) => ({ ...x, disabled: known.has(x.id) })) });
        c.forEach((x) => known.add(x));
      }
      const max = D.maxSpellLevel[cs.type];
      const steps = [
        { key: 'spells:1', n: cs.prepared[0], lvl: max[1], label: 'Conjuros preparados de nivel 1', at: 1 },
        { key: 'spells:2', n: cs.prepared[1] - cs.prepared[0], lvl: max[2], label: 'Al llegar a nivel 2', at: 2 },
        { key: 'spells:3', n: cs.prepared[2] - cs.prepared[1], lvl: max[3], label: `Al llegar a nivel 3${max[3] > 1 ? ' (nivel 1 o 2)' : ''}`, at: 3 },
      ];
      for (const st of steps) {
        if (st.n <= 0) continue;
        const opts = listSpells(D, cs.list, 1, st.lvl).map((x) => ({ ...x, disabled: known.has(x.id) || alwaysBy(st.at).includes(x.id) }));
        const s = add({ key: st.key, step: 'magic', label: `${st.label}: elige ${st.n}`, count: st.n, options: opts, at: st.at });
        s.forEach((x) => known.add(x));
      }
    }
    return out;
  }

  /** Comprueba todas las elecciones: devuelve el primer problema o null */
  function choicesProblem(D, spec, step = null) {
    for (const c of creationChoices(D, spec)) {
      if (step && c.step !== step) continue;
      const sel = picked(spec, c.key);
      if (new Set(sel).size !== sel.length) return `${c.label}: has repetido una opción.`;
      if (sel.some((x) => !c.options.some((o) => o.id === x && !o.disabled))) return `${c.label}: hay una opción que ya no es válida.`;
      if (sel.length !== c.count) return `${c.label}: elige ${c.count} (llevas ${sel.length}).`;
    }
    return null;
  }

  /** Quita de spec.choices lo que ya no es válido (tras cambiar de clase, trasfondo…) */
  function prune(D, spec) {
    spec.choices = spec.choices || {};
    const keys = new Set();
    for (let pass = 0; pass < 3; pass++) {
      for (const c of creationChoices(D, spec)) {
        keys.add(c.key);
        const sel = picked(spec, c.key).filter((x) => c.options.some((o) => o.id === x && !o.disabled)).slice(0, c.count);
        spec.choices[c.key] = [...new Set(sel)];
      }
    }
    for (const k of Object.keys(spec.choices)) if (!keys.has(k)) delete spec.choices[k];
    return spec;
  }

  return { creationChoices, choicesProblem, bonusProblem, finalAbilities, prune, listSpells, ABIL };
});
