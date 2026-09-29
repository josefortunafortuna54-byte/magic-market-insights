/**
 * Insere uma chave em todos os locales, se faltar, mantendo a ordem do bloco.
 * Valida o JSON de cada ficheiro antes de escrever.
 *
 * Uso: node scripts/add-key.cjs <prefixo> <chave> <valorPorLocaleJson>
 * Ex: node scripts/add-key.cjs auth createAccount '{"pt":"Criar conta",...}'
 */
const fs = require('fs');
const path = require('path');

const [, , prefix, key, valuesFile] = process.argv;
if (!prefix || !key || !valuesFile) {
  console.error('uso: node scripts/add-key.cjs <prefixo> <chave> <ficheiroValores.json>');
  process.exit(1);
}
const values = JSON.parse(fs.readFileSync(valuesFile, 'utf8'));

const dir = path.join(__dirname, '..', 'src', 'lib', 'i18n', 'locales');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();

const missing = files.filter((f) => !values[f.replace('.json', '')]);
if (missing.length) {
  console.error(`FALTAM valores para: ${missing.map((f) => f.replace('.json', '')).join(', ')}`);
  process.exit(1);
}

const escape = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

for (const file of files) {
  const lang = file.replace('.json', '');
  const full = path.join(dir, file);
  const before = fs.readFileSync(full, 'utf8');
  const lines = before.split('\n');

  // localiza a chave indentada dentro do bloco pedido
  const re = new RegExp(`^(\\s*)"${key}"\\s*:`);
  const at = lines.findIndex((l) => re.test(l));
  if (at !== -1) {
    console.log(`  ${file}: ja existe`);
    continue;
  }

  const blockRe = new RegExp(`^(\\s*)"${prefix}"\\s*:\\s*\\{`);
  const start = lines.findIndex((l) => blockRe.test(l));
  if (start === -1) {
    console.log(`  ${file}: bloco "${prefix}" nao encontrado, ignorado`);
    continue;
  }
  const indent = blockRe.exec(lines[start])[1];
  const childIndent = indent + '  ';

  // encontra o fim do bloco contando chaves
  let depth = 0, end = start;
  for (let i = start; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    if (depth === 0) { end = i; break; }
  }
  // insere antes da chave de topo seguinte, dentro do bloco
  let insertAt = end;
  for (let i = start + 1; i < end; i++) {
    if (new RegExp(`^${indent}"`).test(lines[i])) { insertAt = i; break; }
  }

  // a propriedade anterior precisa de virgula: a nova entra logo a seguir
  const prev = insertAt - 1;
  if (prev >= 0 && lines[prev].trim() !== '' && !lines[prev].trimEnd().endsWith(',')) {
    lines[prev] = lines[prev].trimEnd() + ',';
  }

  // preserva o fim de linha do ficheiro (CRLF em Windows, LF em Linux)
  const eol = lines.find((l) => l.endsWith('\r')) ? '\r' : '';
  const afterHasMore = lines.slice(insertAt, end).some((l) => l.trim() !== '' && l.trim() !== '}');
  const comma = afterHasMore ? ',' : '';
  lines.splice(insertAt, 0, `${childIndent}"${key}": "${escape(values[lang])}"${comma}${eol}`);
  const after = lines.join('\n');
  try {
    JSON.parse(after);
  } catch (e) {
    console.log(`  ${file}: JSON invalido apos edicao (${e.message}), NAO escrito`);
    continue;
  }
  fs.writeFileSync(full, after);
  console.log(`  ${file}: + ${key} = "${values[lang]}"`);
}
