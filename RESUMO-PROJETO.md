# RESUMO DO PROJETO — The Magic Trader

> Documento único de resumo do projeto. Complementa os ficheiros detalhados em `RESUMO/`.
> Descreve o estado real do código. Se este doc e o código divergirem, o código ganha:
> reconfirma sempre antes de tomar decisões.

---

## 1. O que é o projeto

**The Magic Trader** — plataforma de **análise técnica de Forex com sinais gerados por IA**
(carácter educacional). Gera sinais BUY/SELL/AGUARDAR por ativo, com entrada, Stop Loss,
Take Profit, nível de confiança e justificações técnicas (RSI, EMA, MACD, Bollinger,
Estocástico, Ichimoku, Fibonacci, ADX, Suportes/Resistências).

- **Slogan:** "Análise inteligente. Entradas estratégicas."
- **Produtos:** app web (React/Vite, deploy na Vercel) + app mobile (Expo, SDK 56, EAS).
  Os dois são produtos completos e praticamente paralelos entre si — não é um web com um
  casulo mobile nem o contrário.
- **Idiomas:** pt-PT (europeu, tuteante) como fonte, mais **13 traduções**: en, es, fr, it,
  de, nl, ru, ar, ja, ko, zh, ln, sw. Ver secção 7.
- **Marca visual:** tema escuro, gradientes verdes (primário) + dourado (premium),
  brilho "glow", cartões de vidro, fontes Space Grotesk + Inter, fundo `#05050D`.

### Modelo de negócio (3 planos × 2 moedas)

| Plano | Nome | Stripe Price IDs |
|---|---|---|
| Basic | Zap | `STRIPE_PRICE_BASIC_USD` / `_BASIC_AOA` |
| Pro | Rocket | `STRIPE_PRICE_PRO_USD` / `_PRO_AOA` |
| Premium | Trophy | `STRIPE_PRICE_PREMIUM_USD` / `_PREMIUM_AOA` |

Premium é o plano com `highlight`/funcionalidades de capital; Pro é o "mais popular".
Cada plano tem preço em **USD** e em **Kwanza (AOA)** — 8 Stripe Price IDs, que são
consumidos **apenas pelo app mobile** (a web não os usa, ver secção 6).
Independentemente do Stripe, há **pagamentos manuais em Kwanzas** com comprovativo
(`payment-proofs`) e **depósito de capital à taxa fixa** (ver secção 4).

---

## 2. Estrutura do repositório

```
TMT/
├── src/                          # App web (React SPA, Vite)
│   ├── App.tsx                   # 32 rotas (React Router)
│   ├── pages/                    # 33 ficheiros de página
│   ├── components/               # layout, sinais, auth, admin, ui (shadcn), comunidade, ...
│   ├── hooks/                    # useSignals, useHistory, useSubscription, useLivePrices, ...
│   ├── lib/                      # supabaseClient, admin, adminApi, i18n/, utils
│   └── integrations/supabase/    # types.ts (tipos Database gerados)
├── mobile/                       # App mobile (Expo SDK 56) — PRODUTO COMPLETO
│   ├── src/app/                  # 33 ecrãs + 4 layouts (Expo Router)
│   ├── src/components/           # 82 componentes (comunidade, admin, sinais, UI)
│   ├── src/hooks/                # 34 hooks
│   ├── src/core/                 # lógica pura: pips, capital, gating, booms, markets, theme
│   ├── src/lib/                  # supabase, i18n (14 locales), adminApi, community
│   ├── src/services/             # economicCalendar
│   ├── supabase/                 # BACKEND AUTORITATIVO: 6 functions, 40 migrations
│   └── AGENTS.md                 # nota: ler docs versionadas do Expo antes de codificar
├── supabase/                     # CÓPIA DESACTUALIZADA: 5 functions, 20 migrations
├── scripts/                      # ferramentas de i18n (ver secção 7)
├── docs/design/                  # mockups do redesign
├── RESUMO/                       # 4 ficheiros detalhados (parcialmente desatualizados)
└── vercel.json                   # rewrite SPA
```

