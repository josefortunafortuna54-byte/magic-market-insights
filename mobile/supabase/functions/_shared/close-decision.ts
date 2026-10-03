// Decisao de fecho de um sinal, sem dependencias de Deno nem de rede, para poder
// ser testada. `close-signals/index.ts` importa daqui e e o unico que fala com a
// Base de Dados.

export type CloseOutcome = 'tp' | 'sl' | 'expired';

// Estados a que ainda pode ser atribuido um fecho. Um sinal que ja saiu daqui nao
// volta a entrar, mesmo que a query que alimenta o `close-signals` alargue o filtro.
const CLOSABLE_STATUSES = new Set(['active', 'pending']);

export interface CloseInput {
  signalType: string;
  price: number;
  entry: number;
  sl: number;
  tp: number;
  currentStatus: string;
  expiresAt?: string | null;
  now: Date;
}

/**
 * Devolve no maximo um outcome. Nao ha como devolver dois: e o que garante que um
 * sinal fecha uma vez so. Uma versao anterior decidia TP/SL e a expiracao em dois
 * blocos `if` independentes, e um sinal que cumprisse os dois escrevia duas linhas
 * em `signal_outcomes` e disparava duas actualizacoes para a mesma linha.
 */
export function decideClose(input: CloseInput): CloseOutcome | null {
  const { signalType, price, entry, sl, tp, currentStatus, expiresAt, now } = input;

  if (!CLOSABLE_STATUSES.has(currentStatus)) return null;

  // TP/SL tem precedencia sobre a expiracao: se o preco tocou o alvo, o sinal
  // chegou ao alvo.
  if (currentStatus === 'active') {
    const type = signalType.toUpperCase();
    if (type === 'BUY') {
      if (price >= tp) return 'tp';
      if (price <= sl) return 'sl';
    } else if (type === 'SELL') {
      if (price <= tp) return 'tp';
      if (price >= sl) return 'sl';
    }
  }

  // `expiresAt` e a unica fonte de verdade sobre expiracao. Nao usar uma regra
  // chapada de 48h: a janela e por timeframe (nextExpiry da M15 +4h, H1 +12h,
  // D1 +3 dias) e aos fins-de-semana salta para segunda 05:00 UTC, logo 48h
  // expiraria H4 e D1 antes da hora.
  if (expiresAt && new Date(expiresAt) < now) return 'expired';

  return null;
}

export function riskRewardOf(entry: number, sl: number, tp: number): number {
  return Math.abs(tp - entry) / Math.abs(entry - sl || 1);
}

export function pipsOf(outcome: CloseOutcome, entry: number, sl: number, tp: number, symbol: string): number {
  if (outcome === 'expired') return 0;
  const norm = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const pipMult = norm.includes('JPY') || norm.includes('XAU') ? 100 : 10000;
  const raw = outcome === 'tp' ? Math.abs(tp - entry) : -Math.abs(sl - entry);
  return Math.round(raw * pipMult * 10) / 10;
}
