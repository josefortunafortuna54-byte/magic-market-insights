import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BOOM_LIVE_WINDOW_MINUTES } from '@/core/booms';
import { i18n } from '@/lib/i18n';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ALARMS_KEY = 'boom_alarms';
const CHANNEL_ID = 'booms';
const CHANNEL_ID_ALARM = 'booms_alarm';
const UPGRADE_KEY_PREFIX = 'plan_upgrade_prompt';
const UPGRADE_CHANNEL_ID = 'planos';
export const COMMUNITY_CHANNEL_ID = 'comunidade';

export async function ensureChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: i18n.t('notifications.channelName'),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#34C759',
    });

    await Notifications.setNotificationChannelAsync(CHANNEL_ID_ALARM, {
      name: i18n.t('notifications.channelDesc'),
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: '#FF3B30',
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync(COMMUNITY_CHANNEL_ID, {
      name: i18n.t('workspace.notificationChannel'),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C3AED',
    });
  }
}

/**
 * Obtém o token de push do Expo para este dispositivo (ou null se não for
 * possível: web, emulador, permissão negada ou erro). Não pede permissão se
 * já tiver sido negada — requestNotificationPermission devolve o estado.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;
  const granted = await requestNotificationPermission();
  if (!granted) return null;
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    return data ?? null;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return req.granted;
}

export async function loadAlarms(): Promise<string[]> {
  const entries = await loadAlarmEntries();
  return entries.map((e) => e.identifier);
}

interface AlarmEntry {
  identifier: string;
  boomId: string;
  warningId?: string;
}

async function loadAlarmEntries(): Promise<AlarmEntry[]> {
  const raw = await AsyncStorage.getItem(ALARMS_KEY);
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (e): e is AlarmEntry =>
          !!e && typeof e.identifier === 'string' && typeof e.boomId === 'string',
      );
    }
  } catch {
    // ignore
  }
  return [];
}

async function saveAlarmEntries(entries: AlarmEntry[]): Promise<void> {
  await AsyncStorage.setItem(ALARMS_KEY, JSON.stringify(entries));
}

export async function getBoomAlarm(boomId: string): Promise<AlarmEntry | null> {
  const entries = await loadAlarmEntries();
  return entries.find((e) => e.boomId === boomId) ?? null;
}

export async function cancelBoomAlarm(boomId: string): Promise<boolean> {
  const entries = await loadAlarmEntries();
  const matching = entries.filter((e) => e.boomId === boomId);
  if (matching.length === 0) return false;
  for (const entry of matching) {
    try {
      await Notifications.cancelScheduledNotificationAsync(entry.identifier);
      if (entry.warningId) await Notifications.cancelScheduledNotificationAsync(entry.warningId);
    } catch {
      // ignore
    }
  }
  await saveAlarmEntries(entries.filter((e) => e.boomId !== boomId));
  return true;
}

export interface ScheduledAlarm {
  id: string;
  boomId: string;
  fireAt: string;
  title: string;
}

function formatWindowTime(boomTime: string): string {
  const d = new Date(boomTime);
  const h = String((d.getUTCHours() + 1) % 24).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Agenda DOIS alarmes para um boom:
 * 1. Aviso 5 minutos antes (para preparar)
 * 2. Alarme EXATO na hora do boom (comporta como alarme real: acorda tela, som alto, full-screen)
 * O identificador fica guardado em boom_alarms (local).
 */
