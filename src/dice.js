// Tiradas de dados con notación estándar: 1d20+5, 2d6-1, 4d6kh3, d20 adv/dis
const crypto = require('crypto');

function rollDie(sides) {
  return crypto.randomInt(1, sides + 1);
}

/**
 * Parsea y tira una expresión. Soporta varios términos: "2d6+1d4+3", "4d6kh3", "1d20-1".
 * Devuelve { total, detail, rolls:[{sides,results,kept}], expr }
 */
function roll(expr) {
  const clean = String(expr).toLowerCase().replace(/\s+/g, '');
  if (!/^[0-9d+\-khl]+$/.test(clean) || clean.length > 60) throw new Error('Expresión de dados no válida');
  const terms = clean.match(/[+\-]?[^+\-]+/g);
  if (!terms) throw new Error('Expresión de dados no válida');
  let total = 0;
  const parts = [];
  const rolls = [];
  for (const t of terms) {
    const sign = t.startsWith('-') ? -1 : 1;
    const body = t.replace(/^[+\-]/, '');
    const m = body.match(/^(\d*)d(\d+)(?:(kh|kl)(\d+))?$/);
    if (m) {
      const n = m[1] === '' ? 1 : parseInt(m[1], 10);
      const sides = parseInt(m[2], 10);
      if (n < 1 || n > 50 || sides < 2 || sides > 1000) throw new Error('Demasiados dados o caras no válidas');
      const results = Array.from({ length: n }, () => rollDie(sides));
      let kept = results.slice();
      if (m[3]) {
        const k = Math.min(parseInt(m[4], 10), n);
        const sorted = results.slice().sort((a, b) => (m[3] === 'kh' ? b - a : a - b));
        kept = sorted.slice(0, k);
      }
      const sum = kept.reduce((a, b) => a + b, 0);
      total += sign * sum;
      rolls.push({ sides, results, kept });
      parts.push(`${sign < 0 ? '−' : parts.length ? '+' : ''}${body}[${results.join(',')}]`);
    } else if (/^\d+$/.test(body)) {
      total += sign * parseInt(body, 10);
      parts.push(`${sign < 0 ? '−' : '+'}${body}`);
    } else {
      throw new Error('Expresión de dados no válida');
    }
  }
  return { total, detail: parts.join(' '), rolls, expr: clean };
}

/** Tirada de d20 con ventaja/desventaja. mode: 'normal' | 'adv' | 'dis' */
function d20(mode = 'normal') {
  const a = rollDie(20);
  if (mode === 'normal') return { natural: a, dice: [a], mode };
  const b = rollDie(20);
  const natural = mode === 'adv' ? Math.max(a, b) : Math.min(a, b);
  return { natural, dice: [a, b], mode };
}

/** Combina ventaja y desventaja según 5e: si hay de ambas, se anulan. */
function combineMode(adv, dis) {
  if (adv && !dis) return 'adv';
  if (dis && !adv) return 'dis';
  return 'normal';
}

/** Dobla los dados de una expresión de daño (para críticos): "1d8+3" -> "2d8+3" */
function critExpr(expr) {
  return String(expr).replace(/(\d*)d(\d+)/g, (_, n, s) => `${(n === '' ? 1 : parseInt(n, 10)) * 2}d${s}`);
}

module.exports = { roll, rollDie, d20, combineMode, critExpr };
