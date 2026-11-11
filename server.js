// Servidor HTTP sin dependencias: archivos estáticos + API JSON + eventos en tiempo real (SSE).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Room } = require('./src/engine');
const glossary = require('./src/glossary').build();
const creation = require('./src/creation').build();

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const rooms = new Map();

// Límites para poder abrir el servidor a internet sin que un abuso lo tumbe.
const LIMITS = {
  maxRooms: Number(process.env.MAX_ROOMS || 300),     // salas abiertas a la vez
  maxStreams: Number(process.env.MAX_STREAMS || 600), // conexiones en tiempo real en total
  streamsPerRoom: 24,
  roomsPerIp: 12,      // salas nuevas por IP cada 10 minutos
  joinsPerIp: 60,      // entradas a sala por IP cada 10 minutos
  actionsPerPlayer: 25, // acciones por jugador cada 5 segundos
};
let openStreams = 0;
const buckets = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now - b.start > windowMs) { b = { start: now, n: 0 }; buckets.set(key, b); }
  b.n += 1;
  return b.n > max;
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (now - b.start > 15 * 60000) buckets.delete(k); }, 60000).unref();
// Detrás de un túnel o de un proxy (Cloudflare, Render) la IP real llega en una cabecera.
function clientIp(req) {
  const xf = req.headers['cf-connecting-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || req.socket.remoteAddress || '?';
}
const SECURITY_HEADERS = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Referrer-Policy': 'strict-origin-when-cross-origin' }; // YouTube rechaza el reproductor incrustado si no recibe Referer; a sitios externos solo viaja el origen, no la URL con el código de sala
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c;
  do { c = Array.from({ length: 5 }, () => A[Math.floor(Math.random() * A.length)]).join(''); } while (rooms.has(c));
  return c;
}

const httpError = (status, message) => Object.assign(new Error(message), { status });

function getRoom(code) {
  const r = rooms.get(String(code || '').toUpperCase());
  if (!r) throw httpError(404, 'Esa sala no existe (¿se reinició el servidor?)');
  return r;
}

// Sala + jugador autenticado (404 si no hay sala, 403 si las credenciales no valen)
function authRoom(code, pid, token) {
  const room = getRoom(code);
  const player = room.auth(pid, token);
  if (!player) throw httpError(403, 'Credenciales no válidas');
  return { room, player };
}

function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY_HEADERS });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 20000) { reject(httpError(413, 'Cuerpo demasiado grande')); req.destroy(); } });
    req.on('end', () => {
      let body;
      try { body = data ? JSON.parse(data) : {}; } catch { return reject(httpError(400, 'JSON no válido')); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return reject(httpError(400, 'Petición no válida'));
      resolve(body);
    });
  });
}

// Conexiones SSE: cada sala avisa a sus suscriptores, que reciben su vista personalizada.
function subscribe(room, pid, res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no', ...SECURITY_HEADERS });
  // Relleno inicial: algunos proxies retienen las primeras KB antes de empezar a enviar.
  res.write(`: ${' '.repeat(2048)}\n\n`);
  openStreams += 1;
  let pending = false;
  const push = () => {
    if (pending) return;
    pending = true;
    setImmediate(() => { pending = false; res.write(`data: ${JSON.stringify(room.viewFor(pid))}\n\n`); });
  };
  room.listeners.add(push);
  const conns = room.conns;
  conns[pid] = (conns[pid] || 0) + 1;
  room.setConnected(pid, true);
  push();
  const ping = setInterval(() => res.write(': ping\n\n'), 20000);
  res.on('close', () => {
    openStreams -= 1;
    clearInterval(ping);
    room.listeners.delete(push);
    conns[pid] -= 1;
    if (conns[pid] <= 0 && !room.pollSeen[pid]) room.setConnected(pid, false);
  });
}

