/**
 * Valida integridade das tradicoes: JSON bem formado, e a lista de chaves
 * presente em pt.json igual a de cada locale (deteta chaves em falta).
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'lib', 'i18n', 'locales');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();

const flat = (o, prefix = '') =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? flat(v, `${prefix}${k}.`)
      : [`${prefix}${k}`]
  );

let bad = 0;
const data = {};
for (const f of files) {
  const full = path.join(dir, f);
  try {
    data[f] = JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    console.log(`  ${f}: JSON INVALIDO -> ${e.message}`);
    bad++;
  }
}

const base = 'pt.json';
const baseKeys = new Set(flat(data[base]));
console.log(`pt.json tem ${baseKeys.size} chaves leaves\n`);

const MUST = ['auth.createAccount', 'auth.loginTitle', 'auth.registerSubtitle', 'perfil.signIn'];
for (const f of files) {
  if (!data[f]) continue;
  const keys = new Set(flat(data[f]));
  const missing = [...baseKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !baseKeys.has(k));
  const mustMissing = MUST.filter((k) => !keys.has(k));
  const status = missing.length || mustMissing.length ? 'DIVERGENTE' : 'ok';
  if (status !== 'ok') bad++;
  let line = `  ${f.padEnd(9)} ${String(keys.size).padStart(4)} chaves  ${status}`;
  if (mustMissing.length) line += `  em falta: ${mustMissing.join(', ')}`;
  if (missing.length) line += `\n             falta vs pt: ${missing.length}${missing.length <= 6 ? ' (' + missing.join(', ') + ')' : ''}`;
  if (extra.length) line += `\n             extra vs pt: ${extra.length}${extra.length <= 6 ? ' (' + extra.join(', ') + ')' : ''}`;
  console.log(line);
}

console.log(bad === 0 ? '\nTODOS OS LOCALES COERENTES' : `\n${bad} problema(s)`);
