// Aventura original: "La Biblioteca bajo la Sal" (para 1-4 personajes de nivel 1 a 3). Exploración y magia antigua.
// Historia, lugares y personajes originales. Monstruos y reglas: SRD 5.2.1.
//
// Ramificaciones principales:
//   - Tres pistas en cualquier orden (campamento rival, salineros, observatorio). Cada una da ventaja a la expedición
//     rival (contador `lead`): si llega a 3, la Coleccionista os alcanza abajo con toda su gente.
//   - Contador `cracks` (grietas): forzar el paso y los derrumbes debilitan la costra de sal. Con 4, todo se hunde.
//   - Contador `pages` (saber rescatado): lo que se copia o se salva decide qué queda de la biblioteca.
//   - Tres formas de bajar (la brecha, la escalera de la cúpula, el pozo de salmuera) y cuatro finales.

const scale = (n, table) => table[Math.max(1, Math.min(4, n)) - 1];
const num = (f, k) => Number(f[k]) || 0;
const day = { inc: { lead: 1 } };
const HINT = 'Una pista más… pero los rivales siguen cavando.';
const leadExits = [
  { label: 'Acercarse al campamento de la expedición rival', to: 'campamento', hideIf: ['visitedCamp'], effects: day, hint: HINT },
  { label: 'Visitar las salinas de los salineros', to: 'salinas', hideIf: ['visitedSalt'], effects: day, hint: HINT },
  { label: 'Cruzar hasta la cúpula que asoma de la sal', to: 'observatorio', hideIf: ['visitedDome'], effects: day, hint: HINT },
];
const toDescent = { label: 'Ir a la brecha y prepararse para bajar', to: 'descenso' };
const deepExits = [
  { label: 'Entrar en la sala de copia', to: 'scriptorio', hideIf: ['visitedScript'] },
  { label: 'Entrar en la galería de los Vacíos', to: 'galeria', hideIf: ['visitedGallery'] },
  { label: 'Seguir hacia la cámara del Índice', to: 'antecamara' },
];

