// admin-manage — CRUD administrativo para sinais, booms, horas e posts.
// Chamado pelo client com o JWT do utilizador autenticado.
// Verifica se o email está na lista ADMIN_EMAILS (env var).
// Usa service_role para todas as operações de BD (bypassa RLS).

import { createClient, type User } from 'jsr:@supabase/supabase-js@2';
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

// A uniao discriminada por `error` e o que permite ao caller estreitar `user`
// para `User`. Desestruturar o resultado (`const { user } = ...`) quebra essa
// correlacao e o TypeScript passa a dizer 'user is possibly null' em todos os
// usos seguintes, mesmo depois de um `if (error) return`.
type AdminAuth = { user: null; error: string } | { user: User; error: null };

async function verifyAdmin(req: Request): Promise<AdminAuth> {
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
    const { data: sinais, error: sinaisErr } = await supabase
      .from('channels')
      .select('id')
      .eq('name', 'sinais')
      .single();
    // O boom ja esta gravado (a linha acima devolve 500 se falhou), portanto
    // este anuncio e secundario e nao deve falhar o pedido. Mas o erro do
    // PostgREST e devolvido, nao lancado -- pelo que o `catch` em volta nunca
    // via nada e o sinal chegava a existir sem aparecer no canal. Lancar aqui
    // e o que passa a dar entrada ao log que ja existia.
    if (sinaisErr) throw new Error(sinaisErr.message);
    if (sinais?.id && data) {
      const botId = '11111111-1111-1111-1111-111111111111';
      const { error: insertErr } = await supabase.from('messages').insert({
        channel_id: sinais.id,
        user_id: botId,
        text: `🎯 ${String(pair).toUpperCase()} — Boom`,
        image_url: String(image_url || ''),
        boom_id: data.id,
      });
      if (insertErr) throw new Error(insertErr.message);
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

  const { data: subs, error: subsErr } = await supabase
    .from('subscriptions')
    .select('user_id, plan, status, current_period_end')
    .in('user_id', userIds);
  // Sem este erro, subMap ficava vazio e `sub?.status === 'active'` nunca era
  // verdade: a listagem devolvia TODOS os utilizadores como 'free', incluindo
  // quem tinha subscricao activa. O admin decidia extensoes e_subsidios a
  // partir de uma lista que dizia que ninguem pagava.
  if (subsErr) return errorJson(subsErr.message, 500);

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
    const { data: tokens, error: tokensErr } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId);
    // O `try/catch` em volta nao protege nada aqui: o erro do PostgREST nao e
    // lancado, e descartado. Uma falha de leitura deixava tokenList vazio e o
    // `if` de baixo saltava o push inteiro, sem registo -- a mesma notificacao
    // silenciosamente perdida que se corrigiu em send-notification.
    if (tokensErr) throw new Error(tokensErr.message);
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

/**
 * Fan-out de um alerta para os administradores (email/push/WhatsApp/SMS).
 * A edge function admin-alert decide quais canais estão configurados.
 * Best-effort: uma falha aqui nunca bloqueia a operação principal.
 */
async function notifyAdminChannels(
  type: string,
  title: string,
  message: string,
  entityType?: string,
  entityId?: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/functions/v1/admin-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({ type, title, message, entity_type: entityType, entity_id: entityId, data }),
    });
  } catch (e) {
    console.error('admin-manage: falha ao alertar admins', e);
  }
}

/**
 * Credita capital de forma aditiva (nunca sobrescreve o saldo já publicado).
 * Best-effort: falha é logada mas nunca bloqueia a ativação do plano.
 * Usa o RPC atómico da migração para evitar o `select ... for update` local
 * (o edge role não suporta transações SQL multi-statement).
 */
