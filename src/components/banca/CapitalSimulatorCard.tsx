import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calculator, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatBancaMoney } from "@/lib/format";

const STRATEGY_RETURN_PCT: Record<string, number> = {
  conservador: 25,
  equilibrado: 20,
  agressivo: 15,
};

const STRATEGY_NAME_KEY: Record<string, string> = {
  conservador: "planoCrescimento.conservative",
  equilibrado: "planoCrescimento.balanced",
  agressivo: "planoCrescimento.aggressive",
};

export function CapitalSimulatorCard({
  capital,
  currency = "usd",
  strategy = "conservador",
  onDeposit,
}: {
  capital: number;
  currency?: "usd" | "aoa";
  strategy?: string;
  onDeposit?: (amount: number) => void;
}) {
  const { t } = useTranslation();
  const returnPct = STRATEGY_RETURN_PCT[strategy] ?? 25;
  const strategyName = t(STRATEGY_NAME_KEY[strategy] ?? STRATEGY_NAME_KEY.conservador);
  const [raw, setRaw] = useState(capital > 0 ? String(Math.round(capital)) : "");

  const amount = useMemo(() => {
    const parsed = parseFloat(raw.replace(",", "."));
    return isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [raw]);

  const projected = amount * (1 + returnPct / 100);
  const profit = projected - amount;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-accent" />
            <p className="font-semibold">{t("capital.simulatorTitle")}</p>
          </div>
          <Badge className="bg-success/20 text-success border-success/30">+{returnPct}%</Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          {t("capital.simulatorDesc")}
        </p>

        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("capital.simulatorStrategy", { name: strategyName })}</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            {t("capital.simulatorAmount", { currency: currency.toUpperCase() })}
          </label>
          <Input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("capital.simulatorInvested")}</span>
          <span className="font-semibold">{formatBancaMoney(amount, currency)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("capital.simulatorProjected")}</span>
          <span className="font-semibold text-accent">{formatBancaMoney(projected, currency)}</span>
        </div>

        <div className="rounded-lg bg-success/10 py-3 text-center">
          <span className="text-sm font-bold text-success">
            {t("capital.simulatorProfit", { value: formatBancaMoney(profit, currency) })}
          </span>
        </div>

        {onDeposit ? (
          <Button
            variant="premium"
            className="w-full"
            disabled={amount < 50}
            onClick={() => onDeposit(amount)}
          >
            {t("capital.simulatorDepositCta")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}