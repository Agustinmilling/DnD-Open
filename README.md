# 🎲 Mesa de Dados

Prototipo de plataforma web para jugar rol de mesa con las reglas de **5ª edición** (SRD 5.1) entre varias personas, desde el navegador.

- **Salas multijugador** con código de invitación (1 a 4 jugadores; los demás pueden mirar).
- **Creación de personaje** con asistente paso a paso: las 9 razas del SRD (con linaje dracónico, +1 libres del semielfo, truco de alto elfo…), 4 clases (Guerrero con 3 estilos de combate, Clérigo, Pícaro y Mago), 12 trasfondos, serie estándar o compra de 27 puntos, habilidades, pericia, trucos, conjuros, equipo, retrato y color. También hay un botón **🎲 Al azar** y 4 personajes pre-hechos.
- **Tres aventuras originales** que elige el anfitrión en el lobby:
  - *La Sombra bajo Robledal* (1-2 h): criptas enanas, goblins y un necrófago. Para empezar.
  - *Los Fuegos de Punta Gaviota* (2-3 h, 4 finales): un faro apagado, contrabandistas y un culto marino. Tres pistas en el orden que queráis (cada desvío cuesta tiempo), una capitana que puede ser aliada, presa o enemiga, y si os derrotan despertáis prisioneros en su barco.
  - *El Sello de Ámbar* (2-3 h, 4 finales): intriga en la ciudad de Velacruz entre una heredera, un canciller y un gremio de ladrones. Reunid pruebas, robad, pactad o traicionad, y decidid a quién entregar el sello… o romperlo.
- **Decisiones con consecuencias**: contadores (tiempo, alerta, pruebas, sospecha), facciones, rutas que se abren o se cierran, derrotas que llevan a una escena de captura en vez de repetir, varios finales y un **📜 Diario** que apunta las pistas y decisiones del grupo.
- **Dados**: bandeja de dados (d4 a d100, ventaja/desventaja), comando `/r 2d6+3` en el chat y tiradas desde la ficha (habilidades, salvaciones, características).
- **Chat** de la mesa en tiempo real.
- **Combate por turnos** con iniciativa, sorpresa, acción / acción adicional / reacción, críticos, salvaciones contra muerte, concentración, condiciones y una IA sencilla para los enemigos.
- **Progresión**: experiencia por enemigos e hitos, subida de nivel automática (niveles 1 → 3) con nuevos PG, rasgos, conjuros y espacios.
- **Interfaz ilustrada y animada**: cada escena tiene su ilustración y partículas (lluvia, luciérnagas, niebla, ascuas…), dados d20 que ruedan en pantalla, números de daño y curación, barras de vida animadas, sellos de «¡Combate!», «¡Victoria!» y «Tu turno», y una pantalla de subida de nivel. El botón ✨ Animaciones las desactiva (también respeta la preferencia de «reducir movimiento» del sistema).
- **Glosario** flotante con buscador (también en `/glosario`): reglas básicas, habilidades, rasgos y pasivas, objetos, conjuros, condiciones, criaturas, razas, clases y trasfondos. Se puede mover, ampliar (doble clic en la cabecera) y recuerda su posición.

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

1. El anfitrión (👑) elige la aventura. Cada jugador elige un personaje pre-hecho o crea el suyo (**✚ Crear personaje** o **🎲 Al azar**). El anfitrión pulsa **Comenzar aventura**.
2. En cada escena podéis intentar **pruebas** (las tira quien pulsa la tarjeta; las de grupo 👥 las tira todo el grupo), **comprar** con el oro del grupo donde haya tienda, y luego **votar** el siguiente paso (gana la mayoría).
3. Algunos encuentros no empiezan solos: podéis intentar una salida pacífica (pagar, engañar, calmar a los lobos, liberar a los mineros…) o votar **¡Atacar!**. Si la opción pacífica sale bien, os ahorráis el combate y también ganáis experiencia.
4. En **combate**, cuando sea tu turno verás tus opciones: atacar, empujar y derribar, atacar con la mano torpe (dos armas ligeras), conjuros, rasgos, objetos, Esquivar, Ayudar, Estabilizar… Elige la acción y luego el objetivo. El turno termina solo cuando no te quedan acciones útiles, o con **Terminar turno**.
5. Al ganar un combate se reparte la experiencia y el botín (cualquiera puede **coger** objetos del panel de botín).
6. Haz clic en cualquier personaje para ver su ficha. El **📜 Diario** (columna del grupo) recoge lo que habéis descubierto.
7. Al terminar, el anfitrión puede volver a la sala para elegir otra aventura o probar otro camino hacia un final distinto.

## Reglas implementadas (SRD 5.1)

