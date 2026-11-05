# Inspiración

Aquí viven los dos agentes que ayudan a crear aventuras nuevas.

- `fuentes/`: deja aquí libros, módulos o campañas (PDF, .txt, .md, .epub). **No se guarda en git**, porque tienen derechos de autor. Por seguridad, git ignora también cualquier otro archivo o subcarpeta de `inspiracion/` y todos los PDF.
- `analisis/`: fichas de técnicas narrativas que escribe el agente `analista-de-campanas`.
- `propuestas/`: esquemas de aventuras originales, para que los apruebes antes de programarlos.

## Cómo se usa

Abre Claude Code en la carpeta `mesa-de-dados` y pide, por ejemplo:

1. "Usa el analista-de-campanas para analizar inspiracion/fuentes/mi-libro.pdf"
2. "Con las fichas de analisis/, propón una aventura de terror en un monasterio de montaña con 4 finales"
3. Revisa el esquema en `propuestas/` y pide cambios si hace falta.
4. "Usa el disenador-aventuras para programar la propuesta monasterio"

El diseñador escribe la aventura en `src/data/adventures/`, la registra y la prueba con `npm run check` y `npm test`. Después reinicia el servidor (`npm start`) para jugarla.

## La regla de oro

Los agentes aprenden técnicas (estructura, ritmo, cómo se reparten las pistas, cómo pesan las decisiones), pero no copian texto, nombres, personajes ni tramas de las obras. Lo único que el juego usa tal cual es el SRD 5.1.