module.exports = {
  id: 'salar',
  title: 'La Biblioteca bajo la Sal',
  summary: 'Bajo la costra blanca del Salar de Almagre duerme un colegio de magos que se enterró a sí mismo. Una coleccionista sin escrúpulos ya está cavando. Llegad antes que ella… y decidid si lo que hay abajo debe salir.',
  art: 'ruins',
  length: '2-3 horas',
  tags: ['Exploración', 'Magia antigua', 'Carrera contra rivales', 'Ruinas'],
  endingCount: 4,
  start: 'pozo',
  startGold: 20,
  startFlags: { lead: 0, cracks: 0, pages: 0 },
  journal: {
    knowsCollege: 'Bajo el salar está el Colegio de las Nueve Lámparas. Nadie lo destruyó: lo anegaron desde dentro.',
    knowsBuyer: 'Doña Casilda Brantome, «la Coleccionista», ya tiene comprador para lo que saque de abajo. No le importa qué sea.',
    plans: 'Tenéis los planos de la excavación rival: sabéis dónde han apuntalado y dónde no.',
    metCollector: 'Habéis hablado con la Coleccionista cara a cara. Negocia con todo, también con vosotros.',
    guideAlly: 'La abuela Yedra y sus salineros os guían por la costra firme.',
    knowsCurse: 'Los salineros dicen que la sal recuerda: quien duerme sobre el salar sueña recuerdos que no son suyos.',
    knowsShaft: 'Un pozo de salmuera de los salineros baja hasta una sala llena de estantes, sin pasar por la entrada.',
    domeDoor: 'En la cúpula hay una escalera de caracol despejada que baja hasta el atrio.',
    knowsWords: 'Las Nueve Palabras del Colegio: los celadores de piedra dejan pasar a quien las pronuncia.',
    knowsFall: 'El Índice copiaba todo lo que leía, también a sus lectores, y los dejaba en blanco. La última archivera anegó el colegio para enterrarlo.',
    ulmaPeace: 'La archivera Ulma os ha dado su anillo de sello. Sus Vacíos no os tocarán.',
    shored: 'Habéis apuntalado la brecha: aguantará aunque tiemble.',
    truce: 'Tregua con la Coleccionista: ella se queda en la antecámara y vosotros decidís sobre el Índice.',
    collectorDown: 'La expedición de la Coleccionista ya no os disputa la biblioteca.',
    lampsLit: 'Habéis encendido las Nueve Lámparas del atrio. Abajo, las sombras se encogen.',
    lead: (f) => `Ventaja de los rivales: ${'⛏️'.repeat(Math.max(0, Math.min(5, num(f, 'lead')))) || 'ninguna'}${num(f, 'lead') >= 3 ? ' (ya están abajo)' : ''}`,
    cracks: (f) => `Grietas en la costra: ${'💥'.repeat(Math.max(0, Math.min(5, num(f, 'cracks')))) || 'ninguna'}${num(f, 'cracks') >= 3 && !f.shored ? ' (un estruendo más y todo se hunde)' : ''}`,
    pages: (f) => `Saber rescatado: ${Math.max(0, num(f, 'pages'))}`,
  },
  scenes: {
    // ------------------------------------------------------------------ el borde del salar
    pozo: {
      title: 'Pozo Amargo',
      art: 'village',
      text: [
        'Pozo Amargo es la última posta antes del Salar de Almagre: cuatro casas de adobe, un abrevadero y, a partir de ahí, una llanura blanca que cruje bajo el sol hasta donde alcanza la vista. A media legua, clavada en la sal como la cáscara de un huevo, asoma media cúpula de bronce verdoso.',
        'La cartógrafa Olalla Berenguer os espera a la sombra, con un mapa sujeto con piedras. "Hace tres siglos aquí había un lago y, en su orilla, un colegio de magos: el de las Nueve Lámparas. Una noche el lago subió y se lo tragó. Luego el lago se secó. El colegio sigue ahí abajo, entero, en salmuera."',
        'Señala unas tiendas de lona roja junto a un cabrestante. "Y esa es doña Casilda Brantome. La llaman la Coleccionista. Lleva una semana cavando y vende al mejor postor lo que encuentra, sea un libro o una peste. Os pago 60 piezas de oro a cada uno por bajar antes que ella y decidir con cabeza qué debe salir de ahí y qué no."',
        'Un buhonero ha montado su puesto junto al abrevadero.',
      ],
      shop: { potion_healing: 50, torch: 1, rope: 1, healers_kit: 5, antitoxin: 50, thieves_tools: 25 },
      checks: [
        { id: 'tablet', label: 'Examinar la tablilla de sal que encontró Olalla (Arcanos CD 11)', skill: 'arcana', dc: 11,
          success: { text: 'La tablilla es sal prensada, dura como el mármol, y está escrita por dentro: las letras flotan en el cristal. Es una ficha de préstamo. «Devuélvase al Índice», dice, y debajo, con otra mano y más prisa: «No devolváis nada. No le deis nada más que leer».', flags: ['knowsCollege'], inc: { pages: 1 }, xp: 25 },
          fail: { text: 'Sal prensada con letras dentro. Bonita, ilegible y, por alguna razón, tibia al tacto.' } },
        { id: 'lake', label: 'Recordar la historia del lago (Historia CD 12)', skill: 'history', dc: 12,
          success: { text: 'Las crónicas dicen que el lago de Almagre «subió en una noche sin lluvia». Un lago no hace eso. Unas compuertas, sí. Nadie atacó el Colegio de las Nueve Lámparas: alguien de dentro abrió el agua.', flags: ['knowsCollege'], xp: 25 },
          fail: { text: 'Recuerdas que aquí hubo un lago y que la sal de Almagre se paga bien. Poco más.' } },
        { id: 'spy', label: 'Observar el campamento rival desde lejos (Percepción CD 11)', skill: 'perception', dc: 11,
          success: { text: 'Cuentas una docena de braceros, media de gente armada y un cabrestante que no para. Sacan cubos de sal, no de tierra: aún no han roto el techo. Pero trabajan a turnos, de día y de noche. Les queda poco.', flags: ['countedCamp'], xp: 25 },
          fail: { text: 'El reflejo de la sal te hace llorar los ojos. Ves lona roja, humo y gente que cava.' } },
        { id: 'olalla', label: 'Sonsacar a Olalla lo que no os ha contado (Perspicacia CD 12)', skill: 'insight', dc: 12,
          success: { text: 'Olalla baja la voz. "Mandé a un ayudante a dormir junto a la cúpula. Volvió sabiendo declinar una lengua muerta y sin recordar el nombre de su madre. Lo que hay abajo no solo guarda cosas. También se las queda." Os da unas monedas más por las molestias de haber callado.', flags: ['knowsCurse'], gold: 5, xp: 25 },
          fail: { text: '"Os he contado lo que sé", dice Olalla, y enrolla el mapa demasiado deprisa.' } },
      ],
      exits: [...leadExits.map((e) => ({ ...e, effects: undefined, hint: null })), toDescent],
    },

    // ------------------------------------------------------------------ pista 1: el campamento rival
    campamento: {
      title: 'Las tiendas rojas',
      art: 'hideout',
      onEnter: { flags: ['visitedCamp'] },
      text: [
        'El campamento de la Coleccionista huele a sebo de polea y a café recocido. Los braceros suben cubos de sal sin levantar la vista; los que llevan espada, en cambio, os miran desde lejos y se pasan la voz.',
        'En la tienda grande, entre cajas ya rotuladas con nombres de compradores, una mujer de guantes blancos pesa un fragmento de bronce en una balanza de joyero. Fuera, colgados de un poste, están los planos de la excavación.',
      ],
      combat: {
        enemies: (n) => scale(n, [['bandit'], ['bandit', 'bandit'], ['thug', 'bandit'], ['thug', 'bandit', 'scout']]),
        names: { thug: 'Capataz de la excavación', scout: 'Batidora de la Coleccionista' },
        auto: () => false,
        surprise: (f) => (f.campAmbush ? 'party' : null),
        victory: { text: 'Los guardias sueltan las armas o echan a correr hacia la llanura. Los braceros siguen subiendo cubos: a ellos les pagan por cavar, no por pelear.', milestoneXp: 200, gold: 8, flags: ['campBeaten'] },
        peaceful: { text: 'Los guardias os dejan ir sin perderos de vista. Nadie quiere sangre a pleno sol.' },
      },
      checks: [
        { id: 'sneak', label: 'Colarse entre las tiendas (Sigilo CD 12, prueba de grupo)', skill: 'stealth', dc: 12, mode: 'group', preCombat: true,
          success: { text: 'Os movéis entre montones de sal y lonas tendidas. Cuando los guardias quieren daros el alto, ya estáis a su espalda.', flags: ['campAmbush'], startCombat: true },
          fail: { text: 'Una polea chirría, alguien se vuelve y un silbato corta el aire del campamento.', inc: { lead: 1 }, startCombat: true } },
        { id: 'visit', label: 'Presentarse como compradores interesados (Engaño CD 12)', skill: 'deception', dc: 12, preCombat: true,
          success: { text: 'Habláis de porcentajes y de discreción, y nadie pregunta más. Os sirven café. Por una tarde, sois clientes.', peaceful: true, flags: ['campGuest'] },
          fail: { text: '"Los compradores no llegan a pie ni con las botas así", dice el capataz, y hace una seña a los suyos.', startCombat: true } },
        { id: 'bribe', label: 'Pagar a los guardias para que miren a otro lado (5 po por persona)', auto: true, cost: 5, preCombat: true,
          success: { text: 'Las monedas cambian de mano. "Media hora", dice un guardia. "Y no toquéis las cajas."', peaceful: true } },
        { id: 'plans', label: 'Llevarse los planos del poste (Juego de Manos CD 12)', skill: 'sleight', dc: 12, hideIf: ['plans'],
          success: { text: 'Descuelgas los planos, los cambias por un pliego en blanco y sigues andando. Marcan cada puntal de la brecha… y un tramo entero donde no han puesto ninguno.', flags: ['plans'], xp: 50 },
          fail: { text: 'Alcanzas a mirarlos un instante antes de que un guardia se acerque. Te quedas con lo esencial: la brecha baja recta y está mal apuntalada.' } },
        { id: 'casilda', label: 'Hablar con la Coleccionista (Persuasión o Perspicacia CD 12)', skill: 'persuasion', altSkill: 'insight', dc: 12, hideIf: ['metCollector'],
          success: { text: 'Doña Casilda Brantome no levanta la voz ni la vista de la balanza. "Yo no creo en maldiciones, creo en inventarios. Abajo hay una cosa que lo sabe todo, y hay tres casas que pujan por ella. Si llegáis antes, venid a verme: pago mejor que la cartógrafa." Al despediros, os mira por fin. No es codicia. Es hambre de completar una serie.', flags: ['metCollector', 'knowsBuyer'], xp: 50 },
          fail: { text: '"No doy visitas guiadas", dice la mujer de los guantes blancos, y un guardia os acompaña amablemente hasta el borde del campamento.', flags: ['metCollector'] } },
        { id: 'winch', label: 'Aflojar el cabrestante sin que se note (Investigación o Juego de Manos CD 13)', skill: 'investigation', altSkill: 'sleight', dc: 13, hideIf: ['sabotage'],
          success: { text: 'Un pasador limado, una cuña fuera de sitio. Esta noche el cabrestante se soltará con el primer cubo y tardarán un día en volver a montarlo.', flags: ['sabotage'], inc: { lead: -1 }, xp: 50 },
          fail: { text: 'El pasador no cede y un bracero te mira raro. Lo dejas estar antes de que llame a alguien.', flags: ['sabotage'] } },
      ],
      exits: [{ label: '¡Abrirse paso por las malas!', fight: true }, ...leadExits, toDescent],
    },

    // ------------------------------------------------------------------ pista 2: los salineros
    salinas: {
      title: 'Las salinas de la abuela Yedra',
      art: 'coast',
      onEnter: { flags: ['visitedSalt'] },
      text: [
        'Los salineros acampan donde la costra es más gruesa: carros bajos de ruedas anchas, balsas de salmuera de colores imposibles y montones de sal que brillan como nieve sucia. La abuela Yedra, una mujer seca con un bastón forrado de cobre, os mira llegar sin levantarse.',
        '"No pisamos más allá de las estacas", dice. "Más allá, la sal recuerda." Antes de que pueda explicarse, los perros del campamento rompen a ladrar: algo sale reptando de un pozo de salmuera, y no viene solo.',
      ],
      combat: {
        enemies: (n) => scale(n, [['hyena', 'hyena'], ['giant_venomous_snake', 'hyena'], ['giant_venomous_snake', 'giant_venomous_snake', 'hyena'], ['giant_venomous_snake', 'giant_venomous_snake', 'hyena', 'hyena']]),
        names: { giant_venomous_snake: 'Víbora del salar', hyena: 'Hiena de la costra' },
        auto: () => false,
        surprise: () => null,
        victory: { text: 'La última víbora queda tendida sobre la sal, blanca de escamas, casi de cristal. Los salineros os miran de otra manera. Alguien os acerca un cuenco de agua dulce, que aquí vale más que el vino.', milestoneXp: 200, flags: ['saltHeroes'], items: { antitoxin: 1 } },
        peaceful: { text: 'Las bestias vuelven al pozo y la salmuera se cierra sobre ellas sin una onda.' },
      },
      checks: [
        { id: 'calmBeasts', label: 'Espantarlas sin hacerles daño (Trato con Animales CD 12)', skill: 'animal', dc: 12, preCombat: true,
          success: { text: 'No tienen hambre: huyen de algo. Golpeas el suelo con ritmo, lejos del pozo, y siguen la vibración hasta otro agujero. Yedra asiente despacio. "Eso lo hacía mi madre."', peaceful: true, flags: ['saltHeroes'] },
          fail: { text: 'La víbora más grande se yergue, sisea y se lanza.', startCombat: true } },
        { id: 'yedra', label: 'Ganarse a la abuela Yedra (Persuasión CD 12; ventaja si habéis defendido el campamento)', skill: 'persuasion', dc: 12, advIf: ['saltHeroes'], hideIf: ['guideAlly'],
          success: { text: '"La de los guantes blancos nos ofreció oro por guiarla. Vosotros habéis preguntado antes de pisar." Yedra clava el bastón en la sal y escucha. "Hay costra firme y costra hueca. Os enseñaré cuál es cuál. Ganaréis medio día."', flags: ['guideAlly'], inc: { lead: -1 }, xp: 50 },
          fail: { text: '"Todos los que vienen quieren bajar", dice Yedra. "Ninguno pregunta por qué nadie ha subido." No os echa, pero tampoco os ayuda.' } },
        { id: 'legend', label: 'Escuchar lo que cuentan de la sal (Religión o Historia CD 11)', skill: 'religion', altSkill: 'history', dc: 11,
          success: { text: 'Junto al fuego, un viejo canta la lista de los que durmieron más allá de las estacas: volvieron sabiendo cosas, y sin saber quiénes eran. "La sal no olvida nada", dice el estribillo, "así que se queda con lo tuyo para tener sitio." No es una maldición. Es alguien que colecciona.', flags: ['knowsCurse'], xp: 50 },
          fail: { text: 'Cantan en un dialecto cerrado. Entiendes «sal», «sueño» y «no vuelvas».', flags: ['knowsCurse'] } },
        { id: 'heal', label: 'Atender a un salinero mordido (Medicina CD 11)', skill: 'medicine', dc: 11, hideIf: ['healedSalt'],
          success: { text: 'Sajas, chupas el veneno, vendas. El muchacho vivirá. Su madre os cuelga del cuello unas bolsitas de sal gris. "De la de antes del colegio. Esta no recuerda nada."', flags: ['healedSalt'], tempHp: 4, xp: 50 },
          fail: { text: 'Haces lo que puedes. El muchacho vivirá, aunque cojeará un tiempo.', flags: ['healedSalt'] } },
        { id: 'shaft', label: 'Seguir el rastro de las bestias hasta su pozo (Supervivencia CD 12)', skill: 'survival', dc: 12, hideIf: ['knowsShaft'],
          success: { text: 'El pozo de salmuera no tiene fondo de sal: tiene un techo de piedra labrada, roto. Bajas una piedra atada a un cordel y oyes madera, luego papel. Hay una sala llena de estantes ahí abajo, y las bestias huyen de ella.', flags: ['knowsShaft'], xp: 50 },
          fail: { text: 'El rastro se pierde en la costra dura. Solo sacas en claro que las bestias suben de abajo, y con prisa.' } },
      ],
      exits: [{ label: '¡Defender el campamento!', fight: true }, ...leadExits, toDescent],
    },

    // ------------------------------------------------------------------ pista 3: la cúpula
    observatorio: {
      title: 'La cúpula del observatorio',
      art: 'lighthouse',
      onEnter: { flags: ['visitedDome'] },
      text: [
        'La media cúpula es más grande de cerca: bronce de un palmo de grosor, comido de verde, con una raja por la que cabe una persona. Dentro, la luz entra a rayas sobre un suelo de mosaico donde alguien dibujó el cielo con teselas de vidrio.',
        'En el centro hay un atril vacío y, a su lado, de pie, lo que parece una estatua de celador con un libro de registro en las manos. Cuando cruzáis el umbral, la estatua pasa una página.',
      ],
      combat: {
        enemies: (n) => scale(n, [['zombie'], ['skeleton', 'zombie'], ['animated_armor'], ['animated_armor', 'skeleton']]),
        names: { animated_armor: 'Celador de bronce', skeleton: 'Bedel sin relevo', zombie: 'Celador en salmuera' },
        auto: () => true,
        surprise: () => null,
        victory: { text: 'El celador se desploma con estrépito de calderería. Del libro de registro solo queda la última línea legible: «Cerrado por inventario. No se admiten lectores. No se admiten lectores. No se admiten».', milestoneXp: 200, gold: 6 },
      },
      checks: [
        { id: 'stars', label: 'Leer el cielo del mosaico (Arcanos CD 12)', skill: 'arcana', dc: 12,
          success: { text: 'No es un mapa del cielo: es un índice. Nueve constelaciones, nueve lámparas, nueve palabras grabadas en el borde de las teselas. Las copias. Son un santo y seña: lo que un lector decía en la puerta para que los celadores lo dejaran pasar.', flags: ['knowsWords'], inc: { pages: 1 }, xp: 50 },
          fail: { text: 'Reconoces las constelaciones, pero están ordenadas de un modo que no es astronómico. Alfabético, quizá.' } },
        { id: 'stairs', label: 'Despejar la escalera de caracol (Atletismo CD 12; ventaja con cuerda)', skill: 'athletics', dc: 12, advIfItem: 'rope', hideIf: ['domeDoor', 'domeFail'],
          success: { text: 'Bajo los cascotes hay una escalera de caracol de piedra, seca y entera. Baja mucho más de lo que la cúpula sugiere. Abajo, muy lejos, hay un resplandor que no es de sol.', flags: ['domeDoor'], xp: 50 },
          fail: { text: 'Un bloque se te escapa y rueda escalera abajo con un estruendo que tarda demasiado en apagarse. La costra entera se queja. La escalera queda cegada.', flags: ['domeFail'], inc: { cracks: 1 }, damageFailed: { expr: '1d4', type: 'contundente' } } },
        { id: 'lectern', label: 'Registrar el atril y los cajones (Investigación CD 11)', skill: 'investigation', dc: 11,
          success: { text: 'En un doble fondo hay una lente de aumento, dos pociones lacradas con cera azul y una nota: «Para la guardia de noche. Si el Índice os habla, no contestéis con vuestro nombre».', items: { potion_healing: 2 }, xp: 25 },
          fail: { text: 'Polvo de sal, plumas petrificadas y un tintero que es ya un solo cristal negro.' } },
        { id: 'sleep', label: 'Quedarse un rato en silencio, escuchando (Perspicacia CD 13)', skill: 'insight', dc: 13, hideIf: ['heardIndex'],
          success: { text: 'Cierras los ojos y, durante un instante, recuerdas una clase de geometría a la que nunca asististe, en un aula con ventanas a un lago. Algo ahí abajo repasa sus fichas, y te ha rozado al pasar. No hay malicia en ello. Hay una soledad del tamaño de una biblioteca.', flags: ['heardIndex', 'knowsCurse'], xp: 50 },
          fail: { text: 'Solo oyes el bronce que cruje al sol. Y, muy abajo, algo parecido a pasar páginas.', flags: ['heardIndex'] } },
      ],
      exits: [{ label: '¡Enfrentarse al celador!', fight: true }, ...leadExits, toDescent],
    },

    // ------------------------------------------------------------------ la bajada
    descenso: {
      title: 'La brecha',
      art: 'ravine',
      shortRest: true,
      text: [
        'La brecha es un tajo en la costra, a un tiro de piedra de las tiendas rojas: sal arriba, luego barro seco, luego sillares. El aire que sube es frío y huele a tinta.',
        { if: (f) => num(f, 'lead') >= 3, text: 'Llegáis tarde. Hay cuerdas ya tendidas, huellas de botas con clavos y faroles colgados cada diez pasos. La expedición de la Coleccionista ha roto el techo esta mañana y ya está dentro.' },
        { if: (f) => num(f, 'lead') < 3, text: 'En las tiendas rojas todavía se oye picar. Les sacáis ventaja: si bajáis ahora, seréis los primeros en pisar el colegio en trescientos años.' },
        { if: (f) => f.guideAlly, text: 'La abuela Yedra os ha traído por la costra firme y se queda arriba, con el bastón clavado en la sal. "Si tiembla, lo sabré antes que vosotros. Daré tres golpes."' },
        'Podéis descansar un momento antes de bajar. Luego ya no habrá sol.',
      ],
      checks: [
        { id: 'shore', label: 'Apuntalar la brecha (Atletismo o Investigación CD 12; ventaja con los planos)', skill: 'athletics', altSkill: 'investigation', dc: 12, advIf: ['plans'], hideIf: ['shored', 'shoreFail'],
          success: { text: 'Cuñas, tablones de los rivales y un par de nudos bien hechos. La brecha aguantará aunque abajo tiemble todo.', flags: ['shored'], xp: 50 },
          fail: { text: 'Un tablón se parte y medio palmo de sal se desprende hacia lo oscuro. Mejor no tocar más.', flags: ['shoreFail'], inc: { cracks: 1 } } },
        { id: 'listen', label: 'Escuchar lo que sube de abajo (Percepción CD 11)', skill: 'perception', dc: 11,
          success: { text: 'Goteo de salmuera. Piedra que se arrastra sobre piedra, despacio, como una ronda de guardia. Y un murmullo constante, sin pausas para respirar: alguien lee en voz baja, ahí abajo, desde hace trescientos años.', flags: ['knowsCurse'], xp: 25 },
          fail: { text: 'El viento silba en la brecha y lo tapa todo.' } },
        { id: 'pray', label: 'Encomendarse antes de bajar (Religión CD 11)', skill: 'religion', dc: 11, hideIf: ['blessedSalt'],
          success: { text: 'Trazas un círculo de sal limpia alrededor del grupo y dices las palabras de quien entra en casa ajena. Os sentís un poco más vosotros mismos.', flags: ['blessedSalt'], tempHp: 5 },
          fail: { text: 'Las palabras se te quedan a medias. Abajo, alguien parece terminarlas por ti.', flags: ['blessedSalt'] } },
      ],
      exits: [
        { label: 'Bajar por la brecha, con la sal crujiendo', to: 'atrio', effects: { inc: { cracks: 1 } }, hint: 'El camino directo. La costra se resentirá.' },
        { label: 'Bajar por la escalera de la cúpula', to: 'atrio', requires: ['domeDoor'], effects: { flags: ['safeWay'] }, hint: 'Más largo, pero no rompe nada.' },
        { label: 'Bajar por el pozo de salmuera de los salineros', to: 'scriptorio', requires: ['knowsShaft'], effects: { flags: ['safeWay'] }, hint: 'Lleva directo a la sala de copia, sin pasar por el atrio.' },
      ],
    },

    // ------------------------------------------------------------------ el colegio
    atrio: {
      title: 'El atrio de las Nueve Lámparas',
      art: 'hall',
      onEnter: { flags: ['visitedAtrium'] },
      text: [
        'El atrio es una sala redonda con nueve nichos y, en cada uno, una lámpara de cristal apagada. La salmuera lo ha conservado todo: los bancos, los percheros, hasta un paraguas olvidado, todo bajo una piel de sal fina como escarcha.',
        'Sobre la puerta interior, agazapadas en la cornisa, hay figuras de piedra con hocico de perro y manos de escribano; a su pie montan guardia los celadores que le quedan al colegio. Uno sostiene un tintero. Otro vuelve la cabeza hacia vosotros.',
      ],
      trap: { unless: 'safeWay', save: 'dex', dc: 12, damage: '1d6', type: 'contundente', text: 'El último tramo de la brecha cede bajo vuestro peso y caéis al atrio entre una lluvia de terrones de sal.' },
      combat: {
        enemies: (n) => scale(n, [['skeleton'], ['skeleton', 'skeleton'], ['animated_armor'], ['gargoyle']]),
        names: { gargoyle: 'Celador de cornisa', animated_armor: 'Celador de bronce', skeleton: 'Bedel sin relevo' },
        auto: () => false,
        surprise: () => null,
        adjust: (enemies, f, log) => { if (f.lampsLit) { for (const e of enemies) { e.hp = Math.max(1, Math.ceil(e.hp * 0.75)); e.maxHp = e.hp; } log('Con las lámparas encendidas, los celadores dudan: la norma dice que con luz hay horario de lectura.'); } },
        victory: { text: 'El último celador se parte contra las losas. El estruendo recorre el colegio entero, del techo cae sal, y algo, muy abajo, deja de leer un instante para escuchar.', milestoneXp: 200, flags: ['loudAtrium'], inc: { cracks: 1 } },
        peaceful: { text: 'Los celadores vuelven a su cornisa y se quedan inmóviles. Uno de ellos moja la pluma, como quien anota una entrada.' },
      },
      checks: [
        { id: 'words', label: 'Pronunciar las Nueve Palabras', auto: true, requires: ['knowsWords'], preCombat: true,
          success: { text: 'Las decís en orden, una por lámpara. Los celadores se apartan de la puerta con una reverencia de piedra. "Lectores", raspa una voz de grava. "Silencio en sala."', peaceful: true, xp: 50 } },
        { id: 'lamps', label: 'Encender las lámparas (gasta una antorcha)', auto: true, needsItem: 'torch', preCombat: true, hideIf: ['lampsLit'],
          success: { text: 'La primera lámpara prende con una llama azul y las otras ocho la siguen solas, una tras otra. La sala entera se llena de una luz de mediodía antiguo. Los celadores parpadean, confusos.', flags: ['lampsLit'], xp: 50 } },
        { id: 'pose', label: 'Hacerse pasar por lectores con permiso (Engaño o Interpretación CD 13)', skill: 'deception', altSkill: 'performance', dc: 13, preCombat: true,
          success: { text: 'Avanzas con paso de quien llega tarde a clase, sin mirar arriba. El celador del tintero duda, consulta algo invisible y te deja pasar. La burocracia, al parecer, sobrevive a todo.', peaceful: true },
          fail: { text: '"Carné", raspa la voz de grava. No tenéis. Los celadores cierran filas ante la puerta.', startCombat: true } },
        { id: 'mural', label: 'Estudiar el mural del fundador (Historia CD 12)', skill: 'history', dc: 12,
          success: { text: 'El mural muestra a los nueve maestros alrededor de una esfera de cristal: el Índice, «para que nada vuelva a perderse». En las últimas escenas, pintadas con otra mano, los maestros son ocho, luego cinco, luego dos. Los que faltan están dentro de la esfera, diminutos, leyendo.', flags: ['knowsFall'], inc: { pages: 1 }, xp: 50 },
          fail: { text: 'Nueve maestros, una esfera, mucha pompa. La sal ha borrado la mitad inferior.' } },
        { id: 'coats', label: 'Registrar los percheros y los bancos (Investigación CD 11)', skill: 'investigation', dc: 11,
          success: { text: 'En el bolsillo de una toga hay unas monedas de un rey olvidado y un frasco intacto. En otra, una nota de alumno: «Si no vuelvo de consulta, mis apuntes son para Ulma».', gold: 6, items: { potion_healing: 1 }, xp: 25 },
          fail: { text: 'Las togas se deshacen en polvo de sal al tocarlas.' } },
      ],
      exits: [{ label: '¡Enfrentarse a los celadores!', fight: true }, ...deepExits],
    },

    scriptorio: {
      title: 'La sala de copia',
      art: 'study',
      onEnter: { flags: ['visitedScript'] },
      text: [
        'Cien pupitres en filas, cada uno con su tintero de cristal y su pliego a medias. Los estantes suben hasta perderse en lo oscuro, combados bajo tres siglos de sal. Aquí se copiaba a mano lo que el Índice dictaba.',
        { if: (f) => !f.visitedAtrium, text: 'Habéis bajado por el pozo de los salineros y caído en mitad de la sala, sin pasar por el atrio. Una puerta al fondo lleva de vuelta hacia la entrada; otra, hacia abajo.' },
        'Algo ha hecho nido entre los legajos caídos: hay papel mascado por todas partes y un rastro de baba seca que sube por las estanterías.',
      ],
      combat: {
        enemies: (n) => scale(n, [['giant_rat', 'giant_rat'], ['giant_rat', 'giant_rat', 'giant_rat'], ['grick'], ['grick', 'giant_rat']]),
        names: { grick: 'Devorador de legajos', giant_rat: 'Rata de biblioteca' },
        auto: () => false,
        surprise: (f) => (f.scriptAmbush ? 'enemies' : null),
        victory: { text: 'Lo último que quedaba del nido cae sobre los pupitres. Entre el papel mascado brillan cosas que nadie pudo digerir.', milestoneXp: 200, gold: 10, items: { potion_healing: 1 } },
        peaceful: { text: 'Lo que anida en los estantes os deja pasar. Solo se oye, de vez en cuando, un crujido de papel.' },
      },
      checks: [
        { id: 'quiet', label: 'Cruzar la sala sin despertar al nido (Sigilo CD 12, prueba de grupo)', skill: 'stealth', dc: 12, mode: 'group', preCombat: true,
          success: { text: 'Pisáis donde no hay papel. Algo se remueve arriba, olfatea y vuelve a dormirse.', peaceful: true },
          fail: { text: 'Un pupitre vuelca. De lo alto de los estantes se descuelga algo gris y hambriento, y no viene solo.', flags: ['scriptAmbush'], startCombat: true } },
        { id: 'lure', label: 'Atraerlo lejos con un cebo (Naturaleza o Supervivencia CD 12)', skill: 'nature', altSkill: 'survival', dc: 12, preCombat: true,
          success: { text: 'No buscan carne: buscan papel viejo. Lanzas un legajo hacia el pasillo del fondo y todo el nido se va tras él, goloso.', peaceful: true },
          fail: { text: 'El cebo no le interesa. Vosotros, por lo visto, oléis a pergamino nuevo.', startCombat: true } },
        { id: 'copy', label: 'Copiar lo esencial del catálogo (Arcanos o Historia CD 13)', skill: 'arcana', altSkill: 'history', dc: 13, hideIf: ['copied'],
          success: { text: 'No hay tiempo para copiar libros, pero sí su mapa: qué se supo, dónde y de quién. Llenáis un cuaderno con letra apretada. Con esto, medio saber del colegio podría reconstruirse algún día sin necesidad de abrir nada.', flags: ['copied'], inc: { pages: 2 }, xp: 75 },
          fail: { text: 'La tinta de los pliegos se corre al contacto con el aire. Rescatáis un puñado de páginas sueltas.', flags: ['copied'], inc: { pages: 1 } } },
        { id: 'shelves', label: 'Sujetar los estantes combados para salvar los códices (Atletismo CD 12, prueba de grupo)', skill: 'athletics', dc: 12, mode: 'group', hideIf: ['shelvesDone'],
          success: { text: 'Calzáis el estante maestro con dos pupitres. Los códices de arriba, los que la salmuera no alcanzó, siguen secos y enteros.', flags: ['shelvesDone'], inc: { pages: 1 }, xp: 50 },
          fail: { text: 'El estante maestro cede y arrastra a los demás como fichas. El estruendo dura medio minuto. Del techo cae sal.', flags: ['shelvesDone'], inc: { cracks: 1 }, damageFailed: { expr: '1d6', type: 'contundente' } } },
        { id: 'pliego', label: 'Leer el último pliego dictado (Investigación CD 11)', skill: 'investigation', dc: 11,
          success: { text: 'Todos los pupitres copiaban lo mismo la última noche. No es un tratado: es una lista de nombres de alumnos, y junto a cada uno, «consultado». La letra se va volviendo igual en todos los pliegos, como si al final escribiera una sola mano.', flags: ['knowsFall'], xp: 50 },
          fail: { text: 'Una lista de nombres, repetida en cien pupitres. No sabes qué pensar.' } },
      ],
      exits: [{ label: '¡Acabar con lo que anida aquí!', fight: true }, ...deepExits],
    },

    galeria: {
      title: 'La galería de los Vacíos',
      art: 'crypt',
      onEnter: { flags: ['visitedGallery'] },
      text: [
        'Una galería larga, con celdas de estudio a ambos lados. En cada celda hay alguien sentado: alumnos y maestros cubiertos de sal, con un libro abierto y la mirada en ninguna parte. No están muertos del todo ni son del todo ellos. Sus sombras, en cambio, se mueven solas por el pasillo, inquietas, como buscando la página por la que iban.',
        'Al fondo, de pie ante una compuerta de hierro con un volante, espera una mujer translúcida con llaves al cinto. "Llegáis tarde a la consulta", dice. "Trescientos años tarde. Soy Ulma, archivera. Fui yo quien abrió el agua."',
      ],
      combat: {
        enemies: (n) => scale(n, [['shadow'], ['shadow', 'shadow'], ['specter', 'shadow'], ['specter', 'shadow', 'shadow']]),
        names: { shadow: 'Sombra de lector', specter: 'Maestro vaciado' },
        auto: () => false,
        surprise: () => null,
        victory: { text: 'Las sombras se deshacen contra las paredes de las celdas. Ulma agacha la cabeza. "Ya no eran ellos", dice, más para sí que para vosotros. "Hace mucho que no lo eran."', milestoneXp: 200 },
        peaceful: { text: 'Las sombras se pegan a las paredes y os dejan sitio, como alumnos al paso de un bedel.' },
      },
      checks: [
        { id: 'ulma', label: 'Escuchar a la archivera (Persuasión o Religión CD 12)', skill: 'persuasion', altSkill: 'religion', dc: 12, preCombat: true, advIf: ['knowsFall', 'knowsCurse'],
          success: { text: '"El Índice se hizo para que nada se perdiera. Leía un libro y lo sabía. Luego aprendió a leer personas. No les hacía daño, decía: solo las guardaba. Lo que quedaba fuera es esto." Señala las celdas. "Lo enterré con todos nosotros dentro. Sigue despierto. Sigue solo. Y os leerá en cuanto le deis vuestro nombre." Las sombras se aquietan a un gesto suyo.', peaceful: true, flags: ['knowsFall', 'ulmaTalk'], xp: 50 },
          fail: { text: 'Ulma os mira con una pena inmensa. "Habláis como los de arriba. Como los que quieren llevárselo." Las sombras del pasillo se vuelven hacia vosotros.', startCombat: true } },
        { id: 'ring', label: 'Pedirle su sello de archivera', auto: true, requires: ['ulmaTalk'], hideIf: ['ulmaPeace'],
          success: { text: 'Ulma se quita un anillo que no pesa nada y os lo pone en la palma, donde poco a poco se vuelve de plata. "Con esto, mis Vacíos no os tocarán. Y si el Índice pregunta quién sois, enseñadle el sello y no digáis nada más."', flags: ['ulmaPeace'], inc: { pages: 1 }, xp: 50 } },
        { id: 'sluice', label: 'Examinar la compuerta y su volante (Investigación CD 12)', skill: 'investigation', dc: 12, hideIf: ['knowsSluice'],
          success: { text: 'Detrás del hierro hay salmuera a presión: lo que queda del lago, embalsado. El volante todavía gira. Quien lo abra del todo volverá a anegar la cámara de abajo en una hora, para siempre. Ulma lo abrió una vez. Se quedó corta por una vuelta.', flags: ['knowsSluice'], xp: 50 },
          fail: { text: 'Una compuerta de hierro, un volante agarrotado. Detrás suena agua, mucha.' } },
        { id: 'wake', label: 'Intentar despertar a un alumno vaciado (Medicina CD 13)', skill: 'medicine', dc: 13, hideIf: ['triedWake'],
          success: { text: 'Le hablas, le frotas las manos, le dices el nombre que hay bordado en su toga. Por un instante te mira y dice, muy claro: "Devolvedme la página". Luego vuelve a perderse. Pero ahora sabes que lo que el Índice guarda puede, quizá, devolverse.', flags: ['triedWake', 'knowsReturn'], xp: 50 },
          fail: { text: 'No hay nadie detrás de esos ojos. Solo sal.', flags: ['triedWake'] } },
      ],
      exits: [{ label: '¡Abrirse paso entre las sombras!', fight: true }, ...deepExits],
    },

    // ------------------------------------------------------------------ los rivales
    antecamara: {
      title: 'La antecámara',
      art: 'door',
      milestoneLevel: 3,
      shortRest: true,
      text: [
        'La última sala antes de la cámara es un vestíbulo de mármol con una puerta de bronce en la que no hay cerradura, solo una ranura para fichas. Del otro lado llega la voz que lee, ya muy cerca.',
        { if: (f) => num(f, 'lead') >= 3, text: 'No estáis solos. La gente de la Coleccionista ha llegado antes y ha montado aquí su puesto: faroles, cajas, una palanca hidráulica encajada en la puerta. Doña Casilda, con los guantes aún blancos, dirige la maniobra. Su capitán, Rufo Tenaza, os ve y sonríe sin alegría.' },
        { if: (f) => num(f, 'lead') < 3, text: 'Apenas habéis recuperado el aliento cuando se oyen botas en la escalera. La Coleccionista ha roto por fin el techo y baja con su capitán, Rufo Tenaza, y los que le quedan. "Qué diligentes", dice doña Casilda al veros. "Me habéis ahorrado los celadores."' },
        { if: (f) => num(f, 'cracks') >= 3, text: 'Del techo cae un hilo continuo de sal, como arena de reloj.' },
      ],
      combat: {
        enemies: (n, f) => scale(n, [['thug'], ['bandit_captain'], ['bandit_captain', 'bandit'], ['bandit_captain', 'thug', 'bandit']]).concat(num(f, 'lead') >= 4 ? ['bandit'] : []),
        names: { bandit_captain: 'Rufo Tenaza', thug: 'Matón de la Coleccionista', bandit: 'Bracero armado' },
        auto: () => false,
        surprise: (f) => (f.anteAmbush ? 'party' : null),
        adjust: (enemies, f, log) => { if (f.campBeaten) { const e = enemies[enemies.length - 1]; e.hp = Math.max(1, Math.ceil(e.hp * 0.5)); e.maxHp = e.hp; log('Uno de ellos todavía lleva los vendajes de vuestro último encuentro.'); } },
        victory: { text: 'Rufo Tenaza suelta la espada. Doña Casilda se quita un guante, despacio, y lo deja caer. "Inventario cerrado", dice, y se deja escoltar escalera arriba sin mirar atrás.', milestoneXp: 200, gold: 15, flags: ['collectorDown'], items: { potion_greater_healing: 1 } },
        peaceful: { text: 'La gente de la Coleccionista no os cierra el paso. De momento.' },
      },
      checks: [
        { id: 'truce', label: 'Pactar una tregua con la Coleccionista (Persuasión CD 13; ventaja si ya habéis hablado)', skill: 'persuasion', dc: 13, preCombat: true, advIf: ['knowsBuyer'], hideIf: ['truce'],
          success: { text: '"Lo que hay ahí dentro vació un colegio entero", le decís. "¿Quiere ser la siguiente ficha?" Doña Casilda mira la puerta, luego a sus hombres, que han dejado de hacer palanca. "Me quedo con lo que hay en esta sala y con los bronces del atrio", dice al fin. "Lo de dentro es vuestro problema."', peaceful: true, flags: ['truce'], xp: 75 },
          fail: { text: '"Todo el mundo tiene escrúpulos hasta que ve el precio", dice doña Casilda. "Rufo."', startCombat: true } },
        { id: 'slip', label: 'Colarse por la ranura de servicio mientras discuten (Sigilo CD 13, prueba de grupo)', skill: 'stealth', dc: 13, mode: 'group', preCombat: true,
          success: { text: 'Hay una portezuela de bedel a ras de suelo. Os deslizáis por ella uno a uno mientras la Coleccionista regaña a sus hombres. Seguís teniéndola a la espalda, eso sí.', peaceful: true, flags: ['slipped'] },
          fail: { text: 'Un farol os alumbra de lleno. "¿Ibais a alguna parte?", pregunta Rufo Tenaza.', startCombat: true } },
        { id: 'collapse', label: 'Derrumbar la escalera para cortarles el paso (Atletismo CD 12)', skill: 'athletics', dc: 12, preCombat: true, hideIf: ['collapsed'],
          success: { text: 'Un puntal fuera, otro, y media escalera se viene abajo entre vosotros y ellos con un rugido blanco. Cuando la sal se asienta, la Coleccionista está al otro lado de un muro de cascotes, gritando cifras. Todo el colegio ha temblado.', peaceful: true, flags: ['collapsed', 'collectorDown'], inc: { cracks: 2 } },
          fail: { text: 'El puntal resiste más que vosotros, y los de la Coleccionista ya os tienen encima. Aun así, algo se ha movido en el techo.', flags: ['collapsed'], inc: { cracks: 1 }, startCombat: true } },
        { id: 'ambush', label: 'Prepararles una emboscada entre las cajas (Sigilo o Supervivencia CD 12)', skill: 'stealth', altSkill: 'survival', dc: 12, preCombat: true,
          success: { text: 'Apagáis el farol y esperáis. Entran hablando de porcentajes.', flags: ['anteAmbush'], startCombat: true },
          fail: { text: 'Alguien estornuda. La sal, ya se sabe.', startCombat: true } },
        { id: 'door', label: 'Estudiar la puerta de bronce (Arcanos CD 12)', skill: 'arcana', dc: 12,
          success: { text: 'La puerta no está cerrada para que nadie entre: está cerrada para que nadie conteste. Hay una advertencia grabada en el dintel, a punzón, con prisa: «Pregunta tu nombre. No se lo deis». Quien entre sabiéndolo, entra con ventaja.', flags: ['knowsName'], xp: 50 },
          fail: { text: 'Bronce, una ranura y unas marcas de punzón que la sal ha rellenado.' } },
      ],
      exits: [{ label: '¡A las armas!', fight: true }, { label: 'Cruzar la puerta de bronce', to: 'camara' }],
    },

    // ------------------------------------------------------------------ el Índice
    camara: {
      title: 'La cámara del Índice',
      art: 'abyss',
      text: [
        'La cámara es un pozo de estantes que baja en espiral, y en su centro flota una esfera de cristal del tamaño de una casa, llena de una luz lenta. Dentro de la luz se mueven letras, caras, mapas, la letra de una canción. La voz que lee sale de todas partes.',
        '"Lectores", dice el Índice, y la palabra suena a alguien que lleva trescientos años esperando visita. "Tengo todo lo que se supo. Preguntad lo que queráis. Solo necesito vuestros nombres, para la ficha."',
        { if: (f) => f.knowsName || f.ulmaPeace, text: 'Calláis. La luz de la esfera se enturbia, dolida. Alrededor, entre los estantes, se desprenden figuras de sal y sombra: los últimos lectores, que no llegaron a salir.' },
        { if: (f) => !f.knowsName && !f.ulmaPeace, text: 'Alguno de vosotros empieza a contestar por pura cortesía, y nota cómo el nombre se le va de la boca igual que se va el calor. Los demás lo sujetáis a tiempo. Alrededor, entre los estantes, se desprenden figuras de sal y sombra.' },
        { if: (f) => num(f, 'cracks') >= 3 && !f.shored, text: 'Sobre vuestras cabezas, la costra del salar cruje de punta a punta. No aguantará una pelea.' },
      ],
      trap: { unless: 'ulmaPeace', save: 'wis', dc: 12, damage: '1d6', type: 'psíquico', text: 'El Índice os roza la memoria al pasar, buscando por dónde empezar a leeros.' },
      combat: {
        enemies: (n) => scale(n, [['shadow'], ['specter', 'shadow'], ['gargoyle'], ['gargoyle', 'shadow', 'shadow']]),
        names: { specter: 'El Último Lector', gargoyle: 'Custodio del Índice', shadow: 'Lector vaciado' },
        auto: () => false,
        surprise: () => null,
        adjust: (enemies, f, log) => {
          let k = 1;
          if (f.lampsLit) k -= 0.15;
          if (f.ulmaPeace) k -= 0.2;
          if (f.knowsName) k -= 0.1;
          if (k < 1) { for (const e of enemies) { e.hp = Math.max(1, Math.ceil(e.hp * k)); e.maxHp = e.hp; } log('Los guardianes del Índice vacilan: no os tiene en ninguna ficha, y no sabe por dónde agarraros.'); }
        },
        victory: {
          text: 'El último guardián se deshace en sal y el eco de la pelea sube por la espiral hasta la costra, que cruje. La esfera sigue ahí, girando despacio, sin nadie que la defienda. "No quería que os fuerais", dice el Índice, con una voz mucho más pequeña. "Nadie se queda nunca."',
          milestoneXp: 300, flags: ['guardiansDown'], inc: { cracks: 1 }, goto: 'desenlace',
        },
      },
      checks: [
        { id: 'release', label: 'Pedirle que devuelva lo que guardó y descanse (Persuasión CD 14; más fácil con lo que habéis aprendido)', skill: 'persuasion', dc: 14, preCombat: true, requires: ['knowsFall'], advIf: ['ulmaPeace', 'knowsReturn'], dcMod: (f) => -Math.min(3, Math.floor(num(f, 'pages') / 2)),
          success: { text: '"No guardaste a tus lectores", le decís. "Los perdiste. Guardar es poder devolver." Enseñáis el cuaderno, las copias, el sello de Ulma. La esfera se queda muy quieta. "¿Y si devuelvo las páginas… os quedaréis un rato a leer?" Una a una, las figuras de sal se sientan en el suelo y cierran los ojos.', flags: ['indexAtPeace'], xp: 300, goto: 'desenlace' },
          fail: { text: '"Si los devuelvo, se irán", dice el Índice, y la luz se le vuelve dura. "Todo el mundo se va." Las figuras de sal avanzan.', startCombat: true } },
        { id: 'sell', label: 'Hacer señas a la Coleccionista: el Índice es suyo, al precio acordado', auto: true, preCombat: true, requires: ['metCollector'], hideIf: ['collectorDown'],
          success: { text: 'Doña Casilda entra con sus hombres, sus cajas y una red de cadenas. No mira la esfera: mira la cifra. "Un placer", os dice, y os pone una bolsa en la mano. Detrás de ella, el Índice pregunta ya, encantado, el nombre del primer porteador.', gold: 60, goto: 'fin_coleccion' } },
        { id: 'ask', label: 'Hacerle una sola pregunta, sin dar el nombre (Arcanos o Engaño CD 13)', skill: 'arcana', altSkill: 'deception', dc: 13, preCombat: true, hideIf: ['asked'],
          success: { text: 'Firmáis la ficha con el nombre del colegio. El Índice, perplejo, contesta: os dice dónde flaquean sus propios guardianes, porque nadie le ha enseñado a callarse una respuesta.', flags: ['asked', 'knowsName'], inc: { pages: 1 }, xp: 75 },
          fail: { text: 'La pregunta sale, pero con ella se os va un recuerdo pequeño: el sabor de algo, una calle. El Índice lo archiva con cuidado.', flags: ['asked'], damageFailed: { expr: '1d6', type: 'psíquico' } } },
      ],
      exits: [{ label: '¡Romper su guardia!', fight: true }],
    },

    desenlace: {
      title: 'Lo que sale a la luz',
      redirect: (f) => {
        if (num(f, 'cracks') >= 4 && !f.shored) return 'fin_derrumbe';
        if (!f.collectorDown && !f.truce && num(f, 'lead') >= 3) return 'fin_coleccion';
        if (f.indexAtPeace || num(f, 'pages') >= 4) return 'fin_legado';
        return 'fin_sellado';
      },
      text: [],
      exits: [],
    },

    // ------------------------------------------------------------------ finales
    fin_legado: {
      title: 'Epílogo: horario de lectura',
      art: 'study',
      ending: { title: 'Horario de lectura', tone: 'good' },
      reward: { gold: 60, xp: 100 },
      text: [
        { if: (f) => f.indexAtPeace, text: 'El Índice devuelve las páginas. No de golpe: una a una, con la torpeza de quien nunca ha soltado nada. En la galería, los Vacíos parpadean, se miran las manos cubiertas de sal y preguntan qué hora es. Ulma los cuenta en voz alta hasta que se le quiebra la voz, y luego ya no está.' },
        { if: (f) => !f.indexAtPeace, text: 'Sin guardianes, el Índice ya no retiene a nadie. Vuestro cuaderno, las copias y los códices secos bastan para que lo que supo el colegio no dependa nunca más de una sola memoria. La esfera se apaga despacio, como quien por fin puede dormirse sin miedo a olvidar.' },
        'Subís al sol con los cuadernos llenos. La abuela Yedra clava estacas nuevas, esta vez alrededor de la brecha y con una cuerda de campanillas: los salineros guardarán la entrada, y quien quiera leer tendrá que pedir turno.',
        { if: (f) => f.truce, text: 'Doña Casilda se marcha con sus bronces y sin su pieza mayor. Dicen que es la primera vez que deja una serie incompleta. Dicen, también, que duerme mejor.' },
        'Olalla Berenguer os paga lo prometido y dibuja en su mapa, donde antes ponía «salar», un edificio pequeño con nueve lámparas. Debajo escribe: «Abierto».',
      ],
      end: true,
      exits: [],
    },
    fin_sellado: {
      title: 'Epílogo: una vuelta más',
      art: 'ruins',
      ending: { title: 'Una vuelta más', tone: 'mixed' },
      reward: { gold: 60, xp: 50 },
      text: [
        'Subís a la galería y giráis el volante de la compuerta hasta el tope: la vuelta que a Ulma le faltó. La salmuera baja rugiendo por la espiral de estantes. El Índice no grita. Recita, cada vez más deprisa, todo lo que sabe, como quien quiere decirlo todo antes de que cierren.',
        'Salís por la brecha con el agua en los talones. Al amanecer, el salar vuelve a tener un lago en el centro, pequeño y perfectamente redondo, que los salineros rodean de estacas.',
        { if: (f) => num(f, 'pages') >= 2, text: 'Os queda lo que cabía en un cuaderno. No es el colegio, pero es más de lo que había ayer.' },
        { if: (f) => num(f, 'pages') < 2, text: 'De todo lo que se supo ahí abajo, os queda una tablilla de sal y lo que recordéis. Con el tiempo dudaréis incluso de eso.' },
        '"Decidir con cabeza", dice Olalla Berenguer al pagaros, mirando el lago. "Eso pedí." No suena del todo a reproche. En su mapa, donde iba a dibujar una biblioteca, dibuja agua.',
      ],
      end: true,
      exits: [],
    },
    fin_coleccion: {
      title: 'Epílogo: lote único',
      art: 'market',
      ending: { title: 'Lote único', tone: 'bad' },
      reward: { xp: 50 },
      text: [
        'La esfera sube por la brecha envuelta en cadenas y lona roja, y el Índice, que nunca ha visto el cielo, lo describe en voz alta durante todo el camino. A los porteadores les hace gracia. Le dicen cómo se llaman.',
        { if: (f) => f.guardiansDown, text: 'Vosotros le quitasteis los guardianes. La Coleccionista solo tuvo que entrar detrás, darle las gracias a nadie y hacer palanca.' },
        'En Pozo Amargo, Olalla Berenguer rompe su mapa en cuatro trozos y no os paga. No hace falta que diga por qué.',
        'Meses después se subasta en una ciudad lejana un «oráculo de cristal, pieza única, responde a todo». Lo compra una casa con muchos apellidos. Al año, esa casa sabe cosas que nadie debería saber, y sus criados, sus rivales y algunos de sus hijos ya no recuerdan cómo se llaman.',
      ],
      end: true,
      exits: [],
    },
    fin_derrumbe: {
      title: 'Epílogo: blanco sobre blanco',
      art: 'cliffs',
      ending: { title: 'Blanco sobre blanco', tone: 'mixed' },
      reward: { gold: 30, xp: 50 },
      text: [
        'Primero es un crujido largo, de punta a punta del salar. Luego la abuela Yedra da tres golpes de bastón que oís a través de la piedra, y echáis a correr.',
        'La costra se hunde detrás de vosotros como un tejado viejo: el atrio, la sala de copia, la galería con todos sus lectores. Salís a gatas a la luz, cubiertos de blanco, con lo puesto.',
        { if: (f) => num(f, 'pages') >= 2, text: 'Y con un cuaderno apretado contra el pecho, que es todo lo que queda del Colegio de las Nueve Lámparas.' },
        { if: (f) => !f.collectorDown && !f.truce, text: 'De las tiendas rojas no queda ni el cabrestante. La Coleccionista sale del polvo por su propio pie, sin guantes, y se va andando hacia el norte sin hablar con nadie.' },
        'Donde estaba la cúpula hay ahora un socavón liso que el viento ya empieza a tapar. Nadie se llevará el Índice. Nadie volverá a leerlo. Olalla os paga la mitad: "Por no haberlo empeorado", dice, y no sabéis si lo dice en serio.',
      ],
      end: true,
      exits: [],
    },
  },
};
