import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, CheckCircle2, Clock3, Save, Search, UserCheck } from 'lucide-react';
import type { AttendanceInput, AttendanceRecord, AttendanceStatus, Measurement, Player } from '../types';
import { attendanceRankings, currentIsoWeek, filterAttendancePeriod, playerIsInjuredOn, type AttendancePeriod } from '../utils/attendance';
import { formatDate, formatShortDate, todayKey } from '../utils/date';

type Props = {
  players: Player[];
  measurements: Measurement[];
  attendance: AttendanceRecord[];
  saving: boolean;
  onSave: (input: AttendanceInput) => Promise<boolean>;
};

type Draft = { status: AttendanceStatus; lateMinutes: string; comments: string };

const statusLabels: Record<AttendanceStatus, string> = {
  pending: 'Pendiente', present: 'Presente', late: 'Llegó tarde', justified: 'Falta justificada',
  unjustified: 'Falta sin justificar', individual: 'Trabajo individual', medical: 'Baja médica',
};

export function AttendancePanel({ players, measurements, attendance, saving, onSave }: Props) {
  const roster = useMemo(() => players.filter((player) => !player.staffMember), [players]);
  const [mode, setMode] = useState<'daily' | 'rankings'>('daily');
  const [date, setDate] = useState(todayKey());
  const [query, setQuery] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [period, setPeriod] = useState<AttendancePeriod>('week');
  const [week, setWeek] = useState(currentIsoWeek());
  const [month, setMonth] = useState(todayKey().slice(0, 7));
  const [detailPlayer, setDetailPlayer] = useState<string>('');

  useEffect(() => {
    const saved = new Map(attendance.filter((item) => item.date === date).map((item) => [item.playerId, item]));
    const measured = new Set(measurements.filter((item) => item.date === date).map((item) => item.playerId));
    setDrafts(Object.fromEntries(roster.map((player) => {
      const existing = saved.get(player.id);
      const status: AttendanceStatus = existing?.status ?? (playerIsInjuredOn(player, date) ? 'medical' : measured.has(player.id) ? 'present' : 'pending');
      return [player.id, { status, lateMinutes: existing?.lateMinutes ? String(existing.lateMinutes) : '', comments: existing?.comments ?? '' }];
    })));
  }, [date, attendance, measurements, roster]);

  const counts = useMemo(() => Object.values(drafts).reduce((total, item) => {
    total[item.status] += 1;
    return total;
  }, { pending: 0, present: 0, late: 0, justified: 0, unjustified: 0, individual: 0, medical: 0 } as Record<AttendanceStatus, number>), [drafts]);
  const visibleRoster = roster.filter((player) => player.name.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')));
  const periodValue = period === 'week' ? week : period === 'month' ? month : '';
  const filteredRecords = useMemo(() => filterAttendancePeriod(attendance, period, periodValue), [attendance, period, periodValue]);
  const rankings = useMemo(() => attendanceRankings(roster, filteredRecords), [roster, filteredRecords]);
  const detailRecords = detailPlayer ? filteredRecords.filter((item) => item.playerId === detailPlayer && ['late', 'justified', 'unjustified', 'medical'].includes(item.status)).sort((a, b) => b.date.localeCompare(a.date)) : [];

  const update = (playerId: string, patch: Partial<Draft>) => setDrafts((current) => ({ ...current, [playerId]: { ...current[playerId], ...patch } }));
  const submit = async () => {
    const entries = roster.map((player) => {
      const draft = drafts[player.id] ?? { status: 'pending' as const, lateMinutes: '', comments: '' };
      return { playerId: player.id, playerName: player.name, status: draft.status, lateMinutes: draft.status === 'late' ? Number(draft.lateMinutes) : 0, comments: draft.comments };
    });
    await onSave({ date, entries });
  };

  return <main className="page-shell attendance-page">
    <div className="page-heading attendance-heading">
      <div><p className="eyebrow">CONTROL DE ENTRENAMIENTOS</p><h1>Asistencia al entreno</h1><p>Las mediciones marcan automáticamente a los jugadores como presentes.</p></div>
      <div className="matches-switch" role="tablist" aria-label="Vista de asistencia">
        <button type="button" className={mode === 'daily' ? 'active' : ''} onClick={() => setMode('daily')}><UserCheck size={17} /> Asistencia</button>
        <button type="button" className={mode === 'rankings' ? 'active' : ''} onClick={() => setMode('rankings')}><BarChart3 size={17} /> Rankings</button>
      </div>
    </div>

    {mode === 'daily' ? <>
      <section className="panel-card attendance-toolbar">
        <label><CalendarDays size={18} /><span>Fecha del entrenamiento</span><input type="date" max={todayKey()} value={date} onChange={(event) => setDate(event.target.value || todayKey())} /></label>
        <div className="attendance-counts"><span><strong>{counts.present + counts.late + counts.individual}</strong> asistentes</span><span><strong>{counts.pending}</strong> pendientes</span><span><strong>{counts.justified + counts.unjustified + counts.medical}</strong> ausencias</span></div>
      </section>
      <div className="search-field attendance-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar jugador…" aria-label="Buscar jugador en asistencia" /></div>
      <section className="panel-card attendance-list-card">
        <div className="panel-card__heading"><div><p className="eyebrow eyebrow--dark">{formatDate(date)}</p><h2>Estado de la plantilla</h2></div><small>{roster.length} jugadores</small></div>
        <div className="attendance-list">
          {visibleRoster.map((player) => { const draft = drafts[player.id] ?? { status: 'pending' as const, lateMinutes: '', comments: '' }; return <article className={`attendance-row attendance-row--${draft.status}`} key={player.id}>
            <span className="attendance-number">{player.number ?? player.order}</span>
            <strong>{player.name}</strong>
            <select value={draft.status} onChange={(event) => { const status = event.target.value as AttendanceStatus; update(player.id, { status, lateMinutes: status === 'late' ? (draft.lateMinutes || '5') : '' }); }} aria-label={`Asistencia de ${player.name}`}>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {draft.status === 'late' ? <label className="late-minutes"><Clock3 size={16} /><input type="number" min="1" max="180" inputMode="numeric" value={draft.lateMinutes} onChange={(event) => update(player.id, { lateMinutes: event.target.value })} aria-label={`Minutos de retraso de ${player.name}`} /><small>min</small></label> : <span className="attendance-status-mark"><CheckCircle2 size={18} />{statusLabels[draft.status]}</span>}
            <input className="attendance-comment" value={draft.comments} maxLength={250} onChange={(event) => update(player.id, { comments: event.target.value })} placeholder="Observación opcional" aria-label={`Observación de ${player.name}`} />
          </article>; })}
        </div>
        <div className="attendance-save-bar"><span>{counts.pending ? `${counts.pending} jugadores siguen pendientes` : 'Plantilla completa'}</span><button type="button" className="button button--primary" disabled={saving} onClick={() => void submit()}><Save size={18} /> {saving ? 'Guardando…' : 'Guardar asistencia del día'}</button></div>
      </section>
    </> : <>
      <section className="panel-card attendance-ranking-filters">
        <div><p className="eyebrow eyebrow--dark">PERIODO</p><h2>Filtrar estadísticas</h2></div>
        <div className="attendance-period-buttons">{(['week', 'month', 'season'] as AttendancePeriod[]).map((value) => <button type="button" key={value} className={period === value ? 'active' : ''} onClick={() => setPeriod(value)}>{value === 'week' ? 'Semana' : value === 'month' ? 'Mes' : 'Temporada'}</button>)}</div>
        {period === 'week' && <input type="week" value={week} onChange={(event) => setWeek(event.target.value)} aria-label="Semana del ranking" />}
        {period === 'month' && <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Mes del ranking" />}
      </section>
      <div className="attendance-rankings-grid">
        <section className="panel-card ranking-card ranking-card--late">
          <div className="panel-card__heading"><div><p className="eyebrow eyebrow--dark">TOP 5</p><h2>Minutos de retraso</h2></div><Clock3 /></div>
          {rankings.late.length ? <ol className="late-ranking">{rankings.late.map((row, index) => <li key={row.playerId} onClick={() => setDetailPlayer(row.playerId)}><span>{index + 1}</span><strong>{row.playerName}</strong><small>{row.delays} {row.delays === 1 ? 'retraso' : 'retrasos'}</small><b>{row.lateMinutes} min</b></li>)}</ol> : <div className="empty-state compact"><CheckCircle2 size={28} /><h3>Sin retrasos en este periodo</h3></div>}
        </section>
        <section className="panel-card ranking-card ranking-card--absences">
          <div className="panel-card__heading"><div><p className="eyebrow eyebrow--dark">PLANTILLA COMPLETA</p><h2>Ranking de ausencias</h2></div><CalendarDays /></div>
          <div className="table-wrap"><table><thead><tr><th>Jugador</th><th>Total</th><th>Just.</th><th>Sin just.</th><th>Baja</th></tr></thead><tbody>{rankings.absences.map((row) => <tr key={row.playerId} onClick={() => setDetailPlayer(row.playerId)}><td>{row.playerName}</td><td><strong>{row.totalAbsences}</strong></td><td>{row.justified}</td><td>{row.unjustified}</td><td>{row.medical}</td></tr>)}</tbody></table></div>
        </section>
      </div>
      {detailPlayer && <section className="panel-card attendance-detail"><div className="panel-card__heading"><div><p className="eyebrow eyebrow--dark">DETALLE</p><h2>{roster.find((player) => player.id === detailPlayer)?.name}</h2></div><button type="button" className="text-button" onClick={() => setDetailPlayer('')}>Cerrar</button></div>{detailRecords.length ? <div className="attendance-detail-list">{detailRecords.map((item) => <div key={item.id}><strong>{formatShortDate(item.date)}</strong><span>{statusLabels[item.status]}{item.status === 'late' ? ` · ${item.lateMinutes} min` : ''}</span><small>{item.comments}</small></div>)}</div> : <p className="muted-copy">No tiene retrasos ni ausencias en este periodo.</p>}</section>}
    </>}
  </main>;
}
