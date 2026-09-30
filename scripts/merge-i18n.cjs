// Valida e funde um ficheiro .done.json no locale correspondente.
//
// A validacao e o ponto: um placeholder perdido ou uma chave a mais
// parte o i18next em runtime (o {{count}} aparece cru na tela, ou a
// string nunca e encontrada). Por isso o merge so acontece depois de
// conferir, chave a chave, que o conjunto de placeholders e igual ao da
// fonte em portugues.
//
// uso: node scripts/merge-i18n.cjs <loc>.<onda>        (ex. es.a)
//      node scripts/merge-i18n.cjs --check              (so diagnostico)
//      node scripts/merge-i18n.cjs --mobile <loc>.<onda>  (locales do mobile)
const fs = require("fs");
const path = require("path");

let dir = path.join("src", "lib", "i18n", "locales");
const work = path.join("scripts", "_i18n-work");

function flatten(o, pre = "", acc = {}) {
  for (const [k, v] of Object.entries(o)) {
    const key = pre ? pre + "." + k : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, acc);
    else acc[key] = v;
  }
  return acc;
}

function unflatten(flat) {
  const out = {};
  for (const [k, v] of Object.entries(flat)) {
    const partes = k.split(".");
    let alvo = out;
    for (let i = 0; i < partes.length - 1; i++) {
      alvo[partes[i]] = alvo[partes[i]] || {};
      alvo = alvo[partes[i]];
    }
    alvo[partes[partes.length - 1]] = v;
  }
  return out;
}

const placeholders = (s) =>
  (String(s).match(/\{\{[^}]*\}\}/g) || []).slice().sort();

// Nomes de marca e integracoes que ficam por traduzir de proposito.
const INTOCAVEIS = new Set([
  "The Magic Trader", "Magic Market", "Binance", "Binance Pay", "Rodotpay",
  "Express", "TradingView", "Telegram", "Supabase", "Google",
]);

function validar(loc, onda) {
  const todoPath = path.join(work, `${loc}.${onda}.todo.json`);
  const donePath = path.join(work, `${loc}.${onda}.done.json`);

  if (!fs.existsSync(donePath)) {
    return { loc, onda, ok: false, motivo: "sem ficheiro .done.json" };
  }

  const buf = fs.readFileSync(donePath);
  const temBOM = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  let done, todo;
  try {
    done = JSON.parse(buf.toString("utf8").replace(/^\uFEFF/, ""));
  } catch (e) {
    return { loc, onda, ok: false, motivo: "JSON invalido: " + e.message };
  }
  try {
    todo = JSON.parse(fs.readFileSync(todoPath, "utf8"));
  } catch (e) {
    return { loc, onda, ok: false, motivo: "todo.json invalido: " + e.message };
  }

  const problemas = [];
  const avisos = [];

  if (temBOM) problemas.push("ficheiro tem BOM UTF-8");

  const kTodo = Object.keys(todo);
  const kDone = Object.keys(done);

  const faltam = kTodo.filter((k) => !(k in done));
  const aMais = kDone.filter((k) => !(k in todo));

  if (aMais.length) {
    problemas.push(
      aMais.length + " chave(s) a mais do que o pedido: " + aMais.slice(0, 5).join(", "),
    );
  }

  // Placeholders: tem de bater certo com a fonte, conjunto a conjunto.
  const mausPlaceholders = [];
  for (const k of kTodo) {
    if (!(k in done)) continue;
    const a = placeholders(todo[k]);
    const b = placeholders(done[k]);
    if (a.join("|") !== b.join("|")) {
      mausPlaceholders.push(
        `${k}: esperado [${a.join(", ")}] veio [${b.join(", ")}]`,
      );
    }
  }
  if (mausPlaceholders.length) {
    problemas.push(
      mausPlaceholders.length + " chave(s) com placeholder diferente: " +
        mausPlaceholders.slice(0, 6).join(" | "),
    );
  }

  // Sufixos de plural do i18next: o texto muda, o sufixo nao.
  const sufixos = ["_one", "_other", "_zero", "_few", "_many"];
  const mausSufixos = [];
  for (const k of kTodo) {
    const s = sufixos.find((x) => k.endsWith(x));
    if (s && !(k in done)) continue;
    if (s && !Object.keys(done).some((d) => d === k)) continue;
    if (s && done[k] !== undefined && typeof done[k] !== "string") {
      mausSufixos.push(k);
    }
  }
  if (mausSufixos.length) problemas.push(mausSufixos.length + " valor(es) nao sao texto");

  // Portuguese deixado por traduzir.
  const naoTraduzidas = [];
  for (const k of kTodo) {
    if (!(k in done)) continue;
    const orig = String(todo[k]).trim();
    const novo = String(done[k]).trim();
    if (orig && orig === novo && !INTOCAVEIS.has(orig)) naoTraduzidas.push(k);
  }
  if (naoTraduzidas.length) {
    avisos.push(
      naoTraduzidas.length + " igual(es) ao portugues (possivelmente nao traduzido): " +
        naoTraduzidas.slice(0, 8).join(", "),
    );
  }

  // Strings vazias onde a fonte nao e vazia:往往是 sinal de chave perdida.
  const vazias = kTodo.filter((k) => k in done && String(todo[k]).trim() && !String(done[k]).trim());
  if (vazias.length) {
    problemas.push(vazias.length + " traducao vazia onde a fonte tem texto: " + vazias.slice(0, 5).join(", "));
  }

  return {
    loc, onda, ok: problemas.length === 0,
    problemas, avisos,
    total: kTodo.length,
    escritas: kTodo.length - faltam.length,
    faltam: faltam.length,
  };
}

