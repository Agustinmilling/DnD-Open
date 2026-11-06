// Reproductor de música compartido: solo el anfitrión controla la cola de enlaces de YouTube.
// Prueba el motor directamente (sin red). Uso: node test/music.js
const assert = require('assert');
const { Room } = require('../src/engine');

const room = new Room('MUS', { delay: 0 });
const host = room.join('Anfitrión').pid;
const guest = room.join('Invitado').pid;
for (const p of [host, guest]) room.players[p].connected = true;
assert.strictEqual(room.hostId, host);

const M = (pid, msg) => room.handle(pid, { type: 'music', ...msg });
const fails = (pid, msg, text) => assert.throws(() => M(pid, msg), (e) => e.constructor === Error && (!text || e.message === text), JSON.stringify(msg));
const view = (pid = host) => room.viewFor(pid).music;
const ID = (n) => 'abcdefghi' + String(n).padStart(2, '0'); // 11 caracteres
const NOT_YT = 'Pega el enlace de un vídeo de YouTube';
const NOT_HOST = 'Solo el anfitrión controla la música';
const EMPTY = { queue: [], names: [], index: 0, playing: false, pos: 0 };

// solo el anfitrión
fails(guest, { op: 'add', text: 'dQw4w9WgXcQ' }, NOT_HOST);
fails(guest, { op: 'clear' }, NOT_HOST);
assert.deepStrictEqual(view(), EMPTY);

// formatos de enlace
const V = 'dQw4w9WgXcQ';
const good = [V, ` ${V} `, `https://youtu.be/${V}`, `https://youtu.be/${V}?t=30`, `https://www.youtube.com/watch?v=${V}`, `https://youtube.com/watch?v=${V}&list=PLabc`,
  `https://m.youtube.com/watch?v=${V}`, `https://music.youtube.com/watch?v=${V}`, `https://www.youtube.com/shorts/${V}`,
  `https://www.youtube.com/live/${V}?feature=share`, `https://www.youtube.com/embed/${V}`, `youtube.com/watch?v=${V}`, `HTTP://YOUTU.BE/${V}`];
for (const g of good) { M(host, { op: 'clear' }); M(host, { op: 'add', text: g }); assert.deepStrictEqual(view().queue, [V], g); }

// enlaces inválidos
const bad = ['', 'hola', 'corto', V + 'x', 'https://evil.com/watch?v=' + V, 'https://youtube.com.evil.com/watch?v=' + V, 'https://youtu.be/', 'https://www.youtube.com/watch?v=corto',
  'https://www.youtube.com/playlist?list=PLabcdefghijklmnop', 'https://www.youtube.com/watch?list=PLabcdefghijklmnop', 'javascript:alert(1)', 'https://www.youtube.com/shorts/',
  '__proto__', 'x'.repeat(500), 'a'.repeat(300) + V];
M(host, { op: 'clear' });
for (const b of bad) fails(host, { op: 'add', text: b }, NOT_YT);
fails(host, { op: 'add' }, NOT_YT);
assert.deepStrictEqual(view(), EMPTY);

// primera pista: empieza a sonar; solo se guarda el id; máximo 20
M(host, { op: 'add', text: `https://youtu.be/${ID(0)}` });
assert.deepStrictEqual(view().queue, [ID(0)]);
assert.ok(view().playing && view().index === 0 && view().pos >= 0 && view().pos < 1);
for (let i = 1; i < 20; i++) M(host, { op: 'add', text: ID(i) });
assert.strictEqual(view().queue.length, 20);
fails(host, { op: 'add', text: ID(20) }, 'La lista de música está llena');
assert.strictEqual(view().queue.length, 20);
M(host, { op: 'clear' });
assert.deepStrictEqual(view(), EMPTY);

// la vista expone pos actual y nunca `at`
M(host, { op: 'add', text: ID(1) });
M(host, { op: 'seek', pos: 100 });
room.music.at -= 5000; // han pasado 5 s
assert.ok(Math.abs(view(guest).pos - 105) < 0.5, 'pos avanza mientras suena');
assert.ok(!('at' in view(guest)) && !('at' in view()));
assert.strictEqual(view(guest).pos, Math.round(view(guest).pos * 10) / 10);
M(host, { op: 'pause' });
const paused = view().pos;
assert.ok(Math.abs(paused - 105) < 0.5 && view().playing === false);
room.music.at -= 5000;
assert.strictEqual(view().pos, paused, 'en pausa no avanza');
M(host, { op: 'play' });
assert.ok(view().playing && Math.abs(view().pos - paused) < 0.5);
M(host, { op: 'seek', pos: 0 });
fails(host, { op: 'seek', pos: -1 });
fails(host, { op: 'seek', pos: 86401 });
fails(host, { op: 'seek' });
for (const pos of ['5', NaN, Infinity, {}, [], true]) fails(host, { op: 'seek', pos }, 'Datos no válidos');

