# 02 — Funcionalidades por Página

> Nota de idioma: a app usa Português europeu (PT-PT), datas `pt-PT`, fuso WAT (UTC+1, Angola).

---

## 2.1 Layout comum

### Navbar (`components/layout/Navbar.tsx`)
- **Fixa** no topo, com blur e borda gradiente (`navbar-border`).
- Logo + nome (escondido em mobile).
- Links desktop: Home, Análises, Histórico, Planos, Horários, Comunidade.
- Zona de autenticação:
  - Não autenticado → botões "Entrar" e "Criar Conta".
  - Autenticado → avatar com inicial/foto, nome, badge **PRO** se premium;
    menu dropdown com email, estado premium, "Upgrade Premium" (se não for) e "Sair".
- **Mobile:** hambúrguer abre menu em acordeão com os mesmos links + ações de conta.
- Estado premium obtido via `subscriptions.status = 'active'`.

### Footer (`components/layout/Footer.tsx`)
- Barra de **Aviso de Risco** (destaque amarelo) sempre visível.
- Colunas: marca + descrição; Navegação (Home/Análises/Histórico/Planos); Legal
  (Termos, Privacidade, Aviso de Risco).
- Copyright dinâmico.

### Layout (`Layout.tsx`)
- `Navbar` + `main` (margin-top 20) + `Footer` (opcional `noFooter`).

---

## 2.2 Home — `/` (`pages/Index.tsx`)

Landing page com animações Framer Motion e background `magic-bg.svg`:

1. **Hero (90vh):**
   - Badge animado "Sinais ao Vivo — Análise Inteligente de Forex" (ponto pulsante).
   - Logo com glow, H1 "Análise inteligente. Entradas estratégicas."
   - Sub-texto: RSI, EMAs, MACD e Bollinger Bands.
   - CTAs: "Ver Análises ao Vivo" (`/analises`) e "Conhecer Planos" (`/planos`).
   - **Stats dinâmicos** (dados reais dos hooks):
     - Taxa de Acerto (win rate do histórico)
     - RR Médio (média de risk/reward dos sinais ativos)
     - 24/7 Monitoramento
     - Pares Forex (nº de pares distintos ativos)
2. **Features:** 4 cartões — Análise Técnica Avançada, Inteligência Artificial,
   Gestão de Risco (RR mínimo 1:2), Plano Premium.
3. **Sinais em Destaque:** primeiros 3 sinais `active` (≠ AGUARDAR) via `SignalCard`
   (skeleton em loading, fallback se vazio). Link "Ver Todos".
4. **Como Funciona:** 3 passos — Criar Conta → Receber Análises → Estudar o Mercado.
5. **CTA final:** "Pronto para elevar sua análise?" → `/registro` e `/planos`.

---

## 2.3 Painel de Sinais — `/analises` (`pages/Analises.tsx`)

**A página mais rica do produto.**

- **Barra de controlo:**
  - Título "Painel de Sinais" + spinner quando a carregar.
  - Preço do par selecionado em tempo real (Frankfurter/CoinGecko), com variação % e seta
    (▲/▼/–) e botão "TradingView" (abre gráfico no site externo).
  - Botões de pares (só pares visíveis conforme plano) com variação % ao lado;
    botão "+5 pares Premium" (lock dourado) para não-premium.
- **Gráfico TradingView embebido** (`TradingViewChart.tsx`):
  - Widget advanced-chart, tema escuro, locale `pt`, símbolo `FX:<PAR>` (ou `COINBASE:BTCUSD`).
  - Estudos: SMA, RSI, MACD, Bollinger Bands, Stochastic.
  - Intervalo mapeado: M15→15, H1→60, H4→240.
- **Filtros:**
  - Timeframe: M15 / H1 / H4 — **H1 e H4 bloqueados para não-premium** (lock + `PremiumLock`).
  - Tipo: BUY / SELL / AGUARDAR.
  - Contador "X sinais ativos" + botão refresh.
- **Gating Free/Premium (regra central de negócio):**
  - **FREE:** só `EUR/USD, GBP/USD, USD/JPY` e timeframe `M15`.
  - **PREMIUM:** todos os pares e timeframes (M15, H1, H4).
  - Não-premium vê `PremiumLock` (card com cadeado dourado → link `/planos`).
  - Utilizador logado não-premium vê banner "Estás a ver apenas sinais M15 de 3 pares".
  - Visitante não-logado vê banner "Cria uma conta para aceder a mais sinais".
- **Grid de `SignalCard`** (ver 2.4).

---

## 2.4 Card de Sinal (`components/signals/SignalCard.tsx`)

Estrutura do card:
- Header: par (bold), badge timeframe, badge status (✓ TP / ✗ SL / Ativo),
  badge de tipo colorido (BUY=verde, SELL=vermelho, AGUARDAR=amarelo).
