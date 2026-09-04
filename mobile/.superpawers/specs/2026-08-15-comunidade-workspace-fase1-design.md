# Design — Comunidade Workspace Fase 1 (TMT)

> Data: 2026-08-15 · Branch: `feature/comunidade-slack`
> Decisões do dono do produto (aprovadas em brainstorming 2026-08-15):
> - Comunidade pública para **todos os planos** (login obrigatório).
> - Salas de pares criadas **pelo bot**, dinâmicas por sinais/booms, ativas durante **24h**, depois **só-leitura** (arquivadas), reabrem em novo sinal.
> - **Feed atual de Booms mantido** em paralelo com o workspace.
> - Abordagem **faseada**: este documento cobre a **Fase 1**.

## 1. Objetivo

Transformar a página "Comunidade" num workspace de discussão estilo Slack, em paralelo com o feed de Booms atual. A Fase 1 entrega: canais públicos, mensagens com texto/imagem, reações com emoji, DMs 1:1, salas de pares por bot (ciclo 24h), backfill de booms no `#sinais`. Threads, presença, @menções, busca, pins, canais PRO e notificações ficam para a Fase 2. Perfis sociais e educação para fases posteriores.

## 2. Funcionalidades (escopo Fase 1)

- **Canais públicos** — `#geral`, `#sinais`, `#duvidas`, `#resultados`, `#off-topic`; visíveis e escrevíveis por qualquer utilizador autenticado (todos os planos).
- **Mensagens** — texto + imagem (bucket Storage `community`), soft-delete pelo próprio (toque longo), agrupadas por dia.
- **Reações emoji** — toggle por utilizador/mensagem (chips na mensagem).
- **Booms no `#sinais`** — mensagens especiais com `boom_id` que reutilizam o `BoomCard` (votação BUY/SELL mantida via `boom_votes`).
- **DMs 1:1** — conversas privadas (`conversations` + `conversation_members`).
- **Salas de pares por bot** — abertura automática ao aparecer sinal/boom de um par; ciclo de 24h; encerrada = só-leitura; reabre em novo sinal.
- **Vista dupla no tab** — segmentado `Feed | Workspace`; o feed atual fica intacto.

Fora de alcance (Fase 2+): threads, presença online, @menções, busca full-text, pins, editar/apagar mensagens de outros, notificações in-app, canais PRO, perfis sociais, voz.

## 3. Modelo de dados (Supabase)

### 3.1 Tabelas novas

| Tabela | Campos | Notas |
|---|---|---|
| `channels` | `id` uuid PK, `name` text único (slug), `display_name` text, `description` text, `icon` text, `type` text check (`regular`/`pair`), `pair` text null (só `type='pair'`), `opened_at` timestamptz null (só `type='pair'`), `is_premium` bool default false, `created_at` timestamptz | Salas de pares são canais; ativa/encerrada derivada de `opened_at + interval '24 hours'` |
| `messages` | `id` uuid PK, `channel_id` uuid null FK, `conversation_id` uuid null FK, `user_id` uuid (refs `auth.users`), `parent_id` uuid null (reservado Fase 2), `text` text, `image_url` text null, `boom_id` uuid null FK `boom_times`, `edited_at` timestamptz null, `deleted_at` timestamptz null, `client_msg_id` uuid, `created_at` timestamptz | Soft-delete; `client_msg_id` único para dedupe; CHECK: `channel_id` XOR `conversation_id` |
| `message_reactions` | `id` uuid PK, `message_id` uuid FK, `user_id` uuid, `emoji` text, `created_at`, UNIQUE(`message_id`,`user_id`,`emoji`) | Toggle |
| `conversations` | `id` uuid PK, `created_at` timestamptz | DM 1:1 |
| `conversation_members` | `conversation_id` uuid FK, `user_id` uuid, `joined_at`, PK composta | 2 membros por DM (CHECK via trigger) |
| `user_profiles` | `user_id` uuid PK (refs `auth.users`), `display_name` text, `avatar_url` text null, `role` text check (`admin`/`member`), `status` text, `last_seen_at` timestamptz null, `created_at` timestamptz | Fundação para perfis; inclui perfil especial do bot |

### 3.2 Índices

- `messages(channel_id)` (onde `deleted_at is null` e `conversation_id is null`)
- `messages(conversation_id)`
- `messages(boom_id)`
- `messages(client_msg_id)` UNIQUE
- `channels(name)` UNIQUE
- `channels(type, pair)` (upsert de salas de pares)
- `notifications` não existe nesta fase.

### 3.3 Funções / triggers

- `is_premium(user_id)` → `subscriptions.status = 'active'` (criado já para Fase 2; canais PRO fora de alcance agora).
- `upsert_pair_room(pair text)` SECURITY DEFINER — chamado por triggers:
  - cria canal `type='pair'` se não existir (name slug `pair-<normalizado>`);
  - reabre (`opened_at = now()`) se encerrado;
  - nada se ativo;
  - insere mensagem de boas-vindas do bot (user_id do perfil `TMT Bot`).
- Trigger `AFTER INSERT` em `signals` e `boom_times` → `upsert_pair_room(new.pair)`.
- Trigger pós-INSERT em `conversation_members` → valida 2 membros por `conversation_id`.
- Trigger `updated_at` em tabelas com o campo.

### 3.4 RLS

