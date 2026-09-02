// send-notification — Envia notificações push (Expo Push API) para DMs e @menções.
// Chamada pela app depois de inserir uma mensagem: { messageId }
// Comportamento:
//  - DM            → notifica o outro membro da conversa.
//  - Canal + menção → notifica apenas os utilizadores mencionados (@nome).
// Precisa do secret EXPO_PUSH_ACCESS_TOKEN (opcional; recomendado).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const expoAccessToken = Deno.env.get('EXPO_PUSH_ACCESS_TOKEN') ?? '';
const expoApiBase = 'https://exp.host/--/api/v2/push/send';
const ANDROID_CHANNEL_ID = 'comunidade';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function errorJson(message: string, status = 400): Response {
  return json({ error: message }, status);
}

function truncate(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') return errorJson('Método não permitido.', 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return errorJson('Não autenticado.', 401);

  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) return errorJson('Não autenticado.', 401);

  let payload: { messageId?: unknown };
  try {
    payload = await req.json();
  } catch {
    return errorJson('JSON inválido.', 400);
  }
  const messageId = typeof payload?.messageId === 'string' ? payload.messageId : '';
  if (!messageId) return errorJson('messageId em falta.', 400);

  const { data: message, error: msgError } = await supabase
    .from('messages')
    .select('id, channel_id, conversation_id, user_id, text, created_at')
    .eq('id', messageId)
    .maybeSingle();
  if (msgError || !message) return errorJson('Mensagem não encontrada.', 404);
  if (message.user_id !== user.id) return errorJson('Permissão negada.', 403);

  const recipientIds = new Set<string>();

  if (message.conversation_id) {
    const { data: members } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', message.conversation_id);
    for (const m of members ?? []) {
      if (m.user_id !== message.user_id) recipientIds.add(m.user_id);
    }
  }

  const { data: mentions } = await supabase
    .from('message_mentions')
    .select('user_id')
    .eq('message_id', messageId);
  for (const m of mentions ?? []) {
    if (m.user_id !== message.user_id) recipientIds.add(m.user_id);
  }

  if (recipientIds.size === 0) return json({ notified: 0 });

  const { data: sender } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('user_id', message.user_id)
    .maybeSingle();
  const senderName = sender?.display_name || 'TMT';

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', [...recipientIds]);

  if (!tokens || tokens.length === 0) return json({ notified: 0 });

  const url = message.conversation_id
    ? `/comunidade/dm/${message.conversation_id}`
    : message.channel_id
      ? `/comunidade/canais/${message.channel_id}`
      : null;

  const body = truncate(message.text || '');
  const pushMessages = tokens.map((t) => ({
    to: t.token,
    title: senderName,
    body,
    sound: 'default',
    channelId: ANDROID_CHANNEL_ID,
    ...(url ? { data: { url } } : {}),
  }));

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (expoAccessToken) headers['Authorization'] = `Bearer ${expoAccessToken}`;

  let sent = 0;
  const dead: string[] = [];

  for (let i = 0; i < pushMessages.length; i += 100) {
    const chunk = pushMessages.slice(i, i + 100);
    let res: Response;
    try {
      res = await fetch(expoApiBase, {
        method: 'POST',
        headers,
        body: JSON.stringify(chunk),
      });
    } catch (err: unknown) {
      console.error('send-notification: Expo request falhou', err);
      continue;
    }
    if (!res.ok) {
      console.error('send-notification: Expo status', res.status, await res.text().catch(() => ''));
      continue;
    }
    const result = await res.json().catch(() => ({}));
    const tickets = Array.isArray(result?.data) ? result.data : [];
    for (let j = 0; j < tickets.length; j++) {
      const ticket = tickets[j] as { status?: string; details?: unknown } | undefined;
      if (ticket?.status === 'error') {
        if (String(ticket.details ?? '').includes('DeviceNotRegistered')) {
          dead.push(chunk[j].to);
        }
      } else {
        sent += 1;
      }
    }
  }

  if (dead.length > 0) {
    await supabase.from('push_tokens').delete().in('token', dead);
  }

  console.log('[send-notification] enviadas', sent, '| removidas', dead.length);
  return json({ notified: sent, dead: dead.length });
});
