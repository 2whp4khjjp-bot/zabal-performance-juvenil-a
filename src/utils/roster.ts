import type { Player } from '../types';

const shirtNumbers: Array<[number, RegExp]> = [
  [1, /^álvaro torres$/i], [2, /^jairo muñoz$/i], [3, /^antonio torres$/i], [4, /^daren castro$/i],
  [5, /^jorge vera$/i], [6, /^raúl andrades$/i], [7, /^omar(?:\s|$)/i], [8, /^samuel lozano$/i],
  [9, /cañestro/i], [10, /palomo/i], [11, /^sam( russell)?$/i], [13, /^dani/i],
  [14, /^manuel arroyo$/i], [16, /^samuel (espinosa|m)/i], [17, /piñer/i], [18, /^(cristian|kristian) blanco$/i],
  [19, /parra/i], [20, /(álex|alex).*herrera|a\. herrera/i], [21, /oncala/i], [22, /^nico/i],
  [23, /^pepe ruiz$/i], [24, /^francis pecino$/i], [25, /^álvaro cervera$/i], [26, /^lázaro gómez$/i],
];

export const applyJuvenilRoster = (players: Player[]) => players.map((player) => {
  const assigned = shirtNumbers.find(([, pattern]) => pattern.test(player.name.trim()))?.[0];
  return { ...player, number: assigned ?? player.number };
}).sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.order - b.order);