---

## 3. Aplicação web (frontend)

**Stack:** React 18.3 · TypeScript 5.8 · Vite 5.4 · Tailwind CSS 3.4 · shadcn/ui (Radix)
· Framer Motion · TanStack React Query 5 · React Router DOM 6 · Recharts · sonner ·
react-hook-form + zod · next-themes · i18next / react-i18next.

### Rotas (32)
| Rota | Página | Acesso |
|---|---|---|
| `/` | Landing (hero, stats, features, sinais em destaque, CTA) | Público |
| `/analises` · `/analises/:id` · `/analises/:id/chart` | Sinais, detalhe, gráfico isolado | Público (gating free/premium) |
| `/historico` | Sinais fechados + win rate / pips | Público |
| `/planos` | Planos (Basic/Pro/Premium × USD/AOA); o botão reencaminha para `/depositos` | Público |
| `/banca` | Banca virtual: capital, movimentos, simulação de crescimento | Premium |
| `/depositos` | Depósito de capital (Kwanzas, taxa fixa, comprovativo) | Autenticado |
| `/diario-trader` | Diário de trades do utilizador | Autenticado |
| `/suporte-ia` | Assistente de IA | Autenticado |
| `/perfil` · `/comunidade/user/:userId` | Perfil próprio / público | Público / login |
| `/notificacoes` | Central de notificações | Autenticado |
| `/horarios` | Hora do Boom (janelas, volatilidade, alarmes) | Público |
| `/definicoes-booms` | Configuração de BOOMs | Autenticado |
| `/comunidade` (+ 6 sub-rotas) | Workspace, canais, DM, pesquisa, novo canal/DM, **loja** | Público/leitura, login para escrever |
| `/idioma` · `/tema` | Seletor de idioma e de tema | Autenticado |
| `/login` · `/registo` · `/recuperar-senha` | Auth (email + Google OAuth + OTP WhatsApp) | Público |
| `/admin` · `/admin-gate` | Painel admin (protegido por código) | Admin |
| `/termos` · `/privacidade` · `/aviso-risco` | Legal | Público |
| `*` | 404 | — |

### Funcionalidades
- **Sinais:** entry/SL/TP em pips, confiança, RR, estado (Ativo / ✓TP / ✗SL), razões técnicas.
- **Gating free/premium:** lock dourado em H1/H4 e pares extra para não-premium.
- **Gráfico:** TradingView embebido (web e mobile, via WebView).
- **Preços ao vivo:** Twelve Data (forex) + Binance (BTC).
- **Banca virtual:** capital, movimentos, depósitos, simulador de crescimento com
  projecção de retorno, juros compostos, metas.
- **Comunidade:** canais, DM, mensagens, reacções, reports, anúncios, loja para membros,
  perfil público, gravações de áudio.
- **Pagamentos na web: só manuais.** `/planos` reencaminha para `/depositos`, que abre um
  pedido em Kwanzas (binance, RodotPay, Express) com comprovativo. O Stripe é um caminho
  **do mobile**; a web não consome Price IDs.
- **Diário de trader:** registo de trades com estatísticas.
- **Admin:** dashboard, geração de sinais, fecho de sinais, BOOMs, posts, canais,
  reports, mensagens, comprovativos, levantamentos, notificações, bulk actions, exports.

---

## 4. Backend (Supabase)

**Project ref:** `zwxplzdadgtiohnuotlu` (URL base `https://zwxplzdadgtiohnuotlu.supabase.co`).
⚠️ A versão anterior deste doc dizia `magic-market-insights-main` — está errado.

Postgres com **RLS em todas as tabelas**, Auth (email + Google OAuth + OTP WhatsApp),
Realtime, Storage, Edge Functions.

