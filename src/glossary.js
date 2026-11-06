// Construye el glosario (JSON) a partir de los mismos datos que usa el motor.
// Reglas de 2024 (SRD 5.2.1, CC BY 4.0).
const SKILLS = require('./data/skills');
const CONDITIONS = require('./data/conditions');
const SPELLS = require('./data/spells');
const ITEMS = require('./data/items');
const FEATURES = require('./data/features');
const MONSTERS = require('./data/monsters');
const SPECIES = require('./data/species');
const CLASSES = require('./data/classes');
const BACKGROUNDS = require('./data/backgrounds');
const { MASTERY, MASTERY_DESC } = require('./data/masteries');
const { ABILITIES } = require('./rules');

const RULES = [
  { name: 'Prueba d20', desc: 'Las pruebas de característica, las tiradas de salvación y las tiradas de ataque son pruebas d20: tira 1d20, suma el modificador de la característica y tu bonificador por competencia si eres competente. Si igualas o superas la Clase de Dificultad (CD) o la Clase de Armadura (CA), tienes éxito. CD orientativas: muy fácil 5, fácil 10, media 15, difícil 20, muy difícil 25.' },
  { name: 'Ventaja y desventaja', desc: 'Con ventaja tiras dos d20 y te quedas con el mayor; con desventaja, con el menor. Si tienes ambas a la vez se anulan y tiras un solo d20.' },
  { name: 'Bonificador por competencia', desc: '+2 en los niveles 1-4, +3 en 5-8, +4 en 9-12, +5 en 13-16 y +6 en 17-20. Se suma a ataques con armas que dominas, habilidades y salvaciones en las que eres competente, y a la CD de tus conjuros.' },
  { name: 'Pericia', desc: 'En las habilidades con pericia sumas el doble de tu bonificador por competencia.' },
  { name: 'Creación de personaje', desc: 'Eliges clase, trasfondo y especie. El trasfondo te da tres características para mejorar (+2 a una y +1 a otra, o +1 a las tres, sin pasar de 20), dos habilidades, una dote de origen y equipo. La especie te da rasgos como visión en la oscuridad, resistencias o magia innata.' },
  { name: 'Dotes de origen', desc: 'Cada trasfondo concede una dote de nivel 1: Alerta, Atacante salvaje, Habilidoso o Iniciado en la magia. Los humanos eligen además otra dote de origen.' },
  { name: 'Inspiración heroica', desc: 'Si tienes inspiración heroica, puedes gastarla para repetir un dado de una prueba d20 y quedarte con el nuevo resultado. Los humanos la recuperan con cada descanso largo.' },
  { name: 'Prueba de grupo', desc: 'Cuando todo el grupo intenta algo a la vez, cada uno tira; si al menos la mitad tiene éxito, el grupo entero tiene éxito.' },
  { name: 'Iniciativa', desc: 'Al empezar un combate, cada participante tira 1d20 + su modificador de Destreza (la dote Alerta suma también el bonificador por competencia). Se actúa de mayor a menor.' },
  { name: 'Sorpresa', desc: 'Una criatura sorprendida al empezar el combate tira la iniciativa con desventaja. En este juego, además, pierde su primer turno.' },
  { name: 'Tu turno', desc: 'En tu turno puedes moverte y realizar una acción: Atacar, Lanzar un conjuro, Esquivar, Ayudar, Esconderse, Usar un objeto... Si algún rasgo o conjuro te lo permite, también una acción adicional. Tienes una reacción por asalto.' },
  { name: 'Tirada de ataque', desc: '1d20 + modificador de característica + competencia. Si igualas o superas la CA del objetivo, impactas. Un 20 natural es un crítico (impacta siempre y duplicas los dados de daño); un 1 natural falla siempre.' },
  { name: 'Armas sutiles, ligeras y a distancia', desc: 'Las armas sutiles permiten usar Fuerza o Destreza. Las armas a distancia usan Destreza. Si atacas con un arma ligera, puedes hacer un ataque extra con otra arma ligera como acción adicional (sin sumar tu modificador al daño, salvo que sea negativo).' },
  { name: 'Maestría de armas', desc: 'Algunas clases (bárbaro, guerrero, paladín, explorador y pícaro) dominan la propiedad de maestría de ciertas armas y obtienen su efecto especial al usarlas: Debilitar, Molestar, Derribar, Empujar, Ralentizar, Hendir, Rozar o Mellar. Consulta la pestaña de reglas para cada una.' },
  { name: 'Esconderse', desc: 'Con la acción de Esconderse haces una prueba de Destreza (Sigilo) CD 15. Si tienes éxito, quedas invisible hasta que ataques, hagas ruido o te encuentren. Tu siguiente ataque tiene ventaja.' },
  { name: 'Empujar o derribar', desc: 'Puedes sustituir un ataque por un empujón: el objetivo debe superar una salvación de Fuerza o Destreza (a su elección) con CD 8 + tu modificador de Fuerza + tu bonificador por competencia, o queda derribado.' },
  { name: 'Pociones', desc: 'Beber una poción es una acción adicional. Dársela a otra criatura es una acción.' },
  { name: 'Conjuros y espacios', desc: 'Los trucos se lanzan a voluntad. Los conjuros de nivel 1 o superior gastan un espacio de ese nivel o superior; los espacios se recuperan con un descanso largo (los del brujo, con uno corto). Solo puedes gastar un espacio de conjuro por turno.' },
  { name: 'Conjuros preparados', desc: 'Cada clase lanzadora prepara un número fijo de conjuros de su lista. Los conjuros que te dan la especie, el trasfondo o la subclase están siempre preparados y no cuentan.' },
  { name: 'Concentración', desc: 'Algunos conjuros requieren concentración: solo puedes mantener uno a la vez. Si recibes daño, haz una salvación de Constitución (CD 10 o la mitad del daño, lo que sea mayor, hasta un máximo de 30) o pierdes el conjuro.' },
  { name: 'Salvación de conjuro', desc: 'CD = 8 + bonificador por competencia + modificador de la característica para lanzar conjuros. Ataque de conjuro = competencia + ese mismo modificador.' },
  { name: 'Caer a 0 puntos de golpe', desc: 'Quedas inconsciente. Al inicio de cada uno de tus turnos haces una salvación contra muerte (d20): 10 o más es un éxito; menos, un fallo. Con 3 éxitos quedas estable; con 3 fallos mueres. Un 1 cuenta como dos fallos y un 20 te devuelve 1 PG. Recibir daño a 0 PG es un fallo (dos si es crítico). Si el daño sobrante iguala tu máximo de PG, mueres al instante.' },
  { name: 'Agotamiento', desc: 'Cada nivel de agotamiento resta 2 a tus pruebas d20 y 1,5 m a tu velocidad. Con 6 niveles mueres. Un descanso largo quita un nivel.' },
  { name: 'Descanso corto', desc: 'Al menos una hora de pausa. Puedes gastar dados de golpe: tira cada uno y suma tu modificador de Constitución para recuperar PG. Algunos rasgos (Tomar aliento, Acción súbita, Canalizar divinidad, la magia del brujo) se recuperan.' },
  { name: 'Descanso largo', desc: 'Al menos 8 horas. Recuperas todos los PG, todos los espacios de conjuro y todos tus dados de golpe, y pierdes un nivel de agotamiento.' },
  { name: 'Experiencia y nivel', desc: 'Ganas puntos de experiencia (PX) al superar enemigos y desafíos. Nivel 2: 300 PX. Nivel 3: 900 PX. Nivel 4: 2.700 PX. Al subir de nivel ganas PG (dado de golpe + CON) y nuevos rasgos o conjuros. En el nivel 3 eliges subclase.' },
  { name: 'Regla de la casa: segunda oportunidad', desc: 'Para que la primera partida no sea demasiado cruel: si el grupo gana un combate, quien haya muerto vuelve con 1 PG y un nivel de agotamiento. Si cae todo el grupo, se repite la escena desde el principio.' },
  { name: 'Licencia', desc: 'Las reglas, clases, especies, conjuros y monstruos proceden del System Reference Document 5.2.1 de Wizards of the Coast, publicado bajo licencia Creative Commons Attribution 4.0 (CC BY 4.0). Las aventuras y el texto narrativo son originales de este proyecto.' },
].concat(Object.keys(MASTERY).map((k) => ({ name: `Maestría: ${MASTERY[k]}`, desc: MASTERY_DESC[k] })));

