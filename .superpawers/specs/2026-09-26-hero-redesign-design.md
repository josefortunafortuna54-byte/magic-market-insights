# Hero do Home — Redesign "Terminal Split"

- **Data:** 2026-09-26
- **Branch:** `feat/hero-redesign` (base: `feature/capital-management-v2`)
- **Âmbito:** apenas o hero da página pública inicial (`/`). O resto do Home fica intacto.
- **Brief de referência:** `docs/design/home-redesign-prompt.md` (secções 3, 4 e 5.2) — nunca implementado.
- **Referência visual:** `public/lod.png` — mockup de página inteira do mesmo produto, confirmado pelo utilizador. Vence qualquer ambiguidade desta spec. As 6 chaves `inicio.hero*` e as 4 `inicio.stat*` do mockup correspondem 1:1 ao conteúdo actual de `pt.json`.

## 1. Problema

O hero em `src/pages/Index.tsx:57-120` lê-se como landing page template, não como produto de trading institucional. Causas concretas:

1. `magic-bg.svg` a `opacity: 0.6` mais dois orbes `blur-3xl` em `animate` infinito — ruído visual sem hierarquia.
2. `animate-ping` no badge e flutuação infinita nos orbes: movimento decorativo permanente.
3. `gradient-shield` (verde→ouro) aplicado ao H1 — traçosjá sinalizados como "template" no brief (§3.1).
4. Os 4 stats vivem numa `border-t` centrada, sem divisores: leem-se como rodapé, não como prova.
5. `min-h-[90vh]` com tudo centrado e nenhum elemento focal — nada identifica o produto.

## 2. Objectivo

Dar ao topo do Home um elemento focal com **dados verdadeiros** e um sistema visual sóbrio, mantendo a identidade verde/dourado e a compatibilidade light/dark, mobile e RTL.

## 3. Fora de âmbito

- Restantes secções do Home (painel BOOM/Performance, features, sinais em destaque, como funciona, CTA final).
- `src/index.css`, `tailwind.config.ts`, `src/components/ui/button.tsx`.
- Os 14 ficheiros de locale em `src/lib/i18n/locales/`.
- Paridade visual com o app mobile.
- Qualquer gráfico no hero (ver §6.3).

## 4. Desenho

### 4.1 Fundo e grelha

- `<section>` com `relative overflow-hidden border-b border-border/40`.
- **Removido:** `magic-bg.svg`, os dois `motion.div` com `blur-3xl`, o gradiente `via-background/50` de sobreposição.
- **Adicionado:** um único gradiente radial estático, verde, ancorado ao **topo-direita** (`lod.png` mostra o glow atrás do elemento focal da coluna direita) — `hsl(142 70% 45% / 0.10)` no tema light, `/ 0.07` no dark. `aria-hidden` + `pointer-events-none` + `-z-10`.
- Espaçamento: `py-20 lg:py-24`, mais `lg:min-h-[86vh] lg:flex lg:items-center`.
- Grelha: `grid gap-12 lg:grid-cols-12 lg:gap-8`. Coluna de texto `lg:col-span-7`, terminal `lg:col-span-5`. Abaixo de `lg` empilha.

### 4.2 Coluna de texto

| Elemento | Antes | Depois |
|---|---|---|
| Badge | `animate-ping` no ponto | Ponto verde estático `h-2 w-2 rounded-full bg-success` com anel `ring-4 ring-success/15`; texto inalterado |
| H1 | `4xl→7xl`, centrado, `gradient-shield` | `text-4xl sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]`, alinhado à esquerda; `heroTitle1` em `text-foreground`, `heroTitle2` em `text-primary` sólido |
| Subtítulo | `text-lg→xl`, `max-w-2xl` centred | `text-base sm:text-lg`, `max-w-xl`, à esquerda |
| CTA primário | `variant="hero"` (gradiente verde→âmbar) | `variant="default"` (verde sólido) |
| CTA secundário | `variant="outline" size="xl"` | igual, com `w-full sm:w-auto` em ambos |
| Stats | dentro da coluna de texto; `grid-cols-2 md:grid-cols-4`, `text-center`, `border-t` | **fora do hero**, em banda própria (§4.4) |

O CTA primário deixa de usar `variant="hero"` **localmente** em vez de se alterar `button.tsx`, que é partilhado por toda a app.

Os 4 stats e o seu cálculo (`winRate`, `avgRR`, `totalPairs`) mantêm-se exactamente como estão em `Index.tsx:30-53`. Apenas a apresentação muda — ver §4.4.

