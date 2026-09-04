# Fix do Login com Google (Supabase Auth)

## Problema

Ao clicar em "Continuar com Google", após escolher a conta, o browser era
redirecionado para uma tela de erro (o `redirect_to` não era aceite pelo Supabase
e o fallback caía no Site URL errado).

## Causa raiz

- O **Site URL** do projeto Supabase era `http://localhost:8080`.
- O dev server corre em `http://localhost:8081` (`npm run web`).
- O app redireciona o OAuth para `window.location.origin` = `http://localhost:8081`.
- A **allowlist de Redirect URLs** (`uri_allow_list`) não incluía `http://localhost:8081`.
- O Supabase só valida o `redirect_to` no **callback** — ou seja, *depois* de
  escolher a conta Google.
- A validação falhava → o Supabase caía no Site URL (`http://localhost:8080`),
  onde não há nada a correr → erro.

## O que foi aplicado

Configuração alterada via **Management API** (não requer dashboard) para o
projeto `zwxplzdadgtiohnuotlu`:

```
PATCH /v1/projects/zwxplzdadgtiohnuotlu/config/auth
Authorization: Bearer <access_token>
```

### 1. Site URL

```json
{ "site_url": "http://localhost:8081" }
```

### 2. Redirect URLs (`uri_allow_list` — string separada por vírgulas)

```json
{
  "uri_allow_list": "https://magic-market-insights.vercel.app/**,http://localhost:*,http://127.0.0.1:*,magictrader://google-auth,magictrader://*"
}
```

> Nota: na Management API, os "Redirect URLs" mapeiam para o campo
> `uri_allow_list` (comma-separated string), **não** para
> `additional_redirect_urls` (esse campo não é aceite pela API da plataforma).
> Ver `ToUpdateAuthConfigBody` em supabase/cli `pkg/config/auth.go`.

Wildcards suportados: `*` corresponde a qualquer porta (ex. `http://localhost:*`).

`magictrader://google-auth` e `magictrader://*` são os deep links usados pelo
fluxo nativo (iOS/Android) — o scheme vem de `app.json`.

## Verificação (web)

### 1. Teste legítimo do redirect (authorize → state → callback)

O `redirect_to` é validado no **authorize** e armazenado no flow state; o callback
não confia num `redirect_to` enviado diretamente (por isso testar o callback com
`state=fake` é inconclusivo). Método correto:

```powershell
# 1. authorize devolve 302 para o Google com &state=<uuid>
$enc = [uri]::EscapeDataString('http://localhost:8081')
$authUrl = "https://zwxplzdadgtiohnuotlu.supabase.co/auth/v1/authorize?provider=google&redirect_to=$enc"
# extrair o "state" da Location

# 2. reutilizar esse state no callback e ver para onde redireciona
$cbUrl = "https://zwxplzdadgtiohnuotlu.supabase.co/auth/v1/callback?code=fake-code&state=$state"
# a Location devolve o redirect_to (aceite) ou o site_url (rejeitado)
```

Resultado esperado para os valores configurados:

| redirect_to | callback Location |
| --- | --- |
| `http://localhost:8081` | `http://localhost:8081?error=...` (aceite) |
| `http://localhost:9999` | `http://localhost:9999?error=...` (glob `http://localhost:*`) |
| `magictrader://google-auth` | `magictrader://google-auth?error=...` (glob `magictrader://*`) |
| `https://magic-market-insights.vercel.app/x` | mesmo URL (glob `/**`) |

O `error` (código falso) é esperado — o importante é a **Location** manter o
`redirect_to`.

### 2. Fluxo real

1. Abrir `http://localhost:8081` → **Continuar com Google**.
2. O authorize URL contém `redirect_to=http%3A%2F%2Flocalhost%3A8081`.
3. Escolher conta → Google → Supabase callback → volta a `http://localhost:8081`
   com o código → `detectSessionInUrl` troca o código → dashboard.

## Verificação (nativo)

- O `redirect_to` nativo é `magictrader://google-auth` (já na allowlist).
- O Google Cloud Console só precisa do `https://zwxplzdadgtiohnuotlu.supabase.co/auth/v1/callback`
  como URI de redirecionamento autorizada (é o mesmo para web e nativo, já que o
  fluxo nativo passa pelo mesmo callback do Supabase).

## Notas

- A partir de agora, qualquer porta local (`8080`, `8081`, `3000`, ...) funciona,
  graças ao wildcard `http://localhost:*`.
- O app já mostra a mensagem de erro do OAuth no ecrã de login
  (`getOAuthErrorParams` em `src/lib/googleAuth.ts`), o que ajuda a diagnosticar
  falhas no callback.

opencode -s ses_fb237fb40ffe7OCZwG9LYv6zZ1

