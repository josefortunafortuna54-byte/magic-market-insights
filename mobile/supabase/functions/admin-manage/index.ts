// admin-manage — CRUD administrativo para sinais, booms, horas e posts.
// Chamado pelo client com o JWT do utilizador autenticado.
// Verifica se o email está na lista ADMIN_EMAILS (env var).
// Usa service_role para todas as operações de BD (bypassa RLS).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const adminEmailsRaw = Deno.env.get('ADMIN_EMAILS') ?? '';
const adminEmails = adminEmailsRaw
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function errorJson(message: string, status = 400): Response {
  return json({ error: message }, status);
}

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return { user: null, error: 'Não autenticado.' };

  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) return { user: null, error: 'Não autenticado.' };

  const email = (user.email ?? '').trim().toLowerCase();
  if (!adminEmails.includes(email)) {
    return { user: null, error: 'Acesso negado.' };
  }

  return { user, error: null };
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleAddSignal(body: Record<string, unknown>) {
  const { symbol, timeframe, signal_type, entry_price, stop_loss, target_price, confidence, reasons, smc_setup, analysis, expires_at } = body;

  if (!symbol || !signal_type || !entry_price || !stop_loss || !target_price) {
    return errorJson('Campos obrigatórios em falta.');
  }

  const validSetups = ['BOS', 'CHoCH', 'OB', 'FVG', 'COMBO'];
  const setupVal = typeof smc_setup === 'string' && validSetups.includes(smc_setup.toUpperCase())
    ? smc_setup.toUpperCase() : null;

  const { data, error } = await supabase
    .from('signals')
    .insert({
      symbol: String(symbol).toUpperCase(),
      timeframe: String(timeframe || 'H1').toUpperCase(),
      signal_type: String(signal_type).toUpperCase(),
      entry_price: Number(entry_price),
      stop_loss: Number(stop_loss),
      target_price: Number(target_price),
      confidence: Number(confidence) || 75,
      reasons: Array.isArray(reasons) ? reasons : [],
      status: 'active',
      smc_setup: setupVal,
      analysis: typeof analysis === 'string' ? analysis.trim().slice(0, 500) : null,
      expires_at: typeof expires_at === 'string' ? expires_at : null,
    })
    .select()
    .single();

  if (error) return errorJson(error.message, 500);
  return json({ signal: data });
}

async function handleDeleteSignal(body: Record<string, unknown>) {
  const id = body.id;
  if (!id) return errorJson('id em falta.');

  const { error } = await supabase.from('signals').delete().eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ deleted: true });
}

async function handleUpdateStatus(body: Record<string, unknown>) {
  const { id, status } = body;
  if (!id || !status) return errorJson('id e status em falta.');

  const allowed = ['active', 'pending', 'tp', 'sl', 'expired'];
  if (!allowed.includes(String(status))) return errorJson('Status inválido.');

  const { error } = await supabase
    .from('signals')
    .update({ status: String(status) })
    .eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ updated: true });
}

async function handleAddBoomHour(body: Record<string, unknown>) {
  const { title, time_wat, time_gmt, pairs, days, description, volatility, badge } = body;
  if (!title || !time_wat) return errorJson('Campos obrigatórios em falta.');

  const { data, error } = await supabase
    .from('boom_hours')
    .insert({
      title: String(title),
      time_wat: String(time_wat),
      time_gmt: String(time_gmt || ''),
      pairs: Array.isArray(pairs) ? pairs : [],
      days: String(days || ''),
      description: String(description || ''),
      volatility: Number(volatility) || 1,
      badge: String(badge || '⚡'),
      is_active: true,
    })
    .select()
    .single();

  if (error) return errorJson(error.message, 500);
  return json({ boom_hour: data });
}

async function handleDeleteBoomHour(body: Record<string, unknown>) {
  const id = body.id;
  if (!id) return errorJson('id em falta.');

  const { error } = await supabase.from('boom_hours').delete().eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ deleted: true });
}