// Plan B al tiempo real: sondeo largo. El cliente pregunta con la versión que tiene; si la sala no ha cambiado,
// la respuesta espera hasta 25 s a que cambie. Funciona detrás de cualquier túnel o proxy que retenga SSE.
const POLL_WAIT = 25000;
function markPoll(room, pid) {
  room.pollSeen[pid] = Date.now();
  if (room.players[pid] && !room.players[pid].connected) room.setConnected(pid, true);
}
function longPoll(room, pid, since, res) {
  markPoll(room, pid);
  const reply = () => { markPoll(room, pid); send(res, 200, { v: room.version, view: room.viewFor(pid) }); };
  if (room.version !== since) return reply();
  let done = false;
  const finish = (withView) => {
    if (done) return; done = true;
    room.listeners.delete(onChange); clearTimeout(timer); openStreams -= 1;
    if (!res.writableEnded && !res.destroyed) { if (withView) reply(); else { markPoll(room, pid); send(res, 200, { v: since, view: null }); } }
  };
  const onChange = () => setImmediate(() => finish(true));
  const timer = setTimeout(() => finish(false), POLL_WAIT);
  openStreams += 1;
  room.listeners.add(onChange);
  res.on('close', () => finish(false));
}
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    for (const [pid, t] of Object.entries(room.pollSeen)) {
      if (now - t > POLL_WAIT + 15000) { delete room.pollSeen[pid]; if (!(room.conns[pid] > 0)) room.setConnected(pid, false); }
    }
  }
}, 10000).unref();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const ip = clientIp(req);
  try {
    if (url.pathname === '/healthz') return send(res, 200, { ok: true, rooms: rooms.size, streams: openStreams });
    if (url.pathname === '/api/glossary') return send(res, 200, glossary);
    if (url.pathname === '/api/creation') return send(res, 200, creation);
    if (url.pathname === '/api/room' && req.method === 'POST') {
      if (limited(`room:${ip}`, LIMITS.roomsPerIp, 600000)) return send(res, 429, { error: 'Has creado demasiadas salas. Espera unos minutos.' });
      if (rooms.size >= LIMITS.maxRooms) return send(res, 503, { error: 'El servidor está lleno ahora mismo. Prueba más tarde.' });
      const body = await readBody(req);
      const code = newCode();
      const room = new Room(code);
      rooms.set(code, room);
      const auth = room.join(body.name);
      return send(res, 200, { code, ...auth });
    }
    if (url.pathname === '/api/join' && req.method === 'POST') {
      if (limited(`join:${ip}`, LIMITS.joinsPerIp, 600000)) return send(res, 429, { error: 'Demasiados intentos. Espera unos minutos.' });
      const body = await readBody(req);
      const room = getRoom(body.code);
      if (Object.keys(room.players).length >= 8 && !room.evictIdle()) return send(res, 400, { error: 'La sala está llena' });
      return send(res, 200, { code: room.code, ...room.join(body.name) });
    }
    if (url.pathname === '/api/check') {
      authRoom(url.searchParams.get('code'), url.searchParams.get('pid'), url.searchParams.get('token'));
      return send(res, 200, { ok: true });
    }
    if (url.pathname === '/api/stream') {
      const { room, player: p } = authRoom(url.searchParams.get('code'), url.searchParams.get('pid'), url.searchParams.get('token'));
      const inRoom = Object.values(room.conns).reduce((a, b) => a + Math.max(0, b), 0);
      if (openStreams >= LIMITS.maxStreams || inRoom >= LIMITS.streamsPerRoom) return send(res, 503, { error: 'Demasiadas conexiones abiertas' });
      return subscribe(room, p.id, res);
    }
    if (url.pathname === '/api/poll') {
      const { room, player: p } = authRoom(url.searchParams.get('code'), url.searchParams.get('pid'), url.searchParams.get('token'));
      if (openStreams >= LIMITS.maxStreams) return send(res, 503, { error: 'Demasiadas conexiones abiertas' });
      return longPoll(room, p.id, Number(url.searchParams.get('v')), res);
    }
    if (url.pathname === '/api/action' && req.method === 'POST') {
      const body = await readBody(req);
      const { room, player: p } = authRoom(body.code, body.pid, body.token);
      if (limited(`act:${room.code}:${p.id}`, LIMITS.actionsPerPlayer, 5000)) return send(res, 429, { error: 'Vas demasiado rápido' });
      try {
        room.handle(p.id, body.msg || {});
      } catch (e) {
        return send(res, 400, { error: e.message });
      } finally {
        room.emit();
      }
      return send(res, 200, { ok: true });
    }
    // archivos estáticos
    let file = url.pathname === '/' ? '/index.html' : url.pathname === '/glosario' ? '/glossary.html' : url.pathname;
    const full = path.normalize(path.join(PUBLIC, decodeURIComponent(file)));
    if (!full.startsWith(PUBLIC + path.sep)) return send(res, 403, { error: 'Prohibido' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Método no permitido' });
    fs.readFile(full, (err, data) => {
      if (err) { res.writeHead(404); return res.end('No encontrado'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-cache', ...SECURITY_HEADERS });
      res.end(data);
    });
  } catch (e) {
    if (!e.status) console.error(new Date().toISOString(), req.method, url.pathname, e.message);
    if (!res.headersSent) send(res, e.status || 500, { error: e.message });
  }
});

// Limpieza de salas inactivas (6 horas)
setInterval(() => {
  const now = Date.now();
  for (const [code, r] of rooms) {
    if (now - r.lastActivity > 6 * 3600 * 1000 && !Object.values(r.players).some((p) => p.connected)) { r.dispose(); rooms.delete(code); }
  }
}, 600000).unref();

server.requestTimeout = 30000; // las conexiones SSE no se ven afectadas: la cabecera llega enseguida
server.headersTimeout = 15000;
// Último recurso: un fallo inesperado se registra en vez de tumbar todas las salas.
if (require.main === module) {
  process.on('uncaughtException', (e) => console.error(new Date().toISOString(), 'uncaughtException', e));
  process.on('unhandledRejection', (e) => console.error(new Date().toISOString(), 'unhandledRejection', e));
  server.listen(PORT, () => console.log(`🎲 Mesa de Dados escuchando en http://localhost:${PORT}`));
}
module.exports = { server, rooms };
