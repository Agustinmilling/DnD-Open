// Cliente de Mesa de Dados: sin frameworks, se re-renderiza con cada actualización del servidor.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => (n >= 0 ? `+${n}` : `${n}`);
  const ABIL = { str: 'FUE', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' };
  const ABIL_FULL = { str: 'Fuerza', dex: 'Destreza', con: 'Constitución', int: 'Inteligencia', wis: 'Sabiduría', cha: 'Carisma' };
  const COST = { action: 'Acción', bonus: 'Adicional', free: 'Gratis', reaction: 'Reacción' };

  // Solo reemplaza el HTML si ha cambiado (evita perder clics durante actualizaciones)
  const setHTML = (el, html) => { if (el._html === html) return false; el._html = html; el.innerHTML = html; return true; };
  const S = { code: null, pid: null, token: null, view: null, es: null, targeting: null, lastLog: 0, lastChat: 0, sheetId: null, wasMyTurn: false };

  // ------------------------------------------------------------------ red
  async function api(path, body) {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Error de conexión');
    return data;
  }
  async function send(msg) {
    try {
      await api('/api/action', { code: S.code, pid: S.pid, token: S.token, msg });
    } catch (e) { toast(e.message); }
  }
  function toast(text, info = false) {
    const t = $('#toast');
    t.textContent = text;
    t.className = 'toast' + (info ? ' info' : '');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.add('hidden'), 3500);
  }
  const credKey = (code) => `mesa:${code}`;
  function saveCreds() { try { localStorage.setItem(credKey(S.code), JSON.stringify({ pid: S.pid, token: S.token })); localStorage.setItem('mesa:name', $('#nameInput').value.trim()); } catch {} }
  function loadCreds(code) { try { return JSON.parse(localStorage.getItem(credKey(code)) || 'null'); } catch { return null; } }

  function connect() {
    if (S.es) S.es.close();
    history.replaceState(null, '', `/?sala=${S.code}`);
    S.lastLog = 0; S.lastChat = 0;
    $('#log').innerHTML = ''; $('#chat').innerHTML = '';
    const es = new EventSource(`/api/stream?code=${S.code}&pid=${S.pid}&token=${S.token}`);
    S.es = es;
    es.onmessage = (ev) => { S.view = JSON.parse(ev.data); render(); };
    es.onerror = async () => {
      // si la sala ya no existe, volver al inicio
      try {
        const r = await fetch(`/api/check?code=${S.code}&pid=${S.pid}&token=${S.token}`);
        if (r.status === 404 || r.status === 403) { es.close(); localStorage.removeItem(credKey(S.code)); showHome('La sala ya no existe. Crea una nueva.'); }
      } catch {}
    };
  }

  // ------------------------------------------------------------------ inicio
  function showHome(err = '') {
    $('#home').classList.remove('hidden'); $('#lobby').classList.add('hidden'); $('#game').classList.add('hidden');
    $('#roomInfo').classList.add('hidden');
    $('#homeError').textContent = err;
  }
  $('#nameInput').value = (() => { try { return localStorage.getItem('mesa:name') || ''; } catch { return ''; } })();
  $('#createBtn').onclick = async () => {
    const name = $('#nameInput').value.trim();
    if (!name) return ($('#homeError').textContent = 'Escribe tu nombre');
    try {
      const r = await api('/api/room', { name });
      Object.assign(S, { code: r.code, pid: r.pid, token: r.token });
      saveCreds(); connect();
    } catch (e) { $('#homeError').textContent = e.message; }
  };
  $('#joinBtn').onclick = async () => {
    const name = $('#nameInput').value.trim();
    const code = $('#codeInput').value.trim().toUpperCase();
    if (!name) return ($('#homeError').textContent = 'Escribe tu nombre');
    if (!code) return ($('#homeError').textContent = 'Escribe el código de la sala');
    const saved = loadCreds(code);
    if (saved) { Object.assign(S, { code, ...saved }); return connect(); }
    try {
      const r = await api('/api/join', { code, name });
      Object.assign(S, { code: r.code, pid: r.pid, token: r.token });
      saveCreds(); connect();
    } catch (e) { $('#homeError').textContent = e.message; }
  };
  $('#codeInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#joinBtn').click(); });
  $('#copyLink').onclick = () => {
    const url = `${location.origin}/?sala=${S.code}`;
    navigator.clipboard?.writeText(url).then(() => toast('Enlace copiado: ' + url, true), () => toast(url, true));
  };

  // ------------------------------------------------------------------ chat y dados
  $('#chatForm').onsubmit = (e) => {
    e.preventDefault();
    const v = $('#chatInput').value.trim();
    if (!v) return;
    send({ type: 'chat', text: v });
    $('#chatInput').value = '';
  };
  $$('.dice-buttons button').forEach((b) => (b.onclick = () => {
    const n = Math.max(1, Math.min(20, +$('#diceCount').value || 1));
    const m = +$('#diceMod').value || 0;
    const die = b.dataset.die;
    const mode = die === '20' && n === 1 ? $('#diceMode').value : 'normal';
    send({ type: 'roll', expr: `${n}d${die}${m ? (m > 0 ? '+' : '') + m : ''}`, mode });
  }));

  const pinned = { log: true, chat: true };
  $('#log').addEventListener('scroll', (e) => { const b = e.target; pinned.log = b.scrollHeight - b.scrollTop - b.clientHeight < 60; });
  $('#chat').addEventListener('scroll', (e) => { const b = e.target; pinned.chat = b.scrollHeight - b.scrollTop - b.clientHeight < 60; });
  function stick() {
    if (pinned.log) $('#log').scrollTop = $('#log').scrollHeight;
    if (pinned.chat) $('#chat').scrollTop = $('#chat').scrollHeight;
  }
  function renderChat(v) {
    const box = $('#chat');
    for (const m of v.chat) {
      if (m.id <= S.lastChat) continue;
      S.lastChat = m.id;
      const div = document.createElement('div');
      div.className = 'msg';
      if (m.color) div.style.setProperty('--c', m.color);
      const who = `<span class="au">${esc(m.author)}</span>${m.char ? ` <span class="ch">(${esc(m.char)})</span>` : ''}`;
      if (m.kind === 'roll') {
        div.innerHTML = `<div class="rollcard ${m.crit ? 'crit' : ''} ${m.fumble ? 'fumble' : ''}"><span class="total">${m.total}</span>${who}<div>${esc(m.label || 'Tirada')} <span class="det">${esc(m.expr)}</span></div><div class="det">${esc(m.detail)}${m.crit ? ' · ¡20 natural!' : m.fumble ? ' · 1 natural' : ''}</div></div>`;
      } else div.innerHTML = `${who}: ${esc(m.text)}`;
      box.appendChild(div);
    }
  }

  // ------------------------------------------------------------------ render principal
  function render() {
    const v = S.view;
    if (!v) return;
    $('#home').classList.add('hidden');
    $('#roomInfo').classList.remove('hidden');
    $('#roomCode').textContent = v.code;
    const lobby = v.phase === 'lobby';
    $('#lobby').classList.toggle('hidden', !lobby);
    $('#game').classList.toggle('hidden', lobby);
    const slot = lobby ? $('#lobbyChatSlot') : $('#gameChatSlot');
    if ($('#chatBox').parentElement !== slot) slot.appendChild($('#chatBox'));
    renderChat(v);
    if (lobby) renderLobby(v); else renderGame(v);
    stick();
    if (S.sheetId && $('#sheetDialog').open) renderSheet(S.sheetId);
    const myTurn = !!(v.combat && v.you && v.combat.currentId === v.you.charId && v.combat.actions.length);
    document.title = myTurn ? '⚔️ ¡Tu turno! · Mesa de Dados' : 'Mesa de Dados';
    if (myTurn && !S.wasMyTurn) toast('¡Es tu turno!', true);
    S.wasMyTurn = myTurn;
  }

  function charCard(c, v) {
    const mine = v.you && v.you.charId === c.id;
    const btn = mine
      ? `<button class="btn small" data-release>Dejar personaje</button>`
      : c.takenBy ? `<button class="btn small" disabled>Elegido por ${esc(c.takenBy)}</button>`
      : `<button class="btn small primary" data-pick="${c.id}">Jugar con ${esc(c.name.split(' ')[0])}</button>`;
    return `<article class="char-card ${mine ? 'mine' : ''}" style="--c:${c.color}">
      <div class="portrait">${c.portrait}</div>
      <h4>${esc(c.name)}</h4>
      <div class="sub">${esc(c.race)} · ${esc(c.className)} · ${esc(c.background)}</div>
      <p>${esc(c.bio)}</p>
      <div class="row"><button class="btn small ghost" data-view="${c.id}">Ver ficha</button>${btn}</div>
    </article>`;
  }

  function bindCharButtons(root) {
    $$('[data-pick]', root).forEach((b) => (b.onclick = () => send({ type: 'pick', charId: b.dataset.pick })));
    $$('[data-release]', root).forEach((b) => (b.onclick = () => send({ type: 'release' })));
    $$('[data-view]', root).forEach((b) => (b.onclick = () => openSheet(b.dataset.view)));
  }

  function renderLobby(v) {
    $('#advTitle').textContent = v.adventure.title;
    $('#advSummary').textContent = v.adventure.summary + ' Pensada para 1 a 4 jugadores; los encuentros se ajustan al tamaño del grupo.';
    if (setHTML($('#catalog'), v.catalog.map((c) => charCard(c, v)).join(''))) bindCharButtons($('#catalog'));
    $('#playersList').innerHTML = v.players.map((p) => `<span class="pill ${p.connected ? '' : 'off'}"><span class="dot ${p.connected ? '' : 'off'}"></span>${esc(p.name)}${p.isHost ? ' 👑' : ''}${p.charId ? ' — ' + esc(v.catalog.find((c) => c.id === p.charId).name.split(' ')[0]) : ''}</span>`).join('');
    const isHost = v.you && v.you.isHost;
    $('#startBtn').classList.toggle('hidden', !isHost);
    $('#startBtn').disabled = !v.pcs.length;
    $('#startBtn').onclick = () => send({ type: 'start' });
    const host = v.players.find((p) => p.isHost);
    $('#startHint').textContent = isHost
      ? (v.pcs.length ? `Comparte el código ${v.code} (o el enlace de invitación) y pulsa Comenzar cuando estéis listos.` : 'Elige un personaje para empezar.')
      : `Esperando a que ${host ? host.name : 'el anfitrión'} comience la aventura…`;
  }

  // ------------------------------------------------------------------ partida
  function hpClass(p) { const r = p.hp / p.maxHp; return r > 0.5 ? 'hp-ok' : r > 0.25 ? 'hp-mid' : ''; }

  function pcCard(p, v) {
    const mine = v.you && v.you.charId === p.id;
    const turn = v.combat && v.combat.currentId === p.id;
    const cond = p.conditions.map((c) => `<span class="tag ${['blessed', 'shielded', 'dodging', 'hidden', 'helped', 'shield_spell'].includes(c.key) ? 'good' : 'bad'}">${esc(c.name)}</span>`).join('');
    const extra = [p.concentration ? `<span class="tag">🧠 ${esc(p.concentration)}</span>` : '', p.guidance ? '<span class="tag good">Orientación</span>' : '', p.spiritualWeapon ? '<span class="tag good">Arma espiritual</span>' : ''].join('');
    const death = p.down ? `<div class="death">${p.stable ? '<b>Estable</b>' : `Salvaciones contra muerte: <b>${'✔'.repeat(p.deathSaves.s) || '—'}</b> / <b>${'✘'.repeat(p.deathSaves.f) || '—'}</b>`}</div>` : '';
    return `<div class="pc ${mine ? 'mine' : ''} ${turn ? 'turn' : ''} ${p.down ? 'down' : ''} ${p.dead ? 'dead' : ''}" style="--c:${p.color}" data-sheet="${p.id}">
      <div class="pc-top"><span class="portrait">${p.portrait}</span>
        <div class="who"><div class="name">${esc(p.name)}</div><div class="meta">${esc(p.className)} ${p.level} · ${p.owner ? `<span class="dot ${p.connected ? '' : 'off'}"></span>${esc(p.owner)}` : '<i>sin jugador</i>'}</div></div>
        <div class="ac" title="Clase de Armadura">${p.ac}<small>CA</small></div></div>
      <div class="bar-label"><span>PG ${p.hp}/${p.maxHp}${p.tempHp ? ` (+${p.tempHp})` : ''}</span><span>${p.dead ? '☠️ Muerto' : p.down ? '🩸 Inconsciente' : ''}</span></div>
      <div class="bar ${hpClass(p)}"><i style="width:${Math.max(0, (p.hp / p.maxHp) * 100)}%"></i></div>
      <div class="bar xp" title="Experiencia: ${p.xp}${p.nextXp ? ' / ' + p.nextXp : ''} PX"><i style="width:${p.nextXp ? Math.min(100, (p.xp / p.nextXp) * 100) : 100}%"></i></div>
      ${death}${cond || extra ? `<div class="tags">${cond}${extra}</div>` : ''}
    </div>`;
  }

  function renderGame(v) {
    // grupo
    if (setHTML($('#partyList'), v.pcs.map((p) => pcCard(p, v)).join('') || '<p class="muted">Nadie en el grupo.</p>')) $$('[data-sheet]', $('#partyList')).forEach((el) => (el.onclick = () => openSheet(el.dataset.sheet)));
    // botín
    const mine = v.you && v.you.charId;
    setHTML($('#lootBox'), `<b>💰 Oro del grupo: ${v.party.gold} po</b>${v.party.loot.length ? `<ul>${v.party.loot.map((l) => `<li title="${esc(l.desc)}"><span>${esc(l.name)}${l.qty > 1 ? ' ×' + l.qty : ''}</span>${mine ? `<button class="btn small" data-take="${l.id}">Coger</button>` : ''}</li>`).join('')}</ul>` : '<div class="muted small">El botín sin repartir aparecerá aquí.</div>'}`);
    $$('[data-take]').forEach((b) => (b.onclick = () => send({ type: 'take', item: b.dataset.take })));
    // escena
    $('#sceneHeader').innerHTML = v.scene ? `<h2>${esc(v.scene.title)}</h2><span class="muted small">${v.combat ? `⚔️ Combate · Asalto ${v.combat.round}` : esc(v.adventure.title)}</span>` : '';
    renderLog(v);
    renderActionPanel(v);
  }

  function renderLog(v) {
    const box = $('#log');
    for (const e of v.log) {
      if (e.id <= S.lastLog) continue;
      S.lastLog = e.id;
      const d = document.createElement('div');
      const res = e.success === true ? 'ok' : e.success === false ? 'ko' : '';
      d.className = `entry k-${e.kind} ${e.title ? 'title' : ''} ${res} ${e.crit ? 'crit' : ''}`;
      d.textContent = e.text;
      box.appendChild(d);
    }
  }

  function actionButton(a) {
    return `<button class="btn small opt ${S.targeting && S.targeting.action.key === a.key ? 'selected' : ''}" data-act="${esc(a.key)}" title="${esc(a.desc || '')}">${esc(a.label)}${a.cost ? `<span class="cost ${a.cost}">${COST[a.cost] || ''}</span>` : ''}</button>`;
  }

  function allyChooser(v, kind) {
    let list = v.pcs.filter((p) => !p.dead);
    if (kind === 'dying') list = list.filter((p) => p.down);
    if (kind === 'allyOther') list = list.filter((p) => p.id !== v.you.charId && !p.down);
    const chosen = S.targeting.chosen;
    return list.map((p) => `<button class="btn small ${chosen.includes(p.id) ? 'selected' : ''}" data-ally="${p.id}">${p.portrait} ${esc(p.name.split(' ')[0])} (${p.hp}/${p.maxHp})</button>`).join('');
  }

  function targetingBar(v) {
    const t = S.targeting;
    if (!t) return '';
    const a = t.action;
    const multi = ['enemies3', 'allies'].includes(a.target);
    const enemyT = ['enemy', 'enemies3'].includes(a.target);
    let html = `<div class="targeting"><b>${esc(a.label)}:</b> `;
    html += enemyT ? (multi ? `elige hasta ${a.maxTargets || 3} enemigos arriba` : 'haz clic en un enemigo') : allyChooser(v, a.target);
    if (multi) html += ` <button class="btn small primary" data-confirm ${t.chosen.length ? '' : 'disabled'}>Confirmar (${t.chosen.length})</button>`;
    html += ` <button class="btn small ghost" data-cancel>Cancelar</button></div>`;
    return html;
  }

  function doAction(a, type) {
    if (['none', 'self'].includes(a.target) || !a.target) { S.targeting = null; return send({ type, key: a.key, targets: [] }); }
    S.targeting = { action: a, chosen: [], type };
    render();
  }

  function bindTargeting(v) {
    const t = S.targeting;
    if (!t) return;
    const multi = ['enemies3', 'allies'].includes(t.action.target);
    const max = t.action.maxTargets || (t.action.target === 'enemies3' ? 3 : 1);
    const pick = (id) => {
      if (!multi) { S.targeting = null; send({ type: t.type, key: t.action.key, targets: [id] }); render(); return; }
      t.chosen = t.chosen.includes(id) ? t.chosen.filter((x) => x !== id) : t.chosen.concat(id).slice(-max);
      render();
    };
    if (['enemy', 'enemies3'].includes(t.action.target)) {
      $$('.enemy:not(.dead)').forEach((el) => { el.classList.add('targetable'); if (t.chosen.includes(el.dataset.enemy)) el.classList.add('chosen'); el.onclick = () => pick(el.dataset.enemy); });
    }
    $$('[data-ally]').forEach((b) => (b.onclick = () => pick(b.dataset.ally)));
    const c = $('[data-confirm]'); if (c) c.onclick = () => { send({ type: t.type, key: t.action.key, targets: t.chosen }); S.targeting = null; render(); };
    const x = $('[data-cancel]'); if (x) x.onclick = () => { S.targeting = null; render(); };
  }

  function renderActionPanel(v) {
    const panel = $('#actionPanel');
    // si la acción que se estaba apuntando ya no está disponible, cancelar
    const avail = v.combat ? v.combat.actions : v.exploreActions;
    if (S.targeting && !avail.find((x) => x.key === S.targeting.action.key)) S.targeting = null;
    const myPc = v.you && v.pcs.find((p) => p.id === v.you.charId);
    let html = '';
    if (!myPc) {
      const free = v.catalog.filter((c) => !c.takenBy);
      html += `<h4>Estás mirando la partida</h4><div class="hint">Elige un personaje libre para unirte al grupo${v.combat ? ' cuando termine el combate' : ''}.</div><div class="opts">${free.map((c) => `<button class="btn small" data-pick="${c.id}" ${v.combat ? 'disabled' : ''}>${c.portrait} ${esc(c.name)}</button>`).join('') || '<span class="muted">No quedan personajes libres.</span>'}</div>`;
    }
    if (v.phase === 'ended') {
      html += `<h4>🏆 Fin de la aventura</h4><div class="hint">¡Enhorabuena! Podéis repartir el botín y revisar vuestras fichas.</div>`;
      if (v.you && v.you.isHost) html += `<div><button class="btn primary" data-restart>Empezar una nueva partida</button></div>`;
    } else if (v.combat) {
      const cb = v.combat;
      html += `<div class="initiative">${cb.order.map((o) => `<span class="init side-${o.side} ${o.id === cb.currentId ? 'current' : ''} ${o.dead ? 'dead' : ''}">${o.init} · ${esc(o.name)}</span>`).join('')}</div>`;
      html += `<div class="enemies">${cb.enemies.map((e) => `<div class="enemy ${e.dead ? 'dead' : ''} ${e.id === cb.currentId ? 'current' : ''}" data-enemy="${e.id}" title="CA ${e.ac} · ${esc(e.mtype)} · VD ${e.cr}">
        <div class="ename"><span>${esc(e.name)}</span><span class="muted">CA ${e.ac}</span></div>
        <div class="bar ${e.hpPct > 0.5 ? 'hp-ok' : e.hpPct > 0.25 ? 'hp-mid' : ''}"><i style="width:${e.hpPct * 100}%"></i></div>
        <div class="estat">${esc(e.status)}${e.conditions.length ? ' · ' + e.conditions.map(esc).join(', ') : ''}</div></div>`).join('')}</div>`;
      if (cb.actions.length) {
        const ts = cb.turnState;
        html += `<h4>Tu turno — ${esc(myPc.name)}</h4><div class="economy"><span class="${ts.action > 0 ? '' : 'used'}">Acción${ts.action > 1 ? ' ×' + ts.action : ''}</span><span class="${ts.bonus > 0 ? '' : 'used'}">Acción adicional</span></div>`;
        html += targetingBar(v);
        const groups = {};
        for (const a of cb.actions) (groups[a.group] = groups[a.group] || []).push(a);
        html += `<div class="actions-grid">${Object.entries(groups).map(([g, list]) => `<div class="group"><span>${esc(g)}</span>${list.map(actionButton).join('')}</div>`).join('')}</div>`;
      } else {
        const cur = cb.order.find((o) => o.id === cb.currentId);
        html += `<div class="hint">${cur ? (cur.side === 'enemy' ? `⏳ ${esc(cur.name)} está actuando…` : `⏳ Turno de ${esc(cur.name)}…`) : ''}</div>`;
      }
    } else if (v.scene) {
      const sc = v.scene;
      if (sc.checks.length) {
        html += `<h4>¿Qué hacéis? (lo intenta quien pulse; las pruebas de grupo las tiran todos)</h4><div class="opts">${sc.checks.map((c) => `<button class="btn small opt ${c.done ? 'done' : ''}" data-check="${c.id}" ${c.done || (c.triedByMe && !c.group) || !myPc ? 'disabled' : ''}>${c.done ? (c.result === 'success' ? '✔ ' : '✘ ') : c.group ? '👥 ' : '🎲 '}${esc(c.label)}</button>`).join('')}</div>`;
      }
      if (v.exploreActions.length || sc.shortRest) {
        html += `<h4>Tu personaje</h4>` + targetingBar(v) + `<div class="opts">${sc.shortRest ? `<button class="btn small" data-rest>🏕️ Descanso corto (todo el grupo)</button>` : ''}${v.exploreActions.map(actionButton).join('')}</div>`;
      }
      if (sc.exits.length) {
        html += `<h4>Decidid el siguiente paso (votación: mayoría de ${sc.voters})</h4><div class="opts">${sc.exits.map((e) => `<button class="btn ${e.enabled ? 'primary' : ''} opt ${e.myVote ? 'selected' : ''}" data-exit="${e.idx}" ${e.enabled && myPc ? '' : 'disabled'} title="${e.enabled ? '' : 'Aún no podéis ir por aquí'}">${esc(e.label)}<span class="votes">${e.votes.length ? 'Votos: ' + e.votes.map(esc).join(', ') : e.enabled ? '' : '🔒 Superad antes el obstáculo'}</span></button>`).join('')}</div>`;
      }
    }
    const actionList = v.combat ? v.combat.actions : v.exploreActions;
    if (!setHTML(panel, html)) return;
    bindCharButtons(panel);
    $$('[data-check]', panel).forEach((b) => (b.onclick = () => send({ type: 'check', checkId: b.dataset.check })));
    $$('[data-exit]', panel).forEach((b) => (b.onclick = () => send({ type: 'vote', exit: +b.dataset.exit })));
    $$('[data-rest]', panel).forEach((b) => (b.onclick = () => send({ type: 'rest' })));
    $$('[data-restart]', panel).forEach((b) => (b.onclick = () => { if (confirm('¿Empezar de nuevo? Los personajes vuelven a nivel 1.')) send({ type: 'restart' }); }));
    $$('[data-act]', panel).forEach((b) => (b.onclick = () => {
      const a = actionList.find((x) => x.key === b.dataset.act);
      if (a) doAction(a, v.combat ? 'act' : 'explore');
    }));
    bindTargeting(v);
  }

  // ------------------------------------------------------------------ ficha
  let glossaryCache = null;
  async function glossary() {
    if (!glossaryCache) glossaryCache = await fetch('/api/glossary').then((r) => r.json());
    return glossaryCache;
  }
  function openSheet(id) {
    S.sheetId = id;
    renderSheet(id);
    const d = $('#sheetDialog');
    if (!d.open) { d.showModal(); d.scrollTop = 0; requestAnimationFrame(() => (d.scrollTop = 0)); }
  }
  $('#sheetDialog').addEventListener('close', () => { S.sheetId = null; });

  async function renderSheet(id) {
    const v = S.view;
    let p = v.pcs.find((x) => x.id === id);
    const body = $('#sheetBody');
    if (!p) {
      // vista previa desde el lobby (aún no está en el grupo)
      const c = v.catalog.find((x) => x.id === id);
      body.innerHTML = `<div class="sheet"><div class="full head"><span class="portrait">${c.portrait}</span><div><h2>${esc(c.name)}</h2><div class="sub">${esc(c.race)} · ${esc(c.className)} · ${esc(c.subclass)} · Trasfondo: ${esc(c.background)}</div></div></div><p class="full bio">${esc(c.bio)}</p><p class="full hint">Elige este personaje para ver su ficha completa.</p></div>`;
      return;
    }
    const mine = v.you && v.you.charId === p.id;
    const g = await glossary().catch(() => null);
    const spellDesc = (sid) => (g ? (g.spells.find((s) => s.id === sid) || {}).desc : '') || '';
    const stats = Object.entries(p.abilities).map(([k, a]) => `<div class="stat" data-roll="ability:${k}" title="Prueba de ${ABIL_FULL[k]}"><div class="lbl">${ABIL[k]}</div><div class="mod">${fmt(a.mod)}</div><div class="score">${a.score}</div></div>`).join('');
    const saves = Object.entries(p.abilities).map(([k, a]) => `<li class="${a.saveProf ? 'p' : 'np'}" data-roll="save:${k}"><span>${ABIL_FULL[k]}</span><b>${fmt(a.save)}</b></li>`).join('');
    const skills = p.skills.map((s) => `<li class="${s.expertise ? 'p e' : s.prof ? 'p' : 'np'}" data-roll="skill:${s.key}"><span>${esc(s.name)} <span class="hint">(${ABIL[s.ability]})</span></span><b>${fmt(s.mod)}</b></li>`).join('');
    const weapons = p.weapons.map((w) => `<li>⚔️ <b>${esc(w.name)}</b>: ${fmt(w.toHit)} al ataque, ${esc(w.dmg)} ${esc(w.type)}</li>`).join('');
    const sc = p.spellcasting;
    const spells = sc ? `<h3>Conjuros</h3><div class="hint">CD de salvación ${sc.dc} · Ataque de conjuro ${fmt(sc.attack)}</div>
      <div class="slots">${sc.slots.map((s) => `<span>Nv ${s.level}: ${Array.from({ length: s.max }, (_, i) => `<span class="slot-pip ${i < s.cur ? 'full' : ''}"></span>`).join('')}</span>`).join('')}</div>
      ${[0, 1, 2].map((lvl) => { const l = sc.spells.filter((s) => s.level === lvl); return l.length ? `<div class="feature"><b>${lvl === 0 ? 'Trucos' : 'Nivel ' + lvl}:</b> ${l.map((s) => `<span title="${esc(spellDesc(s.id))}" style="border-bottom:1px dotted">${esc(s.name)}</span>`).join(', ')}</div>` : ''; }).join('')}` : '';
    const feats = p.features.map((f) => `<div class="feature"><b>${esc(f.name)}</b> <span class="src">${esc(f.source)}</span><br>${esc(f.desc)}</div>`).join('');
    const inv = p.inventory.map((i) => `<li title="${esc(i.desc)}">${i.magic ? '✨ ' : '• '}${esc(i.name)}${i.qty > 1 ? ' ×' + i.qty : ''}</li>`).join('');
    body.innerHTML = `<div class="sheet">
      <div class="full head"><span class="portrait">${p.portrait}</span><div><h2>${esc(p.name)}</h2>
        <div class="sub">${esc(p.race)} · ${esc(p.className)} de nivel ${p.level} · ${esc(p.subclass)} · Trasfondo: ${esc(p.background)}${p.owner ? ' · Jugador: ' + esc(p.owner) : ''}</div></div></div>
      <div class="full kv"><div>PG <b>${p.hp}/${p.maxHp}</b></div><div>CA <b>${p.ac}</b> <span class="hint">${esc(p.armor)}</span></div><div>Competencia <b>${fmt(p.prof)}</b></div><div>Percepción pasiva <b>${p.passivePerception}</b></div><div>Dados de golpe <b>${esc(p.hitDice)}</b></div><div>PX <b>${p.xp}</b>${p.nextXp ? ` / ${p.nextXp}` : ' (máx.)'}</div></div>
      ${mine ? '<div class="full hint">Haz clic en una característica, salvación o habilidad para tirarla en el chat (usa el selector Normal/Ventaja del panel de dados).</div>' : ''}
      <div class="full stats-row">${stats}</div>
      <div><h3>Tiradas de salvación</h3><ul class="saves">${saves}</ul><h3 style="margin-top:12px">Ataques</h3><ul>${weapons}</ul>${spells ? '<div style="margin-top:12px">' + spells + '</div>' : ''}</div>
      <div><h3>Habilidades</h3><ul class="skills">${skills}</ul></div>
      <div><h3>Rasgos y pasivas</h3>${feats}</div>
      <div><h3>Equipo</h3><ul>${inv}</ul><h3 style="margin-top:12px">Historia</h3><p class="bio">${esc(p.bio)}</p></div>
    </div>`;
    if (mine) {
      $$('[data-roll]', body).forEach((el) => (el.onclick = () => {
        const [kind, key] = el.dataset.roll.split(':');
        send({ type: 'roll', sheet: { kind, key }, mode: $('#diceMode').value });
        toast('Tirada enviada al chat', true);
      }));
    } else $$('[data-roll]', body).forEach((el) => (el.style.cursor = 'default'));
  }

  // ------------------------------------------------------------------ pestañas móviles
  $$('.mobile-tabs button').forEach((b) => (b.onclick = () => {
    $$('.mobile-tabs button').forEach((x) => x.classList.toggle('active', x === b));
    $$('#game .col').forEach((c) => c.classList.toggle('active', c.dataset.col === b.dataset.tab));
    pinned.log = true; pinned.chat = true; stick();
  }));

  // ------------------------------------------------------------------ arranque
  const params = new URLSearchParams(location.search);
  const sala = (params.get('sala') || '').toUpperCase();
  if (sala) {
    $('#codeInput').value = sala;
    const saved = loadCreds(sala);
    if (saved) { Object.assign(S, { code: sala, ...saved }); connect(); }
    else { showHome(); $('#nameInput').focus(); }
  } else showHome();
})();