export async function scheduleBoomAlarm(boomId: string, boomTime: string, title: string): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  const boomDate = new Date(boomTime);
  const warningAt = new Date(boomDate.getTime() - 5 * 60 * 1000);
  const now = Date.now();

  if (warningAt.getTime() <= now && boomDate.getTime() <= now) return false;

  const entries = await loadAlarmEntries();
  const existing = entries.find((e) => e.boomId === boomId);
  if (existing) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existing.identifier);
      if (existing.warningId) await Notifications.cancelScheduledNotificationAsync(existing.warningId);
    } catch {
      // ignore
    }
  }

  let warningId: string | undefined;
  let alarmId: string;

  if (warningAt.getTime() > now) {
    warningId = await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.prepTitle'),
        body: i18n.t('notifications.prepBody', {
          pair: title,
          minutes: BOOM_LIVE_WINDOW_MINUTES,
          windowTime: formatWindowTime(boomTime),
        }),
        data: { url: '/(tabs)/horarios', boomId, type: 'warning' },
        sound: Platform.OS === 'ios' ? 'default' : undefined,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        interruptionLevel: Platform.OS === 'ios' ? 'active' : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: warningAt,
        channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
      },
    });
  }

  alarmId = await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('notifications.goTitle'),
      body: i18n.t('notifications.goBody', {
        pair: title,
        minutes: BOOM_LIVE_WINDOW_MINUTES,
      }),
      data: { url: '/(tabs)/horarios', boomId, type: 'alarm' },
      sound: Platform.OS === 'ios' ? 'default' : undefined,
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: 'BOOM_ALARM',
      interruptionLevel: Platform.OS === 'ios' ? 'timeSensitive' : undefined,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: boomDate,
      channelId: Platform.OS === 'android' ? CHANNEL_ID_ALARM : undefined,
    },
  });

  const filtered = entries.filter((e) => e.boomId !== boomId);
  filtered.push({ identifier: alarmId, boomId, warningId });
  await saveAlarmEntries(filtered);
  return true;
}

export async function cancelAllBoomAlarms(): Promise<void> {
  const entries = await loadAlarmEntries();
  for (const entry of entries) {
    try {
      await Notifications.cancelScheduledNotificationAsync(entry.identifier);
      if (entry.warningId) await Notifications.cancelScheduledNotificationAsync(entry.warningId);
    } catch {
      // ignore
    }
  }
  await saveAlarmEntries([]);
}

export async function rescheduleBoomAlarm(boomId: string, boomTime: string, title: string): Promise<boolean> {
  await cancelAllBoomAlarms();
  return scheduleBoomAlarm(boomId, boomTime, title);
}

export function getNotificationUrl(data?: unknown): string | null {
  const d = data as { url?: unknown } | undefined;
  return typeof d?.url === 'string' && d.url.startsWith('/') ? d.url : null;
}

export async function getInitialNotificationUrl(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const response = await Notifications.getLastNotificationResponseAsync();
  return getNotificationUrl(response?.notification.request.content.data);
}

export function subscribeToNotificationResponses(onOpen: (url: string) => void): { remove: () => void } {
  if (Platform.OS === 'web') return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const url = getNotificationUrl(response.notification.request.content.data);
    if (url) onOpen(url);
  });
}

// ---------- Primeira notificação (promoção de plano) ----------

async function ensureUpgradeChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(UPGRADE_CHANNEL_ID, {
      name: i18n.t('notifications.upgradeChannelName'),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF9F0A',
    });
  }
}

// ---------- Notificação de boas-vindas (primeiro login) ----------

const WELCOME_CHANNEL_ID = 'boas-vindas';
const WELCOME_KEY_PREFIX = 'welcome_sent';

async function ensureWelcomeChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(WELCOME_CHANNEL_ID, {
      name: i18n.t('notifications.welcomeChannelName'),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#16A43A',
    });
  }
}

export async function hasWelcomeSent(userId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(`${WELCOME_KEY_PREFIX}:${userId}`);
  return raw === '1';
}

/**
 * Envia (uma única vez por utilizador) a notificação de boas-vindas
 * no primeiro login após o cadastro. Ao tocar, leva o utilizador para o início.
 */
export async function scheduleWelcomeNotification(userId: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (await hasWelcomeSent(userId)) return false;

  await ensureWelcomeChannel();
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.welcomeTitle'),
        body: i18n.t('notifications.welcomeBody'),
        data: { url: '/(tabs)/inicio' },
        sound: Platform.OS === 'ios' ? 'default' : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        channelId: Platform.OS === 'android' ? WELCOME_CHANNEL_ID : undefined,
      },
    });
    await AsyncStorage.setItem(`${WELCOME_KEY_PREFIX}:${userId}`, '1');
    return true;
  } catch {
    return false;
  }
}

export async function hasUpgradePromptScheduled(userId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(`${UPGRADE_KEY_PREFIX}:${userId}`);
  return raw === '1';
}

/**
 * Agenda (uma única vez por utilizador) a primeira notificação do plano gratuito,
 * convidando-o a subscrever Basic, Pro ou Premium para sair do plano grátis.
 * Ao tocar, o utilizador é levado para a área de Planos.
 */
