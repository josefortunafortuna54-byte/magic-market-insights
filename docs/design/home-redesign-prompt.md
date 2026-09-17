# Redesign do Home — Brief + Prompt para o Designer de UI

> **Objetivo:** tornar a página inicial (Home) do **The Magic Trader** mais **profissional e corporativa**, mantendo a identidade da marca (logotipo escudo verde/dourado), mas deixando o visual sóbrio, confiável e de nível **fintech enterprise** (referência: TradingView, Bloomberg, Vanguard, Interactive Brokers).

---

## 1. Contexto do projeto

- **Produto:** The Magic Trader — análise inteligente de Forex com sinais (SMC/ICT), horários "Hora do Boom", comunidade premium, banca e planos (Free/Basic/Pro/Premium).
- **Stack web:** Vite + React + Tailwind + shadcn/ui + Framer Motion. Existe também o app mobile (Expo) — o redesign do Home web deve manter paridade visual com o mobile.
- **Deploy:** `magic-market-insights.vercel.app`.

## 2. Identidade da marca (tokens atuais)

| Token | Valor (à escala) | Aprox. Hex | Uso |
|---|---|---|---|
| Verde primary | `hsl(142 70% 45%)` | `#22C35D` | Ação principal, sucesso, CTA |
| Dourado accent | `hsl(43 96% 52%)` | `#FAB80F` | Prémios, badges premium, destaque |
| Roxo magic | `hsl(270 80% 40%)` | `#6614B8` | Gradientes decorativos (usar com muito critério) |
| Fundo dark (default) | `hsl(240 25% 4%)` | `#08060A` | Depois do redesign: manter escuro, mas mais limpo |
| Fundo claro | `hsl(0 0% 100%)` | `#FFFFFF` | Tema light deve ser suportado igualmente bem |
| Superfícies/cards | `hsl(250 20% 7%)` | `#0D0A12` | Menos "vidro mágico", mais "painel financeiro" |
| Texto secundário | `hsl(215 20% 58%)` | `#8B93A7` | Metadados, labels |
| Border | `hsl(260 30% 18%)` | `#2D2640` | Contornos subtis |

**Tipografia:**
- Display/títulos: **Space Grotesk** (Bold 700).
- Corpo/UI/dados: **Inter** (Regular 400 / Medium 500 / SemiBold 600).
- Números/dados: **tabular-nums** (font-variant-numeric), alinhamento mono-like para cotações.

**Logo:** escudo verde/dourado (ficheiro `logo.png`, efeito `logo-glow`). Deve estar presente no hero e na navbar.

## 3. Pontos fracos do visual atual (porquê não parece profissional/corporativo)

1. **Efeitos "mágicos" excessivos:** orbes flutuantes animados (blur-3xl em movimento), estrelas/partículas, glows de arco-íris (verde→roxo→dourado) em texto (`gradient-magic`), sombras `drop-shadow` coloridas no logo.
2. **Fundo decorativo pesado:** camadas de `magic-bg.svg` com opacity 0.6 + gradientes — deriva para visual "game/mystic", não financeiro.
3. **Glass cards sem hierarquia:** todos os cards têm o mesmo tratamento de vidro/brilho; falta profundidade por importância (hero stats vs signal cards vs features).
4. **Hero sem prova social de dados:** os stats (win rate, RR, 24/7, pares) estão soltos numa strip; um dashboard/preview real deixaria o produto credível.
5. **Animações constantes:** ping, flutuação infinita, hover glow — corporativo pede movimento **reactivo a interação** (nomeadamente no scroll), não movimento amb!
6. **Espaçamentos desiguais:** `py-24` fixos, falta uma grelha vertical proporcional (8pt) e alinhamento horizontal consistente.
7. **Títulos CTA genéricos:** falta tom institucional ("Análise Inteligente de Forex com sinais validados", "Para quem gere risco a sério").

## 4. Direção de design alvo — "Premium Institutional"