### Tabelas (25)
`signals` · `subscriptions` · `user_profiles` · `admins` · `admin_notifications` ·
`announcements` · `boom_hours` · `boom_times` · `boom_comments` · `boom_votes` · `posts` ·
`channels` · `messages` · `message_reactions` · `message_reports` · `conversations` ·
`conversation_members` · `whatsapp_subscriptions` · `whatsapp_otp` · `push_tokens` ·
`payment_requests` · `payment_receipts` · `withdrawal_requests`

### Edge Functions
⚠ Também duplicadas (ver dívida 8). A raiz tem 5 funções, `mobile/supabase/functions/` tem 6,
e **nenhuma das duas está completa**: o Stripe só existe na raiz, o `whatsapp-auth`,
`ai-support` e `send-notification` só no mobile. O que está deployed é a união das duas.

| Função | Onde | Papel |
|---|---|---|
| `close-signals` | ambas | Fecha `active` em `tp`/`sl`. A versão mobile marca `expired` o que não mexeu em 48h; a da raiz ainda marca `sl` |
| `generate-crypto-signals` | mobile | Motor de análise técnica + IA; é este que o cron chama |
| `generate-signal` | raiz | Variante mais antiga do motor |
| `stripe-checkout` · `stripe-webhook` | raiz | Checkout Session (USD/AOA) e sincronização de subscrições |
| `admin-manage` | ambas | CRUD admin com revalidação de email no servidor |
| `whatsapp-auth` · `ai-support` · `send-notification` | mobile | Login por WhatsApp, suporte por IA, push |

### Migrations
⚠ Também duplicadas (ver dívida 8). A raiz tem 20 (`20260112092032`–`20260922000000`); a
`mobile/supabase/migrations/` tem **40** e é a que reflecte o schema real. Só a árvore do
mobile tem `app_config`, `expires_at` em `signals`, `signal_outcomes`, `trade_journal`,
`store_products`, `ai_quota`, `capital_management` e os crons de geração e expiração.

### Storage (4 buckets, todos públicos)
`posts` · `comments-audio` · `payment-proofs` · `community`

### Pagamentos
- **Stripe:** 3 planos × USD/AOA, checkout por edge function, webhook a sincronizar.
- **Manual:** pedidos em Kwanzas → o utilizador carrega o comprovativo → o admin aprova
  em `WithdrawalsPanel` / `payment-proofs`.
- **Capital:** depósito à taxa fixa, com simulador de retorno e juros compostos na Banca.

---

## 5. App mobile (`mobile/`) — produto completo

**⚠️ A versão anterior deste doc dizia que o mobile era "template Expo, ainda não
convertido". Está errado e desatualizado.** O mobile tem **33 ecrãs**, 82 componentes,
34 hooks, lógica de domínio testada em `src/core/`, e passa typecheck e testes.

- **Stack:** Expo SDK 56 · React Native 0.85 · React 19 · Expo Router (typed routes,
  react compiler) · TanStack Query · Supabase JS · i18next · Reanimated 4 · expo-audio
  (microfone), expo-notifications, expo-image-picker, expo-secure-store, expo-localization,
  react-native-webview (TradingView), expo-share-intent.
- **Ecrãs:** dashboard/início, análises, sinal + gráfico, histórico, horários, banca,
  depósitos, diário, notificações, perfil, idioma, tema, suporte IA, definições de BOOMs,
  login + WhatsApp OTP, Google auth, admin, e a comunidade completa (canais, DM, loja,
  pesquisa, novo canal, novo DM, perfil público).
- **Navegação:** tabs (início, análises, histórico, horários, perfil) com stacks de
  comunidade e de sinal; `expo-router` com rotas tipadas.
- **Nativo:** notificações push, alarme BOOM recorrente com sync automático (`AlarmToggle`,
  `BoomAlarmAutoSync`), gravação de áudio, câmara rápida (`expo-image-picker`), glass
  effect, deep links (`expo-share-intent`, esquema `magictrader`).
- **Build:** `eas.json` com perfis development / preview / production,
  `projectId 112173d7-48e2-4d95-9c98-abd9f16be18a`, `bundleIdentifier com.magictrader.app`.
