# Formato de las aventuras

Cada aventura es un módulo CommonJS en `src/data/adventures/<id>.js` registrado en `src/data/adventures/index.js`. El motor (`src/engine.js`) la interpreta; no hace falta tocarlo para añadir aventuras. Los ejemplos completos son `gaviota.js` (costa, contrarreloj, 4 finales) y `sello.js` (intriga, facciones, 4 finales).

Comprobar siempre con:

```bash
npm run check        # revisión estática (escenas, monstruos, objetos, alcanzabilidad, finales)
npm test             # check + 120 partidas simuladas con bots (1-4 jugadores)
node test/playthrough.js <id>      # solo una aventura
N=40 node test/playthrough.js <id> # más partidas para ver qué finales salen
```

## Cabecera

```js
const scale = (n, table) => table[Math.max(1, Math.min(4, n)) - 1]; // elige por nº de jugadores
const num = (f, k) => Number(f[k]) || 0;                           // lee un contador

module.exports = {
  id: 'monasterio',                // igual que la clave en index.js
  title: 'Las Campanas de Ilvar',
  summary: '2-3 frases para la tarjeta del lobby.',
  art: 'ruins',                    // ilustración de la tarjeta (ver lista abajo)
  length: '2-3 horas',
  tags: ['Montaña', 'Misterio', 'No muertos'],
  endingCount: 3,                  // nº de escenas con end: true
  start: 'llegada',
  startGold: 15,                   // por personaje
  startFlags: { tiempo: 0, sospecha: 0 },  // contadores a 0
  journal: {                       // diario: se muestra cuando la bandera está activa
    sabeCripta: 'El prior esconde algo en la cripta.',
    tiempo: (f) => `Tiempo perdido: ${'⏳'.repeat(Math.min(5, num(f, 'tiempo')))}`,
  },
  scenes: { /* ... */ },
};
```

## Escena

```js
llegada: {
  title: 'Las puertas del monasterio',
  art: 'ruins',
  text: [ 'Párrafo 1…', { if: (f) => f.sabeCripta, text: 'Solo si la bandera está activa.' }, 'Párrafo 3…' ],
  onEnter: { flags: ['visitoLlegada'], heal: '1d6', gold: -5, inc: { tiempo: 1 } }, // se aplica al entrar
  trap: { unless: 'trampaVista', save: 'dex', dc: 12, damage: '2d6', type: 'perforante', text: '¡Clic!' },
  shop: { potion_healing: 50, rope: 1 },   // precio en po
  shortRest: true,                         // permite un descanso corto
  reward: { gold: 20, xp: 150 },           // al entrar por primera vez (por personaje)
  milestoneLevel: 3,                       // sube a todos al menos a ese nivel
  combat: { /* ver abajo */ },
  checks: [ /* pruebas */ ],
  exits: [ /* salidas */ ],
},
```

Escena "distribuidora" sin texto, que manda a otra según las banderas:

```js
desenlace: { title: 'El final', redirect: (f) => (f.prior ? 'fin_bueno' : num(f, 'sospecha') > 2 ? 'fin_malo' : 'fin_medio'), text: [], exits: [] },
```

Escena final:

```js
fin_bueno: { title: 'Las campanas callan', art: 'ruins', ending: { title: 'Las campanas callan', tone: 'good' /* good | mixed | bad */ },
  text: ['…'], reward: { gold: 80 }, end: true },
```

## Pruebas (`checks`)

```js
{ id: 'puerta', label: 'Forzar la puerta (Atletismo CD 13)', skill: 'athletics', altSkill: 'sleight', dc: 13,
  dcMod: (f) => num(f, 'sospecha'),      // suma a la CD
  mode: 'group',                         // prueba de grupo (la mitad o más tiene que superarla)
  advIf: ['tieneLlave'], advIfItem: 'thieves_tools', disIf: ['heridos'],
  requires: ['vioPuerta'],               // aparece desactivada sin alguna de estas banderas
  showIf: ['vioPuerta'], hideIf: ['puertaAbierta'], when: (f) => num(f, 'tiempo') < 3,
  retry: true,                           // cada personaje puede intentarlo una vez (si no, una sola tirada para todo el grupo)
  preCombat: true,                       // solo antes de que empiece el combate de la escena
  success: { text: '…', flags: ['puertaAbierta'], xp: 50, inc: { sospecha: -1 } },
  fail:    { text: '…', inc: { sospecha: 1 }, damageFailed: { expr: '1d6', type: 'contundente' } } },

{ id: 'soborno', label: 'Sobornar al portero (3 po por persona)', auto: true, cost: 3,
  success: { text: '…', flags: ['dentro'] } },                     // auto: sin tirada

{ id: 'antorcha', label: 'Ahuyentarlos con fuego (gasta una antorcha)', auto: true, needsItem: 'torch', preCombat: true,
  success: { text: '…', peaceful: true } },
```

## Resultados (success, fail, onEnter, effects, victory)

