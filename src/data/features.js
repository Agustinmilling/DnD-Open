// Rasgos de clase, de especie y dotes del SRD 5.2.1 (niveles 1-3), resumidos.
// "(Aquí: …)" explica cómo lo simplifica este juego, que no usa mapa ni distancias.
module.exports = {
  // ----- Dotes de origen -----
  feat_alert: { name: 'Alerta', source: 'Dote de origen', feat: 'origin', passive: true, desc: 'Sumas tu bonificador por competencia a las tiradas de iniciativa. Justo después de tirar iniciativa puedes intercambiarla con la de un aliado dispuesto. (Aquí: solo el bonificador).' },
  feat_savage_attacker: { name: 'Atacante salvaje', source: 'Dote de origen', feat: 'origin', passive: true, desc: 'Una vez por turno, cuando aciertas con un arma, tiras dos veces los dados de daño del arma y usas el resultado que prefieras.' },
  feat_skilled: { name: 'Habilidoso', source: 'Dote de origen', feat: 'origin', passive: true, desc: 'Ganas competencia en tres habilidades de tu elección.' },
  feat_magic_initiate: { name: 'Iniciado en la magia', source: 'Dote de origen', feat: 'origin', passive: true, desc: 'Aprendes dos trucos y un conjuro de nivel 1 de la lista de clérigo, druida o mago. Puedes lanzar ese conjuro una vez sin gastar espacio (se recupera con un descanso largo) o con tus espacios. Eliges Inteligencia, Sabiduría o Carisma como aptitud mágica.' },
  // ----- Dotes de estilo de combate -----
  style_defense: { name: 'Estilo de combate: Defensa', source: 'Dote de estilo de combate', feat: 'style', passive: true, desc: 'Mientras lleves armadura ligera, media o pesada, +1 a la CA.' },
  style_archery: { name: 'Estilo de combate: Tiro con arco', source: 'Dote de estilo de combate', feat: 'style', passive: true, desc: '+2 a las tiradas de ataque con armas a distancia.' },
  style_great_weapon: { name: 'Estilo de combate: Combate con armas a dos manos', source: 'Dote de estilo de combate', feat: 'style', passive: true, desc: 'Con un arma cuerpo a cuerpo a dos manos o versátil empuñada con ambas manos, cualquier 1 o 2 en los dados de daño cuenta como un 3.' },
  style_two_weapon: { name: 'Estilo de combate: Combate con dos armas', source: 'Dote de estilo de combate', feat: 'style', passive: true, desc: 'Cuando haces el ataque extra de un arma ligera, sumas tu modificador por característica a su daño.' },
  style_blessed_warrior: { name: 'Guerrero bendito', source: 'Paladín 2 (en lugar de un estilo)', passive: true, desc: 'Aprendes dos trucos de clérigo, que usan tu Carisma.' },
  style_druidic_warrior: { name: 'Guerrero druídico', source: 'Explorador 2 (en lugar de un estilo)', passive: true, desc: 'Aprendes dos trucos de druida, que usan tu Sabiduría.' },
  weapon_mastery: { name: 'Maestría con armas', source: 'Bárbaro, Explorador, Guerrero, Paladín y Pícaro 1', passive: true, desc: 'Puedes usar la propiedad de maestría de algunas de tus armas: Debilitar, Derribar, Empujar, Hender, Mellar, Molestar, Ralentizar o Rozar. (Aquí: se aplica a las armas de tu equipo).' },

  // ----- Bárbaro -----
  unarmored_defense_barbarian: { name: 'Defensa sin armadura', source: 'Bárbaro 1', passive: true, desc: 'Sin armadura, tu CA base es 10 + mod. DES + mod. CON. Puedes llevar escudo.' },
  rage: { name: 'Furia', source: 'Bárbaro 1', time: 'bonus', desc: 'Como acción adicional (sin armadura pesada) entras en furia: resistencia al daño contundente, cortante y perforante, +2 al daño de tus ataques de Fuerza y ventaja en pruebas y salvaciones de Fuerza; no puedes lanzar conjuros ni concentrarte. Usos: 2 (3 a nivel 3); recuperas uno con un descanso corto. (Aquí dura hasta el final del combate).' },
  reckless_attack: { name: 'Ataque temerario', source: 'Bárbaro 2', time: 'free', desc: 'Al hacer tu primer ataque del turno puedes atacar temerariamente: ventaja en tus ataques de Fuerza hasta tu siguiente turno, pero los ataques contra ti también tienen ventaja.' },
  danger_sense: { name: 'Sentir el peligro', source: 'Bárbaro 2', passive: true, desc: 'Ventaja en las salvaciones de Destreza salvo que estés incapacitado.' },
  primal_knowledge: { name: 'Conocimiento primigenio', source: 'Bárbaro 3', passive: true, desc: 'Ganas una habilidad más de la lista del bárbaro. Enfurecido, puedes hacer pruebas de Acrobacias, Intimidación, Percepción, Sigilo o Supervivencia como pruebas de Fuerza.' },
  frenzy: { name: 'Frenesí', source: 'Bárbaro 3 (Senda del berserker)', passive: true, desc: 'Si usas Ataque temerario estando enfurecido, el primer objetivo al que aciertes en tu turno con un ataque de Fuerza sufre daño adicional: tantos d6 como tu daño por furia (2d6).' },

  // ----- Bardo -----
  spellcasting_bard: { name: 'Lanzamiento de conjuros (bardo)', source: 'Bardo 1', passive: true, desc: 'Lanzas conjuros de bardo con Carisma. CD = 8 + competencia + mod. CAR. Usas un instrumento como canalizador.' },
  bardic_inspiration: { name: 'Inspiración bárdica', source: 'Bardo 1', time: 'bonus', desc: 'Como acción adicional, das a un aliado un dado de inspiración (d6). Una vez, cuando falle una prueba con d20 (ataque, salvación o prueba), lo tira y lo suma, lo que puede convertir el fallo en éxito. Usos: tu mod. CAR (mínimo 1) por descanso largo.' },
  jack_of_all_trades: { name: 'Aprendiz de mucho', source: 'Bardo 2', passive: true, desc: 'Sumas la mitad de tu competencia a las pruebas de habilidades en las que no eres competente.' },
  expertise_bard: { name: 'Pericia', source: 'Bardo 2', passive: true, desc: 'Duplicas tu bonificador por competencia en dos habilidades en las que eres competente.' },
  lore_proficiencies: { name: 'Competencias adicionales', source: 'Bardo 3 (Colegio del conocimiento)', passive: true, desc: 'Ganas competencia en tres habilidades de tu elección.' },
  cutting_words: { name: 'Palabras cortantes', source: 'Bardo 3 (Colegio del conocimiento)', time: 'reaction', desc: 'Como reacción, gastas una Inspiración bárdica para restar el dado a la tirada de ataque o de daño de una criatura que veas. (Aquí: se usa sola cuando puede hacer fallar un ataque contra un aliado).' },

  // ----- Brujo -----
  pact_magic: { name: 'Magia del pacto', source: 'Brujo 1', passive: true, desc: 'Lanzas conjuros de brujo con Carisma. Tus espacios de conjuro son pocos, todos del mismo nivel, y se recuperan con un descanso corto o largo.' },
  eldritch_invocations: { name: 'Invocaciones sobrenaturales', source: 'Brujo 1', passive: true, desc: 'Fragmentos de conocimiento prohibido que te dan capacidades permanentes. Una a nivel 1 y tres a nivel 2.' },
  magical_cunning: { name: 'Astucia mágica', source: 'Brujo 2', desc: 'Con un rito de 1 minuto recuperas la mitad de tus espacios de Magia del pacto (redondeando hacia arriba). Una vez por descanso largo.' },
  dark_ones_blessing: { name: 'Bendición del oscuro', source: 'Brujo 3 (Patrón infernal)', passive: true, desc: 'Cuando reduces a 0 PG a un enemigo, ganas PG temporales iguales a tu mod. CAR + tu nivel de brujo (mínimo 1). (Aquí: con los enemigos que derrotas tú).' },
  fiend_spells: { name: 'Conjuros del infernal', source: 'Brujo 3 (Patrón infernal)', passive: true, desc: 'Siempre tienes preparados Manos ardientes, Orden imperiosa, Rayo abrasador y Sugestión.' },
  inv_armor_of_shadows: { name: 'Armadura de sombras', source: 'Invocación', invocation: 1, passive: true, desc: 'Puedes lanzar Armadura de mago sobre ti sin gastar espacios de conjuro.' },
  inv_eldritch_mind: { name: 'Mente sobrenatural', source: 'Invocación', invocation: 1, passive: true, desc: 'Ventaja en las salvaciones de Constitución para mantener la concentración.' },
  inv_pact_blade: { name: 'Pacto del filo', source: 'Invocación', invocation: 1, passive: true, desc: 'Conjuras un arma de pacto con la que eres competente. Puedes usar tu Carisma para atacar y dañar con ella, y su daño puede ser necrótico, psíquico o radiante. (Aquí: tu primera arma cuerpo a cuerpo).' },
  inv_agonizing_blast: { name: 'Descarga agónica', source: 'Invocación (nivel 2)', invocation: 2, passive: true, desc: 'Sumas tu mod. CAR al daño de Descarga sobrenatural.' },
  inv_fiendish_vigor: { name: 'Vigor infernal', source: 'Invocación (nivel 2)', invocation: 2, passive: true, desc: 'Puedes lanzar Falsa vida sobre ti sin gastar espacios; obtienes el máximo del dado (12 PG temporales).' },
  inv_devils_sight: { name: 'Vista del diablo', source: 'Invocación (nivel 2)', invocation: 2, passive: true, desc: 'Ves con normalidad en la oscuridad, incluso mágica, hasta 36 m.' },
  inv_mask_of_many_faces: { name: 'Máscara de los mil rostros', source: 'Invocación (nivel 2)', invocation: 2, passive: true, desc: 'Puedes lanzar Disfrazarse sin gastar espacios.' },
  inv_repelling_blast: { name: 'Descarga ahuyentadora', source: 'Invocación (nivel 2)', invocation: 2, passive: true, desc: 'Al acertar con Descarga sobrenatural puedes empujar al objetivo 3 m.' },

  // ----- Clérigo -----
  spellcasting_cleric: { name: 'Lanzamiento de conjuros (clérigo)', source: 'Clérigo 1', passive: true, desc: 'Lanzas conjuros de clérigo con Sabiduría. CD = 8 + competencia + mod. SAB. Usas un símbolo sagrado como canalizador.' },
  order_protector: { name: 'Orden divina: Protector', source: 'Clérigo 1', passive: true, desc: 'Te entrenaste para el combate: competencia con armas marciales y armaduras pesadas.' },
  order_thaumaturge: { name: 'Orden divina: Taumaturgo', source: 'Clérigo 1', passive: true, desc: 'Un truco de clérigo adicional y sumas tu mod. SAB (mínimo +1) a tus pruebas de Conocimiento arcano y Religión.' },
  channel_divinity_cleric: { name: 'Canalizar divinidad', source: 'Clérigo 2', time: 'action', desc: 'Dos usos (recuperas uno con un descanso corto). Chispa divina: un objetivo recupera 1d8 + mod. SAB PG, o hace una salvación de Constitución y sufre ese daño radiante (la mitad si la supera). Expulsar muertos vivientes: los muertos vivientes que fallen una salvación de Sabiduría quedan asustados e incapacitados 1 minuto o hasta recibir daño.' },
  life_spells: { name: 'Conjuros del dominio de la vida', source: 'Clérigo 3 (Dominio de la vida)', passive: true, desc: 'Siempre tienes preparados Auxilio, Bendición, Curar heridas y Restablecimiento menor.' },
  disciple_of_life: { name: 'Discípulo de la vida', source: 'Clérigo 3 (Dominio de la vida)', passive: true, desc: 'Cuando gastas un espacio para curar, el objetivo recupera 2 + el nivel del espacio PG adicionales.' },
  preserve_life: { name: 'Preservar vida', source: 'Clérigo 3 (Dominio de la vida)', time: 'action', desc: 'Gastas Canalizar divinidad para repartir 5 × tu nivel de clérigo en curación entre aliados maltrechos, sin subir a nadie por encima de la mitad de sus PG máximos.' },

  // ----- Druida -----
  druidic: { name: 'Druídico', source: 'Druida 1', passive: true, desc: 'Conoces el idioma secreto de los druidas y siempre tienes preparado Hablar con los animales.' },
  spellcasting_druid: { name: 'Lanzamiento de conjuros (druida)', source: 'Druida 1', passive: true, desc: 'Lanzas conjuros de druida con Sabiduría. CD = 8 + competencia + mod. SAB.' },
  order_warden: { name: 'Orden primigenia: Guardián', source: 'Druida 1', passive: true, desc: 'Competencia con armas marciales y armaduras medias.' },
  order_magician: { name: 'Orden primigenia: Naturalista', source: 'Druida 1', passive: true, desc: 'Un truco de druida adicional y sumas tu mod. SAB (mínimo +1) a tus pruebas de Conocimiento arcano y Naturaleza.' },
  wild_shape: { name: 'Forma salvaje', source: 'Druida 2', time: 'bonus', desc: 'Como acción adicional te transformas en una bestia (VD 1/4 como máximo, sin vuelo): lobo, jabalí o pantera. Ganas PG temporales iguales a tu nivel de druida, usas la CA y los ataques de la bestia y conservas tus PG, habilidades y salvaciones. No puedes lanzar conjuros. Dos usos; recuperas uno con un descanso corto.' },
  wild_companion: { name: 'Compañero salvaje', source: 'Druida 2', passive: true, desc: 'Puedes gastar un espacio o un uso de Forma salvaje para invocar un familiar feérico. (Aquí no tiene efecto en combate).' },
  lands_aid: { name: 'Ayuda de la tierra', source: 'Druida 3 (Círculo de la tierra)', time: 'action', desc: 'Gastas un uso de Forma salvaje: flores y espinas brotan en una esfera; los enemigos hacen una salvación de Constitución y sufren 2d6 de daño necrótico (la mitad si la superan) y un aliado recupera 2d6 PG.' },
  circle_spells: { name: 'Conjuros del círculo de la tierra', source: 'Druida 3 (Círculo de la tierra)', passive: true, desc: 'Según el terreno que elijas tienes siempre preparados algunos conjuros. Árido: Contorno borroso, Descarga de fuego, Manos ardientes. Polar: Inmovilizar persona, Nube de oscurecimiento, Rayo de escarcha. Templado: Agarre electrizante, Dormir, Paso brumoso. Tropical: Rayo nauseabundo, Salpicadura ácida, Telaraña.' },

  // ----- Explorador -----
  spellcasting_ranger: { name: 'Lanzamiento de conjuros (explorador)', source: 'Explorador 1', passive: true, desc: 'Lanzas conjuros de explorador con Sabiduría. CD = 8 + competencia + mod. SAB.' },
  favored_enemy: { name: 'Enemigo predilecto', source: 'Explorador 1', passive: true, desc: 'Siempre tienes preparado Marca del cazador y puedes lanzarlo dos veces sin gastar espacios (se recupera con un descanso largo).' },
  deft_explorer: { name: 'Explorador hábil', source: 'Explorador 2', passive: true, desc: 'Ganas pericia en una de tus habilidades y conoces dos idiomas más.' },
  hunters_lore: { name: 'Sabiduría del cazador', source: 'Explorador 3 (Cazador)', passive: true, desc: 'Mientras una criatura tenga tu Marca del cazador, sabes si tiene inmunidades, resistencias o vulnerabilidades.' },
  colossus_slayer: { name: 'El cazador y la presa: Azote de colosos', source: 'Explorador 3 (Cazador)', passive: true, desc: 'Una vez por turno, al acertar con un arma a una criatura que no tenga todos sus PG, le causas 1d8 de daño adicional.' },
  horde_breaker: { name: 'El cazador y la presa: Destructor de hordas', source: 'Explorador 3 (Cazador)', passive: true, desc: 'Una vez por turno, cuando atacas con un arma, puedes hacer otro ataque con la misma arma contra una criatura distinta cercana al objetivo.' },

  // ----- Guerrero -----
  second_wind: { name: 'Tomar aliento', source: 'Guerrero 1', time: 'bonus', desc: 'Como acción adicional recuperas 1d10 + tu nivel de guerrero PG. Dos usos; recuperas uno con un descanso corto.' },
  action_surge: { name: 'Acción súbita', source: 'Guerrero 2', time: 'free', desc: 'Una vez por descanso corto, en tu turno puedes realizar una acción más (que no sea la acción de magia).' },
  tactical_mind: { name: 'Mente táctica', source: 'Guerrero 2', passive: true, desc: 'Cuando fallas una prueba de característica, puedes gastar un uso de Tomar aliento para sumar 1d10. Si sigues fallando, el uso no se gasta. (Aquí: se usa sola).' },
  remarkable_athlete: { name: 'Atleta sobresaliente', source: 'Guerrero 3 (Campeón)', passive: true, desc: 'Ventaja en las tiradas de iniciativa y en las pruebas de Fuerza (Atletismo).' },
  improved_critical: { name: 'Crítico mejorado', source: 'Guerrero 3 (Campeón)', passive: true, desc: 'Tus ataques con armas y sin armas son críticos con un 19 o un 20.' },

  // ----- Hechicero -----
  spellcasting_sorcerer: { name: 'Lanzamiento de conjuros (hechicero)', source: 'Hechicero 1', passive: true, desc: 'Lanzas conjuros de hechicero con Carisma. CD = 8 + competencia + mod. CAR.' },
  innate_sorcery: { name: 'Hechicería innata', source: 'Hechicero 1', time: 'bonus', desc: 'Como acción adicional desatas tu magia durante 1 minuto: +1 a la CD de tus conjuros de hechicero y ventaja en sus tiradas de ataque. Dos usos por descanso largo.' },
  font_of_magic: { name: 'Fuente de magia', source: 'Hechicero 2', time: 'bonus', desc: 'Tienes puntos de hechicería (2 a nivel 2, 3 a nivel 3). Como acción adicional puedes convertirlos en un espacio de conjuro: nivel 1 por 2 puntos, nivel 2 por 3 puntos (desde nivel 3).' },
  metamagic: { name: 'Metamagia', source: 'Hechicero 2', passive: true, desc: 'Conoces dos opciones de metamagia para modificar tus conjuros gastando puntos de hechicería.' },
  meta_seeking: { name: 'Metamagia: Conjuro buscador', source: 'Metamagia', metamagic: true, passive: true, desc: '1 punto: si fallas un ataque de conjuro, vuelves a tirar el d20. (Aquí: se usa sola).' },
  meta_empowered: { name: 'Metamagia: Conjuro potenciado', source: 'Metamagia', metamagic: true, passive: true, desc: '1 punto: repites tantos dados de daño como tu mod. CAR. (Aquí: se usa sola en conjuros de nivel 1 o más y repite los dados más bajos).' },
  meta_heightened: { name: 'Metamagia: Conjuro intensificado', source: 'Metamagia', metamagic: true, time: 'free', desc: '2 puntos: un objetivo de tu próximo conjuro con salvación tiene desventaja en ella.' },
  meta_extended: { name: 'Metamagia: Conjuro extendido', source: 'Metamagia', metamagic: true, passive: true, desc: '1 punto: duplicas la duración de un conjuro y tienes ventaja en las salvaciones para mantener su concentración. (Aquí: se usa sola en conjuros de concentración si te sobran puntos).' },
  draconic_resilience: { name: 'Resistencia dracónica', source: 'Hechicero 3 (Hechicería dracónica)', passive: true, desc: 'Tus PG máximos aumentan en 3 (y 1 más por nivel). Sin armadura, tu CA base es 10 + mod. DES + mod. CAR.' },
  draconic_spells: { name: 'Conjuros dracónicos', source: 'Hechicero 3 (Hechicería dracónica)', passive: true, desc: 'Siempre tienes preparados Aliento de dragón, Alterar el propio aspecto, Orbe cromático y Orden imperiosa.' },

  // ----- Mago -----
  spellcasting_wizard: { name: 'Lanzamiento de conjuros (mago)', source: 'Mago 1', passive: true, desc: 'Lanzas conjuros de mago con Inteligencia desde tu libro de conjuros. CD = 8 + competencia + mod. INT.' },
  ritual_adept: { name: 'Adepto en rituales', source: 'Mago 1', passive: true, desc: 'Puedes lanzar como ritual cualquier conjuro ritual de tu libro sin tenerlo preparado.' },
  arcane_recovery: { name: 'Recuperación arcana', source: 'Mago 1', desc: 'Una vez por descanso largo, al terminar un descanso corto, recuperas espacios cuya suma de niveles no supere la mitad de tu nivel de mago (redondeando hacia arriba).' },
  scholar: { name: 'Académico', source: 'Mago 2', passive: true, desc: 'Ganas pericia en Conocimiento arcano, Historia, Investigación, Medicina, Naturaleza o Religión (una en la que seas competente).' },
  evocation_savant: { name: 'Experto en evocación', source: 'Mago 3 (Evocador)', passive: true, desc: 'Añades a tu libro dos conjuros de evocación sin coste.' },
  potent_cantrip: { name: 'Truco potente', source: 'Mago 3 (Evocador)', passive: true, desc: 'Cuando fallas el ataque de un truco o el objetivo supera la salvación, sufre igualmente la mitad del daño (sin otros efectos).' },

  // ----- Monje -----
  martial_arts: { name: 'Artes marciales', source: 'Monje 1', passive: true, desc: 'Sin armadura ni escudo: tus ataques sin armas y armas de monje usan DES y hacen 1d6 (o el daño del arma si es mayor), y puedes hacer un ataque sin armas como acción adicional.' },
  unarmored_defense_monk: { name: 'Defensa sin armadura', source: 'Monje 1', passive: true, desc: 'Sin armadura ni escudo, tu CA base es 10 + mod. DES + mod. SAB.' },
  monks_focus: { name: 'Concentración de monje', source: 'Monje 2', time: 'bonus', desc: 'Tienes puntos de concentración (2 a nivel 2, 3 a nivel 3) que recuperas con un descanso corto. Ráfaga de golpes (1 punto): dos ataques sin armas como acción adicional. Defensa paciente: destrabarte como acción adicional, o con 1 punto también esquivar. Paso del viento: correr como acción adicional.' },
  uncanny_metabolism: { name: 'Metabolismo asombroso', source: 'Monje 2', passive: true, desc: 'Al tirar iniciativa puedes recuperar todos tus puntos de concentración y 1d6 + tu nivel de monje PG. Una vez por descanso largo. (Aquí: se usa sola si lo necesitas).' },
  unarmored_movement: { name: 'Movimiento sin armadura', source: 'Monje 2', passive: true, desc: 'Tu velocidad aumenta en 3 m sin armadura ni escudo.' },
  deflect_attacks: { name: 'Desviar ataques', source: 'Monje 3', time: 'reaction', desc: 'Cuando un ataque contundente, cortante o perforante te acierta, como reacción reduces el daño en 1d10 + mod. DES + tu nivel de monje. Si lo reduces a 0, puedes gastar 1 punto para devolver el golpe (2 dados de Artes marciales + mod. DES; salvación de Destreza). (Aquí: se usa sola).' },
  open_hand_technique: { name: 'Técnica de la mano abierta', source: 'Monje 3 (Guerrero de la mano abierta)', passive: true, desc: 'Cuando aciertas con un ataque de Ráfaga de golpes puedes derribar al objetivo (salvación de Destreza), empujarlo (salvación de Fuerza) o impedirle reacciones. (Aquí: intenta derribarlo).' },

  // ----- Paladín -----
  lay_on_hands: { name: 'Imponer las manos', source: 'Paladín 1', time: 'bonus', desc: 'Tienes una reserva de curación de 5 × tu nivel de paladín PG. Como acción adicional tocas a una criatura y le devuelves PG de la reserva (o gastas 5 para curar el envenenamiento).' },
  spellcasting_paladin: { name: 'Lanzamiento de conjuros (paladín)', source: 'Paladín 1', passive: true, desc: 'Lanzas conjuros de paladín con Carisma. CD = 8 + competencia + mod. CAR.' },
  paladins_smite: { name: 'Castigo de paladín', source: 'Paladín 2', passive: true, desc: 'Siempre tienes preparado Castigo divino y puedes lanzarlo una vez sin gastar espacio por descanso largo.' },
  channel_divinity_paladin: { name: 'Canalizar divinidad (paladín)', source: 'Paladín 3', passive: true, desc: 'Dos usos (recuperas uno con un descanso corto). Sentidos divinos: detectas celestiales, infernales y muertos vivientes cercanos.' },
  sacred_weapon: { name: 'Arma sagrada', source: 'Paladín 3 (Juramento de entrega)', time: 'free', desc: 'Al atacar, gastas Canalizar divinidad: durante 10 minutos sumas tu mod. CAR (mínimo +1) a las tiradas de ataque con tu arma cuerpo a cuerpo, que puede hacer daño radiante y emite luz.' },
  devotion_spells: { name: 'Conjuros del juramento de entrega', source: 'Paladín 3 (Juramento de entrega)', passive: true, desc: 'Siempre tienes preparados Escudo de fe y Protección contra el bien y el mal.' },

  // ----- Pícaro -----
  sneak_attack: { name: 'Ataque furtivo', source: 'Pícaro 1', passive: true, desc: 'Una vez por turno infliges daño adicional (1d6; 2d6 a nivel 3) a quien aciertes con un arma sutil o a distancia si tienes ventaja, o si un aliado está junto al objetivo y no tienes desventaja. (Aquí: si tienes ventaja o hay otro aliado consciente).' },
  thieves_cant: { name: 'Jerga de ladrones', source: 'Pícaro 1', passive: true, desc: 'Conoces la jerga secreta de los ladrones y otro idioma.' },
  expertise_rogue: { name: 'Pericia', source: 'Pícaro 1', passive: true, desc: 'Duplicas tu bonificador por competencia en dos habilidades en las que eres competente.' },
  cunning_action: { name: 'Acción astuta', source: 'Pícaro 2', time: 'bonus', desc: 'Como acción adicional puedes correr, destrabarte o esconderte. (Aquí: esconderte te da ventaja en tu próximo ataque si superas la Percepción pasiva de los enemigos).' },
  steady_aim: { name: 'Puntería certera', source: 'Pícaro 3', time: 'bonus', desc: 'Como acción adicional, si no te has movido, te das ventaja en tu siguiente ataque de este turno.' },
  fast_hands: { name: 'Manos rápidas', source: 'Pícaro 3 (Ladrón)', passive: true, desc: 'Como acción adicional puedes usar un objeto, abrir una cerradura o robar. (Aquí: beber o dar una poción es acción adicional).' },
  second_story_work: { name: 'Balconero', source: 'Pícaro 3 (Ladrón)', passive: true, desc: 'Trepas a tu velocidad normal y saltas usando la Destreza.' },
  expertise_ranger: { name: 'Pericia', source: 'Explorador 2', passive: true, desc: 'Duplicas tu bonificador por competencia en una habilidad.' },
  expertise_wizard: { name: 'Pericia (Académico)', source: 'Mago 2', passive: true, desc: 'Duplicas tu bonificador por competencia en una habilidad de saber.' },

  // ----- Especies -----
  darkvision: { name: 'Visión en la oscuridad', source: 'Varias especies', passive: true, desc: 'Ves en la luz tenue como si fuera brillante y en la oscuridad como si fuera tenue (18 m; 36 m para enanos, orcos y drows).' },
  draconic_ancestry: { name: 'Linaje dracónico', source: 'Dracónido', passive: true, desc: 'Desciendes de un dragón: su tipo determina el daño de tu aliento y tu resistencia.' },
  breath_weapon: { name: 'Ataque de aliento', source: 'Dracónido', time: 'action', desc: 'En lugar de un ataque, exhalas energía en un cono de 4,5 m o una línea de 9 m. Cada criatura hace una salvación de Destreza (CD 8 + mod. CON + competencia): 1d10 de daño si falla, la mitad si la supera. Usos: tu bonificador por competencia por descanso largo. (Aquí: 3 objetivos en cono o 2 en línea).' },
  draconic_resistance: { name: 'Resistencia al daño', source: 'Dracónido', passive: true, desc: 'Tienes resistencia al tipo de daño de tu linaje.' },
  elven_lineage: { name: 'Linaje élfico', source: 'Elfo', passive: true, desc: 'Alto elfo: un truco de mago. Drow: Luces danzantes y visión en la oscuridad de 36 m. Elfo de los bosques: Saber druídico y más velocidad. A nivel 3 aprendes un conjuro (Detectar magia, Fuego feérico o Zancada prodigiosa) que puedes lanzar una vez gratis por descanso largo.' },
  fey_ancestry: { name: 'Linaje feérico', source: 'Elfo', passive: true, desc: 'Ventaja en las salvaciones para evitar o terminar el estado de hechizado.' },
  keen_senses: { name: 'Sentidos agudos', source: 'Elfo', passive: true, desc: 'Competencia en Percepción, Perspicacia o Supervivencia.' },
  trance: { name: 'Trance', source: 'Elfo', passive: true, desc: 'No necesitas dormir y la magia no puede dormirte.' },
  stonecunning: { name: 'Afinidad con la piedra', source: 'Enano', passive: true, desc: 'Como acción adicional, sobre piedra, sientes las vibraciones a 18 m durante 10 minutos.' },
  dwarven_toughness: { name: 'Aguante enano', source: 'Enano', passive: true, desc: 'Tus PG máximos aumentan en 1, y en 1 más cada vez que subes de nivel.' },
  dwarven_resilience: { name: 'Resistencia enana', source: 'Enano', passive: true, desc: 'Resistencia al daño de veneno y ventaja en las salvaciones para evitar o terminar el estado de envenenado.' },
  gnomish_cunning: { name: 'Astucia gnoma', source: 'Gnomo', passive: true, desc: 'Ventaja en las salvaciones de Inteligencia, Sabiduría y Carisma.' },
  gnomish_lineage: { name: 'Linaje gnomo', source: 'Gnomo', passive: true, desc: 'Gnomo de las rocas: Prestidigitación y Reparar, y puedes fabricar pequeños mecanismos. Gnomo de los bosques: Ilusión menor y Hablar con los animales.' },
  giant_ancestry: { name: 'Linaje gigante', source: 'Goliat', passive: true, desc: 'Un don de tus antepasados gigantes, usable tantas veces como tu competencia por descanso largo. Fuego: +1d10 de fuego al acertar. Escarcha: +1d6 de frío y ralentiza. Colinas: derribas al acertar. Piedra: reacción para reducir el daño 1d12 + mod. CON. Tormenta: reacción, 1d8 de trueno a quien te daña. Nubes: te teletransportas 9 m. (Aquí: se usa solo, una vez por turno).' },
  powerful_build: { name: 'Constitución poderosa', source: 'Goliat', passive: true, desc: 'Ventaja para escapar de agarres y cuentas como una talla más para cargar peso.' },
  resourceful: { name: 'Ingenioso', source: 'Humano', passive: true, desc: 'Obtienes inspiración heroica tras un descanso largo: puedes repetir una tirada de d20. (Aquí: se usa sola en la primera tirada de ataque o salvación fallida por poco).' },
  skillful: { name: 'Diestro', source: 'Humano', passive: true, desc: 'Competencia en una habilidad de tu elección.' },
  versatile: { name: 'Versátil', source: 'Humano', passive: true, desc: 'Obtienes una dote de origen de tu elección.' },
  brave: { name: 'Valiente', source: 'Mediano', passive: true, desc: 'Ventaja en las salvaciones para evitar o terminar el estado de asustado.' },
  halfling_nimbleness: { name: 'Agilidad de mediano', source: 'Mediano', passive: true, desc: 'Puedes moverte a través del espacio de criaturas más grandes que tú.' },
  luck: { name: 'Fortuna', source: 'Mediano', passive: true, desc: 'Cuando sacas un 1 en una prueba con d20, repites la tirada y usas el nuevo resultado.' },
  naturally_stealthy: { name: 'Sigiloso por naturaleza', source: 'Mediano', passive: true, desc: 'Puedes esconderte detrás de criaturas más grandes que tú.' },
  adrenaline_rush: { name: 'Descarga de adrenalina', source: 'Orco', time: 'bonus', desc: 'Como acción adicional corres y ganas PG temporales iguales a tu competencia. Usos: tu competencia por descanso corto.' },
  relentless_endurance: { name: 'Aguante incansable', source: 'Orco', passive: true, desc: 'Cuando caes a 0 PG sin morir, puedes quedarte con 1 PG. Una vez por descanso largo.' },
  fiendish_legacy: { name: 'Legado infernal', source: 'Tiefling', passive: true, desc: 'Abisal: resistencia al veneno y Rociada venenosa (nivel 3: Rayo nauseabundo). Ctónico: resistencia al daño necrótico y Toque helado (nivel 3: Falsa vida). Infernal: resistencia al fuego y Descarga de fuego (nivel 3: Reprensión infernal). El conjuro de nivel 3 se lanza una vez gratis por descanso largo.' },
  otherworldly_presence: { name: 'Presencia sobrenatural', source: 'Tiefling', passive: true, desc: 'Conoces el truco Taumaturgia.' },
};
