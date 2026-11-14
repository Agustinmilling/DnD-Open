# 🎲 Mesa de Dados

Prototipo de plataforma web para jugar rol de mesa con las reglas de **5ª edición** (SRD 5.2.1) entre varias personas, desde el navegador.

- **Salas multijugador** con código de invitación (1 a 4 jugadores; los demás pueden mirar).
- **Creación de personaje** con asistente paso a paso y reglas de 2024: las 12 clases del SRD 5.2.1 con su subclase a nivel 3, 9 especies con sus linajes, 12 trasfondos con su dote de origen (+2/+1 o +1/+1/+1 a sus características), serie estándar o compra de 27 puntos, habilidades, pericia, maestrías de armas, trucos, conjuros preparados, equipo, retrato y color. Propone nombres al azar según la especie y el género (botón **🎲 Al azar** en el paso de detalles). También hay un botón **🎲 Al azar** y personajes pre-hechos.
- **Seis aventuras originales** que elige el anfitrión en el lobby:
  - *La Sombra bajo Robledal* (1-2 h): criptas enanas, goblins y un necrófago. Para empezar.
  - *Los Fuegos de Punta Gaviota* (2-3 h, 4 finales): un faro apagado, contrabandistas y un culto marino. Tres pistas en el orden que queráis (cada desvío cuesta tiempo), una capitana que puede ser aliada, presa o enemiga, y si os derrotan despertáis prisioneros en su barco.
  - *El Sello de Ámbar* (2-3 h, 4 finales): intriga en la ciudad de Velacruz entre una heredera, un canciller y un gremio de ladrones. Reunid pruebas, robad, pactad o traicionad, y decidid a quién entregar el sello… o romperlo.
  - *La Última Vendimia* (2-3 h, 4 finales): terror gótico en un valle de viñedos donde los vendimiadores pierden la sombra. Tres pistas en cualquier orden (cada una gasta una noche), un pueblo que puede acabar quemándolo todo y tres formas de bajar a la bodega.
  - *La Biblioteca bajo la Sal* (2-3 h, 4 finales): un colegio de magos enterrado bajo un salar y una expedición rival que cava a la vez. Cuanto más os entretengáis, más ventaja les dais; cuanto más forcéis el paso, más cerca está el derrumbe.
  - *La Feria de Entreluces* (2-3 h, 4 finales): un cuento de hadas de tratos y astucia. Un niño ha cambiado su nombre por una cometa y hay que recuperarlo antes del primer gallo, sin endeudarse con la feria. Casi todo se puede resolver sin pelear.
- **Decisiones con consecuencias**: contadores (tiempo, alerta, pruebas, sospecha), facciones, rutas que se abren o se cierran, derrotas que llevan a una escena de captura en vez de repetir, varios finales y un **📜 Diario** que apunta las pistas y decisiones del grupo.
- **Dados**: bandeja de dados (d4 a d100, ventaja/desventaja), comando `/r 2d6+3` en el chat y tiradas desde la ficha (habilidades, salvaciones, características).
- **Chat** de la mesa en tiempo real.
- **Combate por turnos** con iniciativa, sorpresa, acción / acción adicional / reacción, críticos, salvaciones contra muerte, concentración, condiciones y una IA sencilla para los enemigos.
- **Progresión**: experiencia por enemigos e hitos, subida de nivel automática (niveles 1 → 3) con nuevos PG, rasgos, conjuros y espacios.
- **Interfaz ilustrada y animada**: cada escena tiene su ilustración y partículas (lluvia, luciérnagas, niebla, ascuas…), dados d20 que ruedan en pantalla, números de daño y curación, barras de vida animadas, sellos de «¡Combate!», «¡Victoria!» y «Tu turno», y una pantalla de subida de nivel. Las ventanas, menús, paneles, pasos del asistente y mensajes del chat entran y salen con transiciones suaves. El botón **Aa** cambia el tamaño de la letra (normal, grande, muy grande) y el botón ✨ Animaciones las desactiva (también respeta la preferencia de «reducir movimiento» del sistema).
- **Glosario** flotante con buscador (también en `/glosario`): reglas básicas, habilidades, rasgos y pasivas, objetos, conjuros, condiciones, criaturas, especies, clases, trasfondos y dotes. Se puede mover, ampliar (doble clic en la cabecera) y recuerda su posición.

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

## Reglas implementadas (reglas de 2024, SRD 5.2.1)

