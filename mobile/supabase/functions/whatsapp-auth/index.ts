import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const waToken = Deno.env.get('WHATSAPP_TOKEN') ?? '';
const waPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';
const waTemplate = Deno.env.get('WHATSAPP_TEMPLATE') ?? 'tmt_login_code';
const waTemplateLang = Deno.env.get('WHATSAPP_TEMPLATE_LANG') ?? 'pt_PT';
const defaultCountryCode = Deno.env.get('WHATSAPP_DEFAULT_COUNTRY_CODE') ?? '244';
const codeTtlMinutes = Number(Deno.env.get('WHATSAPP_CODE_TTL_MINUTES') ?? '5');
const maxAttempts = Number(Deno.env.get('WHATSAPP_MAX_ATTEMPTS') ?? '5');

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

function normalizePhone(raw: string): string {
  let digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) throw new Error('Número de WhatsApp obrigatório.');
  if (digits.startsWith('0')) digits = defaultCountryCode + digits.slice(1);
  if (digits.length < 8 || digits.length > 15) {
    throw new Error('Número de WhatsApp inválido. Inclui o código do país.');
  }
  return `+${digits}`;
}

function syntheticEmail(phone: string): string {
  return `wa${phone.replace(/\D/g, '')}@tmt.local`;
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendWhatsAppCode(phone: string, code: string): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${waPhoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${waToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: waTemplate,
          language: { code: waTemplateLang },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: code },
                { type: 'text', text: `${codeTtlMinutes}` },
              ],
            },
          ],
        },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('WhatsApp API error', res.status, text);
    throw new Error('Não foi possível enviar o código pelo WhatsApp.');
  }
}

async function findUserByPhone(phone: string) {
  const authDb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'auth' },
  });
  const { data, error } = await authDb
    .from('users')
    .select('id, email')
    .eq('phone', phone)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

async function upsertAuthUser(phone: string, code: string): Promise<string> {
  const email = syntheticEmail(phone);
  const existing = await findUserByPhone(phone);

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: code,
    });
    if (error) throw error;
    return email;
  }

  const { error } = await supabase.auth.admin.createUser({
    email,
    password: code,
    phone,
    phone_confirm: true,
    email_confirm: true,
    user_metadata: { phone, auth_provider: 'whatsapp' },
  });
  if (error) throw error;
  return email;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST') return errorJson('Método não permitido.', 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorJson('Corpo inválido.');
  }

  const action = body.action;

  try {
    if (action === 'request') {
      const phone = normalizePhone(String(body.phone ?? ''));
      const code = generateCode();
      const expiresAt = new Date(Date.now() + codeTtlMinutes * 60_000);

      await supabase.from('whatsapp_otp').delete().eq('phone', phone);
      const { error: insertError } = await supabase.from('whatsapp_otp').insert({
        phone,
        code_hash: await sha256(code),
        expires_at: expiresAt.toISOString(),
      });
      if (insertError) throw insertError;

      await sendWhatsAppCode(phone, code);
      return json({ ok: true });
    }

    if (action === 'verify') {
      const phone = normalizePhone(String(body.phone ?? ''));
      const code = String(body.code ?? '').trim();
      if (!/^\d{6}$/.test(code)) return errorJson('Código inválido.');

      const { data: row, error: fetchError } = await supabase
        .from('whatsapp_otp')
        .select('*')
        .eq('phone', phone)
        .is('used_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fetchError) throw fetchError;

      if (!row || new Date(row.expires_at).getTime() < Date.now()) {
        return errorJson('Código expirado. Pede um novo código.');
      }

      await supabase
        .from('whatsapp_otp')
        .update({ attempts: (row.attempts ?? 0) + 1 })
        .eq('id', row.id);

      if ((row.attempts ?? 0) >= maxAttempts) {
        return errorJson('Demasiadas tentativas. Pede um novo código.');
      }

      const hash = await sha256(code);
      if (hash !== row.code_hash) {
        return errorJson('Código incorreto. Tenta novamente.');
      }

      await supabase.from('whatsapp_otp').update({ used_at: new Date().toISOString() }).eq('id', row.id);

      const email = await upsertAuthUser(phone, code);
      return json({ ok: true, email });
    }

    return errorJson('Ação desconhecida.');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno.';
    return errorJson(message, 500);
  }
});
