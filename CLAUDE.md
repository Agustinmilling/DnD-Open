# Mesa de Dados

Juego web multijugador de rol con reglas de 5ª edición (solo SRD 5.1). Node.js >= 18, sin dependencias. Responde en español.

- Arrancar: `npm start` (puerto 3000). Probar: `npm test` (revisión estática + partidas simuladas con bots). Solo la revisión: `npm run check`.
- Aventuras: `src/data/adventures/<id>.js`, registradas en `index.js`. Formato completo en `docs/formato-aventuras.md`.
- Agentes en `.claude/agents/`:
  - `analista-de-campanas`: analiza libros y campañas de `inspiracion/fuentes/` y propone esquemas originales.
  - `disenador-aventuras`: programa una aventura aprobada y la prueba hasta que pase.
- `inspiracion/fuentes/` está fuera de git: son obras con derechos de autor. Nunca copies su texto, nombres ni tramas al juego.
