import { supabase } from "./supabaseClient";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage`;

type AdminFnResult = Record<string, unknown>;

async function callAdminFn(action: string, payload: Record<string, unknown> = {}): Promise<AdminFnResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const res = await fetch(FUNCTIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = (await res.json()) as AdminFnResult;
  if (!res.ok || data.error) throw new Error(String(data.error || "Erro desconhecido"));
  return data;
}

export async function addSignal(signal: {
  symbol: string; timeframe: string; signal_type: string;
  entry_price: number; stop_loss: number; target_price: number;
  confidence: number; reasons: string[];
}) {
  return callAdminFn("add_signal", signal);
}

export async function deleteSignal(id: string) {
  return callAdminFn("delete_signal", { id });
}

export async function updateSignalStatus(id: string, status: string) {
  return callAdminFn("update_status", { id, status });
}

export async function deleteAllActiveSignals() {
  return callAdminFn("delete_all_active");
}

export async function addBoomHour(data: {
  title: string; time_gmt: string; time_wat: string;
  pairs: string[]; days: string; description: string;
  volatility: number; badge: string;
}) {
  return callAdminFn("add_boom_hour", data);
}

export async function deleteBoomHour(id: string) {
  return callAdminFn("delete_boom_hour", { id });
}

export async function addPost(data: {
  title: string; content: string; pair: string;
  signal_type: string; image_url: string; audio_url: string;
}) {
  return callAdminFn("add_post", data);
}

export async function deletePost(id: string) {
  return callAdminFn("delete_post", { id });
}

export async function addBoomTime(data: {
  pair: string; boom_time: string; confidence: number;
  result: string; image_url: string; audio_url: string;
}) {
  return callAdminFn("add_boom_time", data);
}

export async function updateBoomResult(id: string, result: string) {
  return callAdminFn("update_boom_result", { id, result });
}

export async function deleteBoomTime(id: string) {
  return callAdminFn("delete_boom_time", { id });
}

export async function uploadFile(bucket: string, path: string, file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const data = await callAdminFn("upload_file", {
          bucket, path, file_base64: base64, content_type: file.type,
        });
        resolve(data.url as string);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("Erro ao ler ficheiro"));
    reader.readAsDataURL(file);
  });
}

// ── Payment Receipts ───────────────────────────────────────────────────

export interface PaymentReceipt {
  id: string;
  user_id: string;
  user_email: string;
  proof_url: string;
  plan: string;
  method: string;
  amount: number;
  currency: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  duplicate_of?: string | null;
  created_at: string;
}

export function getReferralCode(): string | null {
  try {
    return localStorage.getItem("ref_code");
  } catch {
    return null;
  }
}

export async function listReceipts(status?: string, limit = 50, offset = 0): Promise<PaymentReceipt[]> {
  const data = await callAdminFn("list_receipts", { status, limit, offset });
  return (data.receipts as PaymentReceipt[]) ?? [];
}

export async function approveReceipt(id: string): Promise<void> {
  await callAdminFn("approve_receipt", { id });
}

export async function rejectReceipt(id: string): Promise<void> {
  await callAdminFn("reject_receipt", { id });
}

export async function deleteReceipt(id: string): Promise<void> {
  await callAdminFn("delete_receipt", { id });
}

export async function saveReceipt(receipt: {
  user_id?: string;
  user_email?: string;
  proof_url: string;
  plan: string;
  method: string;
  amount: number;
  currency: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  // Código de afiliado capturado no primeiro arranque via deep link (?ref=).
  // Inserção direta (RLS permite apenas a própria linha) — não passa pela
  // função admin, que rejeitaria utilizadores normais.
  const { error } = await supabase.from("payment_receipts").insert({
    user_id: user.id,
    user_email: user.email ?? receipt.user_email ?? null,
    proof_url: receipt.proof_url,
    plan: receipt.plan,
    method: receipt.method,
    amount: receipt.amount,
    currency: receipt.currency,
    referral_code: getReferralCode(),
  });
  if (error) throw error;
}

export interface AdminCapitalAccount {
  user_id: string;
  email: string;
  currency: "usd" | "aoa";
  capital: number;
  achieved: number;
  total_withdrawn: number;
  status: string;
  updated_at?: string;
}

export async function listCapitalAccounts(): Promise<AdminCapitalAccount[]> {
  const data = await callAdminFn("list_capital_accounts", {});
  return (data.accounts as AdminCapitalAccount[]) ?? [];
}

export async function upsertCapitalAccount(data: {
  user_id: string;
  capital?: number;
  achieved?: number;
  total_withdrawn?: number;
  currency?: "usd" | "aoa";
}): Promise<void> {
  await callAdminFn("upsert_capital_account", data);
}

export async function postCapitalReport(data: {
  user_id: string;
  period_start: string;
  period_end: string;
  starting_balance: number;
  ending_balance: number;
  note?: string | null;
  currency?: "usd" | "aoa";
}): Promise<void> {
  await callAdminFn("post_capital_report", data);
}

export interface AdminCapitalReport {
  id: string;
  period_start: string;
  period_end: string;
  starting_balance: number;
  ending_balance: number;
  profit: number;
  profit_pct: number;
  note: string | null;
  created_at: string;
}

export async function listCapitalReports(userId: string): Promise<AdminCapitalReport[]> {
  const data = await callAdminFn("list_capital_reports", { user_id: userId });
  return (data.reports as AdminCapitalReport[]) ?? [];
}

// ── Withdrawal Requests ──────────────────────────────────────────────

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  method: string;
  amount: number;
  currency: string;
  details: string | null;
  status: "pending" | "approved" | "rejected" | "paid";
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
}

export async function submitWithdrawalRequest(req: {
  method: string;
  amount: number;
  currency: string;
  details?: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const { error } = await supabase.from("withdrawal_requests").insert({
    user_id: user.id,
    method: req.method,
    amount: req.amount,
    currency: req.currency,
    details: req.details ?? null,
  });
  if (error) throw error;
}

export async function listWithdrawals(status?: string, limit = 50, offset = 0): Promise<WithdrawalRequest[]> {
  const data = await callAdminFn("list_withdrawals", { status, limit, offset });
  return (data.withdrawals as WithdrawalRequest[]) ?? [];
}

export async function approveWithdrawal(id: string): Promise<void> {
  await callAdminFn("approve_withdrawal", { id });
}

export async function rejectWithdrawal(id: string): Promise<void> {
  await callAdminFn("reject_withdrawal", { id });
}

export async function rejectWithdrawalWithNotes(id: string, notes?: string): Promise<void> {
  await callAdminFn("reject_withdrawal", { id, notes });
}

export async function markWithdrawalPaid(id: string): Promise<void> {
  await callAdminFn("mark_withdrawal_paid", { id });
}
