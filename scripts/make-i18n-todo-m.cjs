// Gera os ficheiros de trabalho da onda M (i18n do mobile).
//
// Estrategia do web como semente:
//   - as chaves em falta no mobile que ja existem traduzidas no web
//     (valor != pt, placeholders iguais) entram no .m.seed.json e sao
//     pre-preenchidas no .m.done.json;
//   - o agente revisa a semente, traduz as restantes (as 18 exclusivas
//     do mobile + as que no web ainda sao portugues) e decide as iguais.
//
// Espera 13 ficheiros por tipo em scripts/_i18n-work/:
//   <loc>.m.todo.json  -> chave -> pt-mobile (todas as que precisam de atencao)
//   <loc>.m.ref.json   -> chave -> { pt, en, estado: falta|igual }
//   <loc>.m.seed.json  -> chave -> proposta do web (so faltas com semente)
//   <loc>.m.done.json  -> arranque = seed (o agente edita este)
const fs = require("fs");
const path = require("path");

function flatten(o, pre = "", acc = {}) {
  for (const [k, v] of Object.entries(o)) {
    const key = pre ? pre + "." + k : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, acc);
    else acc[key] = v;
  }
  return acc;
}
const placeholders = (s) => (String(s).match(/\{\{[^}]*\}\}/g) || []).slice().sort().join("|");

const mDir = path.join("mobile", "src", "lib", "i18n", "locales");
const wDir = path.join("src", "lib", "i18n", "locales");
const work = path.join("scripts", "_i18n-work");

const mPts = flatten(JSON.parse(fs.readFileSync(path.join(mDir, "pt.json"), "utf8")));
const wPts = flatten(JSON.parse(fs.readFileSync(path.join(wDir, "pt.json"), "utf8")));
const wEns = flatten(JSON.parse(fs.readFileSync(path.join(wDir, "en.json"), "utf8")));
const mEns = flatten(JSON.parse(fs.readFileSync(path.join(mDir, "en.json"), "utf8")));

const enDe = (k) => (k in mEns ? mEns[k] : k in wEns ? wEns[k] : null);

const locs = fs.readdirSync(mDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", "")).filter((l) => l !== "pt").sort();

for (const l of locs) {
  const mFlat = flatten(JSON.parse(fs.readFileSync(path.join(mDir, l + ".json"), "utf8")));
  const wFlat = flatten(JSON.parse(fs.readFileSync(path.join(wDir, l + ".json"), "utf8")));

  const faltas = Object.keys(mPts).filter((k) => !(k in mFlat));
  const iguais = Object.keys(mPts).filter((k) => k in mFlat && mFlat[k] === mPts[k]);

  const todo = {};
  for (const k of [...faltas, ...iguais]) todo[k] = mPts[k];

  // Semente: falta que existe no web, traduzida (valor != web-pt) e com
  // placeholders iguais aos do mobile-pt.
  const seed = {};
  for (const k of faltas) {
    if (!(k in wFlat)) continue;
    if (wFlat[k] === wPts[k]) continue;
    if (placeholders(mPts[k]) !== placeholders(wPts[k])) continue;
    seed[k] = wFlat[k];
  }

  const ref = {};
  for (const k of Object.keys(todo)) {
    ref[k] = { pt: mPts[k], en: enDe(k), estado: k in faltas ? "falta" : "igual" };
  }

  const fTodo = path.join(work, l + ".m.todo.json");
  const fRef = path.join(work, l + ".m.ref.json");
  const fSeed = path.join(work, l + ".m.seed.json");
  const fDone = path.join(work, l + ".m.done.json");
  fs.writeFileSync(fTodo, JSON.stringify(todo, null, 2) + "\n", "utf8");
  fs.writeFileSync(fRef, JSON.stringify(ref, null, 2) + "\n", "utf8");
  fs.writeFileSync(fSeed, JSON.stringify(seed, null, 2) + "\n", "utf8");
  // arranque do done = semente (o agente completa/edita)
  fs.writeFileSync(fDone, JSON.stringify(seed, null, 2) + "\n", "utf8");

  const porTraduzir = faltas.length - Object.keys(seed).length;
  console.log(
    l.padEnd(4) +
    " todo " + Object.keys(todo).length +
    " (falta " + faltas.length + " + igual " + iguais.length + ")" +
    " | seed " + Object.keys(seed).length +
    " | a traduzir do zero " + porTraduzir
  );
}
console.log("gerado em " + work);