`text` (texto o función de banderas), `flags` (activa), `unset` (desactiva), `set: {k: v}`, `inc: {contador: n}`, `journal` (línea extra en el registro), `gold` (por persona, puede ser negativo), `items: {id: n}`, `xp`, `tempHp`, `heal: '1d6'`, `damageFailed` (solo a quien falló), `damageAll`, `peaceful: true` (resuelve el encuentro sin luchar), `startCombat: true`, `goto: 'escena'`.

## Salidas (`exits`)

```js
{ label: 'Bajar a la cripta', to: 'cripta', requires: ['sabeCripta'], hint: 'Pista visible bajo el botón',
  effects: { inc: { tiempo: 1 } } },
{ label: 'Volver al patio', to: (f) => (f.alarma ? 'patio_alerta' : 'patio') },
{ label: '¡Atacar!', fight: true },          // obligatorio si combat.auto existe
```

`requires` muestra la salida desactivada hasta tener alguna bandera; `showIf`/`hideIf`/`when` la ocultan.

## Combate

```js
combat: {
  enemies: (n, f) => scale(n, [['ghoul'], ['ghoul', 'zombie'], ['ghoul', 'zombie', 'zombie'], ['ghoul', 'ghoul', 'zombie', 'zombie']]),
  names: { ghoul: 'El hermano Teodor' },     // nombre propio
  auto: (f) => !f.sigilo,   // ¿empieza solo al entrar? Sin auto empieza siempre. Con auto hacen falta preCombat o fight.
  surprise: (f) => (f.emboscada ? 'enemies' : null),   // 'enemies' | 'party' | 'perception' (usa ambushStealth) | null
  adjust: (enemies, f, log) => { if (f.debilitado) for (const e of enemies) e.hp = Math.ceil(e.hp * 0.7); },
  victory: { text: '…', milestoneXp: 200, gold: 10, items: { potion_healing: 1 }, flags: ['ganaron'], goto: 'otra' },
  peaceful: { text: 'Texto si se resuelve sin luchar', xp: 50 },
  defeat: { to: 'celda', text: 'Os despertáis encadenados…', flags: ['capturados'] }, // captura en vez de repetir
},
```

Sin `defeat.to`, si cae todo el grupo se repite la escena (regla de la casa).

## Reglas que comprueban los tests

- Cada salida, `goto`, `defeat.to` y `redirect` apunta a escenas que existen y todas las escenas son alcanzables desde `start`.
- Un combate con `auto` necesita una salida `{ fight: true }`. Las pruebas normales y las salidas sin `fight` quedan ocultas hasta resolver el encuentro.
- Toda salida condicionada necesita un plan B: una prueba `auto`, o una prueba que active una bandera válida tanto al acertar como al fallar. Una prueba con `retry` no basta: si fallan todos, se cierra. Si no hay plan B, el grupo puede quedarse atascado.
- `endingCount` = nº de escenas `end: true`, y cada final tiene `ending { title, tone }`.
- Los personajes llegan al final a nivel 3 (900 PX). Reparte unos 300 PX hasta mitad de aventura y pon `milestoneLevel: 3` en la escena previa al clímax.
- La dificultad se escala con `scale(n, [...])` para 1-4 jugadores. Un jugador solo: 1-2 enemigos débiles.

## Catálogo disponible

- **Ilustraciones (`art`)**: tavern, forest, ambush, river, ravine, ruins, crypt, tunnel, door, lair, village, harbor, coast, lighthouse, cove, ship, cliffs, seacave, abyss, city, rooftops, manor, market, sewer, hideout, study, dungeon, hall.
- **Monstruos (SRD 5.2.1)**: goblin, goblin_minion, goblin_boss, hobgoblin, bugbear, kobold, gnoll, bandit, thug, bandit_captain, cultist, cult_fanatic, acolyte, guard, scout, spy, pirate, veteran, sahuagin, wolf, dire_wolf, worg, giant_rat, giant_spider, giant_crab, boar, panther, black_bear, brown_bear, giant_venomous_snake, hyena, stirge, ogre, merrow, harpy, grick, owlbear, ettercap, imp, gargoyle, white_dragon_wyrmling, skeleton, zombie, ghoul, ghast, shadow, specter, wight, animated_armor. Los nuevos se añaden en `src/data/monsters.js` con datos del SRD 5.2.1 (la cabecera del archivo explica los campos que entiende el motor) y se prueban con `node test/monsters.js`.
- **Habilidades**: acrobatics, animal, arcana, athletics, deception, history, insight, intimidation, investigation, medicine, nature, perception, performance, persuasion, religion, sleight, stealth, survival.
- **Objetos**: ver `src/data/items.js` (potion_healing, rope, torch, thieves_tools, holy_water, antitoxin, healers_kit, rations, disguise_kit, weapon_plus1, cloak_protection…).
- **Salvaciones**: str, dex, con, int, wis, cha.
