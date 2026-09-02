# PAINEL ADMIN — The Magic Trader (Mobile)

---

## ACESSO

- Acessível apenas por utilizadores com email na lista `ADMIN_EMAILS`
- Acesso via tab "Admin" na tab bar (apenas visível para admins)
- Ou via rota `/admin`

---

## LAYOUT GERAL DO ADMIN

### Header
- Título: `Admin` — Space Grotesk Bold 24px branco
- Badge `Acesso restrito Administradores` abaixo do título — Inter 12px `#EF4444`

### Tabs do Admin (horizontal scroll)
- Layout: row, gap 8px, scroll horizontal
- Cada tab: pill/badge
  - Ativo: fundo `#FFC915`, texto `#1A1A2E`, fontWeight 600
  - Inativo: fundo `#1F2937`, texto `#9CA3AF`
  - BorderRadius: 999px
  - Padding: 8px 16px
- Tabs: `Dashboard`, `Sinais`, `Boom Hours`, `Boom Times`, `Posts`, `Usuários`

---

## SUB-TELA: DASHBOARD (Visão Geral)

### Cards de Estatísticas (4 cards, 2x2 grid)
- Layout: wrap, gap 12px
- Cada card:
  - Fundo: `#1A1A2E`
  - BorderRadius: 12px
  - Padding: 16px
  - Borda: 1px `#2C2C5E`
  - Largura: ~48% (2 colunas)

#### Conteúdo do Card
- Ícone colorido 20px (cada card tem cor diferente)
- Valor: Space Grotesk Bold 24px branco
- Label: Inter 12px `#9CA3AF`

#### Cards
1. **Usuários** — Ícone `users` `#108BB1` — Valor: `1,250`
2. **Sinais Hoje** — Ícone `trending-up` `#16A43A` — Valor: `25`
3. **Taxa de Acerto** — Ícone `target` `#FFC915` — Valor: `68%`
4. **Receita Mês** — Ícone `dollar-sign` `#16A43A` — Valor: `$12,450`

### Notas
- Valores são carregados via `supabase.rpc('get_users_count')` + queries diretas
- Loading: skeleton cards

---

## SUB-TELA: GERENCIAR SINAIS

### Header da Sub-tela
- Título: `Gerenciar Sinais` Inter SemiBold 16px branco

### Botões de Ação (row, gap 8px)
- Botão "Gerar Sinais":
  - Fundo: `#16A43A`
  - Texto: branco Inter SemiBold 12px
  - Ícone: `zap` à esquerda
  - BorderRadius: 8px
  - Padding: 8px 14px
- Botão "Fechar Sinais":
  - Fundo: `#EF4444`
  - Texto: branco Inter SemiBold 12px
  - Ícone: `x-circle` à esquerda
  - BorderRadius: 8px
  - Padding: 8px 14px
- Botão "Limpar & Regenerar":
  - Fundo: `#FFC915`
  - Texto: `#1A1A2E` Inter SemiBold 12px
  - Ícone: `refresh-cw` à esquerda
  - BorderRadius: 8px
  - Padding: 8px 14px

### Formulário de Novo Sinal
- Fundo: `#1A1A2E`
- BorderRadius: 12px
- Padding: 16px
- Borda: 1px `#2C2C5E`
- Margin bottom: 16px

#### Campos (2 colunas quando possível)
- **Row 1 (2 colunas):**
  - TIPO (Select/TextInput): BUY / SELL / AGUARDAR
  - CONFIANÇA % (TextInput numérico)
- **Row 2 (3 colunas):**
  - ENTRADA (TextInput numérico)
  - SL (TextInput numérico)
  - TP (TextInput numérico)
- **Row 3:**
  - RAZÕES (TextInput multiline, uma razão por linha)

#### Estilo dos Campos
- Fundo: `#0A0A14`
- Borda: 1px `#2C2C5E`
- BorderRadius: 8px
- Padding: 10px 12px
- Label: Inter 11px `#9CA3AF` (acima do campo)
- Texto: Inter 14px `#E5E7EB`
- Placeholder: `#6B7280`
- Focus: borda `#16A43A`

### Lista de Sinais (tabela scrollável)
- Cada linha:
  - Fundo: `#1A1A2E` (alternando `#1F2937` para zebrado)
  - Padding: 12px 16px
  - Borda inferior: 1px `#2C2C5E`

#### Colunas (row, space-between)
- **Par:** `EUR/USD` Inter SemiBold 13px branco
- **TF:** `M15` Inter 12px `#9CA3AF`
- **Tipo:** Badge `BUY` (verde) / `SELL` (vermelho)
- **Status:** Badge `Ativo` (verde) / `TP` (verde) / `SL` (vermelho)
- **Ações (row, gap 4px):**
  - Botão toggle TP/SL: ícone `checkmark-circle` (verde) ou `close-circle` (vermelho) 20px
  - Botão deletar: ícone `trash-outline` 18px `#6B7280`

### Notas
- Lista scrollável com max-height
- Deletar: confirmação via Alert
- Toggle TP/SL: atualiza status do sinal
- Loading: skeleton rows

---

## SUB-TELA: GERENCIAR BOOM HOURS

### Header da Sub-tela
- Título: `Gerenciar Boom Hours` Inter SemiBold 16px branco

