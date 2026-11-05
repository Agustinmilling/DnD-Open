// Cliente de Mesa de Dados: sin frameworks. Cada actualización del servidor trae una vista completa;
// las tarjetas del grupo y de los enemigos se actualizan en su sitio para que las barras se animen,
// y los efectos (fx) del registro se reproducen como animaciones.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => (n >= 0 ? `+${n}` : `${n}`);
  const ABIL = { str: 'FUE', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' };
  const ABIL_FULL = { str: 'Fuerza', dex: 'Destreza', con: 'Constitución', int: 'Inteligencia', wis: 'Sabiduría', cha: 'Carisma' };
  const COST = { action: 'Acción', bonus: 'Adicional', free: 'Gratis', reaction: 'Reacción' };
  const GROUP_KIND = { Atacar: 'attack', Conjuros: 'spell', Rasgos: 'feat', Objetos: 'item' };
  const MONSTER_ICON = {
    goblin: '👺', wolf: '🐺', skeleton: '🦴', zombie: '🧟', giant_rat: '🐀', ghoul: '💀', bugbear: '👹',
    bandit: '🗡️', thug: '🥊', bandit_captain: '🏴‍☠️', cultist: '🕯️', cult_fanatic: '🔱', kobold: '🦎', orc: '🐗', hobgoblin: '🪖',
    guard: '💂', spy: '🕵️', veteran: '🎖️', sahuagin: '🦈', giant_spider: '🕷️', stirge: '🦟', dire_wolf: '🐺', ogre: '🧌',
    merrow: '🧜', giant_crab: '🦀', shadow: '👤', specter: '👻', ghast: '☠️', animated_armor: '🛡️',
  };
  const TONE = { good: 'Final feliz', mixed: 'Final agridulce', bad: 'Final oscuro' };
  const STAT_LABELS = { ataque: 'Ataque', defensa: 'Defensa', magia: 'Magia', apoyo: 'Apoyo', sigilo: 'Sigilo' };
  const GOOD_CONDS = ['blessed', 'shielded', 'dodging', 'hidden', 'helped', 'shield_spell'];

  // Solo reemplaza el HTML si ha cambiado (evita perder clics durante actualizaciones)
  const setHTML = (el, html) => { if (el._html === html) return false; el._html = html; el.innerHTML = html; return true; };
  const S = {
    code: null, pid: null, token: null, view: null, es: null, targeting: null,
    lastLog: 0, lastChat: 0, sheetId: null, wasMyTurn: false,
    fxDone: new Map(), fxReady: false, fxClock: 0, art: null, afterScene: false, bfTimer: 0,
  };

  // ------------------------------------------------------------------ animaciones on/off
  const motionKey = 'mesa:motion';
  function applyMotion(on) {
    document.documentElement.classList.toggle('no-motion', !on);
    $('#motionToggle').classList.toggle('off', !on);
    $('#motionToggle').setAttribute('aria-pressed', String(on));
    // reiniciar partículas activas con la nueva preferencia
    for (const c of $$('canvas.ambient-canvas, canvas.scene-particles')) if (c._kind) { const k = c._kind; c._kind = null; ambient(c, k); }
  }
  let motionOn = (() => {
    try { const s = localStorage.getItem(motionKey); if (s) return s === 'on'; } catch {}
    return !matchMedia('(prefers-reduced-motion: reduce)').matches;
  })();
  $('#motionToggle').onclick = () => {
    motionOn = !motionOn;
    try { localStorage.setItem(motionKey, motionOn ? 'on' : 'off'); } catch {}
    applyMotion(motionOn);
    toast(motionOn ? 'Animaciones activadas' : 'Animaciones desactivadas', true);
  };

  /** Partículas de ambiente en un canvas (solo si es visible). kind=null las detiene. */
  function ambient(canvas, kind, force = false) {
    if (!canvas) return;
    if (!kind || !canvas.offsetParent) { if (canvas._stop) canvas._stop(); canvas._kind = null; return; }
    if (canvas._kind === kind && !force) return;
    canvas._kind = kind;
    FX.particles(canvas, kind);
  }

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
      return true;
    } catch (e) { toast(e.message); return false; }
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

  // Tiempo real: primero SSE. Si en unos segundos no llega nada (algunos túneles y proxies retienen SSE),
  // se pasa a sondeo largo (/api/poll), que funciona en cualquier red. La pestaña recuerda qué modo funcionó.
  let liveGen = 0;
  const POLL_KEY = 'mesa:poll';
  function connect() {
    if (S.es) { S.es.close(); S.es = null; }
    const gen = ++liveGen;
    history.replaceState(null, '', `/?sala=${S.code}`);
    Object.assign(S, { lastLog: 0, lastChat: 0, fxReady: false, art: null, afterScene: false });
    S.fxDone.clear();
    $('#log').innerHTML = ''; $('#chat').innerHTML = '';
    let usePoll = false;
    try { usePoll = sessionStorage.getItem(POLL_KEY) === '1'; } catch {}
    if (usePoll) return pollLoop(gen);
    const es = new EventSource(`/api/stream?code=${S.code}&pid=${S.pid}&token=${S.token}`);
    S.es = es;
    let got = false;
    const fallback = setTimeout(() => {
      if (got || gen !== liveGen) return;
      es.close(); S.es = null;
      try { sessionStorage.setItem(POLL_KEY, '1'); } catch {}
      pollLoop(gen);
    }, 4000);
    es.onmessage = (ev) => { got = true; clearTimeout(fallback); S.view = JSON.parse(ev.data); render(); };
    es.onerror = async () => {
      // si la sala ya no existe, volver al inicio
      try {
        const r = await fetch(`/api/check?code=${S.code}&pid=${S.pid}&token=${S.token}`);
        if (r.status === 404 || r.status === 403) { clearTimeout(fallback); es.close(); roomGone(); }
      } catch {}
    };
  }
  function roomGone() {
    liveGen++;
    try { localStorage.removeItem(credKey(S.code)); } catch {}
    showHome('La sala ya no existe. Crea una nueva.');
  }
  async function pollLoop(gen) {
    let v = -1;
    while (gen === liveGen) {
      try {
        const r = await fetch(`/api/poll?code=${S.code}&pid=${S.pid}&token=${S.token}&v=${v}`, { cache: 'no-store' });
        if (gen !== liveGen) return;
        if (r.status === 404 || r.status === 403) return roomGone();
        if (!r.ok) { await new Promise((ok) => setTimeout(ok, 2000)); continue; }
        const d = await r.json();
        if (gen !== liveGen) return;
        v = d.v;
        if (d.view) { S.view = d.view; render(); }
      } catch {
        await new Promise((ok) => setTimeout(ok, 2000));
      }
    }
  }

  // ------------------------------------------------------------------ inicio
  function showScreen(id) {
    for (const s of ['home', 'lobby', 'game']) $('#' + s).classList.toggle('hidden', s !== id);
    ambient($('#homeEmbers'), id === 'home' ? 'embers' : null);
    ambient($('#lobbyEmbers'), id === 'lobby' ? 'embers' : null);
    if (id !== 'game') ambient($('#sceneParticles'), null);
  }
  function showHome(err = '') {
    showScreen('home');
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
  $('#nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#createBtn').click(); });
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
      } else if (m.kind === 'system') {
        div.className = 'msg muted small';
        div.textContent = m.text;
      } else div.innerHTML = `${who}: ${esc(m.text)}`;
      box.appendChild(div);
    }
  }

  // ------------------------------------------------------------------ render principal
  function render() {
    const v = S.view;
    if (!v) return;
    $('#roomInfo').classList.remove('hidden');
    $('#roomCode').textContent = v.code;
    const lobby = v.phase === 'lobby';
    const screen = lobby ? 'lobby' : 'game';
    if ($('#' + screen).classList.contains('hidden')) showScreen(screen);
    const slot = lobby ? $('#lobbyChatSlot') : $('#gameChatSlot');
    if ($('#chatBox').parentElement !== slot) slot.appendChild($('#chatBox'));
    renderChat(v);
    if (lobby) renderLobby(v); else renderGame(v);
    stick();
    processFx(v);
    if (S.sheetId && $('#sheetDialog').open) renderSheet(S.sheetId);
    const myTurn = !!(v.combat && v.you && v.combat.currentId === v.you.charId && v.combat.actions.length);
    document.title = myTurn ? '⚔️ ¡Tu turno! · Mesa de Dados' : 'Mesa de Dados';
    if (myTurn && !S.wasMyTurn && FX.reduced()) toast('¡Es tu turno!', true);
    S.wasMyTurn = myTurn;
  }

  // ------------------------------------------------------------------ lobby
  function statBars(stats) {
    if (!stats) return '';
    return `<div class="stat-bars">${Object.entries(STAT_LABELS).map(([k, lbl]) => `<span>${lbl}</span><span class="pips" aria-label="${lbl}: ${stats[k] || 0} de 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= (stats[k] || 0) ? 'on' : ''}"></i>`).join('')}</span>`).join('')}</div>`;
  }
  function charCard(c, v) {
    const mine = v.you && v.you.charId === c.id;
    const btn = mine
      ? `<button class="btn small" data-release>Dejar personaje</button>`
      : c.takenBy ? `<button class="btn small" disabled>Elegido por ${esc(c.takenBy)}</button>`
      : `<button class="btn small primary" data-pick="${c.id}">Jugar con ${esc(c.name.split(' ')[0])}</button>`;
    return `<article class="char-card ${mine ? 'mine' : ''} ${c.takenBy ? 'taken' : ''} ${c.custom ? 'custom' : ''}" style="--c:${c.color}">
      ${c.custom ? `<span class="custom-badge">${c.mine ? '✦ Tu creación' : '✦ Creado en la sala'}</span>` : ''}
      <div class="char-head"><span class="medallion">${esc(c.portrait)}</span>
        <div><h4>${esc(c.name)}</h4><div class="sub">${esc(c.race)} · ${esc(c.className)}</div></div></div>
      ${c.role ? `<div class="role">${esc(c.role)}</div>` : ''}
      <div class="quick-stats"><span>❤️ PG <b>${c.hp}</b></span><span>🛡️ CA <b>${c.ac}</b></span><span>${esc(c.background)}</span></div>
      ${statBars(c.stats)}
      <p>${esc(c.bio)}</p>
      <div class="row"><button class="btn small ghost" data-view="${c.id}">Ver ficha</button>${btn}${c.custom && (c.mine || (v.you && v.you.isHost)) && v.phase === 'lobby' ? `<button class="btn small ghost danger" data-del="${c.id}" title="Borrar personaje" aria-label="Borrar ${esc(c.name)}">🗑</button>` : ''}</div>
    </article>`;
  }

  function bindCharButtons(root) {
    $$('[data-pick]', root).forEach((b) => (b.onclick = () => send({ type: 'pick', charId: b.dataset.pick })));
    $$('[data-release]', root).forEach((b) => (b.onclick = () => send({ type: 'release' })));
    $$('[data-view]', root).forEach((b) => (b.onclick = () => openSheet(b.dataset.view)));
    $$('[data-del]', root).forEach((b) => (b.onclick = () => { if (confirm('¿Borrar este personaje? No se puede deshacer.')) send({ type: 'deleteChar', charId: b.dataset.del }); }));
  }

  function renderLobby(v) {
    const adv = v.adventure;
    if (S.lobbyArt !== adv.art) { S.lobbyArt = adv.art; const la = $('#lobbyArt'); la.innerHTML = FX.sceneArt(adv.art); la.classList.remove('entering'); void la.offsetWidth; la.classList.add('entering'); }
    ambient($('#lobbyEmbers'), 'embers');
    $('#advTitle').textContent = adv.title;
    $('#advSummary').textContent = adv.summary;
    $('#advEyebrow').textContent = ['Para 1–4 jugadores · niveles 1 a 3', adv.length, adv.endings > 1 ? `${adv.endings} finales` : ''].filter(Boolean).join(' · ');
    const hostNow = v.you && v.you.isHost;
    if (setHTML($('#advList'), v.adventures.map((a) => `<button class="adv-card ${a.id === adv.id ? 'active' : ''}" data-adv="${a.id}" ${hostNow ? '' : 'disabled'} aria-pressed="${a.id === adv.id}">
        <span class="adv-art" data-art="${a.art}"></span>
        <span class="adv-body"><b>${esc(a.title)}</b><span class="adv-tags">${a.tags.map((t) => `<i>${esc(t)}</i>`).join('')}</span><small>${esc(a.length)}${a.endings > 1 ? ` · ${a.endings} finales` : ''}</small></span>
        ${a.id === adv.id ? '<span class="adv-check">✔</span>' : ''}
      </button>`).join(''))) {
      $$('.adv-art', $('#advList')).forEach((el) => (el.innerHTML = FX.sceneArt(el.dataset.art)));
      $$('[data-adv]', $('#advList')).forEach((b) => (b.onclick = () => send({ type: 'adventure', id: b.dataset.adv })));
    }
    $('#createCharBtn').onclick = () => openCreator();
    $('#randomCharBtn').onclick = () => send({ type: 'create', spec: 'random' });
    if (setHTML($('#catalog'), v.catalog.map((c) => charCard(c, v)).join(''))) bindCharButtons($('#catalog'));
    setHTML($('#playersList'), v.players.map((p) => {
      const c = p.charId && v.catalog.find((x) => x.id === p.charId);
      return `<span class="pill ${p.connected ? '' : 'off'}"${c ? ` style="border-color:${c.color}"` : ''}><span class="dot ${p.connected ? '' : 'off'}"></span>${esc(p.name)}${p.isHost ? ' 👑' : ''}${c ? ` · ${c.portrait} ${esc(c.name.split(' ')[0])}` : ''}</span>`;
    }).join(''));
    const isHost = v.you && v.you.isHost;
    $('#startBtn').classList.toggle('hidden', !isHost);
    $('#startBtn').disabled = !v.pcs.length;
    $('#startBtn').onclick = () => send({ type: 'start' });
    const host = v.players.find((p) => p.isHost);
    $('#startHint').textContent = isHost
      ? (v.pcs.length ? `Comparte el código ${v.code} (o el enlace de invitación) y pulsa Comenzar cuando estéis listos. Los encuentros se ajustan al tamaño del grupo.` : 'Elige o crea un personaje para empezar.')
      : `Esperando a que ${host ? host.name : 'el anfitrión'} elija la aventura y la comience…`;
  }

  // ------------------------------------------------------------------ partida: grupo
  const hpClass = (r) => (r > 0.5 ? 'hp-ok' : r > 0.25 ? 'hp-mid' : '');
  const pct = (x) => `${Math.max(0, Math.min(100, x * 100)).toFixed(1)}%`;

  /** Barra de PG con rastro "fantasma" y PG temporales. Se crea una vez y se actualiza. */
  function hpBar(el, ratio, tempRatio = 0) {
    if (!el._parts) {
      el.innerHTML = '<i class="ghost"></i><i class="fill"></i><i class="temp"></i>';
      el._parts = { ghost: el.children[0], fill: el.children[1], temp: el.children[2] };
    }
    const { ghost, fill, temp } = el._parts;
    el.classList.remove('hp-ok', 'hp-mid');
    const cls = hpClass(ratio);
    if (cls) el.classList.add(cls);
    fill.style.width = pct(ratio);
    ghost.style.width = pct(ratio);
    temp.style.left = pct(ratio);
    temp.style.width = pct(Math.min(tempRatio, 1 - Math.max(0, ratio)));
  }

  function pcTags(p) {
    const cond = p.conditions.map((c) => `<span class="tag ${GOOD_CONDS.includes(c.key) ? 'good' : 'bad'}">${esc(c.name)}</span>`).join('');
    const extra = [p.concentration ? `<span class="tag">🧠 ${esc(p.concentration)}</span>` : '', p.guidance ? '<span class="tag good">Orientación</span>' : '', p.spiritualWeapon ? '<span class="tag good">Arma espiritual</span>' : ''].join('');
    const pips = (n, cls) => `<span class="ds ${cls}">${[0, 1, 2].map((i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
    const death = p.down ? `<div class="death">${p.stable ? '<b>Estable</b>' : `Salvaciones contra muerte ${pips(p.deathSaves.s, 's')} ${pips(p.deathSaves.f, 'f')}`}</div>` : '';
    return death + (cond || extra ? `<div class="tags">${cond}${extra}</div>` : '');
  }

  function renderParty(v) {
    const list = $('#partyList');
    if (!v.pcs.length) { setHTML(list, '<p class="muted">Nadie en el grupo.</p>'); return; }
    if (list._html) { list._html = null; list.innerHTML = ''; }
    const keep = new Set();
    v.pcs.forEach((p, i) => {
      keep.add(p.id);
      let el = list.querySelector(`.pc[data-id="${p.id}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = 'pc';
        el.dataset.id = p.id;
        el.tabIndex = 0;
        el.innerHTML = '<div class="pc-top"></div><div class="bar-label"></div><div class="bar hp"></div><div class="bar xp"><i></i></div><div class="pc-extra"></div>';
        el.onclick = () => openSheet(p.id);
        el.onkeydown = (e) => { if (e.key === 'Enter') openSheet(p.id); };
      }
      if (list.children[i] !== el) list.insertBefore(el, list.children[i] || null);
      const mine = v.you && v.you.charId === p.id;
      el.style.setProperty('--c', p.color);
      el.classList.toggle('mine', !!mine);
      el.classList.toggle('turn', !!(v.combat && v.combat.currentId === p.id));
      el.classList.toggle('down', p.down);
      el.classList.toggle('dead', p.dead);
      setHTML(el.children[0], `<span class="medallion sm">${p.portrait}</span>
        <div class="who"><div class="name">${esc(p.name)}</div><div class="meta">${esc(p.className)} ${p.level} · ${p.owner ? `<span class="dot ${p.connected ? '' : 'off'}"></span>${esc(p.owner)}` : '<i>sin jugador</i>'}</div></div>
        <div class="ac" title="Clase de Armadura">${p.ac}<small>CA</small></div>`);
      setHTML(el.children[1], `<span>PG <b>${p.hp}/${p.maxHp}</b>${p.tempHp ? ` <span style="color:var(--blue)">+${p.tempHp}</span>` : ''}</span><span>${p.dead ? '☠️ Muerto' : p.down ? '🩸 Inconsciente' : mine ? 'Tú' : ''}</span>`);
      hpBar(el.children[2], p.hp / p.maxHp, (p.tempHp || 0) / p.maxHp);
      const xp = el.children[3];
      xp.title = `Experiencia: ${p.xp}${p.nextXp ? ' / ' + p.nextXp : ''} PX`;
      xp.firstChild.style.width = p.nextXp ? pct(p.xp / p.nextXp) : '100%';
      setHTML(el.children[4], pcTags(p));
    });
    for (const el of $$('.pc', list)) if (!keep.has(el.dataset.id)) el.remove();

    // diario de pistas y decisiones
    const jb = $('#journalBox');
    jb.classList.toggle('hidden', !v.journal.length);
    if (setHTML(jb, `<h3 class="col-title">📜 Diario</h3><ul>${v.journal.map((j, i) => `<li style="animation-delay:${Math.min(i, 6) * 0.04}s">${esc(j)}</li>`).join('')}</ul>`)) {
      const last = jb.querySelector('li:last-child');
      if (last && S.journalN !== undefined && v.journal.length > S.journalN) last.classList.add('new');
    }
    S.journalN = v.journal.length;

    // botín
    const mine = v.you && v.you.charId && v.pcs.some((p) => p.id === v.you.charId);
    if (setHTML($('#lootBox'), `<div class="gold">💰 ${v.party.gold} po <span class="muted small" style="font-family:var(--sans)">del grupo</span></div>${v.party.loot.length ? `<ul>${v.party.loot.map((l) => `<li title="${esc(l.desc)}"><span>${esc(l.name)}${l.qty > 1 ? ' ×' + l.qty : ''}</span>${mine ? `<button class="btn small" data-take="${l.id}">Coger</button>` : ''}</li>`).join('')}</ul>` : '<div class="muted small">El botín sin repartir aparecerá aquí.</div>'}`)) {
      $$('[data-take]', $('#lootBox')).forEach((b) => (b.onclick = () => send({ type: 'take', item: b.dataset.take })));
    }
  }

  // ------------------------------------------------------------------ partida: escena y combate
  function renderBanner(v) {
    const banner = $('#sceneBanner');
    const sc = v.scene;
    if (sc && sc.art !== S.art) {
      S.art = sc.art;
      const art = $('#sceneArt');
      art.innerHTML = FX.sceneArt(sc.art);
      art.classList.remove('entering'); void art.offsetWidth; art.classList.add('entering');
      ambient($('#sceneParticles'), FX.PARTICLES[sc.art] || 'dust', true);
    } else if (sc && !$('#sceneParticles')._kind) ambient($('#sceneParticles'), FX.PARTICLES[sc.art] || 'dust');
    $('#sceneTitle').textContent = sc ? sc.title : '';
    $('#sceneSub').textContent = v.phase === 'ended' ? '🏆 Fin de la aventura' : v.combat ? `⚔️ Combate · Asalto ${v.combat.round}` : sc && sc.encounter ? '⚠️ Encuentro' : v.adventure.title;

    const cb = v.combat;
    if (cb) {
      clearTimeout(S.bfTimer); S.bfTimer = 0;
      if (!banner.classList.contains('combat')) {
        banner.classList.add('combat');
        setTimeout(() => ambient($('#sceneParticles'), FX.PARTICLES[S.art] || 'dust', true), 650); // el lienzo cambia de tamaño
      }
      const pcById = Object.fromEntries(v.pcs.map((p) => [p.id, p]));
      const enById = Object.fromEntries(cb.enemies.map((e) => [e.id, e]));
      setHTML($('#initiative'), cb.order.map((o) => {
        const icon = o.side === 'pc' ? (o.portrait || (pcById[o.id] || {}).portrait || '🙂') : MONSTER_ICON[o.type || (enById[o.id] || {}).type] || '👾';
        return `<span class="init side-${o.side} ${o.id === cb.currentId ? 'current' : ''} ${o.dead ? 'dead' : ''}" data-id="${esc(o.id)}" title="Iniciativa ${o.init}"><span class="tok">${icon}</span>${esc(o.name)}<small class="muted">${o.init}</small></span>`;
      }).join(''));
      const cur = $('#initiative .current');
      if (cur) { const box = $('#initiative'); box.scrollLeft = Math.max(0, cur.offsetLeft - box.clientWidth / 2 + cur.offsetWidth / 2); }
      renderEnemies(v);
    } else if (banner.classList.contains('combat') && !S.bfTimer) {
      // dejar que terminen las animaciones de la última muerte antes de recoger el campo
      S.bfTimer = setTimeout(() => {
        S.bfTimer = 0;
        if (S.view && S.view.combat) return;
        banner.classList.remove('combat');
        $('#battlefield').innerHTML = ''; setHTML($('#initiative'), '');
        setTimeout(() => ambient($('#sceneParticles'), FX.PARTICLES[S.art] || 'dust', true), 650);
      }, 1600);
    }
  }

  function renderEnemies(v) {
    const cb = v.combat;
    const bf = $('#battlefield');
    const t = S.targeting;
    const targetingEnemies = t && ['enemy', 'enemies3'].includes(t.action.target);
    const keep = new Set();
    cb.enemies.forEach((e, i) => {
      keep.add(e.id);
      let el = bf.querySelector(`.enemy[data-enemy="${e.id}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = 'enemy';
        el.dataset.enemy = e.id;
        el.style.animationDelay = `${i * 0.08}s`;
        el.innerHTML = `<span class="eac"></span><span class="etok">${MONSTER_ICON[e.type] || '👾'}</span><div class="ename"></div><div class="bar"></div><div class="estat"></div>`;
        el.onclick = () => { if (S.onEnemy) S.onEnemy(e.id); };
        bf.appendChild(el);
      }
      el.title = `${e.name} · CA ${e.ac} · ${e.mtype} · VD ${e.cr}`;
      el.children[0].textContent = `CA ${e.ac}`;
      el.children[2].textContent = e.name;
      hpBar(el.children[3], e.hpPct);
      el.children[4].textContent = e.status + (e.conditions.length ? ' · ' + e.conditions.join(', ') : '');
      el.classList.toggle('dead', e.dead);
      el.classList.toggle('current', e.id === cb.currentId);
      el.classList.toggle('targetable', !!targetingEnemies && !e.dead);
      el.classList.toggle('chosen', !!targetingEnemies && t.chosen.includes(e.id));
    });
    for (const el of $$('.enemy', bf)) if (!keep.has(el.dataset.enemy)) el.remove();
  }

  function renderLog(v) {
    const box = $('#log');
    for (const e of v.log) {
      if (e.id <= S.lastLog) continue;
      S.lastLog = e.id;
      const d = document.createElement('div');
      const res = e.success === true ? 'ok' : e.success === false ? 'ko' : '';
      let first = false;
      if (e.kind === 'scene') S.afterScene = true;
      else if (e.kind === 'narration' && S.afterScene && !e.title) { first = true; S.afterScene = false; }
      d.className = `entry k-${e.kind} ${e.title ? 'title' : ''} ${res} ${e.crit ? 'crit' : ''} ${first ? 'first' : ''} ${e.ending ? 'ending tone-' + e.ending : ''}`;
      d.textContent = e.text;
      box.appendChild(d);
    }
    // limitar el número de nodos
    while (box.children.length > 400) box.firstChild.remove();
  }

  function renderGame(v) {
    renderParty(v);
    renderBanner(v);
    renderLog(v);
    renderActionPanel(v);
  }

  // ------------------------------------------------------------------ efectos
  function fxCtx(v) {
    const visible = (el) => el && el.offsetParent !== null && el.getClientRects().length > 0;
    return {
      me: v.you && v.you.charId,
      find(id) {
        if (!id) return null;
        const cands = [$(`.enemy[data-enemy="${id}"]`), $(`.pc[data-id="${id}"]`), $(`#initiative .init[data-id="${id}"]`)];
        return cands.find(visible) || (visible($('#sceneBanner')) ? $('#sceneBanner') : null);
      },
      name(id) {
        const p = v.pcs.find((x) => x.id === id);
        if (p) return p.name.split(' ')[0];
        const e = v.combat && v.combat.enemies.find((x) => x.id === id);
        return e ? e.name : '';
      },
      color(id) { const p = v.pcs.find((x) => x.id === id); return p ? p.color : '#e0574f'; },
    };
  }

  function processFx(v) {
    if (!v.log) return;
    const batch = [];
    for (const e of v.log) {
      const n = (e.fx || []).length;
      const done = S.fxDone.get(e.id) || 0;
      if (n > done) { if (S.fxReady) batch.push(e.fx.slice(done)); S.fxDone.set(e.id, n); }
    }
    if (S.fxDone.size > 600) { const ids = [...S.fxDone.keys()].slice(0, S.fxDone.size - 400); for (const id of ids) S.fxDone.delete(id); }
    // primera carga: no reproducir el historial
    if (!S.fxReady) { S.fxReady = true; return; }
    if (v.phase === 'lobby' || !batch.length) return;
    const ctx = fxCtx(v);
    const now = performance.now();
    if (S.fxClock < now) S.fxClock = now;
    if (S.fxClock - now > 2500) S.fxClock = now + 2500; // no acumular demasiado retraso
    for (const group of batch.slice(-10)) {
      const at = S.fxClock - now;
      setTimeout(() => {
        for (const f of group) {
          // el aviso de turno solo tiene sentido si ese turno sigue en curso
          if (f.kind === 'turn' && !(S.view && S.view.combat && S.view.combat.currentId === f.who)) continue;
          try { FX.play(f, ctx); } catch (err) { console.warn(err); }
        }
      }, at);
      const long = group.some((f) => ['scene', 'levelup', 'combatStart', 'victory', 'defeat'].includes(f.kind));
      const roll = group.some((f) => f.kind === 'attack' || f.kind === 'd20');
      S.fxClock += long ? 1600 : roll ? 420 : 180;
    }
  }

  // ------------------------------------------------------------------ panel de acciones
  function actionButton(a) {
    const kind = GROUP_KIND[a.group] || 'other';
    return `<button class="btn small act k-${kind} ${S.targeting && S.targeting.action.key === a.key ? 'selected' : ''}" data-act="${esc(a.key)}" data-desc="${esc(a.desc || '')}">${esc(a.label)}${a.cost ? `<span class="cost ${a.cost}">${COST[a.cost] || ''}</span>` : ''}</button>`;
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
    let html = `<div class="targeting"><b>🎯 ${esc(a.label)}:</b> `;
    html += enemyT ? (multi ? `elige hasta ${a.maxTargets || 3} enemigos en la escena` : 'haz clic en un enemigo de la escena') : allyChooser(v, a.target);
    if (multi) html += ` <button class="btn small primary" data-confirm ${t.chosen.length ? '' : 'disabled'}>Confirmar (${t.chosen.length})</button>`;
    html += ` <button class="btn small ghost" data-cancel>Cancelar</button></div>`;
    return html;
  }

  function doAction(a, type) {
    if (['none', 'self'].includes(a.target) || !a.target) { S.targeting = null; return send({ type, key: a.key, targets: [] }); }
    S.targeting = { action: a, chosen: [], type };
    render();
    // en móvil, los enemigos están en la pestaña Historia (ya visible); acercar el panel
    if (['enemy', 'enemies3'].includes(a.target)) $('#sceneBanner').scrollIntoView({ block: 'nearest' });
  }

  function bindTargeting() {
    const t = S.targeting;
    S.onEnemy = null;
    if (!t) return;
    const multi = ['enemies3', 'allies'].includes(t.action.target);
    const max = t.action.maxTargets || (t.action.target === 'enemies3' ? 3 : 1);
    const pick = (id) => {
      if (!multi) { S.targeting = null; send({ type: t.type, key: t.action.key, targets: [id] }); render(); return; }
      t.chosen = t.chosen.includes(id) ? t.chosen.filter((x) => x !== id) : t.chosen.concat(id).slice(-max);
      render();
    };
    if (['enemy', 'enemies3'].includes(t.action.target)) S.onEnemy = (id) => { const e = S.view.combat && S.view.combat.enemies.find((x) => x.id === id); if (e && !e.dead) pick(id); };
    $$('[data-ally]').forEach((b) => (b.onclick = () => pick(b.dataset.ally)));
    const c = $('[data-confirm]'); if (c) c.onclick = () => { send({ type: t.type, key: t.action.key, targets: t.chosen }); S.targeting = null; render(); };
    const x = $('[data-cancel]'); if (x) x.onclick = () => { S.targeting = null; render(); };
  }

  function checkCard(c, myPc) {
    const icon = c.done ? (c.result === 'success' ? '✔' : '✘') : c.cost ? '💰' : c.needsItem ? '🎒' : c.group ? '👥' : c.auto ? '✋' : '🎲';
    const meta = c.done ? (c.result === 'success' ? 'Superada' : 'Fallida')
      : [c.group ? 'Prueba de grupo: tiran todos' : c.auto ? 'Sin tirada' : 'Lo intenta quien pulse', c.cost ? `Cuesta ${c.cost} po` : '', c.needsItem ? `Requiere: ${c.needsItem}` : '', c.triedByMe && !c.group ? 'Ya lo intentaste' : ''].filter(Boolean).join(' · ');
    const disabled = c.done || (c.triedByMe && !c.group) || !myPc;
    return `<button class="choice ${c.done ? 'done ' + (c.result === 'success' ? 'success' : 'fail') : ''}" data-check="${c.id}" ${disabled ? 'disabled' : ''}><span class="ic">${icon}</span><span class="lbl">${esc(c.label)}</span><span class="meta">${esc(meta)}</span></button>`;
  }

  function exitCard(e, myPc) {
    const votes = e.votes.length ? `<span class="votes">${e.votes.map((n) => `<span>${esc(n)}</span>`).join('')}</span>` : `<span class="meta">${e.enabled ? (e.fight ? 'Empieza el combate' : 'Votad para avanzar') : '🔒 Superad antes el obstáculo'}</span>`;
    return `<button class="choice ${e.fight ? 'fight' : 'path'} ${e.myVote ? 'voted' : ''}" data-exit="${e.idx}" ${e.enabled && myPc ? '' : 'disabled'}><span class="ic">${e.fight ? '⚔️' : '🧭'}</span><span class="lbl">${esc(e.label)}</span>${e.hint ? `<span class="meta hint-line">💡 ${esc(e.hint)}</span>` : ''}${votes}</button>`;
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
      html += `<h4>Estás mirando la partida</h4><div class="hint">Elige un personaje libre para unirte al grupo${v.combat ? ' cuando termine el combate' : ''}.</div><div class="shop">${free.map((c) => `<button class="btn small" data-pick="${c.id}" ${v.combat ? 'disabled' : ''}>${c.portrait} ${esc(c.name)}</button>`).join('') || '<span class="muted">No quedan personajes libres.</span>'}</div>`;
    }
    if (v.phase === 'ended') {
      const en = v.scene && v.scene.ending;
      if (en) html += `<div class="ending-card tone-${en.tone || 'good'}"><span class="eyebrow">${TONE[en.tone] || 'Final'}</span><h3>${esc(en.title)}</h3>${v.adventure.endings > 1 ? `<p>Has descubierto uno de los ${v.adventure.endings} finales de «${esc(v.adventure.title)}». Otras decisiones os habrían llevado a otro lugar.</p>` : ''}</div>`;
      else html += `<h4>🏆 Fin de la aventura</h4>`;
      html += `<div class="hint">Podéis repartir el botín y revisar vuestras fichas.</div>`;
      if (v.you && v.you.isHost) html += `<div><button class="btn primary" data-restart>Volver a la sala y elegir aventura</button></div>`;
    } else if (v.combat) {
      const cb = v.combat;
      if (cb.actions.length) {
        const ts = cb.turnState;
        html += `<div class="turn-head"><span class="who">Tu turno: ${esc(myPc.name)}</span><div class="economy" style="--c:${myPc.color}"><span class="${ts.action > 0 ? '' : 'used'}">Acción${ts.action > 1 ? ' ×' + ts.action : ''}</span><span class="${ts.bonus > 0 ? '' : 'used'}">Adicional</span></div></div>`;
        html += targetingBar(v);
        const groups = {};
        for (const a of cb.actions) (groups[a.group] = groups[a.group] || []).push(a);
        html += `<div class="actions-grid">${Object.entries(groups).map(([g, list]) => `<div class="group"><span>${esc(g)}</span>${list.map(actionButton).join('')}</div>`).join('')}</div>`;
        html += `<div class="detail" id="actDetail"><span class="muted">Pasa el ratón o enfoca una acción para ver su descripción.</span></div>`;
      } else {
        const cur = cb.order.find((o) => o.id === cb.currentId);
        html += `<div class="waiting"><span class="hourglass">⏳</span>${cur ? (cur.side === 'enemy' ? `${esc(cur.name)} está actuando…` : `Turno de ${esc(cur.name)}…`) : 'Resolviendo…'}</div>`;
      }
    } else if (v.scene) {
      const sc = v.scene;
      const pre = sc.checks.filter((c) => c.pre);
      const normal = sc.checks.filter((c) => !c.pre);
      const fights = sc.exits.filter((e) => e.fight);
      const paths = sc.exits.filter((e) => !e.fight);
      if (sc.encounter) {
        html += `<h4>⚠️ Encuentro: ¿cómo lo resolvéis?</h4><div class="choices">${pre.map((c) => checkCard(c, myPc)).join('')}${fights.map((e) => exitCard(e, myPc)).join('')}</div>`;
        if (fights.length) html += `<div class="hint">Atacar necesita la mayoría de votos (${sc.voters}). Si una opción pacífica tiene éxito, el combate se evita.</div>`;
      }
      if (normal.length) html += `<h4>¿Qué hacéis?</h4><div class="choices">${normal.map((c) => checkCard(c, myPc)).join('')}</div>`;
      if (sc.shop) {
        html += `<h4>🛒 Comprar (oro del grupo: ${v.party.gold} po)</h4><div class="shop">${sc.shop.map((w) => `<div class="ware" title="${esc(w.desc)}"><span>${esc(w.name)}</span><span class="price">${w.price} po</span><button class="btn small" data-buy="${w.id}" ${myPc && v.party.gold >= w.price ? '' : 'disabled'}>Comprar</button></div>`).join('')}</div>`;
      }
      if (v.exploreActions.length || sc.shortRest) {
        html += `<h4>Tu personaje</h4>` + targetingBar(v) + `<div class="shop">${sc.shortRest ? `<button class="btn small" data-rest>🏕️ Descanso corto (todo el grupo)</button>` : ''}${v.exploreActions.map(actionButton).join('')}</div>`;
      }
      if (paths.length) {
        html += `<h4>Siguiente paso (mayoría de ${sc.voters})</h4><div class="choices">${paths.map((e) => exitCard(e, myPc)).join('')}</div>`;
      }
      if (!html && !sc.end) html = `<div class="waiting"><span class="hourglass">⏳</span>La historia continúa…</div>`;
    }
    const actionList = v.combat ? v.combat.actions : v.exploreActions;
    if (!setHTML(panel, html)) return;
    bindCharButtons(panel);
    $$('[data-check]', panel).forEach((b) => (b.onclick = () => send({ type: 'check', checkId: b.dataset.check })));
    $$('[data-exit]', panel).forEach((b) => (b.onclick = () => send({ type: 'vote', exit: +b.dataset.exit })));
    $$('[data-buy]', panel).forEach((b) => (b.onclick = () => send({ type: 'buy', item: b.dataset.buy })));
    $$('[data-rest]', panel).forEach((b) => (b.onclick = () => send({ type: 'rest' })));
    $$('[data-restart]', panel).forEach((b) => (b.onclick = () => { if (confirm('¿Volver a la sala? Podréis elegir otra aventura; los personajes vuelven a nivel 1.')) send({ type: 'restart' }); }));
    $$('[data-act]', panel).forEach((b) => {
      b.onclick = () => {
        const a = actionList.find((x) => x.key === b.dataset.act);
        if (a) doAction(a, v.combat ? 'act' : 'explore');
      };
      const show = () => { const d = $('#actDetail'); if (d) d.innerHTML = `<b>${esc(b.firstChild.textContent)}</b> · ${esc(b.dataset.desc || 'Sin descripción.')}`; };
      b.onmouseenter = show; b.onfocus = show;
      if (!$('#actDetail')) b.title = b.dataset.desc;
    });
    bindTargeting();
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
    const p = v.pcs.find((x) => x.id === id);
    const body = $('#sheetBody');
    if (!p) {
      // vista previa desde el lobby (aún no está en el grupo)
      const c = v.catalog.find((x) => x.id === id);
      if (!c) return;
      setHTML(body, `<div class="sheet"><div class="full head"><span class="medallion" style="--c:${c.color}">${c.portrait}</span><div><h2>${esc(c.name)}</h2><div class="sub">${esc(c.race)} · ${esc(c.className)} · ${esc(c.subclass)} · Trasfondo: ${esc(c.background)}</div></div></div>
        <div class="full kv"><div>PG <b>${c.hp}</b></div><div>CA <b>${c.ac}</b></div>${c.role ? `<div>${esc(c.role)}</div>` : ''}</div>
        <p class="full bio">${esc(c.bio)}</p><p class="full hint">Elige este personaje para ver su ficha completa.</p></div>`);
      return;
    }
    const mine = v.you && v.you.charId === p.id;
    const g = await glossary().catch(() => null);
    const spellDesc = (sid) => (g ? (g.spells.find((s) => s.id === sid) || {}).desc : '') || '';
    const stats = Object.entries(p.abilities).map(([k, a]) => `<div class="stat" data-roll="ability:${k}" title="Prueba de ${ABIL_FULL[k]}"><div class="lbl">${ABIL[k]}</div><div class="mod">${fmt(a.mod)}</div><div class="score">${a.score}</div></div>`).join('');
    const saves = Object.entries(p.abilities).map(([k, a]) => `<li class="${a.saveProf ? 'p' : 'np'}" data-roll="save:${k}"><span>${ABIL_FULL[k]}</span><b>${fmt(a.save)}</b></li>`).join('');
    const skills = p.skills.map((s) => `<li class="${s.expertise ? 'p e' : s.prof ? 'p' : 'np'}" data-roll="skill:${s.key}"><span>${esc(s.name)} <span class="hint">(${ABIL[s.ability]})</span></span><b>${fmt(s.mod)}</b></li>`).join('');
    const weapons = p.weapons.map((w) => `<li>⚔️ <b>${esc(w.name)}</b>: ${fmt(w.toHit)} al ataque, ${esc(w.dmg)} ${esc(w.type)}${w.light ? ' · ligera' : ''}</li>`).join('');
    const sc = p.spellcasting;
    const spells = sc ? `<h3>Conjuros</h3><div class="hint">CD de salvación ${sc.dc} · Ataque de conjuro ${fmt(sc.attack)}</div>
      <div class="slots">${sc.slots.map((s) => `<span>Nv ${s.level}: ${Array.from({ length: s.max }, (_, i) => `<span class="slot-pip ${i < s.cur ? 'full' : ''}"></span>`).join('')}</span>`).join('')}</div>
      ${[0, 1, 2].map((lvl) => { const l = sc.spells.filter((s) => s.level === lvl); return l.length ? `<div class="feature"><b>${lvl === 0 ? 'Trucos' : 'Nivel ' + lvl}:</b> ${l.map((s) => `<span title="${esc(spellDesc(s.id))}" style="border-bottom:1px dotted">${esc(s.name)}</span>`).join(', ')}</div>` : ''; }).join('')}` : '';
    const feats = p.features.map((f) => `<div class="feature"><b>${esc(f.name)}</b> <span class="src">${esc(f.source)}</span><br>${esc(f.desc)}</div>`).join('');
    const inv = p.inventory.map((i) => `<li title="${esc(i.desc)}">${i.magic ? '✨ ' : '• '}${esc(i.name)}${i.qty > 1 ? ' ×' + i.qty : ''}</li>`).join('');
    const changed = setHTML(body, `<div class="sheet">
      <div class="full head"><span class="medallion" style="--c:${p.color}">${p.portrait}</span><div><h2>${esc(p.name)}</h2>
        <div class="sub">${esc(p.race)} · ${esc(p.className)} de nivel ${p.level} · ${esc(p.subclass)} · Trasfondo: ${esc(p.background)}${p.owner ? ' · Jugador: ' + esc(p.owner) : ''}</div></div></div>
      <div class="full kv"><div>PG <b>${p.hp}/${p.maxHp}</b>${p.tempHp ? ` (+${p.tempHp})` : ''}</div><div>CA <b>${p.ac}</b> <span class="hint">${esc(p.armor)}</span></div><div>Competencia <b>${fmt(p.prof)}</b></div><div>Percepción pasiva <b>${p.passivePerception}</b></div><div>Dados de golpe <b>${esc(p.hitDice)}</b></div><div>PX <b>${p.xp}</b>${p.nextXp ? ` / ${p.nextXp}` : ' (máx.)'}</div></div>
      ${mine ? '<div class="full hint">Haz clic en una característica, salvación o habilidad para tirarla en el chat (usa el selector Normal/Ventaja del panel de dados).</div>' : ''}
      <div class="full stats-row">${stats}</div>
      <div><h3>Tiradas de salvación</h3><ul class="saves">${saves}</ul><h3 style="margin-top:12px">Ataques</h3><ul>${weapons}</ul>${spells ? '<div style="margin-top:12px">' + spells + '</div>' : ''}</div>
      <div><h3>Habilidades</h3><ul class="skills">${skills}</ul></div>
      <div><h3>Rasgos y pasivas</h3>${feats}</div>
      <div><h3>Equipo</h3><ul>${inv}</ul><h3 style="margin-top:12px">Historia</h3><p class="bio">${esc(p.bio)}</p></div>
    </div>`);
    if (!changed) return;
    if (mine) {
      $$('[data-roll]', body).forEach((el) => (el.onclick = () => {
        const [kind, key] = el.dataset.roll.split(':');
        send({ type: 'roll', sheet: { kind, key }, mode: $('#diceMode').value });
        toast('Tirada enviada al chat', true);
      }));
    } else $$('[data-roll]', body).forEach((el) => (el.style.cursor = 'default'));
  }

  // ------------------------------------------------------------------ glosario flotante
  const G_SECTIONS = [
    ['rules', 'Reglas básicas'], ['skills', 'Habilidades'], ['features', 'Rasgos y pasivas'], ['items', 'Objetos'],
    ['spells', 'Conjuros'], ['conditions', 'Condiciones'], ['monsters', 'Criaturas'],
    ['races', 'Razas'], ['classes', 'Clases'], ['backgrounds', 'Trasfondos'],
  ];
  const gnorm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const G = { tab: 'all', data: null };
  function ghl(text, q) {
    if (!q) return esc(text);
    const i = gnorm(text).indexOf(q);
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }
  function renderGlossary() {
    const data = G.data;
    if (!data) return;
    const q = gnorm($('#gq').value.trim());
    const match = (e) => !q || gnorm(`${e.name} ${e.tag || ''} ${e.desc} ${e.meta || ''}`).includes(q);
    $('#gtabs').innerHTML = [['all', 'Todo']].concat(G_SECTIONS).map(([k, n]) => {
      const count = k === 'all' ? G_SECTIONS.reduce((a, [s]) => a + data[s].filter(match).length, 0) : data[k].filter(match).length;
      return `<button data-k="${k}" class="${G.tab === k ? 'active' : ''}">${n} <small>${count}</small></button>`;
    }).join('');
    $$('#gtabs button').forEach((b) => (b.onclick = () => { G.tab = b.dataset.k; renderGlossary(); $('.gwin-body').scrollTop = 0; }));
    const secs = G.tab === 'all' ? G_SECTIONS.map(([k]) => k) : [G.tab];
    let items = [];
    for (const s of secs) {
      let list = data[s].filter(match);
      if (s === 'spells') list = list.slice().sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
      else if (s !== 'rules') list = list.slice().sort((a, b) => a.name.localeCompare(b.name));
      items = items.concat(list.map((e) => ({ ...e, sec: G_SECTIONS.find(([k]) => k === s)[1] })));
    }
    $('#glist').innerHTML = items.map((e) => `<article class="gitem ${e.magic ? 'magic' : ''}"><h4>${ghl(e.name, q)}</h4><div class="gtag">${G.tab === 'all' ? esc(e.sec) + (e.tag ? ' · ' : '') : ''}${esc(e.tag || '')}</div>${e.meta ? `<div class="gmeta">${esc(e.meta)}</div>` : ''}<p>${ghl(e.desc, q)}</p></article>`).join('') || '<p class="muted">Nada coincide con la búsqueda.</p>';
  }
  function toggleGlossary(open) {
    const win = $('#glossaryWin');
    open = open ?? win.classList.contains('hidden');
    win.classList.toggle('hidden', !open);
    $('#glossaryBtn').setAttribute('aria-expanded', String(open));
    if (!open) return;
    gwinRestore();
    $('#glossaryMax').textContent = win.classList.contains('max') ? '🗗' : '⤢';
    if (!G.data) glossary().then((d) => { G.data = d; renderGlossary(); }).catch(() => { $('#glist').innerHTML = '<p class="error">No se pudo cargar el glosario.</p>'; });
    if (matchMedia('(min-width: 901px)').matches) $('#gq').focus();
  }
  const GW_KEY = 'mesa:gwin';
  function gwinSave() {
    const win = $('#glossaryWin');
    if (!matchMedia('(min-width: 901px)').matches || win.classList.contains('hidden')) return;
    try { localStorage.setItem(GW_KEY, JSON.stringify({ max: win.classList.contains('max'), left: win.style.left, top: win.style.top, width: win.style.width || `${win.offsetWidth}px`, height: win.style.height || `${win.offsetHeight}px` })); } catch {}
  }
  function gwinRestore() {
    const win = $('#glossaryWin');
    if (!matchMedia('(min-width: 901px)').matches) return;
    let st = null;
    try { st = JSON.parse(localStorage.getItem(GW_KEY) || 'null'); } catch {}
    if (!st) return;
    win.classList.toggle('max', !!st.max);
    const w = Math.min(parseInt(st.width, 10) || 560, innerWidth - 16), h = Math.min(parseInt(st.height, 10) || 600, innerHeight - 60);
    Object.assign(win.style, { width: `${w}px`, height: `${h}px` });
    if (st.left) Object.assign(win.style, { left: `${Math.max(0, Math.min(innerWidth - w, parseInt(st.left, 10)))}px`, top: `${Math.max(48, Math.min(innerHeight - 40, parseInt(st.top, 10)))}px`, right: 'auto' });
  }
  function gwinMax(on) {
    const win = $('#glossaryWin');
    win.classList.toggle('max', on ?? !win.classList.contains('max'));
    $('#glossaryMax').textContent = win.classList.contains('max') ? '🗗' : '⤢';
    gwinSave();
  }
  $('#glossaryMax').onclick = () => gwinMax();
  $('#glossaryHead').addEventListener('dblclick', (e) => { if (!e.target.closest('button, a')) gwinMax(); });
  if (window.ResizeObserver) { let t = 0; new ResizeObserver(() => { clearTimeout(t); t = setTimeout(gwinSave, 300); }).observe($('#glossaryWin')); }
  $('#glossaryBtn').onclick = () => toggleGlossary();
  $('#glossaryClose').onclick = () => toggleGlossary(false);
  $('#gq').addEventListener('input', renderGlossary);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#glossaryWin').classList.contains('hidden') && !$('#sheetDialog').open && !$('#createDialog').open) toggleGlossary(false); });
  // arrastrar la ventana por su cabecera (solo escritorio)
  (() => {
    const win = $('#glossaryWin'), head = $('#glossaryHead');
    let drag = null;
    head.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, a') || !matchMedia('(min-width: 901px)').matches || win.classList.contains('max')) return;
      const r = win.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      head.setPointerCapture(e.pointerId);
    });
    head.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const x = Math.max(0, Math.min(innerWidth - win.offsetWidth, e.clientX - drag.dx));
      const y = Math.max(48, Math.min(innerHeight - 40, e.clientY - drag.dy));
      Object.assign(win.style, { left: `${x}px`, top: `${y}px`, right: 'auto' });
    });
    const stop = () => { if (drag) gwinSave(); drag = null; };
    head.addEventListener('pointerup', stop);
    head.addEventListener('pointercancel', stop);
  })();


  // ------------------------------------------------------------------ asistente de creación de personaje
  const WZ = { data: null, step: 0, spec: null, busy: false };
  const PORTRAITS = ['🧑', '👩', '👨', '🧔', '👱', '🧕', '👩‍🦰', '👨‍🦳', '🧝', '🧙', '🥷', '🛡️', '⚔️', '🏹', '🔮', '✨', '🗡️', '🐉', '😈', '⛏️', '🍀', '⚙️', '🌗', '🪓', '🦊', '🐺', '🌙', '🔥'];
  const COLORS = ['#c0392b', '#d35400', '#b7950b', '#27ae60', '#16a085', '#2980b9', '#8e44ad', '#c2185b', '#7f8c8d', '#5d4037'];
  const amod = (v) => Math.floor((v - 10) / 2);
  async function creationData() {
    if (!WZ.data) WZ.data = await fetch('/api/creation').then((r) => r.json());
    return WZ.data;
  }
  const wRace = () => WZ.data.races.find((r) => r.id === WZ.spec.race);
  const wCls = () => WZ.data.classes.find((c) => c.id === WZ.spec.cls);
  const wBg = () => WZ.data.backgrounds.find((b) => b.id === WZ.spec.background);
  const skillName = (id) => (WZ.data.skills.find((s) => s.id === id) || {}).name || id;
  const abilShort = (id) => ABIL[id];
  function wSteps() {
    const r = WZ.spec.race && wRace(), c = WZ.spec.cls && wCls();
    const magic = (c && c.spells) || (r && r.cantrip);
    return [['race', 'Raza'], ['class', 'Clase'], ['abil', 'Características'], ['skills', 'Trasfondo y habilidades'], ...(magic ? [['magic', 'Magia']] : []), ['gear', 'Equipo'], ['details', 'Detalles'], ['summary', 'Resumen']];
  }
  function wFixedSkills() {
    const r = wRace(), b = WZ.spec.background ? wBg() : null;
    return [...new Set([...(r ? r.skills : []), ...(b ? b.skills : [])])];
  }
  function wAnyCount() {
    const r = wRace(), b = WZ.spec.background ? wBg() : null;
    if (!r) return 0;
    return (r.extraSkills || 0) + (b ? r.skills.filter((x) => b.skills.includes(x)).length : 0);
  }
  function wFinal() {
    const r = wRace();
    const out = { ...WZ.spec.base };
    if (r) { for (const [k, v] of Object.entries(r.bonus)) out[k] += v; for (const k of WZ.spec.plus1 || []) out[k] += 1; }
    return out;
  }
  function wPoints() { return Object.values(WZ.spec.base).reduce((a, v) => a + (WZ.data.pointCost[v] ?? 99), 0); }
  /** Problema que impide avanzar desde un paso (o null) */
  function wProblem(step) {
    const s = WZ.spec, r = s.race && wRace(), c = s.cls && wCls();
    switch (step) {
      case 'race': return !r ? 'Elige una raza.' : r.ancestry && !s.ancestry ? 'Elige tu linaje dracónico.' : null;
      case 'class': return !c ? 'Elige una clase.' : null;
      case 'abil':
        if (s.method === 'array' && Object.values(s.base).sort((a, b) => a - b).join() !== WZ.data.stdArray.join()) return 'Usa cada valor de la serie estándar una vez.';
        if (s.method === 'points' && wPoints() > 27) return `Te has pasado de puntos (${wPoints()} de 27).`;
        if (r.plus1 && (s.plus1 || []).length !== r.plus1) return `Elige ${r.plus1} características para el +1.`;
        return null;
      case 'skills':
        if (!s.background) return 'Elige un trasfondo.';
        if (s.skills.length !== c.skillChoices) return `Elige ${c.skillChoices} habilidades de clase.`;
        if (s.anySkills.length !== wAnyCount()) return `Elige ${wAnyCount()} habilidades libres.`;
        if (c.expertise && s.expertise.length !== c.expertise) return `Elige ${c.expertise} habilidades de pericia.`;
        return null;
      case 'magic':
        if (c.spells && s.cantrips.length !== c.spells.cantrips.count) return `Elige ${c.spells.cantrips.count} trucos.`;
        if (c.spells && s.spells.length !== c.spells.level1.count) return `Elige ${c.spells.level1.count} conjuros de nivel 1.`;
        if (r.cantrip && !s.elfCantrip) return 'Elige tu truco de alto elfo.';
        return null;
      case 'gear': return !s.kit ? 'Elige tu equipo.' : c.styles && !s.style ? 'Elige un estilo de combate.' : null;
      case 'details': return s.name.trim().length < 2 ? 'Ponle un nombre a tu personaje.' : null;
      default: return null;
    }
  }
  const chip = (on, attrs, html, disabled = false) => `<button type="button" class="wchip ${on ? 'on' : ''}" ${attrs} ${disabled ? 'disabled' : ''}>${html}</button>`;
  function pickToggle(list, id, max) {
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else { if (list.length >= max) list.shift(); list.push(id); }
  }
  function wRender() {
    const d = WZ.data, s = WZ.spec;
    const steps = wSteps();
    WZ.step = Math.min(WZ.step, steps.length - 1);
    const [key, title] = steps[WZ.step];
    const r = s.race && wRace(), c = s.cls && wCls();
    $('#wzSteps').innerHTML = steps.map(([k, t], i) => `<button type="button" class="${i === WZ.step ? 'active' : ''} ${i < WZ.step ? 'done' : ''}" data-wstep="${i}" ${i > WZ.step && steps.slice(0, i).some(([kk]) => wProblem(kk)) ? 'disabled' : ''}><b>${i + 1}</b><span>${t}</span></button>`).join('');
    let h = `<h3>${title}</h3>`;
    if (key === 'race') {
      h += `<div class="wgrid">${d.races.map((x) => `<button type="button" class="wcard ${s.race === x.id ? 'on' : ''}" data-race="${x.id}"><span class="wic">${x.icon}</span><b>${esc(s.gender === 'f' ? x.fem : x.name)}</b><span class="wtags">${Object.entries(x.bonus).map(([k, v]) => `<i>${abilShort(k)} +${v}</i>`).join('')}${x.plus1 ? `<i>+1 a ${x.plus1} a elegir</i>` : ''}</span><small>${esc(x.desc)}</small></button>`).join('')}</div>`;
      if (r) h += `<div class="wnote"><b>Rasgos:</b> ${r.features.map((f) => `<span class="wfeat" title="${esc(f.desc)}">${esc(f.name)}</span>`).join(' ')}</div>`;
      if (r && r.ancestry) h += `<h4>Linaje dracónico</h4><div class="wchips">${d.ancestries.map((a) => chip(s.ancestry === a.id, `data-anc="${a.id}"`, `${esc(a.name)} <small>${esc(a.type)} · ${a.shape === 'line' ? 'línea' : 'cono'}</small>`)).join('')}</div>`;
    } else if (key === 'class') {
      h += `<div class="wgrid">${d.classes.map((x) => `<button type="button" class="wcard ${s.cls === x.id ? 'on' : ''}" data-cls="${x.id}"><span class="wic">${x.icon}</span><b>${esc(s.gender === 'f' ? x.fem : x.name)}</b><span class="wtags"><i>d${x.hitDie} PG</i><i>Salv.: ${x.saves.map(abilShort).join(', ')}</i></span><small>${esc(x.desc)}</small>${statBars(x.stats)}</button>`).join('')}</div>`;
      if (c) h += `<div class="wnote"><b>${esc(c.subclass)}.</b> ${c.features.map((f) => `<span class="wfeat" title="${esc(f.desc)}">Nv ${f.level}: ${esc(f.name)}</span>`).join(' ')}</div>`;
    } else if (key === 'abil') {
      const fin = wFinal();
      h += `<div class="wseg">${chip(s.method === 'array', 'data-method="array"', 'Serie estándar (15, 14, 13, 12, 10, 8)')}${chip(s.method === 'points', 'data-method="points"', 'Compra de puntos (27)')}<button type="button" class="btn small ghost" data-recommend>Usar la recomendada para ${esc(c.name.toLowerCase())}</button></div>`;
      if (s.method === 'points') h += `<p class="wpoints ${wPoints() > 27 ? 'bad' : ''}">Puntos gastados: <b>${wPoints()}</b> de 27</p>`;
      h += `<div class="wabil">${d.abilities.map((a) => {
        const bonus = (r.bonus[a.id] || 0) + ((s.plus1 || []).includes(a.id) ? 1 : 0);
        const ctrl = s.method === 'array'
          ? `<select data-arr="${a.id}">${d.stdArray.slice().reverse().map((v) => `<option ${s.base[a.id] === v ? 'selected' : ''}>${v}</option>`).join('')}</select>`
          : `<span class="wpm"><button type="button" class="btn small" data-pm="${a.id}:-1" ${s.base[a.id] <= 8 ? 'disabled' : ''}>−</button><b>${s.base[a.id]}</b><button type="button" class="btn small" data-pm="${a.id}:1" ${s.base[a.id] >= 15 ? 'disabled' : ''}>+</button></span>`;
        return `<div class="wab ${c.saves.includes(a.id) ? 'save' : ''}"><span class="wabn">${esc(a.name)}${c.recommended && Object.entries(c.recommended).sort((x, y) => y[1] - x[1])[0][0] === a.id ? ' ★' : ''}</span>${ctrl}<span class="wbonus">${bonus ? '+' + bonus : ''}</span><span class="wfin">${fin[a.id]}<small>${fmt(amod(fin[a.id]))}</small></span></div>`;
      }).join('')}</div>`;
      if (r.plus1) h += `<h4>+1 a ${r.plus1} características (${esc(r.name)})</h4><div class="wchips">${d.abilities.filter((a) => !r.bonus[a.id]).map((a) => chip((s.plus1 || []).includes(a.id), `data-plus1="${a.id}"`, esc(a.name))).join('')}</div>`;
      h += `<p class="muted small">★ característica principal de la clase. Las marcadas en dorado son tus salvaciones competentes.</p>`;
    } else if (key === 'skills') {
      h += `<div class="wgrid small">${d.backgrounds.map((b) => `<button type="button" class="wcard ${s.background === b.id ? 'on' : ''}" data-bg="${b.id}"><b>${esc(b.name)}</b><span class="wtags">${b.skills.map((k) => `<i>${esc(skillName(k))}</i>`).join('')}</span><small>${esc(b.desc)} Equipo: ${esc(b.items.join(', '))}.</small></button>`).join('')}</div>`;
      const fixed = wFixedSkills();
      h += `<h4>Ya tienes</h4><div class="wchips">${fixed.map((k) => chip(true, 'disabled', '🔒 ' + esc(skillName(k)))).join('') || '<span class="muted small">Elige un trasfondo.</span>'}</div>`;
      h += `<h4>Habilidades de ${esc(c.name.toLowerCase())}: elige ${c.skillChoices} (${s.skills.length}/${c.skillChoices})</h4><div class="wchips">${c.skillList.map((k) => chip(s.skills.includes(k), `data-sk="${k}"`, esc(skillName(k)), fixed.includes(k))).join('')}</div>`;
      const any = wAnyCount();
      if (any) h += `<h4>Habilidades libres: elige ${any} (${s.anySkills.length}/${any})</h4><div class="wchips">${d.skills.map((k) => chip(s.anySkills.includes(k.id), `data-any="${k.id}"`, esc(k.name), fixed.includes(k.id) || s.skills.includes(k.id))).join('')}</div>`;
      if (c.expertise) {
        const prof = [...fixed, ...s.skills, ...s.anySkills];
        h += `<h4>Pericia: elige ${c.expertise} (doble competencia) (${s.expertise.length}/${c.expertise})</h4><div class="wchips">${prof.map((k) => chip(s.expertise.includes(k), `data-exp="${k}"`, esc(skillName(k)))).join('')}</div>`;
      }
    } else if (key === 'magic') {
      const spellChip = (sp, list, attr) => chip(list.includes(sp.id), `data-${attr}="${sp.id}" title="${esc(sp.desc)}"`, esc(sp.name));
      if (c.spells) {
        h += `<h4>Trucos: elige ${c.spells.cantrips.count} (${s.cantrips.length}/${c.spells.cantrips.count})</h4><div class="wchips">${c.spells.cantrips.from.map((sp) => spellChip(sp, s.cantrips, 'can')).join('')}</div>`;
        h += `<h4>Conjuros de nivel 1: elige ${c.spells.level1.count} (${s.spells.length}/${c.spells.level1.count})</h4><div class="wchips">${c.spells.level1.from.map((sp) => spellChip(sp, s.spells, 'sp1')).join('')}</div>`;
        if (c.spells.level1.always.length) h += `<p class="muted small">Siempre preparados: ${c.spells.level1.always.map((x) => esc(x.name)).join(', ')}.</p>`;
      }
      if (r.cantrip) h += `<h4>Truco de alto elfo (usa Inteligencia)</h4><div class="wchips">${d.wizardCantrips.map((sp) => chip(s.elfCantrip === sp.id, `data-elf="${sp.id}" title="${esc(sp.desc)}"`, esc(sp.name), c.id === 'wizard' && s.cantrips.includes(sp.id))).join('')}</div>`;
      h += `<div class="wnote" id="wzSpellDesc">Pasa el ratón por un conjuro para ver qué hace.</div>`;
    } else if (key === 'gear') {
      h += `<div class="wgrid small">${c.kits.map((k) => `<button type="button" class="wcard ${s.kit === k.id ? 'on' : ''}" data-kit="${k.id}"><b>${esc(k.name)}</b><small>${esc(k.desc)}</small></button>`).join('')}</div>`;
      if (c.styles) h += `<h4>Estilo de combate</h4><div class="wgrid small">${c.styles.map((st) => `<button type="button" class="wcard ${s.style === st.id ? 'on' : ''}" data-style="${st.id}"><b>${esc(st.name)}</b><small>${esc(st.desc)}</small></button>`).join('')}</div>`;
    } else if (key === 'details') {
      h += `<div class="wform"><label>Nombre <input id="wzName" maxlength="28" value="${esc(s.name)}" placeholder="p. ej. Alma Brasaviva"></label>
        <div class="wseg">${chip(s.gender === 'f', 'data-gender="f"', 'Femenino')}${chip(s.gender === 'm', 'data-gender="m"', 'Masculino')}</div>
        <h4>Retrato</h4><div class="wchips portraits">${PORTRAITS.map((p) => chip(s.portrait === p, `data-por="${p}"`, p)).join('')}</div>
        <h4>Color</h4><div class="wchips">${COLORS.map((col) => `<button type="button" class="wcolor ${s.color === col ? 'on' : ''}" data-col="${col}" style="--c:${col}" aria-label="Color ${col}"></button>`).join('')}</div>
        <label>Historia (opcional) <textarea id="wzBio" maxlength="400" rows="3" placeholder="¿De dónde vienes? ¿Qué buscas?">${esc(s.bio)}</textarea></label></div>`;
    } else if (key === 'summary') {
      const fin = wFinal();
      const hp = c.hitDie + amod(fin.con) + (s.race === 'dwarf' ? 1 : 0);
      const kit = c.kits.find((k) => k.id === s.kit);
      const allSkills = [...wFixedSkills(), ...s.skills, ...s.anySkills];
      const spellNames = (ids, list) => ids.map((id) => (list.find((x) => x.id === id) || {}).name).filter(Boolean);
      h += `<div class="wsum" style="--c:${s.color}"><span class="medallion">${esc(s.portrait || r.icon)}</span><div><h3>${esc(s.name)}</h3><div class="sub">${esc(s.gender === 'f' ? r.fem : r.name)}${s.ancestry ? ` (linaje ${esc(d.ancestries.find((a) => a.id === s.ancestry).name.toLowerCase())})` : ''} · ${esc(s.gender === 'f' ? c.fem : c.name)} 1 · ${esc(wBg().name)}</div></div></div>
        <div class="wabil sum">${d.abilities.map((a) => `<div class="wab"><span class="wabn">${a.short || ABIL[a.id]}</span><span class="wfin">${fin[a.id]}<small>${fmt(amod(fin[a.id]))}</small></span></div>`).join('')}</div>
        <ul class="wlist"><li><b>Puntos de golpe:</b> ${hp}</li><li><b>Equipo:</b> ${esc(kit.desc)}${c.styles ? ` · Estilo: ${esc(c.styles.find((x) => x.id === s.style).name)}` : ''}</li>
        <li><b>Habilidades:</b> ${allSkills.map((k) => esc(skillName(k)) + (s.expertise.includes(k) ? ' (pericia)' : '')).join(', ')}</li>
        ${c.spells ? `<li><b>Trucos:</b> ${spellNames(s.cantrips, c.spells.cantrips.from).join(', ')}</li><li><b>Conjuros:</b> ${[...c.spells.level1.always.map((x) => x.name), ...spellNames(s.spells, c.spells.level1.from)].join(', ')}</li>` : ''}
        ${r.cantrip ? `<li><b>Truco de alto elfo:</b> ${esc((d.wizardCantrips.find((x) => x.id === s.elfCantrip) || {}).name || '')}</li>` : ''}
        <li><b>Rasgos:</b> ${[...r.features, ...c.features.filter((f) => f.level === 1)].map((f) => esc(f.name)).join(', ')}</li></ul>`;
    }
    const prob = wProblem(key);
    h += `<p class="wprob">${prob ? '⚠️ ' + esc(prob) : ''}</p>`;
    setHTML($('#wzBody'), h);
    $('#wzBack').disabled = WZ.step === 0;
    $('#wzNext').classList.toggle('hidden', key === 'summary');
    $('#wzCreate').classList.toggle('hidden', key !== 'summary');
    $('#wzNext').disabled = !!prob;
    $('#wzCreate').disabled = WZ.busy;
    wBind();
  }
  function wSet(fn) { fn(WZ.spec); wRender(); }
  function wResetForClass() {
    const c = wCls();
    Object.assign(WZ.spec, { kit: null, style: null, skills: [], expertise: [], cantrips: [], spells: [], method: 'array' });
    WZ.spec.base = { ...c.recommended };
  }
  function wBind() {
    const b = $('#wzBody'), s = WZ.spec;
    const on = (sel, fn) => $$(sel, b).forEach((el) => (el.onclick = () => fn(el)));
    $$('[data-wstep]', $('#wzSteps')).forEach((el) => (el.onclick = () => { WZ.step = +el.dataset.wstep; wRender(); }));
    on('[data-race]', (el) => wSet(() => { s.race = el.dataset.race; s.plus1 = []; s.anySkills = []; s.ancestry = null; s.elfCantrip = null; if (!s._por) s.portrait = wRace().icon; }));
    on('[data-anc]', (el) => wSet(() => { s.ancestry = el.dataset.anc; }));
    on('[data-cls]', (el) => wSet(() => { if (s.cls !== el.dataset.cls) { s.cls = el.dataset.cls; wResetForClass(); } }));
    on('[data-method]', (el) => wSet(() => { s.method = el.dataset.method; if (s.method === 'array') s.base = { ...wCls().recommended }; else for (const k of Object.keys(s.base)) s.base[k] = Math.min(15, Math.max(8, s.base[k])); }));
    on('[data-recommend]', () => wSet(() => { s.method = 'array'; s.base = { ...wCls().recommended }; }));
    $$('[data-arr]', b).forEach((el) => (el.onchange = () => wSet(() => {
      const k = el.dataset.arr, v = +el.value;
      const other = Object.keys(s.base).find((x) => x !== k && s.base[x] === v);
      if (other) s.base[other] = s.base[k];
      s.base[k] = v;
    })));
    on('[data-pm]', (el) => wSet(() => { const [k, dlt] = el.dataset.pm.split(':'); s.base[k] = Math.max(8, Math.min(15, s.base[k] + +dlt)); }));
    on('[data-plus1]', (el) => wSet(() => pickToggle(s.plus1, el.dataset.plus1, wRace().plus1)));
    on('[data-bg]', (el) => wSet(() => { s.background = el.dataset.bg; const fixed = wFixedSkills(); s.skills = s.skills.filter((x) => !fixed.includes(x)); s.anySkills = []; s.expertise = []; }));
    on('[data-sk]', (el) => wSet(() => { pickToggle(s.skills, el.dataset.sk, wCls().skillChoices); s.anySkills = s.anySkills.filter((x) => !s.skills.includes(x)); s.expertise = s.expertise.filter((x) => [...wFixedSkills(), ...s.skills, ...s.anySkills].includes(x)); }));
    on('[data-any]', (el) => wSet(() => { pickToggle(s.anySkills, el.dataset.any, wAnyCount()); s.expertise = s.expertise.filter((x) => [...wFixedSkills(), ...s.skills, ...s.anySkills].includes(x)); }));
    on('[data-exp]', (el) => wSet(() => pickToggle(s.expertise, el.dataset.exp, wCls().expertise)));
    on('[data-can]', (el) => wSet(() => { pickToggle(s.cantrips, el.dataset.can, wCls().spells.cantrips.count); if (s.cls === 'wizard' && s.cantrips.includes(s.elfCantrip)) s.elfCantrip = null; }));
    on('[data-sp1]', (el) => wSet(() => pickToggle(s.spells, el.dataset.sp1, wCls().spells.level1.count)));
    on('[data-elf]', (el) => wSet(() => { s.elfCantrip = el.dataset.elf; }));
    $$('[data-can], [data-sp1], [data-elf]', b).forEach((el) => (el.onmouseenter = el.onfocus = () => { const dd = $('#wzSpellDesc'); if (dd) dd.innerHTML = `<b>${esc(el.textContent)}</b> · ${esc(el.title)}`; }));
    on('[data-kit]', (el) => wSet(() => { s.kit = el.dataset.kit; if (s.kit === 'arquero' && !s.style) s.style = 'archery'; }));
    on('[data-style]', (el) => wSet(() => { s.style = el.dataset.style; }));
    on('[data-gender]', (el) => wSet(() => { s.gender = el.dataset.gender; }));
    on('[data-por]', (el) => wSet(() => { s.portrait = el.dataset.por; s._por = true; }));
    on('[data-col]', (el) => wSet(() => { s.color = el.dataset.col; }));
    const name = $('#wzName', b);
    if (name) name.oninput = () => { s.name = name.value; const p = wProblem('details'); $('#wzNext').disabled = !!p; $('.wprob', b).textContent = p ? '⚠️ ' + p : ''; };
    const bio = $('#wzBio', b);
    if (bio) bio.oninput = () => { s.bio = bio.value; };
  }
  async function openCreator() {
    try { await creationData(); } catch { toast('No se pudieron cargar las opciones de creación'); return; }
    WZ.spec = { name: '', gender: 'f', race: null, cls: null, background: null, kit: null, style: null, ancestry: null, method: 'array', base: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }, plus1: [], skills: [], anySkills: [], expertise: [], cantrips: [], spells: [], elfCantrip: null, portrait: '', color: COLORS[Math.floor(Math.random() * COLORS.length)], bio: '' };
    WZ.step = 0; WZ.busy = false;
    $('#wzBody')._html = null;
    wRender();
    $('#createDialog').showModal();
    $('#wzBody').scrollTop = 0;
  }
  $('#wzBack').onclick = () => { WZ.step = Math.max(0, WZ.step - 1); wRender(); $('#wzBody').scrollTop = 0; };
  $('#wzNext').onclick = () => { const key = wSteps()[WZ.step][0]; if (wProblem(key)) return; WZ.step += 1; wRender(); $('#wzBody').scrollTop = 0; };
  $('#wzCreate').onclick = async () => {
    WZ.busy = true; $('#wzCreate').disabled = true;
    const s = WZ.spec;
    const { _por, ...rest } = s;
    const spec = { ...rest, name: s.name.trim(), style: s.style || undefined, ancestry: s.ancestry || undefined, plus1: s.plus1.length ? s.plus1 : undefined };
    const ok = await send({ type: 'create', spec });
    WZ.busy = false; $('#wzCreate').disabled = false;
    if (ok) { $('#createDialog').close(); toast(`¡${s.name.trim()} se une a la mesa!`, true); }
  };

  // ------------------------------------------------------------------ pestañas móviles
  $$('.mobile-tabs button').forEach((b) => (b.onclick = () => {
    $$('.mobile-tabs button').forEach((x) => x.classList.toggle('active', x === b));
    $$('#game .col').forEach((c) => c.classList.toggle('active', c.dataset.col === b.dataset.tab));
    pinned.log = true; pinned.chat = true; stick();
    if (b.dataset.tab === 'story' && S.art) ambient($('#sceneParticles'), FX.PARTICLES[S.art] || 'dust', true);
  }));

  // ------------------------------------------------------------------ arranque
  applyMotion(motionOn);
  const params = new URLSearchParams(location.search);
  const sala = (params.get('sala') || '').toUpperCase();
  if (sala) {
    $('#codeInput').value = sala;
    const saved = loadCreds(sala);
    if (saved) { Object.assign(S, { code: sala, ...saved }); connect(); }
    else { showHome(); $('#nameInput').focus(); }
  } else showHome();
})();
