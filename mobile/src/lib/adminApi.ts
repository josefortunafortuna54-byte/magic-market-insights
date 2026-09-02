import { supabase } from '@/lib/supabase';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';
import { i18n } from '@/lib/i18n';
import { getReferralCode } from '@/lib/referral';
import type { AdminNotification } from '@/core/types';

const ADMIN_FN = `${SUPABASE_URL}/functions/v1/admin-manage`;

async function callAdminFn<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error(i18n.t('adminErrors.notAuthenticated'));

  const res = await fetch(ADMIN_FN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || i18n.t('adminErrors.unknown'));
  return data;
}

export async function addSignal(signal: {
  symbol: string;
  timeframe: string;
  signal_type: string;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  confidence: number;
  reasons: string[];
}) {
  return callAdminFn('add_signal', signal);
}

export async function deleteSignal(id: string) {
  return callAdminFn('delete_signal', { id });
}

export async function updateSignalStatus(id: string, status: string) {
  return callAdminFn('update_status', { id, status });
}

export async function addBoomHour(data: {
  title: string;
  time_gmt: string;
  time_wat: string;
  pairs: string[];
  days: string;
  description: string;
  volatility: number;
  badge: string;
}) {
  return callAdminFn('add_boom_hour', data);
}

export async function deleteBoomHour(id: string) {
  return callAdminFn('delete_boom_hour', { id });
}

export async function addBoomTime(data: {
  pair: string;
  boom_time: string;
  confidence: number;
  result: string;
  image_url: string;
  audio_url: string;
}) {
  return callAdminFn('add_boom_time', data);
}

export async function updateBoomResult(id: string, result: string) {
  return callAdminFn('update_boom_result', { id, result });
}

export async function deleteBoomTime(id: string) {
  return callAdminFn('delete_boom_time', { id });
}

export async function addPost(data: {
  title: string;
  content: string;
  pair: string;
  signal_type: string;
  image_url?: string;
  audio_url?: string;
}) {
  return callAdminFn('add_post', data);
}

export async function deletePost(id: string) {
  return callAdminFn('delete_post', { id });
}

export async function listUsers(): Promise<{ id: string; email: string; created_at: string; last_sign_in_at: string | null; role?: string; subscription_status?: string; subscription_expires?: string }[]> {
  const data = await callAdminFn('list_users');
  return data.users ?? [];
}

export async function premiumCount(): Promise<number> {
  const data = await callAdminFn('premium_count');
  return data.count ?? 0;
}