- **Testes:** `mobile/src/{app,components,core,lib}` — **11 suites, 103 testes, todos a passar**
  (com `npx jest`; ver dívida técnica abaixo).
- **Nota de convenção:** `mobile/AGENTS.md` manda ler
  `https://docs.expo.dev/versions/v56.0.0/` antes de escrever código — o Expo 56 é
  recente e a API muda.

---

## 6. Deploy e ambiente

- **Web:** Vercel (`vercel.json` com rewrite SPA). `.env` não é versionado.
- **Mobile:** EAS (`eas.json`, `appVersionSource: remote`, `autoIncrement`).

Variáveis (exemplos completos em `mobile/.env.example`):
- **Web (Vite):** apenas 5 chaves — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_ADMIN_EMAILS`, `VITE_AOA_PER_USD`, `VITE_FOREX_CALENDAR_KEY` (modelo em
  `.env.example` na raiz). A web **não** consome os Price IDs do Stripe: essa lista só
  existe no `mobile/.env.example`, para o checkout do mobile.
- **Edge Functions:** `PROJECT_URL`, `SERVICE_ROLE_KEY`, `ANON_KEY`, `ADMIN_EMAILS`,
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL`.
- **Mobile (Expo):** `EXPO_PUBLIC_*` com o mesmo conteúdo. **Nunca** `SERVICE_ROLE_KEY`
  no bundle do cliente.
- **Serviços externos:** Twelve Data (forex), Forex Calendar Pro (calendário económico),
  Binance (BTC).

---

## 7. Internacionalização (i18n)

14 locales em `web` e em `mobile` (pt fonte + 13 traduções). Números medidos, não estimados:

| | chaves em `pt` | chaves presentes | valores ainda iguais a `pt` |
|---|---|---|---|
| **Web** | 1383 | **1383 em todos os 13 idiomas (100%)** | 56 (ar) a 293 (es) → **78,8% a 95,9% traduzido** |
| **Mobile** | 1031 | 834 (nl) a 1015 (en) → **80,9% a 98,4%** | 52 (ar) a 199 (es) |

Duas leituras que importa não confundir: na web **nenhuma chave falta** — o que sobra são
valores que ainda estão em português (o pior caso é o espanhol, 293 chaves). No mobile
faltam mesmo chaves, e é isso que a onda M está a fechar.

### Ferramentas (`scripts/`)
O i18n não é editado à mão. O fluxo é: gerar listas de trabalho por idioma → um agente
traduz → uma ferramenta **valida e funde**.

| Script | O que faz |
|---|---|
| `make-i18n-todo.cjs` | Gera `<loc>.a.todo.json` / `.b.todo.json` (ondas A=superfície do cliente, B=admin) a partir das chaves que faltam em `pt.json` |
| `make-i18n-todo-m.cjs` | O mesmo para o **mobile**, com semente: chaves que já existem traduzidas na web entram pré-preenchidas |
| `merge-i18n.cjs` | **Valida e funde.** Rejeita: chave a mais, placeholder diferente, tradução vazia, JSON inválido, BOM. Aviso (não bloqueio) para valores ainda iguais ao português |
| `check-locales.cjs` · `check-duplicate-keys.cjs` · `prune-dead-keys.cjs` | Diagnóstico: JSON válido, chaves duplicadas, chaves mortas |
| `add-key.cjs` · `remove-key.cjs` | Alterar chaves nos 14 locales de uma vez |

```sh
node scripts/make-i18n-todo.cjs              # regenerar listas de trabalho
node scripts/merge-i18n.cjs --check          # validar tudo (diagnóstico)
node scripts/merge-i18n.cjs es.a             # fundir um idioma/onda
node scripts/merge-i18n.cjs --mobile es.m    # o mesmo, nos locales do mobile
```

`scripts/_i18n-work/` é gitignored — são ficheiros gerados e reconstruíveis.
⚠️ **Um placeholder perdido parte o i18next em runtime** (`{{count}}` aparece cru no ecrã).
É exactamente o que o merge valida.

