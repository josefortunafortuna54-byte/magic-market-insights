# 03 — Backend (Supabase)

## 3.1 Projeto

- **Supabase Project ID:** `magic-market-insights-main` (`supabase/config.toml`)
- Serviços usados: Postgres (RLS), Auth, Realtime, Storage, Edge Functions (Deno).

---

## 3.2 Modelo de dados (tabelas)

> Tipo TS completo em `src/integrations/supabase/types.ts`. RLS ativo em todas.

### `signals`
Sinais de análise gerados pelo motor.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| symbol | text | par (ex.: `EUR/USD`) |
| timeframe | text | `M15`, `H1`, `H4` |
| type | text | `BUY` / `SELL` / `AGUARDAR` |
| entry | numeric | preço de entrada |
| stop_loss | numeric | SL |
| take_profit | numeric | TP |
| confidence | numeric | 0–100 |
| status | text | `active`, `pending`, `tp`, `sl` |
| risk_reward | numeric | RR 1:x |
| reasons | jsonb | lista de razões técnicas |
| created_at | timestamptz | |

**RLS:** SELECT público (qualquer utilizador lê — o gating é feito no frontend);
INSERT/UPDATE apenas via Service Role (funções `generate-signal`/`close-signals`).

### `subscriptions`
Subscrições Stripe sincronizadas pelo webhook.

| Campo | Tipo | Notas |
|---|---|---|
| id | text | Stripe subscription id |
| user_id | uuid | → auth.users |
| status | text | `active`, `canceled`, `incomplete`, ... |
| current_period_start/end | timestamptz | |
| created_at | timestamptz | |

**Premium =** existe registo com `status = 'active'`. RLS: SELECT e UPDATE apenas do
próprio utilizador.

### `whatsapp_subscriptions`
Alerta de WhatsApp dos utilizadores Premium.

| Campo | Tipo |
|---|---|
| id | uuid PK |
| user_id | uuid |
| phone_number | text |
| status | text |
| created_at | timestamptz |

RLS: operações só sobre os próprios registos.

### `boom_hours`
Horários fixos "Hora do Boom" (página `/horarios`).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| title | text | |
| time_gmt | text | hora (GMT) |
| time_wat | text | hora (WAT, UTC+1) |
| pairs | text[] | pares afetados |
| days | text[] | dias da semana |
| volatility | smallint | 1–5 |
| badge | text | opcional |
| description | text | |
| is_active | boolean | filtro da página |

RLS: leitura pública, escrita admin.

### `posts`
Posts da comunidade (Admin).

| Campo | Tipo |
|---|---|
| id | uuid PK |
| author_name | text |
| title | text |
| pair | text |
| signal_type | text |
| content | text |
| image_url | text |
| audio_url | text |
| created_at | timestamptz |

### `boom_times`
Eventos pontuais "Boom" (página `/comunidade`).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| pair | text | |
| event_time | timestamptz | data/hora do evento |
| confidence | numeric | % |
| expected_result | text | `BUY` / `SELL` |
| actual_result | text | resultado real (se expirado) |
| image_url | text | cover |
| audio_url | text | áudio da equipa |
| created_at | timestamptz | |

**Estado derivado no frontend:** `upcoming` → `live` (≤15 min) → `expired` (passou).

### `boom_comments`
Comentários dos utilizadores.

| Campo | Tipo |
|---|---|
| id | uuid PK |
| boom_id | uuid → boom_times |
| user_id | uuid |
| content | text |
| audio_url | text |
| created_at | timestamptz |

### `boom_votes`
Votações BUY/SELL da comunidade (um voto por utilizador por boom).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| boom_id | uuid | |
| user_id | uuid | |
| vote | text | `BUY` / `SELL` |
| created_at | timestamptz | |
| — | — | UNIQUE(boom_id, user_id) → upsert |

### `get_all_users` (RPC)
Função Postgres usada pelo Admin para listar utilizadores (nome, email, datas).

### Storage buckets
- `posts` — imagens/áudio de posts.
- `comments-audio` — gravações de comentários (webm).

---

## 3.3 Edge Functions (Deno)

### `generate-signal` — motor de análise
- Recebe `{ symbol, timeframe }` (ex.: `EUR/USD`, `1h`).
- **Análise técnica** com indicadores (RSI, EMA 20/50/200, MACD, Bollinger, Stochastic,
  Ichimoku, Fibonacci, ADX, Suportes/Resistências) — sem necessidade de candles externos
  (gera um cenário educacional com os níveis).
- Gera sinal `BUY`/`SELL`/`AGUARDAR` com entry, SL, TP (RR ≥ 1:2), confiança e razões.
- Insere em `signals` via Service Role (insert real).
- Chamada pelo Admin (`/admin`) para gerar sinais de 10 símbolos.

### `close-signals` — encerramento de sinais
- Cron (ver migrations) chama a cada 30 min (schedule `close-signals-every-30min`).
- Marca sinais `active` como `tp`/`sl` conforme evolução do preço (mock do mercado).

### `stripe-checkout` — pagamento
- Recebe `{ priceId, currency }`.
- Valida sessão do Supabase (Authorization Bearer).
- Cria **Checkout Session** do Stripe (modo `subscription`, sucesso/cancelamento
  redireciona para `/planos?success=true|false`).
- URLs absolutos via `SITE_URL` (default `https://magic-market-insights.vercel.app`).

### `stripe-webhook` — sincronização
- Verifica assinatura (`STRIPE_WEBHOOK_SECRET`) no header `stripe-signature`.
- Trata `checkout.session.completed` e `customer.subscription.*` → faz upsert em
  `subscriptions` (user_id ligado pelo `client_reference_id`).

### `admin-manage` — CRUD admin
- Verifica no servidor se o email do utilizador ∈ `ADMIN_EMAILS`.
- Rota `get_users` → `get_all_users` RPC + `subscriptions`.
- Rota `get_posts` → `SELECT * FROM posts`.
- Rota `publish_post` → INSERT em `posts`.
- Rota `add_boom_time` → INSERT em `boom_times`.

---

## 3.4 Autenticação

- **Email + senha** (`signInWithPassword`, `signUp` com confirmação por email,
  `resetPasswordForEmail`).
- **Google OAuth** (`signInWithOAuth`, provider `google`).
- Utilizador atual: `supabase.auth.getUser()` (cache em React Query).
- Admin: verificação de email no cliente (`VITE_ADMIN_EMAILS`) + no servidor.

---

## 3.5 Real-time

`supabase.channel('...').on('postgres_changes', ...)` usado para:
- Sinais (painel `/analises`).
- `boom_times`, `boom_votes`, `boom_comments` (Comunidade — com polling de estado a
  cada 10 s para recalcular `live/expired`).

---

## 3.6 Preços em tempo real (`useLivePrices`)

- **Forex:** Frankfurter API — `https://api.frankfurter.app/latest?from=<PAR1>&to=<PAR2>`
  (último valor, sem chave).
- **Bitcoin:** CoinGecko — `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`.
- Mostra preço + variação % (delta entre chamadas) no painel de sinais.

---

## 3.7 Deploy / Infra

- **Vercel** com `vercel.json` (rewrite `/(.*)` → `/index.html` para SPA).
- **Supabase** gerido na cloud (project `magic-market-insights-main`).
- Cron de encerramento de sinais configurado nas Edge Functions (schedule).
- Variáveis de ambiente divididas entre Frontend (Vite `VITE_*`) e Functions
  (`SERVICE_ROLE_KEY`, `STRIPE_*`, `ADMIN_EMAILS`, ...).
