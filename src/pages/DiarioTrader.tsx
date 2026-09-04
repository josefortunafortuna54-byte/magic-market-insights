import { useMemo, useState } from 'react';
import { Trash2, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Minus, CalendarPlus } from 'lucide-react';
import { ExportButton } from '@/components/admin/ExportButton';
import { AddTradeModal } from '@/components/journal/AddTradeModal';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTradeJournal } from '@/hooks/useTradeJournal';
import { formatMoney } from '@/lib/format';
import type { TradeEntry } from '@/lib/types';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function tradeDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

function DayCell({
  day,
  isSelected,
  hasTrades,
  pnl,
  isToday,
  onPress,
}: {
  day: number | null;
  isSelected: boolean;
  hasTrades: boolean;
  pnl: number;
  isToday: boolean;
  onPress: () => void;
}) {
  if (day === null) return <div className="w-[14.2857%] aspect-square" />;
  const dotColor = pnl > 0 ? 'bg-green-500' : pnl < 0 ? 'bg-red-500' : 'bg-muted-foreground/50';
  return (
    <button
      onClick={onPress}
      className={
        'flex aspect-square w-[14.2857%] flex-col items-center justify-center gap-1 rounded-lg ' +
        (isSelected
          ? 'bg-primary text-primary-foreground'
          : isToday
            ? 'bg-primary/15 text-foreground ring-1 ring-primary'
            : 'text-foreground')
      }
    >
      <span className={'text-[13px] ' + (isSelected ? 'font-extrabold' : isToday ? 'font-bold text-primary' : 'font-medium')}>
        {day}
      </span>
      {hasTrades ? <span className={'h-[5px] w-[5px] rounded-full ' + dotColor} /> : isToday ? <span className="h-[5px] w-[5px] rounded-full bg-primary" /> : null}
    </button>
  );
}

