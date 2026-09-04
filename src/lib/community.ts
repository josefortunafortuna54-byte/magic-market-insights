import { supabase } from "@/lib/supabaseClient";
import type { Channel, Message } from "@/lib/types";

export const BOT_USER_ID = "11111111-1111-1111-1111-111111111111";

export const REACTION_EMOJIS = ["👍", "❤️", "🔥", "🚀", "🎯"] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

const FOREX_SYMBOLS = new Set([
  "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "EURGBP",
  "USDCHF", "NZDUSD", "USDCAD", "XAUUSD",
]);

export const PRESENCE_ONLINE_WINDOW_MS = 2 * 60 * 1000;

export function isUserOnline(
  profile: { status: string; last_seen_at: string | null } | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!profile || profile.status !== "online") return false;
  if (!profile.last_seen_at) return true;
  return now - new Date(profile.last_seen_at).getTime() < PRESENCE_ONLINE_WINDOW_MS;
}

export function isWeekendUtc(now: Date = new Date()): boolean {
  const wat = new Date(now.getTime() + 60 * 60 * 1000);
  const day = wat.getUTCDay();
  const hour = wat.getUTCHours();
  if (day === 6) return true;
  if (day === 5 && hour >= 23) return true;
  if (day === 0 && hour < 23) return true;
  return false;
}

export function isForexSymbol(symbol: string): boolean {
  return FOREX_SYMBOLS.has(symbol.replace(/[^A-Za-z]/g, "").toUpperCase());
}

const PAIR_ROOM_LIFETIME_MS = 24 * 60 * 60 * 1000;

export function pairRoomState(channel: Channel): "active" | "closed" {
  if (channel.type !== "pair" || !channel.opened_at) return "closed";
  return Date.now() - new Date(channel.opened_at).getTime() < PAIR_ROOM_LIFETIME_MS
    ? "active"
    : "closed";
}

export function pairRoomClosesInMs(channel: Channel): number {
  if (!channel.opened_at) return 0;
  const closesAt = new Date(channel.opened_at).getTime() + PAIR_ROOM_LIFETIME_MS;
  return Math.max(0, closesAt - Date.now());
}

export function formatClosesIn(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}min`;
}

export function mergeMessages(current: Message[], server: Message[]): Message[] {
  const serverIds = new Set(server.map((m) => m.id));
  const serverClientIds = new Set(server.map((m) => m.client_msg_id));
  const extras = current.filter(
    (m) => !serverIds.has(m.id) && !serverClientIds.has(m.client_msg_id),
  );
  return [...server, ...extras].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
}

export async function findOrCreateConversation(
  userId: string,
  otherId: string,
): Promise<string> {
  const { data: mine } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);

  const ids = (mine || []).map((r) => r.conversation_id);

  if (ids.length > 0) {
    const { data: theirs } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", otherId)
      .in("conversation_id", ids);
    const existing = (theirs || [])[0]?.conversation_id;
    if (existing) return existing;
  }

  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({})
    .select("id")
    .single();
  if (error || !conv) throw new Error("Falha ao criar a conversa.");

  await supabase
    .from("conversation_members")
    .insert({ conversation_id: conv.id, user_id: userId });
  await supabase
    .from("conversation_members")
    .insert({ conversation_id: conv.id, user_id: otherId });

  return conv.id;
}

export async function shareSignalToFeed(
  userId: string,
  signalId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("share_signal", {
    p_signal_id: signalId,
    p_user_id: userId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: !!data };
}

export async function findSinaisChannelId(): Promise<string | null> {
  const { data } = await supabase
    .from("channels")
    .select("id")
    .eq("name", "sinais")
    .maybeSingle();
  return data?.id ?? null;
}

export async function uploadCommunityImage(
  userId: string,
  file: File,
  mimeType?: string,
): Promise<string | null> {
  try {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().split("?")[0];
    const name = `img-${Date.now()}.${ext}`;
    const path = `community/${userId}/${name}`;
    const { error } = await supabase.storage
      .from("community")
      .upload(path, file, {
        contentType: mimeType || file.type || "image/jpeg",
        upsert: false,
      });
    if (error) {
      console.warn("[uploadCommunityImage] Supabase error:", error.message);
      return null;
    }
    return supabase.storage.from("community").getPublicUrl(path).data.publicUrl;
  } catch (err) {
    console.warn("[uploadCommunityImage] Exception:", err);
    return null;
  }
}

export async function reportMessage(
  messageId: string,
  reason: string,
  details?: string,
): Promise<void> {
  const { error } = await supabase.from("message_reports").insert({
    message_id: messageId,
    reporter_id: (await supabase.auth.getUser()).data.user?.id,
    reason,
    details: details || null,
  });
  if (error) throw error;
}