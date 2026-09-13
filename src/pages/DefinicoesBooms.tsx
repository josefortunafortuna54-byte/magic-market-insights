import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Layout } from '@/components/layout/Layout';
import { PremiumLock } from '@/components/signals/PremiumLock';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useBoomHours } from '@/hooks/useBoomHours';
import { useSubscription } from '@/hooks/useSubscription';
import {
  DEFAULT_BOOM_PREFS,
  VOL_TIERS,
  applyBoomPrefs,
  collectBoomPairs,
  loadBoomPrefs,
  saveBoomPrefs,
  type BoomPrefs,
} from '@/lib/boomPrefs';
import { requestNotificationPermission } from '@/lib/notifications';

const VOL_TIER_KEYS: Record<string, string> = {
  todas: "definicoesBooms.volAll",
  alta: "definicoesBooms.volHigh",
  media: "definicoesBooms.volMedium",
  baixa: "definicoesBooms.volLow",
};

async function enableNotifications(t: TFunction) {
  const granted = await requestNotificationPermission();
  if (!granted) {
    toast.error(t("notificacoes.title"), {
      description: t("definicoesBooms.enableNotification"),
    });
  }
}

export function DefinicoesBooms() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isPremium, tier, loading: subLoading } = useSubscription();
  const { booms: hours, loading: hoursLoading } = useBoomHours();
  const [prefs, setPrefs] = useState<BoomPrefs | null>(null);

  const premium = isPremium && tier === 'premium';
  const userId = user?.id;

  useEffect(() => {
    let active = true;
    void loadBoomPrefs(userId).then((p) => {
      if (active) setPrefs(p);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const update = useCallback(
    (patch: Partial<BoomPrefs>) => {
      setPrefs((prev) => {
        const next = { ...(prev ?? DEFAULT_BOOM_PREFS), ...patch };
        void saveBoomPrefs(next, userId);
        return next;
      });
    },
    [userId],
  );

  const allPairs = useMemo(() => collectBoomPairs(hours), [hours]);
  const visibleCount = useMemo(
    () => (prefs ? applyBoomPrefs(hours, prefs).length : hours.length),
    [hours, prefs],
  );

  const togglePair = (pair: string) => {
    if (!prefs) return;
    const has = prefs.pairs.includes(pair);
    update({ pairs: has ? prefs.pairs.filter((p) => p !== pair) : [...prefs.pairs, pair] });
  };

  const toggleHidden = (id: string) => {
    if (!prefs) return;
    const hidden = prefs.hiddenIds.includes(id);
    update({ hiddenIds: hidden ? prefs.hiddenIds.filter((x) => x !== id) : [...prefs.hiddenIds, id] });
  };

  const reset = () => {
    update({ pairs: [], volTier: 'todas', hiddenIds: [] });
  };

  return (
    <Layout>
      <div className="container mx-auto max-w-2xl space-y-5 px-4 py-8">
        <h1 className="font-display text-2xl font-bold">{t("definicoesBooms.title")}</h1>

        <div className="flex items-center gap-4 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t("definicoesBooms.alarmsTitle")}</p>
            <p className="text-sm text-muted-foreground">
              {t("definicoesBooms.alarmsDesc")}
            </p>
          </div>
          <Button variant="outline" onClick={() => void enableNotifications(t)}>
            {t("definicoesBooms.enable")}
          </Button>
        </div>

        {subLoading || prefs === null ? (
          <p className="text-sm text-muted-foreground">{t("definicoesBooms.loading")}</p>
        ) : !premium ? (
          <PremiumLock
            title={t("definicoesBooms.lockTitle")}
            description={t("definicoesBooms.lockDesc")}
          />
        ) : hoursLoading ? (
          <p className="text-sm text-muted-foreground">{t("definicoesBooms.loadingBooms")}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t("definicoesBooms.visibleCount", { visible: visibleCount, total: hours.length })}
            </p>

            <div className="space-y-4">
              <div>
                <p className="font-bold">{t("definicoesBooms.trend")}</p>
                <p className="text-sm text-muted-foreground">{t("definicoesBooms.windowsByVol")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {VOL_TIERS.map((tier) => (
                    <button
                      key={tier.key}
                      onClick={() => update({ volTier: tier.key })}
                      className={
                        prefs.volTier === tier.key
                          ? 'rounded-md border border-primary bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground'
                          : 'rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground'
                      }
                    >
                      {t(VOL_TIER_KEYS[tier.key])}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("definicoesBooms.volHint")}
                </p>
              </div>

              <div>
                <p className="font-bold">{t("definicoesBooms.pairs")}</p>
                <p className="text-sm text-muted-foreground">{t("definicoesBooms.pairsHint")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => update({ pairs: [] })}
                    className={
                      prefs.pairs.length === 0
                        ? 'rounded-md border border-primary bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground'
                        : 'rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground'
                    }
                  >
                    {t("definicoesBooms.all")}
                  </button>
                  {allPairs.map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePair(p)}
                      className={
                        prefs.pairs.includes(p)
                          ? 'rounded-md border border-primary bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground'
                          : 'rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground'
                      }
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {allPairs.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">{t("definicoesBooms.noPairs")}</p>
                ) : null}
              </div>

              <div>
                <p className="font-bold">{t("definicoesBooms.filterBooms")}</p>
                <p className="text-sm text-muted-foreground">{t("definicoesBooms.filterDesc")}</p>
                {hours.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">{t("definicoesBooms.emptyTitle")}</p>
                ) : (
                  <Card className="mt-2">
                    <CardContent className="space-y-2 pt-4">
                      {hours.map((h) => {
                        const hidden = prefs.hiddenIds.includes(h.id);
                        return (
                          <div
                            key={h.id}
                            className={
                              'flex items-center gap-3 rounded-lg border border-border bg-card p-3 ' +
                              (hidden ? 'opacity-55' : '')
                            }
                          >
                            <div className="min-w-0 flex-1">
                              <p className={'text-sm font-medium ' + (hidden ? 'line-through' : '')}>{h.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {h.time_wat} WAT · {(h.pairs || []).join(', ')}
                              </p>
                            </div>
                            <Switch checked={!hidden} onCheckedChange={() => toggleHidden(h.id)} />
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </div>

              <Button variant="ghost" onClick={reset}>
                {t("definicoesBooms.reset")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}