async function handleAddBoomTime(body: Record<string, unknown>) {
  const { pair, boom_time, confidence, result, image_url, audio_url } = body;
  if (!pair || !boom_time) return errorJson('Campos obrigatórios em falta.');

  const { data, error } = await supabase
    .from('boom_times')
    .insert({
      pair: String(pair).toUpperCase(),
      boom_time: String(boom_time),
      confidence: Number(confidence) || 75,
      result: String(result || ''),
      image_url: String(image_url || ''),
      audio_url: String(audio_url || ''),
      is_active: true,
    })
    .select()
    .single();

  if (error) return errorJson(error.message, 500);

  // Publica o boom como mensagem no canal #sinais
  try {
    const { data: sinais } = await supabase
      .from('channels')
      .select('id')
      .eq('name', 'sinais')
      .single();
    if (sinais?.id && data) {
      const botId = '11111111-1111-1111-1111-111111111111';
      await supabase.from('messages').insert({
        channel_id: sinais.id,
        user_id: botId,
        text: `🎯 ${String(pair).toUpperCase()} — Boom`,
        image_url: String(image_url || ''),
        boom_id: data.id,
      });
    }
  } catch (e) {
    console.error('admin-manage: falha ao publicar boom no #sinais', e);
  }

  return json({ boom_time: data });
}

async function handleUpdateBoomResult(body: Record<string, unknown>) {
  const { id, result } = body;
  if (!id) return errorJson('id em falta.');

  const { error } = await supabase
    .from('boom_times')
    .update({ result: String(result || '') })
    .eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ updated: true });
}

async function handleDeleteBoomTime(body: Record<string, unknown>) {
  const id = body.id;
  if (!id) return errorJson('id em falta.');

  const { error } = await supabase.from('boom_times').delete().eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ deleted: true });
}

async function handleAddPost(body: Record<string, unknown>) {
  const { title, content, pair, signal_type, image_url, audio_url } = body;
  if (!title) return errorJson('title em falta.');

  const { data, error } = await supabase
    .from('posts')
    .insert({
      title: String(title),
      content: String(content || ''),
      pair: String(pair || ''),
      signal_type: String(signal_type || 'NEUTRO'),
      image_url: String(image_url || ''),
      audio_url: String(audio_url || ''),
      is_active: true,
    })
    .select()
    .single();

  if (error) return errorJson(error.message, 500);
  return json({ post: data });
}

async function handleDeletePost(body: Record<string, unknown>) {
  const id = body.id;
  if (!id) return errorJson('id em falta.');

  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ deleted: true });
}

async function handleListUsers() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) return errorJson(error.message, 500);

  const userIds = (data.users ?? []).map((u) => u.id);

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('user_id, plan, status, current_period_end')
    .in('user_id', userIds);

  const subMap = new Map<string, { plan: string; status: string; current_period_end: string }>();
  (subs ?? []).forEach((s) => subMap.set(s.user_id, s));

  const users = (data.users ?? []).map((u) => {
    const sub = subMap.get(u.id);
    const role = sub?.status === 'active' ? (sub.plan || 'free') : 'free';
    return {
      id: u.id,
      email: u.email ?? '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      role,
      subscription_status: sub?.status ?? null,
      subscription_expires: sub?.current_period_end ?? null,
    };
  });

  return json({ users });
}

async function handlePremiumCount() {
  const { count, error } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  if (error) return errorJson(error.message, 500);
  return json({ count: count ?? 0 });
}

// ── Payment Receipts ─────────────────────────────────────────────────────

function capitalizePlan(plan: unknown): string {
  const p = String(plan ?? '').trim();
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : '';
}

/**
 * Notifica o utilizador sobre mudanças no seu pedido:
 * 1. Grava na tabela user_notifications (fica visível na app, /notificacoes).
 * 2. Envia push Expo para todos os dispositivos registados.
 * Falhas são best-effort — não devem bloquear a aprovação.
 */
async function notifyUser(userId: string, title: string, body: string, data?: Record<string, unknown>): Promise<void> {
  try {
    const { error: insertError } = await supabase.from('user_notifications').insert({
      user_id: userId,
      title,
      body,
      kind: 'plan',
      data: data ?? {},
    });
    if (insertError) console.error('admin-manage: falha ao gravar user_notification', insertError.message);
  } catch (e) {
    console.error('admin-manage: exceção ao gravar user_notification', e);
  }

  try {
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId);
    const tokenList = (tokens ?? []).map((t: { token: string }) => t.token);
    if (tokenList.length > 0) {
      await sendExpoPush(tokenList, title, body, { url: '/notificacoes', kind: 'plan' }, 'planos');
    }
  } catch (e) {
    console.error('admin-manage: falha ao enviar push ao utilizador', e);
  }
}

