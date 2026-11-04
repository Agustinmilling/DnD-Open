// Ilustraciones de escena (SVG generado), partículas y animaciones de juego.
(() => {
  const reduced = () => document.documentElement.classList.contains('no-motion');

  // ------------------------------------------------------------------ utilidades
  function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }
  const W = 800, H = 220;
  function ridge(r, y, amp, step, color, op = 1) {
    let d = `M0 ${H} L0 ${y}`;
    for (let x = 0; x <= W + step; x += step) d += ` L${x} ${(y - r() * amp).toFixed(1)}`;
    return `<path d="${d} L${W} ${H} Z" fill="${color}" opacity="${op}"/>`;
  }
  function pines(r, base, count, hMin, hMax, color, op = 1) {
    let d = '';
    for (let i = 0; i < count; i++) {
      const x = r() * W, h = hMin + r() * (hMax - hMin), w = h * 0.32;
      d += `M${(x - w).toFixed(1)} ${base} L${x.toFixed(1)} ${(base - h).toFixed(1)} L${(x + w).toFixed(1)} ${base} Z `;
      d += `M${(x - w * 0.8).toFixed(1)} ${(base - h * 0.35).toFixed(1)} L${x.toFixed(1)} ${(base - h * 1.05).toFixed(1)} L${(x + w * 0.8).toFixed(1)} ${(base - h * 0.35).toFixed(1)} Z `;
    }
    return `<path d="${d}" fill="${color}" opacity="${op}"/><rect x="0" y="${base}" width="${W}" height="${H - base}" fill="${color}" opacity="${op}"/>`;
  }
  function oaks(r, base, count, color) {
    let s = '';
    for (let i = 0; i < count; i++) {
      const x = r() * W, h = 70 + r() * 70, rad = 26 + r() * 26;
      s += `<rect x="${x - 4}" y="${base - h}" width="8" height="${h}" fill="${color}"/>`;
      for (let k = 0; k < 4; k++) s += `<circle cx="${x + (r() - 0.5) * rad * 1.4}" cy="${base - h - (r() - 0.2) * rad}" r="${rad * (0.6 + r() * 0.5)}" fill="${color}"/>`;
    }
    return s;
  }
  const sky = (id, a, b, c) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>
    <radialGradient id="${id}g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#${id})"/>`;
  const glow = (id, x, y, r, color, cls = '') => `<circle class="${cls}" cx="${x}" cy="${y}" r="${r}" fill="url(#${id}g)" style="mix-blend-mode:screen" opacity=".55"/><circle cx="${x}" cy="${y}" r="${r * 0.12}" fill="${color}"/>`;

  // ------------------------------------------------------------------ ilustraciones
  const ART = {
    tavern(r) {
      let s = sky('tv', '#2b1a10', '#3b2414', '#1a0f08');
      s += `<rect x="300" y="30" width="200" height="110" rx="6" fill="#0e1624"/><g class="rain-svg">`;
      for (let i = 0; i < 40; i++) { const x = 305 + r() * 190; s += `<line x1="${x}" y1="${35 + r() * 90}" x2="${x - 4}" y2="${45 + r() * 90}" stroke="#7fa3c9" stroke-opacity=".5"/>`; }
      s += `</g><rect x="300" y="30" width="200" height="110" rx="6" fill="none" stroke="#5a3a20" stroke-width="10"/><line x1="400" y1="30" x2="400" y2="140" stroke="#5a3a20" stroke-width="8"/><line x1="300" y1="85" x2="500" y2="85" stroke="#5a3a20" stroke-width="8"/>`;
      for (const x of [120, 680]) s += `<line x1="${x}" y1="0" x2="${x}" y2="50" stroke="#20130a" stroke-width="3"/><g class="flicker">${glow('tv', x, 62, 90, '#ffcf6b')}</g>`;
      s += `<path d="M0 220 L0 175 Q200 160 400 172 T800 168 L800 220Z" fill="#170d06"/>`;
      s += `<rect x="70" y="170" width="140" height="12" fill="#0d0703"/><rect x="590" y="166" width="150" height="12" fill="#0d0703"/><rect x="250" y="182" width="110" height="10" fill="#0d0703"/>`;
      return s;
    },
    forest(r) {
      let s = sky('fo', '#1d3b32', '#2f5a3e', '#0d1e17');
      s += `<g class="sun-rays"><path d="M520 0 L600 220 L470 220 Z" fill="#d8f0b0" opacity=".08"/><path d="M640 0 L700 220 L610 220 Z" fill="#d8f0b0" opacity=".06"/></g>`;
      s += oaks(r, 200, 9, '#173326') + pines(r, 205, 18, 70, 120, '#10261b') + oaks(r, 230, 7, '#0a1710');
      s += `<g class="fog">${ridge(r, 205, 15, 60, '#a7c9b0', 0.12)}</g>`;
      return s;
    },
    ambush(r) {
      let s = ART.forest(r);
      s += `<path d="M120 220 L150 120 Q200 90 250 130 L290 220Z" fill="#1e2a22"/><path d="M520 220 L560 110 Q630 85 680 140 L700 220Z" fill="#1c271f"/>`;
      for (const [x, y] of [[205, 120], [600, 108], [640, 128]]) s += `<g class="eyes"><circle cx="${x}" cy="${y}" r="2.4" fill="#ffd34d"/><circle cx="${x + 9}" cy="${y}" r="2.4" fill="#ffd34d"/></g>`;
      return s;
    },
    river(r) {
      let s = sky('rv', '#2a4150', '#3d5d62', '#13222a');
      s += pines(r, 135, 22, 50, 90, '#14302a', 0.9);
      s += `<rect y="135" width="${W}" height="85" fill="#1d3f4d"/><g class="waves">`;
      for (let i = 0; i < 7; i++) { const y = 145 + i * 11; s += `<path d="M-40 ${y} Q 60 ${y - 5} 160 ${y} T 360 ${y} T 560 ${y} T 760 ${y} T 960 ${y}" fill="none" stroke="#9fd0dd" stroke-opacity="${0.15 + r() * 0.2}" stroke-width="2"/>`; }
      s += `</g><path d="M0 220 L0 190 Q100 175 200 200 L220 220Z" fill="#101a17"/><path d="M800 220 L800 180 Q700 170 640 200 L620 220Z" fill="#101a17"/>`;
      return s;
    },
    ravine(r) {
      let s = sky('rn', '#3a3f55', '#585a6a', '#22232e');
      s += ridge(r, 80, 40, 50, '#2a2d3d', 0.9);
      s += `<path d="M0 220 L0 90 L230 100 L300 220Z" fill="#1a1b25"/><path d="M800 220 L800 85 L560 98 L500 220Z" fill="#1a1b25"/>`;
      s += `<path d="M230 100 Q260 140 285 160" stroke="#6b5640" stroke-width="3" fill="none"/><path d="M560 98 Q530 130 515 150" stroke="#6b5640" stroke-width="3" fill="none"/>`;
      s += `<path d="M640 98 L660 60 L700 60 L720 98 Z" fill="#2b2a33"/><rect x="668" y="72" width="22" height="26" fill="#0c0c10"/>`;
      s += `<g class="fog">${ridge(r, 205, 20, 70, '#c9cde0', 0.15)}</g>`;
      return s;
    },
    ruins(r) {
      let s = sky('ru', '#3b3350', '#5a4a5c', '#1d1824');
      s += glow('ru', 650, 50, 120, '#f6eccf');
      s += ridge(r, 150, 25, 40, '#211c28');
      for (const x of [250, 550]) s += `<rect x="${x - 26}" y="70" width="52" height="110" rx="6" fill="#16131c"/><circle cx="${x}" cy="62" r="20" fill="#16131c"/><path d="M${x - 18} 70 L${x} 130 L${x + 18} 70Z" fill="#100d14"/>`;
      s += `<path d="M330 220 L350 160 L450 160 L470 220Z" fill="#0c0a10"/>`;
      for (let i = 0; i < 5; i++) s += `<rect x="${352 + i * 4}" y="${165 + i * 11}" width="${96 - i * 8}" height="4" fill="#2a2333"/>`;
      s += `<rect x="120" y="165" width="40" height="22" fill="#1b1622"/><g class="flicker">${glow('ru', 140, 158, 40, '#ff8a4a')}</g>`;
      return s;
    },
    crypt(r) {
      let s = sky('cr', '#141821', '#1d2230', '#0a0c11');
      for (let i = 0; i < 6; i++) { const x = 40 + i * 140; s += `<path d="M${x} 220 L${x} 90 Q${x + 50} 30 ${x + 100} 90 L${x + 100} 220" fill="#0b0d13" stroke="#2b3142" stroke-width="3"/>`; }
      for (let i = 0; i < 6; i++) { const x = 70 + i * 140; s += `<rect x="${x}" y="120" width="40" height="18" fill="#05060a"/><rect x="${x}" y="150" width="40" height="18" fill="#05060a"/>`; }
      s += `<g class="flicker">${glow('cr', 400, 70, 110, '#9fd7ff')}</g><g class="fog">${ridge(r, 210, 12, 50, '#8da0c0', 0.18)}</g>`;
      return s;
    },
    tunnel(r) {
      let s = `<defs><radialGradient id="tnc" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#2a2a1f"/><stop offset=".5" stop-color="#14140e"/><stop offset="1" stop-color="#050504"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#tnc)"/>`;
      for (let i = 0; i < 5; i++) { const k = 1 - i * 0.18; s += `<path d="M${400 - 380 * k} 220 L${400 - 380 * k} ${110 - 60 * k} Q400 ${-40 * k + 40} ${400 + 380 * k} ${110 - 60 * k} L${400 + 380 * k} 220" fill="none" stroke="#3a3626" stroke-opacity="${0.6 - i * 0.1}" stroke-width="${10 - i * 1.5}"/>`; }
      for (let i = 0; i < 8; i++) s += `<g class="eyes"><circle cx="${300 + r() * 200}" cy="${150 + r() * 40}" r="1.6" fill="#ff5d5d"/></g>`;
      return s;
    },
    door(r) {
      let s = sky('dr', '#1b1712', '#2a2219', '#0e0b08');
      for (let y = 0; y < H; y += 24) for (let x = (y / 24) % 2 ? -30 : 0; x < W; x += 60) s += `<rect x="${x + 1}" y="${y + 1}" width="58" height="22" fill="#231c14" stroke="#120e09"/>`;
      s += `<circle cx="400" cy="120" r="95" fill="#15110c" stroke="#3b3022" stroke-width="8"/>`;
      s += `<g class="rune-ring" style="transform-origin:400px 120px"><circle cx="400" cy="120" r="70" fill="none" stroke="#ff9d3b" stroke-width="3" stroke-dasharray="6 10"/></g>`;
      s += `<g class="flicker"><circle cx="400" cy="120" r="70" fill="none" stroke="#ffc46b" stroke-opacity=".25" stroke-width="12"/></g>`;
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; s += `<text x="${400 + Math.cos(a) * 48}" y="${124 + Math.sin(a) * 48}" fill="#ffb760" font-size="14" text-anchor="middle" class="flicker">ᚱ</text>`; }
      return s;
    },
    lair(r) {
      let s = sky('lr', '#0d1a12', '#13261a', '#050a07');
      let d = 'M0 0';
      for (let x = 0; x <= W; x += 30) d += ` L${x} ${10 + r() * 15} L${x + 15} ${40 + r() * 50}`;
      s += `<path d="${d} L${W} 0Z" fill="#050806"/>`;
      s += `<path d="M0 220 L0 180 Q200 150 400 175 T800 170 L800 220Z" fill="#070d09"/><ellipse cx="560" cy="195" rx="90" ry="14" fill="#000"/>`;
      for (let i = 0; i < 9; i++) { const x = r() * W, y = 170 + r() * 30; s += `<g class="pulse">${glow('lr', x, y, 26, '#7dff9a')}</g><path d="M${x - 6} ${y + 6} Q${x} ${y - 8} ${x + 6} ${y + 6}Z" fill="#59d97a"/>`; }
      s += `<path d="M280 180 L300 120 L330 110 L350 125 L360 180Z" fill="#0a120c"/><g class="eyes"><circle cx="318" cy="128" r="2.6" fill="#ff4d4d"/><circle cx="330" cy="128" r="2.6" fill="#ff4d4d"/></g>`;
      return s;
    },
    village(r) {
      let s = sky('vl', '#141c33', '#2a2c4a', '#120f1a');
      s += glow('vl', 120, 45, 80, '#f8f0d8');
      s += ridge(r, 140, 30, 60, '#1a1a2c');
      for (let i = 0; i < 7; i++) {
        const x = 40 + i * 110 + r() * 20, w = 70 + r() * 20, h = 45 + r() * 20, y = 190 - h;
        s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0f0d16"/><path d="M${x - 8} ${y} L${x + w / 2} ${y - 30} L${x + w + 8} ${y}Z" fill="#0b0a10"/>`;
        s += `<rect class="flicker" x="${x + w / 2 - 8}" y="${y + 12}" width="16" height="14" fill="#ffc35a" opacity=".85"/>`;
      }
      s += `<rect y="188" width="${W}" height="32" fill="#09080d"/>`;
      for (const x of [260, 520]) s += `<g class="flicker">${glow('vl', x, 178, 40, '#ff9f45')}</g>`;
      return s;
    },
  };
  ART.default = ART.forest;
  const PARTICLES = { tavern: 'rain', forest: 'fireflies', ambush: 'leaves', river: 'mist', ravine: 'mist', ruins: 'dust', crypt: 'dust', tunnel: 'dust', door: 'embers', lair: 'spores', village: 'embers', lobby: 'embers' };

  function sceneArt(art) {
    const fn = ART[art] || ART.default;
    const r = rng([...String(art)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
    return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${fn(r)}</svg>`;
  }

  // ------------------------------------------------------------------ partículas
  function particles(canvas, kind) {
    if (canvas._stop) canvas._stop();
    const ctx = canvas.getContext('2d');
    let raf = 0;
    const parts = [];
    const resize = () => { canvas.width = canvas.clientWidth * devicePixelRatio; canvas.height = canvas.clientHeight * devicePixelRatio; };
    resize();
    const N = { rain: 90, fireflies: 26, leaves: 18, mist: 14, dust: 40, embers: 34, spores: 30 }[kind] || 20;
    const spawn = (init) => {
      const w = canvas.width, h = canvas.height, d = devicePixelRatio;
      const p = { x: Math.random() * w, y: init ? Math.random() * h : (kind === 'embers' || kind === 'spores' ? h + 5 : -5), t: Math.random() * 6.28 };
      if (kind === 'rain') Object.assign(p, { vx: -1.2 * d, vy: (7 + Math.random() * 5) * d, l: 10 * d });
      else if (kind === 'fireflies') Object.assign(p, { vx: 0, vy: 0, r: (1 + Math.random() * 1.5) * d, y: Math.random() * h });
      else if (kind === 'leaves') Object.assign(p, { vx: (0.6 + Math.random()) * d, vy: (0.6 + Math.random() * 0.8) * d, r: (2 + Math.random() * 2) * d });
      else if (kind === 'mist') Object.assign(p, { vx: (0.15 + Math.random() * 0.3) * d, vy: 0, r: (40 + Math.random() * 60) * d, y: h * (0.5 + Math.random() * 0.5) });
      else if (kind === 'dust') Object.assign(p, { vx: (Math.random() - 0.5) * 0.2 * d, vy: (0.05 + Math.random() * 0.2) * d, r: (0.6 + Math.random()) * d });
      else Object.assign(p, { vx: (Math.random() - 0.5) * 0.6 * d, vy: -(0.4 + Math.random() * 0.9) * d, r: (0.8 + Math.random() * 1.6) * d });
      return p;
    };
    for (let i = 0; i < N; i++) parts.push(spawn(true));
    const tick = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.t += 0.02;
        if (kind === 'fireflies') { p.x += Math.cos(p.t * 1.3) * 0.6; p.y += Math.sin(p.t) * 0.4; }
        else { p.x += p.vx + (kind === 'leaves' ? Math.sin(p.t) * 0.8 : 0); p.y += p.vy; }
        if (p.y > h + 10 || p.y < -10 || p.x > w + 120 || p.x < -120) { parts[i] = spawn(false); if (kind === 'mist') parts[i].x = -100; continue; }
        if (kind === 'rain') { ctx.strokeStyle = 'rgba(170,200,235,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx, p.y + p.l); ctx.stroke(); }
        else if (kind === 'mist') { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, 'rgba(220,230,240,.07)'); g.addColorStop(1, 'rgba(220,230,240,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); }
        else {
          const a = kind === 'fireflies' ? 0.4 + 0.6 * Math.abs(Math.sin(p.t * 2)) : kind === 'dust' ? 0.35 : 0.8;
          ctx.fillStyle = { fireflies: `rgba(220,255,140,${a})`, leaves: 'rgba(160,120,50,.8)', dust: `rgba(230,220,200,${a})`, embers: `rgba(255,${140 + Math.floor(Math.sin(p.t) * 40)},60,${a})`, spores: `rgba(140,255,170,${0.4 + 0.4 * Math.sin(p.t)})` }[kind];
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    canvas._stop = () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); ctx.clearRect(0, 0, canvas.width, canvas.height); };
    if (!reduced()) tick();
  }

  // ------------------------------------------------------------------ efectos de juego
  const layer = () => document.getElementById('fxLayer');

  function floatText(el, text, cls) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = `float-num ${cls}`;
    f.textContent = text;
    f.style.left = `${r.left + r.width / 2 + (Math.random() - 0.5) * r.width * 0.4}px`;
    f.style.top = `${r.top + r.height * 0.35}px`;
    layer().appendChild(f);
    setTimeout(() => f.remove(), 1500);
  }
  function pulse(el, cls, ms = 600) {
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  }
  function burst(x, y, color, n = 14) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      s.className = 'spark';
      const a = (i / n) * Math.PI * 2, d = 40 + Math.random() * 50;
      s.style.left = `${x}px`; s.style.top = `${y}px`; s.style.background = color;
      s.style.setProperty('--dx', `${Math.cos(a) * d}px`); s.style.setProperty('--dy', `${Math.sin(a) * d}px`);
      layer().appendChild(s);
      setTimeout(() => s.remove(), 800);
    }
  }
  function stamp(text, cls) {
    const s = document.createElement('div');
    s.className = `stamp ${cls}`;
    s.innerHTML = `<span>${text}</span>`;
    layer().appendChild(s);
    setTimeout(() => s.remove(), 1900);
  }

  // dado d20 animado (icosaedro estilizado)
  const D20 = `<svg viewBox="0 0 100 100"><polygon class="d-face" points="50,4 92,28 92,72 50,96 8,72 8,28"/><polygon class="d-tri" points="50,22 78,70 22,70"/><g class="d-lines"><line x1="50" y1="4" x2="50" y2="22"/><line x1="92" y1="28" x2="78" y2="70"/><line x1="8" y1="28" x2="22" y2="70"/><line x1="50" y1="96" x2="78" y2="70"/><line x1="50" y1="96" x2="22" y2="70"/><line x1="92" y1="72" x2="78" y2="70"/><line x1="8" y1="72" x2="22" y2="70"/><line x1="92" y1="28" x2="50" y2="22"/><line x1="8" y1="28" x2="50" y2="22"/></g></svg>`;
  let diceTray = null;
  function rollDie(nat, total, success, label, color) {
    if (!diceTray) { diceTray = document.createElement('div'); diceTray.className = 'dice-roll-tray'; layer().appendChild(diceTray); }
    const d = document.createElement('div');
    const res = nat === 20 ? 'nat20' : nat === 1 ? 'nat1' : success === true ? 'ok' : success === false ? 'ko' : '';
    d.className = `die3d ${res}`;
    if (color) d.style.setProperty('--c', color);
    d.innerHTML = `<div class="die-body">${D20}<b class="die-num">${nat}</b></div>${total != null && total !== nat ? `<small>= ${total}</small>` : ''}${label ? `<em>${label}</em>` : ''}`;
    diceTray.appendChild(d);
    if (reduced()) { d.classList.add('landed'); } else {
      const num = d.querySelector('.die-num');
      let k = 0;
      const iv = setInterval(() => { num.textContent = 1 + Math.floor(Math.random() * 20); if (++k > 8) { clearInterval(iv); num.textContent = nat; d.classList.add('landed'); if (nat === 20) { const r = d.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, '#ffd76a', 18); } } }, 60);
    }
    setTimeout(() => d.classList.add('out'), 1900);
    setTimeout(() => d.remove(), 2300);
  }

  function levelUp(name, level) {
    const o = document.createElement('div');
    o.className = 'levelup-overlay';
    o.innerHTML = `<div class="rays"></div><div class="lv-card"><div class="lv-star">★</div><div class="lv-title">¡Subida de nivel!</div><div class="lv-name">${name}</div><div class="lv-num">Nivel ${level}</div></div>`;
    o.onclick = () => o.remove();
    layer().appendChild(o);
    setTimeout(() => o.classList.add('out'), 2600);
    setTimeout(() => o.remove(), 3100);
  }

  function sceneCard(title) {
    const c = document.createElement('div');
    c.className = 'scene-card';
    c.innerHTML = `<div class="sc-line"></div><div class="sc-title">${title}</div><div class="sc-line"></div>`;
    layer().appendChild(c);
    setTimeout(() => c.remove(), 2600);
  }

  const SPELL_COLORS = { fuego: '#ff8a3d', 'frío': '#7fd3ff', radiante: '#ffe27a', fuerza: '#c59bff', heal: '#7dff9a' };

  /** Reproduce un efecto. find(id) devuelve el elemento de la tarjeta de ese combatiente. */
  function play(fx, ctx) {
    if (reduced() && !['levelup'].includes(fx.kind)) {
      // sin animaciones: solo números flotantes discretos
      if (fx.kind === 'dmg') floatText(ctx.find(fx.target), `−${fx.amount}`, 'dmg');
      if (fx.kind === 'heal') floatText(ctx.find(fx.target), `+${fx.amount}`, 'heal');
      return;
    }
    const el = fx.target ? ctx.find(fx.target) : null;
    switch (fx.kind) {
      case 'scene': sceneCard(fx.title); break;
      case 'combatStart': stamp('¡Combate!', 'combat'); document.body.classList.add('in-combat-flash'); setTimeout(() => document.body.classList.remove('in-combat-flash'), 900); break;
      case 'victory': stamp('¡Victoria!', 'victory'); burst(innerWidth / 2, innerHeight / 2, '#ffd76a', 30); break;
      case 'defeat': stamp('Derrota', 'defeat'); break;
      case 'turn': if (fx.who === ctx.me) stamp('Tu turno', 'turn'); pulse(ctx.find(fx.who), 'fx-turn', 900); break;
      case 'd20': rollDie(fx.nat, fx.total, fx.success, ctx.name(fx.who), ctx.color(fx.who)); break;
      case 'group': break;
      case 'attack':
        if (fx.nat) rollDie(fx.nat, fx.total, fx.hit, ctx.name(fx.who), ctx.color(fx.who));
        pulse(ctx.find(fx.who), 'fx-lunge', 400);
        if (!fx.hit) { setTimeout(() => { floatText(el, fx.shield ? '¡Escudo!' : fx.shove ? 'Resiste' : 'Falla', 'miss'); pulse(el, 'fx-dodge', 500); }, 500); }
        else if (fx.shove) setTimeout(() => { floatText(el, '¡Derribado!', 'miss'); pulse(el, 'fx-hit', 500); }, 500);
        if (fx.crit) setTimeout(() => { document.body.classList.add('shake'); setTimeout(() => document.body.classList.remove('shake'), 400); }, 450);
        break;
      case 'dmg': setTimeout(() => { floatText(el, `−${fx.amount}`, fx.crit ? 'dmg crit' : 'dmg'); pulse(el, 'fx-hit', 500); }, 520); break;
      case 'heal': floatText(el, `+${fx.amount}`, 'heal'); pulse(el, 'fx-heal', 900); break;
      case 'kill': setTimeout(() => { pulse(el, 'fx-kill', 900); if (el) { const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, '#ff7a5a', 12); } }, 700); break;
      case 'down': setTimeout(() => pulse(el, 'fx-down', 1200), 700); break;
      case 'spell': { const c = fx.heal ? SPELL_COLORS.heal : SPELL_COLORS[fx.dmgType] || '#c59bff'; const w = ctx.find(fx.who); if (w) { w.style.setProperty('--spell', c); pulse(w, 'fx-spell', 900); } break; }
      case 'buff': for (const t of fx.targets || []) pulse(ctx.find(t), 'fx-heal', 900); break;
      case 'levelup': levelUp(fx.name, fx.level); break;
      case 'gold': { const lb = document.getElementById('lootBox'); floatText(lb, `${fx.amount > 0 ? '+' : ''}${fx.amount} po`, fx.amount > 0 ? 'gold' : 'miss'); break; }
      default:
    }
  }

  window.FX = { sceneArt, particles, play, rollDie, reduced, PARTICLES };
})();
