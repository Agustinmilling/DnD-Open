// Objetos del SRD 5.1. Armas: dmg, type, props, finesse, ranged.
module.exports = {
  // ---------- Armas ----------
  dagger: { name: 'Daga', category: 'Arma sencilla cuerpo a cuerpo', cost: '2 po', weight: '1 lb', dmg: '1d4', type: 'perforante', finesse: true, props: 'Sutil, ligera, arrojadiza (20/60)', desc: 'Hoja corta y fácil de esconder.' },
  mace: { name: 'Maza', category: 'Arma sencilla cuerpo a cuerpo', cost: '5 po', weight: '4 lb', dmg: '1d6', type: 'contundente', props: '—', desc: 'Cabeza de metal pesada sobre un mango.' },
  quarterstaff: { name: 'Bastón', category: 'Arma sencilla cuerpo a cuerpo', cost: '2 pp', weight: '4 lb', dmg: '1d6', type: 'contundente', props: 'Versátil (1d8)', desc: 'Vara larga de madera dura.' },
  light_crossbow: { name: 'Ballesta ligera', category: 'Arma sencilla a distancia', cost: '25 po', weight: '5 lb', dmg: '1d8', type: 'perforante', ranged: true, props: 'Munición (80/320), carga, a dos manos', desc: 'Dispara virotes con un mecanismo de gatillo.' },
  shortbow: { name: 'Arco corto', category: 'Arma sencilla a distancia', cost: '25 po', weight: '2 lb', dmg: '1d6', type: 'perforante', ranged: true, props: 'Munición (80/320), a dos manos', desc: 'Arco compacto, cómodo en espacios estrechos.' },
  javelin: { name: 'Jabalina', category: 'Arma sencilla cuerpo a cuerpo', cost: '5 pp', weight: '2 lb', dmg: '1d6', type: 'perforante', ranged: true, props: 'Arrojadiza (30/120)', desc: 'Lanza ligera pensada para arrojarse.' },
  longsword: { name: 'Espada larga', category: 'Arma marcial cuerpo a cuerpo', cost: '15 po', weight: '3 lb', dmg: '1d8', type: 'cortante', props: 'Versátil (1d10)', desc: 'La espada clásica de caballeros y soldados.' },
  shortsword: { name: 'Espada corta', category: 'Arma marcial cuerpo a cuerpo', cost: '10 po', weight: '2 lb', dmg: '1d6', type: 'perforante', finesse: true, props: 'Sutil, ligera', desc: 'Hoja ágil, favorita de pícaros y duelistas.' },
  warhammer: { name: 'Martillo de guerra', category: 'Arma marcial cuerpo a cuerpo', cost: '15 po', weight: '2 lb', dmg: '1d8', type: 'contundente', props: 'Versátil (1d10)', desc: 'Martillo de combate. Muy eficaz contra esqueletos.' },
  scimitar: { name: 'Cimitarra', category: 'Arma marcial cuerpo a cuerpo', cost: '25 po', weight: '3 lb', dmg: '1d6', type: 'cortante', finesse: true, props: 'Sutil, ligera', desc: 'Hoja curva y ligera.' },
  morningstar: { name: 'Lucero del alba', category: 'Arma marcial cuerpo a cuerpo', cost: '15 po', weight: '4 lb', dmg: '1d8', type: 'perforante', props: '—', desc: 'Bola de hierro con púas sobre un mango.' },
  // ---------- Armaduras ----------
  leather: { name: 'Armadura de cuero', category: 'Armadura ligera', cost: '10 po', weight: '10 lb', ac: '11 + mod. Des', desc: 'Peto y hombreras de cuero endurecido.' },
  studded_leather: { name: 'Cuero tachonado', category: 'Armadura ligera', cost: '45 po', weight: '13 lb', ac: '12 + mod. Des', desc: 'Cuero reforzado con remaches.' },
  chain_shirt: { name: 'Camisote de mallas', category: 'Armadura intermedia', cost: '50 po', weight: '20 lb', ac: '13 + mod. Des (máx. 2)', desc: 'Malla que se lleva entre capas de ropa.' },
  scale_mail: { name: 'Cota de escamas', category: 'Armadura intermedia', cost: '50 po', weight: '45 lb', ac: '14 + mod. Des (máx. 2)', desc: 'Desventaja en Sigilo.' },
  chain_mail: { name: 'Cota de malla', category: 'Armadura pesada', cost: '75 po', weight: '55 lb', ac: '16', desc: 'Requiere Fuerza 13. Desventaja en Sigilo.' },
  shield_item: { name: 'Escudo', category: 'Escudo', cost: '10 po', weight: '6 lb', ac: '+2', desc: 'Se lleva en una mano y aumenta la CA en 2.' },
  // ---------- Equipo y consumibles ----------
  potion_healing: { name: 'Poción de curación', category: 'Poción (común)', cost: '50 po', weight: '0,5 lb', consumable: true, heal: '2d4+2', desc: 'Líquido rojo y brillante. Quien la bebe recupera 2d4 + 2 puntos de golpe. Beberla o administrarla requiere una acción.' },
  potion_greater_healing: { name: 'Poción de curación mayor', category: 'Poción (poco común)', cost: '150 po', weight: '0,5 lb', consumable: true, heal: '4d4+4', desc: 'Recupera 4d4 + 4 puntos de golpe.' },
  healers_kit: { name: 'Kit de sanador', category: 'Equipo', cost: '5 po', weight: '3 lb', desc: 'Vendas, ungüentos y tablillas. Tiene diez usos: como acción, gasta uno para estabilizar a una criatura con 0 PG sin necesidad de prueba de Medicina.' },
  thieves_tools: { name: 'Herramientas de ladrón', category: 'Herramientas', cost: '25 po', weight: '1 lb', desc: 'Lima, ganzúas, espejo y pinzas para abrir cerraduras y desactivar trampas.' },
  holy_symbol: { name: 'Símbolo sagrado', category: 'Foco divino', cost: '5 po', weight: '1 lb', desc: 'Amuleto o emblema que un clérigo usa como foco para sus conjuros.' },
  spellbook: { name: 'Libro de conjuros', category: 'Equipo', cost: '50 po', weight: '3 lb', desc: 'Contiene los conjuros que un mago conoce y puede preparar.' },
  arcane_focus: { name: 'Foco arcano (varita)', category: 'Foco arcano', cost: '10 po', weight: '1 lb', desc: 'Objeto que canaliza la magia arcana.' },
  rope: { name: 'Cuerda de cáñamo (50 pies)', category: 'Equipo', cost: '1 po', weight: '10 lb', desc: 'Aguanta hasta 2 PG por punto... o al menos a un enano.' },
  torch: { name: 'Antorcha', category: 'Equipo', cost: '1 pc', weight: '1 lb', desc: 'Arde 1 hora: luz brillante en 20 pies y tenue 20 pies más.' },
  rations: { name: 'Raciones (1 día)', category: 'Equipo', cost: '5 pp', weight: '2 lb', desc: 'Comida seca para viajar.' },
  // ---------- Objetos mágicos ----------
  cloak_protection: { name: 'Capa de protección', category: 'Objeto maravilloso (poco común, requiere sintonización)', magic: true, equip: { ac: 1, saves: 1 }, desc: 'Obtienes +1 a la CA y a las tiradas de salvación mientras la lleves puesta.' },
  weapon_plus1: { name: 'Arma +1', category: 'Arma (poco común)', magic: true, equip: { attack: 1, damage: 1 }, desc: 'Tienes +1 a las tiradas de ataque y de daño con esta arma mágica. En esta plataforma se aplica a tus ataques con arma.' },
};
