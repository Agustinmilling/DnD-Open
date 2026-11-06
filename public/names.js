// Generador de nombres de personaje al azar, según especie y género. Nombres inventados para este juego:
// sílabas y apellidos compuestos propios, sin nombres de mundos publicados.
// Lo usan el navegador (asistente de creación) y el servidor (personaje al azar).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Names = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const pick = (rnd, a) => a[Math.floor(rnd() * a.length)];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  /** Nombre por sílabas: inicio + (medio opcional) + final */
  const syl = (rnd, start, mid, end, midChance = 0.35) => cap(pick(rnd, start) + (mid.length && rnd() < midChance ? pick(rnd, mid) : '') + pick(rnd, end));
  /** Apellido compuesto: «Piedra» + «clara» → «Piedraclara» */
  const compound = (rnd, a, b) => {
    let x = pick(rnd, a), y = pick(rnd, b);
    for (let i = 0; i < 6 && x.slice(-1) === y[0]; i++) y = pick(rnd, b); // sin «Nieblaalta»
    return cap(x + y);
  };
  // palabras que no queremos que salgan por casualidad al juntar sílabas
  const BAD = /ped[oa]|put[ao]|cul[oa]|caca|mierd|poll[ao]|coñ|tet[ao]|pene|mea|gorra|mama|nazi|orin/i;

  const HUMAN = {
    m: ['Aldo', 'Anselmo', 'Bernal', 'Bruno', 'Ciro', 'Dámaso', 'Elías', 'Eloy', 'Fermín', 'Gael', 'Gonzalo', 'Hugo', 'Iker', 'Jacobo', 'Leandro', 'Lucio', 'Martín', 'Mauro', 'Nuño', 'Olmo', 'Ramiro', 'Rodrigo', 'Sancho', 'Tadeo', 'Tristán', 'Velasco'],
    f: ['Alma', 'Berta', 'Brianda', 'Celia', 'Dalia', 'Elena', 'Elvira', 'Fiona', 'Greta', 'Inés', 'Irene', 'Jimena', 'Lara', 'Leonor', 'Mara', 'Nora', 'Olga', 'Oria', 'Rocío', 'Sancha', 'Sara', 'Urraca', 'Vera', 'Violante'],
    a: ['Brasa', 'Piedra', 'Hierro', 'Roble', 'Cuervo', 'Niebla', 'Ceniza', 'Monte', 'Trueno', 'Alba', 'Fresno', 'Espino', 'Zarza', 'Bruma', 'Peña', 'Valle'],
    b: ['viva', 'clara', 'fuerte', 'alta', 'honda', 'negra', 'firme', 'mano', 'canto', 'lanza', 'paso', 'fiel', 'sombra'],
    plain: ['Robledo', 'Fresneda', 'Valcárcel', 'Montoro', 'Albar', 'Peñalba', 'Riosalado', 'Torrecilla', 'Vallejo', 'Castañar'],
  };

  const STYLES = {
    human: (rnd, g) => `${pick(rnd, HUMAN[g])} ${rnd() < 0.55 ? compound(rnd, HUMAN.a, HUMAN.b) : pick(rnd, HUMAN.plain)}`,
    elf: (rnd, g) => {
      const first = syl(rnd, ['Ae', 'Ela', 'Fae', 'Ili', 'Lia', 'Ny', 'Sae', 'Thi', 'Ve', 'Ya', 'Cae', 'Ara', 'Ith', 'Ena', 'Lu'], ['la', 'ri', 'na', 'the', 'ly', 'ra', 'si', 'va', 'dri'],
        g === 'f' ? ['wyn', 'na', 'riel', 'lie', 'thea', 'ssa', 'lia', 'ren', 'wen'] : ['ril', 'dan', 'thas', 'lion', 'ren', 'vel', 'nor', 'dor', 'lis']);
      return `${first} ${compound(rnd, ['Hoja', 'Estrella', 'Rocío', 'Brisa', 'Sauce', 'Plata', 'Luna', 'Aurora', 'Musgo', 'Lucero'], ['clara', 'alba', 'viva', 'serena', 'lejana', 'queda', 'leve'])}`;
    },
    dwarf: (rnd, g) => {
      const first = syl(rnd, ['Bal', 'Dur', 'Gor', 'Thor', 'Bru', 'Kar', 'Mor', 'Dag', 'Brom', 'Har', 'Ost', 'Vond', 'Ul'], ['a', 'i', 'o'],
        g === 'f' ? ['da', 'hild', 'ra', 'wyn', 'ni', 'dis', 'gret', 'na'] : ['in', 'ok', 'grim', 'dan', 'rik', 'nar', 'gar', 'bur'], 0.2);
      return `${first} ${compound(rnd, ['Yunque', 'Martillo', 'Barba', 'Pico', 'Forja', 'Piedra', 'Hacha', 'Mina', 'Escudo', 'Veta'], ['rojo', 'hondo', 'gris', 'ancho', 'firme', 'brasa', 'viva', 'recia'])}`;
    },
    halfling: (rnd, g) => `${pick(rnd, g === 'f' ? ['Rosa', 'Lila', 'Margarita', 'Pía', 'Tula', 'Menta', 'Amapola', 'Nina', 'Dulce', 'Fresa', 'Camila', 'Malva'] : ['Pip', 'Tobías', 'Milo', 'Ned', 'Robin', 'Bartolo', 'Cosme', 'Lino', 'Fito', 'Pancho', 'Beni', 'Rulo'])} ${pick(rnd, ['Buenhogar', 'Colinaverde', 'Piesligeros', 'Manzanilla', 'Tejaroja', 'Panecillo', 'Arroyuelo', 'Hornodulce', 'Trébol', 'Mieldeflor', 'Cestallena', 'Sotobosque'])}`,
    gnome: (rnd, g) => {
      const first = syl(rnd, ['Fi', 'Bim', 'Zo', 'Nim', 'Ti', 'Wil', 'Bo', 'Quin', 'Pim', 'Ru', 'Ze', 'Lo'], ['ri', 'mo', 'li', 'pe', 'ti', 'bi'],
        g === 'f' ? ['ra', 'la', 'sa', 'ti', 'na', 'bel', 'lia'] : ['nik', 'bo', 'wick', 'do', 'nap', 'kin', 'lo'], 0.5);
      return `${first} ${pick(rnd, ['Ruedadentada', 'Chispazo', 'Tuercalista', 'Muellefeliz', 'Engranaje', 'Relojín', 'Lupadorada', 'Cachivache', 'Bisagra', 'Pistón'])}`;
    },
    orc: (rnd, g) => {
      const first = syl(rnd, ['Gra', 'Dur', 'Ur', 'Shu', 'Mok', 'Gor', 'Ruk', 'Ush', 'Zag', 'Kra', 'Bru', 'Ogg'], [],
        g === 'f' ? ['ka', 'sha', 'ga', 'ra', 'nuk', 'ya', 'mah', 'gul'] : ['ash', 'gor', 'nak', 'rok', 'uk', 'mog', 'dush', 'rak']);
      const ep = g === 'f' ? ['la Firme', 'la Rugiente', 'la Tenaz', 'la Implacable', 'la Incansable', 'Colmillo de Hierro', 'Puño de Piedra'] : ['el Firme', 'el Rugiente', 'el Tenaz', 'el Implacable', 'el Incansable', 'Colmillo de Hierro', 'Puño de Piedra'];
      return `${first} ${pick(rnd, ep)}`;
    },
    dragonborn: (rnd, g) => {
      const first = syl(rnd, ['Ar', 'Bal', 'Ked', 'Med', 'Nad', 'Pan', 'Rho', 'Sor', 'Tor', 'Ver', 'Kri', 'Dar', 'Zor', 'Vex'], ['a', 'i', 'u'],
        g === 'f' ? ['ra', 'thi', 'nys', 'xi', 'ira', 'ess', 'ka', 'vys'] : ['ash', 'jhan', 'rax', 'rin', 'uun', 'ak', 'thar', 'kon'], 0.25);
      const clan = syl(rnd, ['Vak', 'Thar', 'Kol', 'Ish', 'Ryn', 'Zak', 'Mor', 'Ves'], ['ar', 'ir', 'ul', 'ae'], ['thas', 'drak', 'kesh', 'virr', 'nax', 'ros'], 0.6);
      return `${first} ${clan}`;
    },
    tiefling: (rnd, g) => {
      if (rnd() < 0.45) return pick(rnd, g === 'f' ? ['Esperanza', 'Paciencia', 'Templanza', 'Constancia', 'Penumbra', 'Clemencia', 'Brasa', 'Ventura'] : ['Fervor', 'Ánimo', 'Sosiego', 'Valor', 'Ocaso', 'Desvelo', 'Destino', 'Silencio']);
      return syl(rnd, ['Az', 'Mal', 'Kal', 'Ner', 'Ori', 'Zar', 'Lev', 'Ira', 'Sab', 'Mor'], ['a', 'e', 'i'], g === 'f' ? ['ia', 'ys', 'ira', 'ela', 'eth', 'ine'] : ['mon', 'ion', 'eth', 'ius', 'ak', 'oth'], 0.3);
    },
    goliath: (rnd, g) => {
      const first = syl(rnd, ['Ka', 'Tha', 'Gau', 'Ma', 'Vau', 'Ila', 'Ere', 'Kuo', 'Pa', 'Lo', 'Ne'], ['ga', 'lu', 'ne', 'tha', 'ka'],
        g === 'f' ? ['ri', 'a', 'nia', 'thi', 'ma', 'lee'] : ['thak', 'kal', 'vek', 'an', 'ul', 'gath'], 0.45);
      return `${first} ${pick(rnd, ['Pasofirme', 'Cumbrealta', 'Rompehielos', 'Vozdetrueno', 'Lanzaveloz', 'Escalanubes', 'Hombrodepiedra', 'Pisanieve', 'Mirolejos', 'Rompevientos'])}`;
    },
  };

  /** Un nombre al azar (máx. 28 caracteres). species: id de especie (human, elf…); gender: 'f' | 'm' */
  function generate(species, gender = 'm', rnd = Math.random) {
    const style = STYLES[species] || STYLES.human;
    const g = gender === 'f' ? 'f' : 'm';
    for (let i = 0; i < 8; i++) {
      const n = style(rnd, g).replace(/\s+/g, ' ').trim().replace(/([aeiou])\1{2,}/gi, '$1$1');
      if (n.length >= 2 && n.length <= 28 && !BAD.test(n)) return n;
    }
    return pick(rnd, HUMAN[g]);
  }
  /** Varias propuestas distintas */
  function suggestions(species, gender, n = 4, rnd = Math.random) {
    const out = new Set();
    for (let i = 0; i < n * 6 && out.size < n; i++) out.add(generate(species, gender, rnd));
    return [...out];
  }
  return { generate, suggestions, species: Object.keys(STYLES) };
});
