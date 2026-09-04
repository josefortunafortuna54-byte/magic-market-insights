# Design — Comunidade estilo Slack (TMT)

> Data: 2026-08-12 · Branch: `feature/comunidade-slack`
> Decisão do dono do produto: substituir o feed de Booms por uma comunidade profissional estilo Slack, construída primeiro em **mobile** e depois na web. Backend **Supabase nativo** (sem chat SDK de terceiros).

## 1. Objetivo

Transformar a página "Comunidade" do TMT num workspace de discussão em tempo real, estilo Slack, mantendo os Booms como mensagens especiais no canal `#sinais`. O feed atual de `BoomCard` (votação + comentários por boom) é **substituído**.

## 2. Funcionalidades (escopo aprovado)

- **Canais temáticos** — `#geral`, `#sinais`, `#duvidas`, `#resultados`, `#off-topic` (públicos) e `#estrategia-vip`, `#sinais-avancados` (PRO, com cadeado → `PremiumLock`).
- **Threads** — respostas aninhadas de 1 nível dentro de cada mensagem.
- **Reações com emoji** — toggle por utilizador/mensagem.
- **Presença online + membros** — indicador ao vivo (Realtime presence) + `last_seen_at`; lista de membros com papel e status.
- **@Menções** — ao escrever `@`, selector de membro; notificação ao mencionado.
- **Gestão de mensagens** — editar, apagar (soft-delete), fixar (pins).
- **Mensagens diretas (DM)** — conversas 1:1 privadas.
- **Busca de mensagens** — full-text (Postgres `tsvector` + GIN) sobre o texto em todos os canais/DMs.
- **Booms = mensagens no `#sinais`** — card especial com imagem, countdown, votação BUY/SELL e barra de resultados; discussão em threads.
- **Canais PRO exclusivos** — RLS nativo via `is_premium(user_id)`.
- **Sem mensagens de voz** — apenas texto + imagens.

## 3. Modelo de dados (Supabase)

### 3.1 Novas tabelas (RLS + realtime)

| Tabela | Campos | Notas |
|---|---|---|
| `channels` | `id`, `name` (slug único, ex: `sinais`), `display_name`, `description`, `icon`, `is_premium bool default false`, `created_at` | Gating PRO nativo |
| `messages` | `id`, `channel_id` (FK `channels`, null p/ DMs), `conversation_id` (FK `conversations`, null p/ canais), `user_id` (refs `auth.users`), `parent_id` (FK `messages`, null = mensagem do canal, não-nulo = resposta de thread), `text`, `image_url`, `boom_id` (FK `boom_times`, mensagem especial), `edited_at`, `deleted_at`, `client_msg_id` (dedupe), `created_at` | Threads de 1 nível; soft-delete |
| `message_reactions` | `id`, `message_id` (FK), `user_id`, `emoji`, `created_at`, `UNIQUE(message_id, user_id, emoji)` | Toggle reagir/desreagir |
| `conversations` | `id`, `created_at` | DM 1:1 |
| `conversation_members` | `conversation_id`, `user_id`, `joined_at`, PK composta | 2 membros por DM |
| `user_profiles` | `user_id` PK (refs `auth.users`), `display_name`, `avatar_url`, `role` (`admin`/`member`), `status`, `status_emoji`, `last_seen_at`, `created_at` | Substitui `user_name`/`user_avatar` denormalizado |
| `notifications` | `id`, `user_id` (destinatário), `type` (`mention`/`reply`/`reaction`/`dm`), `actor_id`, `message_id`, `channel_id`, `is_read bool default false`, `created_at` | Trigger-driven |

### 3.2 Índices

- `messages(channel_id)` — por canal
- `messages(parent_id)` — threads
- `messages(conversation_id)` — DMs
- `messages(text)` GIN via coluna gerada `tsvector` — busca
- `notifications(user_id, is_read)` — contadores

### 3.3 Funções / triggers

- `is_premium(user_id)` → `subscriptions.status = 'active'`
- Trigger de `updated_at` em tabelas com o campo.
- Trigger pós-INSERT em `messages`: cria registo em `notifications` para @menção (regex `@nome` → procura `user_profiles.display_name`), reply na tua mensagem, e novo DM.
- Trigger pós-INSERT/DELETE em `message_reactions` → notificação `reaction` (apenas INSERT).
- Trigger UPDATE em `user_profiles.last_seen_at` (batched pelo cliente).

### 3.4 RLS

