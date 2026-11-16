import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
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
  requestId?: string;
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
    request_id: m.requestId ?? null,
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
    requestId: (r.request_id as string) ?? undefined,
    notes: (r.notes as string) ?? undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

interface AuthorityRow {
  id: string;
  status: string;
  amount: number | string;
  currency: string;
  created_at: string;
}

const statusFromAuthority = (status: string | null | undefined): MovementStatus => {
  if (status === 'approved' || status === 'paid') return 'concluido';
  if (status === 'rejected') return 'recusado';
  return 'pendente';
};

const sameMovement = (m: WalletMovement, row: AuthorityRow) => {
  if (Math.abs(Number(row.amount) - m.amount) > 0.01) return false;
  if (String(row.currency).toLowerCase() !== m.currency) return false;
  const delta = Math.abs(new Date(row.created_at).getTime() - new Date(m.createdAt).getTime());
  return Number.isFinite(delta) && delta <= 30 * 60 * 1000;
};

// A linha em wallet_movements é apenas um espelho. O estado que conta é o do
// comprovativo/pedido autoritativo: se o admin aprovar e o trigger não tiver
// corrido (ou o cliente estiver offline), o histórico ficaria preso em
// "pendente". Aqui o estado é recalculado a partir das tabelas reais.
async function reconcileStatuses(
  list: WalletMovement[],
  userId: string,
): Promise<WalletMovement[]> {
  if (list.length === 0) return list;

  const receiptIds = [
    ...new Set(
      list
        .filter((m) => m.type === 'deposit' && m.receiptId)
        .map((m) => m.receiptId as string),
    ),
  ];
  const requestIds = [
    ...new Set(
      list
        .filter((m) => m.type === 'withdrawal' && m.requestId)
        .map((m) => m.requestId as string),
    ),
  ];

  const receiptStatus = new Map<string, string>();
  const withdrawalStatus = new Map<string, string>();
  const movementStatus = new Map<string, string>();
  const links = new Map<string, Pick<WalletMovement, 'receiptId' | 'requestId'>>();

  if (receiptIds.length > 0) {
    const { data } = await supabase
      .from('payment_receipts')
      .select('id, status')
      .in('id', receiptIds);
    for (const row of (data ?? []) as { id: string; status: string }[]) {
      receiptStatus.set(row.id, row.status);
    }
  }

  if (requestIds.length > 0) {
    const { data } = await supabase
      .from('withdrawal_requests')
      .select('id, status')
      .in('id', requestIds);
    for (const row of (data ?? []) as { id: string; status: string }[]) {
      withdrawalStatus.set(row.id, row.status);
    }
  }

  for (const m of list) {
    if (m.type === 'deposit' && m.receiptId) {
      const status = receiptStatus.get(m.receiptId);
      if (status) movementStatus.set(m.id, status);
    } else if (m.type === 'withdrawal' && m.requestId) {
      const status = withdrawalStatus.get(m.requestId);
      if (status) movementStatus.set(m.id, status);
    }
  }

  // Movimentos antigos/sem ligação explícita: procura a linha autoritativa
  // mais próxima no tempo e reaproveita a ligação para as próximas leituras.
  const unlinkedDeposits = list.filter((m) => m.type === 'deposit' && !m.receiptId);
  if (unlinkedDeposits.length > 0) {
    const { data } = await supabase
      .from('payment_receipts')
      .select('id, status, amount, currency, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);
    const rows = (data ?? []) as AuthorityRow[];
    for (const m of unlinkedDeposits) {
      const match = rows.find((row) => sameMovement(m, row));
      if (match) {
        movementStatus.set(m.id, match.status);
        links.set(m.id, { receiptId: match.id });
      }
    }
  }

  const unlinkedWithdrawals = list.filter((m) => m.type === 'withdrawal' && !m.requestId);
  if (unlinkedWithdrawals.length > 0) {
    const { data } = await supabase
      .from('withdrawal_requests')
      .select('id, status, amount, currency, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);
    const rows = (data ?? []) as AuthorityRow[];
    for (const m of unlinkedWithdrawals) {
      const match = rows.find((row) => sameMovement(m, row));
      if (match) {
        movementStatus.set(m.id, match.status);
        links.set(m.id, { requestId: match.id });
      }
    }
  }

  return list.map((m) => {
    const raw = movementStatus.get(m.id);
    if (!raw) return m;
    const status = statusFromAuthority(raw);
    const link = links.get(m.id);
    if (status === m.status && !link) return m;
    return { ...m, status, ...(link ?? {}) };
  });
}

export function useMovements() {
  const { user } = useAuth();
  const userId = user?.id;
  const [movements, setMovements] = useState<WalletMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<WalletMovement[]>([]);

  const persist = useCallback(async (updated: WalletMovement[]) => {
    listRef.current = updated;
    setMovements(updated);
    await AsyncStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('wallet_movements')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return;

    const server = data.map(fromRow);
    // Servidor é a fonte da verdade, mas mantém itens locais ainda não sincronizados.
    const serverIds = new Set(server.map((m) => m.id));
    const localOnly = listRef.current.filter((m) => !serverIds.has(m.id));
    const merged = [...server, ...localOnly].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const reconciled = await reconcileStatuses(merged, userId);
    await persist(reconciled);
  }, [userId, persist]);

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
        } catch {
          /* ignore */
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    void refresh();
  }, [userId, refresh]);

  // A decisão do admin chega por realtime; sem isto o histórico só mudava
  // depois de recarregar a app.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`wallet-movements-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_movements', filter: `user_id=eq.${userId}` },
        () => void refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_receipts', filter: `user_id=eq.${userId}` },
        () => void refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'withdrawal_requests', filter: `user_id=eq.${userId}` },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  useEffect(() => {
    if (!userId) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [userId, refresh]);

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
    if (userId) {
      try {
        await supabase.from('wallet_movements').insert(toRow(record, userId));
      } catch {
        /* local-first: ignore server errors */
      }
    }
  };

  const deleteMovement = async (id: string) => {
    const target = listRef.current.find((m) => m.id === id);
    const next = listRef.current.filter((m) => m.id !== id);
    await persist(next);

    if (userId && target) {
      try {
        // Cancela a linha autoritativa pendente no servidor antes de apagar o
        // movimento — sem isto o pedido fica "fantasma" e o guard de depósito
        // (hasPendingDepositRequest) continua a bloquear novos depósitos.
        if (target.type === 'deposit') {
          if (target.receiptId) {
            await supabase
              .from('payment_receipts')
              .delete()
              .eq('id', target.receiptId)
              .eq('status', 'pending');
          } else {
            await supabase
              .from('payment_receipts')
              .delete()
              .eq('user_id', userId)
              .eq('status', 'pending')
              .eq('method', target.method)
              .eq('amount', target.amount)
              .eq('currency', target.currency);
          }
        } else {
          if (target.requestId) {
            await supabase
              .from('withdrawal_requests')
              .delete()
              .eq('id', target.requestId)
              .eq('status', 'pending');
          } else {
            await supabase
              .from('withdrawal_requests')
              .delete()
              .eq('user_id', userId)
              .eq('status', 'pending')
              .eq('method', target.method)
              .eq('amount', target.amount)
              .eq('currency', target.currency);
          }
        }
        await supabase.from('wallet_movements').delete().eq('id', id);
      } catch {
        /* local-first: ignore server errors */
      }
    }
  };

  return { movements, loading, addMovement, deleteMovement, refresh };
}
