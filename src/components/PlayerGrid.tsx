import { AlertTriangle, CalendarDays, CheckCircle2, CircleDashed, Pencil, Plus, Save, Search, ShieldAlert, Trash2, UsersRound, X, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { DashboardFilter, Measurement, Player, PlayerInput } from '../types';
import { formatDate, todayKey } from '../utils/date';
import { playerIsInjuredOn } from '../utils/injuries';
import { alertLabel, getAlertLevel } from '../utils/measurements';

type PlayerGridProps = {
  players: Player[];
  measurements: Measurement[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onSelect: (player: Player) => void;
  filter: DashboardFilter;
  onFilterChange: (filter: DashboardFilter) => void;
  query: string;
  onQueryChange: (query: string) => void;
  saving: boolean;
  onAddPlayer: (input: PlayerInput) => Promise<boolean>;
  onRemovePlayer: (player: Player) => Promise<boolean>;
  onUpdatePlayerNumber: (player: Player, number: number | undefined) => Promise<boolean>;
};

const statusIcon = {
  pending: CircleDashed,
  partial: CircleDashed,
  normal: CheckCircle2,
  moderate: AlertTriangle,
  alert: ShieldAlert,
};

export function PlayerGrid({ players, measurements, selectedDate, onDateChange, onSelect, filter, onFilterChange, query, onQueryChange, saving, onAddPlayer, onRemovePlayer, onUpdatePlayerNumber }: PlayerGridProps) {
  const [managing, setManaging] = useState(false);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [editingNumberId, setEditingNumberId] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState('');
  const today = todayKey();
  const measurementsByPlayer = new Map(measurements.filter((item) => item.date === selectedDate).map((item) => [item.playerId, item]));
  const injuredPlayerIds = new Set(players.filter((player) => playerIsInjuredOn(player, selectedDate)).map((player) => player.id));
  const availablePlayers = players.filter((player) => !injuredPlayerIds.has(player.id));
  const registered = availablePlayers.filter((player) => measurementsByPlayer.has(player.id)).length;
  const pending = availablePlayers.length - registered;
  const filtered = players.filter((player) => {
    const hasMeasurement = measurementsByPlayer.has(player.id);
    const injuredOnSelectedDate = injuredPlayerIds.has(player.id);
    const matchesFilter = filter === 'all' || (filter === 'registered' ? hasMeasurement : !hasMeasurement && !injuredOnSelectedDate);
    return matchesFilter && player.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es').trim());
  });

  const addPlayer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await onAddPlayer({ name: name.trim(), number: number === '' ? undefined : Number(number) })) { setName(''); setNumber(''); }
  };
  const updateNumber = async (event: React.FormEvent, player: Player) => {
    event.preventDefault();
    if (await onUpdatePlayerNumber(player, newNumber === '' ? undefined : Number(newNumber))) { setEditingNumberId(null); setNewNumber(''); }
  };

  return (
    <main className="page-shell player-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow eyebrow--dark">{selectedDate === today ? 'Sesión de hoy' : 'Registro de otro día'}</p>
          <h1>Estado de la plantilla</h1>
          <p>Jugadores y mediciones del {formatDate(selectedDate)}.</p>
        </div>
        <div className="summary-counters" aria-label="Resumen de la sesión">
          <div><span>{players.length}</span><small>Plantilla</small></div>
          <div className="summary-counters__ok"><span>{registered}</span><small>Registrados</small></div>
          <div className="summary-counters__pending"><span>{pending}</span><small>Pendientes</small></div>
        </div>
        <button type="button" className="button button--secondary roster-manage-button" onClick={() => setManaging((current) => !current)}>{managing ? <X size={17} /> : <UsersRound size={17} />}{managing ? 'Cerrar gestión' : 'Gestionar plantilla'}</button>
      </div>

      {managing && <section className="panel-card roster-manager" aria-label="Gestión de plantilla">
        <div className="panel-card__heading"><div><p className="eyebrow eyebrow--dark">Plantilla activa</p><h2>Gestionar jugadores y dorsales</h2><p>Las bajas y los cambios de dorsal conservan las actas y los minutos anteriores.</p></div><span className="count-badge count-badge--blue">{players.filter((player) => !player.staffMember).length}</span></div>
        <form className="roster-add-form" onSubmit={(event) => void addPlayer(event)}>
          <label>Nombre<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Nombre y apellidos" required /></label>
          <label>Dorsal<input value={number} onChange={(event) => setNumber(event.target.value.replace(/\D/g, '').slice(0, 2))} type="number" min="1" max="99" inputMode="numeric" placeholder="Opcional" /></label>
          <button className="button button--primary" type="submit" disabled={saving || name.trim().length < 2}><Plus size={18} /> {saving ? 'Guardando…' : 'Añadir jugador'}</button>
        </form>
        <div className="roster-manager-list">{players.filter((player) => !player.staffMember).map((player) => <div key={player.id}>
          <span className="player-card__number">{player.number ?? '—'}</span><strong>{player.name}</strong>
          <div className="roster-player-actions">
            <button type="button" className="button button--secondary roster-edit-button" disabled={saving} onClick={() => { setEditingNumberId(player.id); setNewNumber(player.number == null ? '' : String(player.number)); }}><Pencil size={16} /> Dorsal</button>
            <button type="button" className="roster-remove-button" disabled={saving} onClick={() => { if (window.confirm(`¿Quitar a ${player.name} de la plantilla activa? Sus actas y minutos se conservarán.`)) void onRemovePlayer(player); }}><Trash2 size={16} /> Quitar</button>
          </div>
          {editingNumberId === player.id && <form className="roster-number-form" onSubmit={(event) => void updateNumber(event, player)}>
            <label>Nuevo dorsal para {player.name}<input value={newNumber} onChange={(event) => setNewNumber(event.target.value.replace(/\D/g, '').slice(0, 2))} type="number" min="1" max="99" inputMode="numeric" placeholder="Sin dorsal" /></label>
            <button className="button button--primary" type="submit" disabled={saving || (newNumber === '' ? null : Number(newNumber)) === (player.number ?? null)}><Save size={16} /> Guardar dorsal</button>
            <button className="button button--secondary" type="button" onClick={() => setEditingNumberId(null)} disabled={saving}>Cancelar</button>
          </form>}
        </div>)}</div>
      </section>}

      <section className="roster-date-selector" aria-label="Día de las mediciones">
        <div className="roster-date-selector__label">
          <CalendarDays size={22} aria-hidden="true" />
          <span><strong>Día de registro</strong><small>Elige la fecha una vez; se mantendrá al entrar y volver de cada jugador.</small></span>
        </div>
        <div className="roster-date-selector__controls">
          <input type="date" max={today} value={selectedDate} onChange={(event) => onDateChange(event.target.value || today)} aria-label="Fecha de las mediciones" />
          {selectedDate !== today && <button type="button" onClick={() => onDateChange(today)}>Volver a hoy</button>}
        </div>
      </section>

      <section className="player-toolbar" aria-label="Filtros de jugadores">
        <div className="search-field">
          <Search size={20} aria-hidden="true" />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Buscar jugador…" aria-label="Buscar jugador" />
        </div>
        <div className="segmented-control">
          {([
            ['all', `Todos ${players.length}`],
            ['pending', `Pendientes ${pending}`],
            ['registered', `Registrados ${registered}`],
          ] as const).map(([value, label]) => (
            <button key={value} className={filter === value ? 'active' : ''} onClick={() => onFilterChange(value)} aria-pressed={filter === value}>{label}</button>
          ))}
        </div>
      </section>

      {filtered.length ? (
        <section className="player-grid" aria-live="polite">
          {filtered.map((player) => {
            const measurement = measurementsByPlayer.get(player.id);
            const level = getAlertLevel(measurement);
            const Icon = statusIcon[level];
            const injuredOnSelectedDate = injuredPlayerIds.has(player.id);
            return (
              <article key={player.id} className={`player-card player-card--${level} ${injuredOnSelectedDate ? 'player-card--injured' : ''} ${player.staffMember ? 'player-card--staff' : ''}`}>
                <button
                  type="button"
                  data-testid={`player-${player.id}`}
                  className="player-card__main"
                  onClick={() => onSelect(player)}
                  aria-label={`${player.name}, ${injuredOnSelectedDate ? 'baja por lesión' : alertLabel[level]}`}
                >
                  <span className="player-card__number">{player.staffMember ? 'CT' : player.number ?? '—'}</span>
                  <span className="player-card__body">
                    <strong>{player.name}</strong>
                    {player.staffMember && <span className="player-card__staff-label">Cuerpo técnico</span>}
                    <span className="player-card__status">{injuredOnSelectedDate ? <><XCircle size={17} /> Baja por lesión</> : <><Icon size={17} /> {alertLabel[level]}</>}</span>
                  </span>
                  {measurement && <span className="player-card__values">F {measurement.fatigue ?? '—'} · M {measurement.soreness ?? '—'}</span>}
                </button>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="empty-state"><Search size={30} /><h2>No hay jugadores</h2><p>Prueba con otro nombre o cambia el filtro.</p></div>
      )}
    </main>
  );
}
