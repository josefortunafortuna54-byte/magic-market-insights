import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;
const LOCK_MINUTES = 30;
const MIN_PASSWORD = 8;

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

// Mesmo texto para "username inexistente" e "senha errada": responder de forma
// diferente transformaria este endpoint num enumerador de contas. A UI trata
// os dois casos com "NomeUnico ou senha invalidos".
const GENERIC_CREDENTIALS = 'NomeUnico ou senha inválidos.';

function normalizeUsername(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase();
}

function isValidUsername(value: string): boolean {
  if (value.length < 3 || value.length > 30) return false;
  if (!/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(value)) return false;
  // 'wa' seguido de digitos esta reservado: as contas de WhatsApp usam o email
  // sintetico wa<telefone>@tmt.local, e um username 'wa244821999999' geraria
  // exatamente esse email -- colisao com uma conta real de outro utilizador.
  if (/^wa\d+$/.test(value)) return false;
  return true;
}

type AttemptState = {
  locked: boolean;
  exhausted: boolean;
  remaining: number;
};

async function registerFailure(username: string): Promise<AttemptState> {
  const now = Date.now();
  const { data } = await supabase
    .from('username_auth_attempts')
    .select('attempts, window_started_at, locked_until')
    .eq('username', username)
    .maybeSingle();

  const windowMs = WINDOW_MINUTES * 60_000;
  const lockMs = LOCK_MINUTES * 60_000;

  if (!data) {
    await supabase.from('username_auth_attempts').insert({ username, attempts: 1 });
    return { locked: false, exhausted: false, remaining: MAX_ATTEMPTS - 1 };
  }

  const lockedUntil = data.locked_until ? new Date(data.locked_until).getTime() : 0;
  if (lockedUntil > now) {
    return { locked: true, exhausted: true, remaining: 0 };
  }

  const windowStarted = new Date(data.window_started_at).getTime();
  const withinWindow = now - windowStarted < windowMs;
  const attempts = (withinWindow ? data.attempts : 0) + 1;

  if (attempts >= MAX_ATTEMPTS) {
    await supabase
      .from('username_auth_attempts')
      .update({
        attempts,
        locked_until: new Date(now + lockMs).toISOString(),
        window_started_at: new Date(now).toISOString(),
      })
      .eq('username', username);
    return { locked: true, exhausted: true, remaining: 0 };
  }

  await supabase
    .from('username_auth_attempts')
    .update({ attempts, window_started_at: new Date(now).toISOString(), locked_until: null })
    .eq('username', username);

  return { locked: false, exhausted: false, remaining: MAX_ATTEMPTS - attempts };
}

async function clearFailures(username: string): Promise<void> {
  await supabase.from('username_auth_attempts').delete().eq('username', username);
}

async function isLocked(username: string): Promise<boolean> {
  const { data } = await supabase
    .from('username_auth_attempts')
    .select('locked_until')
    .eq('username', username)
    .maybeSingle();
  if (!data?.locked_until) return false;
  return new Date(data.locked_until).getTime() > Date.now();
}

// Um username livre, com o email sintetico derivado. Nao devolve o email ao
// cliente: so o token de sessao. Devolver o email permitiria a um atacante
// mapear username -> email real de quem ja tinha conta.
async function createAccount(
  username: string,
  password: string,
): Promise<{ tokenHash: string | null; error: string | null; status: number }> {
  const email = `${username}@tmt.local`;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, auth_provider: 'username' },
  });

  if (createError) {
    // 'User already registered' significaria uma colisao de email sintetico --
    // so possivel se o username violar a reserva wa<digitos>. Nao damos a
    // distinction ao cliente.
    return { tokenHash: null, error: GENERIC_CREDENTIALS, status: 409 };
  }

  // As outras rotas (Google, WhatsApp) criam a linha de profile por backfill ou
  // por heartbeat do usePresence; nao ha trigger em auth.users. Escrevemos aqui
  // para o username ficar registado no momento da conta, nao no primeiro
  // heartbeat -- e via service_role, que e o unico caminho que o trigger de
  // 20261002000000 deixa escrever esta coluna.
  const { error: profileError } = await supabase.from('user_profiles').upsert(
    { user_id: created.user.id, display_name: username, role: 'member', username },
    { onConflict: 'user_id' },
  );
  if (profileError) {
    await supabase.auth.admin.deleteUser(created.user.id);
    return { tokenHash: null, error: 'Não foi possível criar a conta.', status: 500 };
  }

  const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  const tokenHash = link?.properties?.hashed_token ?? null;
  if (linkError || !tokenHash) {
    return { tokenHash: null, error: 'Não foi possível iniciar a sessão.', status: 500 };
  }

  return { tokenHash, error: null, status: 200 };
}

