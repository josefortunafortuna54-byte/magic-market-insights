# TMT Signal System — Technical Analysis Specialist Document

> **Versão:** 2.0 — Após correções críticas  
> **Data:** 19 de Agosto de 2026  
> **Para:** Analistas técnicos, quants, e especialistas em trading algorítmico

---

## 1. Visão Geral do Sistema

O sistema de sinais do TMT ("The Magic Trader") é um pipeline **híbrido** que combina:

1. **Indicadores técnicos computados** — SMA, EMA, RSI-14, Bollinger Bands, MACD, ATR
2. **Smart Money Concepts (SMC)** — BOS, CHoCH, Order Blocks, Fair Value Gaps, Premium/Discount Zones
3. **Validação por regras** — Filtro determinista que rejeita sinais sem respaldo técnico mínimo
4. **IA generativa (Gemini)** — Gera a decisão final de BUY/SELL com entry/SL/TP

### Arquitetura

```
Dados de Mercado (Twelve Data / Binance)
        ↓
Indicadores Técnicos (computados server-side)
        ↓
Snapshot de Mercado (texto formatado)
        ↓
Gemini LLM (gera sinais em JSON)
        ↓
Validação por Regras (filter técnica, score >= 45/100)
        ↓
Buffer de Spread/Slippage
        ↓
Deduplicação
        ↓
Inserção na BD (signals table)
        ↓
Notificações Push + UI
```

---

## 2. Fontes de Dados

### 2.1 Twelve Data API (Forex + Ouro — Intraday)

| Campo | Valor |
|-------|-------|
| **Endpoint** | `api.twelvedata.com/time_series` |
| **Intervalo** | 1H (48 velas = 2 dias) |
| **Pares** | EUR/USD, GBP/USD, USD/JPY, XAU/USD, EUR/GBP, USD/CHF, AUD/USD, USD/CAD, NZD/USD |
| **Latência** | ~200-500ms |
| **Tier gratuito** | 800 requests/dia, 8/min |
| **Dados** | OHLCV reais, preço atual via `/price` |

**Vantagem sobre Frankfurter:** Dados intradia reais em vez de fechos diários. Ouro (XAU/USD) é suportado nativamente.

### 2.2 Binance API (Crypto)

| Campo | Valor |
|-------|-------|
| **Endpoint** | `api.binance.com/api/v3/klines` |
| **Intervalo** | 1H (48 velas) |
| **Pares** | BTCUSDT, ETHUSDT |
| **Latência** | ~50-200ms |
| **Tier gratuito** | 1200 requests/min |
| **Dados** | OHLCV reais |

### 2.3 Frankfurter API (Fallback Forex)

| Campo | Valor |
|-------|-------|
| **Endpoint** | `api.frankfurter.app` |
| **Intervalo** | Diário (30 dias) |
| **Latência** | ~100-300ms |
| **Tier gratuito** | Ilimitado |
| **Dados** | Fechos diários (OHLC sintético) |
| **Limitação** | Sem volume, sem dados intradia, sem XAU |

### 2.4 Google Gemini (AI Decision Engine)

| Campo | Valor |
|-------|-------|
| **Modelos** | gemini-2.5-flash → gemini-2.0-flash → gemini-1.5-flash |
| **Temperature** | 0.4 |
| **Max tokens** | 2048 |
| **Input** | System prompt + snapshot de mercado |
| **Output** | JSON array de sinais |

---

## 3. Indicadores Técnicos Implementados

### 3.1 Indicadores Clássicos

| Indicador | Configuração | Função | Uso no Sistema |
|-----------|-------------|--------|----------------|
| **SMA** | 14, 24 períodos | Média simples | Tendência + snapshot |
| **EMA** | 12, 26, 50 períodos | Média exponencial | MACD + tendência |
| **RSI-14** | 14 períodos | Índice de força relativa | Score de validação (20 pts) |
| **Bollinger Bands** | 20 peri, 2 std | Bandas de volatilidade | Snapshot + volatilidade |
| **MACD** | 12/26/9 | Convergência/divergência | Score de validação (15 pts) |
| **ATR-14** | 14 períodos | Amplitude verdadeira média | Volatilidade + stops |

### 3.2 Smart Money Concepts (SMC)

