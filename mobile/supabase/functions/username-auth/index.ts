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
const USERNAME_TAKEN = 'Este NomeUnico já está a ser usado.';

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
  retryAfterMinutes: number;
};

// Toda a logica do contador vive em SQL (migration 20261004000000). A leitura,
// a decisao e a escrita acontecem ai dentro de uma transaccao com FOR UPDATE.
// Em JavaScript era read-then-write, e N pedidos simultaneos liam o mesmo
// contador e escreviam o mesmo valor seguinte: o contador subia 1 em vez de N e
// o bloqueio nunca disparava.
async function registerFailure(username: string): Promise<AttemptState> {
  const { data, error } = await supabase.rpc('username_auth_record_attempt', {
    p_username: username,
    p_success: false,
    p_max_attempts: MAX_ATTEMPTS,
    p_window_minutes: WINDOW_MINUTES,
    p_lock_minutes: LOCK_MINUTES,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return {
    locked: Boolean(row?.locked),
    retryAfterMinutes: Number(row?.retry_after_minutes ?? 0),
  };
}

async function clearFailures(username: string): Promise<void> {
  // Unico erro que aceitamos ignorar, e deliberadamente ignorado: esta chamada
  // corre depois do token ja emitido, e a conta esta autenticada. Lancar aqui
  // devolveria 500 a um login que ja foi bem-sucedido, e o utilizador ficaria
  // sem sessao apesar de a senha estar certa. No peor caso o contador velho
  // expira sozinho.
  await supabase.rpc('username_auth_record_attempt', {
    p_username: username,
    p_success: true,
  });
}

async function isLocked(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('username_auth_is_locked', {
    p_username: username,
  });
  // Falha aqui nao significa "nao bloqueado": significa que o contador nao
  // respondeu. Devolver false deixava passar o pedido e abria o rate limit,
  // que e exactamente o que o bloqueio existe para impedir.
  if (error) throw error;
  return data !== null && data !== undefined;
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
    // So uma colisao de email sintetico justifica 409, e so ela e possivel se o
    // username violar a reserva wa<digitos>. Qualquer outro erro e de
    // infraestrutura: devolvia 409 e o cliente traduzia isso por "nome ocupado",
    // dizendo ao utilizador para escolher outro nome quando o problema foi a base
    // de dados -- e o username dele ficava de qualquer forma reservado.
    const collision = /already registered|already exists/i.test(createError.message);
    return {
      tokenHash: null,
      error: collision ? USERNAME_TAKEN : 'Não foi possível criar a conta.',
      status: collision ? 409 : 500,
    };
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
    // A conta existe no auth mas ninguem consegue entrar nela. Sem apagar, o
    // utilizador leva 500, carrega "criar" outra vez, e apanha 409 "nome ocupado"
    // com o username que ele proprio acabou de escolher -- sem forma de entrar.
    await supabase.auth.admin.deleteUser(created.user.id);
    return { tokenHash: null, error: 'Não foi possível iniciar a sessão.', status: 500 };
  }

  return { tokenHash, error: null, status: 200 };
}

async function signIn(
  username: string,
  password: string,
): Promise<{ tokenHash: string | null; error: string | null; status: number }> {
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('username', username)
    .maybeSingle();
  // Uma falha aqui e um 500, nao "nao existe". Deixando passar, o username
  // chegava como null a verify_user_password, que devolvia false, e o login
  // acabava como 401 "senha errada" a contar uma tentativa -- exatamente o mesmo
  // caminho que levava getUserById a bloquear contas legitimas.
  if (profileError) {
    return { tokenHash: null, error: 'Não foi possível iniciar a sessão.', status: 500 };
  }

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
  const { data: userRow, error: userError } = userId
    ? await supabase.auth.admin.getUserById(userId)
    : { data: { user: null }, error: null };
  // Sem este erro verificado, uma falha de rede no auth-admin chegava aqui como
  // userRow null, caia no "senha errada" e contava uma tentativa. Cinco falhas
  // de rede sucessivas bloqueavam um utilizador legitimo com 429.
  if (userError) {
    return { tokenHash: null, error: 'Não foi possível iniciar a sessão.', status: 500 };
  }

  const authUser = userRow?.user ?? null;
  if (authUser?.banned_until && new Date(authUser.banned_until).getTime() > Date.now()) {
    return { tokenHash: null, error: 'Conta suspensa. Contacta o suporte.', status: 403 };
  }

  if (!authUser || passwordMatches !== true) {
    const state = await registerFailure(username);
    if (state.locked) {
      return {
        tokenHash: null,
        error: `Demasiadas tentativas. Tente novamente em ${state.retryAfterMinutes || LOCK_MINUTES} minutos.`,
        status: 429,
      };
    }
    return { tokenHash: null, error: GENERIC_CREDENTIALS, status: 401 };
  }

  if (!authUser.email) {
    return { tokenHash: null, error: 'Não foi possível iniciar a sessão.', status: 500 };
  }

  // A conta foi autenticada, por isso a partir daqui nenhum erro deve impedir a
  // sessao: limpamos o contador depois de emitir o token, e uma falha aqui
  // apenas deixa um contador velho por expirar.
  const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: authUser.email,
  });
  const tokenHash = link?.properties?.hashed_token ?? null;
  if (linkError || !tokenHash) {
    return { tokenHash: null, error: 'Não foi possível iniciar a sessão.', status: 500 };
  }

  await clearFailures(username);

  return { tokenHash, error: null, status: 200 };
}

