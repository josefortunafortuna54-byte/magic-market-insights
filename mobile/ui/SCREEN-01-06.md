# TELAS 01-06 — The Magic Trader (Mobile)

---

## TELA 01: SPLASH / BOAS-VINDAS

### Layout
- Fundo: gradiente escuro `#0A0A14` → `#0D0D1A`
- Centro da tela: logo + texto + CTA
- Sem header, sem tab bar

### Elementos (de cima para baixo)

#### Logo (centro, topo 30%)
- Imagem: logo "THE MAGIC TRADER" com chapéu de mago e linhas de gráfico
- Largura: ~200px, altura proporcional
- Efeito glow verde leve atrás do logo

#### Tagline (abaixo do logo)
- Texto: `Análise inteligente. Entradas estratégicas.`
- Fonte: Inter Regular 14px
- Cor: `#9CA3AF`
- Alinhamento: centro
- Margin top: 12px

#### CTA Button (centro, abaixo da tagline)
- Fundo: `#16A43A`
- Texto: branco, Inter SemiBold 14px
- Label: `Começar` ou `Entrar`
- BorderRadius: 12px
- Largura: 70% da tela
- Altura: 48px
- Margin top: 32px

#### Link secundário (abaixo do CTA)
- Texto: `Já tenho conta? Entrar`
- Cor: `#108BB1`
- Fonte: Inter Regular 13px
- Margin top: 16px

### Notas
- Tela de loading que transiciona para Landing após 2-3s ou após toque no CTA
- Animação: logo faz fade-in + scale de 0.8 → 1.0 em 500ms

---

## TELA 02: LANDING (Login/Cadastro)

### Layout
- Fundo: `#0A0A14`
- Header: logo pequeno à esquerda, ícone de notificação à direita
- Conteúdo scrollável verticalmente
- Tab bar no fundo

### Header (topo)
- Logo "THE MAGIC TRADER" (versão compacta, ~120px largura)
- À direita: ícone `bell` (notificação) branco 20px

### Seção Principal (centro)

#### Título
- Texto: `Análises de Forex com IA e Precisão`
- Fonte: Space Grotesk Bold 24px
- Cor: `#FFFFFF`
- Alinhamento: centro
- Margin horizontal: 32px

#### Descrição
- Texto: `Sinais inteligentes, gestão de banca e comunidade ativa para traders que buscam consistência.`
- Fonte: Inter Regular 14px
- Cor: `#9CA3AF`
- Alinhamento: centro
- Margin top: 12px
- Margin horizontal: 24px

#### Lista de Features (com checkmarks)
- Margin top: 24px
- Cada item: ícone check verde `#16A43A` 16px + texto branco Inter 14px
- Itens:
  1. `Sinais gerados por IA`
  2. `Análises multi-timeframe`
  3. `Comunidade & Hora do Boom`
  4. `Gestão de banca e capital`
- Gap entre itens: 12px
- Alinhamento: centro

#### Stats Row (3 cards lado a lado)
- Margin top: 28px
- Layout: 3 cards iguais, `flex: 1`, gap 12px
- Cada card:
  - Fundo: `#1F2937`
  - BorderRadius: 12px
  - Padding: 12px
  - Valor: Space Grotesk Bold 20px `#FFC915`
  - Label: Inter Regular 11px `#9CA3AF`
  - Alinhamento: centro
- Valores: `+10K` / `85%` / `50%`
- Labels: `Utilizadores ativos` / `Taxa de acerto` / `Retornos/mês`

#### Botão "Ver análises" (primário)
- Fundo: `#16A43A`
- Texto: branco Inter SemiBold 14px
- BorderRadius: 12px
- Largura: 100%
- Altura: 48px
- Margin top: 28px

#### Botão "Ver planos" (outline)
- Fundo: transparente
- Borda: 1px `#FFC915`
- Texto: `#FFC915` Inter SemiBold 14px
- BorderRadius: 12px
- Largura: 100%
- Altura: 48px
- Margin top: 12px

#### Link "Explorar como convidado"
- Texto: `Explorar como convidado`
- Cor: `#9CA3AF`
- Fonte: Inter Regular 13px
- Margin top: 16px
- Alinhamento: centro

#### Pagination Dots
- Margin top: 24px
- 3 dots: ativo `#FFC915` 8px, inativos `#374151` 6px
- Gap: 8px
- Alinhamento: centro

### Tab Bar (fixo no fundo)
- 5 itens: Início (home), Análises (trending-up), Horários (clock), Comunidade (users), Perfil (user)
- Fundo: `#0A0A14` borda top `#1F2937`
- Ícone ativo: `#16A43A`
- Ícone inativo: `#6B7280`
- Label: 11px, mesma cor do ícone

---

## TELA 03: PAINEL DE SINAIS (Análises)

