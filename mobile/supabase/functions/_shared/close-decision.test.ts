import { decideClose, pipsOf, riskRewardOf, type CloseInput } from './close-decision';

const NOW = new Date('2026-01-15T12:00:00Z');

function sinal(over: Partial<CloseInput> = {}): CloseInput {
  return {
    signalType: 'BUY',
    price: 1.1000,
    entry: 1.1000,
    sl: 1.0950,
    tp: 1.1100,
    currentStatus: 'active',
    expiresAt: '2026-01-15T16:00:00Z',
    now: NOW,
    ...over,
  };
}

describe('decideClose', () => {
  it('devolve TP e nada mais quando o preco atinge o alvo', () => {
    expect(decideClose(sinal({ price: 1.1100 }))).toBe('tp');
  });

  it('devolve SL e nada mais quando o preco atinge o stop', () => {
    expect(decideClose(sinal({ price: 1.0950 }))).toBe('sl');
  });

  it('inverte as condicoes em SELL', () => {
    const sell = { signalType: 'SELL', tp: 1.0900, sl: 1.1100 };
    expect(decideClose(sinal({ ...sell, price: 1.0900 }))).toBe('tp');
    expect(decideClose(sinal({ ...sell, price: 1.1100 }))).toBe('sl');
  });

  // Este e o bug que o modulo corrige: TP e expiracao em simultaneo devolviam dois
  // resultados, e o caller escrevia duas linhas em `signal_outcomes` e disparava
  // duas actualizacoes para a mesma linha.
  it('devolve um unico outcome quando o preco tocou o alvo E expirou', () => {
    const r = decideClose(
      sinal({ price: 1.1100, expiresAt: '2026-01-15T11:00:00Z' }),
    );
    expect(r).toBe('tp');
    expect(Array.isArray(r)).toBe(false);
  });

  it('expira sem ter tocado em TP nem SL', () => {
    expect(
      decideClose(sinal({ price: 1.1050, expiresAt: '2026-01-15T11:00:00Z' })),
    ).toBe('expired');
  });

  it('nao fecha um sinal ainda dentro da janela', () => {
    expect(decideClose(sinal({ price: 1.1050 }))).toBeNull();
  });

  // A regra chapada de 48h da raiz foi rejeitada. Um D1 expira ~72h depois de
  // gerado, e um H4 que salta para a sessao seguinte pode passar as 48h. Uma
  // regra fixa fecharia ambos cedo demais.
  it('nao expira um sinal com expires_at no futuro, mesmo acima de 48h', () => {
    expect(
      decideClose(
        sinal({ price: 1.1050, expiresAt: '2026-01-17T16:00:00Z' }), // 52h > 48h
      ),
    ).toBeNull();
  });

  it('ignora TP/SL em sinais pending, mas respeita a expiracao', () => {
    const pending = { currentStatus: 'pending', price: 1.1100 };
    expect(
      decideClose(sinal({ ...pending, expiresAt: '2026-01-15T16:00:00Z' })),
    ).toBeNull();
    expect(
      decideClose(sinal({ ...pending, expiresAt: '2026-01-15T11:00:00Z' })),
    ).toBe('expired');
  });

  it.each(['closed', 'tp', 'sl', 'expired', 'cancelled', 'qualquer-outro'])(
    'nao re-fecha um sinal em estado terminal: %s',
    (estado) => {
      expect(
        decideClose(
          sinal({ currentStatus: estado, price: 1.1100, expiresAt: '2026-01-15T11:00:00Z' }),
        ),
      ).toBeNull();
    },
  );
});

describe('pipsOf', () => {
  it('sinaliza TP positivo e SL negativo', () => {
    expect(pipsOf('tp', 1.1, 1.09, 1.12, 'EURUSD')).toBeCloseTo(200, 1);
    expect(pipsOf('sl', 1.1, 1.09, 1.12, 'EURUSD')).toBeCloseTo(-100, 1);
  });

  it('expirado vale zero', () => {
    expect(pipsOf('expired', 1.1, 1.09, 1.12, 'EURUSD')).toBe(0);
  });

  it('escala JPY e XAU por 100, nao 10000', () => {
    expect(pipsOf('tp', 150, 148, 152, 'USDJPY')).toBeCloseTo(200, 1);
    expect(pipsOf('tp', 2000, 1980, 2050, 'XAUUSD')).toBeCloseTo(5000, 1);
  });

  it('normaliza simbolos com sufixos e separadores', () => {
    expect(pipsOf('tp', 1.1, 1.09, 1.12, 'eur/usd')).toBeCloseTo(200, 1);
    expect(pipsOf('tp', 1.1, 1.09, 1.12, 'EURUSD.m')).toBeCloseTo(200, 1);
  });
});

describe('riskRewardOf', () => {
  it('razao alvo/riesco', () => {
    expect(riskRewardOf(1.1, 1.09, 1.12)).toBeCloseTo(2, 5);
  });

  it('nao divide por zero quando entrada e stop coincidem', () => {
    expect(Number.isFinite(riskRewardOf(1.1, 1.1, 1.12))).toBe(true);
  });
});
