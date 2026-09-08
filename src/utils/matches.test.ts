import { describe, expect, it } from 'vitest';
import type { MatchRecord } from '../types';
import { getMatchStage, matchesInScope } from './matches';

const match = (id: string, stage?: MatchRecord['stage']): MatchRecord => ({
  id,
  stage,
  date: '2026-09-06',
  type: 'official',
  opponent: 'Rival',
  durationMinutes: 90,
  minutes: [],
  createdAt: '2026-09-06T10:00:00.000Z',
  updatedAt: '2026-09-06T10:00:00.000Z',
  createdBy: 'cuerpo-tecnico',
});

describe('fases de los partidos', () => {
  it('considera de pretemporada los registros históricos sin fase', () => {
    expect(getMatchStage(match('legacy'))).toBe('preseason');
  });

  it('separa la liga sin eliminar el historial anterior', () => {
    const matches = [match('legacy'), match('league', 'league'), match('preseason', 'preseason')];
    expect(matchesInScope(matches, 'league').map((item) => item.id)).toEqual(['league']);
    expect(matchesInScope(matches, 'preseason').map((item) => item.id)).toEqual(['legacy', 'preseason']);
    expect(matchesInScope(matches, 'all')).toHaveLength(3);
  });
});
