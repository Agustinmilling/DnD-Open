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
    // ---------- costa
    harbor(r) {
      let s = sky('hb', '#3a2c4a', '#a35a4a', '#2a1c24');
      s += glow('hb', 640, 120, 120, '#ffd59a');
      s += ridge(r, 110, 25, 50, '#2a1f2c', 0.9);
      for (let i = 0; i < 9; i++) { const x = 20 + i * 42 + r() * 10, w = 30 + r() * 12, h = 22 + r() * 18, y = 120 - h - i * 2; s += `<rect x="${x}" y="${y}" width="${w}" height="${h + 20}" fill="#e9dccb" opacity=".85"/><path d="M${x - 4} ${y} L${x + w / 2} ${y - 12} L${x + w + 4} ${y}Z" fill="#8a4a3a"/><rect class="flicker" x="${x + w / 2 - 4}" y="${y + 8}" width="7" height="7" fill="#ffcf6b"/>`; }
      s += `<rect y="140" width="${W}" height="80" fill="#24354a"/><g class="waves">`;
      for (let i = 0; i < 6; i++) { const y = 150 + i * 12; s += `<path d="M-40 ${y} Q 60 ${y - 4} 160 ${y} T 360 ${y} T 560 ${y} T 760 ${y} T 960 ${y}" fill="none" stroke="#ffd9a8" stroke-opacity="${0.12 + r() * 0.15}" stroke-width="2"/>`; }
      s += `</g><rect x="420" y="150" width="260" height="8" fill="#3a2a1c"/>`;
      for (let x = 430; x < 680; x += 40) s += `<rect x="${x}" y="150" width="6" height="40" fill="#2a1d13"/>`;
      for (const [x, y] of [[520, 175], [610, 190], [300, 185]]) s += `<path d="M${x - 30} ${y} Q${x} ${y + 14} ${x + 30} ${y} Z" fill="#1a120c"/><line x1="${x}" y1="${y}" x2="${x}" y2="${y - 34}" stroke="#1a120c" stroke-width="2"/>`;
      for (let i = 0; i < 5; i++) { const x = 100 + r() * 600, y = 30 + r() * 50; s += `<path class="eyes" d="M${x - 8} ${y} Q${x - 4} ${y - 5} ${x} ${y} Q${x + 4} ${y - 5} ${x + 8} ${y}" fill="none" stroke="#2a1f2c" stroke-width="2"/>`; }
      return s;
    },
    coast(r) {
      let s = sky('cs', '#5b6772', '#8a9298', '#3b4248');
      s += `<rect y="120" width="${W}" height="40" fill="#3e5562"/><g class="waves">`;
      for (let i = 0; i < 4; i++) { const y = 126 + i * 9; s += `<path d="M-40 ${y} Q 60 ${y - 4} 160 ${y} T 360 ${y} T 560 ${y} T 760 ${y} T 960 ${y}" fill="none" stroke="#e8f0f2" stroke-opacity="${0.2 + r() * 0.2}" stroke-width="2"/>`; }
      s += `</g><path d="M0 220 L0 160 Q200 145 420 158 T800 150 L800 220Z" fill="#7a6a55"/>`;
      s += `<path d="M380 165 L420 95 L470 92 L520 120 L560 168 Z" fill="#2b2118"/><path d="M430 95 L450 40 M470 92 L500 30" stroke="#2b2118" stroke-width="5"/><path d="M450 40 L420 70 L452 66Z" fill="#cfc4b0" opacity=".6"/>`;
      for (let i = 0; i < 6; i++) { const x = r() * W, y = 175 + r() * 30; s += `<ellipse cx="${x}" cy="${y}" rx="${18 + r() * 20}" ry="${6 + r() * 5}" fill="#3a332b"/>`; }
      for (const [x, y] of [[250, 190], [640, 200]]) s += `<g class="eyes"><ellipse cx="${x}" cy="${y}" rx="14" ry="7" fill="#9b3b25"/><path d="M${x - 14} ${y - 2} l-8 -8 M${x + 14} ${y - 2} l8 -8" stroke="#9b3b25" stroke-width="3"/></g>`;
      return s;
    },
    lighthouse(r) {
      let s = sky('lh', '#0f1730', '#1f2c4a', '#0a0f1e');
      for (let i = 0; i < 40; i++) s += `<circle cx="${r() * W}" cy="${r() * 110}" r="${r() * 1.3}" fill="#fff" opacity="${0.3 + r() * 0.6}"/>`;
      s += `<g class="beam"><path d="M560 52 L900 0 L900 110 Z" fill="#fff3c4" opacity=".14"/><path d="M560 52 L200 10 L200 90 Z" fill="#fff3c4" opacity=".08"/></g>`;
      s += `<path d="M380 220 L420 140 Q520 120 640 130 L720 220Z" fill="#141a26"/>`;
      s += `<path d="M540 140 L548 60 L572 60 L580 140Z" fill="#e8e1d2"/><rect x="546" y="78" width="28" height="9" fill="#a33a2a"/><rect x="547" y="104" width="27" height="9" fill="#a33a2a"/>`;
      s += `<rect x="544" y="42" width="32" height="18" fill="#1b2233"/><g class="flicker">${glow('lh', 560, 52, 70, '#fff1b0')}</g><path d="M540 42 L560 30 L580 42Z" fill="#a33a2a"/>`;
      s += `<rect y="175" width="${W}" height="45" fill="#0d1626"/><g class="waves">`;
      for (let i = 0; i < 4; i++) { const y = 182 + i * 10; s += `<path d="M-40 ${y} Q 60 ${y - 4} 160 ${y} T 360 ${y} T 560 ${y} T 760 ${y} T 960 ${y}" fill="none" stroke="#8fb3d9" stroke-opacity="${0.15 + r() * 0.15}" stroke-width="2"/>`; }
      return s + '</g>';
    },
    cove(r) {
      let s = sky('cv', '#0d1020', '#1b1f33', '#07080f');
      s += glow('cv', 120, 40, 60, '#e6e9f5');
      s += `<path d="M0 220 L0 60 L120 80 L190 220Z" fill="#090a10"/><path d="M800 220 L800 50 L660 70 L600 220Z" fill="#090a10"/>`;
      s += `<rect y="150" width="${W}" height="70" fill="#101a2a"/><path d="M150 220 Q400 150 650 220Z" fill="#26201c"/>`;
      s += `<path d="M430 150 Q470 160 520 150 L512 160 L438 160Z" fill="#05060a"/><line x1="475" y1="150" x2="475" y2="80" stroke="#05060a" stroke-width="3"/><path d="M477 84 L510 140 L477 140Z" fill="#14161f"/>`;
      for (const x of [300, 380, 560]) s += `<g class="flicker">${glow('cv', x, 196, 40, '#ff9a4a')}</g><path d="M${x - 6} 200 L${x} 186 L${x + 6} 200Z" fill="#ffb15e"/>`;
      s += `<rect x="330" y="176" width="32" height="20" fill="none" stroke="#5a4630" stroke-width="2"/>`;
      for (let x = 336; x < 362; x += 6) s += `<line x1="${x}" y1="176" x2="${x}" y2="196" stroke="#5a4630" stroke-width="1.5"/>`;
      return s;
    },
    ship(r) {
      let s = sky('sp', '#2a1d12', '#1c140c', '#0c0805');
      for (let i = 0; i < 9; i++) { const x = 20 + i * 95; s += `<path d="M${x} 220 Q${x - 30} 110 ${x + 10} 10" fill="none" stroke="#3b2a1a" stroke-width="12"/>`; }
      for (let y = 0; y < H; y += 22) s += `<line x1="0" y1="${y}" x2="${W}" y2="${y + 4}" stroke="#20160d" stroke-width="2"/>`;
      s += `<g class="sway"><line x1="400" y1="0" x2="400" y2="70" stroke="#111" stroke-width="2"/><rect x="390" y="70" width="20" height="26" rx="3" fill="#3a2a16"/><g class="flicker">${glow('sp', 400, 84, 90, '#ffbf5e')}</g></g>`;
      for (const [x, w] of [[90, 80], [620, 110], [700, 60]]) s += `<rect x="${x}" y="${190 - w * 0.6}" width="${w}" height="${w * 0.6}" fill="#24180e" stroke="#3e2b18"/>`;
      s += `<rect x="285" y="40" width="10" height="180" fill="#2c1e12"/><path d="M270 120 Q290 140 310 120" fill="none" stroke="#8a7350" stroke-width="3"/>`;
      return s;
    },
    cliffs(r) {
      let s = sky('cl', '#3d4a5e', '#6b7a88', '#2a323d');
      s += `<rect y="150" width="${W}" height="70" fill="#253545"/><g class="waves">`;
      for (let i = 0; i < 5; i++) { const y = 156 + i * 11; s += `<path d="M-40 ${y} Q 60 ${y - 4} 160 ${y} T 360 ${y} T 560 ${y} T 760 ${y} T 960 ${y}" fill="none" stroke="#e1eef5" stroke-opacity="${0.15 + r() * 0.2}" stroke-width="2"/>`; }
      s += `</g><path d="M0 0 L0 220 L330 220 Q300 160 340 120 Q300 80 360 40 L380 0Z" fill="#1c1d24"/>`;
      for (let i = 0; i < 9; i++) { const x = 60 + r() * 240, y = 30 + r() * 120; s += `<ellipse cx="${x}" cy="${y}" rx="9" ry="6" fill="#06070a"/><g class="eyes"><circle cx="${x - 3}" cy="${y}" r="1.4" fill="#ff5d5d"/><circle cx="${x + 3}" cy="${y}" r="1.4" fill="#ff5d5d"/></g>`; }
      s += `<path d="M300 220 L340 180 L800 190 L800 220Z" fill="#3a3530"/>`;
      s += `<g class="fog">${ridge(r, 200, 15, 60, '#e5ecf2', 0.15)}</g>`;
      return s;
    },
    seacave(r) {
      let s = `<defs><radialGradient id="scg" cx=".5" cy=".6" r=".7"><stop offset="0" stop-color="#1d4a46"/><stop offset=".55" stop-color="#0c1f22"/><stop offset="1" stop-color="#030809"/></radialGradient><radialGradient id="scgg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#scg)"/>`;
      let d = 'M0 0';
      for (let x = 0; x <= W; x += 40) d += ` L${x} ${20 + r() * 20} L${x + 20} ${50 + r() * 40}`;
      s += `<path d="${d} L${W} 0Z" fill="#020506"/>`;
      for (const [x, len] of [[250, 60], [400, 90], [560, 70]]) s += `<g class="sway" style="transform-origin:${x}px 0px"><line x1="${x}" y1="0" x2="${x}" y2="${len}" stroke="#0a1112" stroke-width="2"/><path d="M${x - 16} ${len + 26} Q${x - 14} ${len} ${x} ${len} Q${x + 14} ${len} ${x + 16} ${len + 26}Z" fill="#3c6b55"/></g>`;
      s += `<rect y="160" width="${W}" height="60" fill="#081a1d"/><g class="waves">`;
      for (let i = 0; i < 5; i++) { const y = 166 + i * 10; s += `<path d="M-40 ${y} Q 60 ${y - 4} 160 ${y} T 360 ${y} T 560 ${y} T 760 ${y} T 960 ${y}" fill="none" stroke="#7fe0c4" stroke-opacity="${0.1 + r() * 0.15}" stroke-width="2"/>`; }
      s += `</g><g class="pulse"><circle cx="680" cy="150" r="70" fill="url(#scgg)" opacity=".25" style="mix-blend-mode:screen"/></g>`;
      return s;
    },
    abyss(r) {
      let s = sky('ab', '#03100c', '#071a14', '#010403');
      s += `<g class="pulse">${glow('ab', 400, 170, 200, '#5dff9a')}</g>`;
      s += `<ellipse cx="400" cy="185" rx="170" ry="26" fill="#0a2a1c"/><ellipse cx="400" cy="185" rx="150" ry="20" fill="#1b6a44" opacity=".5" class="pulse"/>`;
      for (let i = 0; i < 9; i++) { const x = 140 + i * 65 + r() * 10, h = 40 + r() * 16; s += `<path d="M${x - 9} 210 L${x - 7} ${210 - h} Q${x} ${200 - h - 14} ${x + 7} ${210 - h} L${x + 9} 210Z" fill="#020604"/>`; }
      s += `<path d="M390 150 L396 96 Q400 84 404 96 L410 150Z" fill="#020604"/><line x1="404" y1="100" x2="430" y2="80" stroke="#020604" stroke-width="3"/>`;
      let d = 'M0 0';
      for (let x = 0; x <= W; x += 30) d += ` L${x} ${10 + r() * 15} L${x + 15} ${30 + r() * 40}`;
      return s + `<path d="${d} L${W} 0Z" fill="#000"/>`;
    },
    // ---------- ciudad
    city(r) {
      let s = sky('ct', '#2a2a3a', '#4a4250', '#1a1720');
      s += glow('ct', 680, 50, 70, '#e8e2d0');
      for (let i = 0; i < 14; i++) { const x = i * 60 + r() * 20, w = 50 + r() * 30, h = 60 + r() * 70; s += `<rect x="${x}" y="${190 - h}" width="${w}" height="${h}" fill="#17141c"/><path d="M${x - 4} ${190 - h} L${x + w / 2} ${170 - h} L${x + w + 4} ${190 - h}Z" fill="#120f16"/>`; if (r() < 0.6) s += `<rect class="flicker" x="${x + w / 2 - 4}" y="${200 - h}" width="7" height="9" fill="#ffc35a" opacity=".8"/>`; }
      s += `<rect x="370" y="30" width="44" height="160" fill="#100d14"/><path d="M362 30 L392 0 L422 30Z" fill="#0c0a10"/><circle cx="392" cy="60" r="10" fill="#2a2430"/>`;
      for (const x of [140, 600]) s += `<path d="M${x} 200 Q${x - 12} 120 ${x} 70 Q${x + 12} 120 ${x} 200Z" fill="#0d1a12"/>`;
      s += `<rect y="190" width="${W}" height="30" fill="#0b090d"/>`;
      return s;
    },
    rooftops(r) {
      let s = sky('rt', '#141a33', '#2b2f52', '#0d0f1d');
      s += glow('rt', 140, 50, 80, '#f5efd8');
      for (let i = 0; i < 7; i++) {
        const x = i * 125 - 20, y = 110 + r() * 40, w = 140;
        s += `<path d="M${x} 220 L${x} ${y} L${x + w / 2} ${y - 40} L${x + w} ${y} L${x + w} 220Z" fill="${i % 2 ? '#1c1a26' : '#221f2d'}"/>`;
        s += `<rect x="${x + 25 + r() * 60}" y="${y - 50}" width="14" height="30" fill="#151320"/>`;
      }
      s += `<path d="M180 120 Q320 145 460 118" fill="none" stroke="#3a3650" stroke-width="1.5"/>`;
      for (let x = 210; x < 440; x += 38) s += `<rect class="sway" x="${x}" y="${128 + Math.sin(x) * 3}" width="18" height="${14 + r() * 8}" fill="#cfc8e0" opacity=".55"/>`;
      s += `<path d="M590 95 l12 -26 l8 6 l-6 22 l10 18 l-8 4 l-8 -14 l-8 16 l-8 -4Z" fill="#06060b"/><path d="M596 70 l-18 10 l20 4Z" fill="#3a3a4a"/>`;
      return s;
    },
    manor(r) {
      let s = sky('mn', '#101828', '#22283a', '#0b0e16');
      s += glow('mn', 660, 40, 60, '#eeeadc');
      s += `<rect x="190" y="60" width="420" height="140" fill="#1a1820"/><path d="M180 60 L400 10 L620 60Z" fill="#141219"/>`;
      for (let row = 0; row < 2; row++) for (let i = 0; i < 7; i++) { const x = 215 + i * 56, y = 80 + row * 52; s += `<rect class="${r() < 0.6 ? 'flicker' : ''}" x="${x}" y="${y}" width="22" height="32" rx="10" fill="${r() < 0.6 ? '#ffc96a' : '#2a2632'}" opacity=".85"/>`; }
      s += `<rect x="380" y="150" width="40" height="50" rx="18" fill="#2a1f14"/>`;
      s += `<rect y="165" width="${W}" height="55" fill="#0e110c"/>`;
      for (let x = 0; x < W; x += 24) s += `<circle cx="${x + 12}" cy="${172 + r() * 6}" r="16" fill="#132016"/>`;
      for (const x of [300, 500]) s += `<line x1="${x}" y1="200" x2="${x}" y2="150" stroke="#222" stroke-width="3"/><g class="flicker">${glow('mn', x, 146, 30, '#ffbe63')}</g>`;
      return s;
    },
    market(r) {
      let s = sky('mk', '#c88b4a', '#8f5a3a', '#3a2418');
      for (let i = 0; i < 12; i++) { const x = i * 70 + r() * 10, h = 70 + r() * 50; s += `<rect x="${x}" y="${150 - h}" width="64" height="${h}" fill="#5a3a26" opacity=".6"/>`; }
      const cols = ['#b5402f', '#2f6db5', '#d6a12f', '#3f8f4a', '#8d3fae'];
      for (let i = 0; i < 6; i++) {
        const x = 20 + i * 130, c = cols[i % cols.length];
        let d = `M${x} 120`;
        for (let k = 0; k <= 6; k++) d += ` L${x + k * 18} ${k % 2 ? 136 : 120}`;
        s += `<rect x="${x}" y="100" width="108" height="20" fill="${c}"/><path d="${d}" fill="${c}"/><line x1="${x + 4}" y1="120" x2="${x + 4}" y2="200" stroke="#2a1a10" stroke-width="3"/><line x1="${x + 104}" y1="120" x2="${x + 104}" y2="200" stroke="#2a1a10" stroke-width="3"/><rect x="${x}" y="170" width="108" height="14" fill="#3a2414"/>`;
        for (let k = 0; k < 5; k++) s += `<circle cx="${x + 12 + k * 20}" cy="166" r="6" fill="${cols[(i + k) % cols.length]}"/>`;
      }
      s += `<path d="M0 60 Q400 90 800 55" fill="none" stroke="#2a1a10"/>`;
      for (let x = 40; x < W; x += 90) s += `<g class="flicker">${glow('mk', x, 66 + Math.sin(x) * 8, 22, '#ffd27a')}</g>`;
      return s + `<rect y="200" width="${W}" height="20" fill="#2a1a10"/>`;
    },
    sewer(r) {
      let s = `<defs><radialGradient id="swc" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#26301f"/><stop offset=".5" stop-color="#121710"/><stop offset="1" stop-color="#050604"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#swc)"/>`;
      for (let y = 0; y < H; y += 18) for (let x = (y / 18) % 2 ? -20 : 0; x < W; x += 40) s += `<rect x="${x + 1}" y="${y + 1}" width="38" height="16" fill="none" stroke="#2b3324" stroke-opacity=".5"/>`;
      for (let i = 0; i < 4; i++) { const k = 1 - i * 0.2; s += `<path d="M${400 - 360 * k} 220 L${400 - 360 * k} ${130 - 50 * k} Q400 ${-20 * k + 30} ${400 + 360 * k} ${130 - 50 * k} L${400 + 360 * k} 220" fill="none" stroke="#3a4230" stroke-opacity="${0.7 - i * 0.12}" stroke-width="${12 - i * 2}"/>`; }
      s += `<path d="M260 220 L360 150 L440 150 L540 220Z" fill="#1f2a1a"/><g class="waves"><path d="M300 200 Q400 190 500 200" stroke="#6f8a52" stroke-opacity=".35" fill="none" stroke-width="2"/></g>`;
      s += `<path d="M300 40 Q330 70 300 100 Q270 130 320 150" stroke="#d8d8d8" stroke-opacity=".2" fill="none"/><path d="M500 30 L560 80 M520 30 L540 90 M540 30 L520 90" stroke="#d8d8d8" stroke-opacity=".18"/>`;
      for (let i = 0; i < 6; i++) s += `<g class="eyes"><circle cx="${280 + r() * 240}" cy="${160 + r() * 40}" r="1.6" fill="#ff5d5d"/></g>`;
      for (const [x, y] of [[120, 120], [690, 110]]) s += `<text x="${x}" y="${y}" font-size="20" fill="#e7b65a" opacity=".6">🏮</text>`;
      return s;
    },
    hideout(r) {
      let s = sky('ho', '#2a1c14', '#1c130d', '#0b0705');
      for (let i = 0; i < 5; i++) { const x = 60 + i * 170; s += `<rect x="${x}" y="0" width="34" height="220" fill="#1a110b"/><path d="M${x + 34} 30 Q${x + 85} -10 ${x + 136} 30" fill="none" stroke="#1a110b" stroke-width="16"/>`; }
      for (let i = 0; i < 14; i++) { const x = 30 + r() * 740, y = 40 + r() * 110; s += `<line x1="${x}" y1="0" x2="${x}" y2="${y - 8}" stroke="#110b07"/><g class="flicker">${glow('ho', x, y, 18 + r() * 18, ['#ffbf5e', '#ff8a4a', '#ffe08a', '#9ad0ff'][i % 4])}</g>`; }
      s += `<rect y="185" width="${W}" height="35" fill="#140c08"/><path d="M200 200 L600 200 L640 220 L160 220Z" fill="#6a2a2a"/><path d="M230 205 L570 205" stroke="#c9a04a" stroke-dasharray="6 6"/>`;
      s += `<path d="M380 190 L380 140 Q400 120 420 140 L420 190Z" fill="#2a1a12" stroke="#c9a04a"/><rect x="430" y="170" width="30" height="18" fill="#3a2410"/><g class="pulse"><circle cx="445" cy="170" r="5" fill="#ffb347"/></g>`;
      return s;
    },
    study(r) {
      let s = sky('sd', '#2a1d14', '#21170f', '#0e0a07');
      for (let sh = 0; sh < 2; sh++) {
        const x0 = sh ? 560 : 20;
        for (let row = 0; row < 5; row++) {
          const y = 20 + row * 38;
          s += `<rect x="${x0}" y="${y + 30}" width="220" height="6" fill="#3a2614"/>`;
          let x = x0 + 4;
          while (x < x0 + 210) { const w = 6 + r() * 8, h = 18 + r() * 12; s += `<rect x="${x}" y="${y + 30 - h}" width="${w}" height="${h}" fill="${['#6a2a22', '#2a4a6a', '#3f5a2a', '#6a5a2a', '#3a2a4a'][Math.floor(r() * 5)]}"/>`; x += w + 1; }
        }
      }
      s += `<rect x="300" y="150" width="200" height="16" fill="#1a1009"/><rect x="310" y="166" width="12" height="54" fill="#1a1009"/><rect x="478" y="166" width="12" height="54" fill="#1a1009"/>`;
      s += `<rect x="380" y="136" width="30" height="14" fill="#c9b48a"/><rect x="430" y="130" width="6" height="20" fill="#eee"/><g class="flicker">${glow('sd', 433, 126, 50, '#ffcf6b')}</g>`;
      s += `<g><circle cx="270" cy="70" r="14" fill="#5a6070"/><rect x="252" y="84" width="36" height="60" rx="8" fill="#4a5060"/><rect x="246" y="90" width="10" height="46" rx="4" fill="#40444f"/><rect x="284" y="90" width="10" height="46" rx="4" fill="#40444f"/><rect x="256" y="144" width="12" height="60" fill="#40444f"/><rect x="272" y="144" width="12" height="60" fill="#40444f"/><g class="eyes"><rect x="262" y="66" width="16" height="3" fill="#7fd0ff"/></g></g>`;
      return s;
    },
    dungeon(r) {
      let s = sky('dg', '#15140f', '#1f1d16', '#0a0907');
      for (let y = 0; y < H; y += 26) for (let x = (y / 26) % 2 ? -35 : 0; x < W; x += 70) s += `<rect x="${x + 1}" y="${y + 1}" width="68" height="24" fill="#1b1a14" stroke="#0c0b08"/>`;
      s += `<g class="flicker">${glow('dg', 120, 80, 120, '#ff9a3d')}</g><rect x="114" y="80" width="12" height="30" fill="#3a2a16"/>`;
      for (let x = 260; x <= 700; x += 34) s += `<rect x="${x}" y="0" width="7" height="220" fill="#08080a"/>`;
      s += `<rect x="250" y="40" width="470" height="8" fill="#08080a"/><rect x="250" y="170" width="470" height="8" fill="#08080a"/>`;
      s += `<path d="M560 220 Q580 190 610 200 Q630 210 650 220Z" fill="#2a2418"/>`;
      return s;
    },
    hall(r) {
      let s = sky('hl', '#3a3a4a', '#2a2a36', '#121218');
      s += `<path d="M120 90 Q400 -60 680 90Z" fill="#1c2030"/>`;
      for (let i = 0; i < 9; i++) { const a = Math.PI * (i + 0.5) / 9; s += `<line x1="400" y1="90" x2="${400 - Math.cos(a) * 280}" y2="${90 - Math.sin(a) * 140}" stroke="#3a4060" stroke-width="2"/>`; }
      s += `<g class="sun-rays"><path d="M330 20 L270 220 L530 220 L470 20Z" fill="#e8ecff" opacity=".07"/></g>`;
      for (const x of [140, 250, 550, 660]) s += `<rect x="${x - 12}" y="90" width="24" height="120" fill="#24242e"/><rect x="${x - 18}" y="86" width="36" height="8" fill="#2c2c38"/>`;
      for (let i = 0; i < 3; i++) s += `<path d="M${180 + i * 30} ${200 - i * 18} Q400 ${170 - i * 18} ${620 - i * 30} ${200 - i * 18}" fill="none" stroke="#3c3a46" stroke-width="10"/>`;
      s += `<rect x="388" y="150" width="24" height="40" fill="#5a2a2a"/><circle cx="400" cy="140" r="8" fill="#e7b65a" class="pulse"/>`;
      return s + `<rect y="205" width="${W}" height="15" fill="#15151c"/>`;
    },
  };
  ART.default = ART.forest;
  const PARTICLES = {
    tavern: 'rain', forest: 'fireflies', ambush: 'leaves', river: 'mist', ravine: 'mist', ruins: 'dust', crypt: 'dust', tunnel: 'dust', door: 'embers', lair: 'spores', village: 'embers', lobby: 'embers',
    harbor: 'mist', coast: 'mist', lighthouse: 'rain', cove: 'embers', ship: 'dust', cliffs: 'mist', seacave: 'mist', abyss: 'spores',
    city: 'rain', rooftops: 'leaves', manor: 'fireflies', market: 'dust', sewer: 'dust', hideout: 'embers', study: 'dust', dungeon: 'dust', hall: 'dust',
  };

  let artSeq = 0;
  function sceneArt(art) {
    const fn = ART[art] || ART.default;
    const r = rng([...String(art)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
    // ids únicos por ilustración: varias pueden convivir en la página (lobby, tarjetas y escena)
    const u = ++artSeq;
    const body = fn(r).replace(/id="([^"]+)"/g, `id="$1_${u}"`).replace(/url\(#([^)]+)\)/g, `url(#$1_${u})`);
    return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body}</svg>`;
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