/**
 * Envia email transacional via Resend (best-effort).
 * Requer os secrets RESEND_API_KEY e opcionalmente EMAIL_FROM.
 * Sem RESEND_API_KEY configurado, não faz nada (não bloqueia).
 */
async function sendUserEmail(to: string | null | undefined, subject: string, html: string): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY') ?? '';
  if (!apiKey || !to) return;

  const from = Deno.env.get('EMAIL_FROM') ?? 'TMT <onboarding@resend.dev>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) {
      console.error('admin-manage: falha ao enviar email', res.status, await res.text().catch(() => ''));
    }
  } catch (e) {
    console.error('admin-manage: exceção ao enviar email', e);
  }
}

async function handleApproveReceipt(body: Record<string, unknown>) {
  const { id, reviewed_by } = body;
  if (!id) return errorJson('id em falta.');

  const { data: receipt, error: fetchErr } = await supabase
    .from('payment_receipts')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !receipt) return errorJson('Comprovativo não encontrado.', 404);

  // Transição atómica: só quem converte pending→approved notifica o utilizador
  const { data: transitioned, error: updateErr } = await supabase
    .from('payment_receipts')
    .update({
      status: 'approved',
      reviewed_by: reviewed_by ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (updateErr) return errorJson(updateErr.message, 500);
  if (!transitioned) {
    // Outro admin já processou este recibo — nada a fazer
    return json({ approved: true, alreadyProcessed: true });
  }

  // Upsert subscription — falha já NÃO é silenciosa: sem isto o plano nunca muda
  if (receipt.user_id && receipt.plan) {
    const planName = String(receipt.plan).toLowerCase();
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: receipt.user_id,
          plan: planName,
          status: 'active',
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: 'user_id' },
      );

    if (subError) {
      return errorJson(`Comprovativo aprovado mas falha ao ativar o plano: ${subError.message}`, 500);
    }
  }

  // Gestão de Capital: utilizador chegado por link de afiliado que pagou o
  // Premium passa a ter o valor pago como saldo da conta de capital.
  // Best-effort: falha não deve bloquear a ativação do plano.
  if (
    receipt.user_id &&
    String(receipt.plan).toLowerCase() === 'premium' &&
    Number(receipt.amount) > 0 &&
    receipt.referral_code
  ) {
    const { error: capError } = await supabase
      .from('capital_accounts')
      .upsert(
        {
          user_id: receipt.user_id,
          currency: receipt.currency === 'aoa' ? 'aoa' : 'usd',
          capital: Number(receipt.amount),
          achieved: Number(receipt.amount),
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
    if (capError) {
      console.error('admin-manage: falha ao creditar capital do afiliado', capError.message);
    }
  }

  // Notifica o utilizador (apenas quem fez a transição pending→approved)
  if (receipt.user_id && receipt.plan) {
    const planLabel = capitalizePlan(receipt.plan) || 'seu plano';
    await notifyUser(
      receipt.user_id,
      'Plano ativado',
      `O seu pagamento foi aprovado e o plano ${planLabel} está ativo durante 1 mês.`,
      { receiptId: String(id), plan: String(receipt.plan).toLowerCase() },
    );
    void sendUserEmail(
      receipt.user_email,
      'TMT - Plano ativado',
      `<p>Olá,</p><p>O seu pagamento foi aprovado e o plano <strong>${planLabel}</strong> está ativo durante 1 mês.</p><p>Abra a app TMT para começar a usufruir.</p><p>Obrigado,<br/>Equipa TMT</p>`,
    );
  }

  return json({ approved: true });
}

async function handleRejectReceipt(body: Record<string, unknown>) {
  const { id, reviewed_by } = body;
  if (!id) return errorJson('id em falta.');

  const { data: receipt, error: fetchErr } = await supabase
    .from('payment_receipts')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !receipt) return errorJson('Comprovativo não encontrado.', 404);

  const { data: transitioned, error } = await supabase
    .from('payment_receipts')
    .update({
      status: 'rejected',
      reviewed_by: reviewed_by ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error) return errorJson(error.message, 500);
  if (!transitioned) {
    return json({ rejected: true, alreadyProcessed: true });
  }

  if (receipt.user_id) {
    const planLabel = capitalizePlan(receipt.plan) || 'seu plano';
    await notifyUser(
      receipt.user_id,
      'Pedido não aprovado',
      `O seu pedido do plano ${planLabel} não foi aprovado. Contacte o suporte para mais detalhes.`,
      { receiptId: String(id), plan: String(receipt.plan).toLowerCase() },
    );
    void sendUserEmail(
      receipt.user_email,
      'TMT - Pedido não aprovado',
      `<p>Olá,</p><p>Infelizmente o seu pedido do plano <strong>${planLabel}</strong> não foi aprovado.</p><p>Contacte o suporte para mais detalhes.</p><p>Equipa TMT</p>`,
    );
  }

  return json({ rejected: true });
}

async function handleDeleteReceipt(body: Record<string, unknown>) {
  const id = body.id;
  if (!id) return errorJson('id em falta.');

  const { error } = await supabase.from('payment_receipts').delete().eq('id', id);
  if (error) return errorJson(error.message, 500);
  return json({ deleted: true });
}

async function handleSaveReceipt(body: Record<string, unknown>) {
  const { user_id, user_email, proof_url, plan, method, amount, currency } = body;
  if (!user_id || !proof_url) return errorJson('Campos obrigatórios em falta.');

  const { data, error } = await supabase
    .from('payment_receipts')
    .insert({
      user_id: String(user_id),
      user_email: String(user_email || ''),
      proof_url: String(proof_url),
      plan: String(plan || ''),
      method: String(method || ''),
      amount: Number(amount) || 0,
      currency: String(currency || 'usd'),
      status: 'pending',
    })
    .select()
    .single();

  if (error) return errorJson(error.message, 500);
  return json({ receipt: data });
}

// ── Admin → User DM ────────────────────────────────────────────────────────

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

async function sendExpoPush(tokens: string[], title: string, body: string, data?: Record<string, unknown>, channelId = 'comunidade') {
  const expoToken = Deno.env.get('EXPO_PUSH_ACCESS_TOKEN') ?? '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (expoToken) headers['Authorization'] = `Bearer ${expoToken}`;

  let sent = 0;
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100).map((t) => ({
      to: t,
      title,
      body: body.length > 140 ? body.slice(0, 139) + '…' : body,
      sound: 'default',
      channelId,
      ...(data ? { data } : {}),
    }));
    try {
      const res = await fetch(EXPO_PUSH_API, { method: 'POST', headers, body: JSON.stringify(chunk) });
      if (!res.ok) continue;
      const result = await res.json().catch(() => ({}));
      const tickets = Array.isArray(result?.data) ? result.data : [];
      for (const t of tickets) {
        if (t?.status !== 'error') sent += 1;
      }
    } catch { /* skip */ }
  }
  return sent;
}

