import { supabase } from "./supabaseClient";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage`;

type AdminFnResult = Record<string, unknown>;

async function callAdminFn<T = AdminFnResult>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
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

  const raw = (await res.json()) as unknown as AdminFnResult;
  if (!res.ok || raw.error) throw new Error(String(raw.error || "Erro desconhecido"));
  return raw as T;
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

// ── Notifications ──────────────────────────────────────────────────────

export type NotificationType =
  | "receipt_pending" | "receipt_approved" | "receipt_rejected"
  | "withdrawal_pending"
  | "signal_closed" | "signal_tp" | "signal_sl"
  | "new_user" | "subscription_expired" | "subscription_expiring"
  | "system_error";

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export async function getNotifications(limit = 50): Promise<AdminNotification[]> {
  const data = await callAdminFn<{ data?: AdminNotification[] }>("list_notifications", { limit });
  return Array.isArray(data?.data) ? (data.data as AdminNotification[]) : [];
}

export async function markNotificationRead(id: string): Promise<void> {
  await callAdminFn("mark_notification_read", { id });
}

export async function markAllNotificationsRead(): Promise<void> {
  await callAdminFn("mark_all_notifications_read");
}

export async function getUnreadCount(): Promise<number> {
  const data = await callAdminFn("unread_count");
  return (data?.count as number) ?? 0;
}

// ── User Management ────────────────────────────────────────────────────

export interface UserWithSubscription {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role?: string;
  subscription_status?: string;
  subscription_expires?: string;
  banned?: boolean;
}

export type AdminUser = UserWithSubscription;

export interface AdminPushToken {
  id: string;
  user_id: string;
  token: string;
  platform: "ios" | "android";
  created_at: string;
}

export async function listUsers(): Promise<UserWithSubscription[]> {
  const data = await callAdminFn("list_users");
  return (data.users as UserWithSubscription[]) ?? [];
}

export async function premiumCount(): Promise<number> {
  const data = await callAdminFn("premium_count");
  return (data.count as number) ?? 0;
}

export async function expiringCount(): Promise<number> {
  const data = await callAdminFn("expiring_count");
  return (data?.count as number) ?? 0;
}

export interface RevenueStats {
  thisMonthRevenue: Record<string, number>;
  lastMonthRevenue: Record<string, number>;
  thisMonthByPlan: Record<string, number>;
  lastMonthByPlan: Record<string, number>;
  thisMonthCount: number;
  pendingWithdrawalsAmount: Record<string, number>;
}

export async function revenueStats(): Promise<RevenueStats> {
  return callAdminFn<RevenueStats>("revenue_stats", {});
}

export async function closeSignals(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/close-signals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({}),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok || data.error) throw new Error(String(data.error || "Erro ao fechar sinais"));
  return (data.closed as number) ?? 0;
}

// ── Signal Generation ─────────────────────────────────────────────────

export interface GenerateSignalsResult {
  ok: boolean;
  count: number;
  error?: string;
  transient?: boolean;
}

// Mirror of mobile's generateSignalsNow(): edge function `generate-crypto-signals`.
export async function generateCryptoSignals(): Promise<GenerateSignalsResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-crypto-signals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({}),
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const count = Array.isArray(data?.signals) ? (data.signals as unknown[]).length : 0;
    if (!res.ok || count === 0) {
      const serverError = !res.ok
        ? String(data?.error || data?.message || `HTTP ${res.status}`)
        : data?.tech_rejected != null
          ? `${data.tech_rejected} sinais rejeitados pelo validador técnico`
          : "Nenhum sinal encontrado agora";
      return { ok: false, count: 0, error: serverError };
    }
    return { ok: true, count };
  } catch (e: unknown) {
    const raw = e instanceof Error ? e.message : "Erro desconhecido";
    const name = e instanceof Error ? e.name : "";
    const transient =
      name === "TimeoutError" || name === "AbortError" || /cancel|abort|network/i.test(raw);
    return {
      ok: false,
      count: 0,
      error: transient ? "Ligação interrompida ou timeout. Tenta novamente." : raw,
      transient,
    };
  }
}

export async function banUser(userId: string): Promise<void> {
  await callAdminFn("ban_user", { user_id: userId });
}

export async function updateUserRole(userId: string, role: string): Promise<void> {
  await callAdminFn("update_user_role", { user_id: userId, role });
}

export async function updateSubscriptionExpiry(userId: string, expiresAt: string | null): Promise<void> {
  await callAdminFn("update_subscription_expiry", { user_id: userId, expires_at: expiresAt });
}

export async function sendDm(userId: string, text: string): Promise<{ conversation_id: string; message_id: string; notified: number }> {
  return callAdminFn<{ conversation_id: string; message_id: string; notified: number }>("send_dm", { user_id: userId, text });
}

export async function sendPush(userIds: string[] | null, title: string, message: string): Promise<{ notified: number; target_users: number }> {
  return callAdminFn<{ notified: number; target_users: number }>("send_push", { user_ids: userIds, title, message });
}

export interface MessageReport {
  id: string; message_id: string; reporter_id: string; reason: string;
  details: string | null; status: "pending" | "reviewed" | "dismissed" | "acted";
  reviewed_by: string | null; reviewed_at: string | null; created_at: string;
  messages?: { text: string; user_id: string; channel_id: string | null; conversation_id: string | null };
  reporter?: { email: string };
}

export async function listReports(status?: string): Promise<MessageReport[]> {
  const data = await callAdminFn<{ reports: MessageReport[] }>("list_reports", { status });
  return data.reports;
}

export async function dismissReport(id: string): Promise<void> {
  await callAdminFn("dismiss_report", { id });
}

export async function actOnReport(id: string, deleteMessage: boolean): Promise<void> {
  await callAdminFn("act_on_report", { id, delete_message: deleteMessage });
}

export async function reportCount(): Promise<number> {
  const data = await callAdminFn<{ count: number }>("report_count", {});
  return data.count;
}

export interface AdminChannel {
  id: string; name: string; display_name: string; description: string | null;
  icon: string | null; type: string; is_premium: boolean; created_at: string; updated_at: string | null;
}

export async function listChannels(): Promise<AdminChannel[]> {
  const data = await callAdminFn<{ channels: AdminChannel[] }>("list_channels", {});
  return data.channels;
}

export async function updateChannel(id: string, updates: { display_name?: string; description?: string; icon?: string; is_premium?: boolean }): Promise<void> {
  await callAdminFn("update_channel", { id, ...updates });
}

export async function deleteChannel(id: string): Promise<void> {
  await callAdminFn("delete_channel", { id });
}

export async function toggleChannelPremium(id: string): Promise<{ is_premium: boolean }> {
  return callAdminFn<{ is_premium: boolean }>("toggle_channel_premium", { id });
}

// ── Announcements ──────────────────────────────────────────────────────

export interface AdminAnnouncement {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  link: string | null;
  link_label: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  created_at: string;
}

export async function listAnnouncements(): Promise<AdminAnnouncement[]> {
  const data = await callAdminFn<{ announcements: AdminAnnouncement[] }>("list_announcements", {});
  return data.announcements ?? [];
}

export async function upsertAnnouncement(data: {
  id?: string;
  title: string;
  body?: string | null;
  image_url?: string | null;
  link?: string | null;
  link_label?: string | null;
  is_active?: boolean;
  sort_order?: number;
}): Promise<AdminAnnouncement> {
  const res = await callAdminFn<{ announcement: AdminAnnouncement }>("upsert_announcement", data);
  return res.announcement;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await callAdminFn("delete_announcement", { id });
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

// ── Bulk Delete ────────────────────────────────────────────────────────

export async function bulkDeleteSignals(ids: string[]): Promise<void> {
  await callAdminFn("bulk_delete_signals", { ids });
}

export async function bulkDeleteBoomHours(ids: string[]): Promise<void> {
  await callAdminFn("bulk_delete_boom_hours", { ids });
}

export async function bulkDeleteBoomTimes(ids: string[]): Promise<void> {
  await callAdminFn("bulk_delete_boom_times", { ids });
}

export async function bulkDeletePosts(ids: string[]): Promise<void> {
  await callAdminFn("bulk_delete_posts", { ids });
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