function fundir(loc, onda) {
  const rel = validar(loc, onda);
  if (!rel.ok) return rel;

  const done = JSON.parse(
    fs.readFileSync(path.join(work, `${loc}.${onda}.done.json`), "utf8").replace(/^\uFEFF/, ""),
  );
  const fLoc = path.join(dir, `${loc}.json`);
  const locale = JSON.parse(fs.readFileSync(fLoc, "utf8"));
  const flat = flatten(locale);
  Object.assign(flat, done);
  fs.writeFileSync(fLoc, JSON.stringify(unflatten(flat), null, 2) + "\n", "utf8");
  rel.fundido = true;
  return rel;
}

const args0 = process.argv.slice(2);
const mobile = args0.includes("--mobile");
if (mobile) dir = path.join("mobile", "src", "lib", "i18n", "locales");
const args = args0.filter((a) => a !== "--mobile");
const soCheck = args[0] === "--check";
const alvos = soCheck
  ? fs.readdirSync(work).filter((f) => f.endsWith(".done.json")).map((f) => f.replace(".done.json", ""))
  : args;

if (!alvos.length) {
  console.log("nada a fazer. uso: node scripts/merge-i18n.cjs <loc>.<onda> | --check");
  process.exit(0);
}

let mau = 0;
for (const alvo of alvos) {
  const [loc, onda] = alvo.split(".");
  const r = soCheck ? validar(loc, onda) : fundir(loc, onda);
  if (r.motivo) {
    console.log(alvo.padEnd(8) + " -- " + r.motivo);
    continue;
  }
  const marca = r.ok ? (r.fundido ? "FUNDIDO" : "ok     ") : "REJEITADO";
  console.log(
    alvo.padEnd(8) + " " + marca + "  " + String(r.escritas).padStart(4) + "/" + r.total +
    (r.faltam ? "  (em falta " + r.faltam + ")" : ""),
  );
  for (const p of r.problemas) { console.log("           ! " + p); mau++; }
  for (const a of r.avisos) console.log("           ~ " + a);
  if (!r.ok) mau++;
}
process.exit(mau ? 1 : 0);
