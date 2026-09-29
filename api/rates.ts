/**
 * Proxy de taxas de cambio.
 *
 * Antes, o browser pedia diretamente ao frankfurter, um par de cada vez e
 * duas datas por par (hoje e ontem) para calcular a variacao: 16 pedidos
 * por cliente a cada minuto. O frankfurter e um servico gratuito e lento
 * (medido: 10-13 s), pelo que o browser acabava a falhar com ERR_FAILED
 * e os precos ficavam congelados sem aviso nenhum ao utilizador.
 *
 * Aqui o pedido e feito uma unica vez, no servidor, e a resposta e
 * servida do cache da CDN. O browser passa a fazer 1 pedido por minuto,
 * a partir da propria origem (sem CORS) e sem depender da latencia do
 * upstream.
 *
 * O bitcoin nao passa por aqui: o coingecko responde 403 a pedidos de
 * servidor e so aceita a chamada vinda do browser. Ver useLivePrices.
 */

export const config = { runtime: "edge" };

const UPSTREAM = "https://api.frankfurter.app";

// O upstream demora segundos. Corta antes de a funcao expirar, para
// devolver o que houver em cache em vez de um 500.
const TIMEOUT_MS = 6000;
// TTL da CDN. Vercel reescreve o Cache-Control normal, por isso o TTL da
// rede tem de ir em CDN-Cache-Control: e o que o proxy usa mesmo.
// 5 min de servo + 1 h de resposta velha a revalidar em segundo plano,
// para nunca servir um erro a um utilizador.
const S_MAXAGE = 300;
const STALE_REVALIDATE = 3600;
const MEMO_TTL_MS = 4 * 60 * 1000;

type Rates = Record<string, number>;
type Pair = { price: number; change: number };
type Payload = { date: string; pairs: Record<string, Pair | null>; stale: boolean };

/**
 * Todos os pares sao derivados de uma unica chamada com base USD.
 * Com `from=USD`, rates[X] e quantos X valem 1 USD, logo os pares
 * invertidos sao 1/rates[X].
 */
const FOREX: Array<{ id: string; calc: (r: Rates) => number | null }> = [
  { id: "EUR/USD", calc: (r) => (r.EUR ? 1 / r.EUR : null) },
  { id: "GBP/USD", calc: (r) => (r.GBP ? 1 / r.GBP : null) },
  { id: "USD/JPY", calc: (r) => r.JPY ?? null },
  { id: "AUD/USD", calc: (r) => (r.AUD ? 1 / r.AUD : null) },
  { id: "EUR/GBP", calc: (r) => (r.EUR && r.GBP ? r.GBP / r.EUR : null) },
  { id: "USD/CHF", calc: (r) => r.CHF ?? null },
  { id: "NZD/USD", calc: (r) => (r.NZD ? 1 / r.NZD : null) },
  { id: "USD/CAD", calc: (r) => r.CAD ?? null },
  // XAU/USD (ouro) nao existe no feed do frankfurter -- responde 404.
  // Sem outra fonte de metais, fica fora; antes disto tambem falhava,
  // mas custava um pedido por minuto.
];

async function getJson(url: string): Promise<unknown | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const asRates = (v: unknown): Rates | null => {
  if (!v || typeof v !== "object") return null;
  const rates = (v as { rates?: unknown }).rates;
  if (!rates || typeof rates !== "object") return null;
  const out: Rates = {};
  for (const [k, val] of Object.entries(rates as Record<string, unknown>)) {
    const n = Number(val);
    if (Number.isFinite(n) && n > 0) out[k] = n;
  }
  return Object.keys(out).length ? out : null;
};

function yesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

let memo: { at: number; data: Payload } | null = null;

async function build(): Promise<Payload> {
  // Apenas as series cambiais. O bitcoin nao passa por aqui: o
  // coingecko responde 403 a pedidos de servidor (deteccao de bot por
  // User-Agent) e so aceita a chamada vinda do browser, que e o
  // caminho que ja funcionava.
  const [hoje, ontem] = await Promise.all([
    getJson(`${UPSTREAM}/latest?from=USD`),
    getJson(`${UPSTREAM}/${yesterday()}?from=USD`),
  ]);

  const rHoje = asRates(hoje);
  const rOntem = asRates(ontem);
  const pairs: Record<string, Pair | null> = {};

  for (const { id, calc } of FOREX) {
    const price = rHoje ? calc(rHoje) : null;
    if (price === null) {
      pairs[id] = null;
      continue;
    }
    const prev = rOntem ? calc(rOntem) : null;
    pairs[id] = {
      price,
      change: prev ? Math.round(((price - prev) / prev) * 10000) / 100 : 0,
    };
  }

  // Sem uma das duas series nao da para calcular a variacao, por isso o
  // payload e marcado como velho para o cliente saber que nao e fresco.
  const semSerieCompleta = !rHoje || !rOntem;
  return {
    date: new Date().toISOString().slice(0, 10),
    pairs,
    stale: semSerieCompleta,
  };
}

export default async function handler(): Promise<Response> {
  const now = Date.now();
  if (memo && now - memo.at < MEMO_TTL_MS) {
    return json(memo.data, 200);
  }

  let data: Payload;
  try {
    data = await build();
  } catch {
    // O upstream partiu-se. Se ha copia em memoria, serve-a com um
    // TTL maior: um preco de ontem e melhor do que nenhum preco.
    data = memo
      ? { ...memo.data, stale: true }
      : { date: "", pairs: {}, stale: true };
  }

  // Nunca fazer cache de uma resposta sem dados, senao a falha gruda.
  if (Object.keys(data.pairs).length) {
    memo = { at: now, data };
  }
  return json(data, 200);
}

function json(data: Payload, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Navegador: revalidar a cada minuto, que e a cadencia do cliente.
      "cache-control": "public, max-age=60",
      // Rede: o TTL que interessa. Vai em CDN-Cache-Control porque e o
      // header que a Vercel respeita; o Cache-Control acima e reescrito.
      "CDN-Cache-Control": `public, s-maxage=${S_MAXAGE}, stale-while-revalidate=${STALE_REVALIDATE}`,
    },
  });
}