### Onda M (i18n do mobile) — em curso
Traduzir as chaves do mobile que faltam ou que ainda estão em português, idioma a idioma,
fundindo com `merge-i18n.cjs --mobile <loc>.m`. Só se funde depois de `--check` passar.

---

## 8. Estado atual e dívida técnica

| Área | Estado |
|---|---|
| App web | Funcional — 32 rotas, gating, admin, comunidade, banca, pagamentos manuais |
| App mobile | **Funcional** — 33 ecrãs, push, áudio, câmaras, EAS configurado, checkout Stripe |
| Supabase | 25 tabelas com RLS, 4 buckets, **duas árvores de migrations** (ver dívida 8) |
| Pagamentos | Stripe no mobile; manual em Kwanzas na web e no mobile |
| Testes | 103 testes mobile, todos a passar (`npm test` em `mobile/`) |
| i18n | 14 locales nos dois apps; **onda M do mobile fechada** (13 idiomas, 3 562 chaves) |

### Dívida conhecida
1. **Sem CI de qualidade.** **Não há build, typecheck, lint ou testes em CI.** Um bug
   como a vírgula final em JSON só apareceu porque alguém olhou. O único workflow
   (`.github/workflows/close-signals.yml`) é redundante com o `pg_cron` da BD.
2. **`useSubscription.checkout()` na web é um stub:** faz `window.location.href = "/planos"`
   e não chama o Stripe — e nenhum ficheiro em `src/` chega a invocá-lo. Se a web
   precisar de checkout Stripe próprio, esse código ainda não existe.
3. **Bundle da web: 1,87 MB (600 kB gzip), sem code-splitting.** Aviso do Rollup em
   cada build; num plano de dados móveis isso paga-se.
4. **Cobertura de i18n desigual:** web com 56 a 293 valores por idioma ainda em português
   (es é o pior caso). **A onda M do mobile está fechada** — os 13 idiomas não-pt passam
   `merge-i18n.cjs --check` sem chaves em falta; o que resta são valores iguais ao
   português que são marcas e códigos legítimos (`Premium`, `WAT`, `GMT`, `R:R`, `SL`,
   `TP`, `EURUSD`, `WhatsApp`, `The Magic Trader`). A web continua por igualar.
5. **Drift no `mobile/src/lib/i18n/locales/en.json`:** tem 12 chaves que já não existem em
   `pt.json`. São inofensivas em runtime (chave morta), mas são ruído — e o merge recusa
   chaves a mais, por isso qualquer onda futura tem de as resolver.
6. **Documentação:** `RESUMO/01`–`04` descrevem o mobile como futuro — superado.
7. **Divergência web/mobile a vigiar:** os dois apps evoluem em paralelo e a documentação
   em `RESUMO/` já ficou atrás uma vez. Confirma o código antes de confiar nela.