- **Sóbrio e confiável:** fundo escuro profundo, quase preto azulado; superfícies em tons neutros com **apenas um acento verde** para CTA/estado e **dourado reservado** para premium/win-rate.
- **Hierarquia tipográfica:** hero enorme (‹72px), secções bem tituladas, labels em caps small.
- **Grelha rígida:** margens consistentes (container 1200–1280px), colunas de 12, espaçamentos de 8pt.
- **Dados primeiro:** incluém dashboards/previews reais (preço ao vivo, gráfico, stats) em vez de decoração.
- **Linhas finas, sombras suaves:** `1px` borders com opacidade baixa, sombra difusa sem glow colorido; glow só como feedback de hover (seletor/limite).
- **Acessível em light e dark.**
- **Motion:** reveal/parallax suave por scroll, sem loop infinito decorativo.

## 5. Layout alvo do Home (por secção)

1. **Navbar:** fixa, transparente→sólida ao scroll, logo + links (Análises, Sinais, Banca, Planos) + login/registar + badge "PRO".
2. **Hero:** duas colunas —
   - **Esquerda:** badge "Sinais em tempo real · SMC/ICT", H1 forte, subtítulo, 2 CTAs (primário verde "Ver análises ao vivo", ghost "Conhecer planos"), mini-stats inline (win rate, RR médio, pares seguidos).
   - **Direita:** **card de sinal real** (par, direção BUY/SELL, entrada, SL, TP, RR, estado, hora) num painel tipo trading terminal, com fundo chart sutil (candles verdes/vermelhas em linhas finas).
3. **Barra de métricas / trust bar:** 4 stats com números grandes em tabular-nums, separadas por linhas verticais (TradingView style).
4. **Próxima Boom + Performance:** 2 cards sóbrios — countdown computado e win-rate atual; dourado apenas para "BOOM".
5. **Features:** grelha de 4, ícones em recipientes neutros (não coloridos), títulos curtos + descrição de 1 linha.
6. **Sinais em destaque:** grelha 3 cards de sinal (igual à do terminal, sóbrios), botão "Ver todos".
7. **Como funciona:** 3 passos numerados 01/02/03 em linha com linha conectora.
8. **CTA final:** painel com gradiente subtil verde, título + 2 botões, sem decoração mística.

## 6. Checklist de implementação (developer)

- [ ] Substituir orbes/partículas animadas por gradiente estático limpo (`radial-gradient` vs `linear-gradient`) e remover ping/loop infinito do hero.
- [ ] Converter hero para layout 2 colunas (texto | terminal de sinal).
- [ ] Aplicar `grid-cols-12` e container `max-w-7xl` consistente em todas as secções.
- [ ] Unificar paddings verticais (ex.: `py-20 lg:py-28`).
- [ ] Amaciar `glass-card`: reduzir blur/brilho, aumentar contraste de texto, sombra neutra única.
- [ ] Cores: manter verde `--primary` e dourado `--accent`; reduzir uso de `--gradient-magic` e `--shadow-glow-magic` nas telas públicas.
- [ ] Manter paridade com o mobile (mesmas cores/labels; usar i18n `t(keys)` já existentes).
- [ ] Verificar light theme e RTL (o site já tem suporte).

## 7. Critérios de aceitação