// next / prev / jump / remove / clear
M(host, { op: 'clear' });
for (let i = 0; i < 4; i++) M(host, { op: 'add', text: ID(i) });
const st = () => { const v = view(); return [v.index, v.playing, Math.floor(v.pos)]; };
assert.deepStrictEqual(st(), [0, true, 0]);
M(host, { op: 'seek', pos: 50 }); M(host, { op: 'prev' }); // en la primera reinicia la pista
assert.deepStrictEqual(st(), [0, true, 0]);
M(host, { op: 'next' }); M(host, { op: 'next' });
assert.deepStrictEqual(st(), [2, true, 0]);
M(host, { op: 'prev' });
assert.deepStrictEqual(st(), [1, true, 0]);
M(host, { op: 'pause' }); M(host, { op: 'next' }); // next reanuda
assert.deepStrictEqual(st(), [2, true, 0]);
M(host, { op: 'next' });
assert.deepStrictEqual(st(), [3, true, 0]);
M(host, { op: 'next' }); // en la última no da la vuelta
assert.deepStrictEqual(st(), [3, false, 0]);
M(host, { op: 'jump', index: 1 });
assert.deepStrictEqual(st(), [1, true, 0]);
for (const index of [4, -1, 1.5, undefined]) fails(host, { op: 'jump', index });
for (const index of ['1', NaN, {}, [], true]) fails(host, { op: 'jump', index }, 'Datos no válidos');
assert.deepStrictEqual(st(), [1, true, 0]);
// quitar una anterior desplaza el índice; la actual sigue sonando
M(host, { op: 'seek', pos: 30 }); M(host, { op: 'remove', index: 0 });
assert.deepStrictEqual(view().queue, [ID(1), ID(2), ID(3)]);
assert.deepStrictEqual(st(), [0, true, 30]);
// quitar una posterior no cambia nada
M(host, { op: 'remove', index: 2 });
assert.deepStrictEqual(view().queue, [ID(1), ID(2)]);
assert.deepStrictEqual(st(), [0, true, 30]);
// quitar la actual: suena la siguiente en la misma posición de la cola
M(host, { op: 'add', text: ID(3) });
M(host, { op: 'remove', index: 0 });
assert.deepStrictEqual(view().queue, [ID(2), ID(3)]);
assert.deepStrictEqual(st(), [0, true, 0]);
// quitar la actual siendo la última: queda la anterior
M(host, { op: 'jump', index: 1 }); M(host, { op: 'remove', index: 1 });
assert.deepStrictEqual(view().queue, [ID(2)]);
assert.strictEqual(view().index, 0);
// cola vacía
M(host, { op: 'remove', index: 0 });
assert.deepStrictEqual(view(), EMPTY);
fails(host, { op: 'remove', index: 0 });
for (const op of ['play', 'pause', 'next', 'prev', 'seek']) M(host, { op, pos: 1 }); // sin cola no hacen nada
assert.deepStrictEqual(view(), EMPTY);
M(host, { op: 'add', text: ID(5) }); M(host, { op: 'add', text: ID(6) }); M(host, { op: 'clear' });
assert.deepStrictEqual(view(), EMPTY);

