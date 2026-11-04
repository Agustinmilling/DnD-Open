// Aventura original: "Los Fuegos de Punta Gaviota" (para 1-4 personajes de nivel 1 a 3).
// Historia y personajes originales. Monstruos y reglas: SRD 5.1.
//
// Ramificaciones principales:
//   - Tres pistas iniciales (faro, naufragio, taberna) en cualquier orden. Cada desvío suma tiempo (contador `time`);
//     si llegáis tarde a la gruta, el ritual ya ha empezado y el final es más duro.
//   - Contadores `alarm` (lo alerta que está el culto) y `captives` (cautivos rescatados).
//   - La capitana Morla Sal puede ser aliada, presa o enemiga. Si os derrotan en Cala Negra, despertáis en la bodega de su barco.
//   - Tres formas de llegar a la gruta (escalera del faro, balandra, costa a pie) y cuatro finales.

const scale = (n, table) => table[Math.max(1, Math.min(4, n)) - 1];
const num = (f, k) => Number(f[k]) || 0;
const leadExits = [
  { label: 'Subir al faro apagado', to: 'faro', hideIf: ['visitedFaro'], effects: { inc: { time: 1 } }, hint: 'Una pista más… pero el tiempo corre.' },
  { label: 'Bajar a la playa del naufragio', to: 'pecio', hideIf: ['visitedPecio'], effects: { inc: { time: 1 } }, hint: 'Una pista más… pero el tiempo corre.' },
  { label: 'Buscar a los contrabandistas en la taberna La Lonja', to: 'lonja', hideIf: ['visitedLonja'], effects: { inc: { time: 1 } }, hint: 'Una pista más… pero el tiempo corre.' },
];