| Conceito | Implementação | Score na Validação |
|----------|--------------|-------------------|
| **Swing Points** | Lookback=3 pivôs | Base para BOS/CHoCH |
| **BOS (Break of Structure)** | Preço rompe swing high/low anterior | 25 pts (confirmação direcional) |
| **CHoCH (Change of Character)** | Inversão de estrutura de mercado | 25 pts (confirmação direcional) |
| **Fair Value Gaps (FVG)** | Gap entre velas 0 e 2 | Bônus 5 pts (entrada próxima) |
| **Order Blocks** | Última vela contra-tendente antes de swing | Bônus 5 pts (entrada dentro) |
| **Premium/Discount** | Fibonacci 38.2%/50%/61.8% | Contexto de zona |

---

## 4. Pipeline de Validação

### 4.1 Validação por Regras (Rule-Based Filter)

Cada sinal gerado pelo Gemini passa por um filtro determinista com **6 critérios** e score máximo de **100 pontos**:

| Critério | Pontos Máx | Descrição |
|----------|-----------|-----------|
| RSI confirmação | 20 | RSI < 40 para BUY, > 60 para SELL |
| Tendência SMA | 20 | SMA20 > SMA50 para BUY (alta), inverso para SELL |
| MACD direcional | 15 | Histograma positivo para BUY, negativo para SELL |
| SMC estrutural | 25 | BOS ou CHoCH confirma a direção |
| R:R mínimo | 20 | >= 2.0 = 20pts, >= 1.5 = 15pts, >= 1.0 = 5pts |
| Proximidade níveis | 10 | Entrada perto de FVG (5pts) + Order Block (5pts) |

**Threshold de aprovação:** Score >= 45/100

**Lógica de rejeição:**
- Se RSI está sobrecomprado e sinal é BUY → perde 20 pontos
- Se MACD é bearish e sinal é BUY → perde 15 pontos
- Se não há BOS/CHoCH → perde 25 pontos
- Se R:R < 1.0 → perde 20 pontos
- **Resultado:** Sinais sem confirmação técnica são rejeitados antes de chegar ao utilizador

### 4.2 Buffer de Spread/Slippage

| Par | Spread Buffer |
|-----|--------------|
| Pares JPY | 0.03% (~3 pips) |
| XAU/USD | 0.02% |
| BTC/USD | 0.05% |
| Outros forex | 0.015% (~1.5 pips) |

**Efeito:** Entry é ajustado para pior fill, SL é alargado. TP permanece inalterado.

### 4.3 Deduplicação

- **Chave:** `symbol + timeframe + signal_type`
- Sinais duplicados (mesmo par+timeframe+direção) são rejeitados
- Sinais no mesmo par com timeframes diferentes são permitidos

### 4.4 Expiração por Timeframe

| Timeframe | Expiração |
|-----------|-----------|
| M15 | 4 horas |
| M30 | 6 horas |
| H1 | 12 horas |
| H4 | 24 horas |
| D1 | 3 dias |
| Crypto (fim de semana) | Segunda 05:00 UTC |

---

## 5. Scoring de Confiança

### 5.1 Confiança vs Resultado Real

A confiança (55-95%) é atribuída pelo Gemini e ajustada pelo score técnico:

| Faixa de Confiança | Significado | Ação Recomendada |
|-------------------|-------------|------------------|
| 80-95% | Alta confiança, múltipla confirmação | Entrada normal |
| 65-79% | Confiança moderada | Entrada com lote reduzido |
| 55-64% | Confiança baixa | Entrada mínima ou skip |
| < 55% | Rejeitado pelo filtro | Não publicado |

### 5.2 Métricas de Performance por Dimensão

O sistema rastreia performance por:

- **Par:** Win rate, pips totais, pips médios por trade
- **Timeframe:** Qual timeframe gera melhores sinais
- **Setup SMC:** Qual padrão SMC (BOS, CHoCH, OB, FVG, COMBO) tem melhor win rate
- **Sessão:** Qual sessão de trading (Londres, NY, Overlap) gera melhores resultados

---

## 6. Lifecycle do Sinal

```
[Gerado] → [Pending] → [Active] → [TP/SL/Expired]
   ↓           ↓           ↓            ↓
 Gerado    Preço within  Preço atinge  Preço atinge
 por IA    0.15% entry   TP ou SL      expires_at
```

### 6.1 Estados

| Estado | Descrição | Transição |
|--------|-----------|-----------|
| `pending` | Sinal aguardando preço chegar ao entry | → `active` (preço within 0.15%) |
| `active` | Sinal em execução | → `tp` / `sl` / `expired` |
| `tp` | Take Profit atingido | Terminal |
| `sl` | Stop Loss atingido | Terminal |
| `expired` | Tempo expirado | Terminal |

### 6.2 Fechamento Automático

