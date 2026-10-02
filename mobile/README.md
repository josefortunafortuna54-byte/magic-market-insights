# The Magic Trader — Mobile

Aplicação **Expo SDK 56** · React Native 0.85 · React 19 · Expo Router. Análise técnica
de Forex com sinais gerados por IA, de carácter educacional. Isto é material
educacional, não recomendação de investimento.

> ⚠️ **Antes de escrever código:** o Expo 56 é recente e a API mudou várias vezes. Lê
> a documentação versionada em <https://docs.expo.dev/versions/v56.0.0/> — não uses
> tutoriais de SDK 51/52/53 como referência. Ver também [`AGENTS.md`](./AGENTS.md).

---

## Arranque

```sh
npm install
cp .env.example .env
npx expo start
```

O `start` dá development build, emulador Android, simulador iOS, ou Expo Go. A navegação
é por ficheiros em `src/app/`, com rotas tipadas (`experiments.typedRoutes`).

| Comando | O que faz |
|---|---|
| `npx expo start` | Servidor de desenvolvimento |
| `npx expo run:android` / `run:ios` | Build nativo de desenvolvimento |
| `npm test` | Jest — 10 suites, 81 testes |
| `npx tsc --noEmit` | Typecheck |
| `npm run lint` | `expo lint` |

**As rotas tipadas só se regeneram com o dev server a correr.** Se o `tsc` reclamar que
uma rota nova não existe em `Href`, o ficheiro `.expo/types/router.d.ts` está
desactualizado: arranca `npx expo start` e volta a correr o typecheck. Esse ficheiro é
gerado e está no `.gitignore` — nunca o commites à mão.

---

## Estrutura

| Pasta | O que vive lá |
|---|---|
| `src/app/` | Rotas do Expo Router. `(auth)` = login, `(tabs)` = app autenticada |
| `src/components/` | Componentes de UI, com primitivos em `components/ui` |
| `src/core/` | Tema, tokens e tipos partilhados |
| `src/hooks/` | Hooks de domínio (`useAuth`, `useTheme`, `usePresence`, …) |
| `src/lib/` | Clientes (Supabase, auth, Stripe) e o i18n |
| `src/services/` | Chamadas de rede e Realtime |
| `supabase/` | **A árvore autoritativa do backend.** 45 migrations + 7 edge functions |

> A raiz do repositório também tem `supabase/`, mas está desactualizada (20 migrations) e
> divergiu desta. Usa **esta**. A dívida está registada no `README.md` da raiz.

---

## Autenticação

Três formas de entrar, sem campos de email à vista:

| Via | Como funciona |
|---|---|
| **Google** | `expo-auth-session`, zero input do utilizador |
| **WhatsApp** | telefone → código de 6 dígitos via WhatsApp Business |
| **NomeÚnico + senha** | username escolhido pelo utilizador |

O Supabase Auth só autentica por email, o que torna a terceira via indirecta. Vale a
entender antes de mexeres nela:

- **NomeÚnico + senha** passa obrigatoriamente pela edge function `username-auth`. Não
  existiu, e não deve existir, `signInWithPassword` a partir do cliente: o username tem de
  ser resolvido para um email sintético (`<username>@tmt.local`) e a senha comparada
  **dentro da base de dados** (ver §Base de dados).
- A comparação da senha vive em `verify_user_password` (SQL, `SECURITY DEFINER`), não em
  JavaScript. O hash nunca sai de `auth.users`. Isto não é uma preferência: a função JS
  que tentámos usar, `auth.admin.getUserById().password_hash`, **não existe** — esse campo
  nunca foi devolvido por esse método. O código parece funcionar e falha sempre em
  silêncio.
- A sessão abre-se com um token de uso único (`generateLink` → `verifyOtp` com
  `type: 'magiclink'`), nunca devolvendo o email real ao cliente.
- `whatsapp-auth` **nunca** escreve a password de um utilizador que já existe. Uma versão
  anterior fazia `updateUserById({ password: code })` a cada login e destruía a senha de
  quem tivesse telefone ligado (contas Google e NomeÚnico+senha). Se alguma vez tentares
  "simplificar" essa função, lê o comentário no topo dela.

**`user_profiles` é escrita por mais do que um caminho.** A coluna `username` só pode ser
escrita por `username-auth` (service_role) — um trigger bloqueia o resto. Não contornes o
trigger com `service_role` a partir do cliente.

---

## Base de dados

`supabase/migrations/` — 45 migrations, aplicadas por ordem de nome. As cinco últimas
relevantes para a auth:

| Migration | O que faz |
|---|---|
| `20261001000000_lock_down_user_profiles_role.sql` | Impede um utilizador de escrever o próprio `role` |
| `20261002000000_username_auth.sql` | Coluna `username`, unicidade, trigger de escrita, rate-limit |
| `20261003000000_verify_user_password.sql` | `verify_user_password`: compara senha em SQL, devolve só booleano |
| `20261004000000_atomic_username_rate_limit.sql` | Contador de tentativas em SQL com `FOR UPDATE` — o `FOR UPDATE` é o que torna o rate limit real |
| `20261005000000_username_reserve_wa.sql` | Reserva `wa` + dígitos no `CHECK` de username, para não colidir com emails de WhatsApp |

**Edge functions** (`supabase/functions/`): `admin-manage`, `ai-support`, `close-signals`,
`generate-crypto-signals`, `send-notification`, `username-auth`, `whatsapp-auth`.

A `close-signals` é agendada por `pg_cron` e **nunca correu**: falta a `service_role_key`
em `app_config`, que é um `INSERT` manual no dashboard. Ver `RESUMO-PROJETO.md` secção 9.

---

## Internacionalização

14 idiomas: **pt-PT** é a fonte, mais `en · es · fr · it · de · nl · ru · ar · ja · ko ·
zh · ln · sw`.

As traduções **não se editam à mão**. O fluxo é gerar listas por idioma, traduzir, e deixar
um script validar e fundir:

```sh
node ../scripts/make-i18n-todo.cjs         # gera as listas de trabalho
node ../scripts/merge-i18n.cjs --check     # valida tudo (diagnóstico)
node ../scripts/merge-i18n.cjs es.a        # funde um idioma/onda
node ../scripts/merge-i18n.cjs --mobile es.m
```

O `merge-i18n.cjs` recusa chaves a mais, chaves a menos, placeholders `{{...}}` alterados,
traduções vazias, JSON inválido e BOM. **Um placeholder perdido parte o i18next em
runtime** e o `{{count}}` aparece cru no ecrã. `scripts/_i18n-work/` é gerado e
gitignored — pode ser apagado e reconstruído.

---

## Ambiente

`cp .env.example .env`. Variáveis com prefixo `EXPO_PUBLIC_` são **públicas** e vão parar
ao bundle do cliente — nunca metas a `service_role_key` numa delas. Ela vive só nos
segredos da edge function, no dashboard do Supabase.

Serviços externos: **Twelve Data** (Forex), **Forex Calendar Pro** (calendário económico),
**Binance** (BTC), **Stripe** (pagamentos), **WhatsApp Business** (códigos de login).