const TIME = { action: '1 acción', bonus: '1 acción adicional', reaction: '1 reacción', minute: '1 minuto' };
const fname = (f) => (FEATURES[f] ? FEATURES[f].name : f);
const skillListTxt = (l) => (l === 'any' ? 'cualquiera' : l.map((k) => SKILLS[k].name).join(', '));
function attackTxt(a) {
  const parts = [];
  if (a.dmg) parts.push(`${a.bonus != null ? `+${a.bonus}, ` : ''}${a.dmg} ${a.type}${a.bonusDmg ? ` + ${a.bonusDmg.dmg} ${a.bonusDmg.type}` : ''}`);
  if (a.area) {
    const ar = a.area;
    parts.push(`salvación de ${ABILITIES[ar.save].name} CD ${ar.dc}${ar.dmg ? `, ${ar.dmg} ${ar.type}${ar.half ? ' (mitad si la supera)' : ''}` : ''}${ar.cond && CONDITIONS[ar.cond.key] ? `, ${CONDITIONS[ar.cond.key].name.toLowerCase()}` : ''}`);
  }
  if (a.recharge) parts.push(`recarga ${a.recharge}-6`);
  if (a.uses) parts.push(`${a.uses}/combate`);
  return `${a.name} (${parts.join('; ')})`;
}