- **Personajes**: las 12 clases del SRD (bárbaro, bardo, brujo, clérigo, druida, explorador, guerrero, hechicero, mago, monje, paladín y pícaro), niveles 1 a 3, con la subclase del SRD en el nivel 3 (Berserker, Conocimiento, Vida, Tierra, Campeón, Mano abierta, Entrega, Cazador, Ladrón, Dracónica, Infernal y Evocador).
- **Origen**: 9 especies (dracónido, elfo, enano, gnomo, goliat, humano, mediano, orco y tiflin) con sus linajes; trasfondos que dan +2/+1 o +1/+1/+1 a tres características, dos habilidades y una dote de origen (Alerta, Atacante salvaje, Habilidoso, Iniciado en la magia).
- Pruebas d20 con competencia y pericia, pruebas de grupo, ventaja y desventaja, inspiración heroica.
- Iniciativa, sorpresa (Percepción pasiva contra Sigilo), acción, acción adicional y reacción.
- Ataques con arma y de conjuro, críticos, armas sutiles, ligeras y a distancia, **maestría de armas** (Debilitar, Molestar, Derribar, Empujar, Ralentizar, Hendir, Rozar y Mellar), Empujar (salvación de FUE o DES), Esconderse (CD 15).
- Un solo espacio de conjuro por turno, conjuros preparados, magia de pacto, metamagia, invocaciones, Forma salvaje con bestias del SRD.
- Resistencias, vulnerabilidades e inmunidades de criaturas y personajes.
- 49 criaturas del SRD 5.2.1 con ataque múltiple, recarga, alientos, agarres, drenaje, veneno, conjuros limitados y tácticas de manada.
- Condiciones del glosario de reglas, agotamiento de 2024 (−2 por nivel a las pruebas d20), 0 PG, salvaciones contra muerte, estabilizar, daño masivo.
- Concentración (salvación de CON al recibir daño), descanso corto con dados de golpe.
- Pociones: beber es una acción adicional y dársela a otro, una acción.

### Simplificaciones y reglas de la casa

- **Teatro de la mente**: no hay mapa ni distancias; el movimiento no se gestiona. El Ataque furtivo se activa con ventaja o si hay otro aliado consciente en combate.
- Si cae **todo el grupo**, la escena se repite desde el principio (o el grupo acaba capturado, si la escena lo prevé). Cada derrota repetida en la misma escena quita un enemigo y les baja los PG.
- Si el grupo gana un combate, quien haya **muerto** vuelve con 1 PG y un nivel de agotamiento.
- **Fuera de combate** (trampas, pruebas fallidas) nadie cae inconsciente ni muere: como mucho queda a 1 PG.
- Si un jugador se desconecta en combate, o pasa **2 minutos** sin actuar en su turno, su personaje usa *Esquivar* y pasa el turno.
- Si el anfitrión se va, otro jugador conectado pasa a ser anfitrión. Las recompensas de cada escena se cobran una sola vez.
- Los encuentros se ajustan al tamaño del grupo (1 a 4 personajes).

## Estructura

```
server.js              Servidor HTTP + API + tiempo real (Server-Sent Events), sin dependencias
src/engine.js          Motor: salas, escenas, pruebas, descansos, progresión
src/combat.js          Combate: turnos, ataques, daño, condiciones e IA de los monstruos
src/actions.js         Acciones de los personajes: rasgos de clase, conjuros y objetos
src/character.js       Personajes: estadísticas derivadas, CA, ataques, subida de nivel
src/dice.js            Tiradas de dados (notación XdY+Z, kh/kl, ventaja)
src/rules.js           Reglas básicas: modificadores, competencia, tabla de PX
src/glossary.js        Genera el glosario a partir de los datos
src/creation.js        Datos para el asistente de creación de personaje (/api/creation)
src/data/              Habilidades, condiciones, conjuros, objetos, rasgos, especies, clases, trasfondos, maestrías, bestias, personajes y monstruos
src/data/adventures/   Las aventuras (una por archivo) e index.js, que las registra
public/                Interfaz web (HTML/CSS/JS sin frameworks), glosario y fx.js (ilustraciones SVG, partículas y animaciones)
scripts/               Túnel público y servicios de systemd (ver «Jugar por internet»)
render.yaml            Configuración para desplegar en Render
test/validate-adventures.js  Revisión estática de las aventuras (npm run check)
docs/formato-aventuras.md    Referencia del formato de aventuras
.claude/agents/        Agentes de Claude Code para crear historias (ver abajo)
test/monsters.js       Enfrenta cada criatura a grupos al azar y comprueba que el combate termina bien
test/bot.js            Bot que juega turnos de combate (lo usan las pruebas)
test/playthrough.js    Simula partidas con bots (todas las aventuras, 1-4 jugadores, personajes creados al azar) y comprueba que se llega a un final en nivel 3 (npm test; N=25 npm test para más)
```

