import { useLivePrices } from "@/hooks/useLivePrices";
import { ALL_PAIRS } from "@/lib/gating";
import { cn } from "@/lib/utils";

interface ChipProps {
  pair: string;
  price: string;
  change: number;
}

function PriceChip({ pair, price, change }: ChipProps) {
  const up = change > 0;
  const down = change < 0;
  return (
    <div
      className={cn(
        "flex items-center gap-2 whitespace-nowrap rounded-lg border border-border/60 bg-card/80 px-3.5 py-1.5",
        price !== "—" && up && "animate-price-flash-up",
        price !== "—" && down && "animate-price-flash-down",
      )}
    >
      <span className="text-xs font-semibold text-muted-foreground">{pair}</span>
      <span className="font-mono text-xs font-bold tabular-nums">{price}</span>
      <span
        className={cn(
          "text-[11px] font-bold tabular-nums",
          up ? "text-success" : down ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {up ? "+" : ""}
        {Number.isFinite(change) ? change.toFixed(2) : "0.00"}%
      </span>
    </div>
  );
}

export function PriceTicker() {
  const { prices, loading } = useLivePrices(ALL_PAIRS);

  const chips = ALL_PAIRS.map((pair) => ({
    pair,
    price: prices[pair]?.price ?? "—",
    change: prices[pair]?.change ?? 0,
  }));

  if (loading && chips.every((c) => c.price === "—")) return null;

  const Row = ({ hidden }: { hidden?: boolean }) => (
    <div aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-2 pr-2">
      {chips.map((c) => (
        <PriceChip key={`${c.pair}-${c.price}`} {...c} />
      ))}
    </div>
  );

  return (
    <div className="relative z-10 overflow-hidden border-b border-border/40 bg-secondary/40 py-2">
      <div className="flex w-max animate-ticker hover:[animation-play-state:paused]">
        <Row />
        <Row hidden />
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}