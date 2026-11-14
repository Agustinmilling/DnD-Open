// Aventura original: "La Última Vendimia" (para 1-4 personajes de nivel 1 a 3). Terror gótico.
// Historia, lugares y personajes originales. Monstruos y reglas: SRD 5.2.1.
//
// Ramificaciones principales:
//   - Tres pistas en cualquier orden (viñedos, ermita, taberna). Cada una gasta una noche (contador `nights`):
//     si tardáis demasiado, el Primer Señor despierta del todo y el final es más duro.
//   - Contador `fear` (el miedo del pueblo): si crece, una turba sube a quemar la Casona. Contador `shadows` (sombras devueltas).
//   - La baronesa Isaura puede ser aliada, sospechosa o víctima. El médico Quirce quiere el pacto para sí.
//   - Tres formas de bajar a la bodega (llave, túnel de la ermita, la prensa vieja) y cuatro finales.

const scale = (n, table) => table[Math.max(1, Math.min(4, n)) - 1];
const num = (f, k) => Number(f[k]) || 0;
const night = { inc: { nights: 1 } };
const leadExits = [
  { label: 'Salir a los viñedos de noche', to: 'vinedos', hideIf: ['visitedVines'], effects: night, hint: 'Una pista más… pero se os va otra noche.' },
  { label: 'Subir a la ermita y su cementerio', to: 'ermita', hideIf: ['visitedErmita'], effects: night, hint: 'Una pista más… pero se os va otra noche.' },
  { label: 'Entrar en la taberna El Racimo Negro', to: 'taberna', hideIf: ['visitedTavern'], effects: night, hint: 'Una pista más… pero se os va otra noche.' },
];
const toManor = { label: 'Subir a la Casona Morvel', to: 'casona' };

