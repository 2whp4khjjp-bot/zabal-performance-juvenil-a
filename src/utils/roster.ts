import type { Player } from '../types';
import { todayKey } from './date';
import { playerIsInjuredOn } from './injuries';

export const applyJuvenilRoster = (players: Player[], date = todayKey()) => players.map((player) => {
  const staffMember = player.staffMember || /\bCT\b|cuerpo t[ée]cnico|entrenador|preparador|fisio|delegado/i.test(player.name);
  return { ...player, number: staffMember ? undefined : player.number, injured: playerIsInjuredOn(player, date), staffMember };
}).sort((a, b) => Number(Boolean(a.staffMember)) - Number(Boolean(b.staffMember)) || (a.number ?? 999) - (b.number ?? 999) || a.order - b.order);
