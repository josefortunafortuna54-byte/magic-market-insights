import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import type { CapitalAccount, CapitalReport } from "@/lib/types";

interface CapitalAccountRow {
  user_id: string;
  currency: "usd" | "aoa";
  capital: number | string;
  achieved: number | string;
  total_withdrawn: number | string;
  status: string;
  updated_at?: string;
}

interface CapitalReportRow {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  starting_balance: number | string;
  ending_balance: number | string;
  profit: number | string;
  profit_pct: number | string;
  note: string | null;
  created_at: string;
}

function toAccount(row: CapitalAccountRow): CapitalAccount {
  return {
    user_id: row.user_id,
    currency: row.currency,
    capital: Number(row.capital) || 0,
    achieved: Number(row.achieved) || 0,
    total_withdrawn: Number(row.total_withdrawn) || 0,
    status: row.status,
    updated_at: row.updated_at,
  };
}

function toReport(row: CapitalReportRow): CapitalReport {
  return {
    id: row.id,
    user_id: row.user_id,
    period_start: row.period_start,
    period_end: row.period_end,
    starting_balance: Number(row.starting_balance) || 0,
    ending_balance: Number(row.ending_balance) || 0,
    profit: Number(row.profit) || 0,
    profit_pct: Number(row.profit_pct) || 0,
    note: row.note,
    created_at: row.created_at,
  };
}

async function fetchAccount(userId: string): Promise<CapitalAccount | null> {
  const { data, error } = await supabase
    .from("capital_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? toAccount(data as CapitalAccountRow) : null;
}

async function fetchReports(userId: string): Promise<CapitalReport[]> {
  const { data, error } = await supabase
    .from("capital_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(52);
  if (error) throw error;
  return ((data ?? []) as CapitalReportRow[]).map(toReport);
}

/**
 * Saldo e relatórios da Gestão de Capital publicados pela equipa.
 * Servidor é a fonte da verdade; realtime atualiza sem recarregar a página.
 */
export function useCapitalAccount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = !!user?.id;

  const accountQuery = useQuery<CapitalAccount | null, Error>({
    queryKey: ["capital-account", user?.id],
    queryFn: () => (user ? fetchAccount(user.id) : Promise.resolve(null)),
    enabled,
    staleTime: 60_000,
  });

  const reportsQuery = useQuery<CapitalReport[], Error>({
    queryKey: ["capital-reports", user?.id],
    queryFn: () => (user ? fetchReports(user.id) : Promise.resolve([])),
    enabled,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`capital-realtime-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "capital_accounts", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["capital-account", user.id] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "capital_reports", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["capital-reports", user.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    account: accountQuery.data ?? null,
    reports: reportsQuery.data ?? [],
    loading: accountQuery.isLoading || reportsQuery.isLoading,
  };
}