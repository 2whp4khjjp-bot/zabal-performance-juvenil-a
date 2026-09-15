import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from './App';

const remote = vi.hoisted(() => ({ getBootstrap: vi.fn(), getMeasurements: vi.fn(), getMatches: vi.fn(), logout: vi.fn() }));
vi.mock('./services', () => ({ dataService: remote }));
vi.mock('./components/AppHeader', () => ({ AppHeader: ({ onViewChange }: { onViewChange: (view: string) => void }) => <button onClick={() => onViewChange('matches')}>Partidos</button> }));
vi.mock('./components/MatchesPanel', () => ({ MatchesPanel: ({ matches }: { matches: { id: string }[] }) => <div>{matches.map((match) => match.id).join(',')}</div> }));
vi.mock('./components/PlayerGrid', () => ({ PlayerGrid: () => null }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('zabal-auth-session', JSON.stringify({ token: 'token', role: 'staff', expiresAt: Date.now() + 3600000 }));
  localStorage.setItem('zabal-matches-v1-staff-staff', JSON.stringify({ matches: [{ id: 'acta-antigua' }], savedAt: 1 }));
  remote.getBootstrap.mockResolvedValue({ players: [], measurements: [], session: { id: 'session', date: '2026-09-15' } });
  remote.getMeasurements.mockResolvedValue([]);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('avisa de la caché desactualizada y recupera las actas automáticamente', async () => {
  remote.getMatches.mockRejectedValueOnce(new Error('No se pudo contactar con el servicio de datos.')).mockResolvedValue([{ id: 'acta-actualizada' }]);
  render(<App />);
  await act(async () => {});
  fireEvent.click(screen.getByText('Partidos'));
  await act(async () => {});
  expect(screen.getByText(/pueden estar desactualizados/)).toBeTruthy();
  expect(screen.getByText('acta-antigua')).toBeTruthy();
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
  expect(remote.getMatches).toHaveBeenCalledTimes(2);
  expect(screen.getByText('acta-actualizada')).toBeTruthy();
  expect(screen.queryByText(/pueden estar desactualizados/)).toBeNull();
});

it('permite reintentar sin recargar la página', async () => {
  remote.getMatches.mockRejectedValueOnce(new Error('NETWORK')).mockResolvedValue([]);
  render(<App />);
  await act(async () => {});
  fireEvent.click(screen.getByText('Partidos'));
  await act(async () => {});
  fireEvent.click(screen.getByText('Reintentar'));
  await act(async () => {});
  expect(remote.getMatches).toHaveBeenCalledTimes(2);
  expect(screen.queryByText(/pueden estar desactualizados/)).toBeNull();
});
