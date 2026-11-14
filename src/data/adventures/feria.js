// Aventura original: "La Feria de Entreluces" (para 1-4 personajes de nivel 1 a 3). Cuento de hadas con tratos.
// Historia, lugares y personajes originales. Monstruos y reglas: SRD 5.2.1.
//
// Ramificaciones principales:
//   - Tres pistas en cualquier orden (callejón de los trueques, tiovivo, carpa de la Cantora). Cada una gasta una hora
//     de la noche (contador `dawn`): al primer gallo, la feria se va con todo lo que nadie haya reclamado.
//   - Contador `debts` (deudas con la feria): sacar acero bajo los farolillos, robar o fallar un trato os endeuda.
//     Con 4 deudas, la feria cobra aunque ganéis.
//   - Contador `favors` (botones de nácar, la moneda de la feria): con suficientes se gana la puja limpiamente.
//   - Casi todos los encuentros se pueden resolver con un trato, y hay cuatro finales.

const scale = (n, table) => table[Math.max(1, Math.min(4, n)) - 1];
const num = (f, k) => Number(f[k]) || 0;
const need = (f) => 3 + (f.kingOut ? 0 : 1) + (f.calandriaOut ? 0 : 1);
const hour = { inc: { dawn: 1 } };
const HINT = 'Una pista más… pero la noche se acorta.';
const leadExits = [
  { label: 'Recorrer el Callejón de los Trueques', to: 'puestos', hideIf: ['visitedStalls'], effects: hour, hint: HINT },
  { label: 'Acercarse al Tiovivo de las Bestias', to: 'carrusel', hideIf: ['visitedCarousel'], effects: hour, hint: HINT },
  { label: 'Entrar en la carpa de la Cantora', to: 'carpa', hideIf: ['visitedTent'], effects: hour, hint: HINT },
];
const toHub = { label: 'Ir al corazón de la feria, bajo el farol grande', to: 'encrucijada' };