### Layout
- Header com título + ícone favorito
- Filtros (chips de timeframe + dropdown de pares)
- Lista de cards de sinais
- Tab bar no fundo

### Header
- Título: `Análises` — Space Grotesk Bold 24px branco
- Ícone à direita: `star` (favorito) dourado `#FFC915` 22px

### Filtros

#### Chips de Timeframe (horizontal)
- Layout: row, gap 8px
- Chips: M15 (ativo), H1, H4 (com ícone de trava)
- Chip ativo: fundo `#FFC915`, texto `#1A1A2E`, fontWeight 600
- Chip inativo: fundo `#1F2937`, texto `#9CA3AF`
- Chip com trava: ícone `lock-closed` 10px `#9CA3AF` ao lado do texto
- BorderRadius: 999px (pill)

#### Filtro de Pares
- Texto: `Todos os pares`
- Ícone: `chevron-down` 16px `#9CA3AF`
- Fundo: `#1F2937`
- BorderRadius: 8px
- Padding: 8px 12px
- Margin top: 12px

### Cards de Sinais (lista scrollável)
- Cada card:
  - Fundo: `#1A1A2E`
  - BorderRadius: 16px
  - Borda: 1px `#2C2C5E`
  - Padding: 16px
  - Gap entre cards: 12px

#### Conteúdo do Card (layout row + column)
- **Linha 1 (row, space-between):**
  - Esquerda: `EUR/USD` Space Grotesk Bold 16px branco + `M15` Inter Regular 12px `#9CA3AF`
  - Direita: Badge `BUY` — fundo `#16A43A20`, texto `#16A43A`, fontSize 11px, fontWeight 700, padding 4px 8px, borderRadius 6px

- **Linha 2 (row, space-between):**
  - Esquerda: `1.0856` Space Grotesk Bold 24px branco
  - Direita: `Ativo` badge — fundo `#16A43A20`, texto `#16A43A`

- **Linha 3 (row, space-between):**
  - Esquerda: `Confiança 78%` Inter 13px `#9CA3AF`
  - Direita: `RR 1:2.1` Inter 13px `#9CA3AF`

- **Linha 4 (row, gap 8px):**
  - `SL 1.0820` — badge pequeno, fundo `#EF444420`, texto `#EF4444`, fontSize 11px
  - `TP 1.0895` — badge pequeno, fundo `#16A43A20`, texto `#16A43A`, fontSize 11px

- **Barra de confiança (opcional):**
  - Track: `#1F2937`, height 4px, borderRadius 2px
  - Fill: gradiente `#EF4444` → `#FFC915` → `#16A43A` conforme %
  - Width: `${confiança}%`

#### Variações de Card
- **BUY:** badge verde, preço com ícone `arrow-up-circle` verde
- **SELL:** badge vermelho, preço com ícone `arrow-down-circle` vermelho
- **AGUARDAR:** badge amarelo/dourado

### Notas
- Lista scrollável com `FlatList` ou `ScrollView`
- Pull-to-refresh: spinner verde
- Cards aparecem com animação fade-in + slide-up

---

## TELA 04: DETALHE DO SINAL

### Layout
- Header com botão voltar + compartilhar
- Card principal com dados do sinal
- Seção de análise técnica
- Resumo da análise
- Botão "Ver gráfico"
- Sem tab bar (tela de detalhe)

### Header
- Botão voltar: ícone `chevron-left` 24px branco à esquerda
- Título: par + timeframe (ex: `EUR/USD M15`)
- Botão compartilhar: ícone `share-2` 20px branco à direita

### Card Principal

#### Par + Sinal
- Row: `EUR/USD` Space Grotesk Bold 28px branco
- Badge `BUY` ao lado: fundo `#16A43A`, texto branco, fontWeight 700, borderRadius 8px, padding 6px 12px
- Badge `Ativo` abaixo: fundo `#16A43A20`, texto `#16A43A`

#### Preço de Entrada
- Label: `Preço de Entrada` Inter 12px `#9CA3AF`
- Valor: `1.0856` Space Grotesk Bold 36px branco
- Margin top: 8px

#### Barra de Confiança
- Label: `Confiança 78%`
- Barra: track `#1F2937`, fill `#16A43A`, height 8px, borderRadius 4px
- Width: 78%

#### Métricas (3 colunas)
- Layout: row, space-between
- Cada métrica:
  - Label: Inter 11px `#9CA3AF`
  - Valor: Space Grotesk SemiBold 16px branco
- Valores:
  - `SL` → `1.0820`
  - `TP` → `1.0895`
  - `RR` → `1:2.1`

### Seção "Análise Técnica"
- Título: `Análise Técnica` Inter SemiBold 14px branco
- Layout: wrap de badges (chips)
- Cada badge:
  - Fundo: `#1F2937`
  - Texto: Inter 12px `#E5E7EB`
  - Padding: 6px 10px
  - BorderRadius: 8px
  - Indicadores: `RSI`, `EMA 20/50`, `MACD`, `Bollinger`, `Ichimoku`
  - Nível ao lado: `Alta` (verde), `Média` (amarelo), `Baixa` (vermelho)