// nombres de pista: add con/sin nombre, rename, normalización y alineación con la cola
M(host, { op: 'add', text: ID(0), label: 'Batalla 1' });
M(host, { op: 'add', text: ID(1) });
M(host, { op: 'add', text: ID(2), label: '  Taberna \n\t  del   puerto ' });
assert.deepStrictEqual(view().names, ['Batalla 1', '', 'Taberna del puerto']);
assert.deepStrictEqual(view(guest).names, view().names);
assert.ok(!('at' in view(guest)));
const copy = view().names; copy[0] = 'x'; // la vista es una copia
assert.strictEqual(room.music.names[0], 'Batalla 1');
M(host, { op: 'rename', index: 1, label: 'Calma' });
assert.deepStrictEqual(view().names, ['Batalla 1', 'Calma', 'Taberna del puerto']);
M(host, { op: 'rename', index: 1, label: '   ' }); // vacío o solo espacios borra el nombre
assert.strictEqual(view().names[1], '');
M(host, { op: 'rename', index: 0 }); // sin label también borra
assert.strictEqual(view().names[0], '');
M(host, { op: 'rename', index: 0, label: 'a\u0000b\u0007c\r\nd e\u0085f' });
assert.strictEqual(view().names[0], 'a b c d e f');
M(host, { op: 'rename', index: 0, label: 'x'.repeat(100000) });
assert.strictEqual(view().names[0], 'x'.repeat(40));
M(host, { op: 'rename', index: 0, label: '\u0000\u0001\n' });
assert.strictEqual(view().names[0], '');
M(host, { op: 'rename', index: 0, label: '<img src=x onerror=alert(1)>' }); // solo texto: el cliente usa textContent
assert.strictEqual(view().names[0], '<img src=x onerror=alert(1)>');
M(host, { op: 'rename', index: 0, label: '__proto__' });
assert.strictEqual(view().names[0], '__proto__');
assert.deepStrictEqual(Object.keys(Object.prototype), []);
assert.strictEqual(view().queue.length, view().names.length);
// rename: índice no válido, tipos erróneos y no anfitrión
for (const index of [3, 99, 1e9, -1, 1.5, undefined]) fails(host, { op: 'rename', index, label: 'x' }, 'Pista no válida');
for (const index of ['1', NaN, {}, [], true]) fails(host, { op: 'rename', index, label: 'x' }, 'Datos no válidos');
fails(guest, { op: 'rename', index: 0, label: 'x' }, NOT_HOST);
assert.strictEqual(view().names[0], '__proto__');
assert.strictEqual(view().queue.length, 3);
// remove mantiene names alineado
M(host, { op: 'rename', index: 0, label: 'A' }); M(host, { op: 'rename', index: 1, label: 'B' }); M(host, { op: 'rename', index: 2, label: 'C' });
M(host, { op: 'remove', index: 1 });
assert.deepStrictEqual(view().queue, [ID(0), ID(2)]);
assert.deepStrictEqual(view().names, ['A', 'C']);
fails(host, { op: 'rename', index: 2, label: 'x' }, 'Pista no válida');
// llenar la lista con nombres y vaciar
M(host, { op: 'clear' });
for (let i = 0; i < 20; i++) M(host, { op: 'add', text: ID(i), label: i % 2 ? 'N' + i : undefined });
assert.strictEqual(view().names.length, 20);
fails(host, { op: 'add', text: ID(20), label: 'no cabe' }, 'La lista de música está llena');
assert.strictEqual(view().names.length, 20);
M(host, { op: 'clear' });
assert.deepStrictEqual(view(), EMPTY);
M(host, { op: 'add', text: ID(9) });
assert.deepStrictEqual(view().names, ['']); // clear no deja nombres antiguos
M(host, { op: 'clear' });
fails(host, { op: 'add', text: 'hola', label: 'Nombre' }, NOT_YT);
assert.deepStrictEqual(view().names, []);
fails(host, { op: 'rename', index: 0, label: 'x' }, 'Pista no válida');

// op desconocida, claves peligrosas y tipos erróneos
for (const op of ['borrar', '', undefined]) fails(host, { op }, 'Acción de música desconocida');
for (const op of ['__proto__', 'constructor', 'toString']) fails(host, { op }, 'Datos no válidos');
fails(host, { op: 123 }, 'Datos no válidos');
for (const k of ['__proto__', 'constructor', 'hasOwnProperty']) {
  if (k !== 'constructor') fails(host, { op: 'add', text: k }, NOT_YT); // 'constructor' tiene 11 caracteres: es un id con formato válido
  fails(host, { op: 'jump', index: k }, 'Datos no válidos');
  fails(host, { op: 'seek', pos: k }, 'Datos no válidos');
}
fails(host, JSON.parse('{"type":"music","op":"add","text":"x","__proto__":{"a":1},"constructor":{"b":1}}'), NOT_YT);
assert.deepStrictEqual(Object.keys(Object.prototype), []);
assert.strictEqual({}.a, undefined);

// la música sobrevive al cambio de anfitrión y al reinicio de la aventura
M(host, { op: 'add', text: V });
room.setConnected(host, false);
assert.strictEqual(room.hostId, guest);
assert.deepStrictEqual(view(guest).queue, [V]);
M(guest, { op: 'add', text: ID(7) });
fails(host, { op: 'clear' }, NOT_HOST);
room.setConnected(host, true);
room.resetRun();
assert.deepStrictEqual(view(guest).queue, [V, ID(7)]);
JSON.stringify(room.viewFor(guest));

room.dispose();
console.log('✔ Música: permisos, enlaces, cola y bordes correctos.');