module.exports = {
  id: 'feria',
  title: 'La Feria de Entreluces',
  summary: 'Una noche cada siete años, una feria que nadie monta aparece en el prado de Tresmojones. Un niño ha cambiado allí su nombre por una cometa que no cae, y su propia madre empieza a olvidarlo. Recuperadlo antes del primer gallo… sin deberle nada a la feria.',
  art: 'market',
  length: '2-3 horas',
  tags: ['Cuento de hadas', 'Tratos y astucia', 'Feérico', 'Contrarreloj'],
  endingCount: 4,
  start: 'mojones',
  startGold: 20,
  startFlags: { dawn: 0, debts: 0, favors: 0 },
  journal: {
    knowsRules: 'Reglas de la feria: nada se regala, todo se cambia. No se saca acero bajo los farolillos. Un trato no se deshace, solo se recompra.',
    knowsKite: 'El hilo de la cometa no tiene fin: cruza los mojones y se pierde dentro de la feria.',
    cradleSong: 'Conocéis la nana de la madre. Tiene un hueco justo donde iba el nombre.',
    knowsBuyer: 'El nombre lo tasó la señora Urraca, tasadora de la feria. Lo guarda en su carromato, dentro de un farolillo.',
    knowsAuction: 'Antes del primer gallo se subasta todo lo que no ha sido reclamado. El nombre del niño es el último lote.',
    knowsRivals: 'Pujarán por el nombre la Calandria, que colecciona nombres para sus canciones, y el Rey del Zarzal, que quiere uno para entrar en las casas.',
    knowsLaw: 'Ley de la feria: nadie puede vender lo que le dio otro. Un nombre lo pone la madre, y ella no ha firmado nada.',
    knowsFate: 'Quien monta en el tiovivo hasta el alba se queda en él, con cuatro patas y una cinta al cuello.',
    boyTrust: 'El niño de la cometa se fía de vosotros, aunque no sepa decir por qué.',
    boyRemembers: 'Al oír la nana, el niño ha movido los labios: recuerda la primera sílaba.',
    calandriaOut: 'La Calandria no pujará por el nombre.',
    kingOut: 'El Rey del Zarzal no pujará por el nombre.',
    urracaPass: 'La señora Urraca os ha concedido audiencia en su carromato.',
    stoleName: 'Habéis cambiado el farolillo del nombre por uno vacío. La feria aún no lo sabe.',
    beastsOwe: 'Las bestias del tiovivo os deben su libertad.',
    tradedMemory: 'Uno de vosotros ha cambiado un recuerdo por botones de nácar. No sabéis cuál: ese es el problema.',
    dawn: (f) => `Horas gastadas: ${'🕯️'.repeat(Math.max(0, Math.min(5, num(f, 'dawn')))) || 'ninguna'}${num(f, 'dawn') >= 4 ? ' (la feria ya recoge: se acerca el gallo)' : ''}`,
    debts: (f) => `Deudas con la feria: ${'🪢'.repeat(Math.max(0, Math.min(6, num(f, 'debts')))) || 'ninguna'}${num(f, 'debts') >= 4 ? ' (la feria cobrará al gallo)' : num(f, 'debts') === 3 ? ' (una más y la feria cobrará)' : ''}`,
    favors: (f) => `Botones de nácar: ${Math.max(0, num(f, 'favors'))} (la puja pide ${need(f)})`,
  },
  scenes: {
    // ------------------------------------------------------------------ el pueblo
    mojones: {
      title: 'Tresmojones, al caer la tarde',
      art: 'village',
      text: [
        'Tresmojones se llama así por las tres piedras que marcan el final del pueblo. Más allá hay un prado donde nunca pasta nadie. Esta tarde, sobre el prado, cuelgan hileras de farolillos que nadie ha colgado, y llega una música de organillo que nadie toca.',
        'Brígida, una muchacha de quince años con las trenzas a medio hacer, os ha parado en mitad del camino. "Tengo un hermano", dice, como quien repite una lección para no perderla. "Tiene nueve años. Anoche cruzó los mojones y volvió con una cometa que no cae. Desde entonces no sé cómo se llama. Mi madre ha puesto dos platos en la mesa. Somos tres."',
        'Señala el cielo: sobre la feria, inmóvil en un aire sin viento, flota una cometa roja. "Ha vuelto a entrar hace una hora. La abuela decía que la feria se va con el primer gallo y se lleva todo lo que nadie reclama. Tengo cuarenta piezas de oro del ajuar. Son vuestras si lo traéis… con nombre."',
        'Junto al último mojón, un buhonero del pueblo vende sus cosas a los curiosos que no se atreven a cruzar.',
      ],
      shop: { potion_healing: 50, torch: 1, rope: 1, healers_kit: 5, antitoxin: 50 },
      checks: [
        { id: 'rules', label: 'Recordar lo que se cuenta de las ferias que nadie monta (Arcanos o Historia CD 11)', skill: 'arcana', altSkill: 'history', dc: 11,
          success: { text: 'Todas las abuelas cuentan lo mismo con otras palabras. Allí nada se regala: quien acepta un regalo, debe. Allí no se saca acero: quien lo saca, debe. Y un trato hecho no se deshace llorando: solo se recompra. La feria no engaña a nadie. Le basta con que la gente no pregunte el precio.', flags: ['knowsRules'], xp: 25 },
          fail: { text: 'Recuerdas canciones de corro y algún refrán: «En feria de entreluces, ni fíes ni te luzcas». No sabrías decir qué significa.' } },
        { id: 'kite', label: 'Examinar el carrete de la cometa, que el niño dejó en casa (Investigación CD 11)', skill: 'investigation', dc: 11,
          success: { text: 'El carrete está vacío y, aun así, el hilo sale de él sin acabarse nunca. No es cáñamo: es una hebra de algo que brilla como una palabra recién dicha. Cruza los mojones y se pierde entre los farolillos. La cometa no vuela con viento. Vuela con lo que el niño pagó por ella.', flags: ['knowsKite'], xp: 25 },
          fail: { text: 'Un carrete de madera, un hilo muy fino. Tiras de él y no se tensa nunca.' } },
        { id: 'mother', label: 'Hablar con la madre, que no echa de menos a nadie (Perspicacia o Persuasión CD 12)', skill: 'insight', altSkill: 'persuasion', dc: 12,
          success: { text: 'La madre os asegura que solo tiene una hija. Pero mientras lo dice remienda una camisa pequeña, y tararea una nana. La nana tiene un tropiezo: un compás en blanco, justo donde se canta el nombre del niño al que se duerme. Os la aprendéis, con hueco y todo.', flags: ['cradleSong'], xp: 50 },
          fail: { text: '"Una hija, sí. Brígida." La mujer sonríe, tranquila, y pone dos platos en la mesa. En el vasar hay tres cucharas.' } },
        { id: 'stones', label: 'Buscar por dónde se entra sin deber nada (Naturaleza o Supervivencia CD 11)', skill: 'nature', altSkill: 'survival', dc: 11, hideIf: ['rightFoot', 'wrongFoot'],
          success: { text: 'La escarcha dibuja un cerco alrededor del prado, y solo se interrumpe entre el segundo mojón y el tercero. Esa es la puerta. Entráis por ella con el pie derecho, como quien llega invitado, y la música del organillo os saluda con un floreo.', flags: ['rightFoot'], xp: 25 },
          fail: { text: 'Saltáis el cerco de escarcha por donde os viene bien. Un farolillo parpadea y, en algún sitio, alguien apunta algo en una libreta: habéis entrado sin pagar la entrada.', flags: ['wrongFoot'], inc: { debts: 1 } } },
      ],
      exits: [...leadExits.map((e) => ({ ...e, effects: undefined, hint: null })), toHub],
    },

    // ------------------------------------------------------------------ pista 1: los puestos
    puestos: {
      title: 'El Callejón de los Trueques',
      art: 'market',
      onEnter: { flags: ['visitedStalls'] },
      text: [
        'Los puestos se aprietan a los dos lados de un callejón de lona. Aquí no se vende nada por dinero: un trasgo con monóculo cambia peines por bostezos, una vieja con cara de corteza ofrece «tardes de verano, poco usadas», y en un mostrador hay frascos con colores que ya no existen.',
        'La moneda de la feria son botones de nácar: se oyen tintinear en todos los delantales. Estáis mirando un tenderete de sombras de segunda mano cuando notáis unos dedos pequeños, muy educados, dentro de vuestra bolsa.',
      ],
      combat: {
        enemies: (n) => scale(n, [['goblin_minion', 'goblin_minion'], ['goblin', 'goblin_minion'], ['goblin', 'goblin', 'goblin_minion'], ['goblin', 'goblin', 'goblin_minion', 'goblin_minion']]),
        names: { goblin: 'Ratero del callejón', goblin_minion: 'Aprendiz de ratero' },
        auto: () => false,
        surprise: (f) => (f.stallsAmbush ? 'party' : null),
        victory: { text: 'Los rateros sueltan lo robado y, de propina, un puñado de botones de nácar ajenos. Alrededor, los feriantes han dejado de regatear. Un farolillo se apaga sobre vuestras cabezas: habéis sacado acero bajo las luces, y la feria lo ha visto.', milestoneXp: 200, inc: { debts: 1, favors: 1 } },
        peaceful: { text: 'Los rateros se pierden entre las lonas. En el callejón, el regateo sigue como si nada.' },
      },
      checks: [
        { id: 'catch', label: 'Atrapar la mano en la bolsa y cobrarse el intento (Percepción o Juego de Manos CD 12)', skill: 'perception', altSkill: 'sleight', dc: 12, preCombat: true,
          success: { text: 'Cierras la bolsa con la mano dentro. El trasgo te mira, tú lo miras. "Ley de feria", dices. Suspira y te paga con un botón de nácar la tentativa. Sus compinches aplauden: aquí un robo fallido es un trato como otro cualquiera.', peaceful: true, inc: { favors: 1 } },
          fail: { text: 'La mano se escurre con media bolsa y el ratero echa a correr entre los puestos, riéndose.', startCombat: true } },
        { id: 'chase', label: 'Cortarles la huida entre los puestos (Acrobacias o Atletismo CD 12, prueba de grupo)', skill: 'acrobatics', altSkill: 'athletics', dc: 12, mode: 'group', preCombat: true,
          success: { text: 'Saltáis un mostrador, rodeáis una pila de jaulas y los rateros se dan de bruces con vosotros en un callejón sin salida.', flags: ['stallsAmbush'], startCombat: true },
          fail: { text: 'Volcáis un puesto de bostezos embotellados. Los rateros se revuelven, con los cuchillos fuera.', inc: { debts: 1 }, startCombat: true } },
        { id: 'toll', label: 'Dejar que se lleven unas monedas: «peaje del callejón» (3 po por persona)', auto: true, cost: 3, preCombat: true,
          success: { text: 'Dejáis caer unas monedas como por descuido. Los rateros se las llevan con una reverencia. En esta feria, lo que se da a sabiendas no es robo: es un trato, y los tratos no dejan deuda.', peaceful: true } },
        { id: 'haggle', label: 'Regatear en los puestos hasta salir ganando (Persuasión CD 12; ventaja si entrasteis con buen pie)', skill: 'persuasion', dc: 12, advIf: ['rightFoot', 'knowsRules'], hideIf: ['haggled'],
          success: { text: 'Cambiáis un botón de camisa por un silbido, el silbido por un dedal, el dedal por un secreto ajeno, y el secreto, a un trasgo muy cotilla, por dos botones de nácar. La vieja de cara de corteza os mira con respeto.', flags: ['haggled'], inc: { favors: 2 }, xp: 50 },
          fail: { text: 'Os enredáis. Al tercer cambio ya no sabéis qué teníais al principio, y un tendero os reclama «la diferencia».', flags: ['haggled'], inc: { debts: 1 } } },
        { id: 'memory', label: 'Cambiar un recuerdo propio por botones de nácar', auto: true, hideIf: ['tradedMemory'],
          success: { text: 'La vieja de cara de corteza os pasa un peine por el pelo, una sola vez, y guarda algo en un frasco. Os paga bien. Ninguno echa nada en falta. Luego, durante un rato largo, uno de vosotros intenta acordarse de a qué olía su casa, y no puede.', flags: ['tradedMemory'], inc: { favors: 2 } } },
        { id: 'who', label: 'Averiguar quién compró un nombre anoche (Investigación CD 12)', skill: 'investigation', dc: 12,
          success: { text: 'Todos lo saben y a todos les parece un trato estupendo. "Un nombre entero, sin estrenar casi. Lo tasó la señora Urraca en persona. Lo tiene en su carromato, en un farolillo, y saldrá el último en la puja del gallo. Va a haber codazos."', flags: ['knowsBuyer', 'knowsAuction'], xp: 50 },
          fail: { text: '"¿Un nombre? Aquí se compran muchos." El tendero os enseña una caja de apodos sueltos. Ninguno es de un niño.', flags: ['knowsAuction'] } },
        { id: 'pinch', label: 'Aligerar a un tendero de un par de botones (Juego de Manos CD 13)', skill: 'sleight', dc: 13, hideIf: ['pinched'],
          success: { text: 'El trasgo del monóculo cuenta botones en voz alta. Entre el «doce» y el «trece» hay ahora un hueco que no notará hasta mañana, cuando ya no haya feria.', flags: ['pinched'], inc: { favors: 1 }, xp: 25 },
          fail: { text: 'El trasgo del monóculo deja de contar. "Trece. Eran trece." Toda la fila de puestos os mira las manos.', flags: ['pinched'], inc: { debts: 1 } } },
      ],
      exits: [{ label: '¡Darles su merecido a los rateros!', fight: true }, ...leadExits, toHub],
    },

    // ------------------------------------------------------------------ pista 2: el tiovivo
    carrusel: {
      title: 'El Tiovivo de las Bestias',
      art: 'forest',
      onEnter: { flags: ['visitedCarousel'] },
      text: [
        'El tiovivo gira solo, sin mula ni manivela, al son del organillo. Las monturas no son de madera: son bestias de verdad, un lobo, un jabalí, una pantera, uncidas a la plataforma con cintas de colores y con los ojos demasiado tristes para ser animales.',
        'Sobre el lobo, agarrado a la cinta, da vueltas un niño de nueve años con el hilo de una cometa atado a la muñeca. Se ríe. Cuando pasa a vuestro lado os saluda como se saluda a un desconocido simpático. Ponéis un pie en la plataforma para alcanzarlo, y las cintas se tensan.',
      ],
      combat: {
        enemies: (n) => scale(n, [['wolf'], ['wolf', 'boar'], ['panther', 'wolf', 'boar'], ['panther', 'wolf', 'wolf', 'boar']]),
        names: { wolf: 'Lobo del tiovivo', boar: 'Jabalí del tiovivo', panther: 'Pantera del tiovivo' },
        auto: () => false,
        surprise: () => null,
        victory: { text: 'Las bestias caen y el tiovivo se detiene con un quejido de organillo. El niño os mira, asustado por primera vez. Un farolillo se apaga: la feria ha visto el acero. Y las bestias, al morir, tenían cara de persona.', milestoneXp: 200, inc: { debts: 1 }, flags: ['beastsDead'] },
        peaceful: { text: 'El tiovivo sigue girando, más despacio, y las bestias os dejan subir.' },
      },
      checks: [
        { id: 'calm', label: 'Tranquilizar a las bestias (Trato con Animales CD 12)', skill: 'animal', dc: 12, preCombat: true,
          success: { text: 'Les hablas bajo, sin mirarlas a los ojos. El lobo agacha las orejas. No os atacan porque quieran: las cintas tiran de ellas. Aflojas un nudo, solo uno, y la plataforma entera se relaja.', peaceful: true, xp: 25 },
          fail: { text: 'Las cintas dan un tirón seco y las bestias se revuelven contra vosotros, enseñando los dientes y pidiendo perdón con la mirada.', startCombat: true } },
        { id: 'ride', label: 'Subir en marcha y aguantar la vuelta entera (Acrobacias CD 12, prueba de grupo)', skill: 'acrobatics', dc: 12, mode: 'group', preCombat: true,
          success: { text: 'Quien paga su vuelta es cliente, y a los clientes no se les muerde. Aguantáis la vuelta entera agarrados a las crines. El organillo os despide con un acorde burlón.', peaceful: true },
          fail: { text: 'Uno de vosotros sale despedido contra el organillo. La música se tuerce, y las bestias con ella.', startCombat: true } },
        { id: 'boy', label: 'Hablar con el niño de la cometa (Persuasión CD 12)', skill: 'persuasion', dc: 12, hideIf: ['boyTrust'],
          success: { text: '"¿Cómo me llamo? Qué pregunta más rara." El niño se lo piensa y deja de reírse. "Me llaman… me llamaban…" Mira la cometa. "Es que no se cae nunca, ¿sabéis? Eso vale mucho." Pero os da la mano, y no la suelta.', flags: ['boyTrust'], xp: 50 },
          fail: { text: 'El niño os enseña la cometa, encantado, y vuelve a montar. "¡Otra vuelta!" No os reconoce como alguien que importe.' } },
        { id: 'lullaby', label: 'Tararearle la nana de su madre', auto: true, requires: ['cradleSong'], hideIf: ['boyRemembers'],
          success: { text: 'Tarareáis la nana, con hueco y todo. El niño se queda muy quieto. Al llegar al compás en blanco mueve los labios y le sale un sonido, medio sonido, el principio de algo. La cometa da un tirón, como un pez. "Eso es mío", dice el niño, asombrado. "Eso era mío."', flags: ['boyRemembers', 'boyTrust'], xp: 75 } },
        { id: 'ring', label: 'Atrapar la sortija de latón al pasar (Acrobacias o Atletismo CD 12)', skill: 'acrobatics', altSkill: 'athletics', dc: 12, hideIf: ['ringDone'],
          success: { text: 'La sortija cuelga de un brazo de hierro que sube y baja. La cazas a la tercera vuelta. Dentro hay un botón de nácar y un papelito: «Vale por otra vuelta». Te quedas el botón.', flags: ['ringDone'], inc: { favors: 1 }, xp: 25 },
          fail: { text: 'Calculas mal y el brazo de hierro te da en las costillas. La sortija sigue ahí, burlona.', flags: ['ringDone'], damageFailed: { expr: '1d4', type: 'contundente' } } },
        { id: 'keeper', label: 'Fijarse en las bestias y en sus cintas (Perspicacia o Naturaleza CD 12)', skill: 'insight', altSkill: 'nature', dc: 12,
          success: { text: 'La pantera lleva un pendiente. El jabalí, restos de un bigote muy cuidado. Cada cinta tiene bordado un nombre que ya nadie usa. Quien monta hasta el alba, se queda: el tiovivo siempre necesita monturas. Y el lobo sobre el que gira el niño es todavía una cinta sin bordar.', flags: ['knowsFate'], xp: 50 },
          fail: { text: 'Bestias tristes, cintas bonitas. Algo no encaja, pero el organillo no te deja pensar.' } },
        { id: 'free', label: 'Desatar las cintas y soltar a las bestias (Juego de Manos o Trato con Animales CD 13)', skill: 'sleight', altSkill: 'animal', dc: 13, hideIf: ['beastsOwe', 'beastsDead', 'freeFail'],
          success: { text: 'Los nudos son de los que se deshacen diciendo el nombre bordado. Los lees en voz alta, uno por uno. Las bestias saltan de la plataforma y se pierden en lo oscuro; la pantera se vuelve un instante y os mira como mira alguien que apunta un favor.', flags: ['beastsOwe'], xp: 75 },
          fail: { text: 'Los nudos se aprietan solos cuanto más tiras. El organillo desafina y un feriante lejano apunta algo: habéis manoseado género ajeno.', flags: ['freeFail'], inc: { debts: 1 } } },
      ],
      exits: [{ label: '¡Abrirse paso hasta el niño!', fight: true }, ...leadExits, toHub],
    },

    // ------------------------------------------------------------------ pista 3: la carpa
    carpa: {
      title: 'La carpa de la Cantora',
      art: 'tavern',
      onEnter: { flags: ['visitedTent'] },
      text: [
        'La carpa es de terciopelo azul remendado con noche. Dentro, sobre una percha dorada, canta la Calandria: plumas pardas, cara de mujer, una voz que hace que el público, trasgos, faunos de paso y algún aldeano con la mirada perdida, se olvide de marcharse.',
        'Cada copla suya lleva un nombre dentro, y quien lo oye sabe que fue de alguien. Al veros entrar corta la canción. "Público nuevo. Y con nombres puestos, qué lujo." Sus tramoyistas, unos trasgos con librea, se colocan sin prisa entre vosotros y la salida. "Aquí se paga con una canción o con un nombre. ¿Qué traéis?"',
      ],
      combat: {
        enemies: (n) => scale(n, [['goblin'], ['harpy'], ['harpy', 'goblin_minion'], ['harpy', 'goblin', 'goblin_minion']]),
        names: { harpy: 'La Calandria', goblin: 'Tramoyista de la carpa', goblin_minion: 'Mozo de telón' },
        auto: () => false,
        surprise: () => null,
        victory: { text: 'La percha dorada queda vacía, girando. La Calandria ha huido por lo alto de la carpa, desplumada y afónica: esta noche no pujará por nada. Del público, la mitad despierta sin saber dónde está. Un farolillo se apaga.', milestoneXp: 200, inc: { debts: 1 }, flags: ['calandriaOut'], gold: 6 },
        peaceful: { text: 'La Calandria os deja ir con un gesto de ala y vuelve a su copla.' },
      },
      checks: [
        { id: 'duel', label: 'Pagar con una canción mejor que la suya (Interpretación CD 13)', skill: 'performance', dc: 13, preCombat: true, advIf: ['cradleSong'],
          success: { text: 'Cantas algo sencillo, de los que se cantan fregando. No tiene ningún nombre dentro, y por eso mismo el público llora. La Calandria escucha con la cabeza ladeada. "Hace cien años que nadie me gana", dice, sin rencor. "Ley de feria: me retiro de la puja de esta noche. Y esto, por la canción." Os lanza un botón de nácar.', peaceful: true, flags: ['calandriaOut', 'calandriaTalk'], inc: { favors: 1 }, xp: 75 },
          fail: { text: 'Se te va la voz en la segunda estrofa. La Calandria se ríe, y su risa es el principio de otra canción, una que os enreda los pies.', startCombat: true } },
        { id: 'flatter', label: 'Halagarla hasta que os tome por admiradores (Persuasión o Engaño CD 12)', skill: 'persuasion', altSkill: 'deception', dc: 12, preCombat: true,
          success: { text: '"Venimos de tres pueblos más allá solo por oírla." La Calandria se ahueca las plumas. Los tramoyistas se apartan. "Sentaos donde queráis. Los admiradores no pagan… la primera vez."', peaceful: true, flags: ['calandriaTalk'] },
          fail: { text: '"Los admiradores no miran tanto la salida", dice la Calandria, y da la nota que cierra las cortinas.', startCombat: true } },
        { id: 'listen', label: 'Escuchar de qué habla el público entre copla y copla (Perspicacia CD 12)', skill: 'insight', dc: 12,
          success: { text: 'Todo son apuestas sobre el último lote. La Calandria quiere el nombre del niño para una copla nueva: «un nombre tierno canta mejor». Y fuera de las luces acampa el Rey del Zarzal, que quiere un nombre de persona para poder llamar a las puertas y que le abran. Los dos pujarán fuerte.', flags: ['knowsRivals', 'knowsAuction'], xp: 50 },
          fail: { text: 'El público solo habla de lo bien que canta. Algunos no recuerdan haber hecho otra cosa en su vida.', flags: ['knowsAuction'] } },
        { id: 'book', label: 'Colarse tras el telón y hojear su cancionero (Sigilo CD 12)', skill: 'stealth', dc: 12, hideIf: ['bookDone'],
          success: { text: 'El cancionero es un registro: cada copla, un nombre, y al margen cómo lo consiguió. Casi todos dicen «regalado». Uno está tachado con rabia: «Devuelto. Lo vendió el hijo, pero lo había puesto la madre. Ley de feria: nadie vende lo que le dio otro». Arrancas la página con mucho cuidado.', flags: ['bookDone', 'knowsLaw'], xp: 75 },
          fail: { text: 'Un tramoyista te encuentra con el cancionero en las manos. Lo sueltas a tiempo, pero ya lo ha apuntado.', flags: ['bookDone'], inc: { debts: 1 } } },
        { id: 'falseName', label: 'Venderle un nombre inventado (Engaño CD 13)', skill: 'deception', dc: 13, hideIf: ['soldName'],
          success: { text: 'Le ofrecéis el nombre de un tío abuelo que nunca existió, con su historia triste y todo. La Calandria lo prueba, lo paladea. "Tiene poco uso", admite, y paga dos botones. Ya descubrirá que no rima con nada.', flags: ['soldName'], inc: { favors: 2 }, xp: 50 },
          fail: { text: 'La Calandria canta el nombre en voz baja y frunce el pico. "Esto no ha sido de nadie. Intentar colar género falso también tiene precio."', flags: ['soldName'], inc: { debts: 1 } } },
        { id: 'promise', label: 'Prometerle una canción sobre esta noche si no puja', auto: true, requires: ['calandriaTalk'], hideIf: ['calandriaOut'],
          success: { text: '"Una canción que aún no existe, sobre una noche que aún no ha acabado." La Calandria entorna los ojos. "Eso no lo tengo. Hecho: no pujo. Pero me la debéis, y yo las deudas las canto." Un farolillo parpadea sobre vosotros.', flags: ['calandriaOut'], inc: { debts: 1 } } },
      ],
      exits: [{ label: '¡Hacerla callar por las malas!', fight: true }, ...leadExits, toHub],
    },

    // ------------------------------------------------------------------ el corazón de la feria
    encrucijada: {
      title: 'Bajo el farol grande',
      art: 'city',
      shortRest: true,
      text: [
        'Todas las calles de lona desembocan en una plazuela con un farol tan alto que parece otra luna. A su pie hay un banco donde nadie os molesta y un cartel de letras que cambian cuando no las miráis: «GRAN PUJA DEL GALLO. Todo lo no reclamado. Último lote: un nombre de niño, poco uso».',
        'Pábilo, el farolero, un hombrecillo con una vela encendida por sombrero, repasa las mechas una por una. Detrás de la plazuela se ve el carromato de la tasadora, negro y blanco como una urraca; y más allá del cordel de farolillos, donde ya no rigen las reglas, las hogueras de un campamento entre zarzas.',
        { if: (f) => num(f, 'dawn') >= 4, text: 'Algunos puestos ya están plegando las lonas. El cielo, por el este, tiene un color que no os gusta.' },
        { if: (f) => num(f, 'debts') >= 3, text: 'Cuando pasáis, los farolillos se atenúan un poco. Debéis mucho, y la feria lleva la cuenta: con cuatro deudas, al gallo, quien debe se queda a pagar.' },
      ],
      shop: { potion_healing: 45, antitoxin: 40, potion_greater_healing: 120 },
      checks: [
        { id: 'pabilo', label: 'Preguntar al farolero por las reglas (Persuasión CD 11)', skill: 'persuasion', dc: 11,
          success: { text: '"Nada se regala. No se saca acero bajo mis luces. Lo dicho, dicho. Y al gallo, quien debe, se queda a pagar." Pábilo despabila su propia vela. "La puja se gana con botones de nácar, no con oro. Y quien no llegue, siempre puede ofrecer algo suyo. La señora Urraca lo tasa todo."', flags: ['knowsRules', 'knowsAuction'], xp: 25 },
          fail: { text: '"Las reglas están escritas en la entrada", dice Pábilo. En la entrada no hay nada escrito. "Pues haber entrado por donde se debe."', flags: ['knowsAuction'] } },
        { id: 'audience', label: 'Pedir audiencia a la tasadora (Persuasión o Engaño CD 12)', skill: 'persuasion', altSkill: 'deception', dc: 12, hideIf: ['urracaPass', 'audienceFail'],
          success: { text: 'Dejáis recado con todas las cortesías que se os ocurren. Al rato, una urraca de verdad se os posa en el hombro con una tarjeta en el pico: «Se recibe. Límpiense los pies».', flags: ['urracaPass'], xp: 25 },
          fail: { text: 'La urraca que hace de recadera os mira de arriba abajo y se va sin contestar. Tendréis que entrar sin invitación, o no entrar.', flags: ['audienceFail'] } },
        { id: 'settle', label: 'Saldar una deuda en oro con el farolero (5 po por persona)', auto: true, cost: 5, when: (f) => num(f, 'debts') >= 1 && !f.settled,
          success: { text: 'Pábilo muerde una moneda, pone cara de asco, "oro, qué ordinario", y aun así tacha una línea en su libreta. Un farolillo vuelve a encenderse.', flags: ['settled'], inc: { debts: -1 } } },
        { id: 'lamp', label: 'Ayudar a Pábilo a encender los faroles altos (Atletismo o Acrobacias CD 11)', skill: 'athletics', altSkill: 'acrobatics', dc: 11, hideIf: ['lampHelp'],
          success: { text: 'Trepas a los postes que él ya no alcanza. Pábilo no te da las gracias, aquí nadie las da, pero te paga: un botón de nácar, y un consejo. "A la Urraca no le gusta lo incompleto. Un trato al que le falta una firma le quita el sueño."', flags: ['lampHelp'], inc: { favors: 1 }, xp: 25 },
          fail: { text: 'Resbalas del poste y apagas dos faroles con el cuerpo. Pábilo suspira y lo deja en empate: ni te paga ni te lo apunta.', flags: ['lampHelp'], damageFailed: { expr: '1d4', type: 'contundente' } } },
      ],
      exits: [
        { label: 'Salir del cordel de luces, hacia las hogueras del zarzal', to: 'zarzal', hideIf: ['visitedBramble'] },
        { label: 'Ir al carromato de la tasadora', to: 'carromato', hideIf: ['visitedWagon'] },
        ...leadExits,
        { label: 'Esperar la campana de la puja', to: 'vispera' },
      ],
    },

    zarzal: {
      title: 'La corte del Zarzal',
      art: 'ambush',
      onEnter: { flags: ['visitedBramble'] },
      text: [
        'Fuera del cordel de farolillos la noche es noche de verdad, y aquí el acero no le debe nada a nadie. Entre las zarzas, alrededor de una hoguera, acampa una corte de trasgos con coronas de hojalata. En un trono hecho con una carretilla volcada se sienta Su Majestad Abrojo, Rey del Zarzal, contando botones de nácar en una bolsa gorda.',
        '"Un nombre de persona", está diciendo. "Con un nombre de persona llamas a una puerta y te abren. Te sientan a la mesa. Te arropan." Sus cortesanos asienten, hambrientos. Entonces os ven.',
      ],
      combat: {
        enemies: (n) => scale(n, [['goblin', 'goblin_minion'], ['goblin_boss', 'goblin_minion'], ['goblin_boss', 'goblin', 'goblin_minion'], ['goblin_boss', 'worg', 'goblin', 'goblin_minion']]),
        names: { goblin_boss: 'Su Majestad Abrojo', goblin: 'Cortesano del Zarzal', goblin_minion: 'Paje del Zarzal', worg: 'Montura del rey' },
        auto: () => false,
        surprise: (f) => (f.brambleAmbush ? 'party' : null),
        victory: { text: 'La corona de hojalata rueda hasta la hoguera. La corte se dispersa entre las zarzas, llevándose a su rey a rastras. La bolsa de botones se ha quedado junto al trono. Aquí fuera, nadie apunta nada.', milestoneXp: 200, flags: ['kingOut', 'brambleFought'], inc: { favors: 2 }, gold: 8 },
        peaceful: { text: 'La corte del Zarzal os deja marchar. Algún paje os tira una piña, por no perder la costumbre.' },
      },
      checks: [
        { id: 'parley', label: 'Convencer al rey de que ese nombre no le abrirá ninguna puerta (Persuasión CD 13)', skill: 'persuasion', dc: 13, preCombat: true, advIf: ['knowsRivals', 'boyRemembers'],
          success: { text: '"Un nombre robado a un niño huele a niño", le explicáis. "Llamarás a la puerta, la madre abrirá y verá a un trasgo con la voz de su hijo. ¿Tú abrirías?" Abrojo se rasca bajo la corona un buen rato. "No puja el rey por género defectuoso", decreta. Y luego, más bajo: "¿Y cómo se consigue uno propio?" "Que alguien te lo ponga." Se queda pensando en eso.', peaceful: true, flags: ['kingOut'], xp: 75 },
          fail: { text: '"¡Vienen a quitarle el lote al rey!", chilla un cortesano, y la corte entera echa mano de lo que tiene.', startCombat: true } },
        { id: 'trick', label: 'Hacerse pasar por emisarios de la tasadora (Engaño CD 13)', skill: 'deception', dc: 13, preCombat: true,
          success: { text: '"La señora Urraca lamenta comunicar que el último lote se retira por defecto de forma." Lo decís con tanta desgana burocrática que nadie duda. El rey gruñe, pero guarda la bolsa: no pujará.', peaceful: true, flags: ['kingOut'], xp: 50 },
          fail: { text: '"Los recaderos de la Urraca tienen pico", observa el rey Abrojo, y deja de sonreír.', startCombat: true } },
        { id: 'creep', label: 'Rodear la hoguera entre las zarzas (Sigilo CD 12, prueba de grupo)', skill: 'stealth', dc: 12, mode: 'group', preCombat: true,
          success: { text: 'Las zarzas arañan pero no crujen. Estáis detrás del trono antes de que nadie mire.', flags: ['brambleAmbush'], startCombat: true },
          fail: { text: 'Una zarza se os engancha en la capa y os delata con un desgarrón larguísimo.', damageFailed: { expr: '1d4', type: 'perforante' }, startCombat: true } },
        { id: 'purse', label: 'Aligerar la bolsa del rey mientras presume (Juego de Manos CD 13)', skill: 'sleight', dc: 13, hideIf: ['purseDone', 'brambleFought'],
          success: { text: 'El rey cuenta con los dedos y le sobran botones para sus dedos. No echará de menos dos.', flags: ['purseDone'], inc: { favors: 2 }, xp: 50 },
          fail: { text: 'El rey os pilla con la mano en la bolsa y os la muerde. Fuera de las luces no hay deudas, pero hay dientes.', flags: ['purseDone'], damageFailed: { expr: '1d6', type: 'perforante' } } },
        { id: 'name', label: 'Ponerle un nombre de verdad a uno de sus pajes (Interpretación o Religión CD 12)', skill: 'performance', altSkill: 'religion', dc: 12, hideIf: ['namedPage'],
          success: { text: 'Elegís al paje más pequeño, le ponéis la mano en la cabeza y le dais un nombre con toda la ceremonia que recordáis de vuestros pueblos. El paje lo repite, incrédulo. La corte entera hace cola. Cuando acabáis, el rey os mira de otro modo: aquí habéis hecho un regalo donde los regalos sí se permiten.', flags: ['namedPage', 'kingOut'], xp: 75 },
          fail: { text: 'Os trabáis con la ceremonia y al paje le queda un nombre que suena a estornudo. Se lo queda igual, encantado.', flags: ['namedPage'] } },
        { id: 'path', label: 'Buscar la senda que usan para colarse en la feria (Supervivencia CD 11)', skill: 'survival', dc: 11,
          success: { text: 'Un túnel de zarzas pasa por debajo del cordel de farolillos y sale justo detrás del carromato blanco y negro. Los trasgos lo usan para mirar el género sin pagar entrada.', flags: ['backWay'], xp: 25 },
          fail: { text: 'Hay sendas por todas partes y todas vuelven a la hoguera.' } },
      ],
      exits: [{ label: '¡Derrocar al Rey del Zarzal!', fight: true }, { label: 'Volver bajo el farol grande', to: 'encrucijada' }],
    },

    carromato: {
      title: 'El carromato de la tasadora',
      art: 'study',
      onEnter: { flags: ['visitedWagon'] },
      text: [
        'Por fuera es un carromato de feriante. Por dentro es más grande que la casa más grande de Tresmojones: estantes hasta el techo y, en cada estante, farolillos. En cada farolillo, una luz distinta. Una risa. Un oficio. La costumbre de silbar. Cada uno con su etiqueta atada, escrita con letra de tasación.',
        { if: (f) => f.urracaPass, text: 'La señora Urraca os recibe sin levantarse: una dama alta, de luto blanco y negro, con una lupa en un ojo que brilla demasiado. "Miren. No toquen." En el techo, entre las vigas, sus tejedoras de etiquetas, unas grandes como perros y otras pequeñas y con aguja, todas con demasiadas patas, siguen hilando sin perderos de vista.' },
        { if: (f) => !f.urracaPass && f.backWay, text: 'Entráis por detrás, por la senda de los trasgos. La tasadora no está. Sus tejedoras de etiquetas sí: unas grandes como perros y otras pequeñas y con aguja, todas con demasiadas patas, cuelgan de las vigas. Aún no os han visto.' },
        { if: (f) => !f.urracaPass && !f.backWay, text: 'La puerta no estaba cerrada: en esta feria nadie roba dos veces. La tasadora no está. Sus tejedoras de etiquetas sí: unas grandes como perros y otras pequeñas y con aguja, todas con demasiadas patas, se descuelgan de las vigas en cuanto pisáis la alfombra.' },
      ],
      combat: {
        enemies: (n) => scale(n, [['stirge', 'stirge'], ['giant_spider'], ['giant_spider', 'giant_spider'], ['ettercap', 'giant_spider']]),
        names: { giant_spider: 'Tejedora de etiquetas', ettercap: 'Maestra tejedora', stirge: 'Devanadera de aguja' },
        auto: (f) => !f.urracaPass && !f.backWay,
        surprise: (f) => (f.backWay && !f.urracaPass ? 'party' : null),
        victory: { text: 'La última tejedora se encoge sobre sí misma. Habéis sacado acero en casa de la tasadora: se apagan tres farolillos de golpe, y cada uno era algo de alguien.', milestoneXp: 200, inc: { debts: 2 }, items: { potion_healing: 1 } },
        peaceful: { text: 'Las tejedoras siguen hilando etiquetas. No os quitan los ocho ojos de encima.' },
      },
      checks: [
        { id: 'browse', label: 'Comportarse como clientes y no tocar nada (Engaño o Persuasión CD 11)', skill: 'deception', altSkill: 'persuasion', dc: 11, preCombat: true, requires: ['urracaPass'],
          success: { text: 'Manos a la espalda, pasos cortos, algún «qué interesante». Las tejedoras se relajan.', peaceful: true },
          fail: { text: 'Alguien roza un farolillo con el codo. La luz de dentro chilla. Las tejedoras bajan.', inc: { debts: 1 }, startCombat: true } },
        { id: 'hush', label: 'Pasar bajo las vigas sin que las tejedoras lo noten (Sigilo CD 13, prueba de grupo)', skill: 'stealth', dc: 13, mode: 'group', preCombat: true, when: (f) => !f.urracaPass,
          success: { text: 'Camináis por donde la alfombra es más gruesa. Arriba, las patas siguen hilando a su ritmo.', peaceful: true },
          fail: { text: 'Una etiqueta a medio hilar se os pega al pelo y tira. Ocho ojos, y luego muchos más, se vuelven hacia abajo.', startCombat: true } },
        { id: 'find', label: 'Buscar el farolillo del niño (Percepción o Investigación CD 12)', skill: 'perception', altSkill: 'investigation', dc: 12, advIf: ['cradleSong', 'knowsBuyer'], hideIf: ['sawName'],
          success: { text: 'Está en el estante de «Entradas recientes». Dentro del cristal, la luz tiene la forma de una palabra que no conseguís leer, y aletea como un pájaro cuando alguien tararea cerca. La etiqueta dice: «Nombre de pila. Varón, nueve años. Cedido por el titular. Precio: una cometa».', flags: ['sawName', 'knowsBuyer'], xp: 50 },
          fail: { text: 'Hay miles de farolillos. Todos parecen mirarte cuando pasas. Ninguno te dice nada.' } },
        { id: 'contract', label: 'Leer la etiqueta y el libro de tasación (Investigación CD 12)', skill: 'investigation', dc: 12, hideIf: ['knowsLaw'],
          success: { text: 'En el libro, cada entrada lleva dos firmas: quien cede y quien dio. La del niño tiene una sola, una equis torcida. La casilla de «quien dio» está en blanco, y alguien ha pasado la uña por encima muchas veces, con desazón. Ley de feria: nadie vende lo que le dio otro.', flags: ['knowsLaw'], xp: 75 },
          fail: { text: 'Letra de tasación: diminuta, apretada, llena de abreviaturas. No sacas nada en claro.' } },
        { id: 'urraca', label: 'Hablar de precios con la señora Urraca (Perspicacia o Persuasión CD 12)', skill: 'insight', altSkill: 'persuasion', dc: 12, requires: ['urracaPass'], hideIf: ['urracaTalk'],
          success: { text: '"Yo no robo, yo taso", dice la Urraca. "El niño quiso una cometa. Yo quise completar el estante de los nombres de nueve letras… no, no es de nueve; no pienso deciros de cuántas." Casi sonríe. "Si no os llegan los botones, tasaré lo que ofrezcáis de vosotros. Soy justa. Es mi único defecto." Os deja un botón «por la conversación, que ha sido entre iguales».', flags: ['urracaTalk'], inc: { favors: 1 }, xp: 50 },
          fail: { text: '"No se regatea con la tasadora. Se puja o se mira." La lupa de su ojo os mide, os pesa y os descarta.', flags: ['urracaTalk'] } },
        { id: 'swap', label: 'Dar el cambiazo: llevarse el farolillo y dejar uno vacío (Juego de Manos CD 14)', skill: 'sleight', dc: 14, requires: ['sawName'], hideIf: ['stoleName', 'swapFail'],
          success: { text: 'Un farolillo vacío por uno lleno, una etiqueta por otra. La luz os calienta el pecho a través de la ropa, como un gorrión asustado. Nadie ha visto nada. Todavía.', flags: ['stoleName'], inc: { debts: 1 }, xp: 75 },
          fail: { text: 'El farolillo no se deja descolgar: está atado al estante con un hilo que solo corta un trato. Y una tejedora ha dejado de hilar para mirarte las manos.', flags: ['swapFail'], inc: { debts: 1 } } },
      ],
      exits: [{ label: '¡Abrirse paso entre las tejedoras!', fight: true }, { label: 'Volver bajo el farol grande', to: 'encrucijada' }],
    },

    // ------------------------------------------------------------------ la puja
    vispera: {
      title: 'La campana de la puja',
      art: 'door',
      milestoneLevel: 3,
      shortRest: true,
      text: [
        'Suena una campana que no está en ningún campanario, y toda la feria se vuelve hacia la carpa mayor. Los feriantes cierran los puestos con un nudo y acuden con sus bolsas de botones.',
        { if: (f) => num(f, 'dawn') >= 4, text: 'Habéis apurado la noche. Por el este clarea, y en algún corral de Tresmojones un gallo se aclara la garganta. La puja será corta y la feria tiene prisa por cobrar.' },
        { if: (f) => num(f, 'dawn') < 4, text: 'Todavía es noche cerrada. Tenéis tiempo de respirar antes de entrar.' },
        { if: (f) => num(f, 'debts') >= 4, text: 'A vuestro paso, los farolillos se apagan de uno en uno. Pábilo, el farolero, os enseña su libreta sin decir nada: tenéis página propia. Quien debe tanto, al gallo, se queda a pagar.' },
        { if: (f) => f.boyTrust, text: 'El niño de la cometa ha venido detrás de vosotros, con el hilo atado a la muñeca. No sabe por qué. Dice que le sonáis.' },
        'A la puerta de la carpa mayor monta guardia el Portero de la feria, que no cabe por ella.',
      ],
      checks: [
        { id: 'work', label: 'Trabajar una hora en un puesto para saldar deudas', auto: true, when: (f) => num(f, 'debts') >= 1 && !f.worked,
          success: { text: 'Fregáis frascos de bostezos, dobláis sombras y lleváis recados a sitios que no están en ningún mapa. Es una hora larguísima. Pábilo tacha dos líneas de vuestra página.', flags: ['worked'], inc: { debts: -2, dawn: 1 } } },
        { id: 'spool', label: 'Aceptar el carrete que os ha traído Brígida hasta los mojones', auto: true, hideIf: ['spool'],
          success: { text: 'Brígida no se atreve a cruzar, pero os lanza por encima del mojón el carrete vacío de la cometa. "Para que sepa volver", dice. No es un regalo de la feria: es de fuera, y no se debe. Os lo guardáis junto al pecho.', flags: ['spool'], tempHp: 5 } },
        { id: 'count', label: 'Contar los botones y a los que van a pujar (Investigación o Perspicacia CD 11)', skill: 'investigation', altSkill: 'insight', dc: 11,
          success: { text: 'Hacéis cuentas. La Urraca abrirá el lote en tres botones. Cada postor serio que quede en la sala lo subirá uno más. Lo que tenéis es lo que hay: aquí el oro no vale y fiar está muy mal visto.', flags: ['knowsAuction', 'knowsRivals'], xp: 25 },
          fail: { text: 'Hay demasiadas bolsas tintineando para calcular nada.', flags: ['knowsAuction'] } },
        { id: 'porter', label: 'Caerle bien al Portero (Persuasión o Trato con Animales CD 12)', skill: 'persuasion', altSkill: 'animal', dc: 12, hideIf: ['porterTalk'],
          success: { text: 'El Portero es muy grande, muy peludo y lleva toda la noche de pie. Le ofrecéis algo de comer a cambio de nada, o sea, a cambio de que conste. Mastica, pensativo. Si hay jaleo ahí dentro, no pondrá todo el entusiasmo.', flags: ['porterTalk', 'porterSoft'], xp: 50 },
          fail: { text: 'El Portero os huele, concluye que no sois ni lote ni postor, y sigue mirando al frente.', flags: ['porterTalk'] } },
      ],
      exits: [{ label: 'Entrar en la carpa mayor', to: 'puja' }],
    },

    puja: {
      title: 'La Puja del Gallo',
      art: 'hall',
      text: [
        'La carpa mayor está llena hasta la lona. Sobre una tarima, la señora Urraca, de luto blanco y negro, golpea con un mazo de hueso. Se han subastado ya una tarde de agosto, un talento para el dibujo y la suerte de un tahúr. Queda un farolillo.',
        '"Último lote. Un nombre de pila, varón, nueve años, poco uso. Se abre en tres botones."',
        { if: (f) => !f.calandriaOut, text: 'En un palco, la Calandria se ahueca las plumas y levanta un ala: va a pujar.' },
        { if: (f) => !f.kingOut, text: 'Al fondo, de pie sobre una silla, el Rey del Zarzal agita su bolsa gorda de botones: va a pujar.' },
        { if: (f) => f.calandriaOut && f.kingOut, text: 'Nadie más levanta la mano. Los postores serios se han quedado fuera esta noche, y toda la carpa os mira a vosotros.' },
        { if: (f) => f.stoleName, text: 'El farolillo de la tarima está vacío, y solo vosotros lo sabéis. El de verdad os late bajo la ropa.' },
        { if: (f) => num(f, 'dawn') >= 4, text: 'Fuera canta un gallo, todavía lejos. La Urraca aprieta el mazo: quiere acabar ya, y sus alguaciles han entrado en la carpa.' },
      ],
      combat: {
        enemies: (n, f) => scale(n, [['hobgoblin'], ['bugbear', 'goblin'], ['bugbear', 'hobgoblin', 'goblin'], ['owlbear', 'hobgoblin', 'goblin']]).concat(num(f, 'dawn') >= 4 ? ['goblin'] : []),
        names: { owlbear: 'El Portero', bugbear: 'El Portero', hobgoblin: 'Alguacil de la feria', goblin: 'Mozo de la puja' },
        auto: () => false,
        surprise: () => null,
        adjust: (enemies, f, log) => {
          let k = 1;
          if (f.beastsOwe) k -= 0.2;
          if (f.porterSoft) k -= 0.15;
          if (k < 1) { for (const e of enemies) { e.hp = Math.max(1, Math.ceil(e.hp * k)); e.maxHp = e.hp; } log(f.beastsOwe ? 'Por debajo de la lona entran un lobo, un jabalí y una pantera sin cinta: vienen a pagar lo que os deben.' : 'El Portero pelea sin ganas: alguien le ha tratado bien esta noche.'); }
        },
        victory: {
          text: 'El mazo de hueso se parte. Los alguaciles ruedan entre las sillas, el público huye por debajo de la lona y cien farolillos caen de sus ganchos. La señora Urraca no pelea: os mira un instante con su ojo de lupa, apunta algo, y se deshace en una bandada blanca y negra. Tenéis el farolillo. Habéis roto la feria.',
          milestoneXp: 300, flags: ['brokeFair', 'foughtFair'], goto: 'desenlace',
        },
      },
      checks: [
        { id: 'bid', label: (f) => `Pujar con vuestros botones de nácar (tenéis ${Math.max(0, num(f, 'favors'))}; hacen falta ${need(f)})`, auto: true, preCombat: true, when: (f) => num(f, 'favors') >= need(f),
          success: { text: 'Ponéis los botones sobre la tarima, uno a uno. Nadie los supera. La señora Urraca los cuenta dos veces, porque es justa. "Adjudicado." El mazo cae. Os entrega el farolillo con las dos manos, como se entrega algo que se ha cuidado.', flags: ['wonFair'], xp: 300, goto: 'desenlace' } },
        { id: 'law', label: 'Impugnar el lote: nadie vende lo que le dio otro (Persuasión o Arcanos CD 14)', skill: 'persuasion', altSkill: 'arcana', dc: 14, preCombat: true, requires: ['knowsLaw'], advIf: ['boyRemembers', 'urracaTalk'], dcMod: (f) => (num(f, 'dawn') >= 4 ? 2 : 0), hideIf: ['lawTried'],
          success: { text: '"Ese nombre lo puso su madre. ¿Dónde está su firma?" La carpa entera contiene el aliento. La señora Urraca abre su libro, mira la casilla en blanco que lleva toda la noche quitándole el sueño, y lo cierra. "Defecto de forma", dice, con algo que casi es alivio. "El lote se retira y vuelve a su origen. La cometa también: un trato nulo es nulo por los dos lados."', flags: ['wonFair', 'lawWon', 'lawTried'], xp: 300, goto: 'desenlace' },
          fail: { text: '"Las impugnaciones, por escrito y antes de la campana", dice la Urraca, pero le tiembla el mazo: sabe que tenéis razón, y que no habéis sabido decirla. Os apunta las costas.', flags: ['lawTried'], inc: { debts: 1 } } },
        { id: 'reveal', label: 'Abrir el farolillo robado delante de todos', auto: true, preCombat: true, requires: ['stoleName'],
          success: { text: 'Sacáis el farolillo de verdad y abrís la portezuela. La luz sale disparada hacia el niño de la cometa, dondequiera que esté. Sobre la tarima, el lote resulta estar vacío. Un silencio espantoso. Luego la señora Urraca dice, muy despacio: "En mi feria. A mí." Los farolillos empiezan a apagarse en filas enteras.', flags: ['brokeFair'], xp: 200, goto: 'desenlace' } },
        { id: 'offer', label: 'Ofrecer algo propio a cambio: que la tasadora os tase a vosotros', auto: true, preCombat: true,
          success: { text: '"Se admite permuta", dice la señora Urraca, y baja de la tarima. Os mira por la lupa, uno por uno, mucho rato. Elige algo de uno de vosotros: no dice qué. Lo saca con dos dedos, como una hebra, y lo guarda en un farolillo nuevo. "Trato justo. Yo siempre soy justa."', flags: ['tradedSelf'], goto: 'fin_trueque' } },
        { id: 'stay', label: 'Aceptar la otra oferta: quedarse en la feria, con el niño y su cometa', auto: true, preCombat: true,
          success: { text: '"O no compréis nada", dice la Urraca, casi amable. "Quedaos. Aquí nadie echa de menos a nadie, la música no se acaba y las cometas no se caen. Siempre hacen falta feriantes." Fuera canta el gallo. Es muy fácil decir que sí.', flags: ['choseStay'], goto: 'fin_feria' } },
      ],
      exits: [{ label: '¡Arrebatar el farolillo por la fuerza!', fight: true }],
    },

    desenlace: {
      title: 'El primer gallo',
      redirect: (f) => {
        if (f.brokeFair) return 'fin_ruptura';
        if (num(f, 'debts') >= 4) return 'fin_feria';
        return 'fin_nombre';
      },
      text: [],
      exits: [],
    },

    // ------------------------------------------------------------------ finales
    fin_nombre: {
      title: 'Epílogo: tres platos',
      art: 'village',
      ending: { title: 'Tres platos', tone: 'good' },
      reward: { gold: 40, xp: 100 },
      text: [
        'Abrís el farolillo junto al tercer mojón, cuando el gallo canta de verdad. La luz no duda: cruza el prado, se le mete al niño por la boca como un bostezo al revés, y el niño dice, muy alto, para probarlo: "¡Lino!"',
        { if: (f) => f.lawWon, text: 'La cometa roja baja sola del cielo y se pliega a los pies de la tasadora. Un trato nulo es nulo por los dos lados. Lino la mira irse sin pena: ya no se acuerda de por qué la quería tanto.' },
        { if: (f) => !f.lawWon, text: 'La cometa roja sigue en el cielo, quieta, sin viento. Es suya: la compró y la habéis pagado. Ahora que tiene nombre, Lino decide que una cometa que no cae nunca es un poco aburrida, y suelta el hilo.' },
        'Detrás de vosotros, la feria se pliega como un pañuelo: lonas, farolillos, organillo, todo cabe en un carromato blanco y negro que ya no está. En el prado queda un cerco de escarcha y un botón de nácar, que nadie recoge.',
        'En casa, la madre ha puesto tres platos sin saber por qué, y cuando Lino entra por la puerta se echa a llorar sin saber por qué, y luego ya sí lo sabe. Brígida os paga con el ajuar entero y se queda tan ancha. Dentro de siete años, dice, piensa montar guardia en los mojones con una escoba.',
      ],
      end: true,
      exits: [],
    },
    fin_trueque: {
      title: 'Epílogo: lo comido por lo servido',
      art: 'village',
      ending: { title: 'Lo comido por lo servido', tone: 'mixed' },
      reward: { gold: 40, xp: 75 },
      text: [
        'El niño recupera su nombre junto al tercer mojón y lo grita para probarlo: "¡Lino!" Su madre pone tres platos. Brígida os paga con el ajuar entero. Todo eso sale bien.',
        'Lo otro tarda unos días en notarse. Uno de vosotros deja de tararear al caminar, y nadie recuerda desde cuándo. O ya no sueña con cierta casa. O hay un color que ahora le da igual. La señora Urraca fue justa: se llevó algo que valía exactamente un nombre de niño.',
        { if: (f) => f.tradedMemory, text: 'Con lo que ya cambiasteis en el callejón, sois dos farolillos en su estante. Hacéis buena pareja, seguro. Ella no tolera las series incompletas.' },
        'La feria volverá dentro de siete años. Tendréis siete años para reunir botones de nácar, o para decidir que hay cosas que se pueden vivir sin ellas. De momento, en Tresmojones hay un niño que sabe cómo se llama, y eso lo habéis pagado vosotros.',
      ],
      end: true,
      exits: [],
    },
    fin_ruptura: {
      title: 'Epílogo: siete años de mala cosecha',
      art: 'ruins',
      ending: { title: 'Siete años de mala cosecha', tone: 'mixed' },
      reward: { gold: 40, xp: 75 },
      text: [
        { if: (f) => f.foughtFair, text: 'Salís de la carpa mayor con el farolillo en alto mientras la feria se deshace a vuestro alrededor: las lonas son hojas secas, los farolillos son luciérnagas que huyen, el organillo es un grillo.' },
        { if: (f) => !f.foughtFair, text: 'La feria no os persigue. Hace algo peor: se va. Las lonas son de pronto hojas secas, los farolillos luciérnagas que huyen, el organillo un grillo que calla.' },
        'El niño recupera su nombre de golpe, a media carrera, y lo grita: "¡Lino!" Su madre lo oye desde la cocina y se le cae un plato, el tercero.',
        { if: (f) => f.beastsOwe, text: 'Con la feria rota, las cintas del tiovivo se sueltan todas. Al amanecer hay en el prado un hombre con bigote, una mujer con un solo pendiente y un muchacho que aúlla de alegría, preguntando en qué año están.' },
        'Pero una feria engañada no olvida. En el prado de los tres mojones no vuelve a crecer la hierba, las vacas dan la leche agria hasta el invierno, y los viejos dicen que así será siete años: lo que tarde la feria en decidir si vuelve. Brígida os paga igual. "Prefiero mala cosecha y hermano", dice, "que al revés." No todo el pueblo piensa lo mismo.',
      ],
      end: true,
      exits: [],
    },
    fin_feria: {
      title: 'Epílogo: siempre hacen falta feriantes',
      art: 'market',
      ending: { title: 'Siempre hacen falta feriantes', tone: 'bad' },
      reward: { xp: 50 },
      text: [
        { if: (f) => f.choseStay, text: 'Decís que sí. El gallo canta y, por primera vez, no os importa. La feria se pliega con vosotros dentro: os dan un delantal, un puesto pequeño y una bolsa para los botones. El niño de la cometa tiene el suyo al lado. Nunca os pregunta cómo se llama.' },
        { if: (f) => f.choseStay, text: 'En Tresmojones, una muchacha de trenzas espera junto a los mojones hasta que sale el sol. Luego vuelve a casa, donde hay dos platos en la mesa, y no consigue recordar por qué ha madrugado tanto.' },
        { if: (f) => !f.choseStay, text: 'Ganáis el nombre limpiamente. Abrís el farolillo, la luz vuela, y al otro lado del prado un niño grita "¡Lino!" y echa a correr hacia su casa. Vosotros vais a seguirlo, y no podéis cruzar el cerco de escarcha.' },
        { if: (f) => !f.choseStay, text: 'Pábilo, el farolero, os enseña vuestra página de la libreta. No dice nada: aquí lo dicho, dicho está. Quien debe, al gallo, se queda a pagar. Os dan un delantal y un puesto pequeño. Siete años, dice la señora Urraca, que es justa. Quizá algo menos, si regateáis bien.' },
        'Una noche cada siete años, en algún prado donde nunca pasta nadie, aparece una feria que nadie monta. Si vais, buscad un puesto atendido por gente con cara de haber sido aventurera. Regatean fatal. Y preguntan a todos los niños, por si acaso, si saben cómo se llaman.',
      ],
      end: true,
      exits: [],
    },
  },
};
