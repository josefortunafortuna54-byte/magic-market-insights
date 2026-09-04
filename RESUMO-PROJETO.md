# RESUMO DO PROJETO — The Magic Trader

> Documento único de resumo do projeto. Complementa os ficheiros detalhados em `RESUMO/`.

---

## 1. O que é o projeto

**The Magic Trader** — plataforma de **análise técnica de Forex com sinais gerados por IA**
(carácter educacional). Gera sinais BUY/SELL/AGUARDAR por ativo, com entrada, Stop Loss,
Take Profit, nível de confiança e justificações técnicas (RSI, EMA, MACD, Bollinger,
Estocástico, Ichimoku, Fibonacci, ADX, Suportes/Resistências).

- **Slogan:** "Análise inteligente. Entradas estratégicas."
- **Idioma:** Português (PT-PT), fuso WAT (UTC+1, Angola).
- **Marca visual:** tema escuro, gradientes verdes (primário) + dourado (premium),
  brilho "glow", cartões de vidro, fontes Space Grotesk + Inter.
- **URL produção (referências):** `https://magic-market-insights.vercel.app`

### Modelo de negócio (Freemium)
| | Grátis | Premium ($29.99/mês ou 20.000 Kz/mês) |
|---|---|---|
| Pares | 3 (EUR/USD, GBP/USD, USD/JPY) | 8 pares Forex |
| Timeframes | só M15 | M15 + H1 + H4 |
| Indicadores | RSI/EMA/MACD básico | + Bollinger, Estocástico |
| Histórico | limitado | completo com pips |
| Alertas | — | em tempo real (WhatsApp/Telegram/Email) |

---

## 2. Estrutura do repositório

```
TMT/
├── src/                      # Aplicação web (React SPA)
│   ├── App.tsx               # Rotas (15 rotas, React Router)
│   ├── pages/                # 15 páginas
│   ├── components/
│   │   ├── layout/           # Navbar, Footer, Layout
│   │   ├── signals/          # SignalCard, TradingViewChart
│   │   ├── auth/             # AdminGuard
│   │   ├── admin/            # 5 tabs do painel admin
│   │   └── ui/               # ~40 componentes shadcn/ui (Radix)
│   ├── hooks/                # useSignals, useHistory, useSubscription,
│   │                         # useLivePrices, use-mobile, use-toast
│   ├── lib/                  # supabaseClient, admin, adminApi, utils
│   ├── data/                 # mockSignals (não usado nas páginas reais)
│   └── integrations/supabase # types.ts (tipos Database)
├── supabase/
│   ├── functions/            # 5 Edge Functions (Deno)
│   └── migrations/           # 6 ficheiros SQL
├── mobile/                   # App mobile (Expo — ainda template base)
├── public/                   # logo.png, magic-bg.svg, robots.txt
└── RESUMO/                   # Documentação detalhada existente
```

---

## 3. Aplicação web (frontend)

**Stack:** React 18.3 · TypeScript 5.8 · Vite 5.4 · Tailwind CSS 3.4 · shadcn/ui (Radix)
· Framer Motion · TanStack React Query 5 · React Router DOM 6 · Recharts · sonner ·
react-hook-form + zod · next-themes.

### Rotas / Páginas
| Rota | Página | Acesso |
|---|---|---|
| `/` | Landing (hero, stats, features, sinais em destaque, CTA) | Público |
| `/analises` | Painel de Sinais (gráfico TradingView, filtros, gating free/premium) | Público |
| `/analises/:id` | Detalhe do Sinal (níveis, RR, análise técnica, gráfico) | Público |
| `/historico` | Histórico de sinais fechados + stats (win rate, pips) | Público |
| `/planos` | Planos / subscrição Stripe (seletor USD/Kz) | Público (checkout exige login) |
| `/login`, `/registro`, `/recuperar-senha` | Auth (email + Google OAuth) | Público |
| `/horarios` | Hora do Boom (horários, volatilidade, alarmes com notificação) | Público |
| `/comunidade` | Boom Times (countdown, votos BUY/SELL, comentários texto/áudio) | Público (ações exigem login) |
| `/admin` | Painel Admin | só emails em `VITE_ADMIN_EMAILS` |
| `/termos`, `/privacidade`, `/aviso-risco` | Páginas legais | Público |
| `*` | 404 | — |

### Funcionalidades principais
- **Sinais:** cards com confiança (barra), níveis entry/SL/TP em pips, razões técnicas,
  RR 1:x, status (Ativo / ✓TP / ✗SL), tipos BUY/SELL/AGUARDAR.
