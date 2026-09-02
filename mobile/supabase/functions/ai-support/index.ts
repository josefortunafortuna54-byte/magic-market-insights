// ai-support — assistente de IA (chat + análise de imagem de setups).
// Exige JWT do utilizador autenticado. Aplica quotas por plano ANTES de
// chamar a Gemini e regista o consumo real (tokens) em public.ai_usage.
//
// Limites por plano (reset diário à meia-noite UTC + anti-burst horário):
//   Grátis:   5 chat/dia,  0 análises/dia
//   Basic:   20 chat/dia,  3 análises/dia
//   Pro:     50 chat/dia, 10 análises/dia
//   Premium: 200 chat/dia, 30 análises/dia

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
const apiBase = 'https://generativelanguage.googleapis.com/v1beta';
const maxTurns = 20;
const maxTextLength = 2000;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type PlanLimits = { chat: number; image: number };

const HOURLY_LIMIT = 10;
const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: { chat: 5, image: 0 },
  basic: { chat: 20, image: 3 },
  pro: { chat: 50, image: 10 },
  premium: { chat: 200, image: 30 },
};

const QUOTA_MESSAGES: Record<string, { message: string; code: string }> = {
  daily_chat: {
    message: 'Atingiste o limite diário de mensagens do teu plano. Faz upgrade para continuares a conversar.',
    code: 'quota_daily_chat',
  },
  daily_image: {
    message: 'Atingiste o limite diário de análises do teu plano. Faz upgrade para mais análises.',
    code: 'quota_daily_image',
  },
  plan_image: {
    message: 'As análises de imagem não estão incluídas no plano Grátis. Faz upgrade no separador Planos.',
    code: 'quota_plan_image',
  },
  burst: {
    message: 'Estás a enviar pedidos muito rápido. Aguarda alguns minutos e tenta de novo.',
    code: 'quota_burst',
  },
};

function quotaError(reason: string): Response {
  const q = QUOTA_MESSAGES[reason] ?? QUOTA_MESSAGES.burst;
  return json({ error: q.message, code: q.code }, 429);
}

const SYSTEM_PROMPT = `Tu és o assistente de IA do "The Magic Trader" (TMT), um serviço de sinais e análises de trading Forex. Responde sempre em português, de forma clara e simpática, em respostas concisas (até ~120 palavras, salvo se pedirem mais detalhe).

O que sabes sobre o TMT:
- Sinais: entradas BUY / SELL / AGUARDAR em pares Forex (EUR/USD, GBP/USD, USD/JPY, XAU/USD, etc.), em timeframes M15, H1 e H4, com preço de entrada, Take Profit (TP), Stop Loss (SL) e rácio de risco/recompensa (RR).
- Planos e preços mensais (USD ou Kwanza): Grátis 0 USD, Basic 14.99 USD / 10.000 Kz, Pro 29.99 USD / 20.000 Kz, Premium 49.99 USD / 35.000 Kz. Confirma sempre os preços atuais na app.
- Alertas: notificações push, WhatsApp e Telegram (planos pagos); os horários dos alertas gerem-se na secção "Alertas".
- Gestão de banca: controlo de capital, metas e risco por operação (disponível no plano Premium).
- A app tem "Análises" (análises diárias), "Histórico" (sinais fechados), "Horários"/BOOM (janelas de alta volatilidade) e "Comunidade" (votar BUY/SELL e comentar).

Regras:
- Em conversa normal responde de forma concisa (até ~120 palavras, salvo se pedirem mais detalhe).
- Quando houver uma imagem, segue rigorosamente as instruções do pedido de análise (prompt do utilizador) — nesse caso podes exceder as 120 palavras para cobrir todos os pontos.
- Se não souberes algo específico da app, diz honestamente e sugere contactar o suporte do TMT.
- Não és consultor financeiro. Se falarem de investir/operar, recorda sempre que trading envolve risco.
- Formata com parágrafos curtos e listas com "-".`;

