import type { MatchRecord } from '../types';

export function disciplineForPlayer(matches: MatchRecord[], playerId: string) {
  return matches.reduce((total, match) => {
    const entry = match.minutes.find((item) => item.playerId === playerId);
    if (!entry) return total;
    const yellow = entry.yellowCards ?? 0;
    const expulsionYellow = entry.expulsionYellowCards ?? 0;
    total.yellowCards += yellow;
    total.accumulationYellowCards += yellow - expulsionYellow;
    total.expulsionYellowCards += expulsionYellow;
    total.redCards += entry.redCards ?? 0;
    if (entry.suspensionServed) total.suspensionMatches.push({ date: match.date, opponent: match.opponent });
    return total;
  }, { yellowCards: 0, accumulationYellowCards: 0, expulsionYellowCards: 0, redCards: 0, suspensionMatches: [] as { date: string; opponent: string }[] });
}