- Pruebas de característica y habilidad, competencia y pericia, pruebas de grupo, ventaja/desventaja.
- Iniciativa, sorpresa (Percepción pasiva contra Sigilo), acción, acción adicional y reacción.
- Ataques con arma y de conjuro, críticos (y Crítico mejorado del Campeón), armas sutiles y a distancia, combate con dos armas ligeras, Empujar (prueba enfrentada de Atletismo para derribar).
- Resistencias, vulnerabilidades e inmunidades (también de los personajes: enanos y veneno, tiflin y fuego, dracónidos según linaje); Fortaleza de muerto viviente del zombi.
- Rasgos raciales con efecto: Arma de aliento, Astucia gnoma, Aguante incansable y Ataques salvajes del semiorco, Reprensión infernal del tiflin (automática), Resistencia enana…
- 29 criaturas del SRD con ataque múltiple, Parada, veneno, telarañas que apresan, Ventaja marcial, Frenesí sanguinario y conjuros limitados.
- Condiciones: derribado, paralizado, inconsciente, envenenado, asustado, agotamiento…, más efectos como Esquivando, Bendecido, Escondido.
- 0 PG, salvaciones contra muerte, estabilizar, daño masivo.
- Concentración (salvación de CON al recibir daño), regla de conjuros con acción adicional.
- Espacios de conjuro, descanso corto con dados de golpe, Recuperación arcana.
- Rasgos: Tomar aliento, Acción súbita, Ataque furtivo, Acción astuta (Esconderse), Manos rápidas, Discípulo de la vida, Canalizar divinidad (Expulsar muertos vivientes y Preservar la vida), Afortunado, Linaje feérico…
- Conjuros con efecto mecánico: Descarga de fuego, Rayo de escarcha, Llama sagrada, Piedad con los moribundos, Orientación, Proyectil mágico, Manos ardientes, Dormir, Escudo (reacción automática), Armadura de mago, Curar heridas, Palabra de curación, Bendición, Saeta guía, Escudo de fe, Rayo abrasador, Inmovilizar persona, Arma espiritual, Restablecimiento menor, Agarre electrizante, Toque helado, Onda atronadora, Infligir heridas, Romper, Ayuda y Taumaturgia.

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
src/creation.js        Datos para el asistente de creación de personaje (/api/creation)
src/data/              Habilidades, condiciones, conjuros, objetos, rasgos, razas, clases, trasfondos, personajes y monstruos
src/data/adventures/   Las aventuras (una por archivo) e index.js, que las registra
public/                Interfaz web (HTML/CSS/JS sin frameworks), glosario y fx.js (ilustraciones SVG, partículas y animaciones)
test/playthrough.js    Simula 120 partidas con bots (las 3 aventuras, 1-4 jugadores, personajes creados al azar) y comprueba que se llega a un final en nivel 3 (npm test; N=25 npm test para más)
```

Para crear otra aventura, copia `src/data/adventures/gaviota.js` y regístrala en `index.js`. Cada escena tiene ilustración (`art`), textos que dependen de *flags*, pruebas (`checks`, con coste, objeto necesario, `dcMod` según contadores o resultado pacífico), tienda (`shop`), trampas, combate (`combat`, con `defeat.to` para una escena de captura) y salidas (`exits`, con `when`, `effects` y `hint`). Las consecuencias admiten `flags`, `unset`, `inc` (contadores), `set`, `goto` y más; `redirect` envía a un final según las decisiones y `milestoneLevel` sube al grupo de nivel por hito.

## Ideas para siguientes versiones

- Rol de **Narrador humano** (DM) que pueda escribir la historia, dar PX y objetos, y controlar a los enemigos.
- Mapa de combate con casillas y movimiento.
- Guardar partidas (base de datos) y cuentas de usuario.
- Más aventuras y niveles 4-5.

## Licencia y atribución

Código: MIT (ver `LICENSE`).

Este proyecto incluye material del *System Reference Document 5.1* («SRD 5.1») de Wizards of the Coast LLC, disponible en <https://dnd.wizards.com/resources/systems-reference-document>. El SRD 5.1 está bajo la licencia Creative Commons Attribution 4.0 International, disponible en <https://creativecommons.org/licenses/by/4.0/legalcode>. El material se ha traducido al español, resumido y adaptado.

Las aventuras *La Sombra bajo Robledal*, *Los Fuegos de Punta Gaviota* y *El Sello de Ámbar*, sus personajes no jugadores, lugares y los personajes pre-hechos (nombres e historias) son originales de este proyecto. Los trasfondos distintos del Acólito son genéricos de este proyecto. Proyecto no oficial, sin relación con Wizards of the Coast.
