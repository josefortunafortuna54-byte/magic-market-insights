// Gera um ficheiro de trabalho por locale, so com as chaves que faltam
// (chave plana -> texto em portugues). Cada locale e independente, para
// os subagents poderem trabalhar em paralelo sem escrever no mesmo
// ficheiro. A fusao e feita depois por merge-i18n.cjs, que valida os
// placeholders.
const fs = require("fs");
const path = require("path");

const dir = path.join("src", "lib", "i18n", "locales");
const out = path.join("scripts", "_i18n-work");
fs.mkdirSync(out, { recursive: true });

function flatten(o, pre = "", acc = {}) {
  for (const [k, v] of Object.entries(o)) {
    const key = pre ? pre + "." + k : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, acc);
    else acc[key] = v;
  }
  return acc;
}

const pt = flatten(JSON.parse(fs.readFileSync(path.join(dir, "pt.json"), "utf8")));

// Ordem por superficie comercial primeiro: o que um cliente ve antes
// de o admin ter importance. Se algum traducao ficar pelo caminho, o
// que fica e a parte que vende.
const PESO = [
  "inicio", "auth", "planos", "depositos", "banca", "capital", "perfil",
  "comunidade", "analises", "sinal", "historico", "diario", "horarios",
  "workspace", "notifications", "notificacoes", "premiumWelcome",
  "premiumBanner", "store", "components", "common",
  "adminErrors", "admin",
];

function peso(chave) {
  const ns = chave.split(".")[0];
  const i = PESO.indexOf(ns);
  return i === -1 ? PESO.length : i;
}

const LOCS = {
  ar: "العربية", de: "Deutsch", en: "English", es: "Español",
  fr: "Français", it: "Italiano", ja: "日本語", ko: "한국어",
  ln: "Lingala", nl: "Nederlands", ru: "Русский", sw: "Kiswahili",
  zh: "中文",
};

const relatorio = {};
for (const [loc, nome] of Object.entries(LOCS)) {
  const flat = flatten(JSON.parse(fs.readFileSync(path.join(dir, loc + ".json"), "utf8")));
  const faltam = Object.keys(pt)
    .filter((k) => !(k in flat))
    .sort((a, b) => peso(a) - peso(b) || a.localeCompare(b));

  // Onda A e a superficie que o cliente ve; onda B e o painel de
  // administracao. Separar assim mantem cada tarefa com um tamanho
  // que se escreve inteiro e p oe a frente comercial live primeiro.
  const ondaA = faltam.filter((k) => peso(k) < PESO.indexOf("admin"));
  const ondaB = faltam.filter((k) => peso(k) >= PESO.indexOf("admin"));

  for (const [sufixo, lista] of [["a", ondaA], ["b", ondaB]]) {
    const todo = {};
    for (const k of lista) todo[k] = pt[k];
    fs.writeFileSync(
      path.join(out, loc + "." + sufixo + ".todo.json"),
      JSON.stringify(todo, null, 1) + "\n",
      "utf8",
    );
  }

  const extra = Object.keys(flat).filter((k) => !(k in pt));
  relatorio[loc] = { total: faltam.length, a: ondaA.length, b: ondaB.length, nome };
  console.log(
    loc.padEnd(3) + nome.padEnd(12) +
    "total " + String(faltam.length).padStart(4) +
    "   onda A " + String(ondaA.length).padStart(4) +
    "   onda B " + String(ondaB.length).padStart(4) +
    (extra.length ? "   " + extra.length + " obsoletas" : ""),
  );
}

fs.writeFileSync(path.join(out, "_relatorio.json"), JSON.stringify(relatorio, null, 1) + "\n", "utf8");
const total = Object.values(relatorio).reduce((a, b) => a + b.total, 0);
console.log("\ntotal de traducoes a fazer: " + total);
console.log("ficheiros em " + out);