- `channels`: SELECT para autenticados se `is_premium = false`; PRO exige `is_premium(user_id())`. INSERT/UPDATE/DELETE apenas `service_role`.
- `messages`: SELECT se o utilizador lê o canal/DM; INSERT autenticado se escreve no canal/DM; UPDATE/DELETE apenas o próprio (`user_id = auth.uid()`) e não-detetada; soft-delete permitido.
- `message_reactions`, `notifications`, `user_profiles`, `conversations`, `conversation_members`: por regras de proprietário/membro.
- Todos os Writes de canais/booms continuam `service_role` (admin via Edge Function), como hoje.

### 3.5 Realtime

- Adicionar à publicação `supabase_realtime`: `channels`, `messages`, `message_reactions`, `notifications`, `user_profiles` (só o próprio para profiles), `conversation_members`.
- Canais de presence: `presence:comunidade` (online/offline ao vivo).

## 4. Arquitetura mobile (expo-router)

Dentro do tab `(tabs)/comunidade` passa a existir um stack próprio:

```
src/app/(tabs)/comunidade/
  _layout.tsx                        → Stack do workspace
  index.tsx                          → Workspace: canais (sidebar) + DMs
  [channelId].tsx                    → Mensagens do canal + composer
  [channelId]/thread/[messageId].tsx → Painel de thread
  dm/[conversationId].tsx            → DM 1:1
  membros.tsx                        → Lista de membros + presença
  busca.tsx                          → Busca global
```

### 4.1 Fluxo de dados

- **Canais:** carregados uma vez no `index` (RLS filtra PRO). Ao abrir canal → subscrição Realtime `messages` com `channel_id=eq.X` (INSERT/UPDATE/DELETE). Paginação ascendente (antiga → nova) com "carregar mais antigas".
- **Threads:** subscrição `messages` com `parent_id=eq.<root>`.
- **DMs:** subscrição `messages` com `conversation_id=eq.Y`.
- **Presença:** presence channel + `last_seen_at` atualizado periodicamente.
- **Notificações:** contador de não-lidos no badge do tab (via `notifications`).
- **Envio:** optimistic update com `client_msg_id` para dedupe; revert em erro.
- **Votação de Booms:** mantém `boom_votes` (upsert), embutida no card da mensagem `#sinais`.

### 4.2 Estados/erros

- Loading skeletons por canal; estado vazio ("Sem mensagens ainda"); erro com retry; indicador "não enviada" em mensagens offline.

## 5. UI (estilo Slack, mobile)

- **Workspace (`index`):** header com nome do workspace + botões busca/membros; secções colapsáveis: CANAIS, CANAIS PRO 🔒 (bloqueio → `/planos`), MENSAGENS DIRETAS. Badge de não-lidos por canal; nome em bold se há atividade.
- **Canal:** header `#nome` + descrição + ⋯; mensagens agrupadas por dia; avatar + nome + hora; imagem; reações em chips; ações por toque longo (reagir, responder→thread, copiar, editar, apagar se própria); card de Boom especial; secção "Afixado"; composer com texto, botão imagem e @menções.
- **Thread:** mensagem raiz no topo (card de boom incluído), respostas cronológicas, composer próprio, badge de não-lidos.
- **DM:** igual a canal mas header com membro + presença.
- **Membros:** avatar, nome, papel (Admin/PRO), status custom, online/offline, "visto há X".
- **Busca:** input + resultados agrupados por canal com snippet; toque abre mensagem no contexto.

## 6. Migração de dados

1. Nova migration SQL (schema acima + seed dos canais + backfill).
2. **Seed canais:** `#geral`, `#sinais`, `#duvidas`, `#resultados`, `#off-topic` (públicos); `#estrategia-vip`, `#sinais-avancados` (PRO).
3. **Backfill booms:** `boom_times` ativos → mensagens no `#sinais` com `boom_id`, texto "🎯 <PAR> — Boom", imagem.
4. **Backfill comentários:** `boom_comments` → respostas de thread na mensagem de boom correspondente.
5. **Backfill profiles:** `auth.users` → `user_profiles` (nome/email/avatar).
6. `boom_comments` deixa de ser utilizada pela app (tabela mantém-se para histórico).

## 7. Testes / verificação

- **Backend:** policies RLS verificadas (free vs PRO vs admin); triggers testados via SQL.
- **Mobile:** `expo lint` + `tsc --noEmit` (não há framework de testes instalado; não adicionar nesta fase).
- **E2E:** fluxo completo via Playwright (web posterior) / manual no dispositivo: abrir canal → enviar → reagir → thread → DM → buscar → votar boom.
- Baseline obrigatório antes de declarar conclusão: lint + typecheck limpos.

## 8. Fora de alcance (esta fase)

- Mensagens de voz.
- Edição/gestão de canais por admins na app mobile (via admin web existente).
- Presença "a escrever…" em tempo real (placeholder).
- Notificações push nativas (apenas badges in-app).
- Versão web (fase 2, após aprovação mobile).
