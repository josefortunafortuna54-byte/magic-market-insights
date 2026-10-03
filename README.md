# The Magic Trader

Plataforma de **análise técnica de Forex com sinais gerados por IA**, de carácter
educacional. Gera sinais BUY/SELL/AGUARDAR por ativo, com entrada, Stop Loss, Take Profit,
nível de confiança e as justificações técnicas que sustentam cada decisão (RSI, EMA, MACD,
Bollinger, Estocástico, Ichimoku, Fibonacci, ADX, Suportes/Resistências).

> **Aviso:** isto é material educacional, não recomendação de investimento. Nada aqui é
> conselho financeiro. Trading de Forex envolve risco de perda de capital.

O projecto tem **duas aplicações completas** e um backend partilhado:

| | Onde vive | Stack | Deploy |
|---|---|---|---|
| **Web** | `src/` | React 18 · TypeScript · Vite · Tailwind · shadcn/ui | Vercel |
| **Mobile** | `mobile/` | Expo SDK 56 · React Native 0.85 · React 19 · Expo Router | EAS |
| **Backend** | `mobile/supabase/` | Postgres + RLS · Auth · Realtime · Storage · 9 Edge Functions | Supabase Cloud |

---

## Arranque rápido

Pré-requisitos: **Node.js 20+** e npm. Para o mobile, um simulador Android/iOS ou o
**Expo Go** no telemóvel.

### Web

```sh
npm install
cp .env.example .env      # ver "Ambiente" abaixo
npm run dev
```

### Mobile

```sh
cd mobile
npm install
cp .env.example .env
npx expo start
```

O `npx expo start` dá-te as opções habituais: development build, emulador Android,
simulador iOS, ou Expo Go. A navegação é por ficheiros em `mobile/src/app/`, com rotas
tipadas.

### Testes

```sh
cd mobile
npm test                  # 11 suites, 103 testes
```

### Outros comandos

| Comando | Onde | O que faz |
|---|---|---|
| `npm run dev` | raiz | Servidor de desenvolvimento Vite |
| `npm run build` | raiz | Build de produção para `dist/` |
| `npm run preview` | raiz | Serve o build de produção localmente |
| `npm run lint` | raiz | ESLint |
| `npm run lint` | `mobile/` | `expo lint` |
| `npx tsc --noEmit` | `mobile/` | Typecheck |

---

## Ambiente

Nenhum `.env` está versionado (`.gitignore` bloqueia `.env` e `.env*.local`). Os ficheiros
`.env.example` são modelos com as chaves certas e valores vazios.

**Web (Vite)** — prefixo `VITE_`, 5 chaves (ver `.env.example` na raiz):
`VITE_SUPABASE_URL` · `VITE_SUPABASE_ANON_KEY` · `VITE_ADMIN_EMAILS` ·
`VITE_AOA_PER_USD` · `VITE_FOREX_CALENDAR_KEY`

**Mobile (Expo)** — prefixo `EXPO_PUBLIC_`, com os mesmos valores:
`EXPO_PUBLIC_SUPABASE_URL` · `EXPO_PUBLIC_SUPABASE_ANON_KEY` · `EXPO_PUBLIC_ADMIN_EMAILS` ·
`EXPO_PUBLIC_STRIPE_PRICE_*` · `EXPO_PUBLIC_STRIPE_CHECKOUT_URL` ·
`EXPO_PUBLIC_TWELVE_DATA_KEY` · `EXPO_PUBLIC_FOREX_CALENDAR_KEY`

**Edge Functions** (Supabase dashboard, nunca no cliente):
`PROJECT_URL` · `SERVICE_ROLE_KEY` · `ANON_KEY` · `ADMIN_EMAILS` · `STRIPE_SECRET_KEY` ·
`STRIPE_WEBHOOK_SECRET` · `SITE_URL`

⚠️ **A `SERVICE_ROLE_KEY` nunca pode ir para o bundle do cliente.** No web é
`VITE_`-prefixada e no Expo é `EXPO_PUBLIC_`-prefixada — qualquer variável com um desses
prefixos é pública e vai parar ao browser. Não as uses para segredos.

Serviços externos em uso: **Twelve Data** (preços Forex), **Forex Calendar Pro**
(calendário económico), **Binance** (BTC).

### Onde é que se paga

Os dois caminhos não são iguais, e é fácil assumir que são:

| | Caminho |
|---|---|
| **Web** | `/planos` → reencaminha para `/depositos` → **pedido manual em Kwanzas** (binance, RodotPay, Express) com comprovativo, aprovado pelo admin |
| **Mobile** | **Stripe Checkout** (USD e AOA) via a edge function `stripe-checkout`, e também o caminho manual |

Por isso os `*_PRICE_*` do Stripe só existem no `mobile/.env.example` — a web não os usa
nem precisa deles.

---

