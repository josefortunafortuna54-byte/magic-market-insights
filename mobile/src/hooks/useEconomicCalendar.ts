import { useEffect, useState } from 'react';
import {
  CalendarResponse,
  EconomicEvent,
  eventsNearBoom,
  fetchTodayEvents,
  fetchWeekEvents,
} from '../services/economicCalendar';

export function useEconomicCalendar() {
  const [today, setToday] = useState<EconomicEvent[]>([]);
  const [week, setWeek] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const [todayRes, weekRes] = await Promise.all([
        fetchTodayEvents(),
        fetchWeekEvents(),
      ]);
      if (!active) return;
      setToday(todayRes?.events ?? []);
      setWeek(weekRes?.events ?? []);
      setLoading(false);
    }
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const newsForBoom = (boomTimeWAT: string, boomPairs: string[]) =>
    eventsNearBoom(today, boomTimeWAT, boomPairs, 60);

  return { today, week, loading, newsForBoom };
}