- **Cron:** A cada 30 minutos (`close-signals-every-30min`)
- **Fonte de preço:** Twelve Data (forex) / Binance (crypto) — preço intradia real
- **Verificação:** TP/SL + expiração

---

## 7. Limitações Conhecidas

### 7.1 Dados

| Limitação | Impacto | Mitigação |
|-----------|---------|-----------|
| Twelve Data tier gratuito: 800 req/dia | 17 gerações × 9 pares = 153 req/dia | Dentro do limite |
| Twelve Data free: 8 req/min | Geração sequencial pode atingir limite | Rate limiting automático |
| Frankfurter: sem volume | Análise de volume limitada | Não utilizado para decisão |
| Crypto: apenas BTC/ETH | Limitado a 2 pares | Expansão futura |

### 7.2 Modelo LLM

| Limitação | Impacto | Mitigação |
|-----------|---------|-----------|
| Gemini não é modelo financeiro | Pode gerar preços irrealistas | Validação por regras |
| Temperature 0.4 | Output nem sempre determinístico | Filtro técnico pós-geração |
| Max 2048 tokens | Limita número de sinais por geração | Máximo 5 sinais/geração |
| Sem memória entre gerações | Não aprende com erros passados | Sistema de feedback em desenvolvimento |

### 7.3 Execução

| Limitação | Impacto | Mitigigation |
|-----------|---------|-------------|
| Sem trailing stop | Não protege lucros parciais | Futuro |
| Sem parcial close | Binary TP/SL | Futuro |
| Entry sem slippage real | Preço real pode diferir | Buffer de spread |
| Forex: preço de fechamento diário (Frankfurter fallback) | TP/SL intraday pode ser detetado com atraso | Twelve Data como primary |

---

## 8. Arquitetura de Dados

### 8.1 Schema: signals

```sql
CREATE TABLE signals (
  id                uuid PRIMARY KEY,
  symbol            text NOT NULL,        -- EURUSD, BTCUSDT
  timeframe         text NOT NULL,        -- M15, H1, H4, D1
  signal_type       text NOT NULL,        -- BUY, SELL
  entry_price       numeric NOT NULL,
  stop_loss         numeric NOT NULL,
  target_price      numeric NOT NULL,
  confidence        numeric NOT NULL,     -- 55-95
  reasons           jsonb NOT NULL,       -- Array de strings
  status            text NOT NULL,        -- active, pending, tp, sl, expired
  created_at        timestamptz NOT NULL,
  expires_at        timestamptz,          -- Timeframe-aware
  analysis          text,                 -- Análise detalhada
  probability_score numeric,              -- Reservado
  smc_setup         text                  -- BOS, CHoCH, OB, FVG, COMBO
);
```

### 8.2 Schema: signal_outcomes (Analytics)

```sql
CREATE TABLE signal_outcomes (
  id              uuid PRIMARY KEY,
  signal_id       uuid REFERENCES signals(id),
  symbol          text NOT NULL,
  timeframe       text NOT NULL,
  signal_type     text NOT NULL,
  smc_setup       text,
  session_name    text,
  entry_price     numeric NOT NULL,
  exit_price      numeric NOT NULL,
  stop_loss       numeric NOT NULL,
  target_price    numeric NOT NULL,
  result          text NOT NULL,          -- tp, sl, expired, manual
  pips_result     numeric NOT NULL,
  risk_reward     numeric NOT NULL,
  confidence      numeric NOT NULL,
  tech_score      numeric,                -- Score da validação por regras
  created_at      timestamptz NOT NULL,
  closed_at       timestamptz NOT NULL,
  holding_time    interval GENERATED ALWAYS AS (closed_at - created_at) STORED
);
```

### 8.3 Analytics RPCs

| Função | Descrição |
|--------|-----------|
| `get_pair_analytics(uid)` | Win rate, pips por par |
| `get_timeframe_analytics(uid)` | Win rate por timeframe |
| `get_smc_setup_analytics()` | Win rate por tipo de setup SMC |
| `get_equity_curve(days, uid)` | Curva de equity (pips acumulados) |

---

## 9. Gating por Plano (Subscription)

| Plano | Pares | Timeframes | Sinais/Dia | Histórico | Push |
|-------|-------|------------|-----------|-----------|------|
| **Free** | EUR/USD, GBP/USD, USD/JPY | M15 | 1 | 1 dia | 0 |
| **Basic** | +AUD/USD, EUR/GBP, XAU/USD | M15, H1 | 5 | 7 dias | 5/dia |
| **Pro** | Todos (10) | M15, H1, H4 | 15 | 30 dias | Ilimitado |
| **Premium** | Todos (10) | M15, H1, H4 | Ilimitado | Ilimitado | Ilimitado |

---

## 10. Recomendações para Especialistas

### 10.1 Melhorias Prioritárias

1. **Backtesting automatizado** — Testar sinais contra histórico real para validar win rate
2. **Feedback loop** — Alimentar resultados passados ao Gemini para melhorar geração
3. **Trailing stop** — Proteger lucros parciais em trades favoráveis
4. **Volume analysis** — Adicionar dados de volume (Twelve Data premium)
5. **Economic calendar integration** — Evitar sinais durante eventos de alto impacto (NFP, FOMC)
6. **Multi-timeframe analysis** — Confirmar sinais em timeframe superior
7. **Correlação entre pares** — Evitar sinais correlacionados (EUR/USD + GBP/USD na mesma direção)

### 10.2 Métricas a Acompanhar

| Métrica | Target | Alerta |
|---------|--------|--------|
| Win rate geral | > 55% | < 45% |
| Win rate por par | > 50% | < 40% |
| R:R médio | > 1.8 | < 1.2 |
| Pips positivos/semana | > 50 | < 0 |
| Drawdown máximo | < 200 pips | > 300 pips |
| Sinais tech-rejected/dia | 2-5 | > 10 (Gemini a gerar lixo) |
| Tempo médio de holding | < 8h (H1) | > 24h (H1) |

### 10.3 Red Flags

- **Win rate < 40%:** O sistema está a perder dinheiro. Revisar parâmetros de validação.
- **3+ sinais iguais consecutivos:** Problema de deduplicação. Verificar lógica de filtering.
- **XAU/USD com dados errados:** Verificar se Twelve Data está a funcionar para gold.
- **Todos os sinais com confiança 95%:** Gemini está a inflacionar confiança. Reduzir max para 85%.
- **Tech-rejected > 50%:** Gemini está a gerar sinais de baixa qualidade. Revisar prompt.

---

## 11. Fluxo de Dados Completo

```
┌─────────────────────────────────────────────────────────┐
│                    DATA SOURCES                          │
├──────────────┬──────────────┬───────────────────────────┤
│ Twelve Data  │   Binance    │     Frankfurter (fallback)│
│ Forex+Gold   │   Crypto     │     Forex daily           │
│ 1H candles   │   1H candles │     Daily candles         │
└──────┬───────┴──────┬───────┴─────────────┬─────────────┘
       │              │                     │
       ▼              ▼                     ▼
┌─────────────────────────────────────────────────────────┐
│              TECHNICAL ANALYSIS ENGINE                   │
│  SMA, EMA, RSI, BB, MACD, ATR, SMC (BOS/CHoCH/OB/FVG)  │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                MARKET SNAPSHOT (texto)                   │
│  15+ linhas de indicadores formatados por par            │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              GEMINI LLM (decision engine)                │
│  System prompt + snapshot → JSON array de sinais         │
│  Temperature 0.4, max 2048 tokens                       │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│           RULE-BASED TECHNICAL VALIDATION                │
│  6 critérios, score 0-100, threshold >= 45              │
│  Rejeita sinais sem respaldo técnico                     │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              SPREAD BUFFER + DEDUP                       │
│  Ajusta entry/SL para spread real                        │
│  Remove sinais duplicados                                │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              DATABASE (Supabase PostgreSQL)               │
│  signals table → Realtime → Push Notifications           │
│  signal_outcomes table → Analytics RPCs                  │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              CLIENT (React Native / Expo)                 │
│  useSignals → SignalCard → TradingView Chart             │
│  useHistory → PerformanceCard → Analytics Breakdown      │
└─────────────────────────────────────────────────────────┘
```

---

## 12. Conclusão

O sistema TMT é uma implementação **genuinamente sofisticada** em muitos aspetos:

- **Indicadores técnicos** são computados corretamente em dados reais
- **SMC** está implementado com as definições padrão do mercado
- **Validação por regras** adiciona uma camada determinista sobre o LLM
- **Gating por plano** é implementado tanto client quanto server-side

As **fragilidades principais** são:

- O LLM como tomador de decisão final (não é modelo financeiro)
- Dados de forex limitados ao tier gratuito da Twelve Data
- Ausência de backtesting automatizado
- Sem feedback loop para melhoria contínua

Com as correções implementadas (Twelve Data para forex+gold, validação por regras, spread buffer, expiry por timeframe), o sistema passa de "experimento" para "MVP funcional" — mas ainda precisa de backtesting e feedback loop para ser considerado profissional.