## Internacionalização

14 idiomas em ambas as aplicações: **pt-PT** é a fonte, mais `en · es · fr · it · de · nl ·
ru · ar · ja · ko · zh · ln · sw`.

As traduções **não se editam à mão**. O fluxo é gerar listas de trabalho por idioma,
traduzir, e deixar um script validar e fundir:

```sh
node scripts/make-i18n-todo.cjs              # gera as listas de trabalho
node scripts/merge-i18n.cjs --check          # valida tudo (diagnóstico)
node scripts/merge-i18n.cjs es.a             # funde um idioma/onda
node scripts/merge-i18n.cjs --mobile es.m    # o mesmo, nos locales do mobile
```

O `merge-i18n.cjs` recusa chaves a mais, chaves a menos, placeholders `{{...}}`
alterados, traduções vazias, JSON inválido e BOM. Isto não é arbitrário: **um placeholder
perdido parte o i18next em runtime** e o `{{count}}` aparece cru no ecrã.

`scripts/_i18n-work/` é gerado e gitignored — pode ser apagado e reconstruído.

---

## Documentação

| Ficheiro | O que é |
|---|---|
| [`RESUMO-PROJETO.md`](./RESUMO-PROJETO.md) | **Começa por aqui.** Estado real do projecto: estrutura, rotas, schema, deploy, dívida técnica |
| `RESUMO/` | Documentos detalhados por área (parcialmente desatualizados — ver avisos no ficheiro principal) |
| `docs/design/` | Mockups do redesign |
| `mobile/AGENTS.md` | Nota de convenção: o Expo 56 é recente, ler as docs versionadas antes de codificar |

Os números no `RESUMO-PROJETO.md` são medidos no código. Se a documentação e o código
divergirem, **o código ganha** — reconfirma antes de decidir.

---

## Dívida técnica conhecida

1. **Sem CI de qualidade.** Não há build, typecheck, lint ou testes em CI. O único
   workflow (`.github/workflows/close-signals.yml`) é redundante com o `pg_cron` da BD.
2. **Bundle da web: 1,87 MB (600 kB gzip)**, sem code-splitting.
3. **Cobertura de i18n desigual** — a web não tem chaves em falta, mas ainda tem valores
   por traduzir (56 a 293 por idioma).
4. **A documentação em `RESUMO/` ficou atrás** o que descreve o mobile como futuro.
5. **⚠️ Duas árvores `supabase/` — as migrations já foram fundidas, as edge functions não.**
   As 20 migrations da raiz foram copiadas para `mobile/supabase/` em 2026-10-03, com os
   timestamps preservados. A árvore mobile passou de 45 para **60 migrations** e **já
   reconstrói a base de dados sozinha** — verificado por replay desde uma BD vazia: 60/60,
   35 tabelas, as 13 de que a app depende presentes, 0 colunas perdidas. Era o que faltava:
   a raiz criava **9 tabelas** que o mobile não criava em lado nenhum, e as 45 migrations do
   mobile sozinhas falhavam 22.
   **Nas edge functions, o caminho de pagamento já está resolvido.** `stripe-checkout` e
   `stripe-webhook` foram trazidas para `mobile/supabase/functions/` em 2026-10-03, por
   `src/lib/env.ts` chamar `stripe-checkout` — o mobile já não depende da raiz para pagar.
   O mobile tem 9 funções e a raiz 5. Em `admin-manage` **o mobile ganha com folga** (1198
   linhas contra 660, com correções para erros do PostgREST que a da raiz engole).
   **Em `close-signals` o mobile ganhou no todo, e a raiz foi fundida onde acrescenta.**
   Portado: o relatório `skipped`, que na raiz devolvia `{symbol, id, motivo}` e no mobile
   era um `continue` silencioso — o sinal desaparecia sem rasto. Rejeitado: a expiração
   chapada de 48h da raiz, porque a janela **não é chapada** — `nextExpiry` dá D1 +3 dias e
   salta para segunda 05:00 UTC, logo 48h expiraria H4 e D1 antes da hora. O `expires_at` do
   mobile já cobre isso. A fusão corrigiu também um bug do mobile: um sinal que tocava TP
   *e* já passado `expires_at` escrevia duas linhas em `signal_outcomes` e disparava duas
   actualizações para a mesma linha, corrompendo o win-rate. `generate-signal` (640 linhas)
   e `_shared/admin.ts` (37 linhas) na raiz são código morto: nada os invoca. Detalhe e
   evidência em `RESUMO-PROJETO.md` secção 8, dívida 8.
6. **O cron de fecho de sinais nunca correu** — falta a `service_role_key` em
   `app_config`. É um `INSERT` manual, não código. Ver `RESUMO-PROJETO.md` secção 9.

O resto está em [`RESUMO-PROJETO.md`](./RESUMO-PROJETO.md) secção 8.
