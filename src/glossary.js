// Construye el glosario (JSON) a partir de los mismos datos que usa el motor.
const SKILLS = require('./data/skills');
const CONDITIONS = require('./data/conditions');
const SPELLS = require('./data/spells');
const ITEMS = require('./data/items');
const FEATURES = require('./data/features');
const MONSTERS = require('./data/monsters');
const RACES = require('./data/races');
const CLASSES = require('./data/classes');
const BACKGROUNDS = require('./data/backgrounds');
const { ABILITIES } = require('./rules');

const RULES = [
  { name: 'Prueba de característica', desc: 'Tira 1d20 + el modificador de la característica (+ tu bonificador por competencia si eres competente en la habilidad). Si igualas o superas la Clase de Dificultad (CD), tienes éxito. CD orientativas: muy fácil 5, fácil 10, media 15, difícil 20, muy difícil 25.' },
  { name: 'Ventaja y desventaja', desc: 'Con ventaja tiras dos d20 y te quedas con el mayor; con desventaja, con el menor. Si tienes ambas a la vez se anulan y tiras un solo d20.' },
  { name: 'Bonificador por competencia', desc: '+2 en los niveles 1-4, +3 en 5-8, +4 en 9-12, +5 en 13-16 y +6 en 17-20. Se suma a ataques con armas que dominas, habilidades y salvaciones en las que eres competente, y a la CD de tus conjuros.' },
  { name: 'Prueba de grupo', desc: 'Cuando todo el grupo intenta algo a la vez, cada uno tira; si al menos la mitad tiene éxito, el grupo entero tiene éxito.' },
  { name: 'Iniciativa', desc: 'Al empezar un combate, cada participante tira 1d20 + su modificador de Destreza. Se actúa de mayor a menor.' },
  { name: 'Sorpresa', desc: 'Una criatura que no percibe una amenaza al inicio del combate está sorprendida: no puede moverse ni actuar en su primer turno.' },
  { name: 'Tu turno', desc: 'En tu turno puedes moverte, realizar una acción (Atacar, Lanzar un conjuro, Esquivar, Ayudar, Usar un objeto...) y, si tienes algo que lo permita, una acción adicional. Tienes una reacción por asalto.' },
  { name: 'Tirada de ataque', desc: '1d20 + modificador de característica + competencia. Si igualas o superas la Clase de Armadura (CA) del objetivo, impactas. Un 20 natural es un crítico (impacta siempre y duplicas los dados de daño); un 1 natural falla siempre.' },
  { name: 'Armas sutiles y a distancia', desc: 'Las armas sutiles permiten usar Fuerza o Destreza para atacar y dañar. Las armas a distancia usan Destreza.' },
  { name: 'Conjuros y espacios', desc: 'Los trucos se lanzan a voluntad. Los conjuros de nivel 1 o superior gastan un espacio de conjuro de ese nivel o superior; los espacios se recuperan con un descanso largo. Si lanzas un conjuro con acción adicional, la única otra magia que puedes lanzar ese turno es un truco de 1 acción.' },
  { name: 'Concentración', desc: 'Algunos conjuros requieren concentración: solo puedes mantener uno a la vez. Si recibes daño, haz una salvación de Constitución (CD 10 o la mitad del daño, lo que sea mayor) o pierdes el conjuro.' },
  { name: 'Salvación de conjuro', desc: 'CD = 8 + bonificador por competencia + modificador de la característica para lanzar conjuros. Ataque de conjuro = competencia + ese mismo modificador.' },
  { name: 'Caer a 0 puntos de golpe', desc: 'Quedas inconsciente. Al inicio de cada uno de tus turnos haces una salvación contra muerte (d20): 10 o más es un éxito; menos, un fallo. Con 3 éxitos quedas estable; con 3 fallos mueres. Un 1 cuenta como dos fallos y un 20 te devuelve 1 PG. Recibir daño a 0 PG es un fallo (dos si es crítico). Si el daño sobrante iguala tu máximo de PG, mueres al instante.' },
  { name: 'Descanso corto', desc: 'Al menos una hora de pausa. Puedes gastar dados de golpe: tira cada uno y suma tu modificador de Constitución para recuperar PG. Algunos rasgos (Tomar aliento, Acción súbita, Canalizar divinidad) se recuperan.' },
  { name: 'Descanso largo', desc: 'Al menos 8 horas. Recuperas todos los PG, todos los espacios de conjuro y la mitad de tus dados de golpe gastados.' },
  { name: 'Experiencia y nivel', desc: 'Ganas puntos de experiencia (PX) al superar enemigos y desafíos. Nivel 2: 300 PX. Nivel 3: 900 PX. Nivel 4: 2.700 PX. Nivel 5: 6.500 PX. Al subir de nivel ganas PG (dado de golpe + CON) y nuevos rasgos o conjuros.' },
  { name: 'Regla de la casa: segunda oportunidad', desc: 'Para que la primera partida no sea demasiado cruel: si el grupo gana un combate, quien haya muerto vuelve con 1 PG y un nivel de agotamiento. Si cae todo el grupo, se repite la escena desde el principio.' },
];

