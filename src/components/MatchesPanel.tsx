import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, Clock3, History, Save, Trophy, UsersRound } from 'lucide-react';
import type { MatchInput, MatchRecord, MatchType, Player } from '../types';
import { todayKey } from '../utils/date';

const durationOptions = [40, 50, 60, 70, 80, 90] as const;

type Props = {
  players: Player[];
  matches: MatchRecord[];
  saving: boolean;
  onSave: (input: MatchInput) => Promise<boolean>;
};

const typeLabel = (type: MatchType) => type === 'official' ? 'Oficial' : 'Amistoso';

export function MatchesPanel({ players, matches, saving, onSave }: Props) {
  const [mode, setMode] = useState<'new' | 'history'>('new');
  const [date, setDate] = useState(todayKey());
  const [type, setType] = useState<MatchType>('official');
  const [opponent, setOpponent] = useState('');
  const [durationOption, setDurationOption] = useState('90');
  const [customDuration, setCustomDuration] = useState('90');
  const [minutesByPlayer, setMinutesByPlayer] = useState<Record<string, string>>({});
  const [yellowByPlayer, setYellowByPlayer] = useState<Record<string, string>>({});
  const [redByPlayer, setRedByPlayer] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);

  const duration = durationOption === 'custom' ? Number(customDuration) : Number(durationOption);
  const enteredValues = Object.values(minutesByPlayer).filter((value) => value !== '');
  const enteredPlayerIds = new Set(players.filter((player) => (minutesByPlayer[player.id] !== undefined && minutesByPlayer[player.id] !== '') || Number(yellowByPlayer[player.id] || 0) > 0 || Number(redByPlayer[player.id] || 0) > 0).map((player) => player.id));
  const enteredCount = enteredPlayerIds.size;
  const totalEnteredMinutes = enteredValues.reduce((sum, value) => sum + (Number(value) || 0), 0);

  const totals = useMemo(() => {
    const byPlayer = new Map<string, { player: Player; appearances: number; minutes: number; yellowCards: number; redCards: number }>();
    players.forEach((player) => byPlayer.set(player.id, { player, appearances: 0, minutes: 0, yellowCards: 0, redCards: 0 }));
    matches.forEach((match) => match.minutes.forEach((entry) => {
      const total = byPlayer.get(entry.playerId);
      if (!total) return;
      total.minutes += entry.minutes;
      total.yellowCards += entry.yellowCards ?? 0;
      total.redCards += entry.redCards ?? 0;
      if (entry.minutes > 0) total.appearances += 1;
    }));
    return [...byPlayer.values()].filter((item) => item.appearances || item.minutes || item.yellowCards || item.redCards).sort((a, b) => (a.player.number ?? 999) - (b.player.number ?? 999) || a.player.order - b.player.order);
  }, [matches, players]);

  const validate = () => {
    const next: string[] = [];
    if (!date) next.push('Selecciona la fecha del partido.');
    if (!opponent.trim()) next.push('Introduce el rival.');
    if (!Number.isInteger(duration) || duration < 1 || duration > 180) next.push('La duración debe estar entre 1 y 180 minutos.');
    if (!enteredCount) next.push('Introduce minutos o tarjetas de al menos un jugador.');
    players.forEach((player) => {
      const raw = minutesByPlayer[player.id];
      if (raw !== undefined && raw !== '') {
        const value = Number(raw);
        if (!Number.isInteger(value) || value < 0 || value > duration) next.push(`Revisa los minutos de ${player.name}.`);
      }
      const yellow = Number(yellowByPlayer[player.id] || 0);
      const red = Number(redByPlayer[player.id] || 0);
      if (!Number.isInteger(yellow) || yellow < 0 || yellow > 2) next.push(`Revisa las amarillas de ${player.name}.`);
      if (!Number.isInteger(red) || red < 0 || red > 1) next.push(`Revisa las rojas de ${player.name}.`);
    });
    setErrors(next);
    return !next.length;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    const input: MatchInput = {
      date,
      type,
      opponent: opponent.trim(),
      durationMinutes: duration,
      minutes: players.flatMap((player) => {
        const raw = minutesByPlayer[player.id];
        const yellowCards = Number(yellowByPlayer[player.id] || 0);
        const redCards = Number(redByPlayer[player.id] || 0);
        return (raw === undefined || raw === '') && !yellowCards && !redCards ? [] : [{ playerId: player.id, playerName: player.name, minutes: Number(raw || 0), yellowCards, redCards }];
      }),
    };
    if (await onSave(input)) {
      setOpponent('');
      setMinutesByPlayer({});
      setYellowByPlayer({});
      setRedByPlayer({});
      setErrors([]);
      setMode('history');
    }
  };

  return (
    <main className="page-shell matches-page">
      <div className="page-heading matches-heading">
        <div><p className="eyebrow eyebrow--dark">Control de competición</p><h1>Partidos, minutos y tarjetas</h1><p>Registra manualmente la participación y disciplina de la plantilla.</p></div>
        <div className="matches-switch" role="tablist" aria-label="Vista de partidos">
          <button className={mode === 'new' ? 'active' : ''} onClick={() => setMode('new')} role="tab" aria-selected={mode === 'new'}><Trophy size={18} /> Nuevo partido</button>
          <button className={mode === 'history' ? 'active' : ''} onClick={() => setMode('history')} role="tab" aria-selected={mode === 'history'}><History size={18} /> Historial</button>
        </div>
      </div>

      {mode === 'new' ? <form className="match-form" onSubmit={(event) => void submit(event)} noValidate>
        <section className="panel-card match-details-card">
          <div className="panel-card__heading"><div><p className="eyebrow eyebrow--dark">Datos del encuentro</p><h2>Nuevo partido</h2></div><CalendarDays /></div>
          <div className="match-fields">
            <label>Fecha<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label>Tipo<select value={type} onChange={(event) => setType(event.target.value as MatchType)}><option value="official">Oficial</option><option value="friendly">Amistoso</option></select></label>
            <label className="match-field--wide">Rival<input value={opponent} maxLength={100} onChange={(event) => setOpponent(event.target.value)} placeholder="Nombre del equipo rival" /></label>
            <label className="match-field--wide">Duración total<select value={durationOption} onChange={(event) => setDurationOption(event.target.value)}>{durationOptions.map((value) => <option key={value} value={value}>{value} minutos</option>)}<option value="custom">Personalizado</option></select></label>
            {durationOption === 'custom' && <label className="match-field--wide">Minutos personalizados<input type="number" min="1" max="180" inputMode="numeric" value={customDuration} onChange={(event) => setCustomDuration(event.target.value)} /></label>}
          </div>
        </section>

        <section className="panel-card match-minutes-card">
          <div className="panel-card__heading match-minutes-heading">
            <div><p className="eyebrow eyebrow--dark">Participación y disciplina</p><h2>Acta por jugador</h2><p>Minutos, amarillas y rojas. Deja vacío lo que no corresponda.</p></div>
            <span className="duration-badge"><Clock3 size={16} /> Máximo {Number.isFinite(duration) ? duration : '—'}</span>
          </div>
          <div className="match-player-list">
            {players.map((player) => <label className="match-player-row" key={player.id}>
              <span className="match-player-number">{player.number ?? player.order}</span>
              <span className="match-player-name">{player.name}</span>
              <span className="match-stat-input"><input type="number" min="0" max={Number.isFinite(duration) ? duration : undefined} step="1" inputMode="numeric" value={minutesByPlayer[player.id] ?? ''} onChange={(event) => { setMinutesByPlayer((current) => ({ ...current, [player.id]: event.target.value })); setErrors([]); }} aria-label={`Minutos de ${player.name}`} placeholder="—" /><small>min</small></span>
              <span className="match-card-input"><span className="card-mark card-mark--yellow" /><input type="number" min="0" max="2" step="1" inputMode="numeric" value={yellowByPlayer[player.id] ?? ''} onChange={(event) => { setYellowByPlayer((current) => ({ ...current, [player.id]: event.target.value })); setErrors([]); }} aria-label={`Tarjetas amarillas de ${player.name}`} placeholder="0" /></span>
              <span className="match-card-input"><span className="card-mark card-mark--red" /><input type="number" min="0" max="1" step="1" inputMode="numeric" value={redByPlayer[player.id] ?? ''} onChange={(event) => { setRedByPlayer((current) => ({ ...current, [player.id]: event.target.value })); setErrors([]); }} aria-label={`Tarjetas rojas de ${player.name}`} placeholder="0" /></span>
            </label>)}
          </div>
          <div className="match-form-summary"><span><UsersRound size={17} /> <strong>{enteredCount}</strong> con minutos</span><span><Clock3 size={17} /> <strong>{totalEnteredMinutes}</strong> minutos acumulados</span></div>
          {errors.length > 0 && <div className="validation-summary" role="alert"><strong>No se puede guardar todavía:</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
          <div className="match-save-bar"><button className="button button--primary button--wide" disabled={saving} type="submit"><Save size={19} /> {saving ? 'Guardando…' : 'Guardar acta'}</button></div>
        </section>
      </form> : <section className="matches-history" aria-label="Historial de partidos">
        <div className="matches-history-grid">
          <article className="panel-card match-totals-card">
            <div className="panel-card__heading"><div><p className="eyebrow eyebrow--dark">Temporada</p><h2>Totales por jugador</h2></div><span className="count-badge count-badge--blue">{matches.length}</span></div>
            {totals.length ? <div className="table-scroll"><table><thead><tr><th>Dorsal</th><th>Jugador</th><th>PJ</th><th>Minutos</th><th>TA</th><th>TR</th></tr></thead><tbody>{totals.map((item) => { const warning = item.yellowCards > 0 && item.yellowCards % 5 === 4; return <tr key={item.player.id} className={warning ? 'discipline-warning-row' : ''}><td>{item.player.number ?? '—'}</td><td><strong>{item.player.name}</strong>{warning && <small className="discipline-warning"><AlertTriangle size={13} /> A una amarilla de sanción</small>}</td><td>{item.appearances}</td><td><strong>{item.minutes}</strong></td><td><strong>{item.yellowCards}</strong></td><td><strong>{item.redCards}</strong></td></tr>; })}</tbody></table></div> : <div className="empty-state compact"><UsersRound size={30} /><h2>Sin actas registradas</h2><p>Los totales aparecerán después de guardar el primer partido.</p></div>}
          </article>
          <article className="panel-card recent-matches-card">
            <div className="panel-card__heading"><div><p className="eyebrow eyebrow--dark">Registro</p><h2>Últimos partidos</h2></div><History /></div>
            {matches.length ? <div className="recent-match-list">{matches.map((match) => <article className="recent-match-row" key={match.id}><span className={`match-type-icon match-type-icon--${match.type}`}><Trophy size={18} /></span><div><strong>{match.opponent}</strong><small>{match.date} · {typeLabel(match.type)} · {match.durationMinutes} min</small></div><span><strong>{match.minutes.filter((item) => item.minutes > 0).length}</strong><small>jugadores</small></span></article>)}</div> : <div className="empty-state compact"><Trophy size={30} /><h2>Todavía no hay partidos</h2><button className="text-button" onClick={() => setMode('new')}>Registrar el primero</button></div>}
          </article>
        </div>
      </section>}
    </main>
  );
}
