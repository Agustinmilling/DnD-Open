// Personajes al azar: todos los que genera randomSpec deben ser válidos, también en las combinaciones
// con pocos trucos libres (humano + trasfondo Acólito + clérigo Taumaturgo). Uso: node test/random-spec.js [intentos=400]
const assert = require('assert');
const C = require('../src/character');
const CR = require('../src/creation');
const Choices = require('../public/choices');

const D = CR.build();
const N = Number(process.argv[2] || 400);
for (const fixed of [{ cls: 'cleric', species: 'human', background: 'acolyte' }, { cls: 'cleric' }, {}]) {
  for (let i = 0; i < N; i++) {
    const spec = C.randomSpec(Math.random, fixed);
    assert.strictEqual(Choices.choicesProblem(D, spec), null, `randomSpec ${JSON.stringify(fixed)} generó un personaje no válido`);
  }
}
console.log(`✔ randomSpec: ${N * 3} personajes al azar válidos`);