async function handleSendDm(body: Record<string, unknown>) {
  const { user_id, text } = body;
  if (!user_id || !text) return errorJson('user_id e text em falta.');

  const adminBotId = '11111111-1111-1111-1111-111111111111';

  const { data: existing } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', user_id);

  let conversationId: string | null = null;

  for (const row of existing ?? []) {
    const { data: otherMember } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', row.conversation_id)
      .neq('user_id', user_id)
      .maybeSingle();
    if (!otherMember) {
      conversationId = row.conversation_id;
      break;
    }
  }

  if (!conversationId) {
    const { data: newConv, error: convErr } = await supabase
      .from('conversations')
      .insert({})
      .select('id')
      .single();
    if (convErr) return errorJson(convErr.message, 500);
    conversationId = newConv.id;

    await supabase.from('conversation_members').insert([
      { conversation_id: conversationId, user_id: adminBotId },
      { conversation_id: conversationId, user_id },
    ]);
  }

  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      user_id: adminBotId,
      text: String(text),
    })
    .select('id')
    .single();
  if (msgErr) return errorJson(msgErr.message, 500);

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', user_id);
  const tokenList = (tokens ?? []).map((t: { token: string }) => t.token);

  let notified = 0;
  if (tokenList.length > 0) {
    notified = await sendExpoPush(tokenList, 'TMT Admin', String(text), {
      url: `/comunidade/dm/${conversationId}`,
    });
  }

  return json({ dm: true, conversation_id: conversationId, message_id: msg.id, notified });
}