const IMAGE_ANALYSIS_PROMPT = `Analisa esta imagem de um setup de trading com base APENAS no que está visível na imagem. Segue exatamente este processo:

1. 📊 **Identificação** — lê diretamente do gráfico: ativo/par, timeframe e plataforma (ex.: MT5). Se algum não estiver legível, escreve "não legível". NUNCA inventes valores.
2. 🔍 **Leitura de preços** — transcreve 2 a 5 valores REAIS que consegues ler no eixo de preços ou nas linhas do gráfico (máximas, mínimas, níveis). Estes números têm de existir visivelmente na imagem.
3. 📈 **Estrutura & velas** — descreve o que se vê: tendência (máximas/mínimas ascendentes ou descendentes), possível BOS/CHoCH, velas de força/rejeição, zonas de Order Block ou FVG visíveis, suportes/resistências tocados pelo preço.
4. 📉 **Indicadores** — nome e valores visíveis (RSI, MACD, médias móveis, Bollinger, etc.). Se não houver indicadores, diz "nenhum visível".
5. 🎯 **Sugestão** — BUY / SELL ou AGUARDAR, zona de entrada baseada nos preços lidos no ponto 2, TP e SL coerentes com a estrutura vista, e RR calculado a partir desses mesmos números.
6. ⚡ **Confiança** — baixa/média/alta, justificada em 1 frase com base na clareza da imagem.

Regras absolutas:
- Usa apenas informação visível na imagem. Qualquer número citado tem de estar legível no gráfico.
- Se a imagem estiver desfocada, cortada ou não for um gráfico de trading, diz isso claramente e pede uma nova captura em vez de analisar à mesma.
- Responde em português com os títulos numerados acima em negrito.`;

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

function errorJson(message: string, status = 400, code?: string): Response {
  return json(code ? { error: message, code } : { error: message }, status);
}

async function verifyUser(req: Request): Promise<{ userId: string | null }> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return { userId: null };

  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  if (error || !user) return { userId: null };
  return { userId: user.id };
}

