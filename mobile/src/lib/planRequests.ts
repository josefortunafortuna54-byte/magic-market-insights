import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { i18n } from '@/lib/i18n';

const PLAN_REQUESTS_KEY = 'plan_requests';
const UPGRADE_CHANNEL_ID = 'planos';

export interface PlanRequestEntry {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(UPGRADE_CHANNEL_ID, {
      name: i18n.t('notifications.upgradeChannelName'),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF9F0A',
    });
  }
}

export async function getPlanRequests(): Promise<PlanRequestEntry[]> {
  const raw = await AsyncStorage.getItem(PLAN_REQUESTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function savePlanRequests(entries: PlanRequestEntry[]): Promise<void> {
  await AsyncStorage.setItem(PLAN_REQUESTS_KEY, JSON.stringify(entries));
}

export async function removePlanRequest(id: string): Promise<void> {
  const entries = await getPlanRequests();
  await savePlanRequests(entries.filter((e) => e.id !== id));
}

export async function clearPlanRequests(): Promise<void> {
  await AsyncStorage.removeItem(PLAN_REQUESTS_KEY);
}

export async function pruneExpiredPlanRequests(maxAgeMs = 24 * 60 * 60 * 1000 + 30 * 60 * 1000): Promise<void> {
  const entries = await getPlanRequests();
  const cutoff = Date.now() - maxAgeMs;
  const kept = entries.filter((e) => new Date(e.createdAt).getTime() > cutoff);
  if (kept.length !== entries.length) await savePlanRequests(kept);
}

/**
 * Regista o pedido de ativação de plano na caixa de notificação do utilizador:
 * dispara uma notificação imediata e guarda o registo local para que a mensagem
 * permaneça visível enquanto o pedido é processado (até 24 horas).
 */
export async function notifyPlanRequestSubmitted(plan: string, amount: string): Promise<void> {
  const title = i18n.t('notifications.planRequestTitle', { plan });
  const body = amount
    ? i18n.t('notifications.planRequestBodyAmount', { plan, amount })
    : i18n.t('notifications.planRequestBody', { plan });

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

  try {
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { url: '/notificacoes', kind: 'plan' },
        sound: Platform.OS === 'ios' ? 'default' : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        channelId: Platform.OS === 'android' ? UPGRADE_CHANNEL_ID : undefined,
      },
    });
  } catch {
    // se as permissões falharem, o registo continua visível na caixa interna
  }
}
