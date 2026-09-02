# Spec — Novo Início como Dashboard Modular

**Data:** 2026-08-12
**Estado:** Aprovado (Abordagem A)
**Branch:** `feature/home-dashboard`

## Contexto

A aba Início (`mobile/src/app/(tabs)/inicio.tsx`) é hoje uma landing estática de marketing: features hardcoded, stats falsos (`+10K`, `85%`, `50%`), botões de CTA e dots decorativos. Não usa nenhum hook de dados, não tem estados de loading/erro/vazio e não reaproveita o design system (`Card`, `SignalCard`, `Badge`, etc.).

O objetivo é reconstruir o Início como um dashboard modular alimentado por dados reais, entregando um upgrade visual imediato e criando a base de componentes reutilizáveis para as restantes abas.

## Decisões aprovadas

1. **Abordagem A — Dashboard modular** (em vez de refatorar todo o design system ou fazer uma reorganização mínima).
2. **Verificação sem harness de testes** — o repo não tem infra de testes (sem jest/testing-library/script `test`). O plano verifica com `npx tsc --noEmit`, `npx expo lint` e revisão manual no Expo Go. Fica fora de escopo instalar jest-expo.
3. **Dashboard para todos + rota autenticada para o Início** — visitantes e autenticados veem o dashboard; o splash passa a mandar autenticados para `/(tabs)/inicio` (em vez de `/analises`).

## Não-objetivos

- Não refatorar tokens de tema, tipografia ou componentes core (`theme.ts`, `ui.tsx`) além do estritamente necessário.
- Não reescrever `useLivePrices` (continua com polling próprio por consumidor; o dashboard adiciona um consumidor — ver Riscos).
- Não criar páginas novas (sem tela de notificações; o sino navega para Horários).
- Não mexer em `comunidade.tsx`, `historico.tsx`, `analises.tsx`, `perfil.tsx`, `horarios.tsx` (exceto o refactor mínimo de `boomEpoch` para partilhar helper).
- Não alterar gating premium das outras abas.

## Layout da nova tela (topo → base)

1. **DashboardHeader (TopBar)** — avatar com inicial (`avatarLetter`), saudação com primeiro nome (`displayName`), linha "The Magic Trader", sino → `/(tabs)/horarios`, badge PRO se `isPremium`.
2. **PerformanceCard (hero)** — GradientCard verde→azul: label "DESEMPENHO" + dica "Ver histórico ›"; taxa de acerto grande (`stats.winRate%`); mini barras TP/SL com percentagens; MetricGrid com **Pips totais** (`formatPips`), **Sinais totais**, **Ativos agora**. Toque → `/(tabs)/historico`.
3. **SectionHeader "Mercado"** + subtítulo "Preços ao vivo" + ação "Análises" → `PriceTicker` horizontal com `useLivePrices(ALL_PAIRS)` (preço mono + variação % verde/vermelho). Toque num chip → `/(tabs)/analises`.
4. **SectionHeader "Hora do Boom"** + subtítulo "Próxima janela" + ação "Horários" → `NextBoomCard` com contagem regressiva WAT (1s), badge PRÓXIMO/AGORA/AMANHÃ e chips de pares. Toque → `/(tabs)/horarios`.
5. **SectionHeader "Últimos Sinais"** + subtítulo "Análises recentes" + ação "Ver tudo" → até 3 `SignalCard` (reutilizado tal como está, sem alterações). Toque num card → `/sinal/[id]`.
6. **PremiumLock** (CTA de upgrade) — só quando `!isPremium && !subLoading`. Reutiliza o componente existente.

Pull-to-refresh no `Screen` (padrão já usado em `analises.tsx`).

## Componentes novos

**Design system (reutilizáveis, `src/components/`):**

| Componente | Props | Responsabilidade |
|---|---|---|
| `GradientCard` | `children`, `colors?: readonly [string,string]`, `start?`, `end?`, `style?` | Wrapper `LinearGradient` com borda/radius/padding default |
| `MetricGrid` | `items: { label; value; accent? }[]` | Linha de cards de métrica (flex, 3 colunas) |
| `SectionHeader` | `title`, `subtitle?`, `action?: { label; onPress }` | Título + subtítulo (gap 8px) + ação à direita |
| `PriceTicker` | `pairs`, `prices: Record<string, PriceData>`, `onPressPair?`, `loading?` | Scroll horizontal de chips preço/variação |

**Específicos do home (`src/components/`):**

| Componente | Props | Responsabilidade |
|---|---|---|
| `DashboardHeader` | `isPremium: boolean` | TopBar: avatar, saudação, sino, badge PRO |
| `PerformanceCard` | `stats: HistoryStats`, `activeCount: number`, `loading: boolean`, `onPress` | Hero de desempenho |
| `NextBoomCard` | `hour: BoomHour`, `onPress` | Contagem regressiva da próxima janela |