module.exports = {
  id: 'vendimia',
  title: 'La Última Vendimia',
  summary: 'En el valle de Valdecierzo nunca hiela, nunca hay peste y el vino es el mejor del reino. Este otoño, los vendimiadores han empezado a perder la sombra. Algo cobra una deuda muy antigua bajo la prensa de la Casona Morvel.',
  art: 'manor',
  length: '2-3 horas',
  tags: ['Terror gótico', 'Misterio', 'No muertos', 'Pacto'],
  endingCount: 4,
  start: 'llegada',
  startGold: 20,
  startFlags: { nights: 0, fear: 0, shadows: 0 },
  journal: {
    noShadow: 'Los enfermos de Valdecierzo no proyectan sombra. Se apagan poco a poco, fríos y pálidos.',
    knowsWine: 'Todos los enfermos bebieron «tinto de medianoche», el vino viejo de los Morvel.',
    knowsVine: 'Las cepas viejas de la Casona beben sombras por las raíces. Sus zarcillos se mueven solos.',
    knowsCellar: 'Los sonámbulos llevan la uva de noche a la prensa vieja, detrás de la Casona. Debajo hay una bodega.',
    knowsPact: 'Hace doscientos años, el primer barón Morvel pactó la prosperidad del valle. Su tumba no tiene fecha de muerte.',
    knowsName: 'El nombre verdadero del Primer Señor: Hernán Morvel, «el que no quiso ser vendimiado».',
    knowsTunnel: 'Un túnel de los antiguos ermitaños baja desde la ermita hasta la cripta de los Morvel.',
    knowsDoctor: 'El médico, maese Quirce Albano, compra frascos a escondidas a los vendimiadores enfermos.',
    ledger: 'Tenéis el cuaderno de maese Quirce: lleva la cuenta de las sombras que ha embotellado.',
    isauraTruth: 'La baronesa Isaura paga el diezmo con sus propios años para que el valle no pague más. Se está muriendo.',
    cellarKey: 'La baronesa os ha dado la llave de hierro de la bodega.',
    doctorPlan: 'Quirce piensa ocupar esta misma vendimia el lugar del Primer Señor y ser dueño del pacto.',
    doctorDown: 'Maese Quirce ya no embotellará más sombras.',
    mobCalm: 'Habéis convencido al pueblo de que no queme la Casona.',
    mobAlly: 'El pueblo de Valdecierzo sube con vosotros, con hoces y antorchas.',
    nights: (f) => `Noches perdidas: ${'🌙'.repeat(Math.max(0, Math.min(5, num(f, 'nights'))))} ${num(f, 'nights') >= 4 ? '(el Primer Señor ya ha despertado)' : ''}`,
    fear: (f) => `Miedo en el pueblo: ${'🔥'.repeat(Math.max(0, Math.min(5, num(f, 'fear')))) || 'en calma'}`,
    shadows: (f) => `Sombras devueltas: ${num(f, 'shadows')}`,
  },
  scenes: {
    // ------------------------------------------------------------------ el pueblo
    llegada: {
      title: 'Valdecierzo, en vendimia',
      art: 'village',
      text: [
        'El camino baja entre terrazas de viña roja hasta Valdecierzo, un pueblo de piedra oscura apretado en el fondo del valle. Es tiempo de vendimia y debería oler a mosto y a fiesta. Huele a mosto, sí. Pero nadie canta, y las contraventanas se cierran a vuestro paso.',
        'Os recibe la hermana Leocadia, una mujer menuda con las manos manchadas de cera, que cuida la capilla del pueblo. Os lleva hasta un banco de la plaza donde una niña, Nela, mira el suelo sin parpadear. El sol de la tarde alarga las sombras de la fuente, del banco, de vosotros. La niña no tiene sombra.',
        '"Ya son once", dice Leocadia. "Primero pierden la sombra. Luego el color. Luego dejan de despertarse. El médico dice que es anemia. La baronesa no baja de la Casona. Y yo ya no sé a quién rezar." Os ofrece 50 piezas de oro a cada uno, todo el cepillo de la capilla, si averiguáis qué se está llevando a su gente.',
        'En la plaza, el tendero vende lo poco que le queda.',
      ],
      shop: { potion_healing: 50, torch: 1, rope: 1, holy_water: 25, antitoxin: 50, healers_kit: 5 },
      checks: [
        { id: 'nela', label: 'Examinar a la niña sin sombra (Medicina o Arcanos CD 11)', skill: 'medicine', altSkill: 'arcana', dc: 11,
          success: { text: 'No es anemia. El pulso de Nela es lento pero firme; lo que le falta no es sangre. Cuando acercas una vela, la luz la atraviesa como si fuera un poco menos sólida que ayer. En sus labios queda una mancha morada: vino. "El tinto de medianoche", murmura la niña. "Me dieron un sorbo para brindar."', flags: ['noShadow', 'knowsWine'], xp: 25 },
          fail: { text: 'La niña está fría y pálida, pero no encuentras herida ni fiebre. Sea lo que sea, no viene en tus libros.', flags: ['noShadow'] } },
        { id: 'plaza', label: 'Ganarse a los vecinos en la plaza (Persuasión CD 11)', skill: 'persuasion', dc: 11,
          success: { text: 'Ayudas a cargar unos cestos y alguien acaba hablando. "De noche salen a vendimiar dormidos", susurra un viejo. "Los ves pasar con el cesto al hombro hacia la Casona. Y vuelven sin sombra." Se santigua. "En la taberna te dirán que es mentira. En la taberna se bebe mucho."', flags: ['knowsWine'], inc: { fear: -1 }, xp: 25 },
          fail: { text: 'Los vecinos os miran las sombras, una por una, como si las contaran. Nadie dice nada. Alguien cierra una puerta.', inc: { fear: 1 } } },
        { id: 'morvel', label: 'Recordar qué se cuenta de los Morvel (Historia CD 12)', skill: 'history', dc: 12,
          success: { text: 'Los Morvel son barones del valle desde hace dos siglos. Su vino no tiene rival y su valle no ha conocido helada, peste ni guerra en todo ese tiempo, lo cual, bien pensado, no es normal. Los cronistas lo llaman «la suerte de Valdecierzo». Nadie escribe quién la paga.', flags: ['knowsPact'], xp: 25 },
          fail: { text: 'Recuerdas que el vino de Valdecierzo es carísimo y poco más.' } },
        { id: 'doctor', label: 'Observar al médico, que os mira desde su puerta (Perspicacia CD 12)', skill: 'insight', dc: 12,
          success: { text: 'Maese Quirce Albano, un hombre pulcro con guantes de cabritilla, os saluda con demasiada amabilidad. No mira a la niña enferma: mira vuestras sombras, como quien calcula un precio. Cuando se da cuenta de que lo observas, entra en casa y echa el cerrojo.', flags: ['knowsDoctor'], xp: 25 },
          fail: { text: 'El médico os saluda con una inclinación cortés y vuelve a sus frascos. Parece un hombre ocupado.' } },
      ],
      exits: [...leadExits.map((e) => ({ ...e, effects: undefined, hint: null })), toManor],
    },

    // ------------------------------------------------------------------ pista 1: los viñedos
    vinedos: {
      title: 'Las viñas a medianoche',
      art: 'forest',
      onEnter: { flags: ['visitedVines'] },
      text: [
        'De noche, las terrazas de viña son un mar negro de hojas que susurran sin viento. Entre las hileras avanzan figuras con cestos al hombro: vendimiadores en camisón, descalzos, con los ojos cerrados. Cortan los racimos sin mirar.',
        'Detrás de ellos, pegadas al suelo, se arrastran cosas que no son suyas. Sombras sin dueño, largas como la tarde, que os huelen y se despegan de la tierra.',
      ],
      combat: {
        enemies: (n) => scale(n, [['zombie'], ['zombie', 'skeleton'], ['shadow', 'skeleton'], ['shadow', 'skeleton', 'skeleton']]),
        names: { skeleton: 'Vendimiador sin fecha' },
        auto: () => false,
        surprise: (f) => (f.vinesAmbush ? 'enemies' : null),
        victory: { text: 'La última sombra se deshace como humo de sarmiento. Los vendimiadores dormidos siguen cortando racimos, ajenos a todo.', milestoneXp: 200, items: { potion_healing: 1 } },
        peaceful: { text: 'Las sombras retroceden hacia las cepas viejas y se quedan allí, vigilando.' },
      },
      checks: [
        { id: 'light', label: 'Mantenerlas a raya con fuego (gasta una antorcha)', auto: true, needsItem: 'torch', preCombat: true,
          success: { text: 'Levantas la antorcha y las sombras se encogen, pegadas al suelo. No soportan tener una luz tan cerca… porque entonces se ve que no pertenecen a nadie.', peaceful: true } },
        { id: 'sneak', label: 'Avanzar agachados entre las hileras (Sigilo CD 12, prueba de grupo)', skill: 'stealth', dc: 12, mode: 'group', preCombat: true,
          success: { text: 'Os movéis al ritmo de los sonámbulos y las sombras os toman por otros dormidos. Las tenéis de espaldas.', flags: ['vinesAmbush'], startCombat: true },
          fail: { text: 'Una hoja seca cruje. Todas las sombras giran hacia vosotros a la vez.', startCombat: true } },
        { id: 'follow', label: 'Seguir a los sonámbulos (Supervivencia CD 11)', skill: 'survival', dc: 11,
          success: { text: 'Los sigues ladera arriba. No van al lagar del pueblo: rodean la Casona Morvel y vacían los cestos en una prensa de piedra vieja, medio tapada por la hiedra. El mosto no cae en ninguna cuba. Se cuela por una reja, hacia abajo.', flags: ['knowsCellar'], xp: 50 },
          fail: { text: 'Los pierdes entre la niebla, pero las huellas de pies descalzos suben todas hacia la Casona, hacia la parte de atrás.', flags: ['knowsCellar'] } },
        { id: 'vine', label: 'Examinar las cepas más viejas (Naturaleza CD 12)', skill: 'nature', dc: 12,
          success: { text: 'Estas cepas tienen dos siglos y no deberían dar fruto. Escarbas junto al tronco: las raíces no buscan agua, se enroscan alrededor de las sombras de las piedras. Un zarcillo te roza la muñeca, tanteando. Lo cortas. Sangra tinto.', flags: ['knowsVine'], xp: 50 },
          fail: { text: 'Son cepas viejas y retorcidas. Un zarcillo se te engancha en la manga y te cuesta soltarlo más de lo razonable.' } },
        { id: 'wake', label: 'Despertar a un sonámbulo sin hacerle daño (Medicina o Persuasión CD 12)', skill: 'medicine', altSkill: 'persuasion', dc: 12,
          success: { text: 'Le quitas el cesto, le hablas bajo, le pones tu capa. El hombre parpadea. A sus pies, tímida, vuelve a dibujarse una sombra delgada. "Soñaba que alguien me contaba", dice. "Como se cuentan las cubas."', inc: { shadows: 1, fear: -1 }, xp: 50 },
          fail: { text: 'El hombre se despierta gritando y echa a correr ladera abajo, hacia el pueblo, despertando a medio valle.', inc: { fear: 1 } } },
      ],
      exits: [{ label: '¡Enfrentarse a las sombras!', fight: true }, ...leadExits, toManor],
    },

    // ------------------------------------------------------------------ pista 2: la ermita
    ermita: {
      title: 'La ermita de los Sin Fecha',
      art: 'ruins',
      onEnter: { flags: ['visitedErmita'] },
      text: [
        'Sobre el pueblo, donde ya no llegan las viñas, queda una ermita sin tejado y un cementerio de lápidas inclinadas. La hermana Leocadia ya no sube: dice que aquí las oraciones se quedan a medias.',
        'Entre las tumbas alguien ha estado cavando. No para enterrar. La tierra removida se mueve otra vez, desde dentro, y unos dedos sin carne se agarran al borde de la fosa.',
      ],
      combat: {
        enemies: (n) => scale(n, [['zombie'], ['skeleton', 'zombie'], ['skeleton', 'skeleton', 'zombie'], ['skeleton', 'skeleton', 'zombie', 'zombie']]),
        auto: () => true,
        surprise: () => null,
        victory: { text: 'Los huesos vuelven a ser solo huesos. Los colocáis en su fosa lo mejor que sabéis. En ninguna de estas lápidas hay fecha de muerte: solo un nombre, un racimo tallado y la palabra «PAGADO».', milestoneXp: 200, flags: ['knowsPact'], gold: 5 },
      },
      checks: [
        { id: 'stones', label: 'Leer las lápidas borradas (Investigación CD 12)', skill: 'investigation', dc: 12,
          success: { text: 'Calcas las inscripciones con carbón. Una lápida cada año, durante doscientos años: vecinos del valle «pagados» en vendimia. Y en el centro, un panteón con el escudo de los Morvel y una losa que nunca se llegó a grabar. El primer barón no está enterrado aquí. No está enterrado en ninguna parte.', flags: ['knowsPact'], xp: 50 },
          fail: { text: 'El musgo se ha comido casi todo. Solo distingues una palabra repetida: «PAGADO».', flags: ['knowsPact'] } },
        { id: 'register', label: 'Buscar el libro de difuntos de la ermita (Religión o Historia CD 13)', skill: 'religion', altSkill: 'history', dc: 13,
          success: { text: 'Bajo el altar caído, envuelto en hule, está el libro de los ermitaños. La última página útil dice: «Hernán Morvel no quiso ser vendimiado como los demás hombres. Pidió al valle que pagara por él. Quien lo llame por su nombre entero le recordará que también él debe.»', flags: ['knowsName'], xp: 75 },
          fail: { text: 'Encuentras el libro, pero la humedad ha pegado las páginas. Tendréis que averiguar el nombre del primer barón en otra parte.' } },
        { id: 'bless', label: 'Bendecir agua en la pila de la ermita (Religión CD 11)', skill: 'religion', dc: 11,
          success: { text: 'La pila aún guarda agua de lluvia. Rezas despacio, hasta el final, y por una vez aquí arriba la oración no se queda a medias.', items: { holy_water: 1 }, xp: 25 },
          fail: { text: 'Las palabras se te enredan. Leocadia tenía razón: aquí cuesta terminar una oración.' } },
        { id: 'tunnel', label: 'Registrar la celda del último ermitaño (Percepción CD 12)', skill: 'perception', dc: 12,
          success: { text: 'Detrás del camastro podrido hay una losa con una argolla. Debajo, una escalera estrecha baja hacia el valle, en dirección a la Casona. Los ermitaños vigilaban a los Morvel desde abajo.', flags: ['knowsTunnel'], xp: 50 },
          fail: { text: 'Una celda vacía, un camastro podrido y una corriente de aire frío que no sabes de dónde viene.' } },
      ],
      exits: [{ label: '¡Devolverlos a la tierra!', fight: true }, ...leadExits, toManor],
    },

    // ------------------------------------------------------------------ pista 3: la taberna
    taberna: {
      title: 'El Racimo Negro',
      art: 'tavern',
      onEnter: { flags: ['visitedTavern'] },
      text: [
        'La taberna está llena y nadie habla alto. La tabernera, Tomasa Reca, sirve de una barrica marcada con una luna: tinto de medianoche, «cortesía de la Casona, como cada vendimia». Los que beben de ella tienen las mejillas hundidas y no miran al suelo, por no ver lo que les falta.',
        'En la mesa del fondo, tres hombres con brazaletes de cuero cuentan frasquitos de cristal oscuro en un maletín de médico. Uno de ellos os ha visto entrar y ha dejado de contar.',
      ],
      combat: {
        enemies: (n) => scale(n, [['bandit'], ['bandit', 'thug'], ['bandit', 'bandit', 'thug'], ['bandit', 'bandit', 'thug', 'thug']]),
        names: { thug: 'Matón de maese Quirce', bandit: 'Recadero de maese Quirce' },
        auto: () => false,
        surprise: () => null,
        victory: { text: 'Los hombres de Quirce quedan entre las mesas volcadas. En el maletín hay una docena de frascos fríos al tacto y un cuaderno de tapas negras: nombres del pueblo, fechas y, al lado, una columna de precios.', milestoneXp: 175, flags: ['ledger', 'knowsDoctor'], gold: 8 },
        peaceful: { text: 'Los hombres de Quirce recogen el maletín y se marchan sin daros la espalda.' },
      },
      checks: [
        { id: 'gossip', label: 'Sentarse a beber y escuchar (Perspicacia o Interpretación CD 11)', skill: 'insight', altSkill: 'performance', dc: 11, preCombat: true,
          success: { text: 'Pides un vino corriente y pones la oreja. Los de los brazaletes trabajan para el médico: pagan una moneda de plata a cada enfermo por «una muestra». Nadie sabe de qué. Los enfermos empeoran al día siguiente.', flags: ['knowsDoctor', 'knowsWine'], xp: 25 },
          fail: { text: 'Te sirven tinto de medianoche sin preguntar. Lo apartas a tiempo, pero los del fondo ya os han marcado.', startCombat: true } },
        { id: 'bag', label: 'Hacerse con el cuaderno del maletín (Juego de manos CD 13)', skill: 'sleight', dc: 13, preCombat: true,
          success: { text: 'Tropiezas, te disculpas, y cuando vuelves a tu mesa el cuaderno de tapas negras está bajo tu capa. Nombres, fechas, precios. Y un título en la primera página: «Cosecha de sombras. Propiedad de Q. Albano».', flags: ['ledger', 'knowsDoctor'], peaceful: true, xp: 75 },
          fail: { text: 'Una mano enguantada te agarra la muñeca. "Eso no es tuyo, forastero."', startCombat: true } },
        { id: 'scare', label: 'Echarlos de la taberna con malas caras (Intimidación CD 12)', skill: 'intimidation', dc: 12, preCombat: true,
          success: { text: 'Les explicas, despacio, lo que opinas de quien compra a los moribundos. Recogen el maletín y se van. Con las prisas se dejan un frasco, frío como un trozo de noche.', flags: ['knowsDoctor'], peaceful: true, xp: 50 },
          fail: { text: '"¿Y quién nos va a echar? ¿Tú?" Las sillas chirrían.', startCombat: true } },
        { id: 'tomasa', label: 'Convencer a Tomasa de que cierre la barrica (Persuasión CD 12)', skill: 'persuasion', dc: 12,
          success: { text: 'Tomasa mira su propia sombra, más fina cada noche, y luego la barrica de la luna. La tapa con un mazo. "Doscientos años brindando con esto", dice. "Mi abuela decía que era de mala educación preguntar de dónde venía la suerte."', flags: ['knowsWine', 'barrelShut'], inc: { fear: -1 }, xp: 50 },
          fail: { text: '"¿Y qué les digo? ¿Que el vino de la baronesa los mata?" La taberna entera os oye. El murmullo que sigue no es bueno.', flags: ['knowsWine'], inc: { fear: 1 } } },
        { id: 'frasco', label: 'Abrir uno de los frascos oscuros (Arcanos CD 12)', skill: 'arcana', dc: 12, requires: ['ledger', 'knowsDoctor'],
          success: { text: 'Quitas el lacre con cuidado. Algo sale del frasco sin hacer ruido, cruza la taberna a ras de suelo y se cose a los pies de un chico que dormitaba junto al fuego. El chico despierta con hambre por primera vez en una semana.', inc: { shadows: 1 }, xp: 50 },
          fail: { text: 'El frasco se te escurre y se rompe. Lo que había dentro se queda un momento en el suelo, sin saber de quién es, y luego se cuela por las rendijas de la tarima.' } },
      ],
      exits: [{ label: '¡Pararles los pies!', fight: true }, ...leadExits, toManor],
    },

    // ------------------------------------------------------------------ la Casona
    casona: {
      title: 'La Casona Morvel',
      art: 'manor',
      onEnter: { flags: ['visitedManor'] },
      text: [
        'La Casona domina el valle desde un espolón de roca: tres pisos de piedra parda, hiedra roja y ventanas apagadas. No hay criados. Os abre la puerta la propia baronesa.',
        'Isaura Morvel no tendrá cuarenta años y camina con bastón. Lleva guantes, cuello alto y el pelo completamente blanco. A la luz del candelabro, su sombra es tan tenue que cuesta distinguirla de las del pasillo.',
        '"Vienen por lo de las sombras", dice, sin preguntar. "Pasen. Hace mucho que nadie sube a acusarme a la cara, y lo echaba de menos." Os conduce a un salón lleno de retratos: dos siglos de Morvel, todos con la misma copa en la mano.',
        { if: (f) => f.knowsDoctor, text: 'Por una puerta entreabierta veis el ala este, donde maese Quirce tiene su consulta «para atender a la señora». Huele a alcohol y a algo dulce.' },
      ],
      checks: [
        { id: 'isaura', label: 'Hacer que la baronesa diga la verdad (Perspicacia o Persuasión CD 13)', skill: 'insight', altSkill: 'persuasion', dc: 13, dcMod: (f) => (f.knowsPact ? -2 : 0),
          success: { text: 'Isaura se quita un guante. La mano es la de una anciana. "El pacto pide un diezmo cada vendimia: años de vida. Mi familia lo cobraba al valle, un vecino al año, y lo llamaba suerte. Yo decidí pagarlo yo." Se pone el guante. "Pero este otoño él pide más de lo que tengo, y ha empezado a servirse solo. Está despertando. Y hay alguien en mi casa que lo ayuda."', flags: ['isauraTruth', 'knowsPact'], xp: 75 },
          fail: { text: '"Mi familia ha cuidado este valle doscientos años", dice la baronesa, y no añade nada más. Pero le tiembla la mano del bastón.' } },
        { id: 'key', label: 'Pedirle la llave de la bodega (Persuasión CD 12)', skill: 'persuasion', dc: 12, requires: ['isauraTruth', 'knowsCellar'], dcMod: (f) => (f.isauraTruth ? -2 : 2),
          success: { text: 'La baronesa descuelga del cuello una llave de hierro negro. "Nadie que no fuera Morvel ha bajado en doscientos años. Si van a hacerlo, háganlo bien: él solo respeta a quien no le tiene miedo."', flags: ['cellarKey', 'knowsCellar'], xp: 50 },
          fail: { text: '"No voy a mandar a unos desconocidos a morir en mi bodega." Pero sus ojos se van, un instante, hacia la parte trasera de la casa, donde está la prensa vieja.', flags: ['knowsCellar'] } },
        { id: 'portraits', label: 'Estudiar la galería de retratos (Investigación CD 12)', skill: 'investigation', dc: 12,
          success: { text: 'Todos los Morvel tienen placa con dos fechas. Todos menos el primero: un hombre de ojos claros y sonrisa de dueño, pintado junto a una prensa de piedra. La placa dice solo: «Hernán Morvel. Plantó la viña.» Alguien, hace mucho, rascó debajo con una uña: «y no quiso ser vendimiado».', flags: ['knowsName'], xp: 50 },
          fail: { text: 'Doscientos años de narices idénticas. El más antiguo de los retratos te sigue con la mirada de una forma que prefieres no comentar.' } },
        { id: 'accuse', label: 'Enseñarle el cuaderno de Quirce', auto: true, requires: ['ledger'], hideIf: ['isauraWarned'],
          success: { text: 'La baronesa pasa las páginas con la mandíbula apretada. "Embotella lo que le sobra a él. Creí que solo me robaba el vino." Os señala el ala este. "Su consulta está ahí. Mi casa es suya, héroes: rómpanle lo que haga falta."', flags: ['isauraWarned', 'isauraTruth'], xp: 50 } },
      ],
      shortRest: true,
      exits: [
        { label: 'Entrar en la consulta del ala este', to: 'estudio', hideIf: ['visitedStudy'] },
        ...leadExits,
        { label: 'Esperar a que caiga la última noche de vendimia', to: 'vispera', hint: 'Ya no habrá tiempo para más pistas.' },
      ],
    },

    estudio: {
      title: 'La consulta de maese Quirce',
      art: 'study',
      onEnter: { flags: ['visitedStudy'] },
      text: [
        'El ala este es una consulta impecable: instrumental alineado, estantes de frascos oscuros con etiqueta y, al fondo, una fila de camas con las sábanas subidas hasta la barbilla de quienes las ocupan.',
        'Los pacientes no respiran. Cuando cerráis la puerta, se incorporan todos a la vez.',
      ],
      combat: {
        enemies: (n) => scale(n, [['zombie'], ['zombie', 'skeleton'], ['zombie', 'zombie', 'skeleton'], ['zombie', 'zombie', 'ghoul']]),
        names: { zombie: 'Paciente de Quirce' },
        auto: () => true,
        surprise: (f) => (f.isauraWarned ? null : 'perception'),
        ambushStealth: 3,
        victory: { text: 'Los pacientes vuelven a sus camas para no levantarse más. Eran los primeros enfermos, los que el médico «trasladó a la Casona para cuidarlos mejor».', milestoneXp: 225, flags: ['studyClear'] },
      },
      checks: [
        { id: 'notes', label: 'Leer las notas del médico (Arcanos o Medicina CD 12)', skill: 'arcana', altSkill: 'medicine', dc: 12,
          success: { text: 'La letra de Quirce es clara como una receta. «El Primer Señor no es eterno: es un cargo. El pacto obedece a quien se sienta bajo la prensa en la última noche de vendimia. La baronesa es débil. Yo no.» Debajo, una lista de lo que piensa cobrarle al valle cuando el diezmo sea suyo.', flags: ['doctorPlan', 'knowsDoctor', 'knowsCellar'], xp: 75 },
          fail: { text: 'Fórmulas, dosis, mareas de luna. Entiendes lo justo: Quirce prepara algo para la última noche de vendimia, abajo, en la bodega.', flags: ['knowsCellar', 'knowsDoctor'] } },
        { id: 'jars', label: 'Soltar las sombras de los estantes (Juego de manos o Arcanos CD 12)', skill: 'sleight', altSkill: 'arcana', dc: 12,
          success: { text: 'Rompéis los lacres uno a uno. Las sombras salen en fila, tantean el aire y se van ladera abajo, cada una hacia su casa. En el pueblo, alguien enciende una luz. Luego otra.', inc: { shadows: 2, fear: -1 }, xp: 75 },
          fail: { text: 'Un estante entero se viene abajo. Algunas sombras escapan hacia el pueblo; otras, asustadas, se cuelan por las rendijas del suelo, hacia la bodega.', inc: { shadows: 1 } } },
        { id: 'tonic', label: 'Preparar un reconstituyente con su botica (Medicina CD 12)', skill: 'medicine', dc: 12,
          success: { text: 'Quirce es un canalla, pero un canalla bien surtido. Con lo que hay en los estantes preparas dos frascos de algo que, al menos, sí cura.', items: { potion_healing: 2 }, xp: 25 },
          fail: { text: 'Mezclas lo que crees reconocer. Huele a pies. Decides no dárselo a nadie.' } },
      ],
      exits: [
        { label: '¡Defenderse de los pacientes!', fight: true },
        { label: 'Volver al salón de la baronesa', to: 'casona' },
        { label: 'Esperar a que caiga la última noche de vendimia', to: 'vispera', hint: 'Ya no habrá tiempo para más pistas.' },
      ],
    },

    // ------------------------------------------------------------------ la última noche
    vispera: {
      title: 'La última noche de vendimia',
      art: 'village',
      milestoneLevel: 3,
      shortRest: true,
      text: [
        'La última noche de vendimia cae sobre Valdecierzo sin una sola hoguera. Desde la Casona se ve el pueblo a oscuras y, en la plaza, un hormigueo de antorchas que se juntan.',
        { if: (f) => num(f, 'fear') >= 3, text: 'No son antorchas de fiesta. El pueblo ha contado a sus enfermos, ha mirado hacia la Casona y ha sacado las hoces. Suben por el camino gritando el nombre de la baronesa. Si nadie los detiene, esta noche arderá todo: la casa, la bodega y quien esté dentro.' },
        { if: (f) => num(f, 'fear') < 3, text: 'Son vecinos que velan a sus enfermos y miran hacia arriba, esperando. La hermana Leocadia ha subido con ellos hasta la verja y os busca con la mirada.' },
        { if: (f) => num(f, 'nights') >= 4, text: 'Habéis tardado. Bajo vuestros pies, la casa entera late despacio, como una barrica que fermenta. Lo que duerme en la bodega ya no duerme.' },
        'Detrás de la casa, la prensa vieja gotea en la oscuridad. Tomáis aliento por última vez.',
      ],
      checks: [
        { id: 'calm', label: 'Hablar al pueblo desde la verja (Persuasión CD 12)', skill: 'persuasion', dc: 12, dcMod: (f) => num(f, 'fear') - (f.barrelShut ? 2 : 0), hideIf: ['mobCalm', 'mobAlly'],
          success: { text: 'Les dices la verdad: que la deuda es vieja, que no la contrajeron ellos y que esta noche se acaba. Que quemar la casa solo quemará a los que aún pueden salvarse. Las hoces bajan. "Entonces acabadla", dice una mujer. "Nosotros velamos."', flags: ['mobCalm'], set: { fear: 0 }, xp: 75 },
          fail: { text: '"¡Palabras!", grita alguien. "¡Doscientos años de palabras!" Pero no avanzan todavía. Os miran las sombras, esperando ver qué hacéis con ellas.', inc: { fear: 1 } } },
        { id: 'rally', label: 'Ponerse al frente de la turba (Intimidación CD 13)', skill: 'intimidation', dc: 13, hideIf: ['mobCalm', 'mobAlly'],
          success: { text: 'Levantas el arma y el pueblo calla. "La casa no. Lo de abajo." Señalas la prensa. Cuarenta hoces giran hacia donde tú señalas.', flags: ['mobAlly'], xp: 75 },
          fail: { text: 'Gritas más que ellos, pero no por mucho. Alguien tira la primera piedra contra una ventana de la Casona.', inc: { fear: 1 } } },
        { id: 'proof', label: 'Leer en voz alta el cuaderno de Quirce', auto: true, requires: ['ledger'], hideIf: ['mobCalm', 'mobAlly'],
          success: { text: 'Lees los nombres, uno por uno, con su precio al lado. Los vecinos reconocen a sus hijos, a sus padres. El odio cambia de dirección como una veleta. "El médico", dice la hermana Leocadia, despacio. "Fue el médico." Nadie tocará la casa esta noche.', flags: ['mobCalm'], set: { fear: 0 }, xp: 100 } },
        { id: 'leocadia', label: 'Pedir la bendición de la hermana Leocadia', auto: true, hideIf: ['blessed'],
          success: { text: 'Leocadia os traza una señal de ceniza en la frente, a cada uno. "Que volváis con vuestra sombra", dice. "Todos."', flags: ['blessed'], tempHp: 5 } },
      ],
      exits: [
        { label: 'Bajar por la prensa vieja', to: 'lagar' },
        { label: 'Bajar por el túnel de los ermitaños', to: 'cripta', requires: ['knowsTunnel'], hint: 'Lleva directo a la cripta, sin pasar por la bodega.' },
      ],
    },

    lagar: {
      title: 'La prensa vieja',
      art: 'door',
      text: [
        'La prensa es un bloque de piedra del tamaño de un carro, con un husillo de roble negro. A su pie, una reja por la que gotea el mosto y una puerta de hierro, baja y ancha, con el escudo de los Morvel.',
        { if: (f) => f.cellarKey, text: 'La llave de la baronesa entra en la cerradura como si la estuviera esperando.' },
        { if: (f) => !f.cellarKey, text: 'La puerta está cerrada. La hiedra que la cubre no es hiedra: son zarcillos de las cepas viejas, gruesos como dedos, y se tensan cuando os acercáis.' },
        'Al otro lado se oye arrastrar de pies. Los que vendimiaron dormidos demasiadas noches siguen trabajando ahí abajo.',
      ],
      trap: { unless: 'cellarKey', save: 'dex', dc: 12, damage: '2d4', type: 'perforante', text: 'Los zarcillos de la puerta restallan como látigos cuando forzáis el paso.' },
      combat: {
        enemies: (n, f) => scale(n, [['zombie'], ['ghoul'], ['ghoul', 'zombie'], ['ghoul', 'zombie', 'zombie']]),
        names: { ghoul: 'Capataz de la vendimia' },
        auto: () => false,
        surprise: (f) => (f.lagarAmbush ? 'enemies' : null),
        adjust: (enemies, f, log) => { if (f.mobAlly) { for (const e of enemies) e.hp = Math.max(1, Math.ceil(e.hp * 0.6)); log('El pueblo irrumpe detrás de vosotros con hoces y antorchas: los vendimiadores muertos retroceden, malheridos.'); } },
        victory: { text: 'El capataz cae sobre los cestos. La escalera de la bodega queda libre, y de abajo sube un olor a vino tan espeso que marea.', milestoneXp: 200, items: { potion_healing: 1 } },
        peaceful: { text: 'Pasáis entre ellos sin que levanten la cabeza de sus cestos.' },
      },
      checks: [
        { id: 'pass', label: 'Pasar entre ellos con un cesto al hombro, como un vendimiador más (Engaño CD 13, prueba de grupo)', skill: 'deception', altSkill: 'stealth', dc: 13, mode: 'group', preCombat: true,
          success: { text: 'Cargáis un cesto cada uno, bajáis la cabeza y arrastráis los pies. Los muertos os hacen sitio en la fila.', peaceful: true, xp: 75 },
          fail: { text: 'Uno de vosotros respira demasiado fuerte. El capataz se detiene, olfatea y deja caer su cesto.', startCombat: true } },
        { id: 'ambush', label: 'Soltarles la prensa encima (Atletismo CD 13)', skill: 'athletics', dc: 13, preCombat: true,
          success: { text: 'Empujas el husillo con todo el cuerpo. La viga cae con un crujido de doscientos años y barre la fila de vendimiadores.', flags: ['lagarAmbush'], startCombat: true },
          fail: { text: 'El husillo no cede, pero chirría lo bastante para avisar a todo el sótano.', startCombat: true } },
      ],
      exits: [{ label: '¡Abrirse paso!', fight: true }, { label: 'Bajar a la bodega', to: 'bodega' }],
    },

    bodega: {
      title: 'La bodega de las lunas',
      art: 'dungeon',
      text: [
        'La bodega es una nave de piedra con doscientas barricas, una por vendimia, cada una marcada con una luna y un nombre del valle. Dentro no suena vino: suena algo que roza la madera, despacio, queriendo salir.',
        { if: (f) => !f.doctorDown, text: 'Al fondo, junto a la escalera de la cripta, maese Quirce Albano dispone sus instrumentos sobre una barrica con la calma de quien prepara una operación. "Llegan pronto", dice sin volverse. "Mejor. Necesitaré testigos de que el cargo cambió de manos legalmente."' },
        { if: (f) => f.doctorPlan, text: 'Sabéis lo que pretende: sentarse él bajo la prensa cuando el Primer Señor se levante a cobrar, y quedarse con el pacto.' },
      ],
      combat: {
        enemies: (n) => scale(n, [['cultist', 'cultist'], ['cult_fanatic'], ['cult_fanatic', 'cultist'], ['cult_fanatic', 'thug', 'cultist']]),
        names: { cult_fanatic: 'Maese Quirce Albano', cultist: 'Ayudante de Quirce', thug: 'Matón de maese Quirce' },
        auto: () => false,
        surprise: () => null,
        adjust: (enemies, f, log) => { if (f.menGone) { const out = enemies.filter((e) => e.type === 'thug' || e.type === 'cultist').slice(0, 1); for (const e of out) { e.hp = 1; } if (out.length) log('Uno de los hombres de Quirce ya tiene un pie en la escalera: no luchará de verdad.'); } },
        victory: { text: 'Quirce cae contra sus propios estantes. Los frascos que llevaba encima se rompen y un puñado de sombras sale disparado escaleras arriba, hacia el pueblo. "No lo entienden", jadea. "Alguien va a sentarse ahí abajo. Siempre hay alguien."', milestoneXp: 250, flags: ['doctorDown'], inc: { shadows: 1 }, gold: 15 },
        peaceful: { text: 'Quirce se quita los guantes, despacio, y los deja sobre la barrica. Sin sus hombres y sin su secreto no es más que un médico de pueblo con las manos frías. Se sienta en el suelo a esperar a los alguaciles.', flags: ['doctorDown'], xp: 100 },
      },
      checks: [
        { id: 'men', label: 'Convencer a sus hombres de que los ha engañado (Persuasión o Intimidación CD 13)', skill: 'persuasion', altSkill: 'intimidation', dc: 13, preCombat: true, hideIf: ['menGone'], dcMod: (f) => (f.ledger ? -3 : 0),
          success: { text: '"¿Os ha dicho de quién son los frascos que cargáis? ¿Habéis mirado vuestra sombra últimamente?" Los hombres de Quirce miran al suelo. Uno suelta el garrote.', flags: ['menGone'], xp: 50 },
          fail: { text: '"Paga bien", dice el más grande, y se encoge de hombros.', startCombat: true } },
        { id: 'yield', label: 'Convencer a Quirce de que se rinda (Persuasión CD 15)', skill: 'persuasion', dc: 15, preCombat: true, requires: ['doctorPlan', 'ledger'], dcMod: (f) => (f.menGone ? -3 : 0) + (f.doctorPlan && f.ledger ? -2 : 0),
          success: { text: 'Le lees sus propias notas. Luego, su propio cuaderno. Luego le explicas qué hará el pueblo con él si sube, y qué hará el Primer Señor si baja.', peaceful: true },
          fail: { text: '"He pasado veinte años estudiando esto", dice Quirce, y por primera vez levanta la voz. "No me lo va a quitar una cuadrilla de vagabundos."', startCombat: true } },
        { id: 'barrels', label: 'Abrir las barricas de las lunas (Atletismo CD 12)', skill: 'athletics', dc: 12, hideIf: ['barrelsOpen'],
          success: { text: 'Saltan los aros, una barrica tras otra. No sale vino. Sale una marea oscura y silenciosa que sube la escalera y se derrama por el valle, buscando a sus dueños. Arriba, muy lejos, alguien grita de alegría.', flags: ['barrelsOpen'], inc: { shadows: 3 }, xp: 100 },
          fail: { text: 'Los aros son de hierro viejo y os dejan las manos desolladas, pero ceden. Las sombras salen despacio, desconfiadas, y se van escalera arriba.', flags: ['barrelsOpen'], inc: { shadows: 2 }, damageFailed: { expr: '1d4', type: 'cortante' } } },
      ],
      shortRest: true,
      exits: [{ label: '¡Detener a Quirce!', fight: true }, { label: 'Bajar a la cripta, bajo la prensa', to: 'cripta' }],
    },

    // ------------------------------------------------------------------ el Primer Señor
    cripta: {
      title: 'El que no quiso ser vendimiado',
      art: 'crypt',
      text: [
        'Bajo la bodega hay una sala redonda excavada en la roca. Del techo cuelgan las raíces de todas las cepas viejas del valle, y todas bajan al mismo sitio: un sillón de piedra, justo debajo de la reja de la prensa, donde el mosto de doscientas vendimias ha goteado sobre la misma figura sentada.',
        'Hernán Morvel abre los ojos. Tiene la cara del retrato y la piel del color del orujo. "Vendimia", dice, con una voz que se oye por dentro. "Vengo a cobrar. ¿Quién paga este año?"',
        { if: (f) => num(f, 'nights') >= 4, text: 'Se pone en pie sin esfuerzo. Habéis tardado demasiado: se ha bebido el valle entero mientras buscabais pistas, y está más fuerte que en cien años.' },
        { if: (f) => f.isauraTruth, text: 'Detrás de vosotros, apoyada en su bastón, ha bajado la baronesa Isaura. "Pago yo, abuelo", dice. "Como siempre. Pero esta gente tiene algo que decirte primero."' },
        { if: (f) => !f.doctorDown, text: 'Por la escalera llegan pasos apresurados: Quirce no ha renunciado a su sillón.' },
      ],
      combat: {
        enemies: (n, f) => {
          const base = scale(n, [['specter'], ['ghast'], ['wight'], ['wight', 'shadow']]);
          return num(f, 'nights') >= 4 ? [...base, 'skeleton'] : base;
        },
        names: { wight: 'Hernán Morvel, el Primer Señor', ghast: 'Hernán Morvel, el Primer Señor', specter: 'Hernán Morvel, el Primer Señor' },
        auto: () => false,
        surprise: () => null,
        adjust: (enemies, f, log) => {
          let k = 1;
          if (f.named) k -= 0.2;
          if (f.rootsBurnt) k -= 0.15;
          if (num(f, 'shadows') >= 4) k -= 0.15;
          if (k < 1) { for (const e of enemies) { e.hp = Math.max(1, Math.ceil(e.hp * k)); e.maxHp = e.hp; } log('El Primer Señor se tambalea: le habéis quitado parte de lo que lo sostenía.'); }
        },
        victory: {
          text: 'El Primer Señor cae de rodillas ante su propio sillón. "Doscientas vendimias", dice, asombrado, mirándose las manos que se le deshacen en posos. "Y al final también me cortan a mí." Las raíces del techo se sueltan una a una. Arriba, en todo el valle, las cepas viejas se secan de golpe.',
          milestoneXp: 300, flags: ['lordDown'], goto: 'desenlace',
        },
      },
      checks: [
        { id: 'name', label: 'Llamarlo por su nombre entero y recordarle su deuda', auto: true, requires: ['knowsName'], preCombat: true, hideIf: ['named'],
          success: { text: '"Hernán Morvel. Plantaste la viña y no quisiste ser vendimiado. Doscientos vecinos pagaron por ti." El Primer Señor se encoge en el sillón como si le hubierais leído una sentencia. Por un instante parece lo que es: un viejo con miedo.', flags: ['named'], xp: 75 } },
        { id: 'roots', label: 'Rociar las raíces con agua bendita (gasta un frasco)', auto: true, needsItem: 'holy_water', preCombat: true, hideIf: ['rootsBurnt'],
          success: { text: 'El agua chisporrotea sobre las raíces, que se retuercen y sueltan su presa. El goteo de la prensa se interrumpe por primera vez en dos siglos.', flags: ['rootsBurnt'], xp: 50 } },
        { id: 'renew', label: 'Dejar que la baronesa renueve el pacto una última vez', auto: true, requires: ['isauraTruth'], preCombat: true,
          success: { text: 'Isaura se adelanta y pone la mano sobre la de su antepasado. "Todo lo que me queda, abuelo. A cambio de un año más de paz y de las sombras de este otoño." El Primer Señor sonríe con la sonrisa del retrato. "Trato."', goto: 'fin_renovado' } },
        { id: 'throne', label: 'Aceptar el sillón: que uno de vosotros sea el nuevo señor del pacto', auto: true, preCombat: true,
          success: { text: '"¿Y si pagara otro?", dice uno de vosotros. "¿Y si el cargo cambiara de manos?" El Primer Señor os mira largamente. Luego, con un suspiro de alivio que dura doscientos años, se levanta y os cede el sitio.', goto: 'fin_pacto' } },
      ],
      exits: [{ label: '¡Que se pague a sí mismo! (atacar)', fight: true }],
    },

    desenlace: {
      title: 'El amanecer',
      redirect: (f) => (num(f, 'fear') >= 3 && !f.mobCalm && !f.mobAlly ? 'fin_ceniza' : 'fin_amanecer'),
      text: [],
      exits: [],
    },

    // ------------------------------------------------------------------ finales
    fin_amanecer: {
      title: 'Epílogo: la primera helada',
      art: 'village',
      ending: { title: 'La primera helada', tone: 'good' },
      text: [
        'Salís de la bodega con la primera luz. Sobre las viñas de Valdecierzo hay una capa blanca y fina que cruje bajo las botas: la primera helada en doscientos años. Los vecinos la tocan con la punta de los dedos, sin saber si asustarse.',
        { if: (f) => num(f, 'shadows') >= 4, text: 'En la plaza, Nela persigue su propia sombra alrededor de la fuente, muerta de risa. Casi todos los enfermos se han levantado esta mañana con hambre.' },
        { if: (f) => num(f, 'shadows') < 4, text: 'No todas las sombras han vuelto. Algunos enfermos tardarán meses en recuperar el color, y dos o tres no lo recuperarán. Pero ya nadie más enfermará.' },
        { if: (f) => f.isauraTruth, text: 'La baronesa Isaura manda arrancar las cepas viejas y abre la Casona como hospital. Le quedan pocos años, y todos son suyos. "Es más de lo que tuvo ningún Morvel", dice.' },
        { if: (f) => f.doctorDown && f.ledger, text: 'Maese Quirce sale del valle con grilletes, camino del tribunal del condado, con su cuaderno como prueba.' },
        { if: (f) => f.mobAlly, text: 'Los vecinos que bajaron con vosotros a la prensa lo contarán toda la vida. Cada año exageran un poco más el tamaño de las hoces.' },
        'La hermana Leocadia os entrega el cepillo de la capilla y una botella sin etiqueta. "Vino nuevo", dice. "Del malo. Del nuestro."',
        'FIN. El valle ya no tiene suerte. Tiene futuro.',
      ],
      reward: { gold: 60 },
      end: true,
      exits: [],
    },
    fin_renovado: {
      title: 'Epílogo: un año más',
      art: 'manor',
      ending: { title: 'Un año más', tone: 'mixed' },
      text: [
        'Cuando subís de la cripta, la baronesa Isaura no sube con vosotros. La encontráis al amanecer en su salón, sentada bajo el retrato del primer barón, con el pelo blanco muy bien peinado y una copa vacía en la mano.',
        'Las sombras de este otoño han vuelto a sus dueños. No helará este invierno. El vino será excelente.',
        'Pero el sillón de piedra sigue ocupado, y dentro de un año volverá la vendimia, y ya no quedará ninguna Morvel dispuesta a pagar en lugar de los demás.',
        { if: (f) => !f.doctorDown, text: 'Y maese Quirce sigue en el valle, con sus guantes y sus frascos, contando los meses.' },
        'La hermana Leocadia os paga en silencio. "Un año", dice. "Volved antes de que se acabe. Os lo ruego."',
        'FIN. Habéis comprado tiempo. Alguien lo ha pagado.',
      ],
      reward: { gold: 40 },
      end: true,
      exits: [],
    },
    fin_ceniza: {
      title: 'Epílogo: ceniza de sarmiento',
      art: 'ruins',
      ending: { title: 'Ceniza de sarmiento', tone: 'mixed' },
      text: [
        'Salís de la bodega tosiendo. No es niebla: es humo. Mientras luchabais abajo, el pueblo ha subido con sus antorchas y la Casona Morvel arde por los cuatro costados.',
        'El Primer Señor ha caído y el pacto con él. Pero nadie detuvo a la turba, y el miedo no distingue: han ardido los retratos, la consulta, los enfermos que aún dormían en el ala este.',
        { if: (f) => f.isauraTruth, text: 'A la baronesa Isaura, que pagó sola el diezmo durante veinte años, no la dejaron explicarse.' },
        { if: (f) => !f.isauraTruth, text: 'De la baronesa no se vuelve a saber. En el pueblo dirán durante generaciones que era ella quien robaba las sombras, y nadie quedará para desmentirlo.' },
        'Las sombras vuelven a sus dueños con el alba, y los vecinos de Valdecierzo se miran las manos tiznadas sin decir nada.',
        'FIN. El valle es libre. Tardará en perdonarse.',
      ],
      reward: { gold: 30 },
      end: true,
      exits: [],
    },
    fin_pacto: {
      title: 'Epílogo: quien paga este año',
      art: 'crypt',
      ending: { title: 'Quien paga este año', tone: 'bad' },
      text: [
        'El sillón de piedra es más cómodo de lo que parece. Las raíces bajan del techo y os tocan la frente, una por una, aprendiéndose una cara nueva.',
        'Arriba, las sombras de este otoño vuelven a sus dueños: es vuestro primer acto como señores del pacto, y os parece generoso. El valle os lo agradece con una fiesta. Nunca helará. El vino será excelente.',
        'Solo al cabo de unas semanas notáis que tenéis sed. Que contáis a los vecinos sin querer, como se cuentan las cubas. Que la próxima vendimia está lejos y, aun así, ya sabéis exactamente a quién le tocará pagar.',
        'En la galería de la Casona, alguien cuelga un retrato nuevo. No lleva fecha.',
        'FIN. Siempre hay alguien en el sillón.',
      ],
      end: true,
      exits: [],
    },
  },
};
