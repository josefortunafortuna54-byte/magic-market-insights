/**
 * Remove a chave `enterApp` das tradicoes, agora morta apos o Navbar usar
 * `auth.createAccount` no botao de registo.
 *
 * Uso: node scripts/remove-key.cjs enterApp
 */
const fs = require('fs');
const path = require('path');

const key = process.argv[2];
if (!key) {
  console.error('uso: node scripts/remove-key.cjs <chave>');
  process.exit(1);
}

const dir = path.join(__dirname, '..', 'src', 'lib', 'i18n', 'locales');
let changed = 0;
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const full = path.join(dir, file);
  const before = fs.readFileSync(full, 'utf8');
  const lines = before.split('\n');
  const kept = lines.filter((l) => !new RegExp(`^\\s*"${key}"\\s*:`).test(l));
  if (kept.length === lines.length) {
    console.log(`  ${file}: chave ja nao existe`);
    continue;
  }
  const after = kept.join('\n');
  // valida que o JSON continua bem formado antes de escrever
  JSON.parse(after);
  fs.writeFileSync(full, after);
  console.log(`  ${file}: removida (${lines.length - kept.length} linha)`);
  changed++;
}
console.log(`\n${changed} ficheiro(s) alterado(s)`);
