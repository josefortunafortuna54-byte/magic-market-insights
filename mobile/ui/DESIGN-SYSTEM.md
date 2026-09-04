# DESIGN SYSTEM — The Magic Trader (Mobile)

## 1. PALETA DE CORES

| Hex | Uso |
|---|---|
| `#2C2C5E` | Fundo principal (cards escuros), tom azul-marinho profundo |
| `#16A43A` | Verde primário — sinais BUY, barras de confiança, badges de sucesso |
| `#FFC915` | Dourado/Amarelo — accents premium, CTA principal, badges de destaque |
| `#108BB1` | Azul secundário — links, elementos interativos neutros |
| `#1F2937` | Cinza escuro — fundo de cards, bordas, separators |
| `#0BDF19` | Verde neon — indicadores de preço ativo, alertas ao vivo, badges AO VIVO |

### Fundos
- **Background geral:** `#0A0A14` (quase preto com leve tom azulado)
- **Cards:** `#1A1A2E` ou `#1F2937` com borda `#2C2C5E` 1px ou efeito glass (blur + opacidade 10-15%)
- **Cards premium/dourados:** fundo `#FFC91510` (dourado 6% opacidade) + borda `#FFC91540` (dourado 25%)

### Textos
- **Títulos:** branco puro `#FFFFFF`
- **Corpo:** `#E5E7EB` (cinza claro)
- **Muted/Secundário:** `#9CA3AF` (cinza médio)
- **Links/Ações:** `#108BB1`
- **Sucesso/BUY:** `#16A43A`
- **Erro/SELL/SL:** `#EF4444` (vermelho)
- **Aviso/Neutro:** `#FFC915`

### Badges
- **BUY/Ativo:** fundo `#16A43A20`, texto `#16A43A`, borda `#16A43A`
- **SELL:** fundo `#EF444420`, texto `#EF4444`, borda `#EF4444`
- **AO VIVO:** fundo `#0BDF1920`, texto `#0BDF19`, borda `#0BDF19`, pode pulsar
- **Premium:** fundo `#FFC91520`, texto `#FFC915`, borda `#FFC915`
- **Neutro/Inativo:** fundo `#37415120`, texto `#9CA3AF`, borda `#374151`

---

## 2. TIPOGRAFIA

| Uso | Fonte | Peso | Tamanho |
|---|---|---|---|
| Títulos de tela (H1) | Space Grotesk | Bold (700) | 28-32px |
| Títulos de seção (H2) | Space Grotesk | SemiBold (600) | 22-24px |
| Subtítulos (H3) | Space Grotesk | Medium (500) | 18-20px |
| Corpo (Body) | Inter | Regular (400) | 14-16px |
| Labels/Botões | Inter | SemiBold (600) | 12-14px |
| Small/Caption | Inter | Regular (400) | 11-12px |
| Números grandes (preço) | Space Grotesk | Bold (700) | 36-40px |
| Mono (preços/tickers) | JetBrains Mono ou Space Mono | Regular | 14px |

---

## 3. ÍCONES

Usar **lucide-react-native** ou **@expo/vector-icons** (Ionicons).

### Ícones padrão do app:
| Função | Ícone |
|---|---|
| Início/Home | `home` |
| Análises/Gráficos | `trending-up` ou `bar-chart-2` |
| Horários | `clock` ou `calendar` |
| Comunidade | `users` ou `people` |
| Perfil | `user` |
| Sinal BUY | `arrow-up-circle` |
| Sinal SELL | `arrow-down-circle` |
| Favorito | `star` (filled/outlined) |
| Compartilhar | `share-2` |
| Seta voltar | `chevron-left` |
| Seta avançar | `chevron-right` |
| Fechar | `x` |
| Busca | `search` |
| Filtro | `filter` |
| Configurações | `settings` |
| Sino/Notificação | `bell` |
| Alarme | `alarm` ou `bell-ring` |
| Trava (premium) | `lock-closed` |
| Desterro | `trash-2` |
| Editar | `edit-2` ou `pencil` |
| Adicionar | `plus` |
| Play áudio | `play` |
| Pausar áudio | `pause` |
| Microfone | `mic` |
| Gráfico | `activity` |
| Estatísticas | `bar-chart` |

