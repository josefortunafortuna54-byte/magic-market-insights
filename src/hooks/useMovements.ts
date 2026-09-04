import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import type { Currency, PaymentMethod } from "@/lib/plans";

export type MovementType = "deposit" | "withdrawal";
export type MovementStatus = "pendente" | "concluido" | "recusado";

export interface WalletMovement {
  id: string;
  type: MovementType;
  method: PaymentMethod;
  amount: number;
  currency: Currency;
  plan?: string;
  status: MovementStatus;
  receiptId?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export const MOVEMENTS_STORAGE_KEY = "wallet_movements";

function toRow(m: WalletMovement, userId: string) {
  return {
    id: m.id,
    user_id: userId,
    type: m.type,
    method: m.method,
    amount: m.amount,
    currency: m.currency,
    plan: m.plan ?? null,
    status: m.status,
    receipt_id: m.receiptId ?? null,
    notes: m.notes ?? null,
    created_at: m.createdAt,
    updated_at: m.updatedAt ?? m.createdAt,
  };
}

interface MovementRow {
  id: string;
  type: MovementType;
  method: PaymentMethod;
  amount: number | string;
  currency: Currency;
  plan: string | null;
  status: MovementStatus;
  receipt_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function fromRow(r: MovementRow): WalletMovement {
  return {
    id: r.id,
    type: r.type,
    method: r.method,
    amount: Number(r.amount),
    currency: r.currency,
    plan: r.plan ?? undefined,
    status: r.status,
    receiptId: r.receipt_id ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const readStorage = (): WalletMovement[] => {
  try {
    const raw = localStorage.getItem(MOVEMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WalletMovement[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStorage = (list: WalletMovement[]) => {
  localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(list));
};

const sortDesc = (list: WalletMovement[]) =>
  [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

export function useMovements() {
  const { user } = useAuth();
  const [movements, setMovements] = useState<WalletMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<WalletMovement[]>([]);

  useEffect(() => {
    listRef.current = readStorage();
    setMovements(listRef.current);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    supabase
      .from("wallet_movements")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const server = (data as MovementRow[]).map(fromRow);
        // Merge: servidor é a fonte da verdade, mas mantém itens locais ainda não sincronizados
        const serverIds = new Set(server.map((m) => m.id));
        const localOnly = listRef.current.filter((m) => !serverIds.has(m.id));
        const merged = sortDesc([...server, ...localOnly]);
        listRef.current = merged;
        setMovements(merged);
        writeStorage(merged);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const persist = async (updated: WalletMovement[]) => {
    listRef.current = updated;
    setMovements(updated);
    writeStorage(updated);
  };

  const addMovement = async (movement: Omit<WalletMovement, "id" | "createdAt">) => {
    const record: WalletMovement = {
      ...movement,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    // Atualização local otimista
    const next = [record, ...listRef.current];
    await persist(next);

    // Escrita no servidor (fire-and-forget)
    if (user?.id) {
      try {
        await supabase.from("wallet_movements").insert(toRow(record, user.id));
      } catch {
        /* local-first: ignora erros do servidor */
      }
    }
  };

  const refresh = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("wallet_movements")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error || !data) return;
    const server = (data as MovementRow[]).map(fromRow);
    const serverIds = new Set(server.map((m) => m.id));
    const localOnly = listRef.current.filter((m) => !serverIds.has(m.id));
    const merged = sortDesc([...server, ...localOnly]);
    await persist(merged);
  };

  const deleteMovement = async (id: string) => {
    const next = listRef.current.filter((m) => m.id !== id);
    await persist(next);

    if (user?.id) {
      try {
        await supabase.from("wallet_movements").delete().eq("id", id);
      } catch {
        /* local-first: ignora erros do servidor */
      }
    }
  };

  return { movements, loading, addMovement, deleteMovement, refresh };
}