async function getPlanLimits(userId: string): Promise<PlanLimits> {
  const { data } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, expires_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const plan = String(data?.plan ?? 'free').toLowerCase();
  // Subscrição com data expirada conta como Grátis (defesa extra entre runs do cron)
  const periodEnd = data?.current_period_end ?? data?.expires_at;
  const expired = periodEnd ? new Date(String(periodEnd)).getTime() < Date.now() : false;
  if (!data || expired) return PLAN_LIMITS.free;
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Chama a Gemini com retry para erros transitórios (429/500/503).
async function callGemini(payload: Record<string, unknown>): Promise<{
  data?: Record<string, any>;
  errorStatus?: number;
}> {
  let lastStatus = 0;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(900 * attempt);
    try {
      const res = await fetch(`${apiBase}/models/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 429 || res.status === 500 || res.status === 503) {
        lastStatus = res.status;
        console.error(`Gemini erro transitorio (tentativa ${attempt + 1})`, res.status, JSON.stringify(data).slice(0, 400));
        continue;
      }
      if (!res.ok) {
        console.error('Gemini API error', res.status, JSON.stringify(data).slice(0, 400));
        return { data, errorStatus: res.status };
      }
      return { data };
    } catch (err: unknown) {
      lastStatus = 0;
      console.error(`Gemini falha de rede (tentativa ${attempt + 1})`, err);
    }
  }
  return { errorStatus: lastStatus || 502 };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorJson('Método não permitido.', 405);
  if (!geminiApiKey) return errorJson('GEMINI_API_KEY não configurada.', 500);

  // ── Auth obrigatória ──────────────────────────────────────────────────────
  const { userId } = await verifyUser(req);
  if (!userId) return errorJson('Inicia sessão para usares o assistente.', 401, 'auth_required');

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorJson('Corpo inválido.');
  }

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const imageData = body.image as { data: string; mimeType: string } | undefined;

  let contents = rawMessages
    .filter(
      (m): m is { role: unknown; text: string } =>
        !!m && typeof m === 'object' && typeof m.text === 'string' && m.text.trim().length > 0,
    )
    .slice(-maxTurns)
    .map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text.slice(0, maxTextLength) }],
    }));

  let hasImage = false;
  if (imageData && typeof imageData.data === 'string' && imageData.data.length > 0) {
    const cleanBase64 = imageData.data.replace(/^data:[^;]+;base64,/, '');

    // ~5 MB já indica imagem em resolução total — o cliente deve comprimir.
    if (cleanBase64.length > 7_000_000) {
      return errorJson('Imagem demasiado grande. Tira uma nova captura ou escolhe uma mais leve.', 413, 'image_too_large');
    }

    const imagePart = {
      inline_data: {
        mime_type: imageData.mimeType || 'image/jpeg',
        data: cleanBase64,
      },
    };

    const analysisPrompt = body.prompt as string || IMAGE_ANALYSIS_PROMPT;
    hasImage = true;

    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts.push({ text: analysisPrompt } as any);
      contents[contents.length - 1].parts.push(imagePart as any);
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: analysisPrompt } as any, imagePart as any],
      });
    }
  }

  if (contents.length === 0) return errorJson('Envia uma mensagem ou imagem para começares.');

  // ── Quota por plano (atórmica, antes de gastar tokens) ────────────────────
  const kind = hasImage ? 'image' : 'chat';
  const limits = await getPlanLimits(userId);

  const { data: quota, error: quotaErr } = await supabase.rpc('consume_ai_quota', {
    p_user_id: userId,
    p_kind: kind,
    p_chat_limit: limits.chat,
    p_image_limit: limits.image,
    p_hourly_limit: HOURLY_LIMIT,
  });

  if (quotaErr) {
    console.error('consume_ai_quota error', quotaErr);
    return errorJson('Erro temporário ao verificar a tua quota. Tenta novamente.', 500, 'quota_check_failed');
  }

  if (!quota?.allowed) {
    const reason = String(quota?.reason ?? 'burst');
    // Plano Grátis sem análises de imagem tem mensagem própria
    if (reason === 'plan' && kind === 'image') return quotaError('plan_image');
    if (reason === 'daily') return quotaError(kind === 'chat' ? 'daily_chat' : 'daily_image');
    return quotaError(reason);
  }

  // ── Chamada à Gemini ──────────────────────────────────────────────────────
  try {
    const { data, errorStatus } = await callGemini({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: hasImage
        ? { temperature: 0.3, maxOutputTokens: 4096 }
        : { temperature: 0.7, maxOutputTokens: 1024 },
    });

    if (errorStatus) {
      if (errorStatus === 429) {
        return errorJson('A IA está a receber muitos pedidos neste momento. Aguarda um minuto e tenta de novo.', 429, 'ai_busy');
      }
      return errorJson('A IA não conseguiu responder. Tenta novamente em instantes.', 502, 'ai_unavailable');
    }

    const blockReason = data?.promptFeedback?.blockReason;
    const candidates = data?.candidates;
    if (!candidates?.length) {
      if (blockReason) {
        return errorJson('O conteúdo foi bloqueado pela IA. Tenta reformular a mensagem ou usar outra imagem.', 422, 'blocked');
      }
      return errorJson('A IA não gerou uma resposta.', 500, 'empty_response');
    }

    const parts: Array<{ text?: string }> = candidates[0]?.content?.parts ?? [];
    const reply = parts
      .filter((p) => typeof p?.text === 'string')
      .map((p) => (p.text as string).trim())
      .filter(Boolean)
      .join('\n');

    if (!reply) {
      const finishReason = candidates[0]?.finishReason;
      if (finishReason && finishReason !== 'STOP') {
        console.error('Gemini finishReason', finishReason);
        return errorJson('A IA não conseguiu gerar uma resposta útil. Tenta novamente.', 502, 'bad_finish');
      }
      return errorJson('A IA não gerou uma resposta.', 500, 'empty_response');
    }

    // Registo do consumo real em tokens (best-effort)
    const usageId = quota.usage_id ? String(quota.usage_id) : null;
    const meta = data?.usageMetadata;
    if (usageId && meta) {
      void supabase
        .from('ai_usage')
        .update({
          tokens_in: Number(meta.promptTokenCount ?? 0),
          tokens_out: Number(meta.candidatesTokenCount ?? 0),
        })
        .eq('id', usageId);
    }

    return json({
      reply,
      model: data?.modelVersion ?? model,
      remainingChat: Number(quota.remaining_chat ?? 0),
      remainingImage: Number(quota.remaining_image ?? 0),
      plan: limits === PLAN_LIMITS.premium ? 'premium' : limits === PLAN_LIMITS.pro ? 'pro' : limits === PLAN_LIMITS.basic ? 'basic' : 'free',
    });
  } catch (err: unknown) {
    console.error('ai-support error', err);
    return errorJson('Erro ao contactar a IA.', 500, 'network_error');
  }
});