export async function scheduleUpgradePrompt(userId: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (await hasUpgradePromptScheduled(userId)) return false;

  await ensureUpgradeChannel();
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.upgradeTitle'),
        body: i18n.t('notifications.upgradeBody'),
        data: { url: '/planos' },
        sound: Platform.OS === 'ios' ? 'default' : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 20,
        channelId: Platform.OS === 'android' ? UPGRADE_CHANNEL_ID : undefined,
      },
    });
    await AsyncStorage.setItem(`${UPGRADE_KEY_PREFIX}:${userId}`, '1');
    return true;
  } catch {
    return false;
  }
}

// ---------- Lembretes de expiração da subscrição ----------

const EXPIRY_KEY_PREFIX = 'premium_expiry_alarms';
const EXPIRY_DAY_MS = 24 * 60 * 60 * 1000;

interface ExpiryEntry {
  periodEnd: string;
  id3?: string;
  id1?: string;
}

async function loadExpiryEntry(userId: string): Promise<ExpiryEntry | null> {
  const raw = await AsyncStorage.getItem(`${EXPIRY_KEY_PREFIX}:${userId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ExpiryEntry;
    if (parsed && typeof parsed.periodEnd === 'string') return parsed;
  } catch {
    // ignore
  }
  return null;
}

async function saveExpiryEntry(userId: string, entry: ExpiryEntry | null): Promise<void> {
  if (entry) await AsyncStorage.setItem(`${EXPIRY_KEY_PREFIX}:${userId}`, JSON.stringify(entry));
  else await AsyncStorage.removeItem(`${EXPIRY_KEY_PREFIX}:${userId}`);
}

async function cancelExpiryIds(ids: (string | undefined)[]): Promise<void> {
  for (const id of ids) {
    if (!id) continue;
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // ignore
    }
  }
}

/**
 * Garante lembretes agendados para 3 dias e 1 dia antes do fim da subscrição
 * actual. Idempotente por periodEnd — uma renovação (periodEnd novo) cancela
 * os lembretes antigos e agenda os novos.
 */
export async function syncPremiumExpiryNotifications(userId: string, currentPeriodEnd: string): Promise<void> {
  if (Platform.OS === 'web') return;

  const existing = await loadExpiryEntry(userId);
  if (existing && existing.periodEnd === currentPeriodEnd) return;

  await cancelExpiryIds(existing ? [existing.id3, existing.id1] : []);
  await saveExpiryEntry(userId, null);

  const end = new Date(currentPeriodEnd);
  if (isNaN(end.getTime()) || end.getTime() <= Date.now()) return;

  await ensureUpgradeChannel();
  const granted = await requestNotificationPermission();
  if (!granted) return;

  const entry: ExpiryEntry = { periodEnd: currentPeriodEnd };
  try {
    const at3 = new Date(end.getTime() - 3 * EXPIRY_DAY_MS);
    if (at3.getTime() > Date.now()) {
      entry.id3 = await Notifications.scheduleNotificationAsync({
        content: {
          title: i18n.t('notifications.expiry3Title'),
          body: i18n.t('notifications.expiry3Body', { days: 3 }),
          data: { url: '/planos' },
          sound: Platform.OS === 'ios' ? 'default' : undefined,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: at3,
          channelId: Platform.OS === 'android' ? UPGRADE_CHANNEL_ID : undefined,
        },
      });
    }

    const at1 = new Date(end.getTime() - 1 * EXPIRY_DAY_MS);
    if (at1.getTime() > Date.now()) {
      entry.id1 = await Notifications.scheduleNotificationAsync({
        content: {
          title: i18n.t('notifications.expiry1Title'),
          body: i18n.t('notifications.expiry1Body'),
          data: { url: '/planos' },
          sound: Platform.OS === 'ios' ? 'default' : undefined,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: at1,
          channelId: Platform.OS === 'android' ? UPGRADE_CHANNEL_ID : undefined,
        },
      });
    }

    await saveExpiryEntry(userId, entry);
  } catch {
    // best effort — não bloquear o arranque
  }
}

/** Cancela lembretes de expiração pendentes (ex.: subscrição deixou de estar activa). */
export async function cancelPremiumExpiryNotifications(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const existing = await loadExpiryEntry(userId);
  if (!existing) return;
  await cancelExpiryIds([existing.id3, existing.id1]);
  await saveExpiryEntry(userId, null);
}
