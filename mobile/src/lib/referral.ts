import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// Afiliados + crédito de capital
// ============================================================================
// O utilizador pode chegar à app através de um link de afiliado
// (…/?ref=CODIGO). O código fica guardado no dispositivo e, quando o plano
// premium é ativado, o valor pago passa a ser o saldo da gestão de capital.
// ============================================================================

export const REFERRAL_KEY = 'tmt_referral_code';
const PENDING_PAYMENT_KEY = 'tmt_pending_plan_payment';
const CREDITED_KEY_PREFIX = 'tmt_capital_credited';
const PENDING_MAX_AGE_MS = 45 * 24 * 60 * 60 * 1000; // plano mensal + margem

export interface PendingPlanPayment {
  plan: string;
  amount: number;
  currency: 'usd' | 'aoa';
  submittedAt: string;
}

function extractRef(url: string | null): string | null {
  if (!url) return null;
  const qIndex = url.indexOf('?');
  if (qIndex === -1) return null;
  try {
    const params = new URLSearchParams(url.slice(qIndex));
    const ref = params.get('ref');
    return ref && ref.trim() ? ref.trim().slice(0, 64) : null;
  } catch {
    return null;
  }
}

export async function captureReferralFromUrl(url: string | null): Promise<void> {
  const ref = extractRef(url);
  if (!ref) return;
  const existing = await AsyncStorage.getItem(REFERRAL_KEY);
  if (existing === ref) return;
  await AsyncStorage.setItem(REFERRAL_KEY, ref);
}

/** Regista listeners de deep link para capturar ?ref= na primeira abertura. */
export function initReferralCapture(): () => void {
  void Linking.getInitialURL().then((url) => captureReferralFromUrl(url));
  const sub = Linking.addEventListener('url', ({ url }) => {
    void captureReferralFromUrl(url);
  });
  return () => sub.remove();
}

export async function getReferralCode(): Promise<string | null> {
  return AsyncStorage.getItem(REFERRAL_KEY);
}

/** Guarda o valor pago no momento em que o comprovativo é submetido. */
export async function savePendingPlanPayment(
  payment: Omit<PendingPlanPayment, 'submittedAt'>,
): Promise<void> {
  if (!payment.amount || payment.amount <= 0) return;
  const entry: PendingPlanPayment = {
    ...payment,
    submittedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(entry));
}

/**
 * Consome o registo de pagamento pendente se corresponder ao plano ativado.
 * Só remove quando é efetivamente usado (ou quando expira).
 */
export async function consumePendingPlanPayment(
  plan: string,
): Promise<PendingPlanPayment | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_PAYMENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPlanPayment;
    const expired = Date.now() - new Date(parsed.submittedAt).getTime() > PENDING_MAX_AGE_MS;
    if (expired || parsed.plan !== plan || !(parsed.amount > 0)) {
      if (expired) await AsyncStorage.removeItem(PENDING_PAYMENT_KEY);
      return null;
    }
    await AsyncStorage.removeItem(PENDING_PAYMENT_KEY);
    return parsed;
  } catch {
    return null;
  }
}

function creditedKey(userId: string): string {
  return `${CREDITED_KEY_PREFIX}:${userId}`;
}

/** Já creditámos o capital para este período de subscrição? */
export async function getCapitalCreditedPeriod(userId: string): Promise<string | null> {
  return AsyncStorage.getItem(creditedKey(userId));
}

export async function setCapitalCreditedPeriod(userId: string, period: string): Promise<void> {
  await AsyncStorage.setItem(creditedKey(userId), period);
}