- Home parece uma **plataforma financeira institucional**, não um site "game/mystic".
- O card de sinal/terminal é o **elemento focal** do hero (sem `excesso de decoração em volta).
- Números (win rate, RR, pares) credíveis, tabular, sem "datas falsas" óbvias.
- Consistência com as páginas internas atuais (Análises/Histórico/Banca).
- Funciona em dark e light, desktop e mobile.
- Sem texto/lorem inventado como conteúdo real no mockup (pode usar placeholders claramente decorativos).

---

## 8. 🎯 Prompt perfeito para o designer (copiar e colar — EN)

```
High-fidelity UI design mockup of a landing page home screen for "The Magic Trader",
a professional Forex signal analysis platform (SMC/ICT trading signals, live prices, premium plans).

STYLE: Premium institutional fintech (reference: TradingView, Bloomberg Terminal, Vanguard, Interactive Brokers).
Sober, trustworthy, corporate. NOT gaming, NOT mystical, NOT playful. No neon, no magic particles.

TONE: dark theme, ultra-deep near-black navy background (#08060A), subtle very dark surfaces (#0D0A12),
fine 1px borders (#2D2640 at ~50% opacity), soft diffuse shadows (no colored glow).
Single strong accent color: vivid green (#22C35D) reserved for CTAs, live/dot indicators, BUY signals and
positive numbers. Gold (#FAB80F) ONLY for premium badges and the "BOOM" highlight.
Secondary text in desaturated blue-grey (#8B93A7).

TYPOGRAPHY: headings in Space Grotesk bold, body in Inter. Large crisp headline hierarchy,
uppercase small labels with generous letter-spacing for section tags. Numbers in tabular/monospace style.

LAYOUT (desktop 1440 x 900, full-bleed, one screen):
- Top: fixed slim navbar, transparent with a subtle border; logo (green/gold shield mark) left,
  nav links (Analises, Sinais, Banca, Planos), right side: "Entrar" ghost button + filled green "PRO" badge button.
- Hero split into two columns:
  LEFT: small live pill ("Sinais em tempo real — SMC/ICT" with a pulsing green dot),
  bold 48-64px headline (two lines: white first line + gradient green-to-green second line, e.g. "Análise Inteligente de Forex"),
  one-line muted subtitle, two CTA buttons below (filled green "Ver análises ao vivo" + outlined "Conhecer planos"),
  then a single thin row of micro-stats (win rate %, avg RR 1:2.5, pairs 22+).
  RIGHT: a single "trading terminal" card — dark panel, thin border, header row with pair name (e.g. EUR/USD)
  and a green BUY tag; body shows a subtle candlestick chart (thin green/red candles, clean grid lines);
  below it 4 compact rows: Entrada, Stop Loss, Take Profit, R:R (green value). NO decorative blobs around it.
- Below hero: a trust/metrics bar with 4 large tabular numbers separated by thin vertical dividers
  (Win rate, R:R médio, Monitorização, Pares seguidos).
- The rest of the page should feel like a clean corporate landing: a 4-card features grid (icons in
  neutral rounded containers), a 3-up signal cards row, a numbered 3-step "how it works" section with
  a thin connecting line, and a final CTA band with a very subtle green gradient.

ICONOGRAPHY: thin stroke line icons (1.5px), monochromatic, no colorful icon backgrounds.

TEXT: use realistic European-Portuguese copy for titles/buttons ("Ver análises ao vivo", "Conhecer planos",
"Win rate", "R:R médio", "Entrada", "Stop Loss", "Take Profit", "Sinais em tempo real"). Body filler may be
clearly decorative grey bars. Do NOT invent fake company claims, logos of other companies, or copyright marks.

MOOD: calm, precise, premium, bank-grade; generous whitespace, aligned to a strict 8pt grid;
professional sliders of confidence, NOT excitement.

NEGATIVE: no glassmorphism overload, no rainbow gradients, no purple/blue neon glow, no stars, no sparkles,
no cartoon characters, no 3D, no clutter, no watermark, no browser chrome, no mobile frame.
```

---

## 9. Variação: prompt só do HERO (se quiser iterar só no topo)

Usar o mesmo bloco acima, mas substituir o parágrafo LAYOUT por:

```
LAYOUT (desktop 1440 x 900, hero only):
Split hero. LEFT: live pill with pulsing green dot, big bold headline (white + green accent),
one muted subtitle, two CTAs (filled green + outlined), thin micro-stats row.
RIGHT: single dark "trading terminal" card with EUR/USD header + green BUY tag, subtle candlestick
chart with clean gridlines, and 4 compact metric rows (Entrada / Stop Loss / Take Profit / R:R).
Clean deep-navy background with ONE very subtle centered radial green-grey gradient, maximum 10% opacity.
No floating orbs, no particles, no glow halos. Minimal, bank-grade, corporate.
```

---

## 10. Dicas de uso do prompt

1. Cole o bloco da secção 8 (ou 9) no gerador (ChatGPT Image / DALL·E / Midjourney / Ideogram).
2. Se a resposta vier com texto errado: peça "render all text EXACTLY as given, no extra letters".
3. Para fidelidade da marca, anexe ao prompt uma imagem do logo real (`logo.png`) — o designer mantém o escudo verde/dourado.
4. Depois de aprovar o mock, guarde como referência em `docs/design/` e execute o checklist da secção 6 na implementação.