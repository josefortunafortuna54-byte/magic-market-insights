// Deteta chaves JSON repetidas no mesmo objeto.
//
// Um ficheiro de traducao e JSON, e o JSON aceita chaves repetidas no mesmo
// objeto: na leitura guarda a ultima e esquece a primeira. Nao da erro, nao
// avisa -- apenas mostra outra coisa no ecra.
//
// Foi assim que o cabecalho do painel de admin passou a dizer "Titulo":
// dentro do objeto "admin" havia "title": "Admin" (linha 419) e
// "title": "Titulo" (linha 675, uma etiqueta misplaced). A segunda
// ganhou, e t("admin.title") devolveu "Titulo" em todos os idiomas.
//
// A leitura normal de um ficheiro nao apanha isto: so de se contar o texto.
// A ideia e contar a profundidade de chaves -- quantos { estao abertos --
// e dizer que chave foi declarada em cada nivel.
const fs = require("fs");
const path = require("path");

const dir = path.join("src", "lib", "i18n", "locales");

function varrer(raw) {
  const linhas = raw.split("\n");
  // por nivel de profundidade: conjunto de chaves ja declaradas
  const niveis = [new Set()];
  const achadas = [];
  let i = 0;

  while (i < linhas.length) {
    const l = linhas[i];
    let j = 0;
    while (j < l.length) {
      const c = l[j];

      if (c === '"') {
        // string: le ate ao fim, respecting escapes
        let fim = j + 1;
        while (fim < l.length) {
          if (l[fim] === "\\") fim += 2;
          else if (l[fim] === '"') break;
          else fim++;
        }
        const conteudo = l.slice(j + 1, fim);

        // esta string era uma chave? olha para o que vem a seguir
        let k = fim + 1;
        while (k < l.length && l[k] === " ") k++;
        if (l[k] === ":") {
          const nivel = niveis[niveis.length - 1];
          if (nivel.has(conteudo)) {
            achadas.push({ chave: conteudo, linha: i + 1, nivel: niveis.length - 1 });
          } else {
            nivel.add(conteudo);
          }
        }
        j = fim + 1;
        continue;
      }

      if (c === "{" || c === "[") {
        niveis.push(new Set());
        j++;
        continue;
      }

      if (c === "}" || c === "]") {
        if (niveis.length > 1) niveis.pop();
        j++;
        continue;
      }

      j++;
    }
    i++;
  }
  return achadas;
}

let total = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
  const raw = fs.readFileSync(path.join(dir, f), "utf8");
  const d = varrer(raw);
  if (!d.length) {
    console.log(f.padEnd(10) + " limpo");
    continue;
  }
  console.log(f.padEnd(10) + " " + d.length + " repetida(s):");
  for (const x of d) {
    console.log("            " + x.chave.padEnd(22) + " linha " + String(x.linha).padStart(5) + "  (profundidade " + x.nivel + ")");
  }
  total += d.length;
}
console.log("\n" + (total ? total + " duplicadas no total" : "nenhuma chave duplicada"));
