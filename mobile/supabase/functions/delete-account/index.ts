import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

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

// As tabelas de conteudo do utilizador tem ON DELETE CASCADE para auth.users.
// As colunas reviewed_by nao tem, por isso sao anuladas antes de apagar a conta
// para nao bloquear a eliminacao (caso de um admin que reviu pedidos).
const REVIEWED_BY_TABLES = [
  'payment_receipts',
  'withdrawal_requests',
  'message_reports',
  'capital_management_requests',
];

// Prefixos de pastas usados pelos uploads da app em cada bucket.
const STORAGE_PREFIXES: Array<{ bucket: string; prefix: string }> = [
  { bucket: 'payment-proofs', prefix: '' },
  { bucket: 'community', prefix: '' },
  { bucket: 'community', prefix: 'community/' },
  { bucket: 'comments-audio', prefix: 'comments/' },
];

async function removeUserObjects(userId: string): Promise<void> {
  for (const { bucket, prefix } of STORAGE_PREFIXES) {
    const folder = `${prefix}${userId}`;
    const { data: entries, error } = await supabase.storage.from(bucket).list(folder, { limit: 1000 });
    if (error) {
      console.warn(`[delete-account] list ${bucket}/${folder}:`, error.message);
      continue;
    }
    const paths = (entries ?? [])
      .filter((entry) => entry.id !== null)
      .map((entry) => `${folder}/${entry.name}`);
    if (paths.length === 0) continue;
    const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
    if (removeError) {
      console.warn(`[delete-account] remove ${bucket}/${folder}:`, removeError.message);
    }
  }
}

async function clearReviews(userId: string): Promise<void> {
  for (const table of REVIEWED_BY_TABLES) {
    const { error } = await supabase.from(table).update({ reviewed_by: null }).eq('reviewed_by', userId);
    if (error) {
      console.warn(`[delete-account] clear reviewed_by em ${table}:`, error.message);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return errorJson('Metodo nao permitido.', 405);
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return errorJson('Nao autenticado.', 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) return errorJson('Nao autenticado.', 401);

    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== true) {
      return errorJson('Confirmacao em falta.', 400);
    }

    await removeUserObjects(user.id);
    await clearReviews(user.id);

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('[delete-account] deleteUser:', deleteError.message);
      return errorJson('Nao foi possivel apagar a conta.', 500);
    }

    return json({ deleted: true });
  } catch (err) {
    console.error('[delete-account] exception:', err);
    return errorJson('Nao foi possivel apagar a conta.', 500);
  }
});
