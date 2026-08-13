import { lazy, Suspense, useEffect, useState } from 'react';
import type { AuthRole, AuthSession, DashboardFilter, MatchInput, MatchRecord, Measurement, MeasurementInput, Player, TrainingSession } from './types';
import { dataService } from './services';
import { clearAuthSession, readAuthSession, remainingSeconds, saveAuthSession } from './utils/session';
import { AppHeader } from './components/AppHeader';
import { LoginScreen } from './components/LoginScreen';
import { OfflineBanner } from './components/OfflineBanner';
import { PlayerGrid } from './components/PlayerGrid';
import { PlayerForm } from './components/PlayerForm';
import { Toast } from './components/Toast';
import { SiteFooter } from './components/SiteFooter';
import { todayKey } from './utils/date';
import { applyJuvenilRoster } from './utils/roster';
import './styles.css';

const TechnicalPanel = lazy(() => import('./components/TechnicalPanel').then((module) => ({ default: module.TechnicalPanel })));
const MatchesPanel = lazy(() => import('./components/MatchesPanel').then((module) => ({ default: module.MatchesPanel })));

type View = 'players' | 'matches' | 'technical';

export default function App() {
  const [auth, setAuth] = useState<AuthSession | null>(() => readAuthSession());
  const [remaining, setRemaining] = useState(() => auth ? remainingSeconds(auth.expiresAt) : 0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [trainingSession, setTrainingSession] = useState<TrainingSession | null>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [measurementDate, setMeasurementDate] = useState(todayKey());
  const [view, setView] = useState<View>('players');
  const [filter, setFilter] = useState<DashboardFilter>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [offline, setOffline] = useState(!navigator.onLine);
  const [hydratedToken, setHydratedToken] = useState('');

  const logout = async () => {
    if (auth) void dataService.logout(auth.token).catch(() => undefined);
    clearAuthSession();
    setAuth(null);
    setPlayers([]);
    setMeasurements([]);
    setTrainingSession(null);
    setMatches([]);
    setHydratedToken('');
    setSelectedPlayer(null);
    setMeasurementDate(todayKey());
    setView('players');
    setRemaining(0);
  };

  useEffect(() => {
    const online = () => setOffline(false);
    const offlineHandler = () => setOffline(true);
    window.addEventListener('online', online);
    window.addEventListener('offline', offlineHandler);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offlineHandler); };
  }, []);

  useEffect(() => {
    if (!auth || hydratedToken === auth.token) return;
    const update = () => {
      const seconds = remainingSeconds(auth.expiresAt);
      setRemaining(seconds);
      if (seconds <= 0) void logout();
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [auth?.expiresAt]);

  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    dataService.getBootstrap(auth.token).then(({ players: nextPlayers, measurements: nextMeasurements, session: nextSession }) => {
      setPlayers(applyJuvenilRoster(nextPlayers));
      setMeasurements(nextMeasurements);
      setTrainingSession(nextSession);
      setHydratedToken(auth.token);
      if (auth.role === 'player') setSelectedPlayer(applyJuvenilRoster(nextPlayers)[0] ?? null);
    }).catch((cause: Error) => {
      setError(cause.message || 'No se pudieron cargar los datos.');
      if (/sesión|session|unauthorized/i.test(cause.message)) void logout();
    }).finally(() => setLoading(false));
  }, [auth?.token, hydratedToken]);

  useEffect(() => {
    if (!auth || matchesLoaded || (auth.role === 'staff' && view !== 'matches' && view !== 'technical')) return;
    setLoading(true);
    dataService.getMatches(auth.token)
      .then((nextMatches) => { setMatches(nextMatches); setMatchesLoaded(true); })
      .catch((cause: Error) => setError(cause.message || 'No se pudieron cargar los partidos.'))
      .finally(() => setLoading(false));
  }, [auth?.token, auth?.role, view, matchesLoaded]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const login = async (pin: string, role: AuthRole) => {
    setLoading(true);
    setError('');
    try {
      const { auth: session, bootstrap } = await dataService.authenticate(pin, role);
      saveAuthSession(session);
      if (bootstrap) {
        const nextPlayers = applyJuvenilRoster(bootstrap.players);
        setPlayers(nextPlayers);
        setMeasurements(bootstrap.measurements);
        setTrainingSession(bootstrap.session);
        setHydratedToken(session.token);
        if (role === 'player') setSelectedPlayer(nextPlayers[0] ?? null);
        if (role === 'staff') {
          void dataService.getMeasurements(session.token)
            .then(setMeasurements)
            .catch(() => setError('La plantilla está disponible, pero el histórico sigue cargándose.'));
        }
      }
      setAuth(session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const saveMeasurement = async (input: MeasurementInput) => {
    if (!auth) return false;
    setSaving(true);
    setError('');
    try {
      const saved = await dataService.saveMeasurement(auth.token, input);
      setMeasurements((current) => {
        const index = current.findIndex((item) => item.id === saved.id);
        if (index < 0) return [...current, saved];
        const next = [...current];
        next[index] = saved;
        return next;
      });
      setToast('Datos guardados correctamente');
      if (auth.role === 'staff') window.setTimeout(() => { setSelectedPlayer(null); setView('players'); }, 850);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la medición.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveMatch = async (input: MatchInput) => {
    if (!auth || auth.role !== 'staff') return false;
    setSaving(true);
    setError('');
    try {
      const saved = await dataService.saveMatch(auth.token, input);
      setMatches((current) => [saved, ...current]);
      setToast('Partido, minutos y tarjetas guardados');
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el partido.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const setPlayerInjury = async (playerId: string, injured: boolean) => {
    if (!auth || auth.role !== 'staff') return;
    setSaving(true);
    setError('');
    try {
      const updated = await dataService.setPlayerInjury(auth.token, playerId, injured);
      setPlayers((current) => applyJuvenilRoster(current.map((player) => player.id === updated.id ? updated : player)));
      setSelectedPlayer((current) => current?.id === updated.id ? { ...current, ...updated } : current);
      setToast(injured ? 'Jugador marcado como baja' : 'Jugador disponible de nuevo');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cambiar el estado del jugador.');
    } finally { setSaving(false); }
  };

  if (!auth) return (
    <div className="login-shell">
      <OfflineBanner offline={offline} />
      <LoginScreen onLogin={login} loading={loading} error={error} />
      <SiteFooter />
    </div>
  );

  return (
    <div className="app">
      <OfflineBanner offline={offline} />
      <AppHeader remaining={remaining} view={view} role={auth.role} playerName={auth.playerName} onViewChange={(next) => { setView(next); setSelectedPlayer(null); }} onLogout={() => void logout()} />
      {error && <div className="global-error" role="alert"><span>{error}</span><button onClick={() => setError('')}>Cerrar</button></div>}
      {loading && !players.length ? <div className="loading-screen"><span className="loader" /><p>Preparando la sesión…</p></div> : null}
      {!loading && auth.role === 'staff' && view === 'players' && !selectedPlayer && <PlayerGrid players={players} measurements={measurements} selectedDate={measurementDate} onDateChange={setMeasurementDate} onSelect={setSelectedPlayer} filter={filter} onFilterChange={setFilter} query={query} onQueryChange={setQuery} />}
      {!loading && view === 'players' && selectedPlayer && trainingSession && <PlayerForm player={selectedPlayer} measurements={measurements} matches={matches} session={trainingSession} saving={saving} onSave={saveMeasurement} onInjuryChange={setPlayerInjury} onBack={() => setSelectedPlayer(null)} role={auth.role} selectedDate={measurementDate} onDateChange={setMeasurementDate} />}
      <Suspense fallback={<div className="loading-screen"><span className="loader" /><p>Cargando módulo…</p></div>}>
        {!loading && auth.role === 'staff' && view === 'matches' && <MatchesPanel players={players} matches={matches} saving={saving} onSave={saveMatch} />}
        {!loading && auth.role === 'staff' && view === 'technical' && <TechnicalPanel players={players} measurements={measurements} matches={matches} />}
      </Suspense>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
      <SiteFooter />
    </div>
  );
}
