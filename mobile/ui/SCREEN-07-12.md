# TELAS 07-12 — The Magic Trader (Mobile)

---

## TELA 07: GESTÃO DE BANCA

### Layout
- Header com botão voltar + título
- Card de Capital Total
- Meta de Retorno (com barra de progresso)
- Risco por Operação
- Seção de Desempenho
- Sem tab bar

### Header
- Botão voltar: `chevron-left` 24px branco
- Título: `Gestão de Banca` — Space Grotesk Bold 20px branco

### Card Capital Total
- Fundo: `#1A1A2E`
- BorderRadius: 16px
- Padding: 20px
- Borda: 1px `#2C2C5E`
- Conteúdo:
  - Label: `Capital Total` Inter 13px `#9CA3AF`
  - Valor: `10,000.00 USD` Space Grotesk Bold 28px branco
  - Margin top: 4px

### Meta de Retorno
- Fundo: `#1A1A2E`
- BorderRadius: 16px
- Padding: 20px
- Borda: 1px `#2C2C5E`
- Margin top: 12px
- Conteúdo:
  - Row (space-between):
    - Label: `Meta de Retorno` Inter 13px `#9CA3AF`
    - Ícone `x` (fechar/editar) 16px `#6B7280`
  - Valor: `50% em 1-3 meses` Space Grotesk SemiBold 16px branco
  - Barra de progresso:
    - Track: `#1F2937`, height 8px, borderRadius 4px
    - Fill: `#FFC915` (dourado), width 23%
    - Label abaixo: `23%` Inter 12px `#9CA3AF`
    - Valor: `2,300 / 10,000.00 USD` Inter 12px `#9CA3AF`

### Risco por Operação
- Fundo: `#1A1A2E`
- BorderRadius: 16px
- Padding: 20px
- Borda: 1px `#2C2C5E`
- Margin top: 12px
- Conteúdo:
  - Row (space-between):
    - Label: `Risco por Operação` Inter 13px `#9CA3AF`
    - Ícone `x` 16px `#6B7280`
  - Valor: `1%` Space Grotesk SemiBold 16px branco
  - Sub-valor: `100.00 USD` Inter 13px `#9CA3AF`

### Seção Desempenho
- Título: `Desempenho` Inter SemiBold 14px branco
- Margin top: 24px
- Fundo: `#1A1A2E`
- BorderRadius: 16px
- Padding: 16px 20px

#### Linhas de Desempenho (3 linhas)
- Cada linha: row, space-between
- Label à esquerda: Inter 14px `#9CA3AF`
- Valor à direita: Space Grotesk SemiBold 14px `#16A43A` (verde, positivo)
- Bordas entre linhas: 1px `#2C2C5E` no fundo de cada linha (exceto última)
- Padding vertical: 12px por linha
- Valores:
  - `Semanal` → `+220.50 USD`
  - `Mensal` → `+1,150.75 USD`
  - `Total` → `+2,300.00 USD`

---

## TELA 08: PLANO DE CRESCIMENTO

### Layout
- Header com botão voltar + título
- Subtítulo
- Lista de planos (3 opções)
- Seção de Projeção
- Botão "Ativar Plano"
- Sem tab bar

### Header
- Botão voltar: `chevron-left` 24px branco
- Título: `Plano de Crescimento` — Space Grotesk Bold 20px branco
- Subtítulo: `Selecione seu plano` Inter 14px `#9CA3AF` abaixo do título

### Cards de Planos (3 cards)
- Layout: column, gap 12px
- Cada card:
  - Fundo: `#1A1A2E`
  - BorderRadius: 16px
  - Padding: 16px
  - Borda: 1px `#2C2C5E`
  - **Selecionado:** borda `#16A43A` 2px, fundo `#16A43A08` (verde 3% opacidade)