function TradeRow({ trade, onDelete }: { trade: TradeEntry; onDelete: () => void }) {
  const isWin = trade.result === 'WIN';
  const isLoss = trade.result === 'LOSS';
  const color = isWin ? 'text-green-600' : isLoss ? 'text-red-500' : 'text-muted-foreground';
  const iconBg = isWin ? 'bg-green-600/15' : isLoss ? 'bg-red-500/15' : 'bg-muted';
  const pnlSign = trade.profitUsd >= 0 ? '+' : '';
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={'flex h-9 w-9 items-center justify-center rounded-lg ' + iconBg}>
        {isWin ? (
          <ArrowUp className={'h-4 w-4 ' + color} />
        ) : isLoss ? (
          <ArrowDown className={'h-4 w-4 ' + color} />
        ) : (
          <Minus className={'h-4 w-4 ' + color} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{trade.pair}</span>
          <span className={'rounded bg-black/5 px-1.5 py-0.5 text-[11px] font-bold ' + color}>{trade.direction}</span>
        </div>
        {trade.notes ? <p className="truncate text-sm text-muted-foreground">{trade.notes}</p> : null}
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={'text-sm font-extrabold tabular-nums ' + color}>
          {pnlSign}
          {formatMoney(trade.profitUsd)}
        </span>
        <button onClick={onDelete} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Apagar">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function DiarioTrader() {
  const { trades, addTrade, removeTrade } = useTradeJournal();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [showAdd, setShowAdd] = useState(false);

  const exportColumns = [
    { key: 'date', label: 'Data' },
    { key: 'pair', label: 'Par' },
    { key: 'dir', label: 'Direção' },
    { key: 'entry', label: 'Entrada' },
    { key: 'exit', label: 'Saída' },
    { key: 'lots', label: 'Lotes' },
    { key: 'result', label: 'Resultado' },
    { key: 'pnl', label: 'PnL (USD)' },
    { key: 'pips', label: 'Pips' },
    { key: 'notes', label: 'Notas' },
  ];
  const exportData = trades.map((t) => ({
    date: t.createdAt.slice(0, 10),
    pair: t.pair,
    dir: t.direction,
    entry: t.entryPrice,
    exit: t.exitPrice ?? '',
    lots: t.lotSize,
    result: t.result,
    pnl: t.profitUsd,
    pips: t.pips,
    notes: t.notes,
  }));

  const todayKey = localDateKey(now);
  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);
  const monthLabel = new Date(year, month).toLocaleString('pt-PT', { month: 'long', year: 'numeric' });

  const dateKey = (d: number) => localDateKey(new Date(year, month, d));

  const selectedKey = dateKey(selectedDay);
  const selectedTrades = useMemo(
    () => trades.filter((t) => tradeDateKey(t.createdAt) === selectedKey),
    [trades, selectedKey],
  );
  const selectedPnl = selectedTrades.reduce((s, t) => s + t.profitUsd, 0);

  const tradesByDay = useMemo(() => {
    const map = new Map<string, { count: number; pnl: number }>();
    for (const t of trades) {
      const key = tradeDateKey(t.createdAt);
      const prev = map.get(key) ?? { count: 0, pnl: 0 };
      map.set(key, { count: prev.count + 1, pnl: prev.pnl + t.profitUsd });
    }
    return map;
  }, [trades]);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else setMonth(month + 1);
  };

  const handleDelete = (id: string) => {
    const ok = window.confirm('Tem certeza que quer apagar esta operação?');
    if (ok) void removeTrade(id);
  };

  const monthTrades = trades.filter((t) => {
    const d = tradeDateKey(t.createdAt).slice(0, 7);
    return d === `${year}-${String(month + 1).padStart(2, '0')}`;
  });
  const monthPnl = monthTrades.reduce((s, t) => s + t.profitUsd, 0);
  const monthWins = monthTrades.filter((t) => t.result === 'WIN').length;
  const monthWinRate = monthTrades.length > 0 ? Math.round((monthWins / monthTrades.length) * 100) : 0;

  return (
    <Layout>
      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Diário de Trader</h1>
            <p className="text-sm text-muted-foreground">Regista e acompanha as tuas operações dia a dia.</p>
          </div>
          <ExportButton data={exportData} filename="tmt-diario" columns={exportColumns} label="Exportar CSV" />
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={prevMonth}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-primary hover:text-foreground"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="flex-1 text-center text-lg font-bold capitalize">{monthLabel}</h2>
              <button
                onClick={nextMonth}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-primary hover:text-foreground"
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-1 flex">
              {WEEKDAYS.map((w) => (
                <span key={w} className="flex-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {w}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap">
              {monthDays.map((day, i) => {
                if (day === null) return <div key={`pad-${i}`} className="w-[14.2857%] aspect-square" />;
                const key = dateKey(day);
                const dayData = tradesByDay.get(key);
                const isToday = key === todayKey;
                return (
                  <DayCell
                    key={key}
                    day={day}
                    isSelected={day === selectedDay}
                    hasTrades={(dayData?.count ?? 0) > 0}
                    pnl={dayData?.pnl ?? 0}
                    isToday={isToday}
                    onPress={() => setSelectedDay(day)}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4">
          <div className="flex-1 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Operações no mês</p>
            <p className="text-lg font-extrabold tabular-nums">{monthTrades.length}</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex-1 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Win Rate</p>
            <p className="text-lg font-extrabold tabular-nums text-green-600">{monthWinRate}%</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex-1 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">P&L do mês</p>
            <p className={'text-lg font-extrabold tabular-nums ' + (monthPnl >= 0 ? 'text-green-600' : 'text-red-500')}>
              {monthPnl >= 0 ? '+' : ''}
              {formatMoney(monthPnl)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{selectedKey}</h2>
            {selectedTrades.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {selectedTrades.length} operações
                {selectedPnl !== 0 ? ` · ${selectedPnl >= 0 ? '+' : ''}${formatMoney(selectedPnl)} USD` : ''}
              </p>
            ) : null}
          </div>
          <Button onClick={() => setShowAdd(true)}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Registar
          </Button>
        </div>

        {selectedTrades.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <CalendarPlus className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Sem operações neste dia</p>
                <p className="text-sm text-muted-foreground">
                  Toca em 'Registar' para adicionar a primeira operação do dia.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-0">
              {selectedTrades.map((trade, i) => (
                <div key={trade.id}>
                  {i > 0 ? <div className="h-px w-full bg-border" /> : null}
                  <TradeRow trade={trade} onDelete={() => handleDelete(trade.id)} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <AddTradeModal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          onSave={(entry) => {
            const dateStr = dateKey(selectedDay);
            void addTrade({ ...entry, createdAt: `${dateStr}T12:00:00.000` });
          }}
        />
      </div>
    </Layout>
  );
}