// CLAIM: um utilizador que entrou por outra via (Google, WhatsApp) reserva um
// NomeUnico para o perfil e para as mencoes.
//
// NAO define senha, e a ausencia nao e uma limitacao da implementacao. Com senha,
// esta conta passaria a ter duas vias de entrada e a via NomeUnico+senha
// entraria sem o segundo factor do Google -- um caminho mais fraco do que aquele
// que o utilizador escolheu ao entrar com Google. A decisao e de produto, e a BD
// garante-a sem depender de disciplina nesta funcao: verify_user_password
// devolve false para contas sem encrypted_password, portanto um username
// reservado nunca se torna uma segunda porta de entrada. Verificado contra um
// Postgres real com uma conta Google sem senha.
//
// Tambem nao permite trocar um username ja reservado. Mudar de nome permitiria
// reescrever a autoria de mensagens antigas que ja citavam o nome antigo.
async function claimUsername(
  userId: string,
  username: string,
): Promise<{ error: string | null; status: number }> {
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('username')
    .eq('user_id', userId)
    .maybeSingle();
  if (profileError) return { error: 'Não foi possível reservar o nome.', status: 500 };
  if (profile?.username) return { error: 'Já tens um NomeUnico reservado.', status: 409 };

  const { data: taken, error: takenError } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('username', username)
    .maybeSingle();
  if (takenError) return { error: 'Não foi possível reservar o nome.', status: 500 };

  if (taken) {
    // A distincao e a mesma do 'create' e pelo mesmo motivo: o nome precisa de
    // estar visivel para se poder dizer que esta ocupado. Nao revela se a conta
    // existe. Conta como tentativa, porque e uma sondagem a que um utilizador
    // autenticado poderia recorrer para ocupar nomes por ordem.
    const state = await registerFailure(userId);
    if (state.locked) {
      return {
        error: `Demasiadas tentativas. Tente novamente em ${state.retryAfterMinutes || LOCK_MINUTES} minutos.`,
        status: 429,
      };
    }
    return { error: USERNAME_TAKEN, status: 409 };
  }

  // service_role e o unico papel que o trigger de 20261002000000 deixa escrever
  // a coluna username.
  const { data: written, error: writeError } = await supabase
    .from('user_profiles')
    .update({ username })
    .eq('user_id', userId)
    .select('username')
    .maybeSingle();
  if (writeError) return { error: 'Não foi possível reservar o nome.', status: 500 };
  // `written` nulo significa que nao existe linha de profile para este
  // utilizador. Um update que nao afeta nenhuma linhas e um sucesso aparente:
  // o cliente receberia ok e o username nunca ficaria reservado. A coluna e
  // unica, portanto a corrida entre dois pedidos simultaneos aparece aqui como
  // writeError e nao como sucesso silencioso.
  if (!written) return { error: 'Não foi possível reservar o nome.', status: 500 };

  await clearFailures(userId);
  return { error: null, status: 200 };
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

      const { data: taken, error: takenError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('username', username)
        .maybeSingle();
      if (takenError) throw takenError;
      if (taken) {
        // Username ocupado. Aqui a distincao e aceitavel e necessaria: o
        // utilizador precisa de saber que o nome nao esta livre para escolher
        // outro. Nao revela se a conta existe, so que o nome foi tomado -- e o
        // username ja e visivel na comunidade de qualquer forma.
        return errorJson(USERNAME_TAKEN, 409);
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

    if (action === 'claim') {
      const authHeader = req.headers.get('Authorization') ?? '';
      const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (!jwt) return errorJson('Inicia sessão para reservar um NomeUnico.', 401);

      // O service_role valida o JWT do utilizador e devolve o id de quem o
      // apresenta. O user_id nunca vem do corpo: um parametro aceito aqui
      // permitiria a um atacante reservar um nome em nome de outra pessoa.
      const { data: caller, error: callerError } = await supabase.auth.getUser(jwt);
      if (callerError) return errorJson('Sessão inválida.', 401);
      const userId = caller.user?.id;
      if (!userId) return errorJson('Sessão inválida.', 401);

      // Limite por utilizador, e nao por nome. A RPC e a mesma que o login usa,
      // com o id como chave: o que interessa e a linha exclusiva, nao o
      // conteudo da coluna. Um limite por nome nao serviria para nada aqui --
      // quem procura um nome livre experimentaria nomes novos, cada um com a sua
      // propria linha e o seu proprio contador.
      if (await isLocked(userId)) {
        return errorJson(`Demasiadas tentativas. Tente novamente em ${LOCK_MINUTES} minutos.`, 429);
      }

      const result = await claimUsername(userId, username);
      if (result.error) return errorJson(result.error, result.status);
      return json({ ok: true, username }, result.status);
    }

    return errorJson('Ação desconhecida.');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno.';
    return errorJson(message, 500);
  }
});
