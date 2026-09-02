import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Signal, SignalTier } from '@/core/types';
import { i18n } from '@/lib/i18n';
import { PLAN_LIMITS, type PlanTier } from '@/core/gating';

const SIGNAL_CHANNEL_ID = 'signals';
const SIGNAL_KEY_PREFIX = 'signal_notified';

interface NotifiedSignal {
  id: string;
  timestamp: number;
}

async function ensureSignalChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(SIGNAL_CHANNEL_ID, {
      name: i18n.t('notifications.signalChannelName'),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#34C759',
    });
  }
}

async function loadNotifiedSignals(): Promise<NotifiedSignal[]> {
  const raw = await AsyncStorage.getItem(SIGNAL_KEY_PREFIX);
  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveNotifiedSignals(signals: NotifiedSignal[]): Promise<void> {
  await AsyncStorage.setItem(SIGNAL_KEY_PREFIX, JSON.stringify(signals));
}

function formatSignalType(type: Signal['type']): string {
  return type === 'BUY'
    ? i18n.t('notifications.signalBuy')
    : type === 'SELL'
      ? i18n.t('notifications.signalSell')
      : i18n.t('notifications.signalWait');
}

function getSignalEmoji(type: Signal['type']): string {
  return type === 'BUY' ? '🟢' : type === 'SELL' ? '🔴' : '🟡';
}

function getTierLabel(tier: SignalTier): string {
  return tier === 'premium'
    ? i18n.t('notifications.signalTierPremium')
    : tier === 'pro'
      ? i18n.t('notifications.signalTierPro')
      : i18n.t('notifications.signalTierFree');
}

const SIGNAL_PUSH_COUNT_KEY = 'signal_push_count';

interface PushCountEntry {
  date: string;
  count: number;
}

async function getSignalPushCountToday(): Promise<number> {
  const raw = await AsyncStorage.getItem(SIGNAL_PUSH_COUNT_KEY);
  try {
    const entry: PushCountEntry = raw ? JSON.parse(raw) : { date: '', count: 0 };
    const today = new Date().toISOString().split('T')[0];
    if (entry.date === today) return entry.count;
  } catch { /* ignore */ }
  return 0;
}

async function incrementSignalPushCount(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const count = await getSignalPushCountToday();
  await AsyncStorage.setItem(SIGNAL_PUSH_COUNT_KEY, JSON.stringify({ date: today, count: count + 1 }));
}

export async function notifyNewSignal(signal: Signal, planTier: PlanTier = 'free'): Promise<boolean> {
  const limits = PLAN_LIMITS[planTier];
  if (limits.pushAlertsPerDay === 0) return false;

  const granted = await requestSignalPermission();
  if (!granted) return false;

  if (limits.pushAlertsPerDay > 0) {
    const todayCount = await getSignalPushCountToday();
    if (todayCount >= limits.pushAlertsPerDay) return false;
  }

  const notified = await loadNotifiedSignals();
  const alreadyNotified = notified.some((n) => n.id === signal.id);
  if (alreadyNotified) return false;

  await ensureSignalChannel();

  const typeLabel = formatSignalType(signal.type);
  const emoji = getSignalEmoji(signal.type);
  const tierLabel = getTierLabel(signal.tier);
  const rr = signal.riskReward
    ? i18n.t('notifications.signalRR', { value: signal.riskReward })
    : '';
  const expires = signal.expiresAt
    ? i18n.t('notifications.signalExpires', {
        time: new Date(signal.expiresAt).toLocaleTimeString('pt-PT', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })
    : '';

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.signalTitle', {
          emoji,
          tier: tierLabel,
          pair: signal.pair,
          type: typeLabel,
        }),
        body: i18n.t('notifications.signalBody', {
          entry: signal.entry,
          sl: signal.stopLoss,
          tp: signal.takeProfit,
          rr,
          expires,
        }),
        data: { url: `/sinal/${signal.id}`, signalId: signal.id, type: 'signal' },
        sound: Platform.OS === 'ios' ? 'default' : undefined,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: 'SIGNAL',
        interruptionLevel: Platform.OS === 'ios' ? 'active' : undefined,
      },
      trigger: null,
    });

    notified.push({ id: signal.id, timestamp: Date.now() });
    if (notified.length > 500) notified.splice(0, notified.length - 500);
    await saveNotifiedSignals(notified);
    await incrementSignalPushCount();
    return true;
  } catch {
    return false;
  }
}

export async function notifyMultipleSignals(signals: Signal[], planTier: PlanTier = 'free'): Promise<number> {
  let count = 0;
  for (const signal of signals) {
    const ok = await notifyNewSignal(signal, planTier);
    if (ok) count++;
  }
  return count;
}

async function requestSignalPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return req.granted;
}

export async function clearNotifiedSignals(): Promise<void> {
  await AsyncStorage.removeItem(SIGNAL_KEY_PREFIX);
}