### 4.3 `HeroSignalTerminal` (novo)

Ficheiro: `src/components/home/HeroSignalTerminal.tsx`. Sem props — lê `useSignals()` e `useLivePrices()` directamente, tal como o resto dos componentes do projecto.

**Selecção do sinal.** Helper puro exportado:

```
pickHeroSignal(signals: Signal[]): Signal | undefined
```

Ordem: `status === "active" && type !== "AGUARDAR"` primeiro; dentro do grupo, maior `confidence`, depois `createdAt` mais recente. Sem candidatos, devolve `undefined`.

**Painel.** `rounded-xl border border-border/60 bg-card` com `--shadow-card`. Sem `glass-card`, sem `backdrop-blur`, sem glow colorido. `role="group"` + `aria-label` com o par.

Conteúdo por ordem:

1. **Header** — par em `font-display text-xl font-bold`; `Badge variant="outline"` com o timeframe; badge dourado com `smcSetup` se existir. À direita, tag de direção com `signal-buy` / `signal-sell` / `signal-wait` e ícone `TrendingUp` / `TrendingDown` / `Clock`.
2. **Preço** — `useLivePrices([pair])`. Preço em `text-3xl font-display font-bold font-trading`; variação 24h em `text-xs`, `text-success` ou `text-destructive`. `useLivePrices` devolve `price: "—"` para pares fora do seu `PAIR_CONFIG` e também quando o fetch falha, pelo que a condição de degradação é uma só: `prices[pair]?.price === "—" || prices[pair] == null`. Nesse caso mostrar a `entry` do sinal sob o label `sinal.entry`. **Nunca** apresentar preço inventado.
3. **Confiança** — barra de 4px: `bg-success` ≥80, `bg-warning` ≥60, `bg-muted` abaixo. Percentagem em tabular.
4. **Níveis** — três linhas `flex justify-between` dentro de `rounded-lg bg-secondary/40 divide-y divide-border/40`: `sinal.entry` (foreground), `sinal.stopLoss` (destructive), `sinal.takeProfit` (success), valores em `font-trading`.
5. **Footer** — três linhas empilhadas (`flex items-baseline justify-between gap-4`), **não** uma grelha de 3 colunas: `sinal.riskReturn` com `1:x` (verde se ≥2), a probabilidade (ou `sinal.confidence` quando `probabilityScore` é `null`), e `sinal.expiresIn` se houver `expiresAt`. Os labels levam `min-w-0 break-words`; os valores, `shrink-0`. Link `components.signalCard.viewFull` para `/analises/{id}`.
   - **Porquê empilhado:** `Layout.tsx:23` limita o contentor a `max-w-6xl` (1152px) e o hero dá `lg:col-span-5` ao terminal, pelo que o painel nunca ultrapassa ~385px de largura interna. Medindo as métricas reais do Inter 400, `PROBABILIDADE` (11px, `tracking-[0.14em`) ocupa 106.7px e a célula disponível é 103.2px — as 3 colunas são **matematicamente impossíveis** em qualquer viewport. Empilhar remove o problema em todas as larguras e é à prova de locales com labels mais longos (`fallbackLng: 'pt'`).
   - O countdown é auto-descritivo (`sinal.expiresIn` já inclui "Expira em"), por isso ocupa a linha inteira em vez de partilhar a linha do label.
6. **Altura** — `min-h-[600px]` no painel populado, no skeleton e no estado vazio. O rodapé empilhado acrescenta ~54px ao conteúdo (3 linhas × 17px + 2 gaps de 10px, em vez de 1 linha de 17px), levando o conteúdo populado a ~524-564px; 600px dá folga para zero layout shift. Valor conservador, a confirmar por medição em browser (não foi possível automatizar).

**Estados.**

- `loading` → skeleton com a **mesma** altura do painel populado (`min-h-[600px]`), para zero layout shift. O estado de erro e o estado vazio usam a mesma altura.
- Sem sinal → painel neutro, `text-sm text-muted-foreground`, sem números fictícios.

**Regras a respeitar.** `useTranslation()` tem de ser chamada antes de qualquer return early (o `SignalCard.tsx:68` viola isto e o lint apanha — não repetir).

### 4.4 Banda de stats (`lod.png`)

Nova `<section>` **depois** do hero, não dentro dele. Espelha o rodapé de prova do mockup.

