// Servidor HTTP sin dependencias: archivos estáticos + API JSON + eventos en tiempo real (SSE).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Room } = require('./src/engine');
const glossary = require('./src/glossary').build();

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const rooms = new Map();
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c;
  do { c = Array.from({ length: 5 }, () => A[Math.floor(Math.random() * A.length)]).join(''); } while (rooms.has(c));
  return c;
}

function getRoom(code) {
  const r = rooms.get(String(code || '').toUpperCase());
  if (!r) { const e = new Error('Esa sala no existe (¿se reinició el servidor?)'); e.status = 404; throw e; }
  return r;
}

function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 20000) { reject(new Error('Cuerpo demasiado grande')); req.destroy(); } });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('JSON no válido')); } });
  });
}

// Conexiones SSE: cada sala avisa a sus suscriptores, que reciben su vista personalizada.
function subscribe(room, pid, res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  let pending = false;
  const push = () => {
    if (pending) return;
    pending = true;
    setImmediate(() => { pending = false; res.write(`data: ${JSON.stringify(room.viewFor(pid))}\n\n`); });
  };
  room.listeners.add(push);
  const conns = (room.conns = room.conns || {});
  conns[pid] = (conns[pid] || 0) + 1;
  room.setConnected(pid, true);
  push();
  const ping = setInterval(() => res.write(': ping\n\n'), 20000);
  res.on('close', () => {
    clearInterval(ping);
    room.listeners.delete(push);
    conns[pid] -= 1;
    if (conns[pid] <= 0) room.setConnected(pid, false);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/api/glossary') return send(res, 200, glossary);
    if (url.pathname === '/api/room' && req.method === 'POST') {
      const body = await readBody(req);
      const code = newCode();
      const room = new Room(code);
      rooms.set(code, room);
      const auth = room.join(body.name);
      return send(res, 200, { code, ...auth });
    }
    if (url.pathname === '/api/join' && req.method === 'POST') {
      const body = await readBody(req);
      const room = getRoom(body.code);
      if (Object.keys(room.players).length >= 8) return send(res, 400, { error: 'La sala está llena' });
      return send(res, 200, { code: room.code, ...room.join(body.name) });
    }
    if (url.pathname === '/api/check') {
      const room = getRoom(url.searchParams.get('code'));
      if (!room.auth(url.searchParams.get('pid'), url.searchParams.get('token'))) return send(res, 403, { error: 'Credenciales no válidas' });
      return send(res, 200, { ok: true });
    }
    if (url.pathname === '/api/stream') {
      const room = getRoom(url.searchParams.get('code'));
      const p = room.auth(url.searchParams.get('pid'), url.searchParams.get('token'));
      if (!p) return send(res, 403, { error: 'Credenciales no válidas' });
      return subscribe(room, p.id, res);
    }
    if (url.pathname === '/api/action' && req.method === 'POST') {
      const body = await readBody(req);
      const room = getRoom(body.code);
      const p = room.auth(body.pid, body.token);
      if (!p) return send(res, 403, { error: 'Credenciales no válidas' });
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
    if (!full.startsWith(PUBLIC)) return send(res, 403, { error: 'Prohibido' });
    fs.readFile(full, (err, data) => {
      if (err) { res.writeHead(404); return res.end('No encontrado'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
      res.end(data);
    });
  } catch (e) {
    send(res, e.status || 500, { error: e.message });
  }
});

// Limpieza de salas inactivas (6 horas)
setInterval(() => {
  const now = Date.now();
  for (const [code, r] of rooms) {
    if (now - r.lastActivity > 6 * 3600 * 1000 && !Object.values(r.players).some((p) => p.connected)) { r.destroy(); rooms.delete(code); }
  }
}, 600000).unref();

server.listen(PORT, () => console.log(`🎲 Mesa de Dados escuchando en http://localhost:${PORT}`));
