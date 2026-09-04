import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Minus, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ALL_PAIRS } from '@/lib/gating';
import { calcTradePips } from '@/lib/pips';
import type { TradeDirection, TradeResult } from '@/lib/types';

const PAIRS = ALL_PAIRS.filter((p) => p !== 'BTC/USD');

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (entry: {
    pair: string;
    direction: TradeDirection;
    entryPrice: number;
    exitPrice: number | null;
    lotSize: number;
    result: TradeResult;
    profitUsd: number;
    pips: number;
    notes: string;
    boomHourId: string | null;
    closedAt: string | null;
  }) => void;
}

function smallLabel(text: string) {
  return <div className="text-sm font-medium text-muted-foreground">{text}</div>;
}

export function AddTradeModal({ open, onClose, onSave }: Props) {
  const [pair, setPair] = useState(PAIRS[0]);
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [result, setResult] = useState<TradeResult>('WIN');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [profitUsd, setProfitUsd] = useState('');
  const [lotSize, setLotSize] = useState('');
  const [notes, setNotes] = useState('');
  const [pipsEdited, setPipsEdited] = useState<string | null>(null);

  const entryNum = Number(entryPrice);
  const exitNum = Number(exitPrice);
  const autoPips =
    entryPrice && exitPrice && isFinite(entryNum) && isFinite(exitNum)
      ? String(calcTradePips(pair, direction, entryNum, exitNum))
      : '';
  const pipsValue = pipsEdited ?? autoPips;

  const reset = () => {
    setPair(PAIRS[0]);
    setDirection('BUY');
    setResult('WIN');
    setEntryPrice('');
    setExitPrice('');
    setProfitUsd('');
    setLotSize('');
    setNotes('');
    setPipsEdited(null);
  };

  const handleToSave = () => {
    const pnl = Number(profitUsd);
    if (!isFinite(pnl)) {
      toast.error('Valor inválido', { description: 'Introduz o lucro/perda da operação.' });
      return;
    }
    onSave({
      pair,
      direction,
      entryPrice: entryPrice ? Number(entryPrice) : 0,
      exitPrice: exitPrice ? Number(exitPrice) : null,
      lotSize: lotSize ? Number(lotSize) : 0.01,
      result,
      profitUsd: pnl,
      pips: pipsValue ? Number(pipsValue) : 0,
      notes,
      boomHourId: null,
      closedAt: new Date().toISOString(),
    });
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle className="font-display text-lg">Registar</DialogTitle>
          <button
            onClick={onClose}
            className="rounded-full bg-muted p-2 text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            {smallLabel('Par')}
            <div className="flex flex-wrap gap-2">
              {PAIRS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPair(p)}
                  className={
                    pair === p
                      ? 'rounded-md border border-primary bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground'
                      : 'rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground'
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {smallLabel('Direção')}
            <div className="grid grid-cols-2 gap-2">
              {(['BUY', 'SELL'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className={
                    direction === d
                      ? d === 'BUY'
                        ? 'flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-3 text-sm font-bold text-white'
                        : 'flex items-center justify-center gap-2 rounded-lg bg-destructive px-3 py-3 text-sm font-bold text-white'
                      : 'flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-3 text-sm font-bold text-muted-foreground'
                  }
                >
                  {d === 'BUY' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {smallLabel('Resultado')}
            <div className="grid grid-cols-3 gap-2">
              {(['WIN', 'LOSS', 'BREAKEVEN'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setResult(r)}
                  className={
                    result === r
                      ? r === 'WIN'
                        ? 'flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2.5 text-sm font-bold text-white'
                        : r === 'LOSS'
                          ? 'flex items-center justify-center gap-1.5 rounded-lg bg-destructive px-3 py-2.5 text-sm font-bold text-white'
                          : 'flex items-center justify-center gap-1.5 rounded-lg bg-muted-foreground px-3 py-2.5 text-sm font-bold text-white'
                      : 'flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-bold text-muted-foreground'
                  }
                >
                  {r === 'WIN' ? (
                    <Trophy className="h-3.5 w-3.5" />
                  ) : r === 'LOSS' ? (
                    <X className="h-3.5 w-3.5" />
                  ) : (
                    <Minus className="h-3.5 w-3.5" />
                  )}
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              {smallLabel('Preço Entrada')}
              <Input
                type="text"
                inputMode="decimal"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="0.00000"
              />
            </div>
            <div className="space-y-1.5">
              {smallLabel('Preço Saída')}
              <Input
                type="text"
                inputMode="decimal"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                placeholder="0.00000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              {smallLabel('Lucro (USD)')}
              <Input
                type="text"
                inputMode="decimal"
                value={profitUsd}
                onChange={(e) => setProfitUsd(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              {smallLabel('Pips')}
              <Input
                type="text"
                inputMode="decimal"
                value={pipsValue}
                onChange={(e) => setPipsEdited(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">Pips calculados automaticamente</p>
            </div>
          </div>

          <div className="space-y-1.5">
            {smallLabel('Lote (opcional)')}
            <Input
              type="text"
              inputMode="decimal"
              value={lotSize}
              onChange={(e) => setLotSize(e.target.value)}
              placeholder="0.01"
            />
          </div>

          <div className="space-y-1.5">
            {smallLabel('Notas')}
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Segui sinal do boom hour..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              variant="outline"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleToSave} disabled={!pair || !entryPrice}>
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}