### Formulário de Novo Horário
- Fundo: `#1A1A2E`
- BorderRadius: 12px
- Padding: 16px
- Borda: 1px `#2C2C5E`
- Margin bottom: 16px

#### Campos
- **Row 1 (2 colunas):**
  - WAT (TextInput): `09:00` placeholder
  - GMT (TextInput): `08:00` placeholder
- **Row 2 (1 coluna):**
  - VOL (TextInput numérico): volatilidade 1-10

### Lista de Horários
- Cada card:
  - Fundo: `#1A1A2E`
  - BorderRadius: 12px
  - Padding: 12px 16px
  - Borda: 1px `#2C2C5E`

#### Conteúdo
- **Row (space-between):**
  - Título: `Frankfurt Open` Inter SemiBold 14px branco
  - Badge `AO VIVO` ou `Programado` — fontSize 11px
- **Row:**
  - Horário: `07:00 - 08:00` Inter 13px `#9CA3AF`
  - Pares: `EUR/USD, GBP/USD` Inter 12px `#6B7280`
- **Ações:** ícone `trash-outline` 18px `#6B7280`

---

## SUB-TELA: GERENCIAR BOOM TIMES

### Header da Sub-tela
- Título: `Gerenciar Boom Times` Inter SemiBold 16px branco

### Lista de Boom Times
- Cada card:
  - Fundo: `#1A1A2E`
  - BorderRadius: 12px
  - Padding: 12px 16px
  - Borda: 1px `#2C2C5E`

#### Conteúdo
- **Row (space-between):**
  - Par: `London Open` Inter SemiBold 14px branco
  - Badge `AO VIVO` (verde) ou `Programado` (cinza)
- **Row:**
  - Horário: `12:00 - 14:00` Inter 13px `#9CA3AF`
- **Ações (row, gap 4px):**
  - Botão resultado: `BUY` (verde) / `SELL` (vermelho) / `NEUTRO` (cinza)
  - Botão deletar: `trash-outline` 18px `#6B7280`

---

## SUB-TELA: GERENCIAR POSTS

### Header da Sub-tela
- Título: `Gerenciar Posts` Inter SemiBold 16px branco

### Botão "Novo Post"
- Fundo: `#16A43A`
- Texto: branco Inter SemiBold 12px
- Ícone: `plus` à esquerda
- BorderRadius: 8px
- Padding: 8px 14px

### Lista de Posts
- Cada card:
  - Fundo: `#1A1A2E`
  - BorderRadius: 12px
  - Padding: 12px 16px
  - Borda: 1px `#2C2C5E`
  - Layout: row

#### Conteúdo
- **Imagem (miniatura):**
  - 48x48px, borderRadius 8px
  - Fundo: `#1F2937`
- **Informações (flex: 1):**
  - Título: `Análise do GBP/USD` Inter SemiBold 14px branco
  - Subtítulo: `Publicado` Inter 12px `#16A43A`
- **Ações:** ícone `trash-outline` 18px `#6B7280`

---

## SUB-TELA: USUÁRIOS

### Header da Sub-tela
- Título: `Usuários` Inter SemiBold 16px branco

### Tabela de Usuários (scrollável)
- Cada linha:
  - Fundo: `#1A1A2E` (alternando `#1F2937`)
  - Padding: 12px 16px
  - Borda inferior: 1px `#2C2C5E`

#### Colunas (row, space-between)
- **Email:** `premium@exemplo.com` Inter 13px `#E5E7EB`
- **Plano:** Badge `Premium` (dourado) ou `Grátis` (cinza)
- **Status:** Badge `Ativo` (verde) ou `Inativo` (vermelho)

### Notas
- Lista scrollável
- Dados carregados via `supabase.rpc('get_all_users')`
- Loading: skeleton rows

---

## ESTILOS COMUNS DO ADMIN

### Cards de Estatística
- Fundo: `#1A1A2E`
- BorderRadius: 12px
- Padding: 16px
- Borda: 1px `#2C2C5E`
- Sombra: nenhuma

### Tabelas
- Header da tabela: `#1F2937`, texto `#9CA3AF` Inter SemiBold 11px
- Rows: `#1A1A2E` / `#1F2937` alternado
- Celulas: padding 12px 16px
- Bordas: 1px `#2C2C5E` entre linhas

### Botões de Ação
- Primário (verde): `#16A43A`
- Perigo (vermelho): `#EF4444`
- Aviso (dourado): `#FFC915`
- Todos: borderRadius 8px, padding 8px 14px, Inter SemiBold 12px

### Badges de Status
- Ativo/BUY: fundo `#16A43A20`, texto `#16A43A`
- Inativo/SELL: fundo `#EF444420`, texto `#EF4444`
- Neutro: fundo `#37415120`, texto `#9CA3AF`
- Premium: fundo `#FFC91520`, texto `#FFC915`
- AO VIVO: fundo `#0BDF1920`, texto `#0BDF19`

### Formulários
- Fundo do formulário: `#1A1A2E`
- Fundo dos inputs: `#0A0A14`
- Borda dos inputs: `#2C2C5E`
- Borda focus: `#16A43A`
- Label: Inter 11px `#9CA3AF`
- Placeholder: `#6B7280`
- Texto: Inter 14px `#E5E7EB`
- BorderRadius: 8px
- Padding: 10px 12px