async function signIn(
  username: string,
  password: string,
): Promise<{ tokenHash: string | null; error: string | null; status: number }> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('username', username)
    .maybeSingle();

  // A comparacao acontece na base de dados (verify_user_password, migration
  // 20261003000000): o hash nunca sai de auth.users, nem para ca, nem para o
  // cliente. A funcao corre o crypt() mesmo quando o username nao existe, para
  // nao distinguir "nao existe" de "senha errada" por tempo de resposta.
  const userId = profile?.user_id ?? null;
  const { data: passwordMatches, error: verifyError } = await supabase.rpc(
    'verify_user_password',
    { usr: userId, pwd: password },
  );
  if (verifyError) {
    return { tokenHash: null, error: 'Não foi possível iniciar a sessão.', status: 500 };
  }

  // getUserById so para o estado da conta. banned_until existe no interface User
  // (contraste com password_hash, que nao existe e nunca existiu no output).
  const { data: userRow } = userId
    ? await supabase.auth.admin.getUserById(userId)
    : { data: { user: null } };

  const authUser = userRow?.user ?? null;
  if (authUser?.banned_until && new Date(authUser.banned_until).getTime() > Date.now()) {
    return { tokenHash: null, error: 'Conta suspensa. Contacta o suporte.', status: 403 };
  }

  if (!authUser || passwordMatches !== true) {
    const state = await registerFailure(username);
    if (state.locked) {
      return {
        tokenHash: null,
        error: `Demasiadas tentativas. Tente novamente em ${LOCK_MINUTES} minutos.`,
        status: 429,
      };
    }
    return { tokenHash: null, error: GENERIC_CREDENTIALS, status: 401 };
  }

  await clearFailures(username);

  const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: authUser.email!,
  });
  const tokenHash = link?.properties?.hashed_token ?? null;
  if (linkError || !tokenHash) {
    return { tokenHash: null, error: 'Não foi possível iniciar a sessão.', status: 500 };
  }

  return { tokenHash, error: null, status: 200 };
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
  const username = normalizeUsername(body.username);
  const password = String(body.password ?? '');

  if (!isValidUsername(username)) {
    return errorJson(
      'NomeUnico inválido: 3 a 30 caracteres, minúsculas, letras, números, ponto, underscore ou hífen.',
    );
  }

  try {
    if (action === 'create') {
      if (password.length < MIN_PASSWORD) {
        return errorJson(`A senha precisa de pelo menos ${MIN_PASSWORD} caracteres.`);
      }
      if (await isLocked(username)) {
        return errorJson(`Demasiadas tentativas. Tente novamente em ${LOCK_MINUTES} minutos.`, 429);
      }

      const { data: taken } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('username', username)
        .maybeSingle();
      if (taken) {
        // Username ocupado. Aqui a distincao e aceitavel e necessaria: o
        // utilizador precisa de saber que o nome nao esta livre para escolher
        // outro. Nao revela se a conta existe, so que o nome foi tomado -- e o
        // username ja e visivel na comunidade de qualquer forma.
        return errorJson('Este NomeUnico já está a ser usado.', 409);
      }

      const result = await createAccount(username, password);
      if (result.error) return errorJson(result.error, result.status);
      return json({ ok: true, token_hash: result.tokenHash }, result.status);
    }

    if (action === 'signin') {
      if (password.length === 0) return errorJson(GENERIC_CREDENTIALS, 401);
      if (await isLocked(username)) {
        return errorJson(`Demasiadas tentativas. Tente novamente em ${LOCK_MINUTES} minutos.`, 429);
      }
      const result = await signIn(username, password);
      if (result.error) return errorJson(result.error, result.status);
      return json({ ok: true, token_hash: result.tokenHash }, result.status);
    }

    return errorJson('Ação desconhecida.');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno.';
    return errorJson(message, 500);
  }
});