Para crear otra aventura, copia `src/data/adventures/gaviota.js` y regístrala en `index.js`. Cada escena tiene ilustración (`art`), textos que dependen de *flags*, pruebas (`checks`, con coste, objeto necesario, `dcMod` según contadores o resultado pacífico), tienda (`shop`), trampas, combate (`combat`, con `defeat.to` para una escena de captura) y salidas (`exits`, con `when`, `effects` y `hint`). Las consecuencias admiten `flags`, `unset`, `inc` (contadores), `set`, `goto` y más; `redirect` envía a un final según las decisiones y `milestoneLevel` sube al grupo de nivel por hito.

## Jugar por internet

El servidor está preparado para abrirse a internet: limita cuántas salas, conexiones y acciones puede hacer cada uno, y tiene `/healthz` para comprobar que está vivo. No hay cuentas: entra quien tenga el enlace y el código de la sala.

**Desde tu PC con un túnel de Cloudflare** (gratis, sin cuenta). Tu PC hace de servidor y tiene que estar encendido.

```bash
sudo pacman -S cloudflared          # una vez (o el paquete de tu distribución)
npm start                           # en una terminal
npm run tunel                       # en otra: imprime https://<algo>.trycloudflare.com
```

Para dejarlo siempre en marcha (arranca solo con el PC): `bash scripts/instalar-servicios.sh`. La dirección cambia en cada arranque del túnel; consúltala con `npm run enlace`.

**En Render** (dirección fija, funciona con el PC apagado). [![Desplegar en Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Agustinmilling/DnD-Open) Sube el proyecto a un repositorio de GitHub y, en render.com, crea un *Blueprint* con ese repositorio: `render.yaml` ya tiene la configuración. En el plan gratuito el servidor se duerme tras 15 minutos sin visitas, tarda en despertar y al dormirse se cierran las salas abiertas.

## Crear aventuras nuevas con agentes

El proyecto incluye dos agentes de Claude Code (en `.claude/agents/`):

- **analista-de-campanas** lee libros o campañas que dejes en `inspiracion/fuentes/` (fuera de git) y escribe fichas de técnicas en `inspiracion/analisis/`. Con esas fichas propone esquemas de aventuras originales en `inspiracion/propuestas/`.
- **disenador-aventuras** programa una propuesta aprobada en `src/data/adventures/`, la registra y la prueba con `npm run check` y `npm test`.

Más detalles en `inspiracion/README.md`. Los agentes aprenden técnicas de las obras, pero no copian su texto, nombres ni tramas.

## Ideas para siguientes versiones

- Rol de **Narrador humano** (DM) que pueda escribir la historia, dar PX y objetos, y controlar a los enemigos.
- Mapa de combate con casillas y movimiento.
- Guardar partidas (base de datos) y cuentas de usuario.
- Más aventuras y niveles 4-5.

## Licencia y atribución

Código: MIT (ver `LICENSE`).

Este proyecto incluye material del *System Reference Document 5.2.1* («SRD 5.2.1») de Wizards of the Coast LLC, disponible en <https://www.dndbeyond.com/srd>. El SRD 5.2.1 está bajo la licencia Creative Commons Attribution 4.0 International, disponible en <https://creativecommons.org/licenses/by/4.0/legalcode>. Los textos parten de la versión oficial en español del SRD 5.2.1 y se han resumido y adaptado.

Las aventuras *La Sombra bajo Robledal*, *Los Fuegos de Punta Gaviota*, *El Sello de Ámbar*, *La Última Vendimia*, *La Biblioteca bajo la Sal* y *La Feria de Entreluces*, sus personajes no jugadores, lugares y los personajes pre-hechos (nombres e historias) son originales de este proyecto. Los trasfondos distintos de Acólito, Criminal, Erudito y Soldado son genéricos de este proyecto. Proyecto no oficial, sin relación con Wizards of the Coast.