### Seção "Resumo da Análise"
- Título: `Resumo da Análise` Inter SemiBold 14px branco
- Texto: `Tendência de alta confirmada com rompimento de resistência e forte momentum comprador.`
- Fonte: Inter Regular 14px `#E5E7EB`
- Margin top: 8px
- Line-height: 1.5

### Botão "Ver gráfico"
- Fundo: `#16A43A`
- Texto: branco Inter SemiBold 14px
- Ícone: `bar-chart-2` à esquerda
- BorderRadius: 12px
- Largura: 100%
- Altura: 48px
- Margin top: 20px

---

## TELA 05: GRÁFICO (TradingView)

### Layout
- Header com nome do par + timeframe
- Gráfico TradingView (WebView) ocupando ~60% da tela
- Indicadores abaixo do gráfico
- Sem tab bar

### Header
- Título: `EUR/USD` Space Grotesk Bold 20px branco
- Subtítulo: `M15` Inter 14px `#9CA3AF`
- Botão fechar/voltar à direita

### Gráfico
- Componente: WebView com TradingView widget
- Fundo: `#0A0A14` (transparente para combinar com tema)
- Candlesticks: verdes (`#16A43A`) para bullish, vermelhos (`#EF4444`) para bearish
- Linhas de grade: `rgba(42, 46, 57, 0.35)`
- Marcadores no gráfico:
  - Linha TP: `#16A43A` tracejada, label `TP 1.0900`
  - Linha SL: `#EF4444` tracejada, label `SL 1.0820`
  - Linha Entrada: `#FFC915` tracejada, label `Entrada`
  - Linha preço atual: `#FFFFFF` sólida

### Indicadores (abaixo do gráfico)
- Layout: row, gap 12px, scroll horizontal
- Cada indicador: pill/badge
  - Fundo: `#1F2937`
  - Texto: Inter 12px `#E5E7EB`
  - Padding: 8px 14px
  - BorderRadius: 8px
- Indicadores visíveis: `EMA 20/50`, `MACD`, `RSI`

### Notas
- Gráfico responsivo (altura ~50-60% da tela)
- Suporte a zoom (pinch) e pan (drag)
- Toolbar oculta (hide_top_toolbar, hide_side_toolbar)
- Estudos: MASimple, RSI

---

## TELA 06: HISTÓRICO

### Layout
- Header com título + ícone favorito
- Filtro de pares
- Cards de estatísticas
- Lista de sinais encerrados (TP/SL)
- Tab bar no fundo

### Header
- Título: `Histórico` — Space Grotesk Bold 24px branco
- Ícone à direita: `star` dourado `#FFC915` 22px

### Filtro de Pares
- Dropdown: `Todos os pares`
- Fundo: `#1F2937`
- BorderRadius: 8px
- Padding: 8px 12px
- Ícone: `chevron-down` `#9CA3AF`

### Cards de Estatísticas (3 cards em row)
- Layout: row, gap 8px
- Cada card:
  - Fundo: `#1A1A2E`
  - BorderRadius: 12px
  - Padding: 12px
  - Borda: 1px `#2C2C5E`
- Conteúdo:
  - Label: Inter 11px `#9CA3AF`
  - Valor: Space Grotesk Bold 20px branco (ou cor de destaque)
- Cards:
  1. `Total Sinais` → `128` (branco)
  2. `Taxa de Acerto` → `68%` (verde `#16A43A`)
  3. `Pips Totais` → `+1,250` (verde `#16A43A`)

### Lista de Sinais (scrollável)
- Cada card de sinal (simplificado):
  - Fundo: `#1A1A2E`
  - BorderRadius: 12px
  - Padding: 12px 16px
  - Borda: 1px `#2C2C5E`

#### Conteúdo do Card (row, space-between)
- **Linha 1:**
  - Esquerda: `EUR/USD` Space Grotesk SemiBold 14px branco
  - Meio: Badge `BUY` — fundo `#16A43A20`, texto `#16A43A`, fontSize 11px
  - Meio: `M15` Inter 12px `#9CA3AF`
  - Direita: Badge `TP` — fundo `#16A43A20`, texto `#16A43A`

- **Linha 2:**
  - Esquerda: `1.0820 → 1.0845` Inter 12px `#9CA3AF`
  - Direita: `12/05/2025` Inter 11px `#6B7280`

#### Variações
- **TP (Take Profit):** badge verde
- **SL (Stop Loss):** badge vermelho `#EF4444`

### Notas
- Lista scrollável
- Cada card tem borda lateral colorida (verde para TP, vermelho para SL)
- Pull-to-refresh
- Loading: skeleton cards
