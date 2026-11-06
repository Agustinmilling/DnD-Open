// Música compartida de la mesa. El audio no pasa por el servidor: cada navegador reproduce su propio
// reproductor de YouTube (API oficial de iframe) y lo sincroniza con la vista de la sala (v.music).
// Solo el anfitrión manda órdenes (acción {type:'music', op}); el resto solo oye y ajusta su volumen.
const Music = (() => {
  const $ = (s) => document.querySelector(s);
  const KEY = 'mesa:music';
  const DRIFT = 3; // segundos de desviación a partir de los cuales se reajusta la posición
  const ERRORS = {
    2: 'el identificador no es válido', 5: 'el navegador no puede reproducirla', 100: 'el vídeo no existe o es privado',
    101: 'el autor no permite reproducirla fuera de YouTube', 153: 'YouTube rechazó el reproductor (configuración/referer)', 150: 'el autor no permite reproducirla fuera de YouTube',
  };
  let io = null;                    // { send, toast } los pone app.js
  let m = { queue: [], index: 0, playing: false, pos: 0, at: 0 }; // última vista recibida (at = cuándo)
  let inRoom = false, isHost = false, open = false, unlocked = false;
  let api = 'idle';                 // idle | loading | ready | failed
  let player = null, ready = false;
  let cur = { key: '', playing: false }; // lo que le hemos ordenado al reproductor
  let doneKey = '', errKey = '', errText = '', listSig = '', fails = 0, seekT = 0, seekAt = 0, apiScript = null, apiTimer = 0;
  const vol100 = (x) => Math.max(0, Math.min(100, Math.round(+x) || 0));
  const local = { vol: 60, mute: false };
  try { // solo se acepta lo esperado de localStorage
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && Number.isFinite(s.vol)) local.vol = vol100(s.vol);
    if (s) local.mute = s.mute === true;
  } catch {}

  const expected = () => m.pos + (m.playing ? (Date.now() - m.at) / 1000 : 0);
  const act = (op, extra) => io.send({ type: 'music', op, ...extra });
  const trackKey = () => (m.queue[m.index] ? `${m.index}:${m.queue[m.index]}` : '');
  const title = () => { try { return (ready && cur.key === trackKey() && player.getVideoData().title) || ''; } catch { return ''; } };

  // ---------------------------------------------------------------- API de YouTube (carga perezosa)
  // Solo se pide a Google tras el primer clic del jugador (privacidad) y si hay pistas.
  function loadApi() {
    if (window.YT && YT.Player) { api = 'ready'; makePlayer(); return; }
    api = 'loading';
    window.onYouTubeIframeAPIReady = () => { clearTimeout(apiTimer); api = 'ready'; makePlayer(); paint(); };
    if (apiScript) apiScript.remove();
    apiScript = document.createElement('script');
    apiScript.src = 'https://www.youtube.com/iframe_api';
    apiScript.onerror = () => { clearTimeout(apiTimer); api = 'failed'; paint(); };
    document.head.appendChild(apiScript);
    clearTimeout(apiTimer);
    apiTimer = setTimeout(() => { if (api === 'loading') { api = 'failed'; paint(); } }, 10000);
  }
  function makePlayer() {
    if (player) return;
    // YouTube exige que el reproductor sea visible y mida al menos 200x200 (ver .music-frame en style.css).
    player = new YT.Player('musicPlayer', {
      width: 200, height: 200,
      playerVars: { controls: 0, disablekb: 1, fs: 0, playsinline: 1, rel: 0 },
      events: {
        onReady: () => { ready = true; applyLocal(); sync(); paint(); },
        onStateChange: (e) => {
          // solo el cliente del anfitrión avanza la lista, para no enviar un "siguiente" por jugador
          if (e.data === YT.PlayerState.PLAYING) fails = 0;
          if (e.data === YT.PlayerState.ENDED && isHost && cur.key && doneKey !== cur.key) { doneKey = cur.key; act('next'); }
          paint();
        },
        onError: (e) => {
          const why = ERRORS[e.data] || 'error desconocido';
          errKey = cur.key; errText = `La pista ${m.index + 1} no se puede reproducir: ${why}.`;
          if (isHost && cur.key && doneKey !== cur.key) {
            doneKey = cur.key;
            if (++fails >= Math.min(m.queue.length, 3)) { fails = 0; io.toast('Ninguna pista se pudo reproducir. ' + errText); act('pause'); } // corta la cascada de "siguiente"
            else { io.toast(errText + ' Se salta a la siguiente.'); act('next'); }
          }
          paint();
        },
      },
    });
  }

  // ---------------------------------------------------------------- sincronización con la sala
  function sync() {
    if (!ready || !unlocked) return;
    const id = m.queue[m.index];
    if (!id) { if (cur.key) player.stopVideo(); cur = { key: '', playing: false }; return; }
    const key = trackKey(), pos = expected();
    if (key !== cur.key) { // pista nueva: cargarla (en pausa solo se prepara, para que no suene)
      cur = { key, playing: m.playing }; doneKey = '';
      if (m.playing) player.loadVideoById(id, pos); else player.cueVideoById(id, pos);
      return;
    }
    const st = player.getPlayerState(), S = YT.PlayerState;
    if (st === S.ENDED && m.playing && pos + DRIFT < player.getDuration()) { doneKey = ''; player.loadVideoById(id, pos); return; } // repetir la misma pista
    if (m.playing !== cur.playing) { cur.playing = m.playing; if (m.playing) player.playVideo(); else player.pauseVideo(); }
    if ((st === S.PLAYING || st === S.PAUSED) && Math.abs(player.getCurrentTime() - pos) > DRIFT) player.seekTo(pos, true);
  }
  function applyLocal() {
    if (!ready) return;
    player.setVolume(local.vol);
    if (local.mute) player.mute(); else player.unMute();
  }
  function ensureApi() { if (unlocked && m.queue.length && api === 'idle') loadApi(); }
  function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(local)); } catch {} applyLocal(); paint(); }

  /** Lo llama app.js con cada vista (o con null al volver al inicio). */
  function update(v) {
    inRoom = !!v;
    if (!v) { setOpen(false); if (ready && cur.key) player.stopVideo(); cur = { key: '', playing: false }; m = { queue: [], index: 0, playing: false, pos: 0, at: 0 }; return paint(); }
    isHost = !!(v.you && v.you.isHost);
    const x = v.music || {}; // la vista no es de fiar del todo: se valida
    const queue = (Array.isArray(x.queue) ? x.queue : []).filter((id) => typeof id === 'string' && /^[\w-]{11}$/.test(id)).slice(0, 20);
    m = {
      queue, playing: !!x.playing, at: Date.now(),
      index: Number.isInteger(x.index) && x.index >= 0 && x.index < queue.length ? x.index : 0,
      pos: Number.isFinite(x.pos) && x.pos >= 0 ? x.pos : 0,
    };
    ensureApi(); sync(); paint();
  }

  // ---------------------------------------------------------------- panel
  function setOpen(on) { open = on; paint(); }
  function unlock() { // primer clic del jugador: el navegador ya deja sonar
    unlocked = true;
    if (api === 'failed') api = 'idle'; // un nuevo clic reintenta la carga
    ensureApi(); sync();
  }
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
  function iconBtn(text, label, fn) {
    const b = mk('button', 'btn small ghost', text);
    b.type = 'button'; b.title = label; b.setAttribute('aria-label', label); b.onclick = fn;
    return b;
  }

  function paint() {
    const btn = $('#musicBtn');
    btn.classList.toggle('hidden', !inRoom);
    btn.setAttribute('aria-expanded', String(open));
    btn.classList.toggle('pulse', inRoom && !unlocked && m.queue.length > 0 && api !== 'failed');
    $('#musicPanel').classList.toggle('open', open && inRoom);
    const closed = !(open && inRoom);
    $('#musicBody').inert = closed; // cerrado, el panel queda fuera de pantalla: que no reciba foco
    // el reproductor no puede ir inert (podría afectar al audio): se le quita del tabulador y de los lectores de pantalla
    const frame = $('.music-frame'), fr = frame.querySelector('iframe');
    frame.setAttribute('aria-hidden', String(closed));
    if (fr) fr.tabIndex = closed ? -1 : 0;
    const n = m.queue.length, t = title();

    let status;
    if (api === 'failed') status = 'No se pudo cargar el reproductor de YouTube (¿sin conexión?). El resto de la mesa sigue funcionando.';
    else if (!n) status = isHost ? 'Aún no hay música. Pega un enlace de YouTube para empezar.' : 'El anfitrión aún no puso música.';
    else status = `Pista ${m.index + 1} de ${n}${t ? ': ' + t : ''} · ${m.playing ? 'sonando' : 'en pausa'}`
      + (errKey === trackKey() ? '. ' + errText : '') + (unlocked ? '' : '. Activa la música para oírla.');
    if ($('#musicStatus').textContent !== status) $('#musicStatus').textContent = status;
    $('#musicUnlock').classList.toggle('hidden', unlocked || !n || api === 'failed');

    const mute = $('#musicMute');
    mute.textContent = local.mute ? '🔇' : '🔊';
    mute.setAttribute('aria-pressed', String(local.mute));
    $('#musicVol').value = local.vol;

    $('#musicHost').classList.toggle('hidden', !isHost);
    if (isHost) {
      const pp = $('#musicPlay'), label = m.playing ? 'Pausar' : 'Reproducir';
      pp.textContent = m.playing ? '⏸' : '▶'; pp.title = label; pp.setAttribute('aria-label', label);
      for (const id of ['musicPlay', 'musicPrev', 'musicNext']) $('#' + id).disabled = !n;
      $('#musicClear').disabled = !n;
      const seek = $('#musicSeek'), dur = ready && cur.key ? Math.floor(player.getDuration() || 0) : 0;
      seek.disabled = !dur; seek.max = dur;
      if (Date.now() - seekAt > 1500) seek.value = Math.min(dur, Math.floor(expected()));
    }

    const sig = JSON.stringify([m.queue, m.index, isHost, t]);
    if (sig === listSig) return;
    listSig = sig;
    const ol = $('#musicList');
    ol.replaceChildren(...m.queue.map((_, i) => {
      const now = i === m.index, li = mk('li', now ? 'current' : '');
      if (now) li.setAttribute('aria-current', 'true');
      li.appendChild(mk('span', 'music-name', `Pista ${i + 1}${now && t ? ': ' + t : ''}`));
      if (isHost) {
        li.appendChild(iconBtn('▶', `Saltar a la pista ${i + 1}`, () => act('jump', { index: i })));
        li.appendChild(iconBtn('✕', `Quitar la pista ${i + 1}`, () => act('remove', { index: i })));
      }
      return li;
    }));
  }

  function init(deps) {
    io = deps;
    $('#musicBtn').onclick = () => { unlock(); setOpen(!open); };
    $('#musicUnlock').onclick = () => { unlock(); paint(); };
    $('#musicPanel').addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) { setOpen(false); $('#musicBtn').focus(); } });
    $('#musicMute').onclick = () => { local.mute = !local.mute; saveLocal(); };
    $('#musicVol').oninput = (e) => { local.vol = vol100(e.target.value); saveLocal(); };
    $('#musicAdd').onsubmit = async (e) => {
      e.preventDefault();
      const text = $('#musicUrl').value.trim();
      if (text && await io.send({ type: 'music', op: 'add', text })) $('#musicUrl').value = '';
    };
    $('#musicPlay').onclick = () => act(m.playing ? 'pause' : 'play');
    $('#musicPrev').onclick = () => act('prev');
    $('#musicNext').onclick = () => act('next');
    $('#musicClear').onclick = () => act('clear');
    $('#musicSeek').oninput = () => { seekAt = Date.now(); }; // mientras se maneja, la barra no salta
    $('#musicSeek').onchange = (e) => { // con teclado cada flecha lanza un cambio: se agrupan para no gastar el límite de acciones
      const pos = +e.target.value;
      clearTimeout(seekT);
      seekT = setTimeout(() => act('seek', { pos }), 250);
    };
    setInterval(() => { if (open && inRoom) paint(); }, 1000); // mueve la barra de posición y refresca el título
  }

  return { init, update };
})();