- **Gating free/premium:** não-premium vê lock dourado em H1/H4 e pares extra.
- **Gráfico TradingView** embebido (widget advanced-chart, dark, locale pt).
- **Preços ao vivo:** Frankfurter (forex) + CoinGecko (BTC) com variação %.
- **Hora do Boom:** janelas horárias com alarmes locais (localStorage + Notification API).
- **Comunidade:** eventos Boom com countdown, estado live/expired, votação com upsert
  (1 voto por utilizador), comentários com gravação de áudio via microfone (MediaRecorder
  → webm → bucket `comments-audio`).
- **Realtime:** `postgres_changes` para sinais, booms, votos, comentários.
- **Admin:** stats, gerar sinais, fechar sinais (TP/SL), CRUD de sinais/horários/posts/
  booms/utilizadores.

---

## 4. Backend (Supabase)

**Projeto:** `magic-market-insights-main`. Serviços: Postgres (RLS em todas as tabelas),
Auth (email + Google OAuth), Realtime, Storage, Edge Functions.

### Tabelas principais
- **`signals`** — símbolo, timeframe (M15/H1/H4), tipo, entry, SL, TP, confiança, status,
  risk_reward, reasons (jsonb). Leitura pública; escrita só via Service Role.
- **`subscriptions`** — Stripe subscription; premium = `status = 'active'`.
- **`whatsapp_subscriptions`** — números de telefone para alertas premium.
- **`boom_hours`** — horários fixos "Hora do Boom".
- **`posts`** — posts da comunidade (admin).
- **`boom_times`** — eventos Boom pontuais (data/hora, confiança, resultado, imagem, áudio).
- **`boom_comments`** — comentários (texto e/ou áudio).
- **`boom_votes`** — votações BUY/SELL, `UNIQUE(boom_id, user_id)`.
- **RPC `get_all_users`** — lista de utilizadores para o admin.

### Edge Functions (Deno)
| Função | Papel |
|---|---|
| `generate-signal` | Motor de análise técnica + IA (10 símbolos, gera sinais reais) |
| `close-signals` | Cron 30/30min; fecha sinais `active` em `tp`/`sl` |
| `stripe-checkout` | Cria Checkout Session Stripe (subscription, USD/Kz) |
| `stripe-webhook` | Sincroniza subscrições (checkout.session.completed, customer.subscription.*) |
| `admin-manage` | CRUD admin com revalidação de email no servidor |

### Migrations (6)
Criação do schema, fix RLS `whatsapp_subscriptions`, cron `close-signals`,
RLS `signals` insert/update, tabelas em falta, tightening RLS Service Role.

### Storage
- `posts` (imagens/áudio de posts) · `comments-audio` (gravações webm).

---

## 5. App mobile (`mobile/`)

- **Estado atual:** template base do Expo (SDK 56, React Native 0.85, React 19, Expo Router)
  — **ainda NÃO convertido**; `src/app` tem apenas o ecrã de exemplo "Welcome to Expo".
- **Plano (documentado em `RESUMO/04-MAPA-PARA-APP-MOBILE.md`):**
  React Native + Expo; tabs (Análises, Histórico, Horários, Comunidade); reutilizar lógica
  web (hooks, cálculo de pips, gating); Supabase + AsyncStorage; Google OAuth via
  `expo-auth-session`; Stripe Payment Sheet; Expo Notifications (substitui alarmes);
  WebView TradingView; gravação áudio com `expo-av`.

---

## 6. Deploy e variáveis de ambiente

- **Web:** Vercel (`vercel.json` com rewrite SPA → `index.html`).
- **Não existem `.env` no repositório** — credenciais vivem na plataforma.

**Frontend (Vite):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_EMAILS`,
`VITE_STRIPE_PRICE_USD`, `VITE_STRIPE_PRICE_AOA`.

**Edge Functions:** `PROJECT_URL`, `SERVICE_ROLE_KEY`, `ANON_KEY`, `ADMIN_EMAILS`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL`.

**Mobile (futuro):** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
`EXPO_PUBLIC_ADMIN_EMAILS`, `EXPO_PUBLIC_STRIPE_PRICE_USD/AOA`. **Nunca** colocar
`SERVICE_ROLE_KEY` no app.

---

## 7. Estado atual e próximos passos

| Área | Estado |
|---|---|
| Web app | Funcional (todas as páginas e gating implementados) |
| Backend Supabase | Funcional (schema, RLS, functions, cron, webhooks) |
| Pagamentos Stripe | Integrados (checkout + webhook) |
| App mobile | Apenas template — conversão por fazer |
| Documentação | `RESUMO/` (4 ficheiros detalhados) + este resumo |

**Próximo passo principal:** converter a web em app mobile (Expo), seguindo o mapa em
`RESUMO/04-MAPA-PARA-APP-MOBILE.md`.
