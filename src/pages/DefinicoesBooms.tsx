import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
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

const VOL_TIER_LABELS: Record<string, string> = {
  todas: 'Todas',
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

async function enableNotifications() {
  const granted = await requestNotificationPermission();
  if (!granted) {
    toast.error('Notificações', {
      description: 'Ativa as notificações nas definições do teu telemóvel.',
    });
  }
}

export function DefinicoesBooms() {
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
        <h1 className="font-display text-2xl font-bold">Definições do Boom</h1>

        <div className="flex items-center gap-4 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Alarmes &amp; Notificações</p>
            <p className="text-sm text-muted-foreground">
              Recebe avisos 5 minutos antes de cada janela de alta volatilidade.
            </p>
          </div>
          <Button variant="outline" onClick={() => void enableNotifications()}>
            Ativar
          </Button>
        </div>

        {subLoading || prefs === null ? (
          <p className="text-sm text-muted-foreground">A carregar definições…</p>
        ) : !premium ? (
          <PremiumLock
            title="Personalização Premium"
            description="Filtra os booms por tendência, pares e volatilidade."
          />
        ) : hoursLoading ? (
          <p className="text-sm text-muted-foreground">A carregar booms…</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {visibleCount} de {hours.length} booms visíveis no teu horário.
            </p>

            <div className="space-y-4">
              <div>
                <p className="font-bold">Tendência</p>
                <p className="text-sm text-muted-foreground">Janelas por volatilidade</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {VOL_TIERS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => update({ volTier: t.key })}
                      className={
                        prefs.volTier === t.key
                          ? 'rounded-md border border-primary bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground'
                          : 'rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground'
                      }
                    >
                      {VOL_TIER_LABELS[t.key]}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  As janelas do nível escolhido aparecem primeiro. Todos os BOOMs activos continuam sempre visíveis.
                </p>
              </div>

              <div>
                <p className="font-bold">Pares</p>
                <p className="text-sm text-muted-foreground">Só vês booms com estes pares</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => update({ pairs: [] })}
                    className={
                      prefs.pairs.length === 0
                        ? 'rounded-md border border-primary bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground'
                        : 'rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground'
                    }
                  >
                    Todos
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
                  <p className="mt-2 text-sm text-muted-foreground">Nenhum par associado aos booms.</p>
                ) : null}
              </div>

              <div>
                <p className="font-bold">Filtrar booms</p>
                <p className="text-sm text-muted-foreground">Oculta janelas que não queres ver</p>
                {hours.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Sem booms</p>
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
                Repor predefinições
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}