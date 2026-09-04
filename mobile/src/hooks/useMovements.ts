import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Currency, PaymentMethod } from '@/lib/plans';

export type MovementType = 'deposit' | 'withdrawal';
export type MovementStatus = 'pendente' | 'concluido' | 'recusado';

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

export const MOVEMENTS_STORAGE_KEY = 'wallet_movements';

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

function fromRow(r: Record<string, unknown>): WalletMovement {
  return {
    id: r.id as string,
    type: r.type as MovementType,
    method: r.method as PaymentMethod,
    amount: Number(r.amount),
    currency: r.currency as Currency,
    plan: (r.plan as string) ?? undefined,
    status: r.status as MovementStatus,
    receiptId: (r.receipt_id as string) ?? undefined,
    notes: (r.notes as string) ?? undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export function useMovements() {
  const { user } = useAuth();
  const [movements, setMovements] = useState<WalletMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<WalletMovement[]>([]);

  // Load from AsyncStorage first (instant UI), then sync from Supabase
  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(MOVEMENTS_STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          const parsed = JSON.parse(raw) as WalletMovement[];
          if (Array.isArray(parsed)) {
            listRef.current = parsed;
            setMovements(parsed);
          }
        } catch { /* ignore */ }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    supabase
      .from('wallet_movements')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const server = data.map(fromRow);
        // Merge: server is source of truth, but keep local-only items not yet synced
        const serverIds = new Set(server.map((m) => m.id));
        const localOnly = listRef.current.filter((m) => !serverIds.has(m.id));
        const merged = [...server, ...localOnly].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        listRef.current = merged;
        setMovements(merged);
        AsyncStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(merged));
      });

    return () => { cancelled = true; };
  }, [user?.id]);

  const persist = async (updated: WalletMovement[]) => {
    listRef.current = updated;
    setMovements(updated);
    await AsyncStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(updated));
  };

  const addMovement = async (movement: Omit<WalletMovement, 'id' | 'createdAt'>) => {
    const record: WalletMovement = {
      ...movement,
      id: Crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    // Optimistic local update
    const next = [record, ...listRef.current];
    await persist(next);

    // Server write (fire-and-forget)
    if (user?.id) {
      try {
        await supabase.from('wallet_movements').insert(toRow(record, user.id));
      } catch { /* local-first: ignore server errors */ }
    }
  };

  const refresh = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('wallet_movements')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error || !data) return;
    const server = data.map(fromRow);
    const serverIds = new Set(server.map((m) => m.id));
    const localOnly = listRef.current.filter((m) => !serverIds.has(m.id));
    const merged = [...server, ...localOnly].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    await persist(merged);
  };

  const deleteMovement = async (id: string) => {
    const next = listRef.current.filter((m) => m.id !== id);
    await persist(next);

    if (user?.id) {
      try {
        await supabase.from('wallet_movements').delete().eq('id', id);
      } catch { /* local-first: ignore server errors */ }
    }
  };

  return { movements, loading, addMovement, deleteMovement, refresh };
}
