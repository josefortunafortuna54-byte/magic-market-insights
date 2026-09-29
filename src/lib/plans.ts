import type { ComponentType } from "react";
import { Bitcoin, CreditCard, Banknote } from "lucide-react";

export type Currency = "usd" | "aoa";
export type PlanId = "free" | "basic" | "pro" | "premium";

export type PaymentMethod = "binance" | "rodotpay" | "express";

export const WA_GREEN = "#25D366";

export const BINANCE_ID = "547723572";
export const RODOTPAY_UID = "1927969477";
export const EXPRESS_PHONE = "+244926717730";

export interface PaymentMethodInfo {
  id: PaymentMethod;
  label: string;
  icon: string;
  color: string;
  usd: boolean;
  aoa: boolean;
  copyValue: string;
  getDetails: () => string;
}

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  {
    id: "binance",
    label: "Binance Pay",
    icon: "bitcoin",
    color: "#F0B90B",
    usd: true,
    aoa: false,
    copyValue: BINANCE_ID,
    getDetails: () => "UID: " + BINANCE_ID,
  },
  {
    id: "rodotpay",
    label: "Rodotpay",
    icon: "credit-card",
    color: "#6366F1",
    usd: true,
    aoa: true,
    copyValue: RODOTPAY_UID,
    getDetails: () => "UID: " + RODOTPAY_UID,
  },
  {
    id: "express",
    label: "Express",
    icon: "banknote",
    color: "#00C853",
    usd: false,
    aoa: true,
    copyValue: EXPRESS_PHONE,
    getDetails: () => "Telefone: " + EXPRESS_PHONE,
  },
];

export interface PaidPlanInfo {
  id: Exclude<PlanId, "free">;
  icon: "flash" | "rocket" | "trophy";
  highlight?: boolean;
  featured?: boolean;
}

export const PLANS: PaidPlanInfo[] = [
  { id: "basic", icon: "flash" },
  { id: "pro", icon: "rocket", highlight: true },
  { id: "premium", icon: "trophy", featured: true },
];

export const PRICES: Record<Currency, Record<PlanId, string>> = {
  usd: { free: "$0", basic: "$14.99", pro: "$29.99", premium: "$49.99" },
  aoa: { free: "0 Kz", basic: "10.000 Kz", pro: "20.000 Kz", premium: "35.000 Kz" },
};

export const PLAN_PRICES: Record<Currency, Record<Exclude<PlanId, "free">, number>> = {
  usd: { basic: 14.99, pro: 29.99, premium: 49.99 },
  aoa: { basic: 10000, pro: 20000, premium: 35000 },
};

// Taxa fixa de referencia para converter o deposito de capital (contratado
// em USD) para Kwanzas. Definida pela operacao, nao por um mercado: o
// pagamento e conferido a mao pela equipa, e a taxa tem de ser a mesma no
// momento em que o utilizador paga e no momento em que o pedido e aprovado.
//
// 1 USD = 1195 Kz. Para alterar, define VITE_AOA_PER_USD no ambiente do
// Vercel. Variaveis VITE_ sao embutidas na build, por isso mudar a taxa
// exige um novo deploy, nao um restart.
const AOA_PER_USD = (() => {
  const raw = Number(import.meta.env.VITE_AOA_PER_USD);
  return isFinite(raw) && raw > 0 ? raw : 1195;
})();

export const USD_AOA_RATE = AOA_PER_USD;

/** Converte um montante em USD para Kwanzas, arredondado ao Kwanza inteiro. */
export const usdToAoa = (usd: number): number => Math.round(usd * AOA_PER_USD);

export const planLabel = (plan: Exclude<PlanId, "free">): string =>
  plan === "basic" ? "Basic" : plan === "pro" ? "Pro" : "Premium";

export const PAYMENT_METHOD_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  bitcoin: Bitcoin,
  "credit-card": CreditCard,
  banknote: Banknote,
};
