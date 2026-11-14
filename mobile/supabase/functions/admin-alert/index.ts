// admin-alert — fan-out de alertas para os administradores.
//
// Canais suportados (todos best-effort, ativados apenas quando os secrets
// existem):
//   - Email       RESEND_API_KEY + EMAIL_FROM + ADMIN_EMAILS
//   - Push Expo   EXPO_PUSH_ACCESS_TOKEN (opcional)
//   - WhatsApp    WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID +
//                 WHATSAPP_ADMIN_TEMPLATE + ADMIN_WHATSAPP_NUMBERS
//   - SMS Twilio  TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER +
//                 ADMIN_SMS_NUMBERS
//
// O registo in-app (admin_notifications) é feito por triggers SQL. Esta função
// só faz o fan-out externo, para não duplicar linhas no sino do admin.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const expoPushApi = 'https://exp.host/--/api/v2/push/send';

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

function envList(...names: string[]): string[] {
  const values = names.flatMap((name) => (Deno.env.get(name) ?? '').split(/[,;\s]+/));
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function truncate(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : clean.slice(0, max - 1).trimEnd() + '.';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

async function adminEmails(): Promise<string[]> {
  const fromEnv = envList('ADMIN_EMAILS').map((e) => e.toLowerCase());
  if (fromEnv.length > 0) return fromEnv;

  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'admin_emails')
    .maybeSingle();
  if (error || !data?.value) return [];
  return String(data.value)
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function adminUserIds(emails: string[]): Promise<string[]> {
  if (emails.length === 0) return [];
  const wanted = new Set(emails);
  const ids: string[] = [];

  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    const users = data?.users ?? [];
    for (const user of users) {
      if (user.email && wanted.has(user.email.toLowerCase())) ids.push(user.id);
    }
    if (users.length < 200) break;
  }

  return ids;
}

async function sendEmail(emails: string[], title: string, message: string): Promise<number> {
  const apiKey = Deno.env.get('RESEND_API_KEY') ?? '';
  if (!apiKey || emails.length === 0) return 0;

  const from = Deno.env.get('EMAIL_FROM') ?? 'TMT <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: emails,
      subject: `[TMT Admin] ${title}`,
      html: `<p><strong>${escapeHtml(title)}</strong></p><p>${escapeHtml(message)}</p>`,
    }),
  });
  if (!res.ok) {
    console.error('[admin-alert] resend', res.status, await res.text().catch(() => ''));
    return 0;
  }
  return emails.length;
}

async function sendPush(userIds: string[], title: string, message: string): Promise<number> {
  if (userIds.length === 0) return 0;

  const { data: tokens, error } = await supabase
    .from('push_tokens')
    .select('token')
    .in('user_id', userIds);
  if (error) {
    console.error('[admin-alert] push_tokens', error.message);
    return 0;
  }

  const list = (tokens ?? []).map((t: { token: string }) => t.token).filter(Boolean);
  if (list.length === 0) return 0;

  const expoToken = Deno.env.get('EXPO_PUSH_ACCESS_TOKEN') ?? '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (expoToken) headers.Authorization = `Bearer ${expoToken}`;

  let sent = 0;
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100).map((to) => ({
      to,
      title,
      body: truncate(message),
      sound: 'default',
      channelId: 'admin',
      data: { kind: 'admin', url: '/admin' },
    }));

    const res = await fetch(expoPushApi, {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      console.error('[admin-alert] expo', res.status, await res.text().catch(() => ''));
      continue;
    }
    const result = await res.json().catch(() => ({}));
    const tickets = Array.isArray(result?.data) ? result.data : [];
    for (const ticket of tickets) {
      if (ticket?.status !== 'error') sent += 1;
    }
  }
  return sent;
}

async function sendWhatsApp(title: string, message: string): Promise<number> {
  const token = Deno.env.get('WHATSAPP_TOKEN') ?? '';
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';
  const template = Deno.env.get('WHATSAPP_ADMIN_TEMPLATE') ?? '';
  const lang = Deno.env.get('WHATSAPP_ADMIN_TEMPLATE_LANG') ?? 'pt_PT';
  const numbers = envList('ADMIN_WHATSAPP_NUMBERS', 'ADMIN_PHONE_NUMBERS')
    .map(normalizePhone)
    .filter((n): n is string => n !== null);

  if (!token || !phoneNumberId || numbers.length === 0) return 0;

  let sent = 0;
  for (const to of numbers) {
    const payload = template
      ? {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: template,
            language: { code: lang },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: truncate(title, 60) },
                  { type: 'text', text: truncate(message, 300) },
                ],
              },
            ],
          },
        }
      : {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: `${title}\n${message}` },
        };

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      console.error(
        '[admin-alert] whatsapp',
        to,
        res.status,
        await res.text().catch(() => ''),
      );
      continue;
    }
    sent += 1;
  }
  return sent;
}

