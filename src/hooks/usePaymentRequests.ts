import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export type PaymentMethod = "binance" | "multicaixa";
export type PaymentStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface PaymentRequest {
  id: string;
  user_id: string;
  method: PaymentMethod;
  currency: "usd" | "aoa";
  amount: number;
  transaction_id: string;
  proof_url: string;
  status: PaymentStatus;
  created_at: string;
}

export function usePaymentRequests(userId: string | undefined) {
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("payment_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setPayments((data || []) as PaymentRequest[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (payload: {
    method: PaymentMethod;
    currency: "usd" | "aoa";
    amount: number;
    transactionId: string;
    file: File;
  }): Promise<void> => {
    if (!userId) throw new Error("Sessão expirada. Faz login novamente.");

    const cleanName = payload.file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${userId}/${Date.now()}-${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(path, payload.file);

    if (uploadError) throw new Error(`Erro ao enviar comprovativo: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(path);

    const { error: insertError } = await supabase.from("payment_requests").insert({
      user_id: userId,
      method: payload.method,
      currency: payload.currency,
      amount: payload.amount,
      transaction_id: payload.transactionId,
      proof_url: urlData.publicUrl,
      status: "pending",
    });

    if (insertError) throw new Error(insertError.message);

    await load();
  };

  return { payments, loading, submit, reload: load };
}
