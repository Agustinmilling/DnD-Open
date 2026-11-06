// Aventura original: "El Sello de Ámbar" (para 1-4 personajes de nivel 1 a 3).
// Historia y personajes originales. Monstruos y reglas: SRD 5.2.1.
//
// Ramificaciones principales:
//   - Intriga urbana con tres bandos: Lady Isolda (la heredera), el canciller Bastián Dore y el gremio de ladrones de la Linterna.
//   - Contador `evidence` (pruebas contra el canciller): rebaja la dificultad de desenmascararlo ante el consejo.
//   - Contador `suspicion` (lo alerta que está el canciller): endurece el final.
//   - El Sello de Ámbar puede conseguirse por la fuerza, por la ley, robándolo o con un trato; y entregarse a la heredera,
//     al gremio o romperse ante el consejo. Si os derrotan en la guarida o en la mansión, acabáis en las mazmorras.
//   - Cuatro finales.

const scale = (n, table) => table[Math.max(1, Math.min(4, n)) - 1];
const num = (f, k) => Number(f[k]) || 0;
const weaken = (type, factor) => (enemies) => { for (const e of enemies) if (e.type === type && enemies.length <= 2) { e.hp = Math.ceil(e.hp * factor); e.maxHp = e.hp; } };

module.exports = {
  id: 'sello',
  title: 'El Sello de Ámbar',
  summary: 'El duque de Velacruz ha muerto y, en mitad de su funeral, alguien roba el sello que decide quién gobernará la ciudad. Tres bandos lo quieren. Vosotros decidís quién lo tendrá.',
  art: 'city',
  length: '2-3 horas',
  tags: ['Ciudad', 'Intriga', 'Golpe', 'Facciones'],
  endingCount: 4,
  start: 'funeral',
  startGold: 15,
  startFlags: { evidence: 0, suspicion: 0 },
  journal: {
    sawThief: 'Una figura con capa gris huyó por los tejados con el sello.',
    clueSmoke: 'El humo del funeral era alquímico: solo lo prepara el alquimista de la cancillería.',
    clueKey: 'El estuche del sello se abrió con su llave, no se forzó. Fue alguien de dentro.',
    suspectBastian: 'El canciller Bastián Dore no se sorprendió con el robo. Lo esperaba.',
    sideIsolda: 'Trabajáis para Lady Isolda Marbrand, la heredera. Tenéis su salvoconducto.',
    valkAlly: 'La capitana Tereza Valk os apoyará ante el consejo si le dais pruebas.',
    knowsLantern: 'El ladrón pertenece a la Linterna, el gremio de ladrones de Velacruz.',
    fakeThugs: 'Los matones que llevan insignias de la Linterna cobran del canciller: quiere culpar al gremio.',
    piaFriend: 'Pía, la vendedora del mercado bajo, os debe un favor.',
    knowsHideout: 'La guarida de la Linterna está bajo el viejo acueducto, por las cloacas.',
    rinaDeal: 'Trato con Rina Corvalán: el libro de cuentas del canciller a cambio del sello.',
    knowsLedger: 'El canciller guarda un libro de cuentas secreto en su estudio.',
    ledger: 'Tenéis el libro de cuentas del canciller: pagos al gremio, a matones y a mercenarios.',
    letters: 'Cartas del canciller a una compañía de mercenarios extranjera.',
    seal: 'Tenéis el Sello de Ámbar.',
    rinaEnemy: 'Rina Corvalán y la Linterna os la tienen jurada.',
    captured: 'El canciller os encerró en las mazmorras… y escapasteis.',
    heardConfession: 'En las mazmorras, el canciller se jactó de su plan delante de un guardia.',
    greedy: 'Os llevasteis el oro del canciller.',
    evidence: (f) => `Pruebas contra el canciller: ${'📜'.repeat(Math.max(0, Math.min(8, num(f, 'evidence'))))} (${num(f, 'evidence')})`,
    suspicion: (f) => `Sospecha del canciller: ${'👁️'.repeat(Math.min(5, num(f, 'suspicion')))}`,
  },
  scenes: {
    // ------------------------------------------------------------------ el funeral
    funeral: {
      title: 'El funeral del duque',
      art: 'city',
      text: [
        'Las campanas de Velacruz doblan por el duque Aurel. En la plaza del Ciprés, bajo un cielo de plomo, la nobleza viste de negro y el pueblo se apiña detrás de las vallas. Sobre el ataúd descansa el Sello de Ámbar: quien lo presente ante el consejo dentro de tres días será reconocido como el nuevo señor de la ciudad.',
        'Junto al ataúd están Lady Isolda Marbrand, sobrina y heredera del duque, pálida y muy erguida; y el canciller Bastián Dore, un hombre suave de manos blancas que gobierna la ciudad mientras no haya duque.',
        'De repente, varias botellas estallan entre la multitud. Un humo violeta lo cubre todo. Gritos, empujones, toses. Cuando el humo se disipa, el cojín del ataúd está vacío.',
      ],
      checks: [
        { id: 'spot', label: 'Buscar al ladrón entre el humo (Percepción CD 12)', skill: 'perception', dc: 12,
          success: { text: 'Ves una figura con capa gris trepar por un canalón y desaparecer en los tejados del barrio de los Tintoreros. ¡Aún podéis alcanzarla!', flags: ['sawThief'], xp: 25 },
          fail: { text: 'El humo os pica en los ojos. Cuando se disipa, solo veis caras asustadas.' } },
        { id: 'smoke', label: 'Analizar los restos de las botellas (Conocimiento arcano o Investigación CD 12)', skill: 'arcana', altSkill: 'investigation', dc: 12,
          success: { text: 'Polvo de lirio violeta y sal de nitro: humo alquímico de calidad. En Velacruz solo lo prepara maese Orrin, el alquimista… de la cancillería.', flags: ['clueSmoke'], inc: { evidence: 1 }, xp: 25 },
          fail: { text: 'Cristales rotos y un olor dulzón. Nada más.' } },
        { id: 'case', label: 'Examinar el estuche del sello (Investigación CD 13)', skill: 'investigation', dc: 13,
          success: { text: 'El estuche no está forzado: lo abrieron con su llave. Solo hay dos llaves, y una cuelga del cuello del canciller.', flags: ['clueKey'], inc: { evidence: 1 }, xp: 25 },
          fail: { text: 'Un guardia os aparta del ataúd antes de que podáis mirar bien.' } },
        { id: 'insight', label: 'Observar al canciller (Perspicacia CD 14)', skill: 'insight', dc: 14,
          success: { text: 'Todos se sobresaltaron con las explosiones. Todos menos Bastián Dore, que se limitó a sacar un pañuelo y taparse la nariz. Como quien sabe lo que va a pasar.', flags: ['suspectBastian'], xp: 25 },
          fail: { text: 'El canciller parece tan consternado como los demás.' } },
      ],
      exits: [
        { label: 'Perseguir al ladrón por los tejados', to: 'tejados', requires: ['sawThief'] },
        { label: 'Acudir a la llamada de Lady Isolda', to: 'palacio' },
        { label: 'Buscar respuestas en el mercado bajo', to: 'mercado' },
      ],
    },

    // ------------------------------------------------------------------ persecución
    tejados: {
      title: 'Persecución por los tejados',
      art: 'rooftops',
      text: [
        'Saltáis de tejado en tejado entre chimeneas, sábanas tendidas y palomas indignadas. La capa gris va siempre un salto por delante. Abajo, en las calles estrechas, nadie mira hacia arriba.',
      ],
      combat: {
        enemies: (n) => scale(n, [['bandit'], ['spy'], ['spy', 'bandit'], ['spy', 'bandit', 'bandit']]),
        names: { spy: 'El corredor gris', bandit: 'Ratero de la Linterna' },
        auto: () => false,
        surprise: () => null,
        victory: {
          text: 'El corredor queda tendido sobre las tejas. No lleva el sello (ya lo ha pasado a otras manos), pero sí una insignia con forma de farol y una nota: "Entrega en la guarida. El cliente pagará el resto cuando el sello esté a salvo. —B." El lacre de la nota es verde: el de la cancillería.',
          milestoneXp: 200, flags: ['knowsLantern', 'courierNote'], inc: { evidence: 1 }, gold: 10,
        },
        peaceful: { text: (f) => (f.courierTalk ? 'El corredor se escabulle por una claraboya, aliviado de seguir entero.' : 'La capa gris salta a un tejado imposible y desaparece. En la teja donde se apoyó queda algo: una insignia de latón con forma de farol.') },
      },
      checks: [
        { id: 'chase', label: 'Darle alcance (Acrobacias o Atletismo CD 13, prueba de grupo)', skill: 'acrobatics', altSkill: 'athletics', dc: 13, mode: 'group', preCombat: true, hideIf: ['cornered'],
          success: { text: 'Le cortáis el paso junto a un campanario. El corredor, acorralado, saca dos cuchillos. "No es nada personal. Me pagan por llegar, no por pelear."', flags: ['cornered'], xp: 25 },
          fail: { text: 'Un tejado cede bajo vuestros pies y os quedáis colgando de un canalón. Cuando subís, el corredor se ha esfumado.', flags: ['knowsLantern'], damageFailed: { expr: '1d4', type: 'contundente' }, peaceful: true } },
        { id: 'talk', label: 'Hacerle hablar sin pelear (Intimidación o Persuasión CD 13)', skill: 'intimidation', altSkill: 'persuasion', dc: 13, preCombat: true, requires: ['cornered'],
          success: { text: '"Vale, vale. Trabajo para la Linterna. El encargo vino de arriba, de un cliente rico que paga con lacre verde. El sello está en la guarida, bajo el viejo acueducto." Le dejáis marchar.', flags: ['knowsLantern', 'knowsHideout', 'courierTalk'], inc: { evidence: 1 }, xp: 75, peaceful: true },
          fail: { text: 'El corredor se ríe y ataca.', startCombat: true } },
      ],
      exits: [
        { label: '¡Cortarle el paso y pelear!', fight: true },
        { label: 'Buscar a la Linterna en el mercado bajo', to: 'mercado' },
        { label: 'Ir al palacio a ver a Lady Isolda', to: 'palacio', hideIf: ['visitedPalacio'] },
      ],
    },

    // ------------------------------------------------------------------ el palacio
    palacio: {
      title: 'Las habitaciones de Lady Isolda',
      art: 'manor',
      onEnter: { flags: ['visitedPalacio'] },
      text: [
        'Lady Isolda os recibe en una biblioteca helada donde nadie ha encendido la chimenea. "Si el sello no aparece en tres días, el consejo nombrará regente al canciller Dore. Para siempre." Os mira con unos ojos grises que no parpadean. "No confío en la guardia. Confío en desconocidos que no le deben nada a nadie."',
        'En la puerta, con los brazos cruzados, la capitana Tereza Valk, de la guardia ducal, os observa como quien evalúa caballos.',
      ],
      checks: [
        { id: 'accept', label: 'Ponerse al servicio de Lady Isolda', auto: true, hideIf: ['sideIsolda'],
          success: { text: 'Isolda os entrega un salvoconducto con su firma y una bolsa de monedas. "Esto os abrirá puertas. No todas."', flags: ['sideIsolda', 'writ'], gold: 10, xp: 25 } },
        { id: 'readIsolda', label: 'Tantear a Isolda (Perspicacia CD 12)', skill: 'insight', dc: 12,
          success: { text: 'Isolda es orgullosa y fría, pero no miente. Teme a Dore. Y algo más: no está segura de querer gobernar. "Mi tío decía que la ciudad necesita un duque. Yo no estoy tan segura."', flags: ['isoldaDoubts'], xp: 25 },
          fail: { text: 'Isolda es un muro de hielo. Imposible saber qué piensa.' } },
        { id: 'archives', label: 'Revisar los archivos de la cancillería (Historia o Investigación CD 13)', skill: 'history', altSkill: 'investigation', dc: 13,
          success: { text: 'Entre facturas de velas y salarios, encontráis pagos mensuales a "L." por "servicios de iluminación". Un escribano os cuenta que el canciller guarda las cuentas de verdad en un libro privado, en el estudio de su mansión.', flags: ['clueArchive', 'knowsLedger'], inc: { evidence: 1 }, xp: 50 },
          fail: { text: 'Montañas de papel, y ninguno dice nada interesante.' } },
        { id: 'spies', label: 'Pedir a Isolda que sus espías busquen la guarida de la Linterna (lento)', auto: true, hideIf: ['knowsHideout'],
          success: { text: 'Isolda manda a sus criados de confianza. Al anochecer vuelven con una dirección: bajo el viejo acueducto, por las cloacas. Pero tantas preguntas no han pasado desapercibidas.', flags: ['knowsHideout', 'knowsLantern'], inc: { suspicion: 1 } } },
        { id: 'valk', label: 'Ganarse a la capitana Valk (Persuasión CD 13)', skill: 'persuasion', dc: 13, hideIf: ['valkAlly'], advIf: ['suspectBastian', 'clueKey'],
          success: { text: '"Yo también he visto cosas raras en la cancillería", admite Valk. "Traedme pruebas de verdad y mis guardias estarán de vuestra parte cuando llegue el consejo."', flags: ['valkAlly'], xp: 50 },
          fail: { text: '"Hablar es barato", dice Valk, y se va a hacer la ronda.' } },
      ],
      exits: [
        { label: 'Buscar a la Linterna en el mercado bajo', to: 'mercado', hideIf: ['visitedMercado'] },
        { label: 'Bajar a las cloacas hacia la guarida de la Linterna', to: 'cloacas', requires: ['knowsHideout'] },
        { label: 'Infiltrarse en la mansión del canciller', to: 'mansion', requires: ['knowsLedger'], hint: 'Si os pillan, el canciller sabrá que vais a por él.' },
      ],
    },

    // ------------------------------------------------------------------ el mercado bajo
    mercado: {
      title: 'El mercado bajo',
      art: 'market',
      onEnter: { flags: ['visitedMercado'] },
      text: [
        'El mercado bajo de Velacruz es un laberinto de toldos, pescado, especias y carteristas. En un puesto de cintas de colores, una muchacha llamada Pía discute con tres tipos grandes que llevan una insignia con forma de farol: la Linterna.',
        '"Mi madre ya pagó este mes", dice Pía con la voz temblando. Uno de los matones vuelca su mesa de una patada.',
      ],
      combat: {
        enemies: (n) => scale(n, [['bandit', 'bandit'], ['thug', 'bandit'], ['thug', 'bandit', 'bandit'], ['thug', 'thug', 'bandit']]),
        names: { thug: 'Matón con farol' },
        auto: () => false,
        surprise: () => null,
        victory: {
          text: 'Los matones huyen cojeando. A uno se le cae la bolsa: dentro hay monedas recién acuñadas con el sello de la cancillería. Esos no son de la Linterna. Alguien les paga para que lo parezcan. Pía os abraza y luego, avergonzada, os da las gracias.',
          milestoneXp: 200, flags: ['piaFriend', 'fakeThugs'], inc: { evidence: 1 }, gold: 8,
        },
        peaceful: { text: (f) => (f.ignoredPia ? 'Seguís de largo. A vuestra espalda oís el ruido de cintas pisoteadas y un sollozo.' : 'Los matones se marchan refunfuñando.') },
      },
      checks: [
        { id: 'ignore', label: 'No meterse en líos ajenos', auto: true, preCombat: true,
          success: { text: 'No es asunto vuestro.', flags: ['ignoredPia'], peaceful: true } },
        { id: 'scare', label: 'Ahuyentarlos sin pelea (Intimidación CD 13)', skill: 'intimidation', dc: 13, preCombat: true,
          success: { text: 'Les explicas con mucha calma lo que les pasará si no se van. Se van. Pía os mira con los ojos como platos.', flags: ['piaFriend'], xp: 50, peaceful: true },
          fail: { text: '"¿Y tú quién eres, la abuela de la guardia?" Los matones se crujen los nudillos.', startCombat: true } },
        { id: 'pay', label: 'Pagar la "deuda" de Pía (3 po por persona)', auto: true, cost: 3, preCombat: true,
          success: { text: 'Los matones cogen el dinero y se van riendo. Pía no sabe cómo agradecéroslo.', flags: ['piaFriend'], peaceful: true } },
        { id: 'pia', label: 'Preguntar a Pía por la Linterna', auto: true, requires: ['piaFriend'], hideIf: ['knowsHideout'],
          success: { text: '"Esos no eran de la Linterna de verdad. Los de verdad no cobran a los de abajo." Pía baja la voz. "Su guarida está bajo el viejo acueducto. Se entra por las cloacas, por la reja del pozo seco. Decid que vais de parte de Pía."', flags: ['knowsHideout', 'piaPass', 'knowsLantern'], xp: 25 } },
        { id: 'streets', label: 'Preguntar por ahí (Engaño o Investigación CD 14)', skill: 'deception', altSkill: 'investigation', dc: 14, hideIf: ['knowsHideout'],
          success: { text: 'Un trilero, a cambio de que no le arruinéis el negocio, os cuenta que la Linterna se esconde bajo el viejo acueducto. Se baja por las cloacas.', flags: ['knowsHideout', 'knowsLantern'], xp: 25 },
          fail: { text: 'Hacéis demasiadas preguntas. Alguien corre a contárselo a quien no debería.', inc: { suspicion: 1 } } },
        { id: 'follow', label: 'Seguir a un carterista hasta su escondite (lento y llamativo)', auto: true, hideIf: ['knowsHideout'],
          success: { text: 'Seguís a un crío ratero durante horas, hasta que se cuela por una reja de las cloacas junto al viejo acueducto. Por el camino, demasiada gente os ha visto.', flags: ['knowsHideout', 'knowsLantern'], inc: { suspicion: 1 } } },
      ],
      exits: [
        { label: '¡Defender a Pía!', fight: true },
        { label: 'Bajar a las cloacas hacia la guarida de la Linterna', to: 'cloacas', requires: ['knowsHideout'] },
        { label: 'Ir al palacio a ver a Lady Isolda', to: 'palacio', hideIf: ['visitedPalacio'] },
      ],
    },

    // ------------------------------------------------------------------ las cloacas
    cloacas: {
      title: 'Las cloacas del acueducto',
      art: 'sewer',
      text: [
        'Bajo Velacruz corre otra ciudad: túneles de ladrillo, agua negra hasta los tobillos y un olor que se pega a la ropa durante días. Las paredes están marcadas con pequeños faroles de tiza que señalan el camino.',
        'Algo se mueve en la oscuridad. Muchos algos. Y en el techo, una telaraña del tamaño de una vela de barco.',
      ],
      combat: {
        enemies: (n) => scale(n, [['giant_rat', 'giant_rat'], ['giant_rat', 'giant_rat', 'giant_rat'], ['giant_spider', 'giant_rat'], ['giant_spider', 'giant_rat', 'giant_rat']]),
        auto: (f) => !f.piaPass,
        surprise: () => null,
        victory: { text: 'Entre los restos de la telaraña cuelga el cadáver momificado de un ladrón con una bolsa y una poción intacta. Al fondo, una puerta con un farol pintado.', milestoneXp: 200, gold: 6, items: { potion_healing: 1, antitoxin: 1 } },
        peaceful: { text: 'Un muchacho de la Linterna sale de una tubería: "¿Vais de parte de Pía? Seguidme, que por aquí hay bichos." Os guía por un atajo.' },
      },
      checks: [
        { id: 'guide', label: 'Silbar la señal de Pía', auto: true, preCombat: true, requires: ['piaPass'],
          success: { text: 'Silbáis tres notas, como os enseñó Pía.', flags: ['rinaKnowsYou'], peaceful: true, xp: 25 } },
        { id: 'torch', label: 'Abrirse paso con fuego (gasta una antorcha)', auto: true, preCombat: true, needsItem: 'torch',
          success: { text: 'Las ratas huyen chillando del fuego, y la araña se encoge en su tela.', peaceful: true } },
      ],
      shortRest: true,
      exits: [
        { label: '¡A por ellos!', fight: true },
        { label: 'Llamar a la puerta del farol', to: 'guarida' },
      ],
    },

    // ------------------------------------------------------------------ la guarida de la Linterna
    guarida: {
      title: 'La guarida de la Linterna',
      art: 'hideout',
      text: [
        'La guarida es una antigua cisterna llena de alfombras robadas, lámparas de todos los estilos y ladrones jugando a las cartas. En un trono hecho con un sillón de obispo se sienta Rina Corvalán, la jefa de la Linterna: pequeña, pelirroja, con una sonrisa de gato.',
        'Sobre una mesa, a su lado, brilla un cofre abierto. Dentro, sobre terciopelo, el Sello de Ámbar.',
        '"Bienvenidos a mi casa", dice Rina. "Supongo que venís por eso. Todo el mundo viene por eso."',
        { if: (f) => f.rinaKnowsYou, text: 'Rina os observa con curiosidad: "Ya me han hablado de vosotros."' },
      ],
      combat: {
        enemies: (n) => scale(n, [['bandit', 'bandit'], ['spy', 'bandit'], ['spy', 'bandit', 'bandit'], ['spy', 'thug', 'bandit', 'bandit']]),
        names: { spy: 'Rina Corvalán' },
        auto: () => false,
        surprise: () => null,
        victory: {
          text: 'Rina, herida, salta a un canal y desaparece en la oscuridad. Sus ladrones se dispersan. El Sello de Ámbar es vuestro. Entre los papeles de Rina hay una carta del canciller: "El libro de cuentas sigue en mi estudio. Nadie lo verá nunca."',
          milestoneXp: 300, flags: ['seal', 'rinaEnemy', 'knowsLedger'], gold: 20, items: { potion_healing: 1 },
        },
        peaceful: { text: (f) => (f.rinaDeal ? 'Rina escupe en la palma de la mano y os la tiende. Trato hecho.' : 'Los ladrones se apartan para dejaros pasar.') },
        defeat: { to: 'mazmorra', text: 'Os despertáis cuando os arrastran por la calle. Rina os ha vendido a la guardia del canciller: "Nada personal. Bastián paga mejor."', flags: ['captured'] },
      },
      checks: [
        { id: 'listen', label: 'Escuchar lo que Rina tiene que contar (Persuasión CD 12)', skill: 'persuasion', dc: 12, preCombat: true, hideIf: ['rinaTalk'], advIf: ['fakeThugs', 'courierTalk', 'piaFriend'],
          success: { text: '"El canciller nos encargó el robo. Pagaba bien: el sello desaparece, Isolda pierde su derecho y él es regente para siempre. Pero luego empezó a mandar matones con faroles a robar a los pobres en nuestro nombre. Quiere que la guardia nos aplaste y que nadie pueda contar la verdad." Rina acaricia el sello. "Así que me lo quedo. Es mi seguro. Salvo que me traigáis algo mejor: el libro de cuentas del canciller. Con eso, la Linterna no tendrá que temer a nadie."', flags: ['rinaTalk', 'knowsLedger', 'suspectBastian'], inc: { evidence: 1 }, xp: 50 },
          fail: { text: '"No me gusta vuestra cara", dice Rina, y chasquea los dedos.', startCombat: true } },
        { id: 'deal', label: 'Aceptar el trato: el libro de cuentas a cambio del sello', auto: true, preCombat: true, requires: ['rinaTalk'],
          success: { text: '"Mañana por la noche, en la víspera del consejo. Traed el libro y el sello es vuestro."', flags: ['rinaDeal'], xp: 25, peaceful: true, journal: 'Trato con Rina: el libro a cambio del sello.' } },
        { id: 'law', label: 'Exigir el sello en nombre de Lady Isolda (Intimidación CD 15, necesitáis el salvoconducto)', skill: 'intimidation', dc: 15, preCombat: true, requires: ['writ'], advIf: ['valkAlly'],
          success: { text: 'Desplegáis el salvoconducto con la firma de Isolda y le explicáis a Rina lo que hará la guardia con su guarida. Rina os lanza el sello con desprecio. "Tomad vuestro juguete. Pero esto no se olvida."', flags: ['seal', 'rinaEnemy'], xp: 75, peaceful: true },
          fail: { text: 'Rina se ríe. "¿Un papel? Aquí abajo los papeles sirven para encender lámparas."', startCombat: true } },
        { id: 'steal', label: 'Robar el sello del cofre mientras habláis (Juego de manos CD 16)', skill: 'sleight', dc: 16, preCombat: true, requires: ['rinaTalk'], advIfItem: 'thieves_tools',
          success: { text: 'Mientras Rina habla, tus dedos cambian el sello por una piedra envuelta en terciopelo. Nadie se da cuenta. Os despedís con mucha educación… y os vais muy deprisa.', flags: ['seal', 'stoleSeal', 'knowsLedger'], xp: 100, peaceful: true },
          fail: { text: '"¿Pero qué…?" Rina te agarra la muñeca. "¡A un ladrón no se le roba en su casa!"', startCombat: true } },
      ],
      exits: [
        { label: '¡Quitarle el sello por la fuerza!', fight: true },
        { label: 'Infiltrarse en la mansión del canciller', to: 'mansion', requires: ['knowsLedger'], hint: 'El libro de cuentas: la prueba definitiva.' },
        { label: 'Volver a la superficie con el sello', to: 'vispera', requires: ['seal'] },
      ],
    },

    // ------------------------------------------------------------------ la mansión
    mansion: {
      title: 'La mansión del canciller',
      art: 'manor',
      text: [
        'La mansión de Bastián Dore se alza tras un muro alto cubierto de hiedra. Esta noche hay recepción: carruajes en la puerta, música de laúdes y guardias con librea verde en cada esquina.',
        { if: (f) => num(f, 'suspicion') >= 2, text: 'Hay más guardias de lo normal. El canciller sabe que alguien va a por él.' },
        'Hay tres maneras de entrar: por la puerta principal entre los invitados, saltando el muro del jardín o por la cocina, donde trabajan los criados.',
      ],
      combat: {
        enemies: (n, f) => scale(n, [['guard', 'guard'], ['guard', 'guard', 'wolf'], ['guard', 'guard', 'guard', 'wolf'], ['guard', 'guard', 'guard', 'wolf', 'wolf']]).concat(num(f, 'suspicion') >= 2 ? ['guard'] : []),
        names: { wolf: 'Mastín del canciller' },
        auto: () => false,
        surprise: () => null,
        victory: { text: 'Los guardias del jardín no volverán a levantarse esta noche, pero el ruido ha llegado a la casa. Hay que darse prisa.', milestoneXp: 200, inc: { suspicion: 1 } },
        peaceful: { text: 'Estáis dentro. Por el pasillo de servicio se llega al estudio del canciller.' },
        defeat: { to: 'mazmorra', text: 'Os arrastran inconscientes hasta los sótanos del palacio de justicia.', flags: ['captured'] },
      },
      checks: [
        { id: 'guests', label: 'Entrar como invitados (Engaño CD 13; ventaja con útiles para disfrazarse)', skill: 'deception', dc: 13, preCombat: true, advIfItem: 'disguise_kit', dcMod: (f) => num(f, 'suspicion'),
          success: { text: 'Con una reverencia y un nombre inventado, cruzáis la puerta principal. Un criado os ofrece vino.', xp: 50, peaceful: true },
          fail: { text: '"Ese nombre no está en la lista." El mayordomo hace una seña a los guardias.', inc: { suspicion: 1 }, startCombat: true } },
        { id: 'wall', label: 'Saltar el muro del jardín (Atletismo CD 12, prueba de grupo; ventaja con cuerda)', skill: 'athletics', dc: 12, mode: 'group', preCombat: true, advIfItem: 'rope',
          success: { text: 'Trepáis por la hiedra y caéis en silencio entre los rosales.', xp: 50, peaceful: true },
          fail: { text: 'Alguien cae sobre un macetero. Los mastines empiezan a ladrar.', startCombat: true } },
        { id: 'kitchen', label: 'Sobornar a la cocinera (2 po por persona)', auto: true, cost: 2, preCombat: true,
          success: { text: 'La cocinera cuenta las monedas y os señala la escalera de servicio. "Yo no os he visto."', peaceful: true } },
        { id: 'servants', label: 'Convencer a los criados de que os dejen pasar (Persuasión CD 14)', skill: 'persuasion', dc: 14, preCombat: true, advIf: ['fakeThugs'],
          success: { text: 'Los criados odian a su señor más de lo que le temen. Os abren la puerta de la cocina.', xp: 50, peaceful: true },
          fail: { text: 'Un lacayo corre a avisar a los guardias.', inc: { suspicion: 1 }, startCombat: true } },
      ],
      exits: [
        { label: '¡Asaltar la mansión por la fuerza!', fight: true },
        { label: 'Subir al estudio del canciller', to: 'estudio' },
      ],
    },

    // ------------------------------------------------------------------ el estudio
    estudio: {
      title: 'El estudio del canciller',
      art: 'study',
      text: [
        'El estudio huele a cera y a tinta cara. Hay estanterías hasta el techo, un escritorio de ébano y una caja fuerte empotrada en la pared. Junto a la puerta hay una armadura antigua de cuerpo entero.',
        'Cuando dais un paso, el yelmo de la armadura gira hacia vosotros con un chirrido.',
      ],
      combat: {
        enemies: (n) => scale(n, [['animated_armor'], ['animated_armor'], ['animated_armor', 'guard'], ['animated_armor', 'animated_armor']]),
        names: { animated_armor: 'La armadura guardiana' },
        auto: () => false,
        surprise: () => null,
        adjust: weaken('animated_armor', 0.65),
        victory: { text: 'La armadura se desmonta pieza a pieza y queda esparcida por la alfombra.', milestoneXp: 250 },
        peaceful: { text: 'La armadura vuelve a quedarse quieta junto a la puerta.' },
        defeat: { to: 'mazmorra', text: 'El guantelete de hierro se cierra sobre vosotros. Cuando despertáis, el canciller os mira desde el otro lado de unos barrotes.', flags: ['captured'] },
      },
      checks: [
        { id: 'command', label: 'Encontrar la palabra de mando de la armadura (Conocimiento arcano CD 14)', skill: 'arcana', dc: 14, preCombat: true,
          success: { text: 'Hay una runa grabada en el peto. La lees en voz alta y la armadura se queda quieta.', xp: 75, peaceful: true },
          fail: { text: 'Pronuncias algo parecido y la armadura levanta los puños.', startCombat: true } },
        { id: 'ledger', label: 'Buscar el libro de cuentas secreto', auto: true, hideIf: ['ledger'],
          success: { text: 'Está en un doble fondo del escritorio. Pagos a la Linterna por "el robo del objeto". Pagos a matones "con insignia de farol". Y un último apunte: "Tras el consejo, eliminar a R. C." El canciller pensaba matar a Rina.', flags: ['ledger'], inc: { evidence: 2 }, xp: 50, journal: '¡Tenéis el libro de cuentas!' } },
        { id: 'safe', label: 'Abrir la caja fuerte (Juego de manos CD 14; ventaja con herramientas de ladrón)', skill: 'sleight', dc: 14, advIfItem: 'thieves_tools', hideIf: ['safeOpen'],
          success: { text: 'La cerradura cede con un clic. Dentro hay cartas a una compañía de mercenarios extranjera ("Cuando sea regente, la ciudad os abrirá las puertas") y una montaña de oro.', flags: ['safeOpen', 'letters'], inc: { evidence: 1 }, xp: 50 },
          fail: { text: 'Un muelle salta y la cerradura se bloquea. Alguien en el piso de abajo ha oído el ruido.', inc: { suspicion: 1 } } },
        { id: 'loot', label: 'Llevarse también el oro del canciller', auto: true, requires: ['safeOpen'], hideIf: ['greedy'],
          success: { text: 'Llenáis los bolsillos. Si os pillan, al menos habrá valido la pena.', flags: ['greedy'], gold: 30, inc: { suspicion: 1 } } },
        { id: 'out', label: 'Salir sin dejar rastro (Sigilo CD 13, prueba de grupo)', skill: 'stealth', dc: 13, mode: 'group', hideIf: ['cleanExit', 'messyExit'], dcMod: (f) => num(f, 'suspicion'),
          success: { text: 'Salís por la ventana y bajáis por la hiedra. Nadie sabrá que habéis estado aquí hasta mañana.', flags: ['cleanExit'], xp: 50 },
          fail: { text: '"¡Ladrones en el estudio!" Salís corriendo bajo una lluvia de virotes. El canciller ya sabe que vais a por él.', flags: ['messyExit'], inc: { suspicion: 2 }, damageFailed: { expr: '1d6', type: 'perforante' } } },
      ],
      exits: [
        { label: '¡Luchar contra la armadura!', fight: true },
        { label: 'Desaparecer en la noche', to: 'vispera', requires: ['cleanExit', 'messyExit'] },
      ],
    },

    // ------------------------------------------------------------------ captura
    mazmorra: {
      title: 'Las mazmorras del palacio de justicia',
      art: 'dungeon',
      onEnter: { heal: '1d6', inc: { suspicion: 1 } },
      reward: { xp: 250 },
      text: [
        'Una celda húmeda, una antorcha en el pasillo y un guardia que ronca. Al cabo de un rato llegan pasos suaves: el canciller Bastián Dore, con un pañuelo perfumado bajo la nariz.',
        '"Qué decepción. Pensaba que Isolda contrataría a alguien más competente." Sonríe. "Mañana el consejo me nombrará regente, la guardia aplastará a la Linterna por el robo y nadie recordará vuestros nombres. Buenas noches."',
        'Cuando se va, el guardia de la puerta ya no ronca. Lo ha oído todo, y os mira con los ojos muy abiertos.',
      ],
      shortRest: true,
      checks: [
        { id: 'witness', label: 'Convencer al guardia de que testifique (Persuasión CD 13)', skill: 'persuasion', dc: 13, hideIf: ['heardConfession'],
          success: { text: 'El guardia se llama Bruno y tiene tres hijos. "No quiero problemas… pero lo que he oído no está bien. Si me lo piden ante el consejo, diré la verdad."', flags: ['heardConfession'], inc: { evidence: 1 }, xp: 50 },
          fail: { text: 'El guardia se tapa las orejas. "Yo no he oído nada. Nada."' } },
        { id: 'lock', label: 'Forzar la cerradura de la celda (Juego de manos CD 13; ventaja con herramientas de ladrón)', skill: 'sleight', dc: 13, advIfItem: 'thieves_tools', hideIf: ['escaped'], retry: true,
          success: { text: 'Con una horquilla y mucha paciencia, la cerradura cede.', flags: ['escaped'], xp: 75 },
          fail: { text: 'La horquilla se parte dentro de la cerradura.' } },
        { id: 'friends', label: 'Esperar a que vuestros amigos os saquen', auto: true, hideIf: ['escaped'], when: (f) => !!(f.rinaDeal || f.piaFriend || f.valkAlly),
          success: { text: (f) => (f.valkAlly ? 'A medianoche, la capitana Valk aparece con las llaves. "No he visto nada. Corred."' : 'A medianoche, una muchacha con una insignia de farol abre la celda con una ganzúa. "Pía os manda saludos. La Linterna no olvida a quien la ayuda."'), flags: ['escaped'], xp: 50 } },
        { id: 'wait', label: 'Esperar al cambio de guardia y escapar a la carrera', auto: true, hideIf: ['escaped'],
          success: { text: 'Cuando el carcelero abre para traer el agua, os lanzáis sobre él y corréis por los pasillos. Salís a la calle con varios moratones y la guardia pisándoos los talones.', flags: ['escaped'], inc: { suspicion: 1 }, damageAll: { expr: '1d4', type: 'contundente' } } },
      ],
      exits: [{ label: 'Huir a las calles', to: 'vispera', requires: ['escaped'] }],
    },

    // ------------------------------------------------------------------ la víspera del consejo
    vispera: {
      title: 'La víspera del consejo',
      art: 'city',
      text: [
        'Es la última noche antes del consejo. Velacruz duerme mal: hay guardias en cada esquina y rumores en cada taberna. Os refugiáis en el desván de una posada para preparar el día de mañana.',
        { if: (f) => f.rinaDeal && !f.seal, text: 'A medianoche, alguien llama a la ventana. Es Rina Corvalán, colgada de una cuerda. "¿Tenéis lo mío?"' },
        { if: (f) => f.stoleSeal, text: 'Seguro que Rina ya ha descubierto la piedra envuelta en terciopelo. Mejor no pensar en ello.' },
        { if: (f) => !f.seal && !f.rinaDeal, text: 'No tenéis el sello. Sin él, mañana solo os quedará la verdad… y lo que podáis demostrar.' },
      ],
      shortRest: true,
      reward: { xp: 150 },
      milestoneLevel: 3,
      checks: [
        { id: 'trade', label: 'Entregar el libro de cuentas a Rina y recibir el sello', auto: true, requires: ['rinaDeal'], when: (f) => !!f.ledger && !f.seal && !f.rinaBetrayed,
          success: { text: 'Rina hojea el libro y se le ilumina la cara cuando lee lo de "eliminar a R. C.". "Con esto, Bastián no volverá a tocarme." Os da el sello. "Un placer hacer negocios. Y mañana, en el consejo, la Linterna estará mirando."', flags: ['seal', 'rinaPact'], unset: ['ledger'], inc: { evidence: -2 }, xp: 50 } },
        { id: 'trick', label: 'Darle a Rina un libro falso y quedaros con ambos (Engaño CD 15)', skill: 'deception', dc: 15, requires: ['rinaDeal'], when: (f) => !!f.ledger && !f.seal && !f.rinaBetrayed,
          success: { text: 'Rina hojea el libro falso a la luz de la vela, asiente y os da el sello. Cuando descubra el engaño, estaréis lejos.', flags: ['seal', 'rinaBetrayed', 'rinaEnemy'], xp: 75 },
          fail: { text: 'Rina pasa dos páginas y frunce el ceño. "Esta letra no es la de Bastián." Os arranca el libro verdadero de las manos y desaparece por la ventana. Sin sello y sin libro.', flags: ['rinaBetrayed', 'rinaEnemy'], unset: ['ledger', 'rinaDeal'], inc: { evidence: -2 } } },
        { id: 'raid', label: 'Pedir a la capitana Valk que asalte la guarida de la Linterna', auto: true, requires: ['valkAlly'], when: (f) => !f.seal && !!f.knowsHideout,
          success: { text: 'Valk reúne a sus guardias más leales y baja a las cloacas. Al amanecer vuelve con el Sello de Ámbar… y con media Linterna encadenada.', flags: ['seal', 'rinaCaptured', 'rinaEnemy'], unset: ['rinaDeal'], xp: 25 } },
        { id: 'speech', label: 'Preparar el discurso ante el consejo (Persuasión o Historia CD 12)', skill: 'persuasion', altSkill: 'history', dc: 12, hideIf: ['speechReady'],
          success: { text: 'Ordenáis las pruebas, ensayáis las palabras y pensáis en cada objeción del canciller. Mañana estaréis listos.', flags: ['speechReady'], xp: 50 },
          fail: { text: 'Las ideas se os enredan. Tendréis que improvisar.' } },
        { id: 'valk', label: 'Buscar el apoyo de la capitana Valk (Persuasión CD 13; más fácil con pruebas)', skill: 'persuasion', dc: 13, hideIf: ['valkAlly'], dcMod: (f) => -Math.min(4, num(f, 'evidence')),
          success: { text: 'Valk escucha, mira vuestras pruebas y asiente despacio. "Mañana, mis guardias estarán en la sala. Si demostráis lo que decís, arrestaré al canciller yo misma."', flags: ['valkAlly'], xp: 50 },
          fail: { text: '"No basta", dice Valk. "Con esto no puedo arrestar a un canciller."' } },
      ],
      exits: [{ label: 'Acudir al consejo al amanecer', to: 'consejo' }],
    },

    // ------------------------------------------------------------------ el consejo (final)
    consejo: {
      title: 'El consejo de Velacruz',
      art: 'hall',
      text: [
        'La sala del consejo es un círculo de bancos de mármol bajo una cúpula de cristal. Los doce consejeros ocupan sus asientos. Lady Isolda está de pie, sola, con las manos cruzadas. Enfrente, el canciller Bastián Dore sonríe, rodeado de su guardia de librea verde y de su campeón, sir Corvin, un veterano de mil batallas.',
        '"Señores", dice el canciller, "el sello no ha aparecido. Propongo que el consejo me nombre regente… por el bien de la ciudad."',
        { if: (f) => f.seal, text: 'Notáis el peso del Sello de Ámbar en la bolsa. Nadie sabe que lo tenéis… todavía.' },
        { if: (f) => f.valkAlly, text: 'Junto a la puerta, la capitana Valk os hace un leve gesto con la cabeza.' },
        { if: (f) => f.rinaPact, text: 'En la galería del público, una cabeza pelirroja asoma bajo una capucha.' },
      ],
      combat: {
        enemies: (n, f) => scale(n, [['guard', 'guard'], ['veteran', 'guard'], ['veteran', 'guard', 'guard'], ['veteran', 'guard', 'guard', 'spy']]).concat(num(f, 'suspicion') >= 3 ? ['guard'] : []),
        names: { veteran: 'Sir Corvin', spy: 'Bastián Dore' },
        auto: () => false,
        surprise: () => null,
        adjust: (enemies, f, log) => {
          for (const e of enemies) if (e.type === 'veteran' && enemies.length <= 2) { e.hp = Math.ceil(e.hp * 0.6); e.maxHp = e.hp; }
          if (f.valkAlly) { for (const e of enemies) if (e.type === 'guard') e.hp = Math.max(1, Math.ceil(e.hp / 2)); log('🛡️ La capitana Valk y sus guardias se lanzan sobre la escolta del canciller.'); }
        },
        victory: {
          text: 'Sir Corvin rinde la espada. El canciller intenta escabullirse por una puerta lateral, pero la guardia le cierra el paso. Los consejeros, pálidos, miran a Bastián Dore como quien mira a un desconocido.',
          milestoneXp: 400, flags: ['bastianFallen'], gold: 20,
        },
        peaceful: { text: 'El canciller, lívido, es escoltado fuera de la sala. Sir Corvin envaina la espada sin haberla usado.' },
        defeat: { to: 'fin_regente', text: 'Caéis sobre el mármol de la sala del consejo. Lo último que oís es la voz suave del canciller: "Ya lo veis, señores. Traidores y asesinos. La ciudad necesita mano firme."' },
      },
      checks: [
        { id: 'expose', label: 'Desenmascarar al canciller ante el consejo (Persuasión CD 18, -2 por cada prueba)', skill: 'persuasion', dc: 18, preCombat: true, advIf: ['speechReady'], dcMod: (f) => -2 * Math.max(0, Math.min(5, num(f, 'evidence'))) + Math.min(2, num(f, 'suspicion')),
          success: { text: (f) => `Presentáis las pruebas una a una: ${[f.clueSmoke && 'el humo alquímico', f.clueKey && 'la llave del estuche', (f.courierNote || f.courierTalk) && 'la nota con lacre verde', f.fakeThugs && 'los matones pagados', f.ledger && 'el libro de cuentas', f.letters && 'las cartas a los mercenarios', f.heardConfession && 'el testimonio del guardia Bruno'].filter(Boolean).join(', ') || 'vuestra palabra'}. La sala enmudece. "¡Guardias!", grita el canciller… pero nadie se mueve. La capitana Valk le pone la mano en el hombro: "Bastián Dore, quedáis arrestado."`, flags: ['exposed'], xp: 100, peaceful: true },
          fail: { text: '"Calumnias", dice el canciller con una sonrisa. "Guardias, detened a estos impostores." Sir Corvin desenvaina.', startCombat: true } },
        { id: 'valkArrest', label: 'Dar la señal a la capitana Valk (necesitáis al menos 3 pruebas)', auto: true, preCombat: true, requires: ['valkAlly'], when: (f) => num(f, 'evidence') >= 3,
          success: { text: 'Valk avanza hasta el centro de la sala con vuestras pruebas en la mano y las lee en voz alta, una tras otra. Cuando termina, sus guardias rodean al canciller. Sir Corvin mira a su señor, mira a Valk… y da un paso atrás.', flags: ['exposed'], xp: 75, peaceful: true } },
        { id: 'duel', label: 'Retar a sir Corvin a un duelo de honor (Intimidación CD 14)', skill: 'intimidation', dc: 14, preCombat: true, hideIf: ['duelRefused'],
          success: { text: 'Sir Corvin no puede negarse ante el consejo. Pero el canciller no piensa dejarlo solo: "¡Todos a la vez!" Al menos su guardia está desconcertada.', flags: ['duelRefused'], startCombat: true, xp: 25 },
          fail: { text: 'Sir Corvin ni siquiera os mira.', flags: ['duelRefused'] } },
      ],
      exits: [
        { label: '¡Plantar cara a la guardia del canciller!', fight: true },
        { label: 'Entregar el Sello de Ámbar a Lady Isolda', to: 'fin_duquesa', requires: ['seal'] },
        { label: 'Entregar el sello a Rina y a la Linterna', to: 'fin_gremio', requires: ['seal'], when: (f) => !!(f.rinaPact || f.rinaDeal), hint: 'La ciudad tendrá un duque… que obedecerá al gremio.' },
        { label: 'Romper el sello ante el consejo: que gobierne la ciudad', to: 'fin_concejo', requires: ['seal'], hint: 'Ningún duque más. Nadie sabe qué vendrá después.' },
        { label: 'Apoyar a Isolda solo con la verdad', to: (f) => (f.exposed || f.bastianFallen ? 'fin_duquesa' : 'fin_regente'), hideIf: ['seal'] },
      ],
    },

    // ------------------------------------------------------------------ finales
    fin_duquesa: {
      title: 'Epílogo: la duquesa de Velacruz',
      art: 'hall',
      ending: { title: 'La duquesa de Velacruz', tone: 'good' },
      text: [
        { if: (f) => f.seal, text: 'Ponéis el Sello de Ámbar en las manos de Isolda. Los doce consejeros se levantan y, uno a uno, inclinan la cabeza. Las campanas de Velacruz, que doblaron por el duque muerto, repican ahora por la duquesa.' },
        { if: (f) => !f.seal, text: 'Sin el sello, el consejo duda durante horas. Pero con el canciller en una celda y la verdad en boca de todos, al final vota: Isolda Marbrand será duquesa, con sello o sin él.' },
        'Bastián Dore es juzgado por traición. Su mansión se subasta, y con el dinero se reconstruye el mercado bajo.',
        { if: (f) => f.rinaEnemy && !f.rinaCaptured, text: 'Rina Corvalán no os perdona. De vez en cuando, encontráis un pequeño farol de tiza dibujado en la puerta de vuestra posada. Es una advertencia.' },
        { if: (f) => f.rinaCaptured, text: 'La Linterna queda desmantelada. Las calles son más seguras… y un poco más aburridas.' },
        { if: (f) => f.piaFriend, text: 'Pía tiene ahora el puesto de cintas más grande del mercado. A vosotros os las regala.' },
        { if: (f) => f.greedy, text: 'Nadie pregunta por el oro que faltaba en la caja fuerte del canciller. Nadie, salvo la duquesa, que os mira de reojo cuando os paga.' },
        'La duquesa Isolda os nombra "amigos de la casa Marbrand", lo que significa que podéis comer gratis en palacio, y que vuestros enemigos serán los suyos.',
        'FIN. Velacruz tiene una duquesa.',
      ],
      reward: { gold: 80 },
      end: true,
      exits: [],
    },
    fin_gremio: {
      title: 'Epílogo: la ciudad de los faroles',
      art: 'hideout',
      ending: { title: 'La ciudad de los faroles', tone: 'mixed' },
      text: [
        'Ponéis el sello en las manos de Rina Corvalán, que lo levanta ante el consejo con una sonrisa de gato. Nadie se atreve a protestar: todos los consejeros tienen algún secreto en los archivos de la Linterna.',
        'Rina no se proclama duquesa. Es más lista que eso. Propone a un primo lejano de los Marbrand, un muchacho tímido que hará lo que le digan. Isolda abandona Velacruz esa misma semana, sin despedirse.',
        { if: (f) => f.exposed || f.bastianFallen, text: 'Bastián Dore desaparece de su celda una noche. Nadie lo vuelve a ver, y nadie lo busca.' },
        'Las calles son más tranquilas que nunca: la Linterna no permite más ladrones que los suyos. A vosotros os trata como a reyes. Pero cada vez que habláis con alguien, os preguntáis quién más os estará escuchando.',
        'FIN. Velacruz tiene un duque… y un gremio que gobierna en las sombras.',
      ],
      reward: { gold: 120 },
      end: true,
      exits: [],
    },
    fin_concejo: {
      title: 'Epílogo: la ciudad sin duque',
      art: 'city',
      ending: { title: 'La ciudad sin duque', tone: 'mixed' },
      text: [
        'Levantáis el Sello de Ámbar ante el consejo… y lo estrelláis contra el suelo de mármol. Se parte en mil pedazos dorados. Durante un segundo, nadie respira.',
        '"Ningún duque más", decís. "Que Velacruz se gobierne a sí misma." Desde la galería del público llega un murmullo, luego un aplauso, luego un rugido.',
        { if: (f) => f.isoldaDoubts, text: 'Isolda os mira largo rato. Y, para sorpresa de todos, sonríe. "Mi tío estaría furioso", dice. "Yo, en cambio, me siento libre." Será la primera en presentarse a las elecciones del nuevo concejo.' },
        { if: (f) => !f.isoldaDoubts, text: 'Isolda os mira como si le hubierais clavado un puñal. Abandona la sala sin decir una palabra.' },
        { if: (f) => !(f.exposed || f.bastianFallen), text: 'El canciller aprovecha el caos para escapar de la ciudad. Algún día volverá.' },
        'Los años siguientes serán difíciles: gremios, nobles y vecinos discutiendo a gritos en la plaza del Ciprés. Pero discuten. Y ninguno manda solo.',
        'FIN. Velacruz ya no tiene duque.',
      ],
      reward: { gold: 60 },
      end: true,
      exits: [],
    },
    fin_regente: {
      title: 'Epílogo: el regente',
      art: 'dungeon',
      ending: { title: 'El regente', tone: 'bad' },
      text: [
        'El consejo nombra regente a Bastián Dore por once votos contra uno. El único voto en contra es el de un anciano que, al día siguiente, se jubila "por motivos de salud".',
        'La guardia de librea verde arrasa la guarida de la Linterna. Lady Isolda es enviada a un convento en las montañas "por su seguridad". Y a vosotros os ofrecen una elección muy sencilla: el destierro o la horca.',
        'Mientras cruzáis las puertas de Velacruz con lo puesto, veis ondear sobre el palacio el estandarte verde del nuevo regente. Detrás de una ventana, alguien os saluda con un pañuelo perfumado.',
        'FIN. Quizá algún día volváis a por él.',
      ],
      end: true,
      exits: [],
    },
  },
};
