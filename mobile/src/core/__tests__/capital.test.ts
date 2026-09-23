import { clamp, profit, profitPct, progressPct, withdrawable } from '../capital';

describe('capital helpers', () => {
  it('profit: saldo menos investido', () => {
    expect(profit(1200, 1000)).toBe(200);
    expect(profit(900, 1000)).toBe(-100);
  });

  it('profitPct: % relativa e 0 quando capital é 0', () => {
    expect(profitPct(1200, 1000)).toBeCloseTo(20);
    expect(profitPct(900, 1000)).toBeCloseTo(-10);
    expect(profitPct(100, 0)).toBe(0);
    expect(profitPct(NaN, 1000)).toBe(0);
  });

  it('progressPct: clamp 0..100, target 0 → 0', () => {
    expect(progressPct(1250, 1000, 25)).toBe(100);
    expect(progressPct(1050, 1000, 25)).toBeCloseTo(20);
    expect(progressPct(950, 1000, 25)).toBe(0);
    expect(progressPct(1200, 0, 25)).toBe(0);
  });

  it('withdrawable: nunca devolve negativo', () => {
    expect(withdrawable(500)).toBe(500);
    expect(withdrawable(-50)).toBe(0);
    expect(withdrawable(NaN)).toBe(0);
  });

  it('clamp: limita entre min e max', () => {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(42, 0, 100)).toBe(42);
  });
});