---

## 4. ESTILO VISUAL

### Fundo Geral
- Cor sólida `#0A0A14`
- Sem gradientes no background principal

### Cards
- Borda arredondada: `borderRadius: 16-20px`
- Borda: `1px solid #2C2C5E` ou sem borda
- Sombra: nenhuma (ou leve glow verde/dourado em cards premium)
- Efeito glass: `backgroundColor: rgba(26, 26, 46, 0.8)` com `backdropBlur` quando suportado
- Padding interno: `16-20px`

### Botões
- **Primário (Verde):** fundo `#16A43A`, texto branco, borda `borderRadius: 12px`, padding vertical `14px`, padding horizontal `24px`
- **Primário (Dourado):** fundo `#FFC915`, texto `#1A1A2E` (escuro), borda `borderRadius: 12px`
- **Secundário/Outline:** fundo transparente, borda `1px solid #FFC915`, texto `#FFC915`
- **Ghost:** fundo transparente, texto `#9CA3AF`
- **Perigo:** fundo `#EF4444`, texto branco
- Todos os botões: `fontWeight: 600`, `fontSize: 14px`, `borderRadius: 12px`
- Altura mínima: `48px`

### Chips/Filtros
- Forma: pill (`borderRadius: 999px`)
- Fundo ativo: `#FFC915` (dourado), texto escuro `#1A1A2E`
- Fundo inativo: `#1F2937`, texto `#9CA3AF`
- Padding: `8px 16px`
- Gap entre chips: `8px`

### Ícones neon
- Efeito glow leve: `textShadow: 0 0 8px rgba(11, 223, 25, 0.4)`
- Cores: `#0BDF19` (neon verde) ou `#FFC915` (neon dourado)

### Barras de progresso/Confiança
- Track: `#1F2937`
- Fill: gradiente de `#EF4444` (0%) → `#FFC915` (50%) → `#16A43A` (100%)
- Altura: `6-8px`, borda `borderRadius: 4px`

### Tabs/Navigation Bar
- Fundo: `#0A0A14` com borda top `1px solid #1F2937`
- Ícone ativo: `#16A43A` (verde) ou `#FFC915` (dourado)
- Ícone inativo: `#6B7280`
- Label ativo: mesma cor do ícone, `fontSize: 11px`, `fontWeight: 600`
- Label inativo: `#6B7280`
- 5 itens: Início, Análises, Horários, Comunidade, Perfil

### Animações
- Transições: 200-300ms ease-in-out
- Loading: skeleton com gradiente shimmer (#1F2937 → #374151 → #1F2937)
- Pull-to-refresh: spinner verde
- Cards aparecendo: fade-in + slide-up leve

### Header
- Fundo: `#0A0A14` (transparente ou mesma cor do bg)
- Título centralizado ou à esquerda
- Ícone de ação à direita (estrela, compartilhar, etc.)
- Sombra: nenhuma
- Altura: ~56px

### Status bar
- Light (textos brancos sobre fundo escuro)

---

## 5. LAYOUT GERAL

### Espaçamento
- Page padding horizontal: `20px`
- Gap entre cards: `12-16px`
- Gap entre seções: `24-32px`
- Seção header gap: `8px` entre título e subtítulo

### Largura
- Full width (mobile-first)
- Cards: `100%` da largura disponível
- Botões: `100%` ou `auto` conforme contexto

### Bordas arredondadas
- Cards grandes: `20px`
- Cards pequenos/badges: `12px`
- Chips/pills: `999px`
- Botões: `12px`
- Avatar: `50%` (circular)