- `channels`: SELECT para qualquer autenticado (todos os planos); INSERT/UPDATE/DELETE apenas `service_role` (via função SECURITY DEFINER / admin Edge Function).
- `messages`: SELECT se o utilizador lê o canal/DM (canal público: qualquer autenticado; DM: membro da conversa); INSERT autenticado em canal/DM onde é membro — **negado** em sala de par encerrada (`channels.type='pair'` e `channels.opened_at < now() - interval '24 hours'`); UPDATE/DELETE apenas o próprio (`user_id = auth.uid()`). Soft-delete é feito pela app como UPDATE de `deleted_at` (nunca DELETE físico).
- `message_reactions`: INSERT/DELETE apenas próprias; SELECT para quem lê a mensagem.
- `conversations`: SELECT/INSERT se membro.
- `conversation_members`: SELECT se membro; INSERT autenticado (o próprio + outro membro); UPDATE/DELETE apenas membro.
- `user_profiles`: SELECT qualquer autenticado; INSERT/UPDATE/DELETE apenas o próprio (UPDATE só de `display_name`/`avatar_url`/`status`).

### 3.5 Realtime

- Publication: `channels`, `messages`, `message_reactions`, `user_profiles`, `conversation_members`.

### 3.6 Storage

- Bucket `community` (público), caminho `community/<user_id>/<uuid>.jpg|png`, políticas: READ público; INSERT/UPDATE/DELETE apenas o dono do ficheiro.

## 4. Arquitetura mobile (expo-router)

`src/app/(tabs)/comunidade.tsx` passa a pasta:

```
src/app/(tabs)/comunidade/
  _layout.tsx              Stack do workspace
  index.tsx                Vista dupla: Feed | Workspace
  canais/[channelId].tsx   Canal público ou sala de par + composer
  dm/[conversationId].tsx  DM 1:1
  novo-dm.tsx              Picker de membro para iniciar DM
```

- **Canais:** carregados uma vez no index (RLS já filtra). Ao abrir canal → subscrição Realtime `messages` com `channel_id=eq.X`. Paginação ascendente (antiga → nova) com "carregar mais antigas" (scroll to bottom).
- **DMs:** subscrição `messages` com `conversation_id=eq.Y`.
- **Envio:** optimistic update com `client_msg_id` (uuid gerado no cliente) para dedupe; revert em erro; indicador "não enviada" (↻) em falha; retry ao tocar.
- **Salas de pares:** estado derivado no cliente (`opened_at + 24h`); encerrada → composer desativado.
- **Presença/notificações:** fora de alcance na Fase 1.

### 4.1 Hooks

- `useChannels()` — canais + salas de pares; badge de não-lidos.
- `useMessages(target)` — `{ channelId? | conversationId? }`; Realtime + poll 15s (padrão `useBoomSocial`); `send`, `toggleReaction`, `softDelete`.
- `useConversations()` — lista de DMs do utilizador.
- `useProfiles()` — `user_profiles` dos autores (display_name, avatar, role).
- `usePairRooms()` — salas com estado ativa/encerrada + countdown.

### 4.2 Componentes

- `WorkspaceSection` (título colapsável + lista)
- `MessageList` (agrupamento por dia, avatar + nome + hora, mensagens próprias à direita)
- `Composer` (texto + botão imagem + enter envia; max 1000 chars)
- `MessageBubble` (texto/imagem, reações em chips com toggle, toque longo apagar se própria)
- `BoomMessage` (reutiliza `BoomCard` dentro do `#sinais`)
- `PairRoomRow` (badge `🤖`, countdown "fecha em Xh", estado encerrado "só leitura")
- `DmRow`, `ChannelRow`

### 4.3 Estados/erros

- Loading skeletons por lista/canal; empty states ("Sem mensagens ainda"); erro com retry; mensagem não-enviada com retry.

## 5. UI

- **Index:** segmentado `Feed | Workspace` no topo. Workspace: header "The Magic Trader Community" + secções CANAIS / SALAS DE PARES (ativas primeiro com countdown, encerradas por baixo) / MENSAGENS DIRETAS (+ botão novo DM).
- **Canal/Sala:** header `#nome` + descrição; mensagens agrupadas por dia; reações em chips; card de boom no `#sinais`; composer.
- **DM:** igual, header com nome do membro.
- **novo-dm:** lista de perfis → abre/nova conversa.
- **Sala encerrada:** composer desativado com nota "Sala encerrada — reabre quando <PAR> tiver nova atividade."
- Tema atual: bg `#05050D`, primária `#00c853`, componentes `@/components/ui`, `Colors` de `@/core/theme`.

## 6. Migração

`supabase/migrations/20260815_comunidade_workspace.sql`:
1. Tabelas + índices + RLS (secção 3).
2. Publication Realtime + bucket `community` (Storage).
3. `is_premium`, `upsert_pair_room`, triggers (`signals`, `boom_times`, `conversation_members`, `updated_at`).
4. Seed: canais públicos; `user_profiles` de todos os `auth.users`; perfil do bot (`TMT Bot`, role admin, avatar).
5. Backfill: booms de `boom_times` → mensagens no `#sinais` com `boom_id` e texto `🎯 <PAR> — Boom` (mantém `boom_comments` intacta).

## 7. Testes / verificação

- `npx tsc --noEmit` + `expo lint` limpos (baseline obrigatório).
- Verificação SQL: policies RLS (membro vs não-membro; sala encerrada bloqueia INSERT); trigger abre/reabre sala ao inserir `signals`/`boom_times`.
- E2E browser (Playwright): vista dupla → `#geral` enviar → reagir → sala de par (countdown) → sala encerrada (só leitura) → DM 1:1 → novo DM → boom no `#sinais` com votação.
- Migração aplicada e testada no Supabase antes de declarar conclusão.

## 8. Fora de alcance (Fase 2+)

Threads, presença online, @menções, busca full-text, pins, editar/apagar de outros, notificações in-app, canais PRO com cadeado, perfis sociais (feed/posts/seguir), salas de aula/cursos/livros.
