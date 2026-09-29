// Remove chaves de traducao que ninguem pode estar a pedir.
//
// Um ficheiro de locale acumula lixo: uma chave que foi renomeada em pt e
// ficou para tras nas traducoes, ou uma versao de uma string que o codigo
// nunca mais leu. Sao inofensivas em runtime -- o i18next nao as acha --
// mas fazem o check-locales acusar divergencia para sempre, e esse
// relatório e a unica forma de ver se falta alguma coisa a serio.
//
// A regra e deliberadamente conservadora, para nao apagar nada de vivo:
// remove-se apenas a chave que
//    1. nao existe em pt.json  (ou seja, ninguem a traduziu, ninguem a
//        maintaine, e nao ha fonte a que voltar se um dia for preciso)
//    2. e que nao aparece escrita em nenhum ficheiro de src/
//
// Se uma chave nao esta em pt mas o codigo a menciona, e porque o codigo
// esta errado e isso e outro problema -- o script nao a toca, apenas
// avisa.
const fs = require("fs");
const path = require("path");

const LOCALES = path.join("src", "lib", "i18n", "locales");
const SRC = "src";

const achat = (o, p = "", a = {}) => {
  for (const [k, v] of Object.entries(o)) {
    const key = p ? p + "." + k : k;
    if (v && typeof v === "object" && !Array.isArray(v)) achat(v, key, a);
    else a[key] = v;
  }
  return a;
};
const paraObjeto = (flat) => {
  const out = {};
  for (const [k, v] of Object.entries(flat)) {
    const p = k.split(".");
    let alvo = out;
    for (let i = 0; i < p.length - 1; i++) {
      alvo[p[i]] = alvo[p[i]] || {};
      alvo = alvo[p[i]];
    }
    alvo[p[p.length - 1]] = v;
  }
  return out;
};

// Todo o texto de src/, para procurar a chave como palavra.
function todoOCodigo() {
  const partes = [];
  const andar = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === "locales") continue;
        andar(p);
      } else if (/\.(ts|tsx)$/.test(e.name)) {
        partes.push(fs.readFileSync(p, "utf8"));
      }
    }
  };
  andar(SRC);
  return partes.join("\n");
}

const codigo = todoOCodigo();
const pt = JSON.parse(fs.readFileSync(path.join(LOCALES, "pt.json"), "utf8"));
const chavesPt = new Set(Object.keys(achat(pt)));

let total = 0;
const avisadas = [];

for (const f of fs.readdirSync(LOCALES).filter((x) => x.endsWith(".json")).sort()) {
  const loc = f.replace(/\.json$/, "");
  const bruto = fs.readFileSync(path.join(LOCALES, f), "utf8");
  const flat = achat(JSON.parse(bruto));

  const fora = Object.keys(flat).filter((k) => !chavesPt.has(k));
  const mortas = fora.filter((k) => !codigo.includes(k));
  const vivas = fora.filter((k) => codigo.includes(k));

  for (const k of vivas) avisadas.push(`${loc}: ${k} (nao existe em pt mas o codigo pede-a)`);

  if (!mortas.length) {
    console.log(f.padEnd(10) + " nada a podar" + (vivas.length ? ` (${vivas.length} viva(s))` : ""));
    continue;
  }
  for (const k of mortas) delete flat[k];
  fs.writeFileSync(path.join(LOCALES, f), JSON.stringify(paraObjeto(flat), null, 2) + "\n", "utf8");
  console.log(f.padEnd(10) + " podadas " + String(mortas.length).padStart(2) + ": " + mortas.join(", "));
  total += mortas.length;
}

console.log("\n" + total + " chaves mortas removidas.");
if (avisadas.length) {
  console.log("\nATENCAO -- estas nao estao em pt mas o codigo pede-as, por isso ficam:");
  for (const a of avisadas) console.log("  " + a);
}
