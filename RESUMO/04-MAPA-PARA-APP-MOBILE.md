# 04 — Mapa para App Mobile

Guia para transformar The Magic Trader numa aplicação móvel (Android/iOS).

---

## 4.1 Recomendação de tecnologia

**Opção recomendada: React Native + Expo (SDK 54+, JS/TS).**

Porquê:
- O frontend já é React/TypeScript → reutiliza lógica (hooks, cálculo de pips,
  formatação, gating free/premium) quase 1:1.
- `supabase-js` funciona em React Native com `expo-sqlite`/`AsyncStorage` para cache.
- `@supabase/auth-ui-react` e OAuth Google via `expo-auth-session`.
- Stripe: `@stripe/stripe-react-native` (Checkout) — mesmo `priceId`/webhook já existente.
- Notificações: Expo Push Notifications (substitui o Notification API do browser).
- Gráficos: `react-native-webview` com o widget TradingView (reutiliza `TradingViewChart`).

Alternativas: **Flutter** (reescreve tudo em Dart — mais trabalho) ou **PWA/TWA**
(mais rápido, mas menos acesso nativo: push, pagamentos, gravação de áudio).

> Decisão pendente de validação com o utilizador (opção 4.1).

---

## 4.2 Mapa ecrãs web → mobile

| Web (rota) | Ecrã mobile | Tab bar / stack |
|---|---|---|
| `/` (landing) | Welcome/Onboarding | Stack (sem tab) |
| `/analises` | **Análises** (painel + gráfico) | Tab 1 |
| `/analises/:id` | Detalhe do Sinal | Push (stack) |
| `/historico` | Histórico + stats | Tab 2 |
| `/horarios` | Hora do Boom + alarmes | Tab 3 |
| `/comunidade` | Comunidade (booms, votos, comentários) | Tab 4 |
| `/planos` | Planos / Assinar | Modal/Stack |
| `/login` `/registro` `/recuperar-senha` | Auth stack | Stack |
| `/admin` | Gestão (só admin) | Escondido / por permissão |
| `/termos` `/privacidade` `/aviso-risco` | Páginas legais | Stack |
| `*` | 404 | — |

**Sugestão de navegação (Expo Router):**
```
- (auth)      login, registro, recuperar-senha
- (tabs)      analises, historico, horarios, comunidade
- (stack)     detalhe-sinal, planos, admin, legal
```

---

## 4.3 Reutilização de lógica (extrair para um package/workspace)

Ideal criar uma pasta `packages/core` (npm workspace) com:
- **Domínio sinais:** tipos (`Database` do Supabase), cálculo de pips, multiplicadores
  por par, cor/estado de confiança, gating free/premium (pares e timeframes).
- **Domínio booms:** status `upcoming/live/expired`, countdown, volatilidade.
- **Domínio votos/comentários:** contagem, % por lado, formatação de tempo relativo
  ("há 5 min").
- **Queries React Query:** `useSignals`, `useHistory`, `useSubscription`, `useLivePrices`.
- **Formatação:** moeda (USD/AOA), datas `pt-PT`, números.

O frontend web e o app consumiriam o mesmo pacote → regras de negócio nunca divergem.

---

## 4.4 Autenticação mobile

| Ação | Implementação |
|---|---|
| Email/senha | `supabase.auth.signInWithPassword` / `signUp` / `resetPasswordForEmail` |
| Google OAuth | `expo-auth-session` + `supabase.auth.signInWithOAuth` (deep link) |
| Persistir sessão | `@react-native-async-storage/async-storage` como `AuthStorage` |
| Admin | mesmo check `isAdminEmail` + edge function revalida |

Deep links necessários: `magictrader://` (Android intent-filter / iOS URL scheme) e
URL Scheme universal para `stripe` e `google`.

---

## 4.5 Pagamentos (Stripe)

- **Backend já pronto:** `stripe-checkout` + `stripe-webhook` não mudam.
- **Mobile:** usar **Stripe Payment Sheet** (`@stripe/stripe-react-native`):
  - Criar PaymentIntent/SetupIntent no lado do servidor (nova edge function opcional)
    OU reutilizar Checkout Sessions abrindo o link num WebView.
  - `client_reference_id` = `user_id` para ligar a subscrição (idêntico ao web).
- Moedas: manter os dois preços (`VITE_STRIPE_PRICE_USD` / `VITE_STRIPE_PRICE_AOA`) com
  seletor USD/Kz no ecrã Planos.
- Mostrar estado premium a partir de `subscriptions.status = 'active'` (via `useSubscription`).

---

## 4.6 Notificações (substitui alarmes/alertas)

| Funcionalidade web | Mobile |
|---|---|
| Alarmes "Hora do Boom" (localStorage + Notification) | **Expo Notifications** (agendamento local 5 min antes, permissão pedida no onboarding) |
| Alertas Premium (WhatsApp/Telegram/Email) | **Push remoto** via FCM/APNs + edge function (Supabase Realtime → notificação local) |
| Sinais novos / BOOM ativo | Trigger por `postgres_changes` → notificação local in-app |

Config: `expo-notifications`, canal "booms" (Android), pedido de permissão contextual.

---

## 4.7 Gráficos TradingView

- Manter o mesmo widget embebido numa **WebView** (`react-native-webview`) com HTML
  mínimo — reaproveita `TradingViewChart.tsx`.
- Opção mais nativa: `react-native-tradingview` ou WebView de `tv.js`.
- Recomendado manter WebView (menor risco, mesmo visual dark + locale pt).

---

## 4.8 Áudio (comunidade)

- **Gravação:** `expo-av` (AudioRecording) → gerar `.m4a`/`.webm` → upload para bucket
  `comments-audio` (mesma API Supabase Storage).
- **Reprodução:** player nativo (`expo-av`/`expo-audio`) para áudio de booms/comentários.

---

## 4.9 Preços ao vivo

- Reutilizar `useLivePrices`: Frankfurter (forex) + CoinGecko (BTC).
- Em mobile, considerar `expo-background-fetch` + `expo-notifications` para atualizar
  preço/premium em segundo plano (opcional).

---

## 4.10 Variáveis de ambiente (mobile)

| Variável | Uso |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Cliente Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Cliente Supabase |
| `EXPO_PUBLIC_ADMIN_EMAILS` | isAdminEmail |
| `EXPO_PUBLIC_STRIPE_PRICE_USD` | preço USD |
| `EXPO_PUBLIC_STRIPE_PRICE_AOA` | preço Kz |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | mantêm-se no servidor (functions) |
| `SERVICE_ROLE_KEY` | mantém-se no servidor |

> Regra de segurança: **nunca** colocar `SERVICE_ROLE_KEY` no app.

---

## 4.11 Checklist de portabilidade (pronto a executar)

- [ ] Decidir framework (Expo recomendado) — validar com utilizador.
- [ ] `npx create-expo-app` + workspace `packages/core` com lógica partilhada.
- [ ] Mapear navegação (Expo Router): auth → tabs (4) → stacks.
- [ ] Migrar hooks de dados para React Query + Supabase client (AsyncStorage).
- [ ] Ecrãs: Análises (painel + gráfico WebView), Detalhe, Histórico, Horários, Comunidade.
- [ ] Auth (email/Google) + deep links + persistência de sessão.
- [ ] Stripe Payment Sheet (reutiliza webhook existente).
- [ ] Push local para alarmes de booms + notificações de sinais.
- [ ] Gravação/reprodução de áudio (expo-av).
- [ ] Testes em Android (APK) e iOS (TestFlight), Vercel não afeta o app.
