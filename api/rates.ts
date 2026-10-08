/**
 * Proxy de taxas de cambio.
 *
 * Antes, o browser pedia diretamente ao frankfurter, um par de cada vez e
 * duas datas por par (hoje e ontem) para calcular a variacao: 16 pedidos
 * por cliente a cada minuto. O frankfurter e um servico gratuito e lento
 * (medido: 10-13 s), pelo que o browser acabava a falhar com ERR_FAILED
 * e os precos ficavam congelados sem aviso nenhum ao utilizador.
 *
 * O frankfurter deixou de servir para isto por dois motivos:
 * 1. `latest` so avanca uma vez por dia, e nos dias em que o snapshot
 *    ainda e o de ontem a variacao e 0.00% para todo o forex; e
 * 2. nao tem XAU/USD, e o goldprice.org que se usou a seguir passou a
 *    responder Forbidden a pedidos de servidor.
 *
 * Agora o pedido e feito uma unica vez, no servidor, e a resposta e
 * servida do cache da CDN. O browser passa a fazer 1 pedido por minuto,
 * a partir da propria origem (sem CORS) e sem depender da latencia do
 * upstream. Precos e variacao (percentagem desde o fecho anterior, igual
 * ao que o mobile mostra) vem da API de charts do Yahoo Finance, que nao
 * precisa de chave: um pedido por par, 9 no total por build.
 *
 * O bitcoin tambem passa por aqui, mas pela Binance: o preco do coingecko
 * que se usava antes ja nao serve, passou a responder 403 por bloqueio
 * do Cloudflare tanto a pedidos de servidor como de browser. Ver
 * useLivePrices, que mantem um pedido directo como recurso.
 */

export const config = { runtime: "edge" };

const BINANCE = "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT";
const YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart/";

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

type Pair = { price: number; change: number };
type Payload = { date: string; pairs: Record<string, Pair | null>; stale: boolean };

// Um pedido por par, todos de graca e sem cookies. O Yahoo devolve o
// preco atual e a variacao desde o fecho anterior no mesmo payload,
// pelo que nao ha calculos nem segundas datas. XAU/USD nao existe como
// par spot no Yahoo (responde 404); usa-se o futuro GC=F, que e a
// aproximacao gratuita mais proxima do spot.
const SYMBOLS: Array<{ id: string; symbol: string }> = [
  { id: "EUR/USD", symbol: "EURUSD=X" },
  { id: "GBP/USD", symbol: "GBPUSD=X" },
  { id: "USD/JPY", symbol: "USDJPY=X" },
  { id: "AUD/USD", symbol: "AUDUSD=X" },
  { id: "EUR/GBP", symbol: "EURGBP=X" },
  { id: "USD/CHF", symbol: "USDCHF=X" },
  { id: "NZD/USD", symbol: "NZDUSD=X" },
  { id: "USD/CAD", symbol: "USDCAD=X" },
  { id: "XAU/USD", symbol: "GC=F" },
];

let memo: { at: number; data: Payload } | null = null;

async function getYahooPair(symbol: string): Promise<Pair | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${YAHOO}${symbol}?interval=1d&range=5d`, {
      headers: { "user-agent": "Mozilla/5.0" },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      chart?: {
        result?: Array<{ meta?: { regularMarketPrice?: number; regularMarketChangePercent?: number } }>;
      };
    };
    const meta = json.chart?.result?.[0]?.meta;
    const price = Number(meta?.regularMarketPrice);
    if (!Number.isFinite(price) || price <= 0) return null;
    const pct = Number(meta?.regularMarketChangePercent);
    return {
      price,
      change: Number.isFinite(pct) ? Math.round(pct * 100) / 100 : 0,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getBtc(): Promise<Pair | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BINANCE, { signal: ctrl.signal });
    if (!res.ok) return null;
    const j = (await res.json()) as { lastPrice?: unknown; priceChangePercent?: unknown };
    const price = Number(j.lastPrice);
    const pct = Number(j.priceChangePercent);
    if (!Number.isFinite(price) || price <= 0) return null;
    return { price, change: Number.isFinite(pct) ? Math.round(pct * 100) / 100 : 0 };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function build(): Promise<Payload> {
  const [quotes, btc] = await Promise.all([
    Promise.all(SYMBOLS.map(({ symbol }) => getYahooPair(symbol))),
    getBtc(),
  ]);

  const pairs: Record<string, Pair | null> = {};
  SYMBOLS.forEach(({ id }, i) => {
    pairs[id] = quotes[i];
  });
  pairs["BTC/USD"] = btc;

  // Sem nenhum preco o payload e marcado como velho para o cliente saber
  // que nao e fresco; um par so (ex. o ouro com o mercado fechado) nao
  // compromete o resto.
  return {
    date: new Date().toISOString().slice(0, 10),
    pairs,
    stale: !Object.values(pairs).some(Boolean),
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
  // `pairs` tem sempre uma chave por par conhecido, mesmo quando o valor
  // e null, por isso conta-se quantos trouxeram preco.
  if (Object.values(data.pairs).some(Boolean)) {
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