- **Confiança:** barra de progresso com cor (≥80 verde, ≥60 amarelo, senão cinza).
- **Níveis:** Entrada / SL / TP em `mono`, com pips (ex.: `12.3p`).
- **Risco/Retorno** (1:x) — verde se ≥2, amarelo caso contrário.
- **Análise Técnica:** até 3 razões numeradas (verde/vermelho conforme bullish/bearish
  por palavras-chave "bullish/sobrevenda/acima" vs "bearish/sobrecompra/abaixo").
- Link "Ver Análise Completa" → `/analises/:id`.

**Tipos:** `BUY | SELL | AGUARDAR`; status `active | pending | tp | sl`.

**Cálculo de pips** (usado em vários sítios):
- JPY → ×100; XAU → ×100; BTC → ×1; resto → ×10000.

---

## 2.5 Detalhe do Sinal — `/analises/:id` (`pages/SignalDetail.tsx`)

Busca o sinal por ID no Supabase e formata (normaliza símbolo, timeframe, tipo).

- Voltar às Análises.
- Header: par + badge tipo + badge status (✓ TP / ✗ SL / ● Ativo) + timestamp.
- Confiança à direita (grande).
- **4 stat cards:** Stop Loss (pips), Entrada (destaque), Take Profit (pips),
  Risco/Retorno com avaliação (≥2 "Excelente", ≥1.5 "Bom", senão "Baixo").
- Gráfico TradingView (480px).
- **Análise Técnica:** lista numerada de razões.
- **Disclaimer** de aviso de risco (amarelo).
- Erro/loading com estados dedicados.

---

## 2.6 Histórico — `/historico` (`pages/Historico.tsx`)

Mostra apenas sinais fechados (`status IN ('tp','sl')`, até 200).

- **Stats cards:** Total de Sinais, Take Profit, Stop Loss, Taxa de Acerto
  (verde ≥60%, amarelo <60%).
- **Total de Pips:** somatório (+ verde / − vermelho).
- **Tabela:** Par, TF, Tipo, Confiança (barra), Entrada, SL, TP, Resultado (✓ TP/✗ SL),
  Pips (+/-), Data (`pt-PT`).
- Estados: loading, vazio ("Sem histórico ainda").

**Cálculo:** pips TP = |tp − entry| × multiplicador; pips SL = −|sl − entry| × multiplicador.

---

## 2.7 Planos / Subscrição — `/planos` (`pages/Planos.tsx`)

- Mensagens de sucesso/cancelamento via query params `?success=true` / `?canceled=true`.
- **Seletor de moeda:** USD ($) ou AOA (Kz).
  - Premium: **$29.99/mês** ou **20.000 Kz/mês**.
  - Preço IDs vindos de `VITE_STRIPE_PRICE_USD` / `VITE_STRIPE_PRICE_AOA`.
- **Plano Gratuito (US$0):** 3 pares (EUR/USD, GBP/USD, USD/JPY), só M15,
  RSI/EMA/MACD básico. Sem H1/H4, sem 8 pares, sem histórico completo, sem alertas.
- **Plano Premium (destaque "Mais Popular", badge dourado):** 8 pares Forex,
  M15+H1+H4, RSI/EMA/MACD/Bollinger/Estocástico, histórico completo com pips,
  alertas em tempo real, suporte prioritário, acesso antecipado.
- Botão "Assinar Premium" → `checkout(priceId, currency)`:
  - Sem sessão → redireciona `/login`.
  - Com sessão → chama `stripe-checkout` e redireciona para URL do Stripe.
  - `?success=true` → confirma subscrição (banner verde).
- **Alertas Premium:** cards WhatsApp, Telegram, Email.
- Se já é premium → mostra "✓ Plano Ativo".

---

## 2.8 Autenticação

### Login — `/login`
- **Google OAuth** (`signInWithOAuth`, redirect → `/analises`).
- Email + senha (`signInWithPassword`), "Lembrar-me" (localStorage), mostrar/ocultar senha.
- Link "Esqueceu a senha?" → `/recuperar-senha`.
- Erros tratados em PT ("Email ou senha incorretos.").

### Registro — `/registro`
- Google OAuth OU email + senha (`signUp`, senha mín. 6, redirect → `/analises`).
- Sucesso → ecrã "Conta criada! Verifica o teu email de confirmação".

### Recuperar Senha — `/recuperar-senha`
- `resetPasswordForEmail` (redirect → `/login`). Ecrã de sucesso.

---

## 2.9 Hora do Boom — `/horarios` (`pages/Horarios.tsx`)

Lista de janelas horárias (`boom_hours`, só `is_active = true`) ordenadas por hora WAT.

