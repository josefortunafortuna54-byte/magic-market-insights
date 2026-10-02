// A regra do username vive em quatro sitios: este modulo, o dialogo web, a edge
// function e o CHECK da base de dados. Nao ha forma de partilhar um modulo
// entre os tres projectos (web, mobile e Deno), portanto a unica proteccao
// contra divergencia e o CHECK -- ver usernameRules.test.ts.
//
// Se mudares a regra aqui, tens de a mudar nos outros tres sitios. A nao ser
// que acrescentes o teste de coerencia e ele falha.

export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]*[a-z0-9]$/;

/** 'wa' seguido de digitos esta reservado: um username 'wa244821999999' gera o
 * email sintetico wa244821999999@tmt.local, que e o email de uma conta de
 * WhatsApp real. */
const WHATSAPP_RESERVED_RE = /^wa\d+$/;

export function normalizeUsername(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  if (value.length < 3 || value.length > 30) return false;
  if (!USERNAME_RE.test(value)) return false;
  return !WHATSAPP_RESERVED_RE.test(value);
}