async function creditCapitalAccount(
  userId: string,
  amount: number,
  currency: string,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('mutation_credit_capital_account', {
      p_user_id: userId,
      p_amount: amount,
      p_currency: currency === 'aoa' ? 'AOA' : 'USD',
    });
    if (error) {
      console.error('[admin-manage] crédito de capital falhou', error.message);
    }
  } catch (e) {
    console.error('[admin-manage] exceção no crédito de capital', e);
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

  // Upsert subscription — falha já NÃO é silenciosa: sem isto o plano nunca muda.
  // Guarda CRÍTICA: 'capital' é um depósito de gestão, NÃO uma compra de plano —
  // nunca sobrescrever a subscription do utilizador.
  if (receipt.user_id && receipt.plan && String(receipt.plan).toLowerCase() !== 'capital') {
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

  // Gestão de Capital: o valor do comprovativo é creditado de forma SOMA na
  // conta de capital da moeda do pagamento. Regras:
  //   - plan = 'capital'            → depósito de gestão (sempre credita)
  //   - plan = 'premium' + referral → afiliado: o pagamento vira capital
  // Best-effort: falha é logada, nunca bloqueia a ativação do plano.
  const plan = String(receipt.plan ?? '').toLowerCase();
  const isCapitalPlan = plan === 'capital';
  const isAffiliatePremium =
    plan === 'premium' && Boolean(receipt.referral_code);
  if (receipt.user_id && Number(receipt.amount) > 0 && (isCapitalPlan || isAffiliatePremium)) {
    await creditCapitalAccount(
      receipt.user_id,
      Number(receipt.amount),
      String(receipt.currency ?? 'usd'),
    );
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

  void notifyAdminChannels(
    'receipt_approved',
    'Comprovativo aprovado',
    `${receipt.user_email ?? receipt.user_id} | ${receipt.plan} | ${Number(receipt.amount)} ${String(receipt.currency).toUpperCase()}`,
    'receipt',
    String(id),
    {
      user_email: receipt.user_email,
      plan: receipt.plan,
      amount: Number(receipt.amount),
      currency: receipt.currency,
    },
  );

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

  void notifyAdminChannels(
    'receipt_rejected',
    'Comprovativo recusado',
    `${receipt.user_email ?? receipt.user_id} | ${receipt.plan} | ${Number(receipt.amount)} ${String(receipt.currency).toUpperCase()}`,
    'receipt',
    String(id),
    {
      user_email: receipt.user_email,
      plan: receipt.plan,
      amount: Number(receipt.amount),
      currency: receipt.currency,
    },
  );

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

  const { data: existing, error: membersErr } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', user_id);
  if (membersErr) return errorJson(membersErr.message, 500);

  let conversationId: string | null = null;

  for (const row of existing ?? []) {
    const { data: otherMember, error: otherErr } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', row.conversation_id)
      .neq('user_id', user_id)
      .maybeSingle();
    // otherMember distingue "conversa 1:1" de "conversa de grupo": e a
    // ausencia de um terceiro membro que faz a diferenca. Com o erro engolido,
    // otherMember ficava nulo numa falha de rede, !otherMember era verdadeiro e
    // um grupo era considerado conversa privada -- a DM do admin ia parar ao
    // grupo inteiro.
    if (otherErr) return errorJson(otherErr.message, 500);
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

  const { data: tokens, error: tokensErr } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', user_id);
  // A mensagem ja foi inserida acima. Sem este erro, uma falha na leitura dos
  // tokens deixava tokenList vazio e a DM era entregue sem push nenhum, com
  // `notified: 0` na resposta -- o admin via um envio bem-sucedido.
  if (tokensErr) return errorJson(tokensErr.message, 500);
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
    const { data: allTokens, error: allErr } = await supabase.from('push_tokens').select('user_id');
    // Sem este erro, uma falha deixava userIds vazio e o `return` de baixo
    // respondia `{ notified: 0 }` -- sucesso. O admin broadcasting para toda a
    // base via "0 notificados" e nao havia forma de distinguir de uma base
    // sem tokens registados.
    if (allErr) return errorJson(allErr.message, 500);
    userIds = [...new Set((allTokens ?? []).map((t: { user_id: string }) => t.user_id))];
  }

  if (userIds.length === 0) return json({ notified: 0 });

  const { data: tokens, error: tokensErr } = await supabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', userIds);

  if (tokensErr) return errorJson(tokensErr.message, 500);
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

  const auth = await verifyAdmin(req);
  if (auth.error !== null) return errorJson(auth.error, 401);
  const user = auth.user;

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
      // `body` e Record<string, unknown>, portanto o default so cobre
      // `undefined`: um `limit: "50"` ou `limit: 0` chegava ao .limit() tal
      // como estava. O teto de 200 impede que um cliente peça a tabela inteira.
      const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);
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
    case 'list_capital_contracts': {
      // Gestão de banca: contratos criados pelos utilizadores (planos ativos
      // ou já terminados). O cliente não pode ler isto diretamente — a RLS
      // capital_contracts_select_own limitaria a leitura ao próprio registo.
      const { data: contracts, error } = await supabase
        .from('capital_contracts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return errorJson(error.message, 500);

      const ids = [...new Set((contracts ?? []).map((c) => c.user_id))];
      let emailMap = new Map<string, string>();
      if (ids.length > 0) {
        const { data: usersData } = await supabase.auth.admin.listUsers();
        emailMap = new Map(
          (usersData?.users ?? [])
            .filter((u) => ids.includes(u.id))
            .map((u) => [u.id, u.email ?? '']),
        );
      }

      const list = contracts ?? [];
      return json({
        contracts: list.map((c) => ({ ...c, email: emailMap.get(c.user_id) ?? '' })),
        active_count: list.filter((c) => c.status === 'active').length,
      });
    }
    case 'upsert_capital_account': {
      const { user_id, capital, achieved, currency, total_withdrawn, meta_percent, withdrawable_amount } = body;
      if (!user_id) return errorJson('user_id em falta.');
      const row: Record<string, unknown> = { user_id: String(user_id), updated_at: new Date().toISOString() };
      if (capital != null) row.capital = Number(capital);
      if (achieved != null) row.achieved = Number(achieved);
      if (total_withdrawn != null) row.total_withdrawn = Number(total_withdrawn);
      if (currency === 'usd' || currency === 'aoa') row.currency = currency;
      if (withdrawable_amount != null) {
        const amount = Number(withdrawable_amount);
        if (!Number.isFinite(amount) || amount < 0) return errorJson('Valor levantável inválido.');
        row.withdrawable_amount = amount;
      }
      if (meta_percent != null) {
        const mp = Number(meta_percent);
        if (mp >= 0 && mp <= 100) row.meta_percent = mp;
      }

      const { data, error } = await supabase
        .from('capital_accounts')
        .upsert(row, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) return errorJson(error.message, 500);
      return json({ account: data });
    }
    case 'release_withdrawal_funds': {
      const { user_id, amount, currency } = body;
      if (!user_id) return errorJson('user_id em falta.');
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) return errorJson('Valor inválido.');
      if (currency !== 'usd' && currency !== 'aoa') return errorJson('Moeda inválida.');

      const { error } = await supabase.rpc('release_withdrawal_funds', {
        p_user_id: String(user_id),
        p_amount: value,
        p_currency: currency,
      });
      if (error) return errorJson(error.message, 500);
      return json({ released: value });
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
      const { data: existingAccount, error: accountErr } = await supabase
        .from('capital_accounts')
        .select('user_id')
        .eq('user_id', user_id)
        .maybeSingle();
      // Sem este erro, uma falha de leitura tornava existingAccount nulo, o
      // codigo achava que era a primeira conta e escrevia capital = start por
      // cima do saldo que o utilizador ja tinha. Uma falha de rede destruia o
      // capital de alguem.
      if (accountErr) return errorJson(accountErr.message, 500);
      if (!existingAccount) accountRow.capital = start;

      const { error: upsertError } = await supabase
        .from('capital_accounts')
        .upsert(accountRow, { onConflict: 'user_id', ignoreDuplicates: false });
      // Antes era so console.error e a resposta de sucesso na mesma, portanto o
      // admin via "publicado" com o capital por escrever.
      if (upsertError) return errorJson(upsertError.message, 500);

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
    // ── Pedidos de novo gerenciamento (após o contrato terminar) ─────────
    case 'list_capital_management_requests': {
      const { status } = body;
      let query = supabase
        .from('capital_management_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (typeof status === 'string' && status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) return errorJson(error.message, 500);

      const ids = [...new Set((data ?? []).map((r) => r.user_id))];
      const emailMap = new Map<string, string>();
      await Promise.all(
        ids.map(async (uid) => {
          const { data: u } = await supabase.auth.admin.getUserById(uid);
          emailMap.set(uid, u?.user?.email ?? '');
        }),
      );
      return json({
        requests: (data ?? []).map((r) => ({ ...r, email: emailMap.get(r.user_id) ?? '' })),
      });
    }
    case 'approve_capital_management_request': {
      const id = typeof body.id === 'string' ? body.id : null;
      if (!id) return errorJson('id em falta.');

      const { data: req, error: reqErr } = await supabase
        .from('capital_management_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (reqErr) return errorJson(reqErr.message, 500);
      if (!req) return errorJson('Pedido não encontrado.', 404);
      if (req.status !== 'pending') return errorJson('Pedido já tratado.', 409);

      const monthsByPlan: Record<string, number> = { conservador: 3, equilibrado: 2, agressivo: 1 };
      const months = monthsByPlan[req.plan_id as string];
      if (!months) return errorJson('Plano inválido.', 400);

      const today = new Date().toISOString().slice(0, 10);
      // Expira contratos vencidos para libertar o índice único de contrato ativo.
      const { error: expErr } = await supabase
        .from('capital_contracts')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('user_id', req.user_id)
        .eq('status', 'active')
        .lt('end_date', today);
      if (expErr) return errorJson(expErr.message, 500);

      // Não ativar por cima de um contrato que ainda está a decorrer.
      const { data: running, error: runErr } = await supabase
        .from('capital_contracts')
        .select('id')
        .eq('user_id', req.user_id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (runErr) return errorJson(runErr.message, 500);
      if (running) return errorJson('O utilizador já tem um contrato ativo.', 409);

      // Capital inicial = saldo atual da conta na moeda do pedido (0 se não existir).
      const { data: acc, error: accErr } = await supabase
        .from('capital_accounts')
        .select('capital')
        .eq('user_id', req.user_id)
        .eq('currency', req.currency)
        .limit(1)
        .maybeSingle();
      if (accErr) return errorJson(accErr.message, 500);
      const capital = Number(acc?.capital ?? 0);

      // Espelha a semântica do Postgres (date + interval 'N months'), que faz clamp
      // ao último dia do mês quando o dia não existe (ex.: 31 Jan + 1 mês = 28 Fev).
      const isoDate = (d: Date) => d.toISOString().slice(0, 10);
      const start = new Date();
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1));
      const lastDayOfMonth = new Date(
        Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
      ).getUTCDate();
      end.setUTCDate(Math.min(start.getUTCDate(), lastDayOfMonth));

      const { data: contract, error: ctrErr } = await supabase
        .from('capital_contracts')
        .insert({
          user_id: req.user_id,
          plan_id: req.plan_id,
          currency: req.currency,
          capital_inicial: capital,
          start_date: isoDate(start),
          end_date: isoDate(end),
          months,
          status: 'active',
          penalty_pct: 10,
          terms_version: 'v2',
        })
        .select()
        .single();
      if (ctrErr) return errorJson(ctrErr.message, 500);

      const { error: updErr } = await supabase
        .from('capital_management_requests')
        .update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (updErr) return errorJson(updErr.message, 500);

      await notifyUser(
        req.user_id,
        'Novo gerenciamento ativado',
        'O teu pedido foi aprovado e um novo contrato de gerenciamento está ativo.',
        { type: 'management_request', requestId: id },
      );

      void notifyAdminChannels(
        'management_request_approved',
        'Pedido de gerenciamento aprovado',
        `${req.user_id} | ${req.plan_id} | ${String(req.currency).toUpperCase()}`,
        'management_request',
        id,
        { user_id: req.user_id, plan_id: req.plan_id, currency: req.currency },
      );

      return json({ contract });
    }
    case 'reject_capital_management_request': {
      const id = typeof body.id === 'string' ? body.id : null;
      if (!id) return errorJson('id em falta.');

      const { data: req, error: reqErr } = await supabase
        .from('capital_management_requests')
        .select('id, user_id, status')
        .eq('id', id)
        .maybeSingle();
      if (reqErr) return errorJson(reqErr.message, 500);
      if (!req) return errorJson('Pedido não encontrado.', 404);
      if (req.status !== 'pending') return errorJson('Pedido já tratado.', 409);

      const { error } = await supabase
        .from('capital_management_requests')
        .update({ status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return errorJson(error.message, 500);

      await notifyUser(
        req.user_id,
        'Pedido de gerenciamento não aprovado',
        'O teu pedido de novo gerenciamento não foi aprovado. Fala com o suporte para mais detalhes.',
        { type: 'management_request', requestId: id },
      );

      void notifyAdminChannels(
        'management_request_rejected',
        'Pedido de gerenciamento recusado',
        `${req.user_id} | pedido ${id}`,
        'management_request',
        id,
        { user_id: req.user_id },
      );

      return json({ ok: true });
    }
    case 'search_capital_users': {
      const query = typeof body.query === 'string' ? body.query.trim().toLowerCase() : '';
      if (query.length < 2) return json({ users: [] });

      const matches: { id: string; email: string; created_at: string; last_sign_in_at: string | null }[] = [];
      const perPage = 200;
      let page = 1;

      while (page <= 10 && matches.length < 20) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) return errorJson(error.message, 500);
        const list = data?.users ?? [];

        for (const u of list) {
          const email = (u.email ?? '').toLowerCase();
          if (email.includes(query) || u.id === query) {
            matches.push({
              id: u.id,
              email: u.email ?? '',
              created_at: u.created_at,
              last_sign_in_at: u.last_sign_in_at ?? null,
            });
          }
        }

        if (list.length < perPage) break;
        page += 1;
      }

      return json({ users: matches.slice(0, 20) });
    }
    case 'create_capital_management': {
      const user_id = typeof body.user_id === 'string' ? body.user_id : null;
      const planId = typeof body.plan_id === 'string' ? body.plan_id : null;
      const currency = body.currency === 'aoa' ? 'aoa' : 'usd';
      if (!user_id || !planId) return errorJson('user_id e plan_id são obrigatórios.');

      const monthsByPlan: Record<string, number> = { conservador: 3, equilibrado: 2, agressivo: 1 };
      const months = monthsByPlan[planId];
      if (!months) return errorJson('Plano inválido.', 400);

      const { data: target, error: targetErr } = await supabase.auth.admin.getUserById(user_id);
      if (targetErr) return errorJson(targetErr.message, 500);
      if (!target?.user) return errorJson('Utilizador não encontrado.', 404);

      const today = new Date().toISOString().slice(0, 10);
      const { error: expErr } = await supabase
        .from('capital_contracts')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('user_id', user_id)
        .eq('status', 'active')
        .lt('end_date', today);
      if (expErr) return errorJson(expErr.message, 500);

      const { data: running, error: runErr } = await supabase
        .from('capital_contracts')
        .select('id')
        .eq('user_id', user_id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (runErr) return errorJson(runErr.message, 500);
      if (running) return errorJson('O utilizador já tem um contrato ativo.', 409);

      const { data: existingAccount, error: accReadErr } = await supabase
        .from('capital_accounts')
        .select('*')
        .eq('user_id', user_id)
        .maybeSingle();
      if (accReadErr) return errorJson(accReadErr.message, 500);

      const requestedCapital = body.capital == null || body.capital === ''
        ? null
        : Number(body.capital);
      if (requestedCapital != null && (!Number.isFinite(requestedCapital) || requestedCapital < 0)) {
        return errorJson('Capital inválido.');
      }
      const capital = requestedCapital ?? Number(existingAccount?.capital ?? 0);

      const startDate = typeof body.start_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.start_date)
        ? body.start_date
        : today;
      const start = new Date(`${startDate}T00:00:00Z`);
      if (Number.isNaN(start.getTime())) return errorJson('Data de início inválida.');

      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1));
      const lastDayOfMonth = new Date(
        Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
      ).getUTCDate();
      end.setUTCDate(Math.min(start.getUTCDate(), lastDayOfMonth));
      const isoDate = (d: Date) => d.toISOString().slice(0, 10);

      const { data: contract, error: ctrErr } = await supabase
        .from('capital_contracts')
        .insert({
          user_id,
          plan_id: planId,
          currency,
          capital_inicial: capital,
          start_date: isoDate(start),
          end_date: isoDate(end),
          months,
          status: 'active',
          penalty_pct: 10,
          terms_version: 'v2',
        })
        .select()
        .single();
      if (ctrErr) return errorJson(ctrErr.message, 500);

      const accountRow: Record<string, unknown> = {
        user_id,
        currency,
        status: 'active',
        updated_at: new Date().toISOString(),
      };
      if (requestedCapital != null) {
        accountRow.capital = requestedCapital;
        if (!existingAccount || body.reset_achieved === true) accountRow.achieved = requestedCapital;
      } else if (!existingAccount) {
        accountRow.capital = capital;
        accountRow.achieved = capital;
      }
      if (body.meta_percent != null) {
        const mp = Number(body.meta_percent);
        if (mp >= 0 && mp <= 100) accountRow.meta_percent = mp;
      }

      const { data: account, error: accErr } = await supabase
        .from('capital_accounts')
        .upsert(accountRow, { onConflict: 'user_id' })
        .select()
        .single();
      if (accErr) return errorJson(accErr.message, 500);

      await notifyUser(
        user_id,
        'Gestão de banca ativada',
        `A tua banca está agora em gestão no plano ${capitalizePlan(planId)}.`,
        { type: 'management_request', contractId: contract.id },
      );

      return json({ contract, account });
    }
    case 'manage_capital_contract': {
      const id = typeof body.id === 'string' ? body.id : null;
      const op = typeof body.op === 'string' ? body.op : null;
      if (!id || !op) return errorJson('id e op são obrigatórios.');

      const { data: contract, error: ctrErr } = await supabase
        .from('capital_contracts')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (ctrErr) return errorJson(ctrErr.message, 500);
      if (!contract) return errorJson('Contrato não encontrado.', 404);

      if (op === 'complete' || op === 'cancel') {
        if (contract.status !== 'active') return errorJson('Contrato não está ativo.', 409);
        const status = op === 'complete' ? 'completed' : 'cancelled';
        const { data: updated, error } = await supabase
          .from('capital_contracts')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (error) return errorJson(error.message, 500);

        await notifyUser(
          contract.user_id,
          op === 'complete' ? 'Gestão de banca concluída' : 'Gestão de banca cancelada',
          op === 'complete'
            ? 'O contrato de gestão da tua banca foi concluído.'
            : 'O contrato de gestão da tua banca foi cancelado. Fala com o suporte para mais detalhes.',
          { type: 'management_request', contractId: id },
        );

        return json({ contract: updated });
      }

      if (op === 'renew') {
        const monthsByPlan: Record<string, number> = { conservador: 3, equilibrado: 2, agressivo: 1 };
        const months = monthsByPlan[contract.plan_id as string];
        if (!months) return errorJson('Plano inválido.', 400);

        const today = new Date().toISOString().slice(0, 10);
        const { error: expErr } = await supabase
          .from('capital_contracts')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('user_id', contract.user_id)
          .eq('status', 'active')
          .lt('end_date', today);
        if (expErr) return errorJson(expErr.message, 500);

        const { data: running, error: runErr } = await supabase
          .from('capital_contracts')
          .select('id')
          .eq('user_id', contract.user_id)
          .eq('status', 'active')
          .neq('id', id)
          .limit(1)
          .maybeSingle();
        if (runErr) return errorJson(runErr.message, 500);
        if (running) return errorJson('O utilizador já tem outro contrato ativo.', 409);

        const startDate = typeof body.start_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.start_date)
          ? body.start_date
          : today;
        const start = new Date(`${startDate}T00:00:00Z`);
        if (Number.isNaN(start.getTime())) return errorJson('Data de início inválida.');

        const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1));
        const lastDayOfMonth = new Date(
          Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
        ).getUTCDate();
        end.setUTCDate(Math.min(start.getUTCDate(), lastDayOfMonth));
        const isoDate = (d: Date) => d.toISOString().slice(0, 10);

        const update: Record<string, any> = {
          status: 'active',
          start_date: isoDate(start),
          end_date: isoDate(end),
          months,
          updated_at: new Date().toISOString(),
        };
        if (body.capital_inicial != null) {
          const ci = Number(body.capital_inicial);
          if (!Number.isFinite(ci) || ci < 0) return errorJson('Capital inválido.');
          update.capital_inicial = ci;
        }
        if (body.penalty_pct != null) {
          const pp = Number(body.penalty_pct);
          if (!Number.isFinite(pp) || pp < 0 || pp > 100) return errorJson('Penalidade inválida.');
          update.penalty_pct = pp;
        }

        const { data: updated, error } = await supabase
          .from('capital_contracts')
          .update(update)
          .eq('id', id)
          .select()
          .single();
        if (error) return errorJson(error.message, 500);

        await notifyUser(
          contract.user_id,
          'Gestão de banca renovada',
          `O teu período de gestão foi renovado por ${months} mês(es).`,
          { type: 'management_request', contractId: id },
        );

        return json({ contract: updated });
      }

      return errorJson('Operação inválida.', 400);
    }
    case 'ban_user': {
      const user_id = typeof body.user_id === 'string' ? body.user_id : null;
      if (!user_id) return errorJson('user_id em falta.');
      const { error } = await supabase.auth.admin.updateUserById(user_id, {
        user_metadata: { banned: true },
      });
      if (error) return errorJson(error.message, 500);
      return json({ banned: true });
    }
    case 'update_user_role': {
      const user_id = typeof body.user_id === 'string' ? body.user_id : null;
      const role = typeof body.role === 'string' ? body.role.toLowerCase() : null;
      const allowedRoles = ['free', 'basic', 'pro', 'premium'];
      if (!user_id || !role) return errorJson('user_id e role em falta.');
      if (!allowedRoles.includes(role)) {
        return errorJson(`role inválido. Usa: ${allowedRoles.join(', ')}.`);
      }

      // A lista de utilizadores (handleListUsers) deriva o role da tabela
      // subscriptions, não do user_metadata. Atualizar só o metadata fazia a
      // alteração "pegar" no auth mas continuar a aparecer free no painel.
      const now = new Date();
      const { data: existing, error: existingErr } = await supabase
        .from('subscriptions')
        .select('plan, status, current_period_end')
        .eq('user_id', user_id)
        .maybeSingle();
      if (existingErr) return errorJson(existingErr.message, 500);

      const existingEnd = existing?.current_period_end
        ? new Date(existing.current_period_end)
        : null;
      const keepExistingEnd =
        role !== 'free' &&
        existing?.status === 'active' &&
        existingEnd !== null &&
        existingEnd.getTime() > now.getTime();
      const paidEnd = keepExistingEnd
        ? existingEnd
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const periodEnd = role === 'free' ? null : paidEnd.toISOString();

      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert(
          {
            user_id,
            plan: role,
            status: role === 'free' ? 'expired' : 'active',
            expires_at: periodEnd,
            current_period_end: periodEnd,
            updated_at: now.toISOString(),
          },
          { onConflict: 'user_id' },
        );
      if (subError) return errorJson(subError.message, 500);

      const { error } = await supabase.auth.admin.updateUserById(user_id, {
        user_metadata: { role },
      });
      if (error) return errorJson(error.message, 500);

      return json({ updated: true, role, status: role === 'free' ? 'expired' : 'active', current_period_end: periodEnd });
    }
    case 'update_subscription_expiry': {
      const { user_id, expires_at } = body;
      if (!user_id) return errorJson('user_id em falta.');

      // Ler o registo existente para não perder plan ao criar linha nova
      const { data: existing, error: existingErr } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', user_id)
        .maybeSingle();
      // Este erro nao pode ser engolido. A linha seguinte usa
      // `existing?.plan ?? (active ? 'premium' : 'free')`, portanto uma falha
      // de leitura levava ao ramo do default e o upsert reescrevia o plano de
      // um utilizador a pagar -- um 'pro' com a expiry passada passava a
      // 'free' por causa de uma falha de rede. O comentario acima explica
      // porque e que este `select` existe; este e o que impede que ele
      // funcione ao contrario.
      if (existingErr) return errorJson(existingErr.message, 500);

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
      const { data: updated, error } = await supabase.rpc('approve_withdrawal_request', {
        p_id: String(id),
        p_admin: user.id,
      });
      if (error) return errorJson(error.message, 409);
      if (updated) {
        const row = updated as Record<string, unknown>;
        void notifyAdminChannels(
          'withdrawal_approved',
          'Levantamento aprovado',
          `${String(row.method)} | ${String(row.amount)} ${String(row.currency).toUpperCase()}`,
          'withdrawal',
          String(id),
          row,
        );
      }
      return json({ ok: true });
    }
    case 'reject_withdrawal': {
      const { id, notes } = body;
      if (!id) return errorJson('id em falta.');
      const { data: updated, error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq('id', id)
        .eq('status', 'pending')
        .select('user_id, method, amount, currency')
        .maybeSingle();
      if (error) return errorJson(error.message, 500);
      if (!updated) return errorJson('Levantamento não está pendente.', 409);
      void notifyAdminChannels(
        'withdrawal_rejected',
        'Levantamento recusado',
        `${updated.method} | ${updated.amount} ${String(updated.currency).toUpperCase()}`,
        'withdrawal',
        String(id),
        updated,
      );
      return json({ ok: true });
    }
    case 'mark_withdrawal_paid': {
      const { id } = body;
      if (!id) return errorJson('id em falta.');

      // Transição atómica: approved → paid. Sem .eq('status') o update era
      // idempotente na BD mas não gravava a transição correta nem evitava
      // pagamentos duplos a partir de estados inválidos.
      const { data: transitioned, error: updateErr } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'paid',
          reviewed_by: user.id,
          paid_at: new Date().toISOString(),
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'approved')
        .select('user_id, amount, currency, net_amount, penalty_amount, debited_at')
        .maybeSingle();

      if (updateErr) return errorJson(updateErr.message, 500);
      if (!transitioned) {
        return errorJson('Levantamento não está aprovado ou já foi pago.', 409);
      }

      // `amount` é o valor BRUTO pedido; `net_amount` é o que o utilizador
      // recebe (bruto menos a penalidade de levantamento antecipado). O saldo
      // gerido desce pelo bruto: os 10% são uma taxa da plataforma.
      const netAmount = transitioned.net_amount != null
        ? Number(transitioned.net_amount)
        : Number(transitioned.amount);

      // Débito do saldo publicado (best-effort, logado)
      const currency = transitioned.currency === 'aoa' ? 'aoa' : 'usd';
      const { data: account, error: acctErr } = await supabase
        .from('capital_accounts')
        .select('*')
        .eq('user_id', transitioned.user_id)
        .eq('currency', currency)
        .maybeSingle();

      if (!transitioned.debited_at && !acctErr && account) {
        const { error: debitErr } = await supabase
          .from('capital_accounts')
          .update({
            achieved: Math.max(0, Number(account.achieved ?? 0) - Number(transitioned.amount)),
            withdrawable_amount: Math.max(0, Number(account.withdrawable_amount ?? 0) - Number(transitioned.amount)),
            total_withdrawn: (Number(account.total_withdrawn ?? 0) + Number(transitioned.amount)),
            updated_at: new Date().toISOString(),
          })
          .eq('id', account.id);
        if (debitErr) {
          console.error('[admin-manage] débito de levantamento falhou', debitErr.message);
        }
      }

      void notifyAdminChannels(
        'withdrawal_paid',
        'Levantamento pago',
        `${Number(transitioned.amount)} ${String(transitioned.currency).toUpperCase()} (líquido ${netAmount})`,
        'withdrawal',
        String(id),
        {
          user_id: transitioned.user_id,
          amount: Number(transitioned.amount),
          net_amount: netAmount,
          currency: transitioned.currency,
        },
      );

      return json({
        ok: true,
        amount: Number(transitioned.amount),
        net_amount: netAmount,
        penalty_amount: Number(transitioned.penalty_amount ?? 0),
      });
    }
    // ── Revenue Stats ──────────────────────────────────────────────────
    case 'revenue_stats': {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

      const { data: thisMonthReceipts, error: thisErr } = await supabase
        .from('payment_receipts')
        .select('amount, currency, plan')
        .eq('status', 'approved')
        .gte('created_at', startOfMonth);
      if (thisErr) return errorJson(thisErr.message, 500);

      const { data: lastMonthReceipts, error: lastErr } = await supabase
        .from('payment_receipts')
        .select('amount, currency, plan')
        .eq('status', 'approved')
        .gte('created_at', startOfLastMonth)
        .lt('created_at', startOfMonth);
      if (lastErr) return errorJson(lastErr.message, 500);

      const { data: pendingWithdrawals, error: withdrawalsErr } = await supabase
        .from('withdrawal_requests')
        .select('amount, currency')
        .eq('status', 'pending');
      if (withdrawalsErr) return errorJson(withdrawalsErr.message, 500);

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
      const { data: report, error: reportErr } = await supabase
        .from('message_reports').select('message_id').eq('id', id).maybeSingle();
      if (reportErr) return errorJson(reportErr.message, 500);
      if (!report) return errorJson('Denúncia não encontrada.', 404);

      // A mensagem e apagada ANTES de a denuncia ser marcada, e o erro nao e
      // engolido. Ao contrario, uma falha deixava a denuncia marcada como
      // tratada com a mensagem ainda visivel -- estado incoerente que nao se
      // desfaz sozinho, porque ninguem volta a ver a denuncia como pendente.
      let messageDeleted = false;
      if (delete_message) {
        const { error: delErr } = await supabase
          .from('messages').update({ deleted_at: new Date().toISOString() }).eq('id', report.message_id);
        if (delErr) return errorJson(delErr.message, 500);
        messageDeleted = true;
      }

      const { error } = await supabase.from('message_reports').update({
        status: 'acted', reviewed_by: user.id, reviewed_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) return errorJson(error.message, 500);
      // Reflete o que aconteceu, nao o que foi pedido: com o erro engolido
      // acima, isto dizia "apagada" a um admin cuja mensagem continuava viva.
      return json({ ok: true, message_deleted: messageDeleted });
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
      // maybeSingle e nao single: single() devolve erro tambem quando o canal
      // nao existe, e entao um "nao encontrado" seria reportado como 500. Com
      // maybeSingle o erro e so do banco, e `ch` nulo significa mesmo
      // inexistente -- distincao que este caso precisa.
      const { data: ch, error: chErr } = await supabase
        .from('channels').select('name, type').eq('id', id).maybeSingle();
      // Sem esta linha os dois guardas abaixo passam por vacuidade quando a
      // leitura falha: ch fica nulo, ch?.type nao e 'pair' e ch?.name nao
      // entra na lista. O canal de sistema apagava-se por causa de uma falha
      // de rede, que e o oposto do que estes guardas existem para impedir.
      if (chErr) return errorJson(chErr.message, 500);
      if (!ch) return errorJson('Canal não encontrado.', 404);
      if (ch.type === 'pair') return errorJson('Pair rooms são geridos automaticamente.');
      const systemNames = ['geral', 'sinais', 'duvidas', 'resultados', 'off-topic'];
      if (systemNames.includes(ch.name)) return errorJson('Canais do sistema não podem ser apagados.');
      const { error } = await supabase.from('channels').delete().eq('id', id);
      if (error) return errorJson(error.message, 500);
      return json({ ok: true });
    }
    case 'toggle_channel_premium': {
      const { id } = body;
      if (!id) return errorJson('id em falta.');
      const { data: ch, error: chErr } = await supabase
        .from('channels').select('is_premium').eq('id', id).maybeSingle();
      if (chErr) return errorJson(chErr.message, 500);
      if (!ch) return errorJson('Canal não encontrado.', 404);
      const { error } = await supabase.from('channels').update({ is_premium: !ch.is_premium }).eq('id', id);
      if (error) return errorJson(error.message, 500);
      return json({ ok: true, is_premium: !ch.is_premium });
    }
    default:
      return errorJson(`Ação desconhecida: ${action}`, 400);
  }
});