export async function closeSignals(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error(i18n.t('adminErrors.notAuthenticated'));

  const res = await fetch(`${SUPABASE_URL}/functions/v1/close-signals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || i18n.t('adminErrors.close'));
  return data.closed ?? 0;
}

// ── Payment Receipts ────────────────────────────────────────────────────

export interface PaymentReceipt {
  id: string;
  user_id: string;
  user_email: string;
  proof_url: string;
  plan: string;
  method: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  duplicate_of?: string | null;
  created_at: string;
}

export async function listReceipts(status?: string, limit = 50, offset = 0): Promise<PaymentReceipt[]> {
  const { receipts } = await callAdminFn<{ receipts: PaymentReceipt[] }>('list_receipts', { status, limit, offset });
  return receipts;
}

export async function approveReceipt(id: string): Promise<void> {
  await callAdminFn('approve_receipt', { id });
}

export async function rejectReceipt(id: string): Promise<void> {
  await callAdminFn('reject_receipt', { id });
}

export async function deleteReceipt(id: string): Promise<void> {
  await callAdminFn('delete_receipt', { id });
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
  if (!user) throw new Error(i18n.t('adminErrors.notAuthenticated'));
  // Código de afiliado capturado no primeiro arranque via deep link (?ref=).
  // Serve para a equipa saber a origem e creditar o capital no approve.
  const referral = await getReferralCode();
  // Inserção direta (RLS permite apenas a própria linha) — não passa pela
  // função admin, que rejeitaria utilizadores normais.
  const { error } = await supabase.from('payment_receipts').insert({
    user_id: user.id,
    user_email: user.email ?? receipt.user_email ?? null,
    proof_url: receipt.proof_url,
    plan: receipt.plan,
    method: receipt.method,
    amount: receipt.amount,
    currency: receipt.currency,
    referral_code: referral,
  });
  if (error) throw error;
}

// ── Notifications ──────────────────────────────────────────────────────

export async function getNotifications(limit = 50): Promise<AdminNotification[]> {
  const data = await callAdminFn<{ data?: AdminNotification[] }>('list_notifications', { limit });
  return Array.isArray(data?.data) ? data.data : [];
}

export async function markNotificationRead(id: string) {
  await callAdminFn('mark_notification_read', { id });
}

export async function markAllNotificationsRead() {
  await callAdminFn('mark_all_notifications_read');
}

export async function getUnreadCount() {
  const data = await callAdminFn('unread_count');
  return data?.count ?? 0;
}

// ── User Management ────────────────────────────────────────────────────

export async function banUser(userId: string) {
  await callAdminFn('ban_user', { user_id: userId });
}

export async function updateUserRole(userId: string, role: string) {
  await callAdminFn('update_user_role', { user_id: userId, role });
}

export async function updateSubscriptionExpiry(userId: string, expiresAt: string | null) {
  await callAdminFn('update_subscription_expiry', { user_id: userId, expires_at: expiresAt });
}

export async function expiringCount() {
  const data = await callAdminFn('expiring_count');
  return data?.count ?? 0;
}

export async function revenueStats(): Promise<{
  thisMonthRevenue: Record<string, number>;
  lastMonthRevenue: Record<string, number>;
  thisMonthByPlan: Record<string, number>;
  lastMonthByPlan: Record<string, number>;
  thisMonthCount: number;
  pendingWithdrawalsAmount: Record<string, number>;
}> {
  return callAdminFn('revenue_stats', {});
}

export async function sendDm(userId: string, text: string): Promise<{ conversation_id: string; message_id: string; notified: number }> {
  return callAdminFn('send_dm', { user_id: userId, text });
}

export async function sendPush(userIds: string[] | null, title: string, message: string): Promise<{ notified: number; target_users: number }> {
  return callAdminFn('send_push', { user_ids: userIds, title, message });
}

export interface MessageReport {
  id: string; message_id: string; reporter_id: string; reason: string;
  details: string | null; status: 'pending' | 'reviewed' | 'dismissed' | 'acted';
  reviewed_by: string | null; reviewed_at: string | null; created_at: string;
  messages?: { text: string; user_id: string; channel_id: string | null; conversation_id: string | null };
  reporter?: { email: string };
}

export async function listReports(status?: string): Promise<MessageReport[]> {
  const { reports } = await callAdminFn<{ reports: MessageReport[] }>('list_reports', { status });
  return reports;
}

export async function dismissReport(id: string): Promise<void> {
  await callAdminFn('dismiss_report', { id });
}

export async function actOnReport(id: string, deleteMessage: boolean): Promise<void> {
  await callAdminFn('act_on_report', { id, delete_message: deleteMessage });
}

export async function reportCount(): Promise<number> {
  const { count } = await callAdminFn<{ count: number }>('report_count', {});
  return count;
}

export interface AdminChannel {
  id: string; name: string; display_name: string; description: string | null;
  icon: string | null; type: string; is_premium: boolean; created_at: string; updated_at: string | null;
}

export async function listChannels(): Promise<AdminChannel[]> {
  const { channels } = await callAdminFn<{ channels: AdminChannel[] }>('list_channels', {});
  return channels;
}

export async function updateChannel(id: string, updates: { display_name?: string; description?: string; icon?: string; is_premium?: boolean }): Promise<void> {
  await callAdminFn('update_channel', { id, ...updates });
}

export async function deleteChannel(id: string): Promise<void> {
  await callAdminFn('delete_channel', { id });
}

export async function toggleChannelPremium(id: string): Promise<{ is_premium: boolean }> {
  return callAdminFn('toggle_channel_premium', { id });
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
  const { announcements } = await callAdminFn<{ announcements: AdminAnnouncement[] }>('list_announcements', {});
  return announcements ?? [];
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
  const { announcement } = await callAdminFn<{ announcement: AdminAnnouncement }>('upsert_announcement', data);
  return announcement;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await callAdminFn('delete_announcement', { id });
}

// ── Capital Management ─────────────────────────────────────────────────

export interface AdminCapitalAccount {
  user_id: string;
  email: string;
  currency: 'usd' | 'aoa';
  capital: number;
  achieved: number;
  total_withdrawn: number;
  status: string;
  updated_at?: string;
}

export async function listCapitalAccounts(): Promise<AdminCapitalAccount[]> {
  const { accounts } = await callAdminFn<{ accounts: AdminCapitalAccount[] }>('list_capital_accounts', {});
  return accounts ?? [];
}

export async function upsertCapitalAccount(data: {
  user_id: string;
  capital?: number;
  achieved?: number;
  total_withdrawn?: number;
  currency?: 'usd' | 'aoa';
}): Promise<void> {
  await callAdminFn('upsert_capital_account', data);
}

export async function postCapitalReport(data: {
  user_id: string;
  period_start: string;
  period_end: string;
  starting_balance: number;
  ending_balance: number;
  note?: string | null;
  currency?: 'usd' | 'aoa';
}): Promise<void> {
  await callAdminFn('post_capital_report', data);
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
  const { reports } = await callAdminFn<{ reports: AdminCapitalReport[] }>('list_capital_reports', { user_id: userId });
  return reports ?? [];
}

// ── Bulk Delete ────────────────────────────────────────────────────────

export async function bulkDeleteSignals(ids: string[]) {
  await callAdminFn('bulk_delete_signals', { ids });
}

export async function bulkDeleteBoomHours(ids: string[]) {
  await callAdminFn('bulk_delete_boom_hours', { ids });
}

export async function bulkDeleteBoomTimes(ids: string[]) {
  await callAdminFn('bulk_delete_boom_times', { ids });
}

export async function bulkDeletePosts(ids: string[]) {
  await callAdminFn('bulk_delete_posts', { ids });
}

// ── Withdrawal Requests ──────────────────────────────────────────────

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  method: string;
  amount: number;
  currency: string;
  details: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
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
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('withdrawal_requests').insert({
    user_id: user.id,
    method: req.method,
    amount: req.amount,
    currency: req.currency,
    details: req.details ?? null,
  });
  if (error) throw error;
}

export async function listWithdrawals(status?: string, limit = 50, offset = 0): Promise<WithdrawalRequest[]> {
  const { withdrawals } = await callAdminFn<{ withdrawals: WithdrawalRequest[] }>('list_withdrawals', { status, limit, offset });
  return withdrawals;
}

export async function approveWithdrawal(id: string): Promise<void> {
  await callAdminFn('approve_withdrawal', { id });
}

export async function rejectWithdrawal(id: string): Promise<void> {
  await callAdminFn('reject_withdrawal', { id });
}

export async function markWithdrawalPaid(id: string): Promise<void> {
  await callAdminFn('mark_withdrawal_paid', { id });
}

export async function rejectWithdrawalWithNotes(id: string, notes?: string): Promise<void> {
  await callAdminFn('reject_withdrawal', { id, notes });
}