- **Relógio atual** (Angola WAT) e GMT em tempo real.
- Cada item:
  - Hora de início (grande), badges "● Agora" (se ativo) / "Expirado".
  - Pares (mono, verde), badge opcional, dias, GMT, descrição.
  - **Volatilidade 1–5** (pontos).
  - **Toggle de alarme** (desativado se expirado).
- **Alarmes:**
  - Persistidos em `localStorage` (`boom_alarms`).
  - Notificação do browser 5 min antes do início (requer permissão `Notification`).
  - Se permissão negada → aviso "Notificações bloqueadas".
- Dica final "Ativa o alarme para receberes notificação 5 minutos antes".

**Estado por hora:** compara hora WAT atual com intervalo → `active | upcoming | expired`.

---

## 2.10 Comunidade — `/comunidade` (`pages/Comunidade.tsx`)

> Baseada na tabela `boom_times` (eventos "Boom" pontuais, não confundir com `boom_hours`).

**Estrutura (feed vertical):**
- Header com contador "X AO VIVO" (pulsante).
- Filtros: Todos / 🚨 Ao Vivo / ⏳ Próximos / ✓ Histórico.
- Realtime: subscreve `boom_times`, `boom_votes` e `boom_comments`
  (Realtime + polling de estado a cada 10s).

**BoomCard:**
- Status badge: Próximo (amarelo) / 🚨 AO VIVO (vermelho pulsante) / Expirado (cinza).
  - "live" = começa em ≤15 min; "expired" = já passou.
- Imagem da análise (cover) com gradiente.
- Par + confiança %, data/hora WAT.
- **Countdown** `HH:MM:SS` (fica vermelho/pulsante <5 min; "🚨 BOOM ATIVO" quando live).
- Resultado (se expirado): ✅ BUY / ❌ SELL + "% dos traders acertaram".
- **Áudio da equipa** (player custom com play/pause/progresso).
- **Votação BUY/SELL:**
  - Requer login; vota/desvota (upsert com conflito `boom_id,user_id`).
  - Contagens por botão + barra de % verde/vermelha animada + total de votos.
  - Feedback "✓ Votaste BUY/SELL!".
- **Comentários (expandíveis):**
  - Texto e/ou **áudio gravado via microfone** (MediaRecorder → webm →
    upload para bucket `comments-audio`).
  - Avatar, nome, coroa se premium, "há Xmin/h/d".
  - Comentários em tempo real.

---

## 2.11 Painel Admin — `/admin` (`pages/Admin.tsx` + `AdminGuard`)

**Proteção:** apenas utilizadores cujo email ∈ `VITE_ADMIN_EMAILS` (frontend) e
a Edge Function `admin-manage` revalida no servidor.

- **Stats:** Total / Ativos / TP / SL / Utilizadores / Premium.
- **Ações:**
  - "Limpar e Regenerar" (apaga ativos + gera de novo).
  - "Gerar Sinais" (chama `generate-signal` para 10 símbolos, timeframe 1h).
  - "Fechar Sinais (TP/SL)" (chama `close-signals`).
  - "Atualizar".
- **Tabs:**
  - **Sinais:** tabela (par, TF, tipo, entrada, SL, TP, conf., status dropdown,
    apagar) + form manual (adicionar sinal).
  - **⚡ Hora do Boom:** form (título, GMT, WAT, pares, dias, volatilidade, badge,
    descrição) + lista/apagar.
  - **💬 Comunidade:** publicar post (título, par, sinal, conteúdo, imagem, áudio) + lista.
  - **⚡ Boom Times:** form (par, data/hora, confiança, resultado, imagem, áudio) +
    lista com select de resultado/apagar.
  - **Utilizadores:** `get_all_users` RPC + `subscriptions` → nome, email, registo,
    último acesso, premium (✓).

---

## 2.12 Páginas legais

- **Termos de Uso** (`/termos`): aceitação, descrição do serviço, natureza educacional,
  conta, pagamentos (Stripe, renovação automática), propriedade intelectual, alterações.
- **Política de Privacidade** (`/privacidade`): dados recolhidos (email, nome Google,
  pagamento via Stripe), uso, armazenamento (Supabase/Postgres encriptado), partilha,
  cookies, direitos, contacto.
- **Aviso de Risco** (`/aviso-risco`): risco de perda, natureza educacional, sem
  garantias, decisão do utilizador, alavancagem, regulamentação (não é corretora).
- **404** (`*`).

---

## 2.13 Dados fictícios (`src/data/mockSignals.ts`)

Existe um ficheiro de mock (sinais/histórico fictícios), mas **as páginas reais
consomem o Supabase**. Serve apenas como referência de formato/fallback.
