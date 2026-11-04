# 🎲 Mesa de Dados

Prototipo de plataforma web para jugar rol de mesa con las reglas de **5ª edición** (SRD 5.1) entre varias personas, desde el navegador.

- **Salas multijugador** con código de invitación (1 a 4 jugadores; los demás pueden mirar).
- **4 personajes pre-hechos** (Guerrero humano, Clériga enana, Pícara mediana, Mago elfo) con ficha completa.
- **Aventura corta original**: *La Sombra bajo Robledal* (9 escenas: decisiones por votación, pruebas de habilidad, trampas, descansos, 3 combates y un jefe final).
- **Dados**: bandeja de dados (d4 a d100, ventaja/desventaja), comando `/r 2d6+3` en el chat y tiradas desde la ficha (habilidades, salvaciones, características).
- **Chat** de la mesa en tiempo real.
- **Combate por turnos** con iniciativa, sorpresa, acción / acción adicional / reacción, críticos, salvaciones contra muerte, concentración, condiciones y una IA sencilla para los enemigos.
- **Progresión**: experiencia por enemigos e hitos, subida de nivel automática (niveles 1 → 3) con nuevos PG, rasgos, conjuros y espacios.
- **Glosario** con buscador (`/glosario`): reglas básicas, habilidades, rasgos y pasivas, objetos, conjuros, condiciones y criaturas.

No necesita base de datos ni dependencias: solo Node.js.

## Cómo arrancarlo

Requisitos: [Node.js](https://nodejs.org) 18 o superior.

```bash
npm start          # o: node server.js
```

Abre <http://localhost:3000>, escribe tu nombre y pulsa **Crear sala nueva**. Comparte el código de 5 letras (o el botón *Copiar invitación*) con el resto de jugadores.

Para cambiar el puerto: `PORT=8080 npm start`.

### Jugar con amigos que no están en tu red

El servidor tiene que ser accesible desde internet. Opciones sencillas:

1. **Túnel temporal** desde tu PC (lo más rápido para probar):
   `npx localtunnel --port 3000` o `cloudflared tunnel --url http://localhost:3000`, y comparte la URL que te den.
2. **Desplegarlo** en un servicio gratuito o barato que ejecute Node (Render, Railway, Fly.io, un VPS…). Comando de inicio: `npm start`. El servicio debe permitir conexiones de larga duración (Server-Sent Events).

> Las salas se guardan en memoria: si el servidor se reinicia, las partidas en curso se pierden.

## Cómo se juega

1. Cada jugador elige un personaje en el lobby. El anfitrión (👑) pulsa **Comenzar aventura**.
2. En cada escena podéis intentar **pruebas** (las tira quien pulsa el botón; las de grupo 👥 las tira todo el grupo) y luego **votar** el siguiente paso (gana la mayoría).
3. En **combate**, cuando sea tu turno verás tus opciones: atacar, conjuros, rasgos, objetos, Esquivar, Ayudar, Estabilizar… Elige la acción y luego el objetivo. El turno termina solo cuando no te quedan acciones útiles, o con **Terminar turno**.
4. Al ganar un combate se reparte la experiencia y el botín (cualquiera puede **coger** objetos del panel de botín).
5. Haz clic en cualquier personaje para ver su ficha.

## Reglas implementadas (SRD 5.1)

- Pruebas de característica y habilidad, competencia y pericia, pruebas de grupo, ventaja/desventaja.
- Iniciativa, sorpresa (Percepción pasiva contra Sigilo), acción, acción adicional y reacción.
- Ataques con arma y de conjuro, críticos (y Crítico mejorado del Campeón), armas sutiles y a distancia.
- Resistencias, vulnerabilidades e inmunidades de los monstruos; Fortaleza de muerto viviente del zombi.
- Condiciones: derribado, paralizado, inconsciente, envenenado, asustado, agotamiento…, más efectos como Esquivando, Bendecido, Escondido.
- 0 PG, salvaciones contra muerte, estabilizar, daño masivo.
- Concentración (salvación de CON al recibir daño), regla de conjuros con acción adicional.
- Espacios de conjuro, descanso corto con dados de golpe, Recuperación arcana.
- Rasgos: Tomar aliento, Acción súbita, Ataque furtivo, Acción astuta (Esconderse), Manos rápidas, Discípulo de la vida, Canalizar divinidad (Expulsar muertos vivientes y Preservar la vida), Afortunado, Linaje feérico…
- Conjuros con efecto mecánico: Descarga de fuego, Rayo de escarcha, Llama sagrada, Piedad con los moribundos, Orientación, Proyectil mágico, Manos ardientes, Dormir, Escudo (reacción automática), Armadura de mago, Curar heridas, Palabra de curación, Bendición, Saeta guía, Escudo de fe, Rayo abrasador, Inmovilizar persona, Arma espiritual, Restablecimiento menor.

### Simplificaciones y reglas de la casa

- **Teatro de la mente**: no hay mapa ni distancias; el movimiento no se gestiona. El Ataque furtivo se activa con ventaja o si hay otro aliado consciente en combate.
- Si cae **todo el grupo**, la escena se repite desde el principio.
- Si el grupo gana un combate, quien haya **muerto** vuelve con 1 PG y un nivel de agotamiento.
- Si un jugador se desconecta en combate, su personaje usa *Esquivar* automáticamente.
- Los encuentros se ajustan al tamaño del grupo (1 a 4 personajes).

## Estructura

```
server.js              Servidor HTTP + API + tiempo real (Server-Sent Events), sin dependencias
src/engine.js          Motor: salas, escenas, pruebas, combate, IA de enemigos, progresión
src/character.js       Personajes: estadísticas derivadas, CA, ataques, subida de nivel
src/dice.js            Tiradas de dados (notación XdY+Z, kh/kl, ventaja)
src/rules.js           Reglas básicas: modificadores, competencia, tabla de PX
src/glossary.js        Genera el glosario a partir de los datos
src/data/              Habilidades, condiciones, conjuros, objetos, rasgos, personajes, monstruos y la aventura
public/                Interfaz web (HTML/CSS/JS sin frameworks) y glosario
test/playthrough.js    Simula 160 partidas completas con bots (npm test)
```

Para crear otra aventura, copia `src/data/adventure.js`: cada escena tiene texto, pruebas (`checks`), trampas, combate (`combat`) y salidas (`exits`) que dependen de *flags*.

## Ideas para siguientes versiones

- Rol de **Narrador humano** (DM) que pueda escribir la historia, dar PX y objetos, y controlar a los enemigos.
- Mapa de combate con casillas y movimiento.
- Creación de personajes propia y más clases y razas del SRD.
- Guardar partidas (base de datos) y cuentas de usuario.
- Más aventuras y niveles 4-5.

## Licencia y atribución

Código: MIT (ver `LICENSE`).

Este proyecto incluye material del *System Reference Document 5.1* («SRD 5.1») de Wizards of the Coast LLC, disponible en <https://dnd.wizards.com/resources/systems-reference-document>. El SRD 5.1 está bajo la licencia Creative Commons Attribution 4.0 International, disponible en <https://creativecommons.org/licenses/by/4.0/legalcode>. El material se ha traducido al español, resumido y adaptado.

La aventura *La Sombra bajo Robledal*, sus personajes no jugadores y los personajes pre-hechos (nombres e historias) son originales de este proyecto. Proyecto no oficial, sin relación con Wizards of the Coast.
