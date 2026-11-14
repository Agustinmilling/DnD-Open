# Mesa de Dados

Juego web multijugador de rol con las reglas de 2024 de 5ª edición (solo SRD 5.2.1, CC BY 4.0). Node.js >= 18, sin dependencias. Responde en español.

- Arrancar: `npm start` (puerto 3000). Probar: `npm test` (revisión estática + combates contra cada monstruo + partidas simuladas con bots). Solo la revisión: `npm run check`. Fuzz del motor: `npm run fuzz`.
- Rendimiento: el servidor solo envía a cada jugador lo que cambia (`Room.viewJSON` en `src/engine.js`) y el navegador recompone la vista con `public/viewsync.js`. `test/sync.js` comprueba que esa vista es idéntica a la completa (`viewFor`). Las fichas se guardan en caché (`pcViewCached`). Medir: `npm run bench`.
- Motor: `src/engine.js` (salas, escenas, pruebas, vistas) + `src/combat.js` (turnos, ataques, daño, condiciones, IA de monstruos) + `src/actions.js` (acciones de clase, conjuros, objetos). combat y actions son mixins de `Room`.
- Creación de personaje: `public/choices.js` decide qué hay que elegir y lo usan a la vez el navegador y el servidor (`src/character.js` valida con él). Datos en `src/data/` (classes, species, backgrounds, features, spells, items, masteries, beasts, monsters).
- Solo se usa contenido del SRD 5.2.1 (fuente en español: SP_SRD_CC_v5.2.1). Lo que no está en el SRD (otras subclases, especies, monstruos) no se añade.
- Aventuras: `src/data/adventures/<id>.js`, registradas en `index.js`. Formato completo en `docs/formato-aventuras.md`. Hay seis: robledal, gaviota, sello, vendimia, salar y feria. Tras tocar una, `N=60 node test/playthrough.js <id>` enseña derrotas por escena y qué finales salen.
- Agentes en `.claude/agents/`:
  - `analista-de-campanas`: analiza libros y campañas de `inspiracion/fuentes/` y propone esquemas originales.
  - `disenador-aventuras`: programa una aventura aprobada y la prueba hasta que pase.
- `inspiracion/fuentes/` está fuera de git: son obras con derechos de autor. Nunca copies su texto, nombres ni tramas al juego.
