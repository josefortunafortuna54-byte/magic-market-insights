import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { cancelBoomAlarm, getBoomAlarm, scheduleBoomAlarm } from '@/lib/notifications';
import { useTranslation } from 'react-i18next';

export function AlarmToggle({
  boomId,
  boomTime,
  title,
}: {
  boomId: string;
  boomTime: string;
  title: string;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    let active = true;
    void getBoomAlarm(boomId).then((alarm) => {
      if (active) {
        setArmed(!!alarm);
        setBusy(false);
      }
    });
    return () => {
      active = false;
    };
  }, [boomId]);

  const toggle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (armed) {
        await cancelBoomAlarm(boomId);
        setArmed(false);
      } else {
        const ok = await scheduleBoomAlarm(boomId, boomTime, title);
        if (ok) {
          setArmed(true);
        } else {
          setBlocked(true);
        }
      }
    } finally {
      setBusy(false);
    }
  }, [armed, busy, boomId, boomTime, title]);

  if (busy) return <Loader2 className="h-5 w-5 animate-spin text-primary" />;

  return (
    <div className="mt-2 space-y-1">
      <button
        onClick={() => void toggle()}
        className={
          'flex items-center gap-2 self-start rounded-lg border px-3.5 py-2.5 text-sm font-bold ' +
          (armed
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-accent/55 bg-accent/10 text-accent')
        }
      >
        {armed ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {armed ? t('components.alarmToggle.active') : t('components.alarmToggle.activate')}
      </button>
      {armed ? (
        <p className="text-xs text-muted-foreground">{t('components.alarmToggle.hint5min')}</p>
      ) : null}
      {blocked ? (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <BellOff className="h-3.5 w-3.5" />
          {t('components.alarmToggle.blocked')}
        </p>
      ) : null}
    </div>
  );
}