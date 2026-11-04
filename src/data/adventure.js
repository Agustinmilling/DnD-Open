// Aventura original: "La Sombra bajo Robledal" (para 1-4 personajes de nivel 1 a 3).
// Historia y personajes originales. Monstruos y reglas: SRD 5.1.

// Escala los encuentros según el tamaño del grupo (n = número de personajes en juego)
const scale = (n, table) => table[Math.max(1, Math.min(4, n)) - 1];

module.exports = {
  id: 'robledal',
  title: 'La Sombra bajo Robledal',
  summary: 'Los mineros de Robledal han desaparecido cerca del viejo santuario enano. Algo se esconde bajo la colina, y no son solo goblins.',
  start: 'posada',
  scenes: {
    posada: {
      title: 'La posada del Ciervo Cojo',
      text: [
        'Llueve sobre Robledal, una aldea de leñadores y mineros encajada entre robles centenarios. En la posada del Ciervo Cojo huele a sopa de cebolla y a leña húmeda.',
        'La alcaldesa Maren Tostado, una mujer robusta con las manos llenas de callos, se sienta a vuestra mesa sin pedir permiso. "Hace cuatro días, cinco mineros bajaron a la vieja galería junto al santuario enano de la colina. No han vuelto. Anoche alguien vio luces verdes entre los árboles y oyó risas... risas de goblin."',
        '"Puedo pagaros 50 piezas de oro a cada uno si los traéis de vuelta. Vivos, a ser posible."',
      ],
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
      ],
      exits: [{ label: 'Aceptar el encargo y partir hacia la colina', to: 'bosque' }],
    },

    bosque: {
      title: 'El sendero del bosque',
      text: [
        'A la mañana siguiente seguís el viejo camino minero. Los robles se cierran sobre vosotros y la luz llega verdosa, filtrada por el musgo. El canto de los pájaros se apaga de golpe.',
        'Más adelante el sendero se estrecha entre dos rocas cubiertas de helechos: un lugar perfecto para una emboscada.',
      ],
      checks: [
        { id: 'tracks', label: 'Buscar huellas en el barro (Supervivencia CD 12)', skill: 'survival', dc: 12,
          success: { text: 'Huellas pequeñas y descalzas, y otras de lobo. Varias se desvían hacia las rocas. ¡Os están esperando!', flags: ['spotted'], xp: 25 },
          fail: { text: 'El barro está demasiado pisoteado para sacar nada en claro.' } },
        { id: 'sneak', label: 'Avanzar en sigilo (Sigilo CD 11, prueba de grupo)', skill: 'stealth', dc: 11, mode: 'group',
          success: { text: 'Os deslizáis entre los helechos sin hacer ruido. Veis a los goblins agazapados de espaldas a vosotros...', flags: ['ambushReversed'], xp: 25 },
          fail: { text: 'Una rama cruje bajo una bota. Del otro lado de las rocas, alguien susurra en goblin. Al menos ahora sabéis que os esperan.', flags: ['alerted'] } },
      ],
      exits: [{ label: 'Seguir adelante por el paso entre las rocas', to: 'emboscada' }],
    },

    emboscada: {
      title: '¡Emboscada!',
      text: ['Unas figuras de piel verdosa saltan desde las rocas chillando, con cimitarras oxidadas en la mano.'],
      combat: {
        enemies: (n) => scale(n, [['goblin'], ['goblin', 'goblin'], ['goblin', 'goblin', 'goblin'], ['goblin', 'goblin', 'goblin', 'wolf']]),
        // 'enemies' = los enemigos están sorprendidos; 'perception' = cada PJ compara su Percepción pasiva con el Sigilo de los goblins
        surprise: (flags) => (flags.ambushReversed ? 'enemies' : flags.spotted || flags.alerted ? null : 'perception'),
        ambushStealth: 6,
        victory: {
          text: 'El último goblin cae. Entre sus harapos encontráis una nota garabateada en común: "Varga dize: traed a los mineros vibos al zantuario. El Hambriento quiere comer." Y una bolsa con monedas.',
          gold: 15, items: { potion_healing: 1 }, milestoneXp: 250,
        },
      },
      exits: [{ label: 'Continuar hacia el santuario', to: 'barranco' }],
    },

    barranco: {
      title: 'El barranco del puente roto',
      text: [
        'El camino termina en un barranco de unos seis metros. El antiguo puente colgante cuelga hecho jirones: alguien ha cortado las cuerdas a propósito.',
        'Al otro lado se ve la entrada de piedra del santuario, tallada con runas enanas.',
      ],
      checks: [
        { id: 'climb', label: 'Bajar y trepar por las rocas (Atletismo CD 12, prueba de grupo)', skill: 'athletics', altSkill: 'acrobatics', dc: 12, mode: 'group', hideIf: ['crossed'],
          success: { text: 'Os ayudáis unos a otros y llegáis arriba sin un rasguño.', flags: ['crossed'], xp: 50 },
          fail: { text: 'Algunos resbaláis en la roca mojada y os golpeáis contra las piedras antes de conseguir cruzar.', flags: ['crossed'], damageFailed: { expr: '1d6', type: 'contundente' }, xp: 25 } },
        { id: 'path', label: 'Buscar otro camino (Supervivencia CD 14)', skill: 'survival', dc: 14, hideIf: ['crossed'],
          success: { text: 'Encuentras un sendero de cabras que baja y vuelve a subir por el otro lado. Tardáis más, pero llegáis sin problemas.', flags: ['crossed'], xp: 50 },
          fail: { text: 'No ves ningún otro camino. Habrá que trepar.' } },
      ],
      exits: [{ label: 'Acercarse a la entrada del santuario', to: 'entrada', requires: ['crossed'] }],
    },

    entrada: {
      title: 'La entrada del santuario',
      text: [
        'Dos estatuas de enanos con barbas de piedra flanquean una escalera que desciende a la oscuridad. Del fondo sube un olor a tierra húmeda... y a carne podrida.',
        'Es un buen sitio para recuperar el aliento antes de bajar.',
      ],
      shortRest: true,
      checks: [
        { id: 'trap', label: 'Examinar el suelo de la escalera (Investigación CD 13)', skill: 'investigation', altSkill: 'perception', dc: 13, advIf: ['knowsTraps'],
          success: { text: 'Descubres losas ligeramente hundidas: placas de presión conectadas a dardos ocultos. Las marcáis con tiza para esquivarlas.', flags: ['trapFound'], xp: 25 },
          fail: { text: 'La escalera parece segura... aparentemente.' } },
        { id: 'arcana', label: 'Leer las runas de las estatuas (Arcanos o Religión CD 12)', skill: 'arcana', altSkill: 'religion', dc: 12,
          success: { text: 'Las runas son una oración funeraria: "Aquí duerme Hurgen el Glotón, maldito por devorar a sus hermanos. Que la piedra lo contenga." Algo hambriento os espera abajo.', flags: ['knowsUndead'], xp: 25 },
          fail: { text: 'Las runas están demasiado erosionadas para leerlas.' } },
      ],
      exits: [{ label: 'Descender a la cripta', to: 'cripta' }],
    },

    cripta: {
      title: 'La cripta de los guardianes',
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

    puerta: {
      title: 'La puerta sellada',
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
      text: [
        'Una caverna iluminada por hongos verdes. Los cinco mineros están atados junto a una fosa. Sobre una roca, un osgo enorme con un lucero del alba ensangrentado sonríe: es Varga.',
        '"Más carne para el Hambriento", gruñe. A su espalda, algo pálido y encorvado se arrastra fuera de la fosa relamiéndose: el necrófago al que los enanos llamaban Hurgen el Glotón.',
      ],
      combat: {
        enemies: (n) => scale(n, [['bugbear'], ['bugbear', 'goblin', 'goblin'], ['bugbear', 'ghoul', 'goblin'], ['bugbear', 'ghoul', 'goblin', 'goblin', 'wolf']]),
        names: { bugbear: 'Varga el Osgo', ghoul: 'Hurgen el Glotón' },
        surprise: (flags) => (flags.sneakBoss ? 'enemies' : flags.noisy ? 'party' : null),
        victory: {
          text: 'Varga se desploma y el necrófago vuelve a ser un montón de huesos. Liberáis a los mineros, débiles pero vivos. Entre el botín del osgo hay oro enano y un arma con runas que brillan levemente.',
          gold: 100, items: { weapon_plus1: 1, potion_greater_healing: 1 }, milestoneXp: 300,
        },
      },
      exits: [{ label: 'Volver a Robledal con los mineros', to: 'epilogo' }],
    },

    epilogo: {
      title: 'Epílogo: el regreso a Robledal',
      text: [
        'Toda la aldea sale a recibiros con antorchas. Los mineros abrazan a sus familias y la alcaldesa Maren cumple su palabra: os paga la recompensa prometida y la posada del Ciervo Cojo os invita a una semana de sopa de cebolla.',
        'Esa noche, mientras la lluvia vuelve a caer, el viejo minero Telmo os cuenta en voz baja que Varga no actuaba solo: "Hablaba de un tal Amo de las Cenizas, más allá de las montañas..."',
        'FIN de la primera aventura. ¡Gracias por jugar!',
      ],
      reward: { gold: 50 },
      end: true,
      exits: [],
    },
  },
};
