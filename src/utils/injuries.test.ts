import { describe, expect, it } from 'vitest';
import { injuryPeriodDays, totalInjuryDays } from './injuries';

describe('periodos de baja', () => {
  it('cuenta inicio y final y suma varios periodos', () => {
    expect(injuryPeriodDays({ id: '1', startDate: '2026-08-01', endDate: '2026-08-03' })).toBe(3);
    expect(totalInjuryDays({ id: 'p', name: 'Jugador', active: true, order: 1, joinedAt: '2026-07-01', injuries: [
      { id: '1', startDate: '2026-08-01', endDate: '2026-08-03' },
      { id: '2', startDate: '2026-08-10', endDate: '2026-08-11' },
    ] })).toBe(5);
  });
});
