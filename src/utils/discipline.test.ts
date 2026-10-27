import { describe, expect, it } from 'vitest';
import type { MatchRecord } from '../types';
import { disciplineForPlayer } from './discipline';

describe('disciplineForPlayer', () => {
  it('keeps recorded cards distinct from accumulation and manual suspension fulfilment', () => {
    const match = (id: string, date: string, yellowCards: number, redCards: number, expulsionYellowCards = 0, suspensionServed = false): MatchRecord => ({
      id, date, type: 'official', stage: 'league', opponent: id, durationMinutes: 90, createdAt: '', updatedAt: '', createdBy: '',
      minutes: [{ playerId: 'cristian', playerName: 'Cristian', minutes: 0, yellowCards, redCards, expulsionYellowCards, suspensionServed }],
    });
    const result = disciplineForPlayer([match('J4', '2026-09-20', 1, 0), match('J5', '2026-10-03', 1, 0), match('J7', '2026-10-17', 2, 1, 2), match('J8', '2026-10-25', 0, 0, 0, true)], 'cristian');
    expect(result).toEqual({ yellowCards: 4, accumulationYellowCards: 2, expulsionYellowCards: 2, needsReview: false, redCards: 1, suspensionMatches: [{ date: '2026-10-25', opponent: 'J8' }] });
  });
  it('flags the old one-yellow exception as pending review', () => {
    const match: MatchRecord = { id: 'J7', date: '2026-10-17', type: 'official', stage: 'league', opponent: 'Marbella', durationMinutes: 90, createdAt: '', updatedAt: '', createdBy: '', minutes: [{ playerId: 'cristian', playerName: 'Cristian', minutes: 70, yellowCards: 2, redCards: 1, expulsionYellowCards: 1 }] };
    expect(disciplineForPlayer([match], 'cristian').needsReview).toBe(true);
  });
});