async function sendSms(title: string, message: string): Promise<number> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
  const from = Deno.env.get('TWILIO_FROM_NUMBER') ?? '';
  const numbers = envList('ADMIN_SMS_NUMBERS', 'ADMIN_PHONE_NUMBERS')
    .map(normalizePhone)
    .filter((n): n is string => n !== null);

  if (!sid || !authToken || !from || numbers.length === 0) return 0;

  let sent = 0;
  for (const to of numbers) {
    const body = new URLSearchParams({
      To: to,
      From: from,
      Body: truncate(`${title}: ${message}`, 300),
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${sid}:${authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );
    if (!res.ok) {
      console.error('[admin-alert] twilio', to, res.status, await res.text().catch(() => ''));
      continue;
    }
    sent += 1;
  }
  return sent;
}

interface AlertBody {
  type?: string;
  title?: string;
  message?: string;
  entity_type?: string;
  entity_id?: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return errorJson('Método não permitido.', 405);
  }

  let body: AlertBody;
  try {
    body = (await req.json()) as AlertBody;
  } catch {
    return errorJson('JSON inválido.');
  }

  const type = String(body.type ?? '').trim();
  const title = String(body.title ?? '').trim();
  const message = String(body.message ?? '').trim();
  if (!type || !title) return errorJson('type e title são obrigatórios.');

  const authHeader = req.headers.get('Authorization') ?? '';
  const isServiceRole = Boolean(serviceRoleKey) && authHeader === `Bearer ${serviceRoleKey}`;
  let callerId: string | null = null;

  if (!isServiceRole && authHeader.startsWith('Bearer ')) {
    const { data } = await supabase.auth.getUser(authHeader.slice(7));
    callerId = data.user?.id ?? null;
  }

  if (!isServiceRole && !callerId && type !== 'new_user') {
    return errorJson('Não autenticado.', 401);
  }

  let notificationId: string | null = null;

  // O registo de novos utilizadores é feito por trigger em auth.users. Para
  // permitir o fan-out mesmo quando o signup ainda não tem sessão, validamos
  // que a notificação existe e ainda não foi enviada por esta função.
  if (type === 'new_user' && !isServiceRole) {
    const entityId = String(body.entity_id ?? '');
    if (!entityId) return errorJson('entity_id em falta.');

    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('id, data')
      .eq('type', 'new_user')
      .eq('entity_id', entityId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) return errorJson(error.message, 500);
    const row = data?.[0];
    if (!row) return json({ skipped: 'new_user notification not found' }, 202);
    if (row.data?.alert_sent === true) return json({ skipped: 'already sent' });
    notificationId = row.id;
  }

  const emails = await adminEmails();
  const ids = await adminUserIds(emails);

  const [emailSent, pushSent, whatsappSent, smsSent] = await Promise.all([
    sendEmail(emails, title, message).catch((e) => {
      console.error('[admin-alert] email exception', e);
      return 0;
    }),
    sendPush(ids, title, message).catch((e) => {
      console.error('[admin-alert] push exception', e);
      return 0;
    }),
    sendWhatsApp(title, message).catch((e) => {
      console.error('[admin-alert] whatsapp exception', e);
      return 0;
    }),
    sendSms(title, message).catch((e) => {
      console.error('[admin-alert] sms exception', e);
      return 0;
    }),
  ]);

  if (notificationId) {
    const { data: current } = await supabase
      .from('admin_notifications')
      .select('data')
      .eq('id', notificationId)
      .maybeSingle();
    await supabase
      .from('admin_notifications')
      .update({ data: { ...(current?.data ?? {}), alert_sent: true } })
      .eq('id', notificationId);
  }

  return json({
    ok: true,
    type,
    email: emailSent,
    push: pushSent,
    whatsapp: whatsappSent,
    sms: smsSent,
  });
});
