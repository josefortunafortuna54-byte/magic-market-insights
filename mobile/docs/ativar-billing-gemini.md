# Ativar Billing da Gemini API

## Contexto

A IA do suporte (`ai-support`) falha intermitentemente com **"A IA não conseguiu responder"** porque a `GEMINI_API_KEY` está no **free tier** do Google e a quota diária esgota (erro 429 confirmado em teste).

A função já tem retries e mensagens claras — falta apenas levantar o limite diário com billing.

## Passos

### 1. Abrir o Google AI Studio

Acede a <https://aistudio.google.com> → clica na engrenagem (**Settings**) → **Plan & billing**
(ou diretamente em <https://aistudio.google.com/api-settings>)

### 2. Ativar "Pay-as-you-go"

Escolhe **Billing: Pay-as-you-go** e liga um projeto Google Cloud com faturação (adiciona cartão de pagamento).

### 3. Manter a mesma API key

O billing é aplicado ao nível do **projeto**, não da chave. A `GEMINI_API_KEY` atual passa automaticamente aos limites pagos — **não é preciso alterar código nem fazer redeploy**.

Depois de ativar, testar:

```powershell
# Smoke test ponta-a-ponta
$url = (Get-Content .env | Select-String '^EXPO_PUBLIC_SUPABASE_URL=(.+)$').Matches.Groups[1].Value.Trim()
$key = (Get-Content .env | Select-String '^EXPO_PUBLIC_SUPABASE_ANON_KEY=(.+)$').Matches.Groups[1].Value.Trim()
Invoke-RestMethod -Uri "$url/functions/v1/ai-support" -Method Post `
  -Headers @{ apikey=$key; Authorization="Bearer $key"; "Content-Type"="application/json" } `
  -Body '{"messages":[{"role":"user","text":"Responde apenas com OK."}]}'
```

Resposta esperada: `{ "reply": "OK", ... }` sem erro 429.

## Custo estimado

| Modelo | Entrada | Saída |
|---|---|---|
| gemini-2.5-flash | ~$0.30 / 1M tokens | ~$2.50 / 1M tokens |

Milhares de análises de imagens custam poucos dólares por mês.
