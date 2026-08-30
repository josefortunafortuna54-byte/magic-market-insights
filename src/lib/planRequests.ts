const PLAN_REQUESTS_KEY = "plan_requests";

export interface PlanRequestEntry {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export async function getPlanRequests(): Promise<PlanRequestEntry[]> {
  try {
    const raw = localStorage.getItem(PLAN_REQUESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PlanRequestEntry[]) : [];
  } catch {
    return [];
  }
}

async function savePlanRequests(entries: PlanRequestEntry[]): Promise<void> {
  localStorage.setItem(PLAN_REQUESTS_KEY, JSON.stringify(entries));
}

export async function removePlanRequest(id: string): Promise<void> {
  const entries = await getPlanRequests();
  await savePlanRequests(entries.filter((e) => e.id !== id));
}

export async function clearPlanRequests(): Promise<void> {
  localStorage.removeItem(PLAN_REQUESTS_KEY);
}

export async function pruneExpiredPlanRequests(
  maxAgeMs = 24 * 60 * 60 * 1000 + 30 * 60 * 1000,
): Promise<void> {
  const entries = await getPlanRequests();
  const cutoff = Date.now() - maxAgeMs;
  const kept = entries.filter((e) => new Date(e.createdAt).getTime() > cutoff);
  if (kept.length !== entries.length) await savePlanRequests(kept);
}

/**
 * Regista o pedido de ativação de plano na caixa de notificação do utilizador.
 * Equivalente web de mobile/src/lib/planRequests.ts: guarda o registo local
 * para que a mensagem permaneça visível enquanto o pedido é processado
 * (até 24 horas). Sem push local (degraded parity documentada no plano).
 */
export async function notifyPlanRequestSubmitted(plan: string, amount: string): Promise<void> {
  const title = `Plano ${plan} — pedido recebido`;
  const body = amount
    ? `Pedido do plano ${plan} (${amount}) encaminhado. Conclusão em até 24 horas.`
    : "O teu pedido está a ser encaminhado para a equipa. Será concluído em até 24 horas.";

  const entry: PlanRequestEntry = {
    id: `plan-request-${Date.now()}`,
    title,
    body,
    createdAt: new Date().toISOString(),
  };

  try {
    const entries = await getPlanRequests();
    entries.unshift(entry);
    await savePlanRequests(entries.slice(0, 10));
  } catch {
    // persistência local é best-effort
  }
}