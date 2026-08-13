import type { InjuryPeriod, Player } from '../types';
import { todayKey } from './date';

const asDate = (value: string) => new Date(`${value}T12:00:00`);

export const injuryPeriodDays = (period: InjuryPeriod, today = todayKey()) => {
  const start = asDate(period.startDate).getTime();
  const end = asDate(period.endDate || today).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / 86400000) + 1;
};

export const totalInjuryDays = (player: Player) => (player.injuries ?? []).reduce((sum, period) => sum + injuryPeriodDays(period), 0);
