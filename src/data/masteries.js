// Propiedades de maestría de armas (reglas de 2024, SRD 5.2.1).
const MASTERY = { sap: 'Debilitar', vex: 'Molestar', topple: 'Derribar', push: 'Empujar', slow: 'Ralentizar', cleave: 'Hendir', graze: 'Rozar', nick: 'Mellar' };
const MASTERY_DESC = {
  sap: 'Si aciertas, el objetivo tiene desventaja en su siguiente tirada de ataque.',
  vex: 'Si aciertas, tienes ventaja en tu siguiente ataque contra ese objetivo.',
  topple: 'Si aciertas, el objetivo debe superar una salvación de Constitución o queda derribado.',
  push: 'Si aciertas, puedes empujar al objetivo 3 m.',
  slow: 'Si aciertas, la velocidad del objetivo se reduce en 3 m.',
  cleave: 'Si aciertas cuerpo a cuerpo, puedes atacar gratis a otro enemigo cercano (sin sumar tu modificador al daño), una vez por turno.',
  graze: 'Si fallas, el objetivo sufre igualmente daño igual a tu modificador de característica.',
  nick: 'El ataque extra de arma ligera forma parte de la acción de Atacar en lugar de gastar tu acción adicional.',
};
module.exports = { MASTERY, MASTERY_DESC };
