export type SignalType = 'BUY' | 'SELL' | 'AGUARDAR';
export type SignalStatus = 'active' | 'pending' | 'tp' | 'sl' | 'expired';
export type SignalTier = 'free' | 'basic' | 'pro' | 'premium';
export type BoomStatus = 'upcoming' | 'live' | 'expired';

export interface Signal {
  id: string;
  pair: string;
  timeframe: string;
  type: SignalType;
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  reasons: string[];
  status: SignalStatus;
  createdAt: string;
  // Novos campos para modelo Pro
  tier: SignalTier;
  riskReward?: number;        // R:R ratio (ex: 1:2.5)
  expiresAt?: string;         // expiração do sinal
  analysis?: string;          // análise técnica detalhada (Pro/Premium)
  probabilityScore?: number;  // 0-100 score interno de qualidade
  smcSetup?: string;          // SMC setup: BOS, CHoCH, OB, FVG, COMBO
}

export interface HistorySignal {
  id: string;
  pair: string;
  timeframe: string;
  type: SignalType;
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  result: 'tp' | 'sl' | 'expired';
  date: string;
  profitPips: number;
}

export interface HistoryStats {
  total: number;
  tp: number;
  sl: number;
  winRate: number;
  totalPips: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  status: string;
  plan?: string | null;
  currency?: string | null;
  stripe_price_id?: string | null;
  current_period_end?: string | null;
}

export interface BoomHour {
  id: string;
  title: string;
  time_gmt: string;
  time_wat: string;
  pairs: string[];
  days: string;
  description: string;
  volatility: number;
  badge: string;
  is_active: boolean;
  created_at: string;
}

export interface BoomTime {
  id: string;
  pair: string;
  boom_time: string;
  confidence: number;
  result: 'BUY' | 'SELL' | 'NEUTRO' | null;
  image_url: string;
  audio_url: string;
  is_active: boolean;
  created_at: string;
}

export interface BoomComment {
  id: string;
  boom_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  text: string;
  audio_url: string;
  is_premium: boolean;
  created_at: string;
}

export interface BoomVote {
  id?: string;
  boom_id: string;
  user_id: string;
  vote: 'BUY' | 'SELL';
}

export interface PriceData {
  price: string;
  change: number;
}

export interface AppUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface BancaConfig {
  capital: number;
  achieved: number;
  metaPercent: number;
  riskPercent: number;
  metaMonths: string;
  planId: string;
  startDate: string;
  nextWithdrawal: string;
  totalWithdrawn: number;
  profitEarned: number;
  currency?: 'usd' | 'aoa';
}

/** Saldo autoritativo da Gestão de Capital (publicado pela equipa, via servidor). */
export interface CapitalAccount {
  user_id: string;
  currency: 'usd' | 'aoa';
  capital: number;
  achieved: number;
  total_withdrawn: number;
  status: string;
  updated_at?: string;
}

/** Relatório periódico de performance publicado pela equipa. */
export interface CapitalReport {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  starting_balance: number;
  ending_balance: number;
  profit: number;
  profit_pct: number;
  note: string | null;
  created_at: string;
}

export type TradeDirection = 'BUY' | 'SELL';
export type TradeResult = 'WIN' | 'LOSS' | 'BREAKEVEN';

export interface TradeEntry {
  id: string;
  pair: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number | null;
  lotSize: number;
  result: TradeResult;
  profitUsd: number;
  pips: number;
  notes: string;
  boomHourId: string | null;
  createdAt: string;
  closedAt: string | null;
}

export interface TradeStats {
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
  totalPips: number;
}

export interface Announcement {
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

export type ChannelType = 'regular' | 'pair';
export type PairRoomState = 'active' | 'closed';

export interface Channel {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  type: ChannelType;
  pair: string | null;
  opened_at: string | null;
  is_premium: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  created_at: string;
}

export interface ConversationMember {
  conversation_id: string;
  user_id: string;
  joined_at: string;
}

export interface UserProfile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'admin' | 'member';
  status: string;
  last_seen_at: string | null;
  created_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string | null;
  conversation_id: string | null;
  user_id: string;
  parent_id: string | null;
  text: string;
  image_url: string | null;
  boom_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  client_msg_id: string;
  created_at: string;
  pending?: boolean;
  failed?: boolean;
}

export type NotificationType =
  | 'receipt_pending' | 'receipt_approved' | 'receipt_rejected'
  | 'withdrawal_pending'
  | 'signal_closed' | 'signal_tp' | 'signal_sl'
  | 'new_user' | 'subscription_expired' | 'subscription_expiring'
  | 'system_error';

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

export interface AdminPushToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android';
  created_at: string;
}

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
