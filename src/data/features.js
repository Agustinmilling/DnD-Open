// Rasgos de clase y de raza (pasivas y activas) del SRD 5.1 usados en el prototipo.
// uses: 'short' = se recupera en descanso corto, 'long' = descanso largo
module.exports = {
  // ----- Guerrero -----
  fighting_style_defense: { name: 'Estilo de combate: Defensa', source: 'Guerrero 1', passive: true, desc: 'Mientras lleves armadura, obtienes +1 a la CA.' },
  second_wind: { name: 'Tomar aliento', source: 'Guerrero 1', uses: 'short', time: 'bonus', desc: 'Como acción adicional, recuperas 1d10 + tu nivel de guerrero en puntos de golpe. Una vez usado, necesitas un descanso corto o largo para volver a usarlo.' },
  action_surge: { name: 'Acción súbita', source: 'Guerrero 2', uses: 'short', time: 'free', desc: 'En tu turno puedes realizar una acción adicional además de tu acción normal. Se recupera con un descanso corto o largo.' },
  improved_critical: { name: 'Crítico mejorado', source: 'Guerrero 3 (Campeón)', passive: true, desc: 'Tus ataques con arma son críticos con un resultado de 19 o 20 en el d20.' },
  // ----- Pícaro -----
  expertise: { name: 'Pericia', source: 'Pícaro 1', passive: true, desc: 'Elige dos habilidades en las que seas competente: tu bonificador por competencia se duplica en cualquier prueba que hagas con ellas.' },
  sneak_attack: { name: 'Ataque furtivo', source: 'Pícaro 1', passive: true, desc: 'Una vez por turno, infliges daño adicional (1d6 a nivel 1, 2d6 a nivel 3) a una criatura que impactes con un arma sutil o a distancia si tienes ventaja en la tirada, o si otro enemigo del objetivo está a 5 pies de él y no tienes desventaja. (Aquí: si tienes ventaja o hay otro aliado consciente en el combate).' },
  thieves_cant: { name: 'Jerga de ladrones', source: 'Pícaro 1', passive: true, desc: 'Conoces la mezcla secreta de dialecto, jerga y códigos que permite esconder mensajes en conversaciones aparentemente normales.' },
  cunning_action: { name: 'Acción astuta', source: 'Pícaro 2', time: 'bonus', desc: 'Puedes usar una acción adicional en cada uno de tus turnos para Correr, Destrabarte o Esconderte. (Aquí: Esconderte te da ventaja en tu próximo ataque si superas la Percepción pasiva de los enemigos).' },
  fast_hands: { name: 'Manos rápidas', source: 'Pícaro 3 (Ladrón)', passive: true, desc: 'Puedes usar tu Acción astuta para hacer una prueba de Destreza (Juego de manos), usar herramientas de ladrón o la acción Usar un objeto. (Aquí: beber o dar una poción es acción adicional).' },
  second_story_work: { name: 'Trabajo de segundo piso', source: 'Pícaro 3 (Ladrón)', passive: true, desc: 'Trepar no te cuesta movimiento adicional y tus saltos con carrera llegan más lejos.' },
  // ----- Clérigo -----
  spellcasting_cleric: { name: 'Lanzamiento de conjuros (clérigo)', source: 'Clérigo 1', passive: true, desc: 'Lanzas conjuros divinos usando Sabiduría. CD de salvación = 8 + competencia + mod. SAB. Ataque de conjuro = competencia + mod. SAB.' },
  disciple_of_life: { name: 'Discípulo de la vida', source: 'Clérigo 1 (Dominio de la Vida)', passive: true, desc: 'Tus conjuros de curación de nivel 1 o superior restauran 2 + el nivel del conjuro puntos de golpe adicionales.' },
  heavy_armor_life: { name: 'Competencia adicional', source: 'Clérigo 1 (Dominio de la Vida)', passive: true, desc: 'Obtienes competencia con armadura pesada.' },
  channel_divinity: { name: 'Canalizar divinidad', source: 'Clérigo 2', uses: 'short', time: 'action', desc: 'Una vez por descanso corto puedes canalizar energía divina. Opciones: Expulsar muertos vivientes (cada muerto viviente que falle una salvación de SAB queda expulsado: huye y no puede actuar hasta recibir daño) o Preservar la vida (repartes 5 × tu nivel de clérigo en curación entre aliados, sin superar la mitad de sus PG máximos).' },
  // ----- Mago -----
  spellcasting_wizard: { name: 'Lanzamiento de conjuros (mago)', source: 'Mago 1', passive: true, desc: 'Lanzas conjuros arcanos usando Inteligencia. CD de salvación = 8 + competencia + mod. INT. Ataque de conjuro = competencia + mod. INT.' },
  arcane_recovery: { name: 'Recuperación arcana', source: 'Mago 1', uses: 'long', desc: 'Una vez al día, al terminar un descanso corto, recuperas espacios de conjuro gastados cuya suma de niveles no supere la mitad de tu nivel de mago (redondeando hacia arriba).' },
  evocation_savant: { name: 'Sabio de la evocación', source: 'Mago 2 (Evocación)', passive: true, desc: 'El oro y el tiempo necesarios para copiar un conjuro de evocación en tu libro se reducen a la mitad.' },
  sculpt_spells: { name: 'Esculpir conjuros', source: 'Mago 2 (Evocación)', passive: true, desc: 'Cuando lanzas un conjuro de evocación de área, tus aliados pueden superar automáticamente la salvación y no sufren daño.' },
  // ----- Rasgos raciales -----
  darkvision: { name: 'Visión en la oscuridad', source: 'Enano, Elfo', passive: true, desc: 'Ves en luz tenue a 60 pies como si fuera brillante, y en la oscuridad como si fuera luz tenue (sin colores).' },
  dwarven_resilience: { name: 'Resistencia enana', source: 'Enano', passive: true, desc: 'Ventaja en salvaciones contra veneno y resistencia al daño de veneno.' },
  dwarven_toughness: { name: 'Dureza enana', source: 'Enano de las colinas', passive: true, desc: 'Tus puntos de golpe máximos aumentan en 1, y en 1 más cada vez que subes de nivel.' },
  stonecunning: { name: 'Afinidad con la piedra', source: 'Enano', passive: true, desc: 'Al hacer una prueba de Historia sobre el origen de una obra de piedra, se te considera competente y duplicas tu bonificador por competencia.' },
  lucky: { name: 'Afortunado', source: 'Mediano', passive: true, desc: 'Cuando sacas un 1 en el d20 de una tirada de ataque, prueba de característica o salvación, puedes volver a tirar y debes usar el nuevo resultado.' },
  brave: { name: 'Valiente', source: 'Mediano', passive: true, desc: 'Ventaja en salvaciones contra quedar asustado.' },
  halfling_nimbleness: { name: 'Agilidad mediana', source: 'Mediano', passive: true, desc: 'Puedes moverte a través del espacio de cualquier criatura de un tamaño mayor que el tuyo.' },
  naturally_stealthy: { name: 'Sigiloso por naturaleza', source: 'Mediano piesligeros', passive: true, desc: 'Puedes intentar esconderte incluso cuando solo te oculta una criatura al menos un tamaño mayor que tú.' },
  keen_senses: { name: 'Sentidos agudos', source: 'Elfo', passive: true, desc: 'Eres competente en la habilidad Percepción.' },
  fey_ancestry: { name: 'Linaje feérico', source: 'Elfo', passive: true, desc: 'Ventaja en salvaciones contra ser hechizado, y la magia no puede dormirte. (Además, los elfos son inmunes a la parálisis del necrófago).' },
  trance: { name: 'Trance', source: 'Elfo', passive: true, desc: 'No necesitas dormir: meditas 4 horas al día y obtienes el mismo beneficio que un humano con 8 horas de sueño.' },
  human_versatility: { name: 'Versatilidad humana', source: 'Humano', passive: true, desc: 'Todas tus puntuaciones de característica aumentan en 1.' },
};