8. **⚠️ Duas árvores `supabase/` divergentes — e a da raiz NÃO é a descartável.**
   A raiz tem 20 migrations (20260112 → 20260922) e 6 edge functions; `mobile/supabase/`
   tem 45 migrations (20260814 → 20261005) e 7 functions. **Nenhuma das duas é completa, e
   a do mobile é a incompleta.** Medido a 2026-10-02: existem **9 tabelas que só a raiz
   cria** — `boom_hours`, `boom_times`, `boom_votes`, `boom_comments`, `payment_requests`,
   `whatsapp_subscriptions`, `admins`, `posts`, `subscriptions` — e o mobile **nunca as
   cria em lado nenhum**. As migrations do mobile só lhes aplicam `create policy` e
   `enable RLS`, que é a assinatura de "a tabela já existe, a política é acrescentada".

   **Consequência: apagar a raiz, ou publicar só a árvore do mobile, destrói 9 tabelas de
   que a app depende** (`BoomCard`, `BoomHourCard`, `useBoomSocial`, `useSubscription`, o
   fluxo de pagamento manual, o painel de admin). O `mobile/supabase/` **não reconstrói
   uma base de dados a partir do zero** — precisa que alguém aplique a raiz primeiro.

   Isto inverte a recomendação que aqui estava escrita ("a do mobile é a autoritativa,
   decide e apaga a outra").Segue a ordem real das dependências: a raiz vai de
   20260112, o mobile só começa a 20260814, e há sobreposição entre 20260821–20260922 onde
   as duas escrevem no mesmo schema. **A resolução é fundir as 14 migrations só-da-raiz para
   dentro de `mobile/supabase/`, renumeradas, e só depois considerar a raiz descartável.**
   Isso exige uma base de dados de teste para verificar, que este repositório ainda não
   tem — daí a dívida ficar aberta em vez de ser feita às cegas.

   O que está deployed é a união das duas. Isto já causou um diagnóstico errado: a
   `close-signals` da raiz tinha a regra "48h → `sl`" e uma tabela de preços fictícios de
   2024 que fabricavam resultados, enquanto a versão em `mobile/` já usava `expired` e
   Twelve Data.
9. **⚠️ O cron de fecho de sinais nunca correu.** A cadeia existe e está agendada
   (`close-signals-every-30min` → `cron_close_signals()` → `call_edge_function()`), mas
   `call_edge_function()` lê a `service_role_key` de `public.app_config` e, se estiver
   vazia, faz `RAISE WARNING` + `RETURN` — o job conta como sucesso e não fecha nada. A
   `service_role_key` nunca foi inserida; a própria migration `20260819040000` documenta
   isso e só emite `WARNING`, que não se vê. **Não é bug de código.** Ver secção 9.
10. **Dívida de lint, medida em 2026-10-02.** O `npm run lint` da raiz dá **173
    problemas (140 erros, 33 avisos)** e o do mobile **50 (8 erros, 42 avisos)**. Os
    140 erros da raiz são quase uma só regra: **106 `@typescript-eslint/no-explicit-any`**,
    mais 23 `no-require-imports` e 11 `no-empty`. **Não são bugs** — `any` é perda de
    verificação de tipos, não comportamento errado, e vários `catch {}` são falhas
    deliberadamente silenciosas (`sounds.ts`, `boomPrefs.ts`). Estão espalhados por ~72
    ficheiros e a maioria é código anterior à auth. Corrigi-los significa escrever
    contratos de tipos à mão em admin, pagamentos e hooks com quase **nenhuma cobertura
    de testes** — daí não ter sido feito numa passada cega.

    O que **está** verde e deve continuar: `deno check` nas 7 edge functions (0 erros),
    `npx tsc --noEmit` na raiz e no mobile, e os 103 testes do mobile. Como não há CI
    (dívida 1), vale correr os três à mão antes de dar por fechado um bloco de trabalho.

---

## 9. Correr o fecho de sinais (acção manual, única)

O cron está escrito e agendado. Falta-lhe um único valor na base de dados. Corre isto
uma vez no **SQL Editor do Supabase**:

```sql
INSERT INTO public.app_config (key, value)
VALUES ('service_role_key', '<A_TUA_SERVICE_ROLE_KEY>')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

O `supabase_url` já está preenchido (é público). A `service_role_key` é a mesma que a edge
function já lê de `Deno.env` — a que está em **Project Settings → API**. Fica na base de
dados, com o mesmo nível de confiança que o resto do schema, e nunca passa por um
ficheiro do git.

Depois de correr, confirma que está a funcionar:

```sql
-- deve devolver uma linha com status 'succeeded' e data recente
SELECT jobname, status, start_time FROM cron.job_run_details
WHERE jobname = 'close-signals-every-30min' ORDER BY start_time DESC LIMIT 5;
```

Se `status` for `failed`, o erro está em `return_message` da mesma linha. Se o job
existir mas nunca tiver corrido, o `pg_cron` não está activo — verifica em
**Database → Extensions**.

Sem este `INSERT`, a landing mostra `Taxa de Acerto —` e `0 sinais analisados`
permanentemente, porque nenhum sinal chega a `tp` nem a `sl`.