async function handleSendPush(body: Record<string, unknown>) {
  const { user_ids, title, message } = body;
  if (!title || !message) return errorJson('title e message em falta.');

  let userIds: string[];
  if (Array.isArray(user_ids) && user_ids.length > 0) {
    userIds = user_ids.map(String);
  } else {
    const { data: allTokens } = await supabase.from('push_tokens').select('user_id');
    userIds = [...new Set((allTokens ?? []).map((t: { user_id: string }) => t.user_id))];
  }

  if (userIds.length === 0) return json({ notified: 0 });

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', userIds);

  const tokenList = (tokens ?? []).map((t: { token: string }) => t.token);
  if (tokenList.length === 0) return json({ notified: 0 });

  const notified = await sendExpoPush(tokenList, String(title), String(message));
  return json({ notified, target_users: userIds.length });
}

// ── Main ────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') return errorJson('Método não permitido.', 405);

  const { user, error: authError } = await verifyAdmin(req);
  if (authError) return errorJson(authError, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorJson('JSON inválido.', 400);
  }

  const action = String(body.action ?? '');

  switch (action) {
    case 'add_signal':
      return handleAddSignal(body);
    case 'delete_signal':
      return handleDeleteSignal(body);
    case 'update_status':
      return handleUpdateStatus(body);
    case 'add_boom_hour':
      return handleAddBoomHour(body);
    case 'delete_boom_hour':
      return handleDeleteBoomHour(body);
    case 'add_boom_time':
      return handleAddBoomTime(body);
    case 'update_boom_result':
      return handleUpdateBoomResult(body);
    case 'delete_boom_time':
      return handleDeleteBoomTime(body);
    case 'add_post':
      return handleAddPost(body);
    case 'delete_post':
      return handleDeletePost(body);
    case 'list_users':
      return handleListUsers();
    case 'premium_count':
      return handlePremiumCount();
    case 'list_receipts': {
      const limit = Math.min(Number(body.limit) || 50, 200);
      const offset = Number(body.offset) || 0;
      let query = supabase.from('payment_receipts').select('*').order('created_at', { ascending: false });
      if (body.status) query = query.eq('status', body.status);
      query = query.range(offset, offset + limit - 1);
      const { data, error } = await query;
      if (error) return errorJson(error.message, 500);
      return json({ receipts: data });
    }
    case 'approve_receipt':
      return handleApproveReceipt({ ...body, reviewed_by: user.id });
    case 'reject_receipt':
      return handleRejectReceipt({ ...body, reviewed_by: user.id });
    case 'delete_receipt':
      return handleDeleteReceipt(body);
    case 'save_receipt':
      return handleSaveReceipt(body);
    case 'send_dm':
      return handleSendDm(body);
    case 'send_push':
      return handleSendPush(body);
    case 'list_notifications': {
      const { limit = 50 } = body;
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) return errorJson(error.message, 500);
      return json({ data });
    }
    case 'mark_notification_read': {
      const { id } = body;
      if (!id) return errorJson('id em falta.');
      const { error } = await supabase
        .from('admin_notifications')
        .update({ read: true })
        .eq('id', id);
      if (error) return errorJson(error.message, 500);
      return json({ updated: true });
    }
    case 'mark_all_notifications_read': {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ read: true })
        .eq('read', false);
      if (error) return errorJson(error.message, 500);
      return json({ updated: true });
    }
    case 'unread_count': {
      const { count, error } = await supabase
        .from('admin_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false);
      if (error) return errorJson(error.message, 500);
      return json({ count: count ?? 0 });
    }
    // ── Announcements ───────────────────────────────────────────────────
    case 'list_announcements': {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) return errorJson(error.message, 500);
      return json({ announcements: data });
    }
    case 'upsert_announcement': {
      const { id, title, body: aBody, image_url, link, link_label, is_active, sort_order } = body;
      if (!title) return errorJson('título em falta.');
      const row: Record<string, unknown> = {
        title: String(title),
        body: aBody != null ? String(aBody) : null,
        image_url: image_url ? String(image_url) : null,
        link: link ? String(link) : null,
        link_label: link_label ? String(link_label) : null,
        is_active: is_active !== false,
        sort_order: Number(sort_order) || 0,
      };
      if (id) row.id = String(id);
      const { data, error } = await supabase
        .from('announcements')
        .upsert(row)
        .select()
        .single();
      if (error) return errorJson(error.message, 500);
      return json({ announcement: data });
    }
    case 'delete_announcement': {
      const { id } = body;
      if (!id) return errorJson('id em falta.');
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) return errorJson(error.message, 500);
      return json({ deleted: true });
    }
    // ── Capital Management ──────────────────────────────────────────────
    case 'list_capital_accounts': {
      const { data: accounts, error } = await supabase
        .from('capital_accounts')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) return errorJson(error.message, 500);

      const ids = (accounts ?? []).map((a) => a.user_id);
      let emailMap = new Map<string, string>();
      if (ids.length > 0) {
        const { data: usersData } = await supabase.auth.admin.listUsers();
        emailMap = new Map(
          (usersData?.users ?? [])
            .filter((u) => ids.includes(u.id))
            .map((u) => [u.id, u.email ?? '']),
        );
      }

      return json({
        accounts: (accounts ?? []).map((a) => ({ ...a, email: emailMap.get(a.user_id) ?? '' })),
      });
    }
    case 'upsert_capital_account': {
      const { user_id, capital, achieved, currency, total_withdrawn } = body;
      if (!user_id) return errorJson('user_id em falta.');
      const row: Record<string, unknown> = { user_id: String(user_id), updated_at: new Date().toISOString() };
      if (capital != null) row.capital = Number(capital);
      if (achieved != null) row.achieved = Number(achieved);
      if (total_withdrawn != null) row.total_withdrawn = Number(total_withdrawn);
      if (currency === 'usd' || currency === 'aoa') row.currency = currency;

      const { data, error } = await supabase
        .from('capital_accounts')
        .upsert(row, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) return errorJson(error.message, 500);
      return json({ account: data });
    }
    case 'post_capital_report': {
      const { user_id, period_start, period_end, starting_balance, ending_balance, note, currency } = body;
      if (!user_id || !period_start || !period_end) return errorJson('user_id, period_start e period_end são obrigatórios.');

      const start = Number(starting_balance) || 0;
      const end = Number(ending_balance) || 0;
      const profit = end - start;
      const profitPct = start > 0 ? (profit / start) * 100 : 0;

      const { data: report, error } = await supabase
        .from('capital_reports')
        .insert({
          user_id: String(user_id),
          period_start: String(period_start),
          period_end: String(period_end),
          starting_balance: start,
          ending_balance: end,
          profit,
          profit_pct: Math.round(profitPct * 100) / 100,
          note: note ? String(note) : null,
        })
        .select()
        .single();
      if (error) return errorJson(error.message, 500);

      const accountRow: Record<string, unknown> = {
        user_id: String(user_id),
        achieved: end,
        updated_at: new Date().toISOString(),
      };
      if (currency === 'usd' || currency === 'aoa') accountRow.currency = currency;
      // Primeira conta do utilizador: capital inicial = saldo inicial do relatório.
      const { data: existingAccount } = await supabase
        .from('capital_accounts')
        .select('user_id')
        .eq('user_id', user_id)
        .maybeSingle();
      if (!existingAccount) accountRow.capital = start;

      const { error: upsertError } = await supabase
        .from('capital_accounts')
        .upsert(accountRow, { onConflict: 'user_id', ignoreDuplicates: false });
      if (upsertError) console.error('admin-manage: falha ao atualizar capital_accounts', upsertError.message);

      const fmt = (currency === 'aoa')
        ? `${Math.round(profit).toLocaleString('pt-PT')} Kz`
        : `$${Math.abs(profit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const sign = profit >= 0 ? '+' : '-';
      await notifyUser(
        String(user_id),
        'Gestão de Capital',
        `Novo relatório publicado: ${sign}${fmt} no período.`,
        { type: 'capital_report', reportId: report.id },
      );

      return json({ report });
    }
    case 'list_capital_reports': {
      const { user_id } = body;
      if (!user_id) return errorJson('user_id em falta.');
      const { data, error } = await supabase
        .from('capital_reports')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(52);
      if (error) return errorJson(error.message, 500);
      return json({ reports: data });
    }
    case 'ban_user': {
      const { user_id } = body;
      if (!user_id) return errorJson('user_id em falta.');
      const { error } = await supabase.auth.admin.updateUserById(user_id, {
        user_metadata: { banned: true },
      });
      if (error) return errorJson(error.message, 500);
      return json({ banned: true });
    }
    case 'update_user_role': {
      const { user_id, role } = body;
      if (!user_id || !role) return errorJson('user_id e role em falta.');
      const { error } = await supabase.auth.admin.updateUserById(user_id, {
        user_metadata: { role },
      });
      if (error) return errorJson(error.message, 500);
      return json({ updated: true });
    }
    case 'update_subscription_expiry': {
      const { user_id, expires_at } = body;
      if (!user_id) return errorJson('user_id em falta.');

      // Ler o registo existente para não perder plan ao criar linha nova
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', user_id)
        .maybeSingle();

      const active = Boolean(expires_at) && new Date(expires_at as string) > new Date();
      const { error } = await supabase
        .from('subscriptions')
        .upsert(
          {
            user_id,
            plan: existing?.plan ?? (active ? 'premium' : 'free'),
            status: active ? 'active' : 'expired',
            expires_at,
            current_period_end: expires_at,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );
      if (error) return errorJson(error.message, 500);
      return json({ updated: true });
    }
    case 'expiring_count': {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      // Aprovações escrevem current_period_end; concessões manuais só expires_at.
      const { count, error } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .or(
          `and(expires_at.gte.${new Date().toISOString()},expires_at.lte.${sevenDaysFromNow.toISOString()}),` +
            `and(current_period_end.gte.${new Date().toISOString()},current_period_end.lte.${sevenDaysFromNow.toISOString()})`,
        );
      if (error) return errorJson(error.message, 500);
      return json({ count: count ?? 0 });
    }
    case 'bulk_delete_signals': {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) return errorJson('ids em falta.');
      const { error } = await supabase.from('signals').delete().in('id', ids);
      if (error) return errorJson(error.message, 500);
      return json({ deleted: ids.length });
    }
    case 'bulk_delete_boom_hours': {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) return errorJson('ids em falta.');
      const { error } = await supabase.from('boom_hours').delete().in('id', ids);
      if (error) return errorJson(error.message, 500);
      return json({ deleted: ids.length });
    }
    case 'bulk_delete_boom_times': {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) return errorJson('ids em falta.');
      const { error } = await supabase.from('boom_times').delete().in('id', ids);
      if (error) return errorJson(error.message, 500);
      return json({ deleted: ids.length });
    }
    case 'bulk_delete_posts': {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) return errorJson('ids em falta.');
      const { error } = await supabase.from('posts').delete().in('id', ids);
      if (error) return errorJson(error.message, 500);
      return json({ deleted: ids.length });
    }
    // ── Withdrawal Requests ────────────────────────────────────────────
    case 'list_withdrawals': {
      const limit = Math.min(Number(body.limit) || 50, 200);
      const offset = Number(body.offset) || 0;
      let query = supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false });
      if (body.status) query = query.eq('status', body.status);
      query = query.range(offset, offset + limit - 1);
      const { data, error } = await query;
      if (error) return errorJson(error.message, 500);
      return json({ withdrawals: data });
    }
    case 'approve_withdrawal': {
      const { id } = body;
      if (!id) return errorJson('id em falta.');
      const { error } = await supabase.from('withdrawal_requests').update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) return errorJson(error.message, 500);
      return json({ ok: true });
    }
    case 'reject_withdrawal': {
      const { id, notes } = body;
      if (!id) return errorJson('id em falta.');
      const { error } = await supabase.from('withdrawal_requests').update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        notes: notes || null,
      }).eq('id', id);
      if (error) return errorJson(error.message, 500);
      return json({ ok: true });
    }
    case 'mark_withdrawal_paid': {
      const { id } = body;
      if (!id) return errorJson('id em falta.');
      const { error } = await supabase.from('withdrawal_requests').update({
        status: 'paid',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) return errorJson(error.message, 500);
      return json({ ok: true });
    }
    // ── Revenue Stats ──────────────────────────────────────────────────
    case 'revenue_stats': {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

      const { data: thisMonthReceipts } = await supabase
        .from('payment_receipts')
        .select('amount, currency, plan')
        .eq('status', 'approved')
        .gte('created_at', startOfMonth);

      const { data: lastMonthReceipts } = await supabase
        .from('payment_receipts')
        .select('amount, currency, plan')
        .eq('status', 'approved')
        .gte('created_at', startOfLastMonth)
        .lt('created_at', startOfMonth);

      const { data: pendingWithdrawals } = await supabase
        .from('withdrawal_requests')
        .select('amount, currency')
        .eq('status', 'pending');

      const sumByPlan = (receipts: any[]) => {
        const byPlan: Record<string, number> = {};
        for (const r of receipts ?? []) {
          const plan = r.plan || 'unknown';
          byPlan[plan] = (byPlan[plan] || 0) + Number(r.amount);
        }
        return byPlan;
      };

      const sumByCurrency = (rows: any[]) => {
        const byCur: Record<string, number> = {};
        for (const r of rows ?? []) {
          const cur = r.currency || 'usd';
          byCur[cur] = (byCur[cur] || 0) + Number(r.amount);
        }
        return byCur;
      };

      const thisMonth = thisMonthReceipts ?? [];
      const lastMonth = lastMonthReceipts ?? [];

      return json({
        thisMonthRevenue: sumByCurrency(thisMonth),
        lastMonthRevenue: sumByCurrency(lastMonth),
        thisMonthByPlan: sumByPlan(thisMonth),
        lastMonthByPlan: sumByPlan(lastMonth),
        thisMonthCount: thisMonth.length,
        pendingWithdrawalsAmount: sumByCurrency(pendingWithdrawals ?? []),
      });
    }
    // ── Message Reports ────────────────────────────────────────────────
    case 'list_reports': {
      let query = supabase
        .from('message_reports')
        .select('*, messages!inner(text, user_id, channel_id, conversation_id), reporter:auth.users!inner(email)')
        .order('created_at', { ascending: false });
      if (body.status) query = query.eq('status', body.status);
      query = query.limit(Math.min(Number(body.limit) || 50, 200));
      const { data, error } = await query;
      if (error) return errorJson(error.message, 500);
      return json({ reports: data });
    }
    case 'dismiss_report': {
      const { id } = body;
      if (!id) return errorJson('id em falta.');
      const { error } = await supabase.from('message_reports').update({
        status: 'dismissed', reviewed_by: user.id, reviewed_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) return errorJson(error.message, 500);
      return json({ ok: true });
    }
    case 'act_on_report': {
      const { id, delete_message } = body;
      if (!id) return errorJson('id em falta.');
      const { data: report } = await supabase.from('message_reports').select('message_id').eq('id', id).single();
      if (report && delete_message) {
        await supabase.from('messages').update({ deleted_at: new Date().toISOString() }).eq('id', report.message_id);
      }
      const { error } = await supabase.from('message_reports').update({
        status: 'acted', reviewed_by: user.id, reviewed_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) return errorJson(error.message, 500);
      return json({ ok: true, message_deleted: !!delete_message });
    }
    case 'report_count': {
      const { count, error } = await supabase
        .from('message_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      if (error) return errorJson(error.message, 500);
      return json({ count: count ?? 0 });
    }
    // ── Channel Management ─────────────────────────────────────────────
    case 'list_channels': {
      const { data, error } = await supabase.from('channels').select('*').order('created_at', { ascending: false });
      if (error) return errorJson(error.message, 500);
      return json({ channels: data });
    }
    case 'update_channel': {
      const { id, display_name, description, icon, is_premium } = body;
      if (!id) return errorJson('id em falta.');
      const updates: Record<string, any> = {};
      if (display_name !== undefined) updates.display_name = display_name;
      if (description !== undefined) updates.description = description;
      if (icon !== undefined) updates.icon = icon;
      if (is_premium !== undefined) updates.is_premium = is_premium;
      const { error } = await supabase.from('channels').update(updates).eq('id', id);
      if (error) return errorJson(error.message, 500);
      return json({ ok: true });
    }
    case 'delete_channel': {
      const { id } = body;
      if (!id) return errorJson('id em falta.');
      const { data: ch } = await supabase.from('channels').select('name, type').eq('id', id).single();
      if (ch?.type === 'pair') return errorJson('Pair rooms são geridos automaticamente.');
      const systemNames = ['geral', 'sinais', 'duvidas', 'resultados', 'off-topic'];
      if (systemNames.includes(ch?.name)) return errorJson('Canais do sistema não podem ser apagados.');
      const { error } = await supabase.from('channels').delete().eq('id', id);
      if (error) return errorJson(error.message, 500);
      return json({ ok: true });
    }
    case 'toggle_channel_premium': {
      const { id } = body;
      if (!id) return errorJson('id em falta.');
      const { data: ch } = await supabase.from('channels').select('is_premium').eq('id', id).single();
      if (!ch) return errorJson('Canal não encontrado.', 404);
      const { error } = await supabase.from('channels').update({ is_premium: !ch.is_premium }).eq('id', id);
      if (error) return errorJson(error.message, 500);
      return json({ ok: true, is_premium: !ch.is_premium });
    }
    default:
      return errorJson(`Ação desconhecida: ${action}`, 400);
  }
});
