import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") || "")
  .split(",")
  .map((e: string) => e.trim())
  .filter(Boolean);

async function verifyAdmin(
  req: Request,
): Promise<{ ok: boolean; error?: string; userId?: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { ok: false, error: "Não autenticado" };

  const PROJECT_URL = Deno.env.get("PROJECT_URL") || Deno.env.get("SUPABASE_URL");
  const ANON_KEY = Deno.env.get("ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
  if (!PROJECT_URL || !ANON_KEY) return { ok: false, error: "Missing env" };

  const token = authHeader.replace("Bearer ", "");
  const userRes = await fetch(`${PROJECT_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
  });
  if (!userRes.ok) return { ok: false, error: "Auth failed" };

  const user = await userRes.json();
  if (!ADMIN_EMAILS.includes(user.email)) {
    return { ok: false, error: "Não autorizado" };
  }
  return { ok: true, userId: user.id };
}

/** Cria ou atualiza a subscrição do utilizador (1 row por user_id). */
async function upsertSubscription(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.id) {
    const { error } = await supabase.from("subscriptions").update(patch).eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("subscriptions").insert({ user_id: userId, ...patch });
    if (error) throw new Error(error.message);
  }
}

/** Envia push Expo para os tokens dos utilizadores indicados. Devolve nº de envios bem-sucedidos. */
async function pushToUsers(
  supabase: ReturnType<typeof createClient>,
  userIds: string[],
  title: string,
  message: string,
): Promise<number> {
  if (userIds.length === 0) return 0;
  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("token")
    .in("user_id", userIds);
  if (!tokens || tokens.length === 0) return 0;

  const expoToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (expoToken) headers.Authorization = `Bearer ${expoToken}`;

  let notified = 0;
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100).map((t: { token: string }) => ({
      to: t.token,
      title,
      body: message,
      sound: "default",
    }));
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers,
        body: JSON.stringify(chunk),
      });
      if (res.ok) notified += chunk.length;
    } catch (_e) {
      // push é best-effort
    }
  }
  return notified;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = await verifyAdmin(req);
    if (!auth.ok) {
      return json({ error: auth.error }, 403);
    }
    const adminUserId = auth.userId!;

    const PROJECT_URL = Deno.env.get("PROJECT_URL") || Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!PROJECT_URL || !SERVICE_ROLE_KEY) {
      return json({ error: "Missing env keys" }, 500);
    }

    const supabase = createClient(PROJECT_URL, SERVICE_ROLE_KEY);
    const body = await req.json();
    const { action } = body;

    // ── Sinais ────────────────────────────────────────────────────────────
    if (action === "add_signal") {
      const { symbol, timeframe, signal_type, entry_price, stop_loss, target_price, confidence, reasons } = body;
      if (!entry_price || !stop_loss || !target_price) {
        return json({ error: "Campos obrigatórios em falta" }, 400);
      }
      const { data, error } = await supabase.from("signals").insert([{
        symbol, timeframe, signal_type, entry_price, stop_loss, target_price,
        confidence: Number(confidence) || 75,
        reasons: reasons ?? ["Sinal manual"],
        status: "active",
      }]).select();
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, signal: data?.[0] });
    }

    if (action === "delete_signal") {
      const { id } = body;
      if (!id) return json({ error: "ID em falta" }, 400);
      const { error } = await supabase.from("signals").delete().eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "update_status") {
      const { id, status } = body;
      if (!id || !status) return json({ error: "Campos obrigatórios em falta" }, 400);
      const { error } = await supabase.from("signals").update({ status }).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "delete_all_active") {
      const { error } = await supabase.from("signals").delete().eq("status", "active");
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "bulk_delete_signals" || action === "bulk_delete_boom_hours"
      || action === "bulk_delete_boom_times" || action === "bulk_delete_posts") {
      const table = action === "bulk_delete_signals" ? "signals"
        : action === "bulk_delete_boom_hours" ? "boom_hours"
        : action === "bulk_delete_boom_times" ? "boom_times" : "posts";
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) return json({ error: "IDs em falta" }, 400);
      const { error } = await supabase.from(table).delete().in("id", ids);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── Boom hours / posts / boom times ───────────────────────────────────
    if (action === "add_boom_hour") {
      const { title, time_gmt, time_wat, pairs, days, description, volatility, badge } = body;
      if (!title || !time_gmt || !time_wat) {
        return json({ error: "Campos obrigatórios em falta" }, 400);
      }
      const { data, error } = await supabase.from("boom_hours").insert([{
        title, time_gmt, time_wat, pairs: pairs ?? [], days: days ?? "",
        description: description ?? "", volatility: Number(volatility) || 4,
        badge: badge ?? "", is_active: true,
      }]).select();
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, data: data?.[0] });
    }

    if (action === "delete_boom_hour") {
      const { id } = body;
      if (!id) return json({ error: "ID em falta" }, 400);
      const { error } = await supabase.from("boom_hours").delete().eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "add_post") {
      const { title, content, pair, signal_type, image_url, audio_url } = body;
      if (!title) return json({ error: "Título obrigatório" }, 400);
      const { data, error } = await supabase.from("posts").insert([{
        title, content: content ?? "", pair: pair ?? "", signal_type: signal_type ?? "NEUTRO",
        image_url: image_url ?? "", audio_url: audio_url ?? "", is_active: true,
      }]).select();
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, data: data?.[0] });
    }

    if (action === "delete_post") {
      const { id } = body;
      if (!id) return json({ error: "ID em falta" }, 400);
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "add_boom_time") {
      const { pair, boom_time, confidence, result, image_url, audio_url } = body;
      if (!pair || !boom_time) {
        return json({ error: "Par e hora obrigatórios" }, 400);
      }
      const { data, error } = await supabase.from("boom_times").insert([{
        pair, boom_time, confidence: Number(confidence) || 75,
        result: result || null, image_url: image_url ?? "", audio_url: audio_url ?? "",
        is_active: true,
      }]).select();
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, data: data?.[0] });
    }

    if (action === "update_boom_result") {
      const { id, result } = body;
      if (!id) return json({ error: "ID em falta" }, 400);
      const { error } = await supabase.from("boom_times").update({ result: result || null }).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "delete_boom_time") {
      const { id } = body;
      if (!id) return json({ error: "ID em falta" }, 400);
      const { error } = await supabase.from("boom_times").delete().eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── Utilizadores ──────────────────────────────────────────────────────
    if (action === "list_users") {
      const { data, error } = await supabase.auth.admin.listUsers({ perPage: 500 });
      if (error) return json({ error: error.message }, 500);
      const users = data?.users || [];
      const ids = users.map((u) => u.id);

      const [profilesRes, subsRes] = await Promise.all([
        ids.length ? supabase.from("user_profiles").select("user_id, role").in("user_id", ids) : Promise.resolve({ data: [] }),
        ids.length ? supabase.from("subscriptions").select("user_id, status, current_period_end").in("user_id", ids) : Promise.resolve({ data: [] }),
      ]);
      const roles = new Map<string, string>();
      for (const p of profilesRes.data ?? []) roles.set(p.user_id, p.role);
      const subs = new Map<string, { status: string; current_period_end: string | null }>();
      for (const s of subsRes.data ?? []) subs.set(s.user_id, s);

      return json({
        success: true,
        users: users.map((u) => {
          const sub = subs.get(u.id);
          return {
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            role: roles.get(u.id) ?? "member",
            banned: !!u.banned_until,
            subscription_status: sub?.status ?? null,
            subscription_expires: sub?.current_period_end ?? null,
          };
        }),
      });
    }

    if (action === "ban_user") {
      const { user_id, unban } = body;
      if (!user_id) return json({ error: "ID em falta" }, 400);
      const { error } = await supabase.auth.admin.updateUserById(user_id, {
        ban_duration: unban ? "none" : "876000h",
      });
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "update_user_role") {
      const { user_id, role } = body;
      if (!user_id || !role) return json({ error: "Campos obrigatórios em falta" }, 400);
      const { data: userData } = await supabase.auth.admin.getUserById(user_id);
      const displayName = userData?.user?.email?.split("@")[0] || "Utilizador";
      const { error } = await supabase.from("user_profiles").upsert(
        { user_id, display_name: displayName, role },
        { onConflict: "user_id" },
      );
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "update_subscription_expiry") {
      const { user_id, expires_at } = body;
      if (!user_id) return json({ error: "ID em falta" }, 400);
      const patch = expires_at
        ? { status: "active", current_period_end: expires_at, updated_at: new Date().toISOString() }
        : { status: "inactive", current_period_end: null, updated_at: new Date().toISOString() };
      try {
        await upsertSubscription(supabase, user_id, patch);
      } catch (e: any) {
        return json({ error: e.message }, 500);
      }
      return json({ success: true });
    }

    if (action === "expiring_count") {
      const soon = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      const { count } = await supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .gte("current_period_end", new Date().toISOString())
        .lte("current_period_end", soon);
      return json({ success: true, count: count ?? 0 });
    }

    if (action === "premium_count") {
      const { count } = await supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");
      return json({ success: true, count: count ?? 0 });
    }

    // ── Comprovativos de pagamento ────────────────────────────────────────
    if (action === "save_receipt") {
      // Retaguarda de compatibilidade: o cliente insere diretamente via RLS.
      const { user_id, user_email, proof_url, plan, method, amount, currency } = body;
      if (!user_id || !proof_url) return json({ error: "Campos obrigatórios em falta" }, 400);
      const { error } = await supabase.from("payment_receipts").insert({
        user_id, user_email: user_email ?? null, proof_url,
        plan: plan ?? null, method: method ?? null,
        amount: Number(amount) || 0, currency: currency ?? "usd",
      });
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "list_receipts") {
      const { status, limit = 50, offset = 0 } = body;
      let q = supabase
        .from("payment_receipts")
        .select("*")
        .order("created_at", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, receipts: data ?? [] });
    }

    if (action === "approve_receipt") {
      const { id } = body;
      if (!id) return json({ error: "ID em falta" }, 400);
      const { data: receipt } = await supabase.from("payment_receipts").select("*").eq("id", id).maybeSingle();
      if (!receipt) return json({ error: "Comprovativo não encontrado" }, 404);

      const { error: upErr } = await supabase.from("payment_receipts").update({
        status: "approved",
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (upErr) return json({ error: upErr.message }, 500);

      // Ativa o plano solicitado por 30 dias
      try {
        await upsertSubscription(supabase, receipt.user_id, {
          plan: receipt.plan ?? null,
          currency: receipt.currency ?? null,
          status: "active",
          current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        });
      } catch (e: any) {
        return json({ error: e.message }, 500);
      }

      pushToUsers(supabase, [receipt.user_id], "Plano ativado 🎉",
        `O seu plano ${receipt.plan ?? ""} foi aprovado e está ativo.`).catch(() => {});
      return json({ success: true });
    }

    if (action === "reject_receipt") {
      const { id } = body;
      if (!id) return json({ error: "ID em falta" }, 400);
      const { error } = await supabase.from("payment_receipts").update({
        status: "rejected",
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "delete_receipt") {
      const { id } = body;
      if (!id) return json({ error: "ID em falta" }, 400);
      const { error } = await supabase.from("payment_receipts").delete().eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── Pedidos de saque ──────────────────────────────────────────────────
    if (action === "list_withdrawals") {
      const { status, limit = 50, offset = 0 } = body;
      let q = supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, withdrawals: data ?? [] });
    }

    if (action === "approve_withdrawal") {
      const { id } = body;
      if (!id) return json({ error: "ID em falta" }, 400);
      const { error } = await supabase.from("withdrawal_requests").update({
        status: "approved",
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "reject_withdrawal") {
      const { id, notes } = body;
      if (!id) return json({ error: "ID em falta" }, 400);
      const { error } = await supabase.from("withdrawal_requests").update({
        status: "rejected",
        notes: notes ?? null,
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "mark_withdrawal_paid") {
      const { id } = body;
      if (!id) return json({ error: "ID em falta" }, 400);
      const { error } = await supabase.from("withdrawal_requests").update({
        status: "paid",
        paid_at: new Date().toISOString(),
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── Notificações do admin ─────────────────────────────────────────────
    if (action === "list_notifications") {
      const { limit = 50 } = body;
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(Number(limit));
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, data: data ?? [] });
    }

    if (action === "mark_notification_read") {
      const { id } = body;
      if (!id) return json({ error: "ID em falta" }, 400);
      const { error } = await supabase.from("admin_notifications").update({ read: true }).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "mark_all_notifications_read") {
      const { error } = await supabase.from("admin_notifications").update({ read: true }).eq("read", false);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "unread_count") {
      const { count } = await supabase
        .from("admin_notifications")
        .select("id", { count: "exact", head: true })
        .eq("read", false);
      return json({ success: true, count: count ?? 0 });
    }

    // ── Estatísticas de receita ───────────────────────────────────────────
    if (action === "revenue_stats") {
      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
      const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString();

      const [recRes, wdRes] = await Promise.all([
        supabase.from("payment_receipts")
          .select("amount, currency, plan, created_at")
          .eq("status", "approved")
          .gte("created_at", lastMonthStart),
        supabase.from("withdrawal_requests")
          .select("amount, currency")
          .eq("status", "pending"),
      ]);
      if (recRes.error) return json({ error: recRes.error.message }, 500);
      if (wdRes.error) return json({ error: wdRes.error.message }, 500);

      const thisMonthRevenue: Record<string, number> = {};
      const lastMonthRevenue: Record<string, number> = {};
      const thisMonthByPlan: Record<string, number> = {};
      const lastMonthByPlan: Record<string, number> = {};
      let thisMonthCount = 0;

      for (const r of recRes.data ?? []) {
        const cur = r.currency || "usd";
        const amount = Number(r.amount) || 0;
        const isThis = r.created_at >= monthStart;
        if (isThis) {
          thisMonthRevenue[cur] = (thisMonthRevenue[cur] || 0) + amount;
          if (r.plan) thisMonthByPlan[r.plan] = (thisMonthByPlan[r.plan] || 0) + amount;
          thisMonthCount++;
        } else {
          lastMonthRevenue[cur] = (lastMonthRevenue[cur] || 0) + amount;
          if (r.plan) lastMonthByPlan[r.plan] = (lastMonthByPlan[r.plan] || 0) + amount;
        }
      }

      const pendingWithdrawalsAmount: Record<string, number> = {};
      for (const w of wdRes.data ?? []) {
        const cur = w.currency || "usd";
        pendingWithdrawalsAmount[cur] = (pendingWithdrawalsAmount[cur] || 0) + (Number(w.amount) || 0);
      }

      return json({
        success: true,
        thisMonthRevenue,
        lastMonthRevenue,
        thisMonthByPlan,
        lastMonthByPlan,
        thisMonthCount,
        pendingWithdrawalsAmount,
      });
    }

    // ── DM + Push ─────────────────────────────────────────────────────────
    if (action === "send_dm") {
      const { user_id: targetId, text } = body;
      if (!targetId || !text) return json({ error: "Campos obrigatórios em falta" }, 400);

      // Conversa partilhada existente?
      const [mine, theirs] = await Promise.all([
        supabase.from("conversation_members").select("conversation_id").eq("user_id", adminUserId),
        supabase.from("conversation_members").select("conversation_id").eq("user_id", targetId),
      ]);
      const mineSet = new Set((mine.data ?? []).map((m: any) => m.conversation_id));
      const shared = (theirs.data ?? []).find((m: any) => mineSet.has(m.conversation_id));

      let conversationId = shared?.conversation_id as string | undefined;
      if (!conversationId) {
        const { data: conv, error: convErr } = await supabase.from("conversations").insert({}).select().single();
        if (convErr) return json({ error: convErr.message }, 500);
        conversationId = conv.id;
        const { error: memErr } = await supabase.from("conversation_members").insert([
          { conversation_id: conversationId, user_id: adminUserId },
          { conversation_id: conversationId, user_id: targetId },
        ]);
        if (memErr) return json({ error: memErr.message }, 500);
      }

      const { data: msg, error: msgErr } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        user_id: adminUserId,
        text,
      }).select().single();
      if (msgErr) return json({ error: msgErr.message }, 500);

      const notified = await pushToUsers(supabase, [targetId], "Nova mensagem", text).catch(() => 0);
      return json({ success: true, conversation_id: conversationId, message_id: msg.id, notified });
    }

    if (action === "send_push") {
      const { user_ids: userIds, title, message } = body;
      if (!title && !message) return json({ error: "Título ou mensagem obrigatórios" }, 400);

      let targets: string[] = [];
      if (Array.isArray(userIds) && userIds.length > 0) {
        targets = userIds;
      } else {
        const { data: allTokens } = await supabase.from("push_tokens").select("user_id");
        targets = [...new Set((allTokens ?? []).map((t: any) => t.user_id))];
      }
      const notified = await pushToUsers(supabase, targets, title ?? "", message ?? "").catch(() => 0);
      return json({ success: true, notified, target_users: targets.length });
    }

    // ── Denúncias ─────────────────────────────────────────────────────────
    if (action === "list_reports") {
      const { status } = body;
      let q = supabase
        .from("message_reports")
        .select("*, messages(text, user_id, channel_id, conversation_id)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);

      const reports = data ?? [];
      const reporterIds = [...new Set(reports.map((r: any) => r.reporter_id))];
      const emails = new Map<string, string>();
      for (const rid of reporterIds) {
        const { data: u } = await supabase.auth.admin.getUserById(rid);
        if (u?.user?.email) emails.set(rid, u.user.email);
      }
      return json({
        success: true,
        reports: reports.map((r: any) => ({ ...r, reporter: { email: emails.get(r.reporter_id) ?? null } })),
      });
    }

    if (action === "dismiss_report") {
      const { id } = body;
      if (!id) return json({ error: "ID em falta" }, 400);
      const { error } = await supabase.from("message_reports").update({
        status: "dismissed",
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "act_on_report") {
      const { id, delete_message } = body;
      if (!id) return json({ error: "ID em falta" }, 400);
      const { data: report } = await supabase.from("message_reports").select("message_id").eq("id", id).maybeSingle();
      if (!report) return json({ error: "Denúncia não encontrada" }, 404);

      if (delete_message) {
        const { error: delErr } = await supabase
          .from("messages")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", report.message_id);
        if (delErr) return json({ error: delErr.message }, 500);
      }
      const { error } = await supabase.from("message_reports").update({
        status: "acted",
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "report_count") {
      const { count } = await supabase
        .from("message_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return json({ success: true, count: count ?? 0 });
    }

    // ── Canais ────────────────────────────────────────────────────────────
    if (action === "list_channels") {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .order("name", { ascending: true });
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, channels: data ?? [] });
    }

    if (action === "update_channel") {
      const { id, ...rest } = body;
      if (!id) return json({ error: "ID em falta" }, 400);
      const patch: Record<string, unknown> = {};
      for (const key of ["display_name", "description", "icon", "is_premium", "name"]) {
        if (key in rest) patch[key] = rest[key];
      }
      if (Object.keys(patch).length === 0) return json({ error: "Nada para atualizar" }, 400);
      const { error } = await supabase.from("channels").update(patch).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === "toggle_channel_premium") {
      const { id } = body;
      if (!id) return json({ error: "ID em falta" }, 400);
      const { data: ch } = await supabase.from("channels").select("is_premium").eq("id", id).maybeSingle();
      if (!ch) return json({ error: "Canal não encontrado" }, 404);
      const next = !ch.is_premium;
      const { error } = await supabase.from("channels").update({ is_premium: next }).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, is_premium: next });
    }

    if (action === "delete_channel") {
      const { id } = body;
      if (!id) return json({ error: "ID em falta" }, 400);
      const { error } = await supabase.from("channels").delete().eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── Upload genérico ───────────────────────────────────────────────────
    if (action === "upload_file") {
      const { bucket, path, file_base64, content_type } = body;
      if (!bucket || !path || !file_base64) {
        return json({ error: "Campos obrigatórios em falta" }, 400);
      }
      const binary = Uint8Array.from(atob(file_base64), c => c.charCodeAt(0));
      const { error } = await supabase.storage.from(bucket).upload(path, binary, {
        contentType: content_type || "application/octet-stream",
      });
      if (error) return json({ error: error.message }, 500);
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      return json({ success: true, url: urlData.publicUrl });
    }

    return json({ error: "Ação desconhecida" }, 400);

  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
