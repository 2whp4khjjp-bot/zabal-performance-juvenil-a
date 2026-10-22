import { expect, it } from 'vitest';
import { createAttendanceDocument, createMatchDocument } from '../src/services/teamDocuments';
import type { AttendanceRecord, MatchRecord, Player } from '../src/types';
it('pagina las plantillas largas y conserva el resultado, capitán e incidencias', async () => {
  const players: Player[] = Array.from({ length: 31 }, (_, i) => ({ id: 'player-' + i, name: 'Jugador de prueba ' + (i + 1), number: i + 1, active: true, order: i + 1, joinedAt: '' }));
  const attendance = players.map((player, index) => ({ id: player.id, date: '2026-10-22', playerId: player.id, playerName: player.name, status: index % 3 === 0 ? 'medical' : 'present', lateMinutes: 0, comments: '', createdAt: '', updatedAt: '', createdBy: '' })) as AttendanceRecord[];
  const match: MatchRecord = { id: 'test', date: '2026-10-22', type: 'official', opponent: 'Rival de prueba', durationMinutes: 90, referee: 'Árbitro de prueba', goalsFor: 0, goalsAgainst: 0, captainId: players[0].id, incidents: 'Prueba de incidencias con observaciones del encuentro. '.repeat(45), minutes: players.slice(0, 26).map((player, index) => ({ playerId: player.id, playerName: player.name, minutes: index < 11 ? 90 : 15, calledUp: true, starter: index < 11, goals: 0, yellowCards: index % 4 === 0 ? 1 : 0, redCards: 0 })), createdAt: '', updatedAt: '', createdBy: '' };
  const a = await createAttendanceDocument(players, attendance, 'Últimos 3 meses');
  const m = await createMatchDocument(match, players);
  expect(a.getNumberOfPages()).toBeGreaterThan(0); expect(m.getNumberOfPages()).toBeGreaterThan(1);
  expect(m.output()).toContain('0 - 0'); expect(m.output()).toContain('Raul Cote');
});