- Separada do hero por `border-b border-border/40` no hero + `bg-secondary/30` na banda (o mockup mostra uma tonalidade ligeiramente distinta do hero).
- Grelha `grid grid-cols-2 gap-6 sm:grid-cols-4 sm:divide-x sm:divide-border/40`. Sem `text-center`: alinhamento à esquerda.
- Cada item: `flex items-start gap-3` — ícone (`text-primary`, `h-5 w-5`, `shrink-0`) e coluna de texto.
  - Ordem invertida face ao actual: **label em cima** (`text-sm text-muted-foreground`), **valor em baixo** (`font-display text-2xl font-bold text-foreground tabular-nums`).
- Ícones: `statWinRate` → `Target`, `statAvgRR` → `BarChart3`, `statMonitoring` → `Calendar`, `statPairs` → `Users`. Todos existem no lucide-react 0.462 e `Target`/`BarChart3` já são importados em `Index.tsx:5`.
- Estrutura os stats como array de `{ icon, label, value }` para o `displayStats` deixar de ser `{ value, label }`.
- Mobile: `grid-cols-2`, sem divisores verticais; `sm` em diante 4 colunas com divisores.
- Zero chaves novas.

### 4.5 Motion

- Todas as animações infinitas do hero são removidas (orbes, `ping`).
- Entrada *one-shot*: `opacity`/`y` com stagger de 60 ms nos 5 blocos de texto, e a barra de confiança a crescer uma vez.
- `useReducedMotion()` do framer-motion desliga o movimento.

### 4.6 i18n

**Zero chaves novas.** Reutilizar apenas chaves existentes e verificadas nos 14 locales:

- `inicio.heroBadge`, `inicio.heroTitle1`, `inicio.heroTitle2`, `inicio.heroSubtitle`, `inicio.heroCtaLive`, `inicio.heroCtaPlans`
- `inicio.statWinRate`, `inicio.statAvgRR`, `inicio.statMonitoring`, `inicio.statPairs`
- `sinal.entry`, `sinal.stopLoss`, `sinal.takeProfit`, `sinal.confidence`, `sinal.probability`, `sinal.riskReturn`, `sinal.expiresIn`
- `components.signalCard.viewFull`

## 5. Ficheiros

| Ficheiro | Acção |
|---|---|
| `src/components/home/HeroSignalTerminal.tsx` | novo |
| `src/pages/Index.tsx` | editar — apenas o hero (linhas 57-120) |

## 6. Riscos

### 6.1 `useLivePrices` faz fetch a APIs externas
`frankfurter.app` / `coingecko.com` a partir do browser. Mitigado: o preço é a única parte opcional do card; se falhar, degrada para a `entry` do sinal sem layout shift. Os valores do `SignalCard` nunca são usados como fallback de "preço ao vivo" sem label.

### 6.2 Web não tem test runner
`package.json` não define `test` nem tem vitest/jest (o jest só existe em `mobile/`). O helper `pickHeroSignal` é escrito como função pura exportada para ficar testável quando o runner existir. Verificação desta iteração é lint + typecheck + build + inspecção visual.

### 6.3 Sem gráfico no hero (decisão deliberada)
`TradingViewChart.tsx` injecta um script externo, carrega 5 studies + toolbar completa e tem `theme: "dark"` hardcoded. No hero custaria +1s de rede, quebraria o light theme e roubaria o foco. Um sparkline SVG seria dado falso. Fica para v2.

## 7. Critérios de aceitação

1. `magic-bg.svg`, os orbes `blur-3xl` e o `animate-ping` não existem no hero.
2. Não há gradiente em texto no H1; o primário é `variant="default"`.
3. O terminal mostra um sinal real: par, direção, preço, Entrada/SL/TP, R:R e probabilidade.
4. Nenhum número aparece sem fonte real — sem sinal, o painel diz que não há sinal.
5. Zero chaves de i18n novas; nenhum locale alterado.
6. `npx tsc -b --noEmit` sai limpo.
7. `npx eslint src/pages/Index.tsx src/components/home/HeroSignalTerminal.tsx` → exit 0 e `0 errors`. Os 3 warnings `react-refresh/only-export-components` nos helpers puros são esperados (padrão já presente em 8 ficheiros do projecto, `eslint.config.js:22` define a regra como `"warn"`).
8. `npm run build` conclui.
9. Inspecção visual a 1440×900 (dark e light) e 390×844 (mobile): sem overflow horizontal, sem layout shift no carregamento, hierarquia legível.
10. Banda de stats abaixo do hero com os 4 ícones, label acima do valor e divisores verticais a partir de `sm`, conforme `lod.png`.
11. O resto do Home não mudou (para além da nova banda de stats).
