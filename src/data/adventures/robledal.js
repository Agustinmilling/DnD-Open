// Aventura original: "La Sombra bajo Robledal" (para 1-4 personajes de nivel 1 a 3).
// Historia y personajes originales. Monstruos y reglas: SRD 5.1.
//
// Estructura de una escena:
//   text:   párrafos (string o { if: (flags) => bool, text })
//   checks: opciones (pruebas de habilidad, pagos, acciones automáticas). preCombat = solo antes del encuentro.
//   combat: encuentro. auto(flags) decide si empieza solo; si no, aparecen las opciones preCombat y las salidas fight.
//           peaceful = recompensa si se resuelve sin luchar (además del hito de PX de victory).
//   exits:  salidas votadas. requires / showIf / hideIf usan flags. fight: true = empezar el combate.
//   shop:   tienda { objeto: precio en po }. shortRest: permite descanso corto. reward: oro/PX al entrar.

// Escala los encuentros según el tamaño del grupo (n = número de personajes en juego)
const scale = (n, table) => table[Math.max(1, Math.min(4, n)) - 1];

module.exports = {
  id: 'robledal',
  title: 'La Sombra bajo Robledal',
  summary: 'Los mineros de Robledal han desaparecido cerca del viejo santuario enano. Algo se esconde bajo la colina, y no son solo goblins.',
  art: 'lair',
  length: '1-2 horas',
  tags: ['Mazmorra', 'Goblins', 'Muertos vivientes', 'Para empezar'],
  endingCount: 1,
  journal: {
    knowsUndead: 'Bajo el santuario enano podría haber muertos vivientes.',
    knowsTraps: 'La entrada del santuario tiene trampas de dardos en el suelo.',
    knowsToll: 'Los goblins cobran peaje en el camino viejo; por el río se evita, pero hay lobos.',
    knowsVarga: 'Un osgo llamado Varga manda a los goblins.',
    snikFriend: 'Snik, el goblin del cepo, os debe la vida.',
    knowsSecret: 'Hay un pasadizo secreto tras la estatua del enano barbudo.',
    blessedAltar: 'El altar del yunque os ha bendecido.',
    minersFreed: 'Habéis liberado a los mineros.',
  },
  start: 'posada',
  startGold: 25, // po por personaje
  scenes: {
    posada: {
      title: 'La posada del Ciervo Cojo',
      art: 'tavern',
      text: [
        'Llueve sobre Robledal, una aldea de leñadores y mineros encajada entre robles centenarios. En la posada del Ciervo Cojo huele a sopa de cebolla y a leña húmeda.',
        'La alcaldesa Maren Tostado, una mujer robusta con las manos llenas de callos, se sienta a vuestra mesa sin pedir permiso. "Hace cuatro días, cinco mineros bajaron a la vieja galería junto al santuario enano de la colina. No han vuelto. Anoche alguien vio luces verdes entre los árboles y oyó risas... risas de goblin."',
        '"Puedo pagaros 50 piezas de oro a cada uno si los traéis de vuelta. Vivos, a ser posible." En la barra, la boticaria Rosa Albahaca ofrece pociones a quien pueda pagarlas.',
      ],
      shop: { potion_healing: 50, healers_kit: 5, rope: 1, rations: 1 },
      checks: [
        { id: 'insight', label: 'Observar a la alcaldesa (Perspicacia CD 12)', skill: 'insight', dc: 12,
          success: { text: 'Maren evita mirar hacia la colina cuando habla. Al presionarla, confiesa: "Mi abuelo decía que bajo el santuario enterraron a algo que no descansa. Los muertos de allí abajo... no siempre se quedan quietos." Ahora sabéis que podríais encontrar muertos vivientes.', flags: ['knowsUndead'], xp: 25 },
          fail: { text: 'La alcaldesa parece simplemente preocupada. No notas nada más.' } },
        { id: 'persuade', label: 'Negociar la recompensa (Persuasión CD 13)', skill: 'persuasion', dc: 13,
          success: { text: '"Está bien, está bien... 75 piezas cada uno. Y la posada os invita a la cena." Además os entrega una poción de curación del boticario.', gold: 25, items: { potion_healing: 1 }, xp: 25 },
          fail: { text: '"Cincuenta es todo lo que tiene la aldea", responde cruzándose de brazos.' } },
        { id: 'history', label: 'Recordar leyendas del santuario (Historia CD 12)', skill: 'history', dc: 12,
          success: { text: 'Recuerdas que los enanos del clan Hondaveta protegían sus criptas con trampas de dardos ocultas en el suelo de la entrada. Conviene ir con cuidado.', flags: ['knowsTraps'], xp: 25 },
          fail: { text: 'Del santuario solo recuerdas que es "muy viejo" y "muy enano".' } },
        { id: 'rumors', label: 'Invitar a una ronda y escuchar rumores (2 po por persona)', auto: true, cost: 2,
          success: { text: 'Con la cerveza corren las lenguas. Un leñador jura que los goblins cobran "peaje" en el camino viejo, y una cazadora dice que por el río se llega a la colina sin pasar por allí, aunque hay lobos.', flags: ['knowsToll'] } },
      ],
      exits: [{ label: 'Aceptar el encargo y partir hacia la colina', to: 'bosque' }],
    },

    bosque: {
      title: 'El sendero del bosque',
      art: 'forest',
      text: [
        'A la mañana siguiente seguís el viejo camino minero. Los robles se cierran sobre vosotros y la luz llega verdosa, filtrada por el musgo. El canto de los pájaros se apaga de golpe.',
        'Más adelante el sendero se estrecha entre dos rocas cubiertas de helechos: un lugar perfecto para una emboscada. A la izquierda, una vereda baja hacia el rumor de un río.',
      ],
      checks: [
        { id: 'tracks', label: 'Buscar huellas en el barro (Supervivencia CD 12)', skill: 'survival', dc: 12,
          success: { text: 'Huellas pequeñas y descalzas, y otras de lobo. Varias se desvían hacia las rocas. ¡Os están esperando!', flags: ['spotted'], xp: 25 },
          fail: { text: 'El barro está demasiado pisoteado para sacar nada en claro.' } },
        { id: 'sneak', label: 'Avanzar en sigilo hacia las rocas (Sigilo CD 11, prueba de grupo)', skill: 'stealth', dc: 11, mode: 'group',
          success: { text: 'Os deslizáis entre los helechos sin hacer ruido. Veis a los goblins agazapados de espaldas a vosotros...', flags: ['ambushReversed'], xp: 25 },
          fail: { text: 'Una rama cruje bajo una bota. Del otro lado de las rocas, alguien susurra en goblin. Al menos ahora sabéis que os esperan.', flags: ['alerted'] } },
      ],
      exits: [
        { label: 'Seguir por el camino viejo, entre las rocas', to: 'emboscada' },
        { label: 'Desviarse por la vereda del río (más largo)', to: 'rio' },
      ],
    },

    emboscada: {
      title: 'El paso de las rocas',
      art: 'ambush',
      text: [
        { if: (f) => !(f.spotted || f.ambushReversed || f.alerted), text: '¡Unas figuras de piel verdosa saltan desde las rocas chillando, con cimitarras oxidadas en la mano!' },
        { if: (f) => f.ambushReversed, text: 'Los goblins siguen agazapados tras las rocas, mirando hacia el camino. No os han visto. Su jefe, un goblin tuerto con un casco de olla, cuenta monedas en voz baja.' },
        { if: (f) => !f.ambushReversed && (f.spotted || f.alerted), text: 'Como no os pillan desprevenidos, los goblins salen de detrás de las rocas y os cortan el paso. El jefe, un goblin tuerto con un casco de olla, sonríe: "¡Peaje! Cinco moneda cada uno, o cinco dedo cada uno. Vosotro elegí."' },
      ],
      combat: {
        enemies: (n) => scale(n, [['goblin'], ['goblin', 'goblin'], ['goblin', 'goblin', 'goblin'], ['goblin', 'goblin', 'goblin', 'wolf']]),
        auto: (f) => !(f.spotted || f.ambushReversed || f.alerted),
        // 'enemies' = los enemigos están sorprendidos; 'perception' = cada PJ compara su Percepción pasiva con el Sigilo de los goblins
        surprise: (f) => (f.ambushReversed ? 'enemies' : f.spotted || f.alerted ? null : 'perception'),
        ambushStealth: 6,
        victory: {
          text: 'El último goblin cae. Entre sus harapos encontráis una nota garabateada en común: "Varga dize: traed a los mineros vibos al zantuario. El Hambriento quiere comer." Y una bolsa con monedas.',
          gold: 15, items: { potion_healing: 1 }, milestoneXp: 250,
        },
        peaceful: { text: 'Los goblins desaparecen entre los helechos. El camino hacia la colina queda libre.' },
      },
      checks: [
        { id: 'toll', label: 'Pagar el peaje (5 po por persona)', auto: true, cost: 5, preCombat: true, hideIf: ['ambushReversed'],
          success: { text: 'El jefe muerde cada moneda y se aparta con una reverencia burlona. "Varga contento. Vosotro pasa." Mientras se aleja, se le escapa que "el jefe grande" vive bajo el santuario.', flags: ['paidToll', 'knowsVarga'], peaceful: true } },
        { id: 'deceive', label: 'Hacerse pasar por enviados de Varga (Engaño CD 14)', skill: 'deception', dc: 14, preCombat: true,
          success: { text: 'Le dices al jefe que Varga os manda a revisar el peaje "porque falta dinero". El goblin palidece, os entrega su bolsa para demostrar su honradez y huye con los suyos.', flags: ['knowsVarga', 'tricked'], gold: 10, xp: 50, peaceful: true },
          fail: { text: '"¡Mentira! ¡Varga no tiene amigo!" El jefe chilla y sus goblins se lanzan sobre vosotros.', startCombat: true } },
        { id: 'intimidate', label: 'Intimidarlos para que huyan (Intimidación CD 13)', skill: 'intimidation', dc: 13, preCombat: true,
          success: { text: 'Das un paso al frente y el jefe goblin traga saliva. Un segundo después, todos corren monte arriba dejando atrás un saquito.', gold: 5, xp: 50, peaceful: true },
          fail: { text: 'Los goblins se ríen de tu amenaza... y desenvainan.', startCombat: true } },
      ],
      exits: [
        { label: '¡Atacar por sorpresa!', fight: true, showIf: ['ambushReversed'] },
        { label: '¡Atacar!', fight: true, hideIf: ['ambushReversed'] },
        { label: 'Continuar hacia el santuario', to: 'barranco' },
      ],
    },

    rio: {
      title: 'El vado de los lobos',
      art: 'river',
      text: [
        'La vereda baja hasta un río de aguas frías y rápidas. En la otra orilla, un goblin flacucho chilla con el pie atrapado en un cepo de cazador.',
        'Dos sombras grises lo rodean despacio, enseñando los dientes: lobos. Uno de ellos levanta el hocico y os huele.',
      ],
      combat: {
        enemies: (n) => scale(n, [['wolf'], ['wolf', 'wolf'], ['wolf', 'wolf', 'giant_rat'], ['wolf', 'wolf', 'wolf']]),
        auto: () => false,
        surprise: () => null,
        victory: { text: 'Los lobos caen o huyen aullando al bosque. El goblin os mira con los ojos como platos.', milestoneXp: 250 },
        peaceful: { text: 'Los lobos se marchan trotando entre los árboles. El goblin del cepo os mira con los ojos como platos.', xp: 25 },
      },
      checks: [
        { id: 'calm', label: 'Calmar a los lobos (Trato con animales CD 13)', skill: 'animal', dc: 13, preCombat: true,
          success: { text: 'Te agachas, hablas en voz baja y evitas mirarlos a los ojos. Los lobos dudan, gruñen... y se alejan.', peaceful: true },
          fail: { text: 'El lobo más grande interpreta tu gesto como un desafío. ¡Atacan!', startCombat: true } },
        { id: 'meat', label: 'Lanzarles comida (gasta 1 ración de quien lo haga)', auto: true, needsItem: 'rations', preCombat: true,
          success: { text: 'La carne seca vuela por el aire. Los lobos se pelean por ella y se la llevan al bosque.', peaceful: true } },
        { id: 'ford', label: 'Cruzar el vado (Atletismo CD 10, prueba de grupo)', skill: 'athletics', dc: 10, mode: 'group', hideIf: ['forded'], advIfItem: 'rope',
          success: { text: 'Con el agua por la cintura, cruzáis agarrados unos a otros.', flags: ['forded'] },
          fail: { text: 'La corriente os arrastra unos metros y os golpeáis contra las piedras antes de llegar a la otra orilla.', flags: ['forded'], damageFailed: { expr: '1d4', type: 'contundente' } } },
        { id: 'free', label: 'Liberar al goblin del cepo (Juego de manos o Medicina CD 10)', skill: 'sleight', altSkill: 'medicine', dc: 10, requires: ['forded'], hideIf: ['snikFriend', 'snikScared'],
          success: { text: 'Abres el cepo con cuidado. El goblin se llama Snik y no puede creer su suerte: "¡Snik debe vida! Escucha: cueva tiene puerta secreta detrás de estatua de enano barbudo. Y suelo de entrada tiene trampa de dardos." Luego cojea hacia el bosque.', flags: ['snikFriend', 'knowsSecret', 'knowsTraps'], xp: 50 },
          fail: { text: 'El cepo se te resbala y vuelve a cerrarse sobre el pie de Snik, que aúlla y te muerde. Al final consigues soltarlo, pero huye sin decir nada.', flags: ['snikScared'], damageFailed: { expr: '1d4', type: 'perforante' } } },
        { id: 'interrogate', label: 'Interrogar al goblin con amenazas (Intimidación CD 12)', skill: 'intimidation', dc: 12, requires: ['forded'], hideIf: ['snikFriend', 'snikScared'],
          success: { text: '"¡No pegar! ¡Snik habla!" Te cuenta que hay una puerta secreta tras la estatua del enano barbudo, y que Varga el osgo manda a todos. Cuando lo sueltas, sale corriendo.', flags: ['snikScared', 'knowsSecret', 'knowsVarga'], xp: 25 },
          fail: { text: 'Snik se hace el muerto con tanto talento que no hay manera de sacarle una palabra. Al final lo soltáis y desaparece.', flags: ['snikScared'] } },
      ],
      exits: [
        { label: '¡Atacar a los lobos!', fight: true },
        { label: 'Seguir río arriba hacia la colina', to: 'barranco', requires: ['forded'] },
      ],
    },

    barranco: {
      title: 'El barranco del puente roto',
      art: 'ravine',
      text: [
        'El camino termina en un barranco de unos seis metros. El antiguo puente colgante cuelga hecho jirones: alguien ha cortado las cuerdas a propósito.',
        'Al otro lado se ve la entrada de piedra del santuario, tallada con runas enanas.',
      ],
      checks: [
        { id: 'climb', label: 'Bajar y trepar por las rocas (Atletismo o Acrobacias CD 12, prueba de grupo; ventaja si lleváis cuerda)', skill: 'athletics', altSkill: 'acrobatics', dc: 12, mode: 'group', hideIf: ['crossed'], advIfItem: 'rope',
          success: { text: 'Os ayudáis unos a otros y llegáis arriba sin un rasguño.', flags: ['crossed'], xp: 50 },
          fail: { text: 'Algunos resbaláis en la roca mojada y os golpeáis contra las piedras antes de conseguir cruzar.', flags: ['crossed'], damageFailed: { expr: '1d6', type: 'contundente' }, xp: 25 } },
        { id: 'path', label: 'Buscar otro camino (Supervivencia CD 14)', skill: 'survival', dc: 14, hideIf: ['crossed'],
          success: { text: 'Encuentras un sendero de cabras que baja y vuelve a subir por el otro lado. Tardáis más, pero llegáis sin problemas.', flags: ['crossed'], xp: 50 },
          fail: { text: 'No ves ningún otro camino. Habrá que trepar.' } },
        { id: 'bridge', label: 'Reparar el puente con una cuerda (Juego de manos CD 13, gasta la cuerda)', skill: 'sleight', dc: 13, needsItem: 'rope', hideIf: ['crossed'],
          success: { text: 'Atas la cuerda a los postes con un nudo de marinero y el puente vuelve a aguantar. Cruzáis con cuidado.', flags: ['crossed'], xp: 50 },
          fail: { text: 'El nudo se suelta y la cuerda cae al fondo del barranco. Toca trepar.' } },
      ],
      exits: [{ label: 'Acercarse a la entrada del santuario', to: 'entrada', requires: ['crossed'] }],
    },

    entrada: {
      title: 'La entrada del santuario',
      art: 'ruins',
      text: [
        'Dos estatuas de enanos con barbas de piedra flanquean una escalera que desciende a la oscuridad. Del fondo sube un olor a tierra húmeda... y a carne podrida.',
        'A un lado, un pequeño altar con un yunque de piedra conserva todavía restos de ofrendas. Es un buen sitio para recuperar el aliento antes de bajar.',
      ],
      shortRest: true,
      checks: [
        { id: 'trap', label: 'Examinar el suelo de la escalera (Investigación o Percepción CD 13)', skill: 'investigation', altSkill: 'perception', dc: 13, advIf: ['knowsTraps'],
          success: { text: 'Descubres losas ligeramente hundidas: placas de presión conectadas a dardos ocultos. Las marcáis con tiza para esquivarlas.', flags: ['trapFound'], xp: 25 },
          fail: { text: 'La escalera parece segura... aparentemente.' } },
        { id: 'arcana', label: 'Leer las runas de las estatuas (Arcanos o Religión CD 12)', skill: 'arcana', altSkill: 'religion', dc: 12,
          success: { text: 'Las runas son una oración funeraria: "Aquí duerme Hurgen el Glotón, maldito por devorar a sus hermanos. Que la piedra lo contenga." Algo hambriento os espera abajo.', flags: ['knowsUndead'], xp: 25 },
          fail: { text: 'Las runas están demasiado erosionadas para leerlas.' } },
        { id: 'pray', label: 'Rezar ante el altar del yunque (Religión CD 13)', skill: 'religion', dc: 13, hideIf: ['blessedAltar'],
          success: { text: 'Una calidez suave sale del yunque de piedra y os recorre el cuerpo. El viejo dios de la forja todavía escucha.', flags: ['blessedAltar'], tempHp: 5, xp: 25 },
          fail: { text: 'El altar permanece frío y en silencio.' } },
        { id: 'offering', label: 'Dejar una ofrenda en el altar (5 po por persona)', auto: true, cost: 5, hideIf: ['blessedAltar'],
          success: { text: 'Las monedas tintinean sobre el yunque y una luz rojiza parpadea en las runas. Os sentís más fuertes.', flags: ['blessedAltar'], tempHp: 5 } },
        { id: 'secret', label: 'Buscar otra entrada alrededor de las estatuas (Investigación CD 16)', skill: 'investigation', dc: 16, hideIf: ['knowsSecret'],
          success: { text: 'Detrás de la estatua del enano barbudo, una losa suena hueca. ¡Hay un pasadizo secreto!', flags: ['knowsSecret'], xp: 50 },
          fail: { text: 'Solo encuentras musgo y algún escarabajo.' } },
      ],
      exits: [
        { label: 'Descender por la escalera principal a la cripta', to: 'cripta' },
        { label: 'Colarse por el pasadizo secreto tras la estatua', to: 'pasadizo', showIf: ['knowsSecret'] },
      ],
    },

    cripta: {
      title: 'La cripta de los guardianes',
      art: 'crypt',
      text: ['Al pie de la escalera se abre una sala con nichos funerarios. Los huesos crujen. De los nichos se levantan figuras que hace siglos que deberían estar quietas, y entre los huesos corretean ratas del tamaño de perros.'],
      trap: { unless: 'trapFound', save: 'dex', dc: 12, damage: '2d6', type: 'perforante', text: '¡Clic! Una losa se hunde bajo vuestros pies y una lluvia de dardos sale de las paredes.' },
      combat: {
        enemies: (n) => scale(n, [['skeleton', 'giant_rat'], ['skeleton', 'skeleton', 'giant_rat'], ['skeleton', 'skeleton', 'zombie', 'giant_rat', 'giant_rat'], ['skeleton', 'skeleton', 'skeleton', 'zombie', 'giant_rat', 'giant_rat']]),
        surprise: () => null,
        victory: {
          text: 'Los huesos se desmoronan por fin. En uno de los nichos, envuelta en tela podrida, encontráis una capa de lana gris que no tiene ni una mota de polvo: una Capa de protección. También hay una poción de curación junto a un altar.',
          gold: 30, items: { cloak_protection: 1, potion_healing: 1 }, milestoneXp: 400,
        },
      },
      exits: [{ label: 'Seguir por el pasadizo hacia las voces', to: 'puerta' }],
    },

    pasadizo: {
      title: 'El pasadizo de los enanos',
      art: 'tunnel',
      text: [
        'El pasadizo es estrecho y bajo: hasta los medianos tienen que agacharse. Huele a moho y a algo peor. Un chillido agudo resuena delante: un nido de ratas gigantes bloquea el camino.',
      ],
      combat: {
        enemies: (n) => scale(n, [['giant_rat', 'giant_rat'], ['giant_rat', 'giant_rat', 'giant_rat'], ['giant_rat', 'giant_rat', 'giant_rat', 'giant_rat'], ['giant_rat', 'giant_rat', 'giant_rat', 'giant_rat', 'zombie']]),
        surprise: () => null,
        victory: {
          text: 'Entre la paja del nido brilla algo: una capa gris sin una mota de polvo (una Capa de protección) y los restos de la mochila de un minero con una poción. Al fondo, el pasadizo termina en una rendija desde la que se ve la guarida... y nadie os ha oído llegar.',
          gold: 20, items: { cloak_protection: 1, potion_healing: 1 }, milestoneXp: 450, flags: ['sneakBoss'],
        },
      },
      shortRest: true,
      exits: [{ label: 'Asomarse a la guarida por la rendija', to: 'guarida' }],
    },

    puerta: {
      title: 'La puerta sellada',
      art: 'door',
      text: [
        'El pasadizo termina en una puerta de piedra maciza con un círculo de runas en el centro. Al otro lado se oyen voces: gruñidos goblin, un llanto humano... y un sonido húmedo, como de algo masticando.',
      ],
      shortRest: true,
      checks: [
        { id: 'runes', label: 'Activar las runas de apertura (Religión o Arcanos CD 13)', skill: 'religion', altSkill: 'arcana', dc: 13, hideIf: ['doorOpen'], retry: true,
          success: { text: 'Recitas la oración enana correcta y la puerta se desliza en silencio. Nadie al otro lado se ha dado cuenta.', flags: ['doorOpen'], xp: 50 },
          fail: { text: 'Las runas parpadean y se apagan. Quizá otra persona tenga más suerte.' } },
        { id: 'lock', label: 'Forzar el mecanismo (Juego de manos CD 14)', skill: 'sleight', dc: 14, hideIf: ['doorOpen'], retry: true,
          success: { text: 'Encuentras el mecanismo oculto tras una runa y lo haces girar. La puerta se abre sin un ruido.', flags: ['doorOpen'], xp: 50 },
          fail: { text: 'El mecanismo se resiste.' } },
        { id: 'force', label: 'Echar la puerta abajo entre todos (éxito seguro, pero ruidoso)', auto: true, hideIf: ['doorOpen'],
          success: { text: '¡CRAAAC! La puerta cede tras varios empujones. Al otro lado, alguien grita en goblin: "¡Intrusos!".', flags: ['doorOpen', 'noisy'] } },
        { id: 'sneakBoss', label: 'Entrar en silencio (Sigilo CD 12, prueba de grupo)', skill: 'stealth', dc: 12, mode: 'group', requires: ['doorOpen'], hideIf: ['noisy'],
          success: { text: 'Os colocáis en la penumbra sin que os vean. Tendréis la iniciativa del ataque.', flags: ['sneakBoss'], xp: 25 },
          fail: { text: 'Un guijarro rueda bajo vuestros pies. Las voces se callan de golpe.', flags: ['noisy'] } },
      ],
      exits: [{ label: '¡Entrar en la guarida!', to: 'guarida', requires: ['doorOpen'] }],
    },

    guarida: {
      title: 'La guarida de Varga',
      art: 'lair',
      text: [
        'Una caverna iluminada por hongos verdes. Los cinco mineros están atados junto a una fosa. Sobre una roca, un osgo enorme con un lucero del alba ensangrentado afila sus dientes: es Varga.',
        { if: (f) => f.noisy, text: '"¡Más carne para el Hambriento!", ruge al veros entrar. A su espalda, algo pálido y encorvado se arrastra fuera de la fosa relamiéndose.' },
        { if: (f) => !f.noisy, text: 'Todavía no os ha visto. A su espalda, algo pálido y encorvado dormita junto a la fosa: el necrófago al que los enanos llamaban Hurgen el Glotón. Varga lo mira de reojo, con miedo.' },
      ],
      combat: {
        enemies: (n) => scale(n, [['bugbear'], ['bugbear', 'goblin', 'goblin'], ['bugbear', 'ghoul', 'goblin'], ['bugbear', 'ghoul', 'goblin', 'goblin', 'wolf']]),
        names: { bugbear: 'Varga el Osgo', ghoul: 'Hurgen el Glotón' },
        auto: (f) => !!f.noisy,
        surprise: (f) => (f.sneakBoss ? 'enemies' : null),
        adjust: (enemies, f, log) => {
          if (!f.turncoat) return;
          for (const e of enemies) {
            if (e.type === 'bugbear' || e.type === 'ghoul') { e.hp = Math.ceil(e.hp / 2); }
          }
          log('Varga y el necrófago se han estado despedazando entre ellos: ¡ambos empiezan el combate malheridos!');
        },
        victory: {
          text: 'Varga se desploma y el necrófago vuelve a ser un montón de huesos. Liberáis a los mineros, débiles pero vivos. Entre el botín del osgo hay oro enano y un arma con runas que brillan levemente.',
          gold: 100, items: { weapon_plus1: 1, potion_greater_healing: 1 }, milestoneXp: 300,
        },
      },
      checks: [
        { id: 'freeMiners', label: 'Liberar a los mineros en silencio antes de atacar (Sigilo CD 13, prueba de grupo)', skill: 'stealth', dc: 13, mode: 'group', preCombat: true, hideIf: ['minersFreed'], advIf: ['sneakBoss'],
          success: { text: 'Cortáis las cuerdas una a una mientras Varga mira hacia otro lado. Los mineros se esconden detrás de unas rocas. Ahora podéis atacar sin miedo a que los usen de rehenes.', flags: ['minersFreed', 'sneakBoss'], xp: 50 },
          fail: { text: 'Un minero solloza de alivio demasiado alto. Varga se gira: "¡LADRONES!".', flags: ['noisy'], startCombat: true } },
        { id: 'turncoat', label: 'Engañar a Varga: el Hambriento quiere comérselo a él (Engaño CD 15)', skill: 'deception', dc: 15, preCombat: true, hideIf: ['turncoat'],
          success: { text: 'Desde la sombra, susurras con voz cavernosa: "Varga... Varga sabe bien...". El osgo, aterrorizado, golpea al necrófago, que despierta furioso. ¡Se despedazan durante un buen rato antes de veros!', flags: ['turncoat'], xp: 50 },
          fail: { text: 'Varga olfatea el aire. "Eso no es el Hambriento. ¡Eso es CARNE!"', flags: ['noisy'], startCombat: true } },
      ],
      exits: [
        { label: '¡Al ataque!', fight: true },
        { label: 'Volver a Robledal con los mineros', to: 'epilogo' },
      ],
    },

    epilogo: {
      title: 'Epílogo: el regreso a Robledal',
      art: 'village',
      text: [
        'Toda la aldea sale a recibiros con antorchas. Los mineros abrazan a sus familias y la alcaldesa Maren cumple su palabra: os paga la recompensa prometida y la posada del Ciervo Cojo os invita a una semana de sopa de cebolla.',
        { if: (f) => f.minersFreed, text: 'Los mineros cuentan a todo el que quiera oírlo cómo los liberasteis delante de las narices del osgo. Os llaman "los Sombras de Robledal".' },
        { if: (f) => f.snikFriend, text: 'Al amanecer encontráis en la puerta de la posada un ramillete de setas venenosas atado con un cordel. Es el regalo de Snik. Probablemente con buena intención.' },
        { if: (f) => f.paidToll, text: 'Dicen que los goblins del peaje siguen por el camino viejo, ahora sin jefe al que rendir cuentas. Quizá algún día haya que volver a hablar con ellos.' },
        { if: (f) => f.turncoat, text: 'Los bardos ya cantan cómo engañasteis a un osgo para que peleara contra su propio monstruo.' },
        'Esa noche, mientras la lluvia vuelve a caer, el viejo minero Telmo os cuenta en voz baja que Varga no actuaba solo: "Hablaba de un tal Amo de las Cenizas, más allá de las montañas..."',
        'FIN de la primera aventura. ¡Gracias por jugar!',
      ],
      reward: { gold: 50 },
      end: true,
      exits: [],
    },
  },
};
