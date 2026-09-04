import { useCallback, useEffect, useState } from "react";
import type { BancaConfig } from "@/lib/types";

export const BANCA_STORAGE_KEY = "banca_config";

export const BANCA_DEFAULTS: BancaConfig = {
  capital: 0,
  achieved: 0,
  metaPercent: 25,
  riskPercent: 1,
  metaMonths: "1-3 meses",
  planId: "conservador",
  startDate: new Date().toISOString(),
  nextWithdrawal: "",
  totalWithdrawn: 0,
  profitEarned: 0,
};

export function useBanca() {
  const [config, setConfig] = useState<BancaConfig>(BANCA_DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BANCA_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BancaConfig>;
        setConfig({ ...BANCA_DEFAULTS, ...parsed });
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (next: BancaConfig) => {
    setConfig(next);
    localStorage.setItem(BANCA_STORAGE_KEY, JSON.stringify(next));
  }, []);

  return { config, loading, save };
}