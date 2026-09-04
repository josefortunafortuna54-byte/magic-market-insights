# Backlog & Análise da App TMT

_Análise de 2026-08-22 — atualizar conforme os itens forem concluídos._

## Estado geral (pontos fortes)

| Área | Estado |
|---|---|
| Segurança planos | ✅ RLS com `get_user_plan()` validando datas + cron de expiração horário |
| Anti-burla pagamentos | ✅ Transições atómicas pending→approved/rejected + deteção de recibos duplicados |
| IA | ✅ JWT obrigatório, quotas por plano atómicas, retries, tokens reais registados |
| Emails transacionais | ✅ Resend a funcionar (modo teste `onboarding@resend.dev`) |
| Notificações | ✅ In-app + Expo push no aprovar/rejeitar plano e na expiração |
| Código | ✅ Sem TODOs/FIXMEs; console.warn só em logging legítimo de erros |

---

## 🔴 Prioridade alta (receita / fiabilidade)

### 1. Ativar billing da Gemini ⏳ *aguarda utilizador*
A quota diária free tier está esgotada → toda a IA devolve "muitos pedidos".
Guia pronto: [`docs/ativar-billing-gemini.md`](./ativar-billing-gemini.md).
Depois de ativar: correr o smoke test do guia para confirmar.

### 2. Rebuild do binário nativo ⏳ *aguarda utilizador*
Necessário para:
- Splash full-screen novo (`splash-full.png` + `enableFullScreenImageLegacy`)
- Compressão de imagens da IA (`expo-image-manipulator`, fallback já ativo)
```powershell
npx expo run:android   # ou eas build
```
Verificar após rebuild: splash aparece cheio (se sair centrado, a prop
`enableFullScreenImageLegacy` mudou de nome no SDK 56 — ajustar).

### 3. i18n incompleto nas chaves novas
`aiErrors.{auth,quotaChat,quotaImage,quotaBurst}` + `suporteIa.{remainingChat,remainingImage}`
só existem em **pt** e **en**. Faltam 12 idiomas:
ar, de, es, fr, it, ja, ko, ln, nl, ru, sw, zh.
(Fallback para pt funciona entretanto.)

---

## 🟡 Prioridade média (qualidade / produto)

### 4. Painel admin: uso da IA
A tabela `ai_usage` já regista tudo — falta UI no admin:
- Consumo por utilizador/dia/plano (tokens in/out)
- Deteção de abuso (utilizadores no limite constantemente)
- Custo estimado por dia (tokens × preço Gemini)
Base: query simples sobre `ai_usage` + nova ação no `admin-manage`.

### 5. Aviso antecipado de expiração (retenção)
O cron atual notifica **depois** de expirar. Acrescentar no mesmo job:
- 3 dias antes: "O teu plano expira em 3 dias — renova"
- 1 dia antes: idem
Mudança pequena em `expire_old_subscriptions()`.

### 6. Jest quebrado (pré-existente)
`clearMocksOnScope is not a function` — jest 30.4.2 vs jest-environment-node 30.4.1.
Alinhar versões (`npm i -D jest-environment-node@30.4.2`) para os testes voltarem a correr.

### 7. Erros eslint pré-existentes no admin.tsx
3 × `react-hooks/purity` (`Date.now()` durante render) nas linhas ~733/992/1265.
Exigem capturar `now` fora do render (useMemo/state) ou mover helpers.

---

## 🟢 Prioridade baixa (polimento)

### 8. Limpeza de assets
- `assets/images/bg-splash.png` — sem uso desde o splash novo; apagar
- `assets/images/splash-icon.png` — possivelmente redundante com `icon.png` (mesmas dimensões); confirmar e apagar

### 9. Domínio próprio no Resend ⏳ *decisão comercial*
Emails saem de `onboarding@resend.dev` (só entrega ao Gmail do criador).
Comprar domínio (~10 USD/ano) + verificar no Resend → emails a qualquer destinatário.
Plano free: 100 emails/dia — suficiente por agora.

### 10. Deteção de duplicados mais forte
Atual: mesmo `proof_url` ou mesmo plano/método/valor nos últimos 30 dias.
Futuro: hash perceptual das imagens para apanhar re-uploads editados.

### 11. Manutenção tooling
- Supabase CLI 2.104.0 → 2.115.0
- Revisar `ChatGPT Image ...png` (origem da arte) — pode arquivar fora da pasta assets para não ir no bundle

---

## Mapa da app (referência rápida)

**Ecrãs (36):** auth (login/WhatsApp), tabs (início, análises, histórico, horários, comunidade, perfil, admin), sinal+chart, banca, diário-trader, depósitos, planos, suporte-IA, notificações, booms, idioma, legal (termos/privacidade/aviso), comunidade (canais, DM, loja, pesquisa, perfil público).

**Edge functions (6):**
| Função | Papel |
|---|---|
| `admin-manage` | CRUD sinais/booms/recibos/utilizadores (JWT + ADMIN_EMAILS) |
| `ai-support` | Chat + análise de imagem com quotas por plano |
| `close-signals` | Fecha sinais expirados |
| `generate-crypto-signals` | Geração automática de sinais |
| `send-notification` | Push manual |
| `whatsapp-auth` | Login via WhatsApp |

**Migrations recentes:** `20260822020000_user_notifications`, `20260822030000_fix_rls_recursion`, `20260822040000_subscription_expiry_and_receipt_dedup`, `20260822050000_ai_quota`.