## Helpers novos

- `core/booms.ts`: `boomEpochMs(now, timeWat)` (extraído do `horarios.tsx`) e `getNextBoomHour(hours, now)` (próxima janela futura; fallback para a mais cedo = "amanhã").
- `core/format.ts`: `formatPips(n)` → `'+12.5' | '-4' | '0' | '—'`.

## Fontes de dados

| Secção | Hook | Query/cache |
|---|---|---|
| Header/PRO | `useSubscription()` | plain state + realtime `subscriptions` |
| PerformanceCard | `useHistory().stats` + `useSignals()` (count ativos) | `['history']`, `['signals']` |
| PriceTicker | `useLivePrices(ALL_PAIRS)` | polling 60s (por consumidor) |
| NextBoomCard | `useBoomHours().hours` | `['boom-hours']`, refetch 60s |
| Últimos Sinais | `useSignals().signals.slice(0,3)` | `['signals']` |

## Estados por secção

- **Hero:** `historyLoading` → valores `'—'`; barras TP/SL a 0%.
- **Mercado:** `pricesLoading` → preço `'—'` e variação `'—'`.
- **Hora do Boom:** `boomLoading` → secção oculta; sem `nextHour` → secção oculta.
- **Últimos Sinais:** loading → `Spinner`; erro → `EmptyState`; vazio → `EmptyState`.
- **Upgrade:** `!isPremium && !subLoading`.

## Alterações de routing

| Ficheiro | Linha | Antes → Depois |
|---|---|---|
| `src/app/index.tsx` | 33 | `router.replace(user ? '/(tabs)/analises' : '/(tabs)/inicio')` → `router.replace('/(tabs)/inicio')`; remover `user` (e do array de deps do effect) |
| `src/app/(auth)/login.tsx` | 25 | `router.replace('/(tabs)/analises')` → `router.replace('/(tabs)/inicio')` |
| `src/app/(tabs)/admin.tsx` | 75 | `router.replace('/(tabs)/analises')` → `router.replace('/(tabs)/inicio')` |
| `src/app/(tabs)/_layout.tsx` | 20-26 | Tab `inicio`: adicionar `headerShown: false` (o `Screen` + SafeArea cobre o topo) |

## Refactor DRY

- `horarios.tsx`: remover `boomEpoch` local (linhas 22-26) e importar `boomEpochMs` de `core/booms`. `watDate`/`Clock` permanecem locais.

## Edge cases

- **Countdown a expirar:** quando a janela passa, `NextBoomCard` mostra "AGORA" (live) com tempo decorrido; com `msLeft <= -1h` mostra "AMANHÃ" com `time_wat` (sem countdown). A seleção de "próxima" avança nos re-renders (refetch de `['boom-hours']` a cada 60s).
- **Sem horas ativas / todas passadas hoje:** `getNextBoomHour` faz fallback para a janela mais cedo (dia seguinte) → a secção nunca desaparece sozinha.
- **Convidadas/visita:** `useSubscription` devolve `isPremium=false`, `loading=true` inicialmente → o upgrade só aparece após `loading=false`. `PremiumLock` já encaminha para `/planos`, que reencaminha visitantes para `/login`.
- **Sem sinais:** secção "Últimos Sinais" mostra `EmptyState`.
- **Erro de rede do ticker:** `useLivePrices` engole erros e devolve `price: '—'`; sem estado de erro.

## Riscos conhecidos

- `lazy: false` + novo consumidor de `useLivePrices` → haverá múltiplos loops de polling das mesmas 10 pares (inicio + analises). Fora de escopo; mitigado por `Promise.allSettled` e intervalos de 60s.
- O countdown de `BoomHour` baseia-se em `time_wat` (label "HH:MM") interpretado como WAT (UTC-1), replicando a lógica já existente em `horarios.tsx`.

## Ficheiros

**Criar:** `src/components/GradientCard.tsx`, `MetricGrid.tsx`, `SectionHeader.tsx`, `PriceTicker.tsx`, `DashboardHeader.tsx`, `PerformanceCard.tsx`, `NextBoomCard.tsx`.

**Modificar:** `src/core/booms.ts`, `src/core/format.ts`, `src/app/(tabs)/inicio.tsx` (reescrita), `src/app/(tabs)/horarios.tsx`, `src/app/(tabs)/_layout.tsx`, `src/app/index.tsx`, `src/app/(auth)/login.tsx`, `src/app/(tabs)/admin.tsx`.

## Definição de pronto

- `npx tsc --noEmit` e `npx expo lint` sem erros.
- Splash/registo/login/admin encaminham para o Início.
- As 6 secções renderizam com dados reais e estados loading/erro/vazio.
- Componentes novos reutilizados sem alterar as outras abas.
