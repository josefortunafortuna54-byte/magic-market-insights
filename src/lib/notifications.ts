const BOOM_LIVE_WINDOW_MINUTES = 15;
const ALARMS_KEY = 'boom_alarms';

const BOOM_ALARM_ICON = '/logo.png';

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

/**
 * Converte uma hora "HH:MM" WAT no epoch (ms) do boom de hoje.
 * `timeWat` é uma string "HH:MM" — nunca a passar diretamente a `new Date()`.
 */
export function boomEpochMs(now: Date, timeWat: string): number {
  const [h, m] = (timeWat || '00:00').split(':').map(Number);
  const wat = new Date(now.getTime() + (now.getTimezoneOffset() + 60) * 60000);
  return Date.UTC(wat.getFullYear(), wat.getMonth(), wat.getDate(), h || 0, m || 0) - 3600_000;
}

interface AlarmEntry {
  identifier: string;
  boomId: string;
  warningId?: string;
  fired?: boolean;
  warningFired?: boolean;
  fireAt?: number;
  warningAt?: number;
  title?: string;
}

function formatWindowTime(boomTime: string): string {
  const d = new Date(boomTime);
  if (isNaN(d.getTime())) return '--:--';
  const h = String((d.getUTCHours() + 1) % 24).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

async function loadAlarmEntries(): Promise<AlarmEntry[]> {
  const raw = localStorage.getItem(ALARMS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (e): e is AlarmEntry =>
          !!e && typeof e.identifier === 'string' && typeof e.boomId === 'string',
      );
    }
  } catch {
    return [];
  }
  localStorage.removeItem(ALARMS_KEY);
  return [];
}

async function saveAlarmEntries(entries: AlarmEntry[]): Promise<void> {
  localStorage.setItem(ALARMS_KEY, JSON.stringify(entries));
}

export async function getBoomAlarm(boomId: string): Promise<AlarmEntry | null> {
  const entries = await loadAlarmEntries();
  return entries.find((e) => e.boomId === boomId) ?? null;
}

export async function cancelBoomAlarm(boomId: string): Promise<boolean> {
  const entries = await loadAlarmEntries();
  const matching = entries.filter((e) => e.boomId === boomId);
  if (matching.length === 0) return false;
  await saveAlarmEntries(entries.filter((e) => e.boomId !== boomId));
  return true;
}

/**
 * Regista um alarme de boom (aviso 5 min antes + alarme exato). O disparo é
 * interval-based (web): um `setInterval` módulo-nível verifica os alarmes
 * registados. Só dispara enquanto existe um separador aberto — paridade
 * degradada documentada (mesma limitação do Horarios web atual).
 */
export async function scheduleBoomAlarm(boomId: string, boomTime: string, title: string): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  const boomDate = new Date(boomTime);
  const fireAt = boomDate.getTime();
  const warningAt = fireAt - 5 * 60 * 1000;
  const now = Date.now();
  if (isNaN(fireAt) || boomDate.getTime() - now <= 0 || warningAt - now <= 0) return false;

  const entries = await loadAlarmEntries();
  const filtered = entries.filter((e) => e.boomId !== boomId);
  filtered.push({
    identifier: `boom-${boomId}`,
    boomId,
    warningId: `boom-warn-${boomId}`,
    warningAt,
    fireAt,
    title,
    warningFired: false,
    fired: false,
  });
  await saveAlarmEntries(filtered);
  return true;
}

async function fireDueAlarms(): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  const entries = await loadAlarmEntries();
  if (entries.length === 0) return;
  const now = Date.now();
  let changed = false;
  for (const e of entries) {
    if (!e.warningFired && e.warningAt !== undefined && e.warningAt <= now) {
      new Notification('A Hora do Boom aproxima-se', {
        body: `${e.title ?? ''} · Janela de ${BOOM_LIVE_WINDOW_MINUTES} minutos em ${formatWindowTime(new Date(e.fireAt ?? now).toISOString())}`,
        icon: BOOM_ALARM_ICON,
      });
      e.warningFired = true;
      changed = true;
    }
    if (!e.fired && e.fireAt !== undefined && e.fireAt <= now) {
      new Notification('HORA DO BOOM! 🚨', {
        body: `${e.title ?? ''} · Janela de ${BOOM_LIVE_WINDOW_MINUTES} minutos está ativa agora`,
        icon: BOOM_ALARM_ICON,
      });
      e.fired = true;
      changed = true;
    }
  }
  if (changed) await saveAlarmEntries(entries);
}

if (typeof window !== 'undefined' && 'Notification' in window) {
  setInterval(() => {
    void fireDueAlarms();
  }, 5000);
}