module.exports = {
  id: 'gaviota',
  title: 'Los Fuegos de Punta Gaviota',
  summary: 'El faro de Punta Gaviota se ha apagado y un barco ha naufragado en los arrecifes. Alguien enciende luces falsas en los acantilados, y la marea trae algo más que restos.',
  art: 'lighthouse',
  length: '2-3 horas',
  tags: ['Costa', 'Investigación', 'Contrabandistas', 'Culto'],
  endingCount: 4,
  start: 'puerto',
  startGold: 20,
  startFlags: { time: 0, alarm: 0, captives: 0 },
  journal: {
    falseLights: 'Alguien encendió luces falsas en los acantilados para estrellar a La Garza contra los arrecifes.',
    knowsMorla: 'Las cajas del naufragio llevan la marca de Morla Sal: un ancla cruzada por una llave.',
    knowsCove: 'Los contrabandistas se esconden en Cala Negra, al norte del puerto.',
    knowsCult: 'Ha vuelto a la costa el culto de la Madre de las Mareas, que ahogaba marineros en su honor.',
    knowsGrotto: 'La Gruta de las Campanas, bajo el faro, fue el santuario del culto.',
    knowsStairs: 'Una escalera oculta baja desde el sótano del faro hasta la gruta.',
    password: 'Contraseña de los contrabandistas: «La sal no se moja».',
    amulet: 'Lleváis un amuleto de perla negra del culto. Podría serviros de disfraz.',
    lightOn: 'Habéis vuelto a encender el faro: esta noche ningún barco se estrellará.',
    morlaDeal: 'Pacto con Morla Sal: su tripulación os ayudará contra el culto.',
    morlaArrested: 'Morla Sal se ha rendido y responderá ante la regidora.',
    captured: 'Os capturaron en Cala Negra y despertasteis en la bodega de La Gaviota Ciega.',
    ilse: 'Ilse Varo, la farera, está a salvo con vosotros.',
    knowsBells: 'El tañido de las campanas sumergidas puede romper el trance de los fieles.',
    time: (f) => `Tiempo perdido: ${'⏳'.repeat(Math.min(5, num(f, 'time')))} ${num(f, 'time') >= 4 ? '(¡el ritual ya habrá empezado!)' : ''}`,
    alarm: (f) => `Alerta del culto: ${'🔔'.repeat(Math.min(5, num(f, 'alarm')))}`,
    captives: (f) => `Cautivos rescatados: ${num(f, 'captives')}`,
  },
  scenes: {
    // ------------------------------------------------------------------ el puerto
    puerto: {
      title: 'El puerto de Punta Gaviota',
      art: 'harbor',
      text: [
        'Punta Gaviota es un puñado de casas blancas colgadas sobre el mar, con redes tendidas al sol y gaviotas que discuten por las tripas de pescado. Esta mañana nadie discute: todo el pueblo mira hacia los arrecifes, donde asoma el casco partido de La Garza, una coca mercante que anoche se estrelló contra las rocas.',
        'La regidora Aldara Brun, una mujer flaca con la cara curtida por el salitre, os reúne en el muelle. "El faro lleva tres noches apagado. La farera, Ilse Varo, ha desaparecido. Y anoche ese barco vino derecho a los arrecifes como si alguien lo llamara." Baja la voz. "Os pagaré 60 piezas de oro a cada uno si averiguáis qué está pasando. Rápido, por favor: la próxima marea viva es mañana."',
        'Junto a ella, envuelto en una manta, tiembla Jonás Cardo, uno de los pocos marineros que llegaron a nado. En el puesto de la boticaria se venden pociones y cuerda.',
      ],
      shop: { potion_healing: 50, rope: 1, antitoxin: 50, holy_water: 25, torch: 1 },
      checks: [
        { id: 'survivor', label: 'Hablar con el náufrago Jonás (Perspicacia o Medicina CD 11)', skill: 'insight', altSkill: 'medicine', dc: 11,
          success: { text: 'Le ofreces algo caliente y Jonás se calma. "El faro estaba apagado, sí… pero vimos luces. Luces en los acantilados del norte, como las de un puerto. El capitán giró hacia ellas. Luego, el crujido." Se estremece. "Y en el agua había gente. Gente que nadaba hacia nosotros… y no eran gente."', flags: ['falseLights'], xp: 25, journal: 'Alguien encendió luces falsas en los acantilados.' },
          fail: { text: 'Jonás solo repite "las luces, las luces" y se tapa la cabeza con la manta.' } },
        { id: 'crates', label: 'Examinar las cajas que trae la marea (Investigación CD 12)', skill: 'investigation', dc: 12,
          success: { text: 'Entre los restos hay cajas de brandy sin sello de aduana, marcadas a fuego con un ancla cruzada por una llave. Varios pescadores se miran incómodos: es la marca de Morla Sal, la contrabandista más famosa de la costa.', flags: ['knowsMorla'], xp: 25 },
          fail: { text: 'Solo ves astillas, sal y un gato muy satisfecho con un pescado.' } },
        { id: 'fishers', label: 'Ganarse a los pescadores (Persuasión CD 11)', skill: 'persuasion', dc: 11,
          success: { text: 'Ayudas a remendar una red y la desconfianza se derrite. "Si buscáis a los de Morla, están en Cala Negra, al norte", susurra una pescadora. "Y no son los únicos que andan de noche. Mi primo desapareció la semana pasada."', flags: ['knowsCove'], inc: { trust: 1 }, xp: 25 },
          fail: { text: 'Los pescadores os responden con monosílabos. A los forasteros no se les cuenta nada.' } },
        { id: 'legend', label: 'Recordar leyendas de la costa (Historia o Religión CD 13)', skill: 'history', altSkill: 'religion', dc: 13,
          success: { text: 'Recuerdas la historia de la Madre de las Mareas: hace dos siglos, un culto ahogaba marineros en su honor en la Gruta de las Campanas, una cueva marina bajo el promontorio… justo donde hoy está el faro. Dicen que el tañido de sus campanas sumergidas despertaba a los fieles de su trance.', flags: ['knowsCult', 'knowsGrotto', 'knowsBells'], xp: 25 },
          fail: { text: 'Solo recuerdas canciones de taberna sobre sirenas, y ninguna es apropiada para repetirla aquí.' } },
      ],
      exits: leadExits.map((e) => ({ ...e, effects: undefined, hint: null })),
    },

    // ------------------------------------------------------------------ pista 1: el naufragio
    pecio: {
      title: 'El casco de La Garza',
      art: 'coast',
      onEnter: { flags: ['visitedPecio'] },
      text: [
        'Con la marea baja se puede caminar hasta el casco partido de La Garza entre charcas y rocas cubiertas de algas. Del interior llegan golpes débiles: alguien sigue atrapado en la bodega.',
        'Pero entre vosotros y el barco, sobre la arena, varias formas del tamaño de un perro levantan sus pinzas. Cangrejos gigantes, atraídos por el festín del naufragio.',
      ],
      combat: {
        enemies: (n) => scale(n, [['giant_crab'], ['giant_crab', 'giant_crab'], ['giant_crab', 'giant_crab', 'giant_crab'], ['giant_crab', 'giant_crab', 'giant_crab', 'giant_crab']]),
        auto: () => false,
        surprise: () => null,
        victory: { text: 'El último cangrejo se retira de lado hacia el agua, con una pinza menos. El camino al casco queda libre.', milestoneXp: 175, items: { potion_healing: 1 } },
        peaceful: { text: 'Los cangrejos se pierden entre las rocas. Podéis llegar al casco sin pelear.' },
      },
      checks: [
        { id: 'torch', label: 'Ahuyentarlos con fuego (gasta una antorcha)', auto: true, needsItem: 'torch', preCombat: true,
          success: { text: 'Agitas la antorcha y los cangrejos retroceden chasqueando las pinzas, ofendidos.', peaceful: true } },
        { id: 'rocks', label: 'Rodearlos por las rocas (Acrobacias o Atletismo CD 11, prueba de grupo)', skill: 'acrobatics', altSkill: 'athletics', dc: 11, mode: 'group', preCombat: true,
          success: { text: 'Saltáis de roca en roca sin que los cangrejos se den cuenta.', peaceful: true, xp: 25 },
          fail: { text: 'Alguien resbala en las algas y cae de culo en un charco. Las pinzas se giran hacia vosotros.', startCombat: true } },
        { id: 'hull', label: 'Abrir la bodega para sacar a los atrapados (Atletismo CD 12)', skill: 'athletics', dc: 12, hideIf: ['hullOpen'],
          success: { text: 'Arrancas los tablones de un tirón. Dentro hay dos pasajeros, un mercader y su hija, ateridos pero vivos. "Unos encapuchados con collares de perlas subieron a bordo después del choque", dice el mercader. "Se llevaron a los demás en barcas, hacia el norte. Cantaban."', flags: ['hullOpen', 'knowsCult', 'knowsCove'], inc: { captives: 1, trust: 1 }, xp: 50, journal: 'Habéis rescatado a dos pasajeros de La Garza.' },
          fail: { text: 'Los tablones ceden por fin, pero os cuesta una eternidad. Dentro hay dos pasajeros ateridos: os cuentan que unos encapuchados se llevaron a los demás en barcas hacia el norte.', flags: ['hullOpen', 'knowsCult', 'knowsCove'], inc: { captives: 1, time: 1 }, xp: 25 } },
        { id: 'cabin', label: 'Registrar el camarote del capitán (Investigación CD 13)', skill: 'investigation', dc: 13,
          success: { text: 'En el cuaderno de bitácora, la última entrada: "Faro apagado. Luces al norte. Cambio de rumbo." Y enganchado en la ropa del capitán ahogado, un amuleto de perla negra arrancado a alguien en la pelea: el símbolo de la Madre de las Mareas.', flags: ['falseLights', 'amulet', 'knowsCult'], xp: 50 },
          fail: { text: 'El agua lo ha empapado todo. La tinta de la bitácora es un borrón.' } },
        { id: 'tracks', label: 'Seguir las marcas en la arena (Supervivencia CD 12)', skill: 'survival', dc: 12,
          success: { text: 'Marcas de quillas arrastradas y huellas de pies descalzos… algunas, palmeadas. Todas van hacia el norte, hacia Cala Negra.', flags: ['knowsCove'], xp: 25 },
          fail: { text: 'La marea ya ha borrado casi todo.' } },
      ],
      exits: [
        { label: '¡Abrirse paso entre las pinzas!', fight: true },
        ...leadExits,
        { label: 'Ir a Cala Negra', to: 'cala', requires: ['knowsCove', 'password'] },
      ],
    },

    // ------------------------------------------------------------------ pista 2: el faro
    faro: {
      title: 'El faro apagado',
      art: 'lighthouse',
      onEnter: { flags: ['visitedFaro'] },
      text: [
        'El faro se alza sobre el promontorio como un dedo blanco y desconchado. La puerta está forzada. Desde lo alto de la escalera de caracol llega un rascar rítmico y un murmullo de voces que salmodian.',
        'Arriba, en la sala de la linterna, varios encapuchados untan de brea negra la gran lente de cristal. Llevan collares de perlas oscuras y los pies descalzos y mojados.',
      ],
      combat: {
        enemies: (n) => scale(n, [['cultist'], ['cultist', 'cultist'], ['cultist', 'cultist', 'cultist'], ['cultist', 'cultist', 'cultist', 'bandit']]),
        names: { bandit: 'Contrabandista renegado' },
        auto: () => false,
        surprise: (f) => (f.faroAmbush ? 'enemies' : null),
        victory: {
          text: 'El último sectario cae junto a la lente. En el cuarto de la farera, el diario de Ilse Varo termina a medias: "…han vuelto a cantar bajo el suelo. La escalera vieja de los contrabandistas baja desde el sótano hasta la gruta. Mañana bajaré a ver."',
          milestoneXp: 200, flags: ['faroCleared', 'knowsStairs', 'knowsGrotto'], gold: 5,
        },
        peaceful: { text: (f) => (f.faroBluff ? 'Los sectarios os toman por hermanos. "Bajad a la gruta por la escalera del sótano", dicen. "La Madre despertará con la marea viva." Luego se marchan a cumplir su turno en los acantilados.' : 'Los sectarios huyen escaleras abajo, hacia el sótano. Seguro que van a avisar a alguien.') },
      },
      checks: [
        { id: 'ambush', label: 'Subir en silencio y sorprenderlos (Sigilo CD 12, prueba de grupo)', skill: 'stealth', dc: 12, mode: 'group', preCombat: true,
          success: { text: 'Llegáis arriba sin que el murmullo se interrumpa. ¡Atacáis antes de que se den la vuelta!', flags: ['faroAmbush'], startCombat: true },
          fail: { text: 'Un escalón cruje. El canto se detiene. "Hermanos… tenemos visita."', startCombat: true } },
        { id: 'bluff', label: 'Fingir ser fieles de la Madre (Engaño CD 12, necesitáis el amuleto)', skill: 'deception', dc: 12, preCombat: true, requires: ['amulet'],
          success: { text: 'Alzas el amuleto de perla negra y saludas con las palabras del culto. Los encapuchados se inclinan.', flags: ['faroBluff', 'knowsStairs', 'knowsGrotto'], xp: 50, peaceful: true },
          fail: { text: '"Ese amuleto es de Tobías… y Tobías se ahogó anoche." Los cuchillos salen de las túnicas.', startCombat: true, inc: { alarm: 1 } } },
        { id: 'scare', label: 'Echarlos a gritos (Intimidación CD 13)', skill: 'intimidation', dc: 13, preCombat: true,
          success: { text: 'Tu voz retumba en la torre y los sectarios huyen como ratas.', inc: { alarm: 1 }, peaceful: true },
          fail: { text: 'Uno de ellos sonríe: "La Madre nos protege." Y se lanzan contra vosotros.', startCombat: true } },
        { id: 'diary', label: 'Registrar el cuarto de la farera (Investigación CD 11)', skill: 'investigation', dc: 11, hideIf: ['knowsStairs'],
          success: { text: 'Bajo el colchón, el diario de Ilse Varo habla de una vieja escalera de contrabandistas que baja desde el sótano hasta la gruta. El sótano tiene una trampilla tapada con sacos.', flags: ['knowsStairs', 'knowsGrotto'], xp: 25 },
          fail: { text: 'Solo encontráis mantas, un gato de porcelana y muchas cartas de amor sin enviar.' } },
        { id: 'lens', label: 'Limpiar la lente y volver a encender el faro (Arcanos o Juego de manos CD 12)', skill: 'arcana', altSkill: 'sleight', dc: 12, hideIf: ['lightOn'], retry: true,
          success: { text: 'Raspáis la brea, ajustáis el mecanismo y prendéis la mecha. Un haz de luz blanca barre el mar. Abajo, en el pueblo, alguien grita de alegría.', flags: ['lightOn'], inc: { trust: 1 }, xp: 50 },
          fail: { text: 'La brea se resiste y el mecanismo se atasca. Quizá otra mano tenga más suerte.' } },
        { id: 'slowlight', label: 'Encenderlo a la antigua, con aceite y paciencia (seguro, pero lento)', auto: true, hideIf: ['lightOn'],
          success: { text: 'Tardáis horas, pero el faro vuelve a brillar sobre el mar.', flags: ['lightOn'], inc: { time: 1, trust: 1 } } },
      ],
      exits: [
        { label: '¡Atacar a los sectarios!', fight: true },
        ...leadExits,
        { label: 'Ir a Cala Negra', to: 'cala', requires: ['knowsCove', 'password'] },
        { label: 'Bajar por la escalera oculta hasta la gruta', to: 'gruta', requires: ['knowsStairs'], effects: { set: { approach: 'stairs' } }, hint: 'Llegaréis por donde nadie os espera.' },
      ],
    },

    // ------------------------------------------------------------------ pista 3: la taberna de los contrabandistas
    lonja: {
      title: 'La taberna La Lonja',
      art: 'tavern',
      onEnter: { flags: ['visitedLonja', 'knowsCove'] },
      text: [
        'La Lonja huele a sardina, a ron barato y a secretos. Todo el mundo sabe que aquí se reúnen los hombres de Morla Sal, y que su escondite está en Cala Negra, al norte. Lo que nadie sabe es cómo entrar sin acabar flotando en el puerto.',
        'En un rincón, Nilo Tresdedos, el enlace de Morla, juega a los dados con dos tipos del tamaño de un armario. Os ha visto entrar. Todos os han visto entrar.',
      ],
      combat: {
        enemies: (n) => scale(n, [['bandit', 'bandit'], ['bandit', 'thug'], ['bandit', 'bandit', 'thug'], ['bandit', 'bandit', 'bandit', 'thug']]),
        names: { thug: 'Gorrón' },
        auto: () => false,
        surprise: () => null,
        victory: {
          text: 'Las mesas están rotas y los matones, por los suelos. Nilo levanta las manos (las dos, con sus tres dedos y medio): "¡Vale, vale! La contraseña de la cala es «La sal no se moja». Pero Morla se va a enterar de esto."',
          milestoneXp: 200, flags: ['password', 'morlaHostile'], gold: 8,
        },
        peaceful: { text: 'Nilo se guarda los dados y os hace un gesto para que os sentéis.' },
      },
      checks: [
        { id: 'bribe', label: 'Pagar a Nilo por la contraseña (5 po por persona)', auto: true, cost: 5, preCombat: true,
          success: { text: 'Nilo cuenta las monedas dos veces. "La contraseña de la cala es «La sal no se moja». Y un consejo gratis: Morla ya no es la que manda en esta costa. Ahora manda el de la túnica."', flags: ['password', 'knowsCult'], peaceful: true } },
        { id: 'persuade', label: 'Convencer a Nilo de que estáis del mismo lado (Persuasión CD 13)', skill: 'persuasion', dc: 13, preCombat: true, advIf: ['knowsCult'],
          success: { text: 'Nilo suspira. "Morla está atrapada. Esos fanáticos de las perlas pagaban bien por usar la cala… y ahora exigen gente. Cargamento vivo. Ella no quiere, pero les tiene miedo." Os da la contraseña, «La sal no se moja», y promete avisarla de que vais a hablar.', flags: ['password', 'meetMorla', 'knowsCult'], xp: 50, peaceful: true },
          fail: { text: 'Nilo os mira de arriba abajo. "No me fío de vosotros." Los dos armarios se ponen de pie.', startCombat: true } },
        { id: 'deceive', label: 'Haceros pasar por compradores de brandy (Engaño CD 13)', skill: 'deception', dc: 13, preCombat: true,
          success: { text: 'Le habláis de barriles, precios y aduanas con tal aplomo que Nilo os toma por clientes. "Esta noche, en Cala Negra. Decid «La sal no se moja»."', flags: ['password'], xp: 50, peaceful: true },
          fail: { text: '"¿Brandy? Si ni siquiera sabéis distinguir un barril de un tonel." Nilo silba y sus matones se acercan.', startCombat: true } },
        { id: 'threat', label: 'Amenazarlo delante de todos (Intimidación CD 12)', skill: 'intimidation', dc: 12, preCombat: true,
          success: { text: 'Nilo traga saliva y os susurra la contraseña: «La sal no se moja». Pero media taberna lo ha visto, y la noticia correrá.', flags: ['password'], inc: { alarm: 1 }, xp: 25, peaceful: true },
          fail: { text: 'Las risas de la taberna se apagan cuando los matones se levantan.', startCombat: true } },
      ],
      exits: [
        { label: '¡Pelea de taberna!', fight: true },
        ...leadExits,
        { label: 'Ir a Cala Negra', to: 'cala' },
      ],
    },

    // ------------------------------------------------------------------ Cala Negra
    cala: {
      title: 'Cala Negra',
      art: 'cove',
      text: [
        'Cala Negra es una media luna de arena oscura encajonada entre acantilados. Hay hogueras, barriles apilados y una balandra fondeada, La Gaviota Ciega. Junto a la orilla, una jaula de madera: dentro se apiñan media docena de vecinos de Punta Gaviota con las manos atadas.',
        { if: (f) => f.morlaHostile, text: 'Os están esperando. Nilo debió de correr más que vosotros. "¡Ahí están los que destrozaron La Lonja!", grita alguien.' },
        { if: (f) => !f.morlaHostile && f.password, text: 'Un centinela os da el alto. Cuando pronunciáis «La sal no se moja», baja la ballesta a regañadientes y llama a la capitana.' },
        { if: (f) => !f.morlaHostile && !f.password, text: 'Nadie os ha visto todavía. Desde las rocas veis a los contrabandistas cargar barriles… y a una mujer alta con un tricornio rojo que mira la jaula con cara de asco: Morla Sal.' },
        { if: (f) => f.meetMorla && !f.morlaHostile, text: 'Morla Sal, alta, con un tricornio rojo y una cimitarra en cada cadera, os espera junto a la hoguera. "Nilo dice que no sois de la guardia. Más os vale."' },
      ],
      combat: {
        enemies: (n) => scale(n, [['bandit', 'bandit'], ['bandit_captain'], ['bandit_captain', 'bandit'], ['bandit_captain', 'bandit', 'bandit']]),
        names: { bandit_captain: 'Morla Sal' },
        auto: (f) => !!f.morlaHostile,
        surprise: () => null,
        adjust: (enemies) => { for (const e of enemies) if (e.type === 'bandit_captain') { e.hp = Math.ceil(e.hp * (enemies.length <= 2 ? 0.6 : 0.8)); e.maxHp = e.hp; } },
        victory: {
          text: 'Los contrabandistas arrojan las armas. Morla Sal, con la cara ensangrentada, se rinde: "Basta. Me pagaban en perlas para usar la cala… y luego quisieron gente. Esta noche teníamos que llevar la jaula a la Gruta de las Campanas." Abrís la jaula y los vecinos corren hacia el pueblo. En la balandra hay un mapa de la gruta.',
          milestoneXp: 300, flags: ['morlaArrested', 'cageFreed', 'knowsGrotto', 'boat'], inc: { captives: 1 }, gold: 15, items: { potion_healing: 1 },
        },
        peaceful: { text: (f) => (f.slipped ? 'Os perdéis entre las rocas con los vecinos liberados. A vuestra espalda, los contrabandistas aún no se han dado cuenta de nada.' : 'La tensión se afloja. Los contrabandistas guardan las armas.') },
        defeat: { to: 'bodega', text: 'Lo último que oís es la voz de Morla: "No los matéis. Al de la túnica le gustan vivos."', flags: ['captured'] },
      },
      checks: [
        { id: 'parley', label: 'Parlamentar con Morla (Persuasión CD 13)', skill: 'persuasion', dc: 13, preCombat: true, requires: ['password', 'meetMorla'], hideIf: ['morlaTalk'], advIf: ['meetMorla', 'knowsCult'],
          success: { text: 'Morla escupe en la arena. "El hermano Corvo apareció hace un mes. Pagaba en perlas para usar la cala. Luego empezó a pedir que apagáramos el faro… y ahora quiere la jaula para su Madre. Yo trafico con brandy, no con gente." Mira la jaula. "Pero si le fallo, mi tripulación acabará en el fondo del mar."', flags: ['morlaTalk', 'knowsCult', 'knowsGrotto'], xp: 50 },
          fail: { text: '"Habláis demasiado", dice Morla, y lleva la mano a la cimitarra. "Y yo no tengo tiempo."', startCombat: true } },
        { id: 'deal', label: 'Pactar con Morla: os ayuda contra el culto y nadie habla de su brandy', auto: true, preCombat: true, requires: ['morlaTalk'],
          success: { text: '"Trato hecho." Morla abre la jaula ella misma. "Mi balandra os llevará a la gruta por mar, y mis ballestas os cubrirán. Y cuando esto acabe, Punta Gaviota olvidará mi nombre." Los vecinos huyen hacia el pueblo.', flags: ['morlaDeal', 'cageFreed', 'boat'], inc: { captives: 1 }, xp: 50, peaceful: true, journal: 'Pacto con Morla Sal.' } },
        { id: 'arrest', label: 'Exigir que se entregue a la regidora (Intimidación CD 14)', skill: 'intimidation', dc: 14, preCombat: true, requires: ['morlaTalk'],
          success: { text: 'Morla os sostiene la mirada mucho rato. Luego desabrocha las cimitarras. "Mejor la cárcel de Aldara que la Madre de nadie." Abre la jaula y os deja usar su balandra.', flags: ['morlaArrested', 'cageFreed', 'boat'], inc: { captives: 1, trust: 1 }, xp: 75, peaceful: true },
          fail: { text: '"¿Entregarme? ¿A vosotros?" Morla se ríe y desenvaina. "¡A ellos!"', startCombat: true } },
        { id: 'cage', label: 'Liberar la jaula a escondidas (Sigilo CD 13, prueba de grupo; más difícil con el culto alerta)', skill: 'stealth', dc: 13, mode: 'group', preCombat: true, hideIf: ['cageFreed', 'morlaTalk'], dcMod: (f) => num(f, 'alarm'),
          success: { text: 'Mientras los contrabandistas cargan barriles, cortáis las cuerdas de la jaula. Los vecinos os miran con lágrimas en los ojos y esperan vuestra señal.', flags: ['cageFreed'], inc: { captives: 1 }, xp: 50 },
          fail: { text: 'Un vecino grita de alivio al veros. Las antorchas se giran hacia la jaula. "¡Intrusos!"', inc: { alarm: 1 }, startCombat: true } },
        { id: 'slip', label: 'Escabulliros con los liberados hacia el sendero de la costa', auto: true, preCombat: true, requires: ['cageFreed'], hideIf: ['morlaTalk'],
          success: { text: 'Guiáis a los vecinos entre las rocas. Ellos corren hacia el pueblo; vosotros seguís la costa hacia la gruta.', flags: ['slipped'], peaceful: true } },
      ],
      exits: [
        { label: '¡Atacar a los contrabandistas!', fight: true },
        { label: 'Navegar hasta la gruta en la balandra', to: 'gruta', requires: ['boat'], effects: { set: { approach: 'boat' } }, hint: 'Rápido y por mar.' },
        { label: 'Seguir la costa a pie hasta la gruta (marea baja)', to: 'acantilado', effects: { set: { approach: 'shore' } }, hint: 'Largo y peligroso, pero discreto.' },
        { label: 'Volver al faro y buscar la escalera oculta', to: 'faro', hideIf: ['visitedFaro'], effects: { inc: { time: 1 } } },
      ],
    },

    // ------------------------------------------------------------------ captura
    bodega: {
      title: 'La bodega de La Gaviota Ciega',
      art: 'ship',
      onEnter: { heal: '1d6', gold: -10 },
      reward: { xp: 150 },
      text: [
        'Despertáis con la boca llena de sal, atados a un mástil en la bodega oscura de la balandra. El casco cruje con cada ola. Os han quitado el oro de los bolsillos, pero no las armas: están amontonadas en un rincón, fuera de vuestro alcance.',
        'Atada frente a vosotros hay una mujer mayor con el pelo gris recogido en una trenza y un uniforme de farera hecho jirones: Ilse Varo. "Por fin alguien", susurra. "Nos llevan a la gruta con la marea. Corvo quiere despertar a la Madre con nuestra sangre."',
        { if: (f) => f.morlaTalk, text: 'Por la escotilla oís a Morla discutir con su segundo: "No me gusta esto. No me gusta nada."' },
      ],
      shortRest: true,
      checks: [
        { id: 'ropes', label: 'Soltar las cuerdas (Juego de manos o Acrobacias CD 13)', skill: 'sleight', altSkill: 'acrobatics', dc: 13, hideIf: ['freed'], retry: true,
          success: { text: 'Retuerces las muñecas hasta que el nudo cede. En un momento estáis todos libres y armados.', flags: ['freed'], xp: 75 },
          fail: { text: 'La cuerda se clava en la piel. Necesitáis otra mano… o más paciencia.' } },
        { id: 'turnMorla', label: 'Convencer a Morla cuando baje a veros (Persuasión CD 14)', skill: 'persuasion', dc: 14, hideIf: ['freed'], advIf: ['morlaTalk'],
          success: { text: 'Le recordáis a Morla lo que es entregar gente a un monstruo. Ella aprieta los dientes, saca un cuchillo y corta vuestras cuerdas. "Al infierno Corvo. Os llevaré a la gruta, y mi tripulación luchará a vuestro lado."', flags: ['freed', 'morlaDeal', 'boat'], unset: ['morlaHostile'], xp: 100 },
          fail: { text: 'Morla escucha en silencio y vuelve a subir sin decir nada.' } },
        { id: 'brawl', label: 'Esperar a que bajen a por vosotros y saltar sobre ellos', auto: true, hideIf: ['freed'],
          success: { text: 'Cuando dos marineros bajan a por vosotros, les caéis encima con cuerdas y todo. Recuperáis las armas entre golpes y patadas.', flags: ['freed'], damageAll: { expr: '1d6', type: 'contundente' } } },
        { id: 'ilse', label: 'Atender a Ilse y escuchar lo que sabe (Medicina o Perspicacia CD 10)', skill: 'medicine', altSkill: 'insight', dc: 10, hideIf: ['ilse'],
          success: { text: 'Ilse recupera el aliento. "Bajé por la escalera del faro y los vi: Corvo y sus fieles, cantando junto a un pozo de agua negra. Pero las campanas viejas siguen allí, colgadas sobre el agua. Si las hacéis sonar, los fieles despiertan del trance. Lo dice el diario de mi abuelo."', flags: ['ilse', 'knowsBells', 'knowsGrotto', 'knowsCult'], inc: { captives: 1 }, xp: 50 },
          fail: { text: 'Ilse está demasiado débil para hablar mucho. Al menos podéis llevarla con vosotros.', flags: ['ilse'], inc: { captives: 1 } } },
      ],
      exits: [
        { label: 'Escapar en el bote de la balandra hacia la gruta', to: 'gruta', requires: ['freed'], effects: { set: { approach: 'boat' } } },
      ],
    },

    // ------------------------------------------------------------------ la costa a pie
    acantilado: {
      title: 'El sendero de los acantilados',
      art: 'cliffs',
      text: [
        'Con la marea baja, una franja de rocas resbaladizas bordea el pie de los acantilados hasta el promontorio del faro. Las paredes están cubiertas de agujeros, y de los agujeros sale un zumbido húmedo.',
        'Estirges: bichos del tamaño de un gato, con alas de murciélago y una trompa afilada como un punzón. Huelen la sangre a cien pasos.',
        { if: (f) => num(f, 'time') >= 3, text: 'La marea ya empieza a subir. No hay tiempo que perder.' },
      ],
      combat: {
        enemies: (n) => scale(n, [['stirge', 'stirge'], ['stirge', 'stirge', 'stirge'], ['stirge', 'stirge', 'stirge', 'stirge'], ['stirge', 'stirge', 'stirge', 'stirge', 'stirge']]),
        auto: () => false,
        surprise: () => null,
        victory: { text: 'Las últimas estirges caen al agua. Entre los nidos encontráis la bolsa de algún pescador desafortunado.', milestoneXp: 200, gold: 6, items: { potion_healing: 1 } },
        peaceful: { text: 'Pasáis bajo los nidos sin despertar a las estirges.' },
      },
      checks: [
        { id: 'quiet', label: 'Pasar bajo los nidos en silencio (Sigilo CD 12, prueba de grupo)', skill: 'stealth', dc: 12, mode: 'group', preCombat: true,
          success: { text: 'Avanzáis pegados a la roca, conteniendo la respiración.', peaceful: true, xp: 25 },
          fail: { text: 'El zumbido se convierte en un chillido. ¡Las estirges salen en enjambre!', startCombat: true } },
        { id: 'smoke', label: 'Ahumar los nidos (gasta una antorcha)', auto: true, needsItem: 'torch', preCombat: true,
          success: { text: 'El humo llena los agujeros y las estirges se quedan dentro, atontadas.', peaceful: true } },
        { id: 'tide', label: 'Cruzar el último tramo antes de que suba la marea (Atletismo CD 12, prueba de grupo; ventaja con cuerda)', skill: 'athletics', dc: 12, mode: 'group', hideIf: ['crossedTide'], advIfItem: 'rope', dcMod: (f) => (num(f, 'time') >= 3 ? 2 : 0),
          success: { text: 'Llegáis a la boca de la gruta con el agua por las rodillas.', flags: ['crossedTide', 'quietArrival'], xp: 50 },
          fail: { text: 'Una ola os estampa contra las rocas. Llegáis a la gruta empapados, magullados y tarde.', flags: ['crossedTide'], damageFailed: { expr: '1d6', type: 'contundente' }, inc: { time: 1 } } },
      ],
      exits: [
        { label: '¡Espantarlas a golpes!', fight: true },
        { label: 'Entrar en la Gruta de las Campanas', to: 'gruta', requires: ['crossedTide'] },
      ],
    },

    // ------------------------------------------------------------------ la gruta
    gruta: {
      title: 'La Gruta de las Campanas',
      art: 'seacave',
      text: [
        { if: (f) => f.approach === 'stairs', text: 'La escalera de los contrabandistas baja en espiral por dentro de la roca y termina detrás de una cortina de algas. Desde ahí veis la gruta sin que nadie os vea.' },
        { if: (f) => f.approach === 'boat' && f.morlaDeal, text: 'La Gaviota Ciega entra en la gruta con las velas recogidas. Morla y sus ballesteros se agazapan en la borda. "Los centinelas son vuestros. Nosotros cubrimos."' },
        { if: (f) => f.approach === 'boat' && !f.morlaDeal, text: 'El bote se desliza en la oscuridad de la gruta, impulsado por la corriente. Nadie rema. Nadie habla.' },
        { if: (f) => f.approach === 'shore', text: 'Entráis por la boca de la gruta caminando sobre un banco de arena que la marea pronto cubrirá.' },
        'Es una catedral de roca negra. Del techo cuelgan tres campanas de bronce verdoso, medio sumergidas, que se balancean con el oleaje sin llegar a sonar. Al fondo, un resplandor verde y un canto lento.',
        'En la entrada montan guardia unas criaturas escamosas, de ojos negros y dientes de tiburón, con lanzas de coral: sahuagin, los hijos del mar profundo.',
        { if: (f) => num(f, 'time') >= 4, text: 'El canto ya se ha convertido en un clamor. El ritual ha empezado.' },
      ],
      combat: {
        enemies: (n) => scale(n, [['sahuagin'], ['sahuagin', 'sahuagin'], ['sahuagin', 'sahuagin', 'cultist'], ['sahuagin', 'sahuagin', 'sahuagin', 'cultist']]),
        auto: (f) => f.approach === 'shore' && !f.quietArrival && num(f, 'alarm') >= 2,
        surprise: (f) => (f.approach === 'stairs' || f.quietArrival ? 'enemies' : null),
        adjust: (enemies, f, log) => {
          if (enemies.length === 1) { enemies[0].hp = Math.ceil(enemies[0].hp * 0.7); enemies[0].maxHp = enemies[0].hp; }
          if (!f.morlaDeal) return;
          for (const e of enemies) { e.hp = Math.max(1, Math.ceil(e.hp * 0.6)); }
          log('🏹 Las ballestas de La Gaviota Ciega disparan primero: los centinelas empiezan el combate heridos.');
        },
        victory: { text: 'Los centinelas caen al agua y se hunden. Nadie más ha dado la alarma… todavía.', milestoneXp: 250, items: { potion_healing: 1 } },
        peaceful: { text: (f) => (f.disguised ? 'Los sahuagin os dejan pasar con un siseo. Para ellos, todos los humanos con perlas negras son iguales.' : 'Os deslizáis junto a los centinelas sin que os vean.') },
      },
      checks: [
        { id: 'disguise', label: 'Pasar como fieles con el amuleto (Engaño CD 13)', skill: 'deception', dc: 13, preCombat: true, requires: ['amulet'],
          success: { text: 'Alzáis la perla negra y los sahuagin bajan las lanzas.', flags: ['disguised'], xp: 75, peaceful: true },
          fail: { text: 'Un sahuagin olfatea el aire. Huele miedo, no devoción. Sisea y ataca.', startCombat: true, inc: { alarm: 1 } } },
        { id: 'sneak', label: 'Colarse entre las sombras (Sigilo CD 13, prueba de grupo; más difícil con el culto alerta)', skill: 'stealth', dc: 13, mode: 'group', preCombat: true, dcMod: (f) => num(f, 'alarm'), advIf: ['quietArrival'],
          success: { text: 'Pegados a la pared de la gruta, pasáis a un palmo de los centinelas.', flags: ['sneaked'], xp: 75, peaceful: true },
          fail: { text: 'Una piedra rueda y cae al agua. ¡Plof! Los sahuagin se giran.', startCombat: true, inc: { alarm: 1 } } },
        { id: 'pens', label: 'Buscar a los cautivos de La Garza (Investigación o Percepción CD 12)', skill: 'investigation', altSkill: 'perception', dc: 12, hideIf: ['pensFreed'],
          success: { text: 'En una cámara lateral, tras una reja de coral, están los pasajeros que se llevaron del barco. Los liberáis y les indicáis el camino de salida.', flags: ['pensFreed'], inc: { captives: 1 }, xp: 50 },
          fail: { text: 'Oís sollozos en algún lugar, pero el eco de la gruta los multiplica y no sabéis de dónde vienen.' } },
      ],
      shortRest: true,
      reward: { xp: 150 },
      milestoneLevel: 3,
      exits: [
        { label: '¡Atacar a los centinelas!', fight: true },
        { label: 'Avanzar hacia el resplandor verde', to: 'santuario' },
      ],
    },

    // ------------------------------------------------------------------ el santuario (final)
    santuario: {
      title: 'El pozo de la Madre',
      art: 'abyss',
      text: [
        'Al fondo de la gruta, un pozo de agua negra brilla con una luz verde enfermiza. A su alrededor, los fieles se balancean en trance con los ojos en blanco. De pie sobre una roca, con una túnica de escamas y una daga de coral, el hermano Corvo dirige el canto.',
        { if: (f) => !f.ilse, text: 'Sobre un altar de piedra, atada y amordazada, está Ilse Varo, la farera.' },
        { if: (f) => num(f, 'time') >= 4 || num(f, 'alarm') >= 2, text: 'El agua del pozo burbujea. Algo enorme se mueve dentro. Una cabeza con aletas y colmillos asoma entre la espuma: el Hijo de la Madre ha despertado.' },
        { if: (f) => f.morlaDeal, text: 'A vuestra espalda, Morla Sal tensa la ballesta. "Cuando digáis."' },
      ],
      combat: {
        enemies: (n, f) => {
          const late = num(f, 'time') >= 4 || num(f, 'alarm') >= 2;
          const calmed = f.bellsRung || f.faithBroken;
          let list = scale(n, [['cult_fanatic'], ['cult_fanatic', 'cultist'], ['cult_fanatic', 'cultist', 'sahuagin'], ['cult_fanatic', 'cultist', 'cultist', 'sahuagin']]);
          if (calmed) list = list.filter((t) => t !== 'cultist');
          if (late) list = list.concat(n >= 3 ? ['merrow'] : ['sahuagin']);
          return list;
        },
        names: { cult_fanatic: 'Hermano Corvo', merrow: 'El Hijo de la Madre' },
        auto: () => false,
        surprise: (f) => (f.disguised || f.sneaked ? 'enemies' : null),
        adjust: (enemies, f, log) => {
          for (const e of enemies) if (e.type === 'cult_fanatic' && enemies.length <= 2) { e.hp = Math.ceil(e.hp * 0.7); e.maxHp = e.hp; }
          if (f.morlaDeal) {
            for (const e of enemies) e.hp = Math.max(1, Math.ceil(e.hp * 0.75));
            log('🏹 La tripulación de Morla dispara una andanada de ballestas: todos los enemigos están heridos.');
          }
          if (f.lightOn) log('🌟 La luz del faro se filtra por las grietas del techo. El agua del pozo pierde parte de su brillo.');
        },
        victory: {
          text: 'El hermano Corvo cae al pozo con un grito y el agua negra se lo traga. La luz verde parpadea… y se apaga. Las campanas empiezan a sonar solas, una tras otra, mientras la gruta entera tiembla. ¡El mar está entrando!',
          milestoneXp: 300, flags: ['cultBroken'], gold: 30, items: { potion_greater_healing: 1, cloak_protection: 1 },
        },
        defeat: { to: 'fin_abismo', text: 'El agua negra os cubre. Lo último que veis es la sonrisa de Corvo, y algo inmenso que abre los ojos en el fondo del pozo.' },
      },
      checks: [
        { id: 'bells', label: 'Hacer sonar las campanas sumergidas (Atletismo CD 13)', skill: 'athletics', dc: 13, preCombat: true, requires: ['knowsBells'], hideIf: ['bellsRung'],
          success: { text: 'Te cuelgas de la cadena y golpeas la campana con todo tu peso. ¡DONNNG! El tañido recorre la gruta. Los fieles parpadean, se miran las manos… y huyen gritando. Solo quedan Corvo y sus criaturas.', flags: ['bellsRung'], xp: 75 },
          fail: { text: 'La cadena está resbaladiza y caes al agua helada. Corvo os ha visto.', damageFailed: { expr: '1d4', type: 'frío' }, startCombat: true } },
        { id: 'faith', label: 'Desmontar la fe de los fieles: la Madre no existe (Religión o Persuasión CD 15)', skill: 'religion', altSkill: 'persuasion', dc: 15, preCombat: true, hideIf: ['bellsRung', 'faithBroken'], dcMod: (f) => num(f, 'alarm') - (f.knowsCult ? 2 : 0),
          success: { text: 'Tu voz rompe el canto. Hablas de los marineros ahogados, de las familias de Punta Gaviota, de las perlas con las que Corvo compraba voluntades. Uno a uno, los fieles bajan la cabeza y se apartan del pozo.', flags: ['faithBroken'], xp: 75 },
          fail: { text: '"¡Blasfemia!", grita Corvo. "¡Dádselos a la Madre!"', startCombat: true } },
        { id: 'rescue', label: 'Desatar a Ilse del altar sin ser vistos (Sigilo CD 13)', skill: 'stealth', dc: 13, preCombat: true, hideIf: ['ilse'], dcMod: (f) => num(f, 'alarm'),
          success: { text: 'Te deslizas hasta el altar y cortas las cuerdas. Ilse se escabulle detrás de las rocas.', flags: ['ilse'], inc: { captives: 1 }, xp: 50 },
          fail: { text: 'Corvo se gira justo cuando tocas las cuerdas. "Ah. Más ofrendas."', startCombat: true } },
      ],
      exits: [
        { label: '¡Detener el ritual!', fight: true },
        { label: 'Huir de la gruta antes de que se inunde', to: 'marea' },
      ],
    },

    // ------------------------------------------------------------------ huida
    marea: {
      title: 'La marea viva',
      art: 'seacave',
      text: [
        'La gruta ruge. El agua entra a borbotones por la boca de la cueva y sube por momentos. Las campanas tañen sin parar, como si celebraran algo.',
        { if: (f) => f.boat, text: 'La balandra se balancea junto a la roca. ¡Hay que llegar hasta ella!' },
        { if: (f) => !f.boat, text: 'La única salida es nadar hasta la escalera del faro, contra la corriente.' },
      ],
      checks: [
        { id: 'escape', label: 'Escapar de la gruta inundada (Atletismo CD 12, prueba de grupo; ventaja con cuerda)', skill: 'athletics', dc: 12, mode: 'group', hideIf: ['escaped'], advIfItem: 'rope', dcMod: (f) => (f.boat ? -2 : 0) + (num(f, 'time') >= 4 ? 2 : 0),
          success: { text: 'Os agarráis unos a otros y salís al aire libre justo cuando la boca de la gruta desaparece bajo una ola gigantesca.', flags: ['escaped'], xp: 50 },
          fail: { text: 'La corriente os zarandea contra las rocas, pero al final salís, tosiendo agua salada.', flags: ['escaped'], damageFailed: { expr: '2d6', type: 'contundente' } } },
      ],
      exits: [{ label: 'Volver a Punta Gaviota', to: 'desenlace', requires: ['escaped'] }],
    },

    desenlace: {
      title: 'El regreso',
      redirect: (f) => {
        if (!f.cultBroken) return 'fin_marea';
        if (f.morlaDeal && !f.morlaArrested) return 'fin_contrabando';
        if (!f.lightOn || num(f, 'captives') < 2) return 'fin_marea';
        return 'fin_faro';
      },
      text: [],
      exits: [],
    },

    // ------------------------------------------------------------------ finales
    fin_faro: {
      title: 'Epílogo: la luz de Punta Gaviota',
      art: 'lighthouse',
      ending: { title: 'La luz de Punta Gaviota', tone: 'good' },
      text: [
        'Cuando llegáis al pueblo, el haz del faro barre el mar y todas las campanas de Punta Gaviota repican. La regidora Aldara os paga lo prometido y os abraza a todos, aunque estéis empapados.',
        { if: (f) => f.ilse, text: 'Ilse Varo vuelve a su faro esa misma noche. Jura que no volverá a apagarse mientras ella viva, y os regala un catalejo de latón que perteneció a su abuelo.' },
        { if: (f) => f.morlaArrested, text: 'Morla Sal es juzgada por contrabando. Su testimonio contra el culto le vale una condena corta. Dicen que, desde la ventana de su celda, mira el faro cada noche.' },
        { if: (f) => num(f, 'trust') >= 2, text: 'Los pescadores os invitan a la fiesta de la marea, la primera en años. Os sirven tanta sardina asada que tardaréis semanas en querer ver otra.' },
        { if: (f) => num(f, 'captives') >= 3, text: 'Todos los desaparecidos han vuelto a casa. En el puerto, alguien empieza a pintar vuestros nombres en la proa de una barca nueva.' },
        'FIN. Habéis salvado Punta Gaviota.',
      ],
      reward: { gold: 60 },
      end: true,
      exits: [],
    },
    fin_contrabando: {
      title: 'Epílogo: socios de la capitana',
      art: 'cove',
      ending: { title: 'Socios de la capitana', tone: 'mixed' },
      text: [
        'El culto ha caído, y en Punta Gaviota todos saben que fue gracias a vosotros… y a las ballestas de La Gaviota Ciega. La regidora Aldara os paga, pero aprieta los labios cuando ve a Morla Sal brindar en el muelle.',
        'Morla cumple su palabra: nadie vuelve a desaparecer en esta costa. Pero el brandy sin sello corre por las tabernas, y la aduana mira hacia otro lado. Antes de zarpar, Morla os da una bolsa de perlas negras: "Por si algún día necesitáis una tripulación que no haga preguntas."',
        { if: (f) => !f.lightOn, text: 'El faro sigue apagado unas noches más. A Morla no le importa: sus barcos conocen la costa de memoria.' },
        { if: (f) => num(f, 'captives') >= 2, text: 'Al menos los vecinos secuestrados han vuelto a casa, y eso nadie os lo podrá quitar.' },
        'FIN. Punta Gaviota está a salvo… a su manera.',
      ],
      reward: { gold: 80 },
      end: true,
      exits: [],
    },
    fin_marea: {
      title: 'Epílogo: la marea amarga',
      art: 'harbor',
      ending: { title: 'La marea amarga', tone: 'mixed' },
      text: [
        'El hermano Corvo ya no cantará más, pero la victoria sabe a sal y a ceniza.',
        { if: (f) => !f.lightOn, text: 'Esa misma noche, con el faro aún apagado, otro barco pesquero se estrella contra los arrecifes. Lo veis arder desde el muelle, sin poder hacer nada.' },
        { if: (f) => num(f, 'captives') < 2, text: 'Muchos de los desaparecidos no vuelven. En el puerto, las familias dejan velas flotando en el agua, una por cada nombre.' },
        { if: (f) => !f.cultBroken, text: 'Huisteis de la gruta antes de terminar el ritual. Nadie sabe qué despertó allí abajo, pero los pescadores dicen que el mar está más callado que nunca.' },
        'La regidora Aldara os paga lo prometido sin decir una palabra. Habéis hecho lo que habéis podido. A veces, eso no basta.',
        'FIN.',
      ],
      reward: { gold: 40 },
      end: true,
      exits: [],
    },
    fin_abismo: {
      title: 'Epílogo: lo que duerme bajo las olas',
      art: 'abyss',
      ending: { title: 'Lo que duerme bajo las olas', tone: 'bad' },
      text: [
        'Despertáis en la playa al amanecer, vivos de milagro, escupiendo agua y arena. La marea os ha devuelto como devuelve los restos de los naufragios.',
        'La Gruta de las Campanas ya no existe: el promontorio se ha hundido y el faro está inclinado sobre el mar como un borracho. Y mar adentro, donde antes no había nada, el agua hierve en un círculo perfecto.',
        'La regidora Aldara ordena evacuar Punta Gaviota. Los pescadores cargan sus barcas en silencio. Nadie os culpa, pero nadie os mira a los ojos.',
        'FIN. La Madre de las Mareas ha despertado. Quizá otros héroes, algún día, terminen lo que vosotros empezasteis.',
      ],
      end: true,
      exits: [],
    },
  },
};
