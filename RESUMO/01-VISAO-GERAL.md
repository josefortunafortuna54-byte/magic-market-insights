# 01 — Visão Geral

## 1.1 O que é

**The Magic Trader** é uma plataforma web de **análise técnica do mercado Forex com
sinais gerados por IA** (carácter educacional). Gera sinais de compra/venda
(BUY/SELL/AGUARDAR) por ativo, com pontos de entrada, Stop Loss, Take Profit,
nível de confiança e justificações técnicas (RSI, EMA, MACD, Bollinger, Estocástico,
Ichimoku, Fibonacci, ADX, Suportes/Resistências).

Além dos sinais, oferece:
- Histórico de desempenho (win rate, pips, TP/SL).
- **"Hora do Boom"**: horários diários de alta volatilidade, com alarmes/notificações.
- **Comunidade**: "Boom Times" com contagem decrescente, votação BUY/SELL da
  comunidade, comentários de texto e áudio (gravação via microfone), em tempo real.
- **Assinatura Premium** paga via Stripe com dois preços (USD e Kz).
- **Painel Admin** para gestão de sinais, horários, posts, booms e utilizadores.

## 1.2 Identidade

- **Nome:** The Magic Trader
- **Slogan:** "Análise inteligente. Entradas estratégicas."
- **Marca visual:** tema escuro com gradientes verde (primário), dourado (premium/accent),
  brilho "glow", cartões de vidro (`glass-card`), fonte display Space Grotesk + Inter.
- **Logo:** `public/logo.png` (com efeito `logo-glow`).
- **URL produção (referências):** `https://magic-market-insights.vercel.app`
  (verificado no `index.html` / `stripe-checkout`).

## 1.3 Stack tecnológica (web atual)

**Frontend (SPA):**
- React 18.3 + TypeScript 5.8
- Vite 5.4 (dev server porta 8080, build → `dist/`)
- React Router DOM 6 (SPA, 14 rotas)
- Tailwind CSS 3.4 + shadcn/ui (Radix UI primitives) + `tailwindcss-animate`
- Framer Motion 12 (animações)
- TanStack React Query 5 (caching de dados)
- Recharts, embla-carousel, sonner (toasts), lucide-react (ícones)
- react-hook-form + zod (formulários; usado nos componentes UI)
- next-themes (suporte tema)

**Backend (Supabase):**
- Postgres (RLS ativado em todas as tabelas)
- Auth: email/password + Google OAuth
- Realtime (postgres_changes) para sinais, booms, comentários, votos
- Storage buckets: `posts` e `comments-audio`
- Edge Functions (Deno):
  - `generate-signal` — motor de análise técnica + IA
  - `close-signals` — fecha sinais ativos (TP/SL) por preço de mercado
  - `stripe-checkout` — cria sessão de checkout Stripe
  - `stripe-webhook` — sincroniza subscrições
  - `admin-manage` — CRUD admin com verificação de email

**Pagamentos:** Stripe (Checkout Sessions, modo subscrição, cartão).

**Deploy:** Vercel (`vercel.json` com rewrites SPA → `index.html`).

## 1.4 Estrutura de diretórios (relevante)

```
src/
  App.tsx                  # Rotas (BrowserRouter)
  main.tsx                 # Bootstrap
  index.css                # Tema (CSS vars, glass-card, gradientes)
  components/
    layout/  Navbar.tsx, Footer.tsx, Layout.tsx
    signals/ SignalCard.tsx, TradingViewChart.tsx
    auth/    AdminGuard.tsx
    admin/   AdminSignalsTab, AdminBoomHoursTab, AdminComunidadeTab,
             AdminBoomTimesTab, AdminUsersTab
    ui/      ~40 componentes shadcn/ui (button, card, table, dialog, ...)
  hooks/
    useSignals.ts          # Lista de sinais (React Query + Realtime)
    useHistory.ts          # Histórico fechado + estatísticas
    useSubscription.ts     # Utilizador + premium + checkout
    useLivePrices.ts       # Preços em tempo real (Frankfurter + CoinGecko)
  lib/
    supabaseClient.ts      # Cliente Supabase
    admin.ts               # isAdminEmail()
    adminApi.ts            # Wrapper das Edge Functions admin
  pages/
    Index, Analises, SignalDetail, Historico, Planos, Login, Registro,
    RecuperarSenha, Horarios, Comunidade, Admin, Termos, Privacidade,
    AvisoRisco, NotFound
  data/mockSignals.ts      # Dados fictícios (não usados nas páginas reais)
supabase/
  functions/<5 edge functions>
  migrations/<6 ficheiros SQL>
```

## 1.5 Rotas da aplicação

| Rota | Página | Acesso |
|---|---|---|
| `/` | Index (landing) | Público |
| `/analises` | Painel de Sinais + gráfico TradingView | Público (com gating free/premium) |
| `/analises/:id` | Detalhe do Sinal | Público |
| `/historico` | Histórico de sinais fechados + stats | Público |
| `/planos` | Planos / subscrição Stripe | Público (checkout exige login) |
| `/login` | Login (email + Google) | Público |
| `/registro` | Registro (email + Google) | Público |
| `/recuperar-senha` | Recuperação de senha | Público |
| `/horarios` | Hora do Boom (horários + alarmes) | Público |
| `/comunidade` | Boom Times + votação + comentários | Público (ações exigem login) |
| `/admin` | Painel Admin | Email na lista `VITE_ADMIN_EMAILS` |
| `/termos`, `/privacidade`, `/aviso-risco` | Páginas legais | Público |
| `*` | 404 | — |

## 1.6 Variáveis de ambiente necessárias

**Frontend (Vite):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAILS` (lista separada por vírgulas de emails admin)
- `VITE_STRIPE_PRICE_USD`
- `VITE_STRIPE_PRICE_AOA`

**Edge Functions:**
- `PROJECT_URL` / `SUPABASE_URL`
- `SERVICE_ROLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `ANON_KEY` / `SUPABASE_ANON_KEY`
- `ADMIN_EMAILS`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SITE_URL` (default `https://magic-market-insights.vercel.app`)

> ⚠️ Não existem ficheiros `.env` no repositório — as credenciais vivem na
> plataforma (Vercel/Supabase).