function build() {
  return {
    rules: RULES,
    abilities: Object.entries(ABILITIES).map(([k, a]) => ({ id: k, name: a.name, short: a.short })),
    skills: Object.entries(SKILLS).map(([id, s]) => ({ id, name: s.name, tag: ABILITIES[s.ability].name, desc: s.desc })),
    features: Object.entries(FEATURES).map(([id, f]) => ({ id, name: f.name, tag: f.source, passive: !!f.passive, desc: f.desc })),
    items: Object.entries(ITEMS).map(([id, i]) => ({
      id, name: i.name, tag: i.category, magic: !!i.magic,
      desc: [i.desc, i.dmg ? `Daño: ${i.dmg} ${i.type}.` : '', i.props && i.props !== '—' ? `Propiedades: ${i.props}.` : '', i.mastery ? `Maestría: ${MASTERY[i.mastery]} (${MASTERY_DESC[i.mastery]})` : '', i.ac ? `CA: ${i.ac}.` : '', i.cost ? `Precio: ${i.cost}.` : '', i.weight ? `Peso: ${i.weight}.` : ''].filter(Boolean).join(' '),
    })),
    spells: Object.entries(SPELLS).map(([id, s]) => ({
      id, name: s.name, level: s.level, tag: `${s.level === 0 ? 'Truco' : `Nivel ${s.level}`} · ${s.school}${s.conc ? ' · Concentración' : ''}${s.ritual ? ' · Ritual' : ''}`,
      meta: `Tiempo: ${TIME[s.time] || s.time} · Alcance: ${s.range} · Duración: ${s.duration}${s.classes && s.classes.length ? ` · Clases: ${s.classes.join(', ')}` : ''}`,
      desc: s.desc,
    })),
    species: Object.entries(SPECIES).map(([id, r]) => ({
      id, name: r.name, tag: `Velocidad ${String(r.speed).replace('.', ',')} m`,
      meta: `Rasgos: ${r.features.map(fname).join(', ')}`,
      desc: r.desc + (r.lineages ? ` ${r.lineageLabel || 'Linajes'}: ${Object.values(r.lineages).map((l) => `${l.name}${l.type ? ` (${l.type})` : ''}${l.desc ? `: ${l.desc.replace(/\.$/, '')}` : ''}`).join(r.lineages[Object.keys(r.lineages)[0]].desc ? '. ' : ', ')}.` : ''),
    })),
    classes: Object.entries(CLASSES).map(([id, c]) => ({
      id, name: c.name, tag: `Dado de golpe d${c.hitDie} · ${c.subclass}`,
      meta: `Característica principal: ${ABILITIES[c.primary].name} · Salvaciones: ${c.saves.map((k) => ABILITIES[k].name).join(' y ')} · Armaduras: ${c.armorTraining || 'ninguna'} · Armas: ${c.weaponTraining} · Habilidades: ${c.skillChoices} a elegir entre ${skillListTxt(c.skillList)}`,
      desc: `${c.desc} ${c.role}. Rasgos: ${Object.entries(c.features).map(([l, list]) => `nivel ${l}: ${list.map(fname).join(', ')}`).join('; ')}.`,
    })),
    backgrounds: Object.entries(BACKGROUNDS).map(([id, b]) => {
      const feat = BACKGROUNDS.ORIGIN_FEATS[b.feat];
      return {
        id, name: b.name, tag: `${b.abilities.map((k) => ABILITIES[k].short).join(', ')} · ${feat.name}${b.featList ? ` (${BACKGROUNDS.MI_LIST_NAMES[b.featList]})` : ''}`,
        meta: `Características: ${b.abilities.map((k) => ABILITIES[k].name).join(', ')} · Habilidades: ${b.skills.map((k) => SKILLS[k].name).join(', ')} · Dote de origen: ${feat.name}`,
        desc: `${b.desc} Equipo: ${Object.keys(b.items).map((k) => ITEMS[k].name).join(', ')}.`,
      };
    }),
    feats: Object.entries(BACKGROUNDS.ORIGIN_FEATS).map(([id, f]) => ({ id, name: f.name, tag: 'Dote de origen', desc: fdesc(f.feature) })),
    conditions: Object.entries(CONDITIONS).map(([id, c]) => ({ id, name: c.name, tag: c.effect ? 'Efecto de juego' : 'Condición', desc: c.desc })),
    monsters: Object.entries(MONSTERS).map(([id, m]) => ({
      id, name: m.name, tag: `${m.size} ${m.type} · VD ${m.cr}`,
      meta: `CA ${m.ac} · PG ${m.avgHp} (${m.hp}) · Velocidad ${m.speed} · FUE ${m.abilities.str} DES ${m.abilities.dex} CON ${m.abilities.con} INT ${m.abilities.int} SAB ${m.abilities.wis} CAR ${m.abilities.cha}`,
      desc: `${m.desc} Acciones: ${m.attacks.map(attackTxt).join('; ')}. ${m.traits.join(' ')}`,
    })),
  };
}
const fdesc = (id) => (FEATURES[id] ? FEATURES[id].desc : '');

module.exports = { build };