#### Conteúdo do Card de Plano
- Row:
  - Ícone de rádio (circle) à esquerda:
    - Não selecionado: `#374151` (cinza)
    - Selecionado: `#16A43A` (verde) preenchido
  - Coluna:
    - Nome: Space Grotesk SemiBold 16px branco
    - Meta: `+20% em 3 meses` Inter 14px `#16A43A`
    - Descrição: `Menor risco, consistência` Inter 12px `#9CA3AF`

#### Planos
1. **Conservador** (selecionado no mockup)
   - Meta: `+20% em 3 meses`
   - Descrição: `Menor risco, consistência`
2. **Equilibrado**
   - Meta: `+35% em 2 meses`
   - Descrição: `Risco moderado`
3. **Agressivo**
   - Meta: `50% em 3 meses`
   - Descrição: `Maior retorno potencial`

### Seção Projeção
- Fundo: `#1A1A2E`
- BorderRadius: 16px
- Padding: 20px
- Margin top: 20px
- Conteúdo:
  - Título: `Projeção` Inter SemiBold 14px branco
  - 3 linhas (row, space-between):
    - `Investimento` → `10,000.00 USD`
    - `Retorno Estimado` → `15,000.00 USD` (verde `#16A43A`)
    - `Período` → `3 meses`
  - Cada linha: label Inter 14px `#9CA3AF`, valor Space Grotesk SemiBold 14px

### Botão "Ativar Plano"
- Fundo: `#16A43A`
- Texto: branco Inter SemiBold 14px
- BorderRadius: 12px
- Largura: 100%
- Altura: 48px
- Margin top: 24px

---

## TELA 09: HORÁRIO DO BOOM

### Layout
- Header com título + ícone de configurações
- Date picker/label
- Timezone
- Lista de horários (cards)
- Botão "Configurar Alarmes"
- Tab bar no fundo

### Header
- Título: `Hora do Boom` — Space Grotesk Bold 20px branco
- Ícone à direita: `settings` 20px `#9CA3AF`

### Date + Timezone (abaixo do header)
- Row:
  - Data: `12 de Maio, 2025` Inter 14px branco
  - Timezone: `WAT (UTC-1)` Inter 12px `#9CA3AF`

### Lista de Horários (cards)
- Layout: column, gap 12px
- Cada card:
  - Fundo: `#1A1A2E`
  - BorderRadius: 16px
  - Padding: 16px
  - Borda: 1px `#2C2C5E`

#### Conteúdo do Card de Horário
- **Linha 1 (row, space-between):**
  - Horário: `07:00 - 08:00` Space Grotesk SemiBold 16px branco
  - Label: `Frankfurt Open` Inter 13px `#9CA3AF`

- **Linha 2 (row):**
  - Pares: `EUR/USD, GBP/USD` Inter 12px `#9CA3AF`
  - Separador: `·` 

- **Linha 3 (row, opcional):**
  - Badge `Ativo agora` — fundo `#0BDF1920`, texto `#0BDF19`, fontSize 11px, fontWeight 700, padding 4px 8px, borderRadius 6px
  - Apenas para o horário atual

#### Horários (do mockup)
1. `07:00 - 08:00` — Frankfurt Open — EUR/USD, GBP/USD
2. `12:00 - 14:00` — London Open — Todos os pares — **"Ativo agora"**
3. `16:00 - 18:00` — NY Open — USD pares, Gold
4. `20:00 - 22:00` — Late NY Session — Menor volatilidade

### Botão "Configurar Alarmes"
- Fundo: `#16A43A`
- Texto: branco Inter SemiBold 14px
- Ícone: `bell` à esquerda
- BorderRadius: 12px
- Largura: 100%
- Altura: 48px
- Margin top: 16px

---

## TELA 10: COMUNIDADE — BOOM TIMES

### Layout
- Header com título + badge AO VIVO
- Card principal do Boom (countdown)
- Votação
- Comentários
- Input de comentário
- Tab bar no fundo

