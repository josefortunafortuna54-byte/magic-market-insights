import { AlertOctagon, AlertTriangle, Calendar, Info, Newspaper } from 'lucide-react';
import type { EconomicEvent, ImpactLevel } from '@/lib/economicCalendar';

const ICON_MAP: Record<ImpactLevel, typeof AlertOctagon> = {
  high: AlertOctagon,
  medium: AlertTriangle,
  low: Info,
  holiday: Calendar,
};

const IMPACT_STYLE: Record<ImpactLevel, { text: string; border: string; bg: string }> = {
  high: { text: 'text-red-500', border: 'border-red-500/25', bg: 'bg-red-500/5' },
  medium: { text: 'text-amber-500', border: 'border-amber-500/25', bg: 'bg-amber-500/5' },
  low: { text: 'text-green-600', border: 'border-green-600/25', bg: 'bg-green-600/5' },
  holiday: { text: 'text-gray-500', border: 'border-gray-500/25', bg: 'bg-gray-500/5' },
};

function ValueCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex shrink-0 flex-col items-end gap-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={`text-[10px] ${color}`}>{value}</span>
    </div>
  );
}

export function EconomicEventBadge({ event }: { event: EconomicEvent }) {
  const style = IMPACT_STYLE[event.impact];
  const Icon = ICON_MAP[event.impact];
  return (
    <div className={`flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 ${style.border} ${style.bg}`}>
      <Icon className={`h-3.5 w-3.5 shrink-0 ${style.text}`} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-xs font-semibold ${style.text}`}>
          {event.currency} — {event.event}
        </p>
        <p className="text-[10px] text-muted-foreground">{event.time}</p>
      </div>
      {event.forecast ? (
        <ValueCell label="F" value={event.forecast} color="text-muted-foreground" />
      ) : null}
      {event.actual ? <ValueCell label="A" value={event.actual} color={style.text} /> : null}
    </div>
  );
}

export function EconomicEventsRow({ events }: { events: EconomicEvent[] }) {
  if (!events.length) return null;
  return (
    <div className="mt-2 space-y-1">
      <p className="mb-0.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        <Newspaper className="h-3 w-3" />
        Notícias Económicas
      </p>
      {events.map((e, i) => (
        <EconomicEventBadge key={`${e.currency}-${e.event}-${i}`} event={e} />
      ))}
    </div>
  );
}