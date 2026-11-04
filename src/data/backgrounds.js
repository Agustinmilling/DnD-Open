// Trasfondos: dos competencias en habilidades y un pequeño objeto. (El Acólito es el del SRD 5.1;
// el resto son trasfondos genéricos de este proyecto con la misma estructura.)
module.exports = {
  acolyte: { name: 'Acólito', skills: ['insight', 'religion'], items: { holy_symbol: 1 }, desc: 'Serviste en un templo y conoces sus ritos.' },
  soldier: { name: 'Soldado', skills: ['athletics', 'intimidation'], items: { rations: 1 }, desc: 'Llevaste uniforme y sabes lo que es una guerra.' },
  criminal: { name: 'Criminal', skills: ['deception', 'stealth'], items: { thieves_tools: 1 }, desc: 'Tienes contactos en los bajos fondos.' },
  sage: { name: 'Sabio', skills: ['arcana', 'history'], items: { torch: 1 }, desc: 'Pasaste años entre libros y pergaminos.' },
  outlander: { name: 'Forastero', skills: ['athletics', 'survival'], items: { rations: 2 }, desc: 'Creciste lejos de las ciudades, en tierras salvajes.' },
  entertainer: { name: 'Artista', skills: ['acrobatics', 'performance'], items: { rations: 1 }, desc: 'Te ganas la vida sobre un escenario.' },
  folk_hero: { name: 'Héroe del pueblo', skills: ['animal', 'survival'], items: { rope: 1 }, desc: 'Plantaste cara a un tirano y tu aldea no lo olvida.' },
  noble: { name: 'Noble', skills: ['history', 'persuasion'], items: { potion_healing: 1 }, desc: 'Naciste con título, privilegios y obligaciones.' },
  charlatan: { name: 'Charlatán', skills: ['deception', 'sleight'], items: { rations: 1 }, desc: 'Vives de vender humo con mucha labia.' },
  urchin: { name: 'Huérfano de la calle', skills: ['sleight', 'stealth'], items: { rations: 1 }, desc: 'Sobreviviste solo en las calles de una gran ciudad.' },
  hermit: { name: 'Ermitaño', skills: ['medicine', 'religion'], items: { healers_kit: 1 }, desc: 'Viviste apartado del mundo, buscando una verdad.' },
  sailor: { name: 'Marinero', skills: ['athletics', 'perception'], items: { rope: 1 }, desc: 'Has navegado mares tranquilos y tormentas.' },
};