### Header
- Título: `Boom Times` — Space Grotesk Bold 20px branco
- Badge `AO VIVO` à direita:
  - Fundo: `#0BDF1920`
  - Texto: `#0BDF19`
  - Fonte: Inter Bold 11px
  - Padding: 4px 10px
  - BorderRadius: 999px
  - Borda: 1px `#0BDF19`
  - Animação: pulse (opacidade alterna)

### Card Principal do Boom
- Fundo: `#1A1A2E`
- BorderRadius: 16px
- Padding: 20px
- Borda: 1px `#2C2C5E`
- Borda lateral esquerda: 4px `#0BDF19` (neon verde)

#### Conteúdo
- **Título do Boom:** `London Open` Space Grotesk Bold 18px branco
- **Horário:** `12:00 - 14:00` Inter 14px `#9CA3AF`
- **Countdown:** `00 : 45 : 32` Space Grotesk Bold 32px `#FFC915`
  - Label: `Tempo restante` Inter 12px `#9CA3AF`
  - Layout: `HH : MM : SS` com separadores `:`

### Seção de Votação
- Título: `Qual sua direção para EUR/USD?` Inter 14px branco
- Subtítulo: `Participe da votação` Inter 12px `#9CA3AF`
- Layout: 2 botões lado a lado (row, gap 12px)

#### Botão BUY
- Fundo: `#16A43A` (quando selecionado) ou `#16A43A20` (não selecionado)
- Texto: `BUY 52%` branco Inter SemiBold 14px
- Ícone: `arrow-up-circle` branco
- BorderRadius: 12px
- Flex: 1

#### Botão SELL
- Fundo: `#EF4444` (quando selecionado) ou `#EF444420` (não selecionado)
- Texto: `SELL 48%` branco Inter SemiBold 14px
- Ícone: `arrow-down-circle` branco
- BorderRadius: 12px
- Flex: 1

### Seção de Comentários
- Título: `Comentários (24)` Inter SemiBold 14px branco
- Margin top: 20px

#### Card de Comentário
- Fundo: transparente
- Padding: 12px 0
- Borda inferior: 1px `#2C2C5E`

##### Conteúdo
- **Row (avatar + nome + tempo):**
  - Avatar: círculo 32px com iniciais ou foto
  - Nome: `TraderPro` Inter SemiBold 13px branco
  - Tempo: `Agora` Inter 11px `#6B7280`

- **Texto do comentário:**
  - `Ótima análise! Estou entrando no BUY também.` Inter 14px `#E5E7EB`
  - Margin top: 4px

- **Áudio (se houver):**
  - Player de áudio compacto:
    - Botão play/pause: círculo 32px fundo `#16A43A`, ícone branco
    - Barra de progresso: track `#1F2937`, fill `#16A43A`
    - Duração: `0:15` Inter 11px `#9CA3AF`

### Input de Comentário (fixo no fundo)
- Fundo: `#1F2937`
- BorderRadius: 24px
- Padding: 12px 16px
- Placeholder: `Comentar...` Inter 14px `#6B7280`
- Ícone microfone à direita: `mic` 20px `#9CA3AF`
- Botão enviar: `send` 20px `#16A43A` (só aparece com texto)

---

## TELA 11: PLANOS / ASSINATURA

### Layout
- Header com título + ícone favorito
- Toggle de moeda (USD / Kz)
- Card Premium
- Card Grátis
- Sem tab bar (modal ou tela dedicada)

### Header
- Título: `Planos` — Space Grotesk Bold 24px branco
- Ícone à direita: `star` dourado `#FFC915` 22px

### Toggle de Moeda
- Layout: row, centralizado
- 2 opções: `USD` | `Kz`
- Toggle style: fundo `#1F2937`, bolinha ativa `#FFC915`
- Margin top: 16px

### Card Premium
- Fundo: `#1A1A2E`
- BorderRadius: 20px
- Padding: 24px
- Borda: 2px `#FFC915` (dourado)
- Sombra leve: `0 0 20px rgba(255, 201, 21, 0.1)`