function build() {
  return {
    rules: RULES,
    abilities: Object.entries(ABILITIES).map(([k, a]) => ({ id: k, name: a.name, short: a.short })),
    skills: Object.entries(SKILLS).map(([id, s]) => ({ id, name: s.name, tag: ABILITIES[s.ability].name, desc: s.desc })),
    features: Object.entries(FEATURES).map(([id, f]) => ({ id, name: f.name, tag: f.source, passive: !!f.passive, desc: f.desc })),
    items: Object.entries(ITEMS).map(([id, i]) => ({
      id, name: i.name, tag: i.category, magic: !!i.magic,
      desc: [i.desc, i.dmg ? `Daño: ${i.dmg} ${i.type}.` : '', i.props && i.props !== '—' ? `Propiedades: ${i.props}.` : '', i.ac ? `CA: ${i.ac}.` : '', i.cost ? `Precio: ${i.cost}.` : '', i.weight ? `Peso: ${i.weight}.` : ''].filter(Boolean).join(' '),
    })),
    spells: Object.entries(SPELLS).map(([id, s]) => ({
      id, name: s.name, level: s.level, tag: `${s.level === 0 ? 'Truco' : `Nivel ${s.level}`} · ${s.school}${s.conc ? ' · Concentración' : ''}${s.ritual ? ' · Ritual' : ''}`,
      meta: `Tiempo: ${{ action: '1 acción', bonus: '1 acción adicional', reaction: '1 reacción' }[s.time]} · Alcance: ${s.range} · Componentes: ${s.components} · Duración: ${s.duration} · Clases: ${s.classes.join(', ')}`,
      desc: s.desc,
    })),
    races: Object.entries(RACES).filter(([id]) => id !== 'ANCESTRIES').map(([id, r]) => ({
      id, name: r.name, tag: Object.entries(r.bonus).map(([k, v]) => `${ABILITIES[k].short} +${v}`).join(', ') + (r.plus1 ? `, +1 a ${r.plus1} a elegir` : ''),
      meta: `Rasgos: ${r.features.map((f) => (FEATURES[f] ? FEATURES[f].name : f)).join(', ')}`,
      desc: r.desc + (r.ancestry ? ` Linajes: ${Object.values(RACES.ANCESTRIES).map((a) => `${a.name} (${a.type})`).join(', ')}.` : ''),
    })),
    classes: Object.entries(CLASSES).map(([id, c]) => ({
      id, name: c.name, tag: `Dado de golpe d${c.hitDie} · ${c.subclass}`,
      meta: `Salvaciones: ${c.saves.map((k) => ABILITIES[k].name).join(' y ')} · Habilidades: ${c.skillChoices} a elegir entre ${c.skillList.map((k) => SKILLS[k].name).join(', ')}`,
      desc: `${c.desc} ${c.role}. Rasgos: ${Object.entries(c.features).map(([l, list]) => `nivel ${l}: ${list.map((f) => FEATURES[f].name).join(', ')}`).join('; ')}.`,
    })),
    backgrounds: Object.entries(BACKGROUNDS).map(([id, b]) => ({
      id, name: b.name, tag: `Habilidades: ${b.skills.map((k) => SKILLS[k].name).join(', ')}`,
      desc: `${b.desc} Equipo: ${Object.keys(b.items).map((k) => ITEMS[k].name).join(', ')}.`,
    })),
    conditions: Object.entries(CONDITIONS).map(([id, c]) => ({ id, name: c.name, tag: c.effect ? 'Efecto de juego' : 'Condición', desc: c.desc })),
    monsters: Object.entries(MONSTERS).map(([id, m]) => ({
      id, name: m.name, tag: `${m.size} ${m.type} · VD ${m.cr}`,
      meta: `CA ${m.ac} · PG ${m.avgHp} (${m.hp}) · Velocidad ${m.speed} · FUE ${m.abilities.str} DES ${m.abilities.dex} CON ${m.abilities.con} INT ${m.abilities.int} SAB ${m.abilities.wis} CAR ${m.abilities.cha}`,
      desc: `${m.desc} Ataques: ${m.attacks.map((a) => `${a.name} (+${a.bonus}, ${a.dmg} ${a.type})`).join('; ')}. ${m.traits.join(' ')}`,
    })),
  };
}

module.exports = { build };
