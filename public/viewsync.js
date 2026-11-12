// Sincronización de la vista: el servidor solo envía lo que cambia y aquí se recompone la vista completa.
//  - Registro y chat: llegan solo las entradas nuevas (se acumulan aquí).
//  - Personajes: uno que no ha cambiado llega solo con su id; uno que ha cambiado, solo con los campos distintos.
//  - Con «_delta», las claves que no vienen se conservan y las que vienen a null se quitan.
// Lo usan el navegador (app.js) y las pruebas (test/sync.js).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ViewSync = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const KEEP = 400; // entradas de historial que se conservan en memoria

  function mergeEntries(buf, list) {
    for (const e of list) {
      const last = buf.length ? buf[buf.length - 1].id : 0;
      if (e.id > last) { buf.push(e); continue; }
      // ya la teníamos: se sustituye (puede haber ganado efectos visuales)
      for (let i = buf.length - 1; i >= 0 && buf[i].id >= e.id; i--) if (buf[i].id === e.id) { buf[i] = e; break; }
    }
    if (buf.length > KEEP) buf.splice(0, buf.length - KEEP);
  }

  function create() {
    let view = null;
    let hist = { log: [], chat: [] };
    let pcs = new Map();
    const lastId = (k) => (hist[k].length ? hist[k][hist[k].length - 1].id : 0);
    return {
      /** Aplica un mensaje del servidor y devuelve la vista completa */
      apply(d) {
        let v;
        if (d._delta && view) {
          v = { ...view };
          for (const k of Object.keys(d)) { if (d[k] === null) delete v[k]; else v[k] = d[k]; }
          delete v._delta;
        } else v = { ...d };
        if (Array.isArray(d.pcs)) {
          v.pcs = d.pcs.map((p) => {
            if (typeof p === 'string') return pcs.get(p); // sin cambios
            if (!p._patch) return p; // ficha entera
            const prev = pcs.get(p.id);
            if (!prev) return null;
            const { _patch, _del, ...changed } = p; // solo los campos que han cambiado
            const merged = { ...prev, ...changed };
            for (const k of _del || []) delete merged[k];
            return merged;
          }).filter(Boolean);
          pcs = new Map(v.pcs.map((p) => [p.id, p]));
        } else if (!v.pcs) v.pcs = [];
        for (const k of ['log', 'chat']) {
          if (Array.isArray(d[k])) mergeEntries(hist[k], d[k]);
          v[k] = hist[k];
        }
        view = v;
        return v;
      },
      /** Hasta dónde tenemos ya el historial (para pedir solo lo nuevo en el sondeo) */
      since() { return { log: lastId('log'), chat: lastId('chat') }; },
      reset() { view = null; hist = { log: [], chat: [] }; pcs = new Map(); },
    };
  }
  return { create, mergeEntries };
});