#### Conteúdo
- **Badge Premium:**
  - Fundo: `#FFC915`
  - Texto: `#1A1A2E` (escuro)
  - Fonte: Inter Bold 11px
  - Padding: 4px 12px
  - BorderRadius: 999px

- **Título:** `Premium` Space Grotesk Bold 22px branco
- **Subtítulo:** `Acesso completo` Inter 14px `#9CA3AF`

- **Preço:**
  - `US$29.99` Space Grotesk Bold 36px branco
  - `/mês` Inter 14px `#9CA3AF`

- **Lista de features (com checkmarks):**
  - Ícone check `#16A43A` 16px + texto Inter 14px `#E5E7EB`
  - Features:
    1. `8 pares Forex`
    2. `M15 + H1 + H4`
    3. `Todos indicadores`
    4. `Histórico completo`
    5. `Alertas em tempo real`
    6. `Suporte prioritário`

- **Botão "Assinar Agora":**
  - Fundo: `#FFC915`
  - Texto: `#1A1A2E` (escuro) Inter SemiBold 14px
  - BorderRadius: 12px
  - Largura: 100%
  - Altura: 48px
  - Margin top: 20px

### Card Grátis
- Fundo: `#1A1A2E`
- BorderRadius: 20px
- Padding: 24px
- Borda: 1px `#2C2C5E`
- Margin top: 16px

#### Conteúdo
- **Badge Grátis:**
  - Fundo: `#374151`
  - Texto: `#9CA3AF`
  - Fonte: Inter Bold 11px
  - Padding: 4px 12px
  - BorderRadius: 999px

- **Título:** `Grátis` Space Grotesk Bold 22px branco
- **Subtítulo:** `Recursos limitados` Inter 14px `#9CA3AF`
- **Preço:** `$0 /mês` Space Grotesk Bold 20px branco

---

## TELA 12: PERFIL / CONTA

### Layout
- Header com título + ícone favorito
- Avatar + informações do usuário
- Lista de opções (menu)
- Tab bar no fundo

### Header
- Título: `Meu Perfil` — Space Grotesk Bold 24px branco
- Ícone à direita: `star` dourado `#FFC915` 22px

### Card do Usuário
- Fundo: `#1A1A2E`
- BorderRadius: 16px
- Padding: 20px
- Borda: 1px `#2C2C5E`
- Layout: row, center

#### Avatar
- Círculo 56px
- Fundo: `#FFC915` (dourado)
- Iniciais: `TM` Space Grotesk Bold 20px `#1A1A2E`

#### Informações
- Nome: `Trader Mágico` Space Grotesk SemiBold 16px branco
- Email: `trader@themagictrader.com` Inter 13px `#9CA3AF`
- Badge: `Premium até 12/06/2025` Inter 12px `#FFC915`

### Lista de Opções (menu)
- Fundo: `#1A1A2E`
- BorderRadius: 16px
- Borda: 1px `#2C2C5E`
- Margin top: 16px

#### Cada Item de Menu
- Layout: row, space-between, center
- Padding: 16px 20px
- Borda inferior: 1px `#2C2C5E` (exceto último)
- Ícone à esquerda: 20px `#9CA3AF`
- Texto: Inter 15px `#E5E7EB`
- Seta à direita: `chevron-right` 16px `#6B7280`

#### Itens do Menu
1. Ícone `credit-card` → `Minha Assinatura`
2. Ícone `bell` → `Notificações`
3. Ícone `alarm` → `Gerenciar Alertas`
4. Ícone `shield` → `Segurança`
5. Ícone `sliders` → `Preferências`
6. Ícone `log-out` → `Sair` (cor: `#EF4444` vermelho)

### Notas
- O item "Sair" tem texto e ícone em vermelho `#EF4444`
- Outros itens têm texto branco e ícone cinza `#9CA3AF`
- Hover/press: fundo `#2C2C5E` temporariamente
