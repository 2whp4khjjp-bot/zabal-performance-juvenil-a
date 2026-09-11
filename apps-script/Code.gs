/**
 * API de Google Apps Script para Zabal Performance.
 * Despliegue como aplicación web ejecutada por el propietario.
 */
const SHEETS = {
  PLAYERS: 'Jugadores',
  MEASUREMENTS: 'Mediciones',
  SESSIONS: 'Sesiones',
  CONFIG: 'Configuración',
  CODES: 'Códigos jugadores',
  MATCHES: 'Partidos',
  MATCH_MINUTES: 'Minutos partidos',
  INJURIES: 'Bajas',
  ATTENDANCE: 'Asistencia',
};
const MAX_STARTERS = 11; // Cambiar a 7 al desplegar una categoría de fútbol 7.

const HEADERS = {
  Jugadores: ['id', 'nombre', 'dorsal', 'activo', 'orden', 'fecha_alta', 'pin_hash', 'baja_lesion', 'fecha_nacimiento', 'correo_electronico'],
  Mediciones: ['id', 'fecha', 'hora', 'fecha_hora', 'jugador_id', 'jugador_nombre', 'peso', 'fatiga', 'molestias', 'comentarios', 'sesion_id', 'creado_por', 'actualizado_en'],
  Sesiones: ['id', 'fecha', 'tipo_sesion', 'rival', 'jornada', 'activa', 'hora_apertura', 'hora_cierre'],
  Configuración: ['clave', 'valor'],
  'Códigos jugadores': ['jugador_id', 'jugador_nombre', 'pin'],
  Partidos: ['id', 'fecha', 'tipo', 'rival', 'duracion_minutos', 'creado_en', 'actualizado_en', 'creado_por', 'fase'],
  'Minutos partidos': ['partido_id', 'jugador_id', 'jugador_nombre', 'minutos', 'amarillas', 'rojas', 'convocado', 'goles', 'titular'],
  Bajas: ['id', 'jugador_id', 'jugador_nombre', 'fecha_inicio', 'fecha_fin', 'motivo', 'creado_en', 'actualizado_en'],
  Asistencia: ['id', 'fecha', 'jugador_id', 'jugador_nombre', 'estado', 'minutos_retraso', 'comentarios', 'creado_en', 'actualizado_en', 'creado_por'],
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Zabal Performance')
    .addItem('Preparar estructura', 'setupProject')
    .addItem('Configurar PIN del cuerpo técnico', 'configurePinFromUi')
    .addItem('Generar PINs de jugadores', 'generatePlayerPinsFromUi')
    .addItem('Aplicar PINs editados', 'applyPlayerPinsFromUi')
    .addSeparator()
    .addItem('Configurar infografía semanal', 'configureWeeklyInfographicFromUi')
    .addItem('Quitar infografía semanal', 'clearWeeklyInfographicFromUi')
    .addSeparator()
    .addItem('Activar correos semanales', 'enableWeeklyPlayerEmailsFromUi')
    .addItem('Desactivar correos semanales', 'disableWeeklyPlayerEmailsFromUi')
    .addToUi();
}

function configurePinFromUi() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('PIN del cuerpo técnico', 'Introduce un PIN de 4 a 12 dígitos. Se guardará únicamente su hash.', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  setStaffPin(response.getResponseText());
  ui.alert('PIN configurado correctamente.');
}

function generatePlayerPinsFromUi() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('Generar PINs personales', 'Se crearán PINs nuevos para todos los jugadores activos. Los anteriores dejarán de funcionar. ¿Continuar?', ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;
  const count = generatePlayerPins_();
  ui.alert('Se han generado ' + count + ' PINs. Puedes verlos en la pestaña "Códigos jugadores".');
}

function applyPlayerPinsFromUi() {
  const ui = SpreadsheetApp.getUi();
  try {
    const count = applyPlayerPins_();
    ui.alert('PINs actualizados', 'Se han aplicado ' + count + ' PINs personales. Los jugadores deberán usar desde ahora los códigos escritos en la pestaña "Códigos jugadores".', ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('No se pudieron aplicar los PINs', error.message || String(error), ui.ButtonSet.OK);
  }
}

// Utilidad de administración para la primera puesta en marcha desde el editor.
function initializePlayerPins() {
  return generatePlayerPins_();
}

function doGet() {
  return json_({ ok: true, data: { service: 'Zabal Performance API', version: 9 } });
}

function doPost(event) {
  try {
    const input = JSON.parse(event.postData.contents || '{}');
    const action = String(input.action || '');
    if (action === 'authenticate') return json_({ ok: true, data: authenticate_(input.pin, input.role, input.includeBootstrap) });
    if (action === 'logout') return json_({ ok: true, data: logout_(input.token) });
    const session = requireSession_(input.token);
    if (action === 'getBootstrap') return json_({ ok: true, data: getBootstrap_(session) });
    if (action === 'getPlayers') return json_({ ok: true, data: getPlayers_(session) });
    if (action === 'getMeasurements') return json_({ ok: true, data: getMeasurements_(session) });
    if (action === 'getCurrentSession') return json_({ ok: true, data: getCurrentSession_() });
    if (action === 'saveMeasurement') return json_({ ok: true, data: saveMeasurement_(input.measurement, session) });
    if (action === 'getMatches') return json_({ ok: true, data: getMatches_(session) });
    if (action === 'saveMatch') return json_({ ok: true, data: saveMatch_(input.match, session) });
    if (action === 'updateMatch') return json_({ ok: true, data: updateMatch_(input.matchId, input.match, session) });
    if (action === 'deleteMatch') return json_({ ok: true, data: deleteMatch_(input.matchId, session) });
    if (action === 'getAttendance') return json_({ ok: true, data: getAttendance_(session) });
    if (action === 'saveAttendance') return json_({ ok: true, data: saveAttendance_(input.attendance, session) });
    if (action === 'setPlayerInjury') return json_({ ok: true, data: setPlayerInjury_(input.playerId, input.injury || { injured: input.injured }, session) });
    if (action === 'saveBirthDate') return json_({ ok: true, data: saveBirthDate_(input.birthDate, session) });
    if (action === 'saveEmail') return json_({ ok: true, data: saveEmail_(input.email, session) });
    throw apiError_('Acción no permitida.', 'INVALID_ACTION');
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return json_({ ok: false, error: error.message || 'Error interno.', code: error.code || 'SERVER_ERROR' });
  }
}

function setupProject() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Abre este script desde la hoja de cálculo antes de ejecutar la configuración.');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheet.getId());
  Object.keys(HEADERS).forEach(function(name) { ensureSheet_(spreadsheet, name, HEADERS[name]); });
  ensureConfig_('nombre_equipo', 'Atlético Zabal Linense');
  ensureConfig_('temporada', '2026-27');
  setConfig_('duracion_sesion_minutos', '60');
  ensureConfig_('fatiga_moderada_desde', '4');
  ensureConfig_('fatiga_alerta_desde', '7');
  ensureConfig_('molestias_moderada_desde', '4');
  ensureConfig_('molestias_alerta_desde', '7');
  ensureConfig_('duracion_partido_minutos', '90');
  ensureConfig_('cambio_peso_relevante_kg', '1.5');
  ensureConfig_('correos_semanales_jugadores', 'FALSE');
  ensureAuthSecret_();
  ensureStaffMember_('Luis Lara CT');
  return 'Estructura actualizada. Configura el PIN técnico y genera los PINs de jugadores desde el menú Zabal Performance.';
}

function ensureStaffMember_(name) {
  const sheet = sheet_(SHEETS.PLAYERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const nameColumn = headers.indexOf('nombre');
  if (values.slice(1).some(function(row) { return String(row[nameColumn]).trim().toLowerCase() === String(name).trim().toLowerCase(); })) return;
  const idColumn = headers.indexOf('id');
  const orderColumn = headers.indexOf('orden');
  const maxOrder = values.slice(1).reduce(function(maximum, row) { return Math.max(maximum, Number(row[orderColumn] || 0)); }, 0);
  const row = headers.map(function(header) {
    if (header === 'id') return 'staff-luis-lara';
    if (header === 'nombre') return name;
    if (header === 'activo') return true;
    if (header === 'orden') return maxOrder + 1;
    if (header === 'fecha_alta') return new Date();
    return '';
  });
  sheet.appendRow(row);
}

function setStaffPin(pin) {
  const clean = String(pin || '').trim();
  if (!/^\d{4,12}$/.test(clean)) throw new Error('El PIN debe contener entre 4 y 12 dígitos.');
  PropertiesService.getScriptProperties().setProperty('STAFF_PIN_SHA256', sha256_(clean));
  return 'PIN guardado como hash SHA-256.';
}

function authenticate_(pin, requestedRole, includeBootstrap) {
  const role = String(requestedRole || '') === 'player' ? 'player' : 'staff';
  const cleanPin = String(pin || '').trim();
  let player;
  if (role === 'staff') {
    const configured = PropertiesService.getScriptProperties().getProperty('STAFF_PIN_SHA256');
    if (!configured) throw apiError_('El PIN del cuerpo técnico todavía no está configurado.', 'CONFIG');
    if (sha256_(cleanPin) !== configured) throw apiError_('El PIN del cuerpo técnico no es correcto.', 'INVALID_PIN');
  } else {
    const pinHash = sha256_(cleanPin);
    const row = rows_(SHEETS.PLAYERS).find(function(item) { return boolean_(item.activo) && String(item.pin_hash || '') === pinHash; });
    if (!row) throw apiError_('El PIN de jugador no es correcto.', 'INVALID_PIN');
    player = { id: String(row.id), name: String(row.nombre) };
  }
  const duration = 60 * 60 * 1000;
  const payload = { role: role, playerId: player && player.id, playerName: player && player.name, exp: Date.now() + duration };
  const auth = { token: signSession_(payload), expiresAt: payload.exp, role: role, playerId: payload.playerId, playerName: payload.playerName };
  if (includeBootstrap) return { auth: auth, bootstrap: getLoginBootstrap_(payload) };
  return auth;
}

function getLoginBootstrap_(session) {
  const birthdayState = getBirthdayState_(session);
  const emailState = getEmailState_(session);
  return {
    players: getPlayers_(session),
    measurements: session.role === 'player' ? getMeasurements_(session) : [],
    session: getCurrentSession_(),
    needsBirthDate: birthdayState.needsBirthDate,
    needsEmail: emailState.needsEmail,
    birthdaysToday: birthdayState.birthdaysToday,
  };
}

function logout_() { return true; }

function requireSession_(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 2 || signature_(parts[0]) !== parts[1]) throw new Error('Firma no válida');
    const payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
    if (!payload.exp || payload.exp <= Date.now() || ['player', 'staff'].indexOf(payload.role) < 0) throw new Error('Sesión caducada');
    return payload;
  } catch (error) {
    throw apiError_('La sesión ha caducado. Vuelve a introducir el PIN.', 'UNAUTHORIZED');
  }
}

function requireStaff_(session) {
  if (!session || session.role !== 'staff') throw apiError_('Solo el cuerpo técnico puede acceder a este apartado.', 'FORBIDDEN');
}

function getPlayers_(session) {
  const today = dateKey_(new Date());
  const injuriesByPlayer = {};
  getInjuryPeriods_().forEach(function(period) {
    if (!injuriesByPlayer[period.playerId]) injuriesByPlayer[period.playerId] = [];
    injuriesByPlayer[period.playerId].push({ id: period.id, startDate: period.startDate, endDate: period.endDate, reason: period.reason });
  });
  return rows_(SHEETS.PLAYERS).filter(function(row) { return boolean_(row.activo) && (!session || session.role === 'staff' || String(row.id) === String(session.playerId)); }).map(function(row) {
    const name = String(row.nombre);
    const staffMember = isStaffName_(name);
    const injuries = injuriesByPlayer[String(row.id)] || [];
    // baja_lesion representa el estado actual y permite que un alta tenga
    // efecto inmediato. Los periodos se conservan para consultas históricas.
    const injured = Object.prototype.hasOwnProperty.call(row, 'baja_lesion')
      ? boolean_(row.baja_lesion)
      : injuries.some(function(period) { return period.startDate <= today && (!period.endDate || period.endDate >= today); });
    return { id: String(row.id), name: name, number: staffMember ? undefined : numberOrNull_(row.dorsal), active: true, order: Number(row.orden || 0), joinedAt: dateKey_(row.fecha_alta), injured: injured, injuries: injuries, staffMember: staffMember };
  }).sort(function(a, b) { return Number(Boolean(a.staffMember)) - Number(Boolean(b.staffMember)) || (a.number || 999) - (b.number || 999) || a.order - b.order; });
}

function getInjuryPeriods_() {
  ensureInjuriesSheet_();
  return rows_(SHEETS.INJURIES).map(function(row) {
    return { id: String(row.id), playerId: String(row.jugador_id), playerName: String(row.jugador_nombre), startDate: dateKey_(row.fecha_inicio), endDate: row.fecha_fin ? dateKey_(row.fecha_fin) : undefined, reason: String(row.motivo || '') };
  }).sort(function(a, b) { return a.startDate.localeCompare(b.startDate); });
}

function ensureInjuriesSheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw apiError_('La hoja de cálculo no está configurada.', 'CONFIG');
  const spreadsheet = SpreadsheetApp.openById(id);
  ensureSheet_(spreadsheet, SHEETS.INJURIES, HEADERS.Bajas);
  return spreadsheet.getSheetByName(SHEETS.INJURIES);
}

function setPlayerInjury_(playerId, injury, session) {
  requireStaff_(session);
  const playersSheet = sheet_(SHEETS.PLAYERS);
  const values = playersSheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idColumn = headers.indexOf('id');
  let injuryColumn = headers.indexOf('baja_lesion');
  if (injuryColumn < 0) {
    injuryColumn = headers.length;
    playersSheet.getRange(1, injuryColumn + 1).setValue('baja_lesion');
  }
  for (let index = 1; index < values.length; index += 1) {
    if (String(values[index][idColumn]) !== String(playerId)) continue;
    const playerName = String(values[index][headers.indexOf('nombre')]);
    const periods = getInjuryPeriods_().filter(function(period) { return period.playerId === String(playerId); });
    const today = dateKey_(new Date());
    const active = periods.find(function(period) { return !period.endDate; });
    const legacy = Object.prototype.hasOwnProperty.call(injury || {}, 'injured');
    const startDate = legacy ? (active ? active.startDate : dateKey_(new Date())) : String(injury.startDate || '');
    const endDate = legacy ? (injury.injured ? '' : dateKey_(new Date())) : String(injury.endDate || '');
    const reason = String(injury.reason || (active && active.reason) || 'Motivo pendiente de completar').replace(/[<>]/g, '').trim().slice(0, 160);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw apiError_('Indica una fecha de inicio válida.', 'VALIDATION');
    if (endDate && (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate)) throw apiError_('La fecha final no puede ser anterior al inicio.', 'VALIDATION');
    if (!reason) throw apiError_('Indica el motivo de la baja.', 'VALIDATION');
    const injuriesSheet = ensureInjuriesSheet_();
    const injuryValues = injuriesSheet.getDataRange().getValues();
    const injuryHeaders = injuryValues[0].map(String);
    const requestedPeriodId = String(injury.periodId || '');
    let activeIndex = requestedPeriodId ? injuryValues.slice(1).findIndex(function(row) {
      return String(row[injuryHeaders.indexOf('id')]) === requestedPeriodId && String(row[injuryHeaders.indexOf('jugador_id')]) === String(playerId);
    }) : -1;
    if (requestedPeriodId && activeIndex < 0) throw apiError_('La baja que intentas editar ya no existe.', 'INVALID_INJURY');
    if (activeIndex < 0) activeIndex = injuryValues.slice(1).findIndex(function(row) {
      const rowEndDate = row[injuryHeaders.indexOf('fecha_fin')] ? dateKey_(row[injuryHeaders.indexOf('fecha_fin')]) : '';
      return String(row[injuryHeaders.indexOf('jugador_id')]) === String(playerId) && !rowEndDate;
    });
    // Compatibilidad con formularios anteriores: si la ficha aún figura de
    // baja y se está guardando un alta, actualiza el último periodo en lugar
    // de crear otra fila y duplicar el comentario.
    if (activeIndex < 0 && endDate && boolean_(values[index][injuryColumn])) {
      for (let rowIndex = injuryValues.length - 1; rowIndex >= 1; rowIndex -= 1) {
        if (String(injuryValues[rowIndex][injuryHeaders.indexOf('jugador_id')]) === String(playerId)) {
          activeIndex = rowIndex - 1;
          break;
        }
      }
    }
    const now = new Date();
    if (activeIndex >= 0) {
      const rowNumber = activeIndex + 2;
      injuriesSheet.getRange(rowNumber, injuryHeaders.indexOf('fecha_inicio') + 1).setValue(startDate);
      injuriesSheet.getRange(rowNumber, injuryHeaders.indexOf('fecha_fin') + 1).setValue(endDate || '');
      injuriesSheet.getRange(rowNumber, injuryHeaders.indexOf('motivo') + 1).setValue(reason);
      injuriesSheet.getRange(rowNumber, injuryHeaders.indexOf('actualizado_en') + 1).setValue(now);
    } else {
      const newPeriod = { id: Utilities.getUuid(), jugador_id: String(playerId), jugador_nombre: playerName, fecha_inicio: startDate, fecha_fin: endDate || '', motivo: reason, creado_en: now, actualizado_en: now };
      injuriesSheet.appendRow(injuryHeaders.map(function(header) { return newPeriod[header] === undefined ? '' : newPeriod[header]; }));
    }
    const remainsInjured = getInjuryPeriods_().some(function(period) { return period.playerId === String(playerId) && !period.endDate; });
    playersSheet.getRange(index + 1, injuryColumn + 1).setValue(remainsInjured);
    return getPlayers_({ role: 'staff' }).find(function(player) { return player.id === String(playerId); });
  }
  throw apiError_('Jugador no válido.', 'INVALID_PLAYER');
}

function getMeasurements_(session) {
  return rows_(SHEETS.MEASUREMENTS).filter(function(row) { return !session || session.role === 'staff' || String(row.jugador_id) === String(session.playerId); }).map(function(row) {
    const date = dateKey_(row.fecha);
    const createdAt = iso_(row.fecha_hora);
    return {
      id: String(row.id), date: date, time: String(row.hora), createdAt: createdAt,
      playerId: String(row.jugador_id), playerName: String(row.jugador_nombre),
      weight: numberOrNull_(row.peso), fatigue: numberOrNull_(row.fatiga), soreness: numberOrNull_(row.molestias),
      comments: String(row.comentarios || ''), sessionId: String(row.sesion_id),
      createdBy: String(row.creado_por || ''), updatedAt: iso_(row.actualizado_en),
    };
  });
}

function ensureAttendanceSheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw apiError_('La hoja de cálculo no está configurada.', 'CONFIG');
  const spreadsheet = SpreadsheetApp.openById(id);
  const existing = spreadsheet.getSheetByName(SHEETS.ATTENDANCE);
  if (existing) return existing;
  ensureSheet_(spreadsheet, SHEETS.ATTENDANCE, HEADERS.Asistencia);
  return spreadsheet.getSheetByName(SHEETS.ATTENDANCE);
}

function getAttendance_(session) {
  requireStaff_(session);
  ensureAttendanceSheet_();
  const attendance = rows_(SHEETS.ATTENDANCE).map(function(row) {
    return {
      id: String(row.id), date: dateKey_(row.fecha), playerId: String(row.jugador_id), playerName: String(row.jugador_nombre),
      status: String(row.estado || 'pending'), lateMinutes: Number(row.minutos_retraso || 0), comments: String(row.comentarios || ''),
      createdAt: iso_(row.creado_en), updatedAt: iso_(row.actualizado_en), createdBy: String(row.creado_por || 'cuerpo-tecnico'),
    };
  });
  const byPlayerAndDate = {};
  attendance.forEach(function(record) { byPlayerAndDate[record.date + '|' + record.playerId] = record; });
  getMeasurements_({ role: 'staff' }).forEach(function(measurement) {
    const key = measurement.date + '|' + measurement.playerId;
    const previous = byPlayerAndDate[key];
    byPlayerAndDate[key] = {
      id: previous ? previous.id : 'measurement-' + measurement.id,
      date: measurement.date,
      playerId: measurement.playerId,
      playerName: measurement.playerName,
      status: previous ? previous.status : 'present',
      lateMinutes: previous ? previous.lateMinutes : 0,
      comments: previous ? previous.comments : 'Presencia registrada automáticamente mediante medición',
      createdAt: previous ? previous.createdAt : measurement.createdAt,
      updatedAt: measurement.updatedAt,
      createdBy: measurement.createdBy,
    };
  });
  return Object.keys(byPlayerAndDate).map(function(key) { return byPlayerAndDate[key]; }).sort(function(a, b) { return (b.date + b.updatedAt).localeCompare(a.date + a.updatedAt); });
}

function saveAttendance_(input, session) {
  requireStaff_(session);
  if (!input) throw apiError_('Faltan los datos de asistencia.', 'VALIDATION');
  const date = String(input.date || '');
  const entries = Array.isArray(input.entries) ? input.entries : [];
  const today = dateKey_(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) throw apiError_('La fecha de asistencia no es válida.', 'VALIDATION');
  if (!entries.length) throw apiError_('No hay jugadores para guardar.', 'VALIDATION');
  const allowedStatuses = { pending: true, present: true, late: true, justified: true, unjustified: true, individual: true, medical: true };
  const players = getPlayers_({ role: 'staff' }).filter(function(player) { return !player.staffMember; });
  const playersById = {};
  players.forEach(function(player) { playersById[player.id] = player; });
  const seen = {};
  const cleanEntries = entries.map(function(entry) {
    const playerId = String(entry.playerId || '');
    const player = playersById[playerId];
    const status = String(entry.status || 'pending');
    const lateMinutes = status === 'late' ? Number(entry.lateMinutes) : 0;
    if (!player || player.name !== String(entry.playerName || '') || seen[playerId]) throw apiError_('Hay un jugador no válido o repetido.', 'INVALID_PLAYER');
    if (!allowedStatuses[status]) throw apiError_('Revisa la asistencia de ' + player.name + '.', 'VALIDATION');
    if (status === 'late' && (!Number.isInteger(lateMinutes) || lateMinutes < 1 || lateMinutes > 180)) throw apiError_('Revisa los minutos de retraso de ' + player.name + '.', 'VALIDATION');
    seen[playerId] = true;
    return { playerId: player.id, playerName: player.name, status: status, lateMinutes: lateMinutes, comments: String(entry.comments || '').replace(/[<>]/g, '').trim().slice(0, 250) };
  });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw apiError_('Hay muchos guardados a la vez. Inténtalo de nuevo en unos segundos.', 'BUSY');
  try {
    const attendanceSheet = ensureAttendanceSheet_();
    const values = attendanceSheet.getDataRange().getValues();
    const headers = values[0].map(String);
    const previousByPlayer = {};
    const dateColumn = headers.indexOf('fecha');
    const playerColumn = headers.indexOf('jugador_id');
    values.slice(1).forEach(function(row) {
      if (row[dateColumn] && dateKey_(row[dateColumn]) === date) previousByPlayer[String(row[playerColumn])] = { id: String(row[headers.indexOf('id')]), createdAt: row[headers.indexOf('creado_en')] };
    });
    const rowNumbers = [];
    for (let index = 1; index < values.length; index += 1) if (values[index][dateColumn] && dateKey_(values[index][dateColumn]) === date) rowNumbers.push(index + 1);
    for (let index = rowNumbers.length - 1; index >= 0; index -= 1) attendanceSheet.deleteRow(rowNumbers[index]);
    const now = new Date();
    const rows = cleanEntries.map(function(entry) {
      const previous = previousByPlayer[entry.playerId];
      return [previous ? previous.id : Utilities.getUuid(), date, entry.playerId, entry.playerName, entry.status, entry.lateMinutes, entry.comments, previous ? previous.createdAt : now, now, 'cuerpo-tecnico'];
    });
    attendanceSheet.getRange(attendanceSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    return rows.map(function(row) { return { id: String(row[0]), date: date, playerId: String(row[2]), playerName: String(row[3]), status: String(row[4]), lateMinutes: Number(row[5] || 0), comments: String(row[6] || ''), createdAt: iso_(row[7]), updatedAt: iso_(row[8]), createdBy: String(row[9]) }; });
  } finally { lock.releaseLock(); }
}

function markAttendancePresentFromMeasurement_(date, player, now, createdBy) {
  const attendanceSheet = ensureAttendanceSheet_();
  const values = attendanceSheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const dateColumn = headers.indexOf('fecha');
  const playerColumn = headers.indexOf('jugador_id');
  let rowNumber = -1;
  for (let index = 1; index < values.length; index += 1) {
    if (dateKey_(values[index][dateColumn]) === date && String(values[index][playerColumn]) === String(player.id)) {
      rowNumber = index + 1;
      break;
    }
  }
  const previous = rowNumber > 0 ? values[rowNumber - 1] : [];
  const record = {
    id: rowNumber > 0 ? String(previous[headers.indexOf('id')]) : Utilities.getUuid(),
    fecha: date,
    jugador_id: String(player.id),
    jugador_nombre: String(player.name),
    estado: 'present',
    minutos_retraso: 0,
    comentarios: rowNumber > 0 ? String(previous[headers.indexOf('comentarios')] || '') : 'Presencia registrada automáticamente mediante medición',
    creado_en: rowNumber > 0 ? previous[headers.indexOf('creado_en')] : now,
    actualizado_en: now,
    creado_por: createdBy || 'medicion',
  };
  const row = headers.map(function(header) { return record[header] === undefined ? '' : record[header]; });
  if (rowNumber > 0) attendanceSheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
  else attendanceSheet.appendRow(row);
}

function getBootstrap_(session) {
  const birthdayState = getBirthdayState_(session);
  const emailState = getEmailState_(session);
  return {
    players: getPlayers_(session),
    // El histórico completo puede crecer mucho y no debe bloquear la entrada
    // del cuerpo técnico a la plantilla. Se carga después, en segundo plano.
    measurements: session.role === 'player' ? getMeasurements_(session) : [],
    session: getCurrentSession_(),
    needsBirthDate: birthdayState.needsBirthDate,
    needsEmail: emailState.needsEmail,
    birthdaysToday: birthdayState.birthdaysToday,
  };
}

function isStaffName_(name) {
  return /\bCT\b|cuerpo t[ée]cnico|entrenador|preparador|fisio|delegado/i.test(String(name || ''));
}

function birthdayMonthDay_(value) {
  if (!value) return '';
  if (value instanceof Date && !isNaN(value.getTime())) return Utilities.formatDate(value, Session.getScriptTimeZone(), 'MM-dd');
  const clean = String(value).trim();
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return match[2] + '-' + match[3];
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? '' : Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'MM-dd');
}

function getBirthdayState_(session) {
  const playersSheet = sheet_(SHEETS.PLAYERS);
  const values = playersSheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idColumn = headers.indexOf('id');
  const nameColumn = headers.indexOf('nombre');
  const activeColumn = headers.indexOf('activo');
  const birthdayColumn = headers.indexOf('fecha_nacimiento');
  const todayMonthDay = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM-dd');
  const birthdaysToday = [];
  let needsBirthDate = false;
  values.slice(1).forEach(function(row) {
    if (!boolean_(row[activeColumn])) return;
    const name = String(row[nameColumn] || '');
    const birthday = birthdayColumn >= 0 ? row[birthdayColumn] : '';
    if (birthdayMonthDay_(birthday) === todayMonthDay) birthdaysToday.push(name);
    if (session.role === 'player' && String(row[idColumn]) === String(session.playerId) && !birthday) needsBirthDate = true;
  });
  return { needsBirthDate: needsBirthDate, birthdaysToday: birthdaysToday };
}

function saveBirthDate_(birthDate, session) {
  if (!session || session.role !== 'player' || !session.playerId) throw apiError_('Solo el jugador puede registrar su fecha de cumpleaños.', 'FORBIDDEN');
  const clean = String(birthDate || '').trim();
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw apiError_('Introduce una fecha de cumpleaños válida.', 'VALIDATION');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day, 12, 0, 0);
  if (year < 1900 || parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day || clean > dateKey_(new Date())) {
    throw apiError_('Introduce una fecha de cumpleaños válida.', 'VALIDATION');
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw apiError_('Hay muchos guardados a la vez. Inténtalo de nuevo en unos segundos.', 'BUSY');
  try {
    const playersSheet = sheet_(SHEETS.PLAYERS);
    let values = playersSheet.getDataRange().getValues();
    let headers = values[0].map(String);
    let birthdayColumn = headers.indexOf('fecha_nacimiento');
    if (birthdayColumn < 0) {
      birthdayColumn = headers.length;
      playersSheet.getRange(1, birthdayColumn + 1).setValue('fecha_nacimiento');
      values = playersSheet.getDataRange().getValues();
      headers = values[0].map(String);
    }
    const idColumn = headers.indexOf('id');
    const activeColumn = headers.indexOf('activo');
    for (let index = 1; index < values.length; index += 1) {
      if (String(values[index][idColumn]) !== String(session.playerId) || !boolean_(values[index][activeColumn])) continue;
      if (values[index][birthdayColumn]) throw apiError_('La fecha de cumpleaños ya está registrada.', 'BIRTHDATE_ALREADY_SET');
      const target = playersSheet.getRange(index + 1, birthdayColumn + 1);
      target.setNumberFormat('@');
      target.setValue(clean);
      return getBirthdayState_(session);
    }
    throw apiError_('Jugador no válido.', 'INVALID_PLAYER');
  } finally { lock.releaseLock(); }
}

function getEmailState_(session) {
  if (!session || session.role !== 'player' || !session.playerId) return { needsEmail: false };
  const playersSheet = sheet_(SHEETS.PLAYERS);
  const values = playersSheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idColumn = headers.indexOf('id');
  const activeColumn = headers.indexOf('activo');
  const emailColumn = headers.indexOf('correo_electronico');
  const player = values.slice(1).find(function(row) {
    return boolean_(row[activeColumn]) && String(row[idColumn]) === String(session.playerId);
  });
  return { needsEmail: Boolean(player) && (emailColumn < 0 || !String(player[emailColumn] || '').trim()) };
}

function saveEmail_(email, session) {
  if (!session || session.role !== 'player' || !session.playerId) throw apiError_('Solo el jugador puede registrar su correo electrónico.', 'FORBIDDEN');
  const clean = String(email || '').trim().toLowerCase();
  if (!isValidEmail_(clean)) {
    throw apiError_('Introduce un correo electrónico válido.', 'VALIDATION');
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw apiError_('Hay muchos guardados a la vez. Inténtalo de nuevo en unos segundos.', 'BUSY');
  try {
    const playersSheet = sheet_(SHEETS.PLAYERS);
    let values = playersSheet.getDataRange().getValues();
    let headers = values[0].map(String);
    let emailColumn = headers.indexOf('correo_electronico');
    if (emailColumn < 0) {
      emailColumn = headers.length;
      playersSheet.getRange(1, emailColumn + 1).setValue('correo_electronico');
      values = playersSheet.getDataRange().getValues();
      headers = values[0].map(String);
    }
    const idColumn = headers.indexOf('id');
    const activeColumn = headers.indexOf('activo');
    for (let index = 1; index < values.length; index += 1) {
      if (String(values[index][idColumn]) !== String(session.playerId) || !boolean_(values[index][activeColumn])) continue;
      if (String(values[index][emailColumn] || '').trim()) throw apiError_('El correo electrónico ya está registrado.', 'EMAIL_ALREADY_SET');
      const target = playersSheet.getRange(index + 1, emailColumn + 1);
      target.setNumberFormat('@');
      target.setValue(clean);
      return { needsEmail: false };
    }
    throw apiError_('Jugador no válido.', 'INVALID_PLAYER');
  } finally { lock.releaseLock(); }
}

function enableWeeklyPlayerEmailsFromUi() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Activar informes semanales privados',
    'Cada lunes por la mañana se enviará a cada jugador con correo registrado un informe que contiene únicamente sus propios datos de rendimiento, asistencia y partidos de la semana anterior. ¿Quieres activarlo?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;
  // Fuerza la autorización del servicio de correo durante la activación,
  // evitando que el primer disparador semanal falle por falta de permisos.
  MailApp.getRemainingDailyQuota();
  installWeeklyPlayerEmailTrigger_();
  ui.alert('Correos semanales activados', 'El primer envío automático se realizará el próximo lunes entre las 08:00 y las 09:00, hora de Madrid.', ui.ButtonSet.OK);
}

function disableWeeklyPlayerEmailsFromUi() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('Desactivar correos semanales', '¿Quieres detener los informes semanales de todos los jugadores?', ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;
  deleteWeeklyPlayerEmailTriggers_();
  setConfig_('correos_semanales_jugadores', 'FALSE');
  ui.alert('Los correos semanales han quedado desactivados.');
}

function configureWeeklyInfographicFromUi() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Infografía de la semana',
    'Pega el enlace de Google Drive de la infografía que se enviará a los jugadores. Si lo haces el domingo, se asignará a la semana que comienza al día siguiente.',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  try {
    const fileId = driveFileId_(response.getResponseText());
    const file = DriveApp.getFileById(fileId);
    const mimeType = String(file.getMimeType() || '');
    if (!/^image\/(png|jpeg|jpg|gif|webp)$/i.test(mimeType)) {
      throw new Error('El archivo debe ser una imagen PNG, JPG, GIF o WebP.');
    }
    const range = planningWeekRange_(new Date());
    PropertiesService.getScriptProperties().setProperties({
      WEEKLY_INFOGRAPHIC_FILE_ID: fileId,
      WEEKLY_INFOGRAPHIC_WEEK_START: range.startKey,
      WEEKLY_INFOGRAPHIC_FILE_NAME: file.getName(),
    });
    ui.alert(
      'Infografía configurada',
      'Se incluirá «' + file.getName() + '» en los informes de la semana ' + weeklyPeriodLabel_(range.startKey, range.endKey) + '.',
      ui.ButtonSet.OK
    );
  } catch (error) {
    ui.alert('No se pudo configurar', error.message || String(error), ui.ButtonSet.OK);
  }
}

function clearWeeklyInfographicFromUi() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('Quitar infografía semanal', '¿Quieres impedir que la infografía configurada se incluya en el próximo correo?', ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;
  PropertiesService.getScriptProperties().deleteProperty('WEEKLY_INFOGRAPHIC_FILE_ID');
  PropertiesService.getScriptProperties().deleteProperty('WEEKLY_INFOGRAPHIC_WEEK_START');
  PropertiesService.getScriptProperties().deleteProperty('WEEKLY_INFOGRAPHIC_FILE_NAME');
  ui.alert('La infografía semanal ha quedado desvinculada.');
}

function installWeeklyPlayerEmailTrigger_() {
  deleteWeeklyPlayerEmailTriggers_();
  ScriptApp.newTrigger('sendWeeklyPlayerReports')
    .timeBased()
    .everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .create();
  setConfig_('correos_semanales_jugadores', 'TRUE');
}

function deleteWeeklyPlayerEmailTriggers_() {
  let deleted = 0;
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() !== 'sendWeeklyPlayerReports') return;
    ScriptApp.deleteTrigger(trigger);
    deleted += 1;
  });
  return deleted;
}

function sendWeeklyPlayerReports() {
  if (String(getConfigValue_('correos_semanales_jugadores', 'FALSE')).toUpperCase() !== 'TRUE') {
    return { sent: 0, skipped: 0, failed: 0, inactive: true };
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { sent: 0, skipped: 0, failed: 0, busy: true };
  try {
    const range = previousWeekRange_(new Date());
    const players = weeklyEmailPlayers_();
    const measurements = getMeasurements_({ role: 'staff' });
    const attendance = getAttendance_({ role: 'staff' });
    const matches = getMatches_({ role: 'staff' });
    const thresholds = weeklyAnalysisThresholds_();
    const infographic = weeklyInfographicForDate_(new Date());
    const properties = PropertiesService.getScriptProperties();
    const sentProperty = 'WEEKLY_PLAYER_REPORT_SENT_' + range.endKey;
    const sentPlayerIds = parseStringList_(properties.getProperty(sentProperty));
    let remainingQuota = MailApp.getRemainingDailyQuota();
    const result = { sent: 0, skipped: 0, failed: 0, periodStart: range.startKey, periodEnd: range.endKey };

    players.forEach(function(player) {
      if (sentPlayerIds.indexOf(player.id) >= 0 || remainingQuota < 1) {
        result.skipped += 1;
        return;
      }
      try {
        const report = buildWeeklyPlayerReport_(player, range, measurements, attendance, matches, thresholds, infographic);
        const message = {
          to: player.email,
          subject: 'Tu informe semanal · ' + report.periodLabel,
          body: report.plainText,
          htmlBody: report.html,
          name: 'Zabal Performance',
        };
        if (infographic) {
          message.attachments = [infographic.blob.copyBlob().setName(infographic.fileName)];
          message.inlineImages = { weeklyInfographic: infographic.blob.copyBlob() };
        }
        MailApp.sendEmail(message);
        sentPlayerIds.push(player.id);
        properties.setProperty(sentProperty, JSON.stringify(sentPlayerIds));
        remainingQuota -= 1;
        result.sent += 1;
      } catch (error) {
        result.failed += 1;
        console.error('No se pudo enviar el informe semanal de ' + player.id + ': ' + (error && error.message ? error.message : String(error)));
      }
    });
    return result;
  } finally { lock.releaseLock(); }
}

function weeklyEmailPlayers_() {
  return rows_(SHEETS.PLAYERS).filter(function(row) {
    return boolean_(row.activo) && !isStaffName_(row.nombre) && isValidEmail_(row.correo_electronico);
  }).map(function(row) {
    return { id: String(row.id), name: String(row.nombre), email: String(row.correo_electronico).trim().toLowerCase() };
  });
}

function buildWeeklyPlayerReport_(player, range, allMeasurements, allAttendance, allMatches, thresholds, infographic) {
  const measurements = allMeasurements.filter(function(item) {
    return item.playerId === player.id && item.date >= range.startKey && item.date <= range.endKey;
  }).sort(function(a, b) { return a.date.localeCompare(b.date); });
  const comparisonStart = shiftDateKey_(range.startKey, -28);
  const previousMeasurements = allMeasurements.filter(function(item) {
    return item.playerId === player.id && item.date >= comparisonStart && item.date < range.startKey;
  }).sort(function(a, b) { return a.date.localeCompare(b.date); });
  const playerAttendance = allAttendance.filter(function(item) {
    return item.playerId === player.id && item.date >= range.startKey && item.date <= range.endKey;
  }).sort(function(a, b) { return a.date.localeCompare(b.date); });
  const playerMatches = allMatches.filter(function(match) {
    return match.date >= range.startKey && match.date <= range.endKey && match.minutes.some(function(entry) { return entry.playerId === player.id; });
  }).map(function(match) {
    const entry = match.minutes.find(function(item) { return item.playerId === player.id; });
    return {
      date: match.date,
      opponent: match.opponent,
      type: match.type,
      stage: match.stage,
      calledUp: Boolean(entry && entry.calledUp),
      starter: Boolean(entry && entry.starter),
      minutes: entry ? Number(entry.minutes || 0) : 0,
      goals: entry ? Number(entry.goals || 0) : 0,
      yellowCards: entry ? Number(entry.yellowCards || 0) : 0,
      redCards: entry ? Number(entry.redCards || 0) : 0,
    };
  }).sort(function(a, b) { return a.date.localeCompare(b.date); });
  const leagueTotals = allMatches.filter(function(match) {
    return match.stage === 'league' && match.date <= range.endKey && match.minutes.some(function(entry) { return entry.playerId === player.id; });
  }).reduce(function(total, match) {
    const entry = match.minutes.find(function(item) { return item.playerId === player.id; });
    if (!entry) return total;
    total.matches += 1;
    total.calledUp += Number(Boolean(entry.calledUp));
    total.starts += Number(Boolean(entry.starter));
    total.minutes += Number(entry.minutes || 0);
    total.goals += Number(entry.goals || 0);
    total.yellowCards += Number(entry.yellowCards || 0);
    total.redCards += Number(entry.redCards || 0);
    return total;
  }, { matches: 0, calledUp: 0, starts: 0, minutes: 0, goals: 0, yellowCards: 0, redCards: 0 });

  const fatigueValues = numericValues_(measurements, 'fatigue');
  const sorenessValues = numericValues_(measurements, 'soreness');
  const previousFatigueValues = numericValues_(previousMeasurements, 'fatigue');
  const previousSorenessValues = numericValues_(previousMeasurements, 'soreness');
  const weightValues = measurements.filter(function(item) { return hasValue_(item.weight); });
  const previousWeightValues = previousMeasurements.filter(function(item) { return hasValue_(item.weight); });
  const latestWeight = weightValues.length ? Number(weightValues[weightValues.length - 1].weight) : undefined;
  const weightReference = previousWeightValues.length
    ? Number(previousWeightValues[previousWeightValues.length - 1].weight)
    : weightValues.length > 1 ? Number(weightValues[0].weight) : undefined;
  const weightChange = hasValue_(latestWeight) && hasValue_(weightReference) ? latestWeight - weightReference : undefined;
  const attendanceCounts = countBy_(playerAttendance, 'status');
  const matchTotals = playerMatches.reduce(function(total, match) {
    total.calledUp += Number(match.calledUp);
    total.starts += Number(match.starter);
    total.minutes += match.minutes;
    total.goals += match.goals;
    total.yellowCards += match.yellowCards;
    total.redCards += match.redCards;
    return total;
  }, { calledUp: 0, starts: 0, minutes: 0, goals: 0, yellowCards: 0, redCards: 0 });
  const metrics = {
    controls: measurements.length,
    fatigueAverage: average_(fatigueValues),
    fatigueMax: maximum_(fatigueValues),
    previousFatigueAverage: average_(previousFatigueValues),
    sorenessAverage: average_(sorenessValues),
    sorenessMax: maximum_(sorenessValues),
    previousSorenessAverage: average_(previousSorenessValues),
    latestWeight: latestWeight,
    weightChange: weightChange,
  };
  const analysis = weeklyPlayerAnalysis_(metrics, attendanceCounts, matchTotals, leagueTotals, thresholds);
  const periodLabel = weeklyPeriodLabel_(range.startKey, range.endKey);
  return {
    periodLabel: periodLabel,
    plainText: weeklyPlayerPlainText_(player, periodLabel, metrics, attendanceCounts, matchTotals, leagueTotals, analysis, infographic),
    html: weeklyPlayerHtml_(player, periodLabel, measurements, playerAttendance, playerMatches, metrics, attendanceCounts, matchTotals, leagueTotals, analysis, infographic),
  };
}

function weeklyPlayerAnalysis_(metrics, attendanceCounts, matchTotals, leagueTotals, thresholds) {
  const analysis = [];
  const moderateFrom = thresholds.fatigueModerate;
  const alertFrom = thresholds.fatigueAlert;
  const sorenessModerateFrom = thresholds.sorenessModerate;
  const sorenessAlertFrom = thresholds.sorenessAlert;
  const relevantWeightChange = thresholds.relevantWeightChange;

  if (!metrics.controls) {
    analysis.push('No hay controles registrados durante esta semana. Registrar tus datos con regularidad permite interpretar mejor la evolución.');
  } else {
    analysis.push('Has completado ' + metrics.controls + (metrics.controls === 1 ? ' control esta semana.' : ' controles esta semana.'));
  }
  if (hasValue_(metrics.fatigueAverage)) {
    if (metrics.fatigueAverage >= alertFrom) analysis.push('Tu fatiga media ha estado en una zona alta. Coméntalo con el cuerpo técnico para contextualizar la carga y la recuperación.');
    else if (metrics.fatigueAverage >= moderateFrom) analysis.push('Tu fatiga media ha sido moderada. Conviene observar cómo evoluciona en los próximos controles.');
    else analysis.push('La fatiga registrada se ha mantenido en una zona baja.');
    if (hasValue_(metrics.previousFatigueAverage) && metrics.fatigueAverage - metrics.previousFatigueAverage >= 1) analysis.push('La fatiga media ha subido al menos un punto respecto a tus cuatro semanas anteriores.');
    if (hasValue_(metrics.previousFatigueAverage) && metrics.previousFatigueAverage - metrics.fatigueAverage >= 1) analysis.push('La fatiga media ha bajado al menos un punto respecto a tus cuatro semanas anteriores.');
  }
  if (hasValue_(metrics.sorenessAverage)) {
    if (metrics.sorenessAverage >= sorenessAlertFrom) analysis.push('Las molestias registradas han estado en una zona alta. Informa al cuerpo técnico si continúan o aumentan.');
    else if (metrics.sorenessAverage >= sorenessModerateFrom) analysis.push('Las molestias han sido moderadas; sigue registrándolas para comprobar su evolución.');
    else analysis.push('Las molestias registradas se han mantenido en una zona baja.');
    if (hasValue_(metrics.previousSorenessAverage) && metrics.sorenessAverage - metrics.previousSorenessAverage >= 1) analysis.push('Las molestias medias han aumentado al menos un punto frente a tus cuatro semanas anteriores.');
  }
  if (hasValue_(metrics.weightChange) && Math.abs(metrics.weightChange) >= relevantWeightChange) {
    analysis.push('El peso presenta una variación de ' + signedNumber_(metrics.weightChange, 1) + ' kg frente al último punto de referencia. Revisa el contexto de hidratación, horario y alimentación con el cuerpo técnico.');
  } else if (hasValue_(metrics.weightChange)) {
    analysis.push('El peso se mantiene estable respecto al último punto de referencia (' + signedNumber_(metrics.weightChange, 1) + ' kg).');
  }
  if (Number(attendanceCounts.unjustified || 0) > 0) analysis.push('Figura al menos una ausencia no justificada esta semana. Si es un error, comunícalo al cuerpo técnico.');
  if (Number(attendanceCounts.late || 0) > 0) analysis.push('Se ha registrado al menos una llegada con retraso durante la semana.');
  if (matchTotals.minutes > 0) analysis.push('Has acumulado ' + matchTotals.minutes + ' minutos de partido esta semana' + (matchTotals.starts ? ', con ' + matchTotals.starts + (matchTotals.starts === 1 ? ' titularidad.' : ' titularidades.') : '.'));
  if (matchTotals.goals > 0) analysis.push('Has marcado ' + matchTotals.goals + (matchTotals.goals === 1 ? ' gol.' : ' goles.'));
  const disciplinaryNotice = leagueDisciplinaryNotice_(leagueTotals);
  if (disciplinaryNotice) analysis.push(disciplinaryNotice);
  return analysis;
}

function weeklyPlayerPlainText_(player, periodLabel, metrics, attendanceCounts, matchTotals, leagueTotals, analysis, infographic) {
  return [
    'Hola ' + firstName_(player.name) + ',',
    '',
    'Este es tu informe privado de Zabal Performance para la semana ' + periodLabel + '.',
    '',
    'CONTROLES',
    'Registros: ' + metrics.controls,
    'Peso más reciente: ' + valueOrDash_(metrics.latestWeight, 1, ' kg'),
    'Fatiga media / máxima: ' + valueOrDash_(metrics.fatigueAverage, 1, '') + ' / ' + valueOrDash_(metrics.fatigueMax, 0, ''),
    'Molestias medias / máximas: ' + valueOrDash_(metrics.sorenessAverage, 1, '') + ' / ' + valueOrDash_(metrics.sorenessMax, 0, ''),
    '',
    'ASISTENCIA',
    attendanceSummaryText_(attendanceCounts),
    '',
    'PARTIDOS',
    matchTotals.calledUp + ' convocatorias · ' + matchTotals.starts + ' titularidades · ' + matchTotals.minutes + ' minutos · ' + matchTotals.goals + ' goles',
    '',
    'LIGA · ACUMULADO',
    leagueTotals.minutes + ' minutos · ' + leagueTotals.goals + ' goles · ' + leagueTotals.yellowCards + ' amarillas · ' + leagueTotals.redCards + ' rojas',
    leagueDisciplinaryStatus_(leagueTotals),
    '',
    infographic ? 'PLANIFICACIÓN DE ESTA SEMANA\nLa infografía semanal va incluida como imagen y archivo adjunto.\n' : '',
    'ANÁLISIS PERSONAL',
    analysis.map(function(item) { return '• ' + item; }).join('\n'),
    '',
    'Este informe contiene únicamente tus propios datos. Es orientativo y no sustituye una valoración médica o profesional.',
    'Zabal Performance',
  ].join('\n');
}

function weeklyPlayerHtml_(player, periodLabel, measurements, attendance, matches, metrics, attendanceCounts, matchTotals, leagueTotals, analysis, infographic) {
  const measurementRows = measurements.length ? measurements.map(function(item) {
    return '<tr><td style="padding:10px;border-bottom:1px solid #e6ebf0">' + escapeHtml_(shortDate_(item.date)) + '</td>' +
      '<td style="padding:10px;border-bottom:1px solid #e6ebf0;text-align:center">' + escapeHtml_(valueOrDash_(item.weight, 1, ' kg')) + '</td>' +
      '<td style="padding:10px;border-bottom:1px solid #e6ebf0;text-align:center">' + escapeHtml_(valueOrDash_(item.fatigue, 0, '')) + '</td>' +
      '<td style="padding:10px;border-bottom:1px solid #e6ebf0;text-align:center">' + escapeHtml_(valueOrDash_(item.soreness, 0, '')) + '</td>' +
      '<td style="padding:10px;border-bottom:1px solid #e6ebf0">' + escapeHtml_(item.comments || '—') + '</td></tr>';
  }).join('') : '<tr><td colspan="5" style="padding:18px;color:#66778a;text-align:center">No hay controles registrados esta semana.</td></tr>';
  const attendanceRows = attendance.length ? attendance.map(function(item) {
    const late = item.status === 'late' && item.lateMinutes ? ' · ' + item.lateMinutes + ' min' : '';
    return '<span style="display:inline-block;margin:0 6px 7px 0;padding:7px 10px;border-radius:999px;background:#f2f5f8;color:#334a62;font-size:13px">' + escapeHtml_(shortDate_(item.date) + ' · ' + attendanceLabel_(item.status) + late) + '</span>';
  }).join('') : '<span style="color:#66778a">Sin registros de asistencia esta semana.</span>';
  const matchRows = matches.length ? matches.map(function(match) {
    const role = match.calledUp ? (match.starter ? 'Titular' : 'Convocado') : 'No convocado';
    const stage = match.stage === 'league' ? 'Liga' : 'Pretemporada';
    return '<div style="padding:11px 0;border-bottom:1px solid #e6ebf0"><strong style="color:#17375f">' + escapeHtml_(shortDate_(match.date) + ' · ' + match.opponent) + '</strong><br><span style="color:#66778a;font-size:13px">' + escapeHtml_(stage + ' · ' + role + ' · ' + match.minutes + ' min · ' + match.goals + ' goles · ' + match.yellowCards + ' amarillas · ' + match.redCards + ' rojas') + '</span></div>';
  }).join('') : '<span style="color:#66778a">Sin datos de partido esta semana.</span>';
  const analysisItems = analysis.map(function(item) { return '<li style="margin:0 0 10px;line-height:1.55">' + escapeHtml_(item) + '</li>'; }).join('');
  const disciplinaryStatus = leagueDisciplinaryStatus_(leagueTotals);
  const infographicBlock = infographic
    ? '<div style="height:28px"></div><h2 style="margin:0 0 12px;color:#16365f;font-size:18px">Planificación de esta semana</h2>' +
      '<p style="margin:0 0 14px;color:#66778a;font-size:13px">La misma infografía preparada para el equipo también va adjunta a este correo.</p>' +
      '<img src="cid:weeklyInfographic" alt="Planificación semanal" style="display:block;width:100%;height:auto;border:1px solid #e6ebf0;border-radius:12px">'
    : '';

  return '<!doctype html><html><body style="margin:0;padding:0;background:#eef2f6;font-family:Arial,Helvetica,sans-serif;color:#25384c">' +
    '<div style="max-width:680px;margin:0 auto;padding:24px 12px">' +
      '<div style="padding:26px 28px;border-radius:18px 18px 0 0;background:#16365f;color:#fff">' +
        '<div style="display:inline-block;margin-bottom:18px;padding:7px 10px;border-radius:7px;background:#f6ca3b;color:#16365f;font-size:12px;font-weight:700;letter-spacing:1px">ZABAL PERFORMANCE</div>' +
        '<h1 style="margin:0 0 8px;font-size:28px;line-height:1.15">Tu semana, ' + escapeHtml_(firstName_(player.name)) + '</h1>' +
        '<p style="margin:0;color:#cfdaea">Informe privado · ' + escapeHtml_(periodLabel) + '</p>' +
      '</div>' +
      '<div style="padding:26px 28px;background:#fff">' +
        '<h2 style="margin:0 0 15px;color:#16365f;font-size:18px">Resumen de tus controles</h2>' +
        '<table role="presentation" width="100%" cellspacing="8" cellpadding="0"><tr>' +
          metricCardHtml_('Controles', String(metrics.controls)) +
          metricCardHtml_('Peso reciente', valueOrDash_(metrics.latestWeight, 1, ' kg')) +
          metricCardHtml_('Fatiga media', valueOrDash_(metrics.fatigueAverage, 1, '')) +
          metricCardHtml_('Molestias medias', valueOrDash_(metrics.sorenessAverage, 1, '')) +
        '</tr></table>' +
        '<div style="height:24px"></div>' +
        '<h2 style="margin:0 0 12px;color:#16365f;font-size:18px">Tus datos diarios</h2>' +
        '<div style="overflow-x:auto"><table width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e6ebf0;border-radius:10px;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f6f8fa;color:#526579"><th style="padding:10px;text-align:left">Fecha</th><th style="padding:10px">Peso</th><th style="padding:10px">Fatiga</th><th style="padding:10px">Molestias</th><th style="padding:10px;text-align:left">Comentario</th></tr></thead><tbody>' + measurementRows + '</tbody></table></div>' +
        '<div style="height:26px"></div>' +
        '<h2 style="margin:0 0 12px;color:#16365f;font-size:18px">Tu asistencia</h2><div>' + attendanceRows + '</div>' +
        '<p style="margin:9px 0 0;color:#66778a;font-size:13px">' + escapeHtml_(attendanceSummaryText_(attendanceCounts)) + '</p>' +
        '<div style="height:26px"></div>' +
        '<h2 style="margin:0 0 12px;color:#16365f;font-size:18px">Tus partidos</h2>' + matchRows +
        '<p style="margin:12px 0 0;color:#66778a;font-size:13px">' + escapeHtml_(matchTotals.calledUp + ' convocatorias · ' + matchTotals.starts + ' titularidades · ' + matchTotals.minutes + ' minutos · ' + matchTotals.goals + ' goles') + '</p>' +
        '<div style="height:26px"></div>' +
        '<h2 style="margin:0 0 12px;color:#16365f;font-size:18px">Liga · acumulado</h2>' +
        '<table role="presentation" width="100%" cellspacing="8" cellpadding="0"><tr>' +
          metricCardHtml_('Minutos', String(leagueTotals.minutes)) +
          metricCardHtml_('Goles', String(leagueTotals.goals)) +
          metricCardHtml_('Amarillas', String(leagueTotals.yellowCards)) +
          metricCardHtml_('Rojas', String(leagueTotals.redCards)) +
        '</tr></table>' +
        '<p style="margin:10px 0 0;padding:10px 12px;border-radius:8px;background:#f6f8fa;color:#526579;font-size:13px">' + escapeHtml_(disciplinaryStatus) + '</p>' +
        infographicBlock +
        '<div style="margin-top:28px;padding:20px;border-left:4px solid #f6ca3b;border-radius:10px;background:#fff9e5">' +
          '<h2 style="margin:0 0 13px;color:#16365f;font-size:18px">Análisis personal</h2><ul style="margin:0;padding-left:20px">' + analysisItems + '</ul>' +
        '</div>' +
      '</div>' +
      '<div style="padding:18px 28px;border-radius:0 0 18px 18px;background:#f8fafc;color:#718096;font-size:12px;line-height:1.5">Este correo contiene únicamente los datos asociados a tu perfil. El análisis es orientativo y no sustituye una valoración médica o profesional.</div>' +
    '</div></body></html>';
}

function metricCardHtml_(label, value) {
  return '<td width="25%" style="padding:12px 8px;border:1px solid #e6ebf0;border-radius:10px;background:#f8fafc;text-align:center"><strong style="display:block;color:#16365f;font-size:20px">' + escapeHtml_(value) + '</strong><span style="color:#718096;font-size:11px">' + escapeHtml_(label) + '</span></td>';
}

function leagueDisciplinaryStatus_(totals) {
  const notices = [];
  const yellows = Number(totals.yellowCards || 0);
  const reds = Number(totals.redCards || 0);
  if (yellows > 0 && yellows % 5 === 4) notices.push('Apercibido: a una amarilla del siguiente ciclo de sanción.');
  if (yellows > 0 && yellows % 5 === 0) notices.push('Revisión de sanción por acumulación de amarillas.');
  if (reds > 0) notices.push('Revisión de sanción por tarjeta roja.');
  return notices.length ? notices.join(' ') : 'Sin apercibimientos registrados en Liga.';
}

function leagueDisciplinaryNotice_(totals) {
  const status = leagueDisciplinaryStatus_(totals);
  return status === 'Sin apercibimientos registrados en Liga.' ? '' : status;
}

function driveFileId_(value) {
  const clean = String(value || '').trim();
  const match = clean.match(/[-\w]{25,}/);
  if (!match) throw new Error('Pega un enlace válido de un archivo de Google Drive.');
  return match[0];
}

function currentWeekRange_(referenceDate) {
  const reference = new Date(referenceDate);
  reference.setHours(12, 0, 0, 0);
  const daysSinceMonday = (reference.getDay() + 6) % 7;
  const start = new Date(reference);
  start.setDate(start.getDate() - daysSinceMonday);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { startKey: dateKey_(start), endKey: dateKey_(end) };
}

function planningWeekRange_(referenceDate) {
  const reference = new Date(referenceDate);
  reference.setHours(12, 0, 0, 0);
  if (reference.getDay() !== 0) return currentWeekRange_(reference);
  const nextMonday = new Date(reference);
  nextMonday.setDate(nextMonday.getDate() + 1);
  return currentWeekRange_(nextMonday);
}

function weeklyInfographicForDate_(referenceDate) {
  const properties = PropertiesService.getScriptProperties();
  const range = currentWeekRange_(referenceDate);
  const fileId = String(properties.getProperty('WEEKLY_INFOGRAPHIC_FILE_ID') || '');
  const configuredWeek = String(properties.getProperty('WEEKLY_INFOGRAPHIC_WEEK_START') || '');
  if (!fileId || configuredWeek !== range.startKey) return null;
  try {
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    if (!/^image\//i.test(String(blob.getContentType() || ''))) return null;
    return {
      blob: blob,
      fileName: String(properties.getProperty('WEEKLY_INFOGRAPHIC_FILE_NAME') || file.getName() || 'planificacion-semanal.png'),
      weekStart: range.startKey,
    };
  } catch (error) {
    console.error('No se pudo cargar la infografía semanal: ' + (error && error.message ? error.message : String(error)));
    return null;
  }
}

function previousWeekRange_(referenceDate) {
  const reference = new Date(referenceDate);
  reference.setHours(12, 0, 0, 0);
  const daysSinceMonday = (reference.getDay() + 6) % 7;
  const currentMonday = new Date(reference);
  currentMonday.setDate(currentMonday.getDate() - daysSinceMonday);
  const start = new Date(currentMonday);
  start.setDate(start.getDate() - 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { startKey: dateKey_(start), endKey: dateKey_(end) };
}

function shiftDateKey_(key, days) {
  const parts = String(key).split('-').map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  date.setDate(date.getDate() + Number(days || 0));
  return dateKey_(date);
}

function weeklyPeriodLabel_(startKey, endKey) {
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const start = String(startKey).split('-').map(Number);
  const end = String(endKey).split('-').map(Number);
  if (start[1] === end[1]) return start[2] + '–' + end[2] + ' ' + months[end[1] - 1] + ' ' + end[0];
  return start[2] + ' ' + months[start[1] - 1] + ' – ' + end[2] + ' ' + months[end[1] - 1] + ' ' + end[0];
}

function shortDate_(key) {
  const parts = String(key).split('-');
  return parts.length === 3 ? parts[2] + '/' + parts[1] : String(key);
}

function numericValues_(items, property) {
  return items.map(function(item) { return item[property]; }).filter(hasValue_).map(Number).filter(isFinite);
}

function average_(values) {
  if (!values.length) return undefined;
  return values.reduce(function(sum, value) { return sum + value; }, 0) / values.length;
}

function maximum_(values) {
  return values.length ? Math.max.apply(null, values) : undefined;
}

function countBy_(items, property) {
  return items.reduce(function(counts, item) {
    const key = String(item[property] || 'pending');
    counts[key] = Number(counts[key] || 0) + 1;
    return counts;
  }, {});
}

function attendanceLabel_(status) {
  const labels = { pending: 'Pendiente', present: 'Presente', late: 'Retraso', justified: 'Ausencia justificada', unjustified: 'Ausencia no justificada', individual: 'Trabajo individual', medical: 'Servicio médico' };
  return labels[String(status)] || String(status || 'Pendiente');
}

function attendanceSummaryText_(counts) {
  const parts = [];
  if (counts.present) parts.push(counts.present + ' presentes');
  if (counts.late) parts.push(counts.late + ' retrasos');
  if (counts.justified) parts.push(counts.justified + ' ausencias justificadas');
  if (counts.unjustified) parts.push(counts.unjustified + ' ausencias no justificadas');
  if (counts.individual) parts.push(counts.individual + ' sesiones individuales');
  if (counts.medical) parts.push(counts.medical + ' registros médicos');
  return parts.length ? parts.join(' · ') : 'Sin registros de asistencia esta semana.';
}

function valueOrDash_(value, decimals, suffix) {
  return hasValue_(value) && isFinite(Number(value)) ? Number(value).toFixed(decimals).replace('.', ',') + suffix : '—';
}

function signedNumber_(value, decimals) {
  const number = Number(value);
  return (number > 0 ? '+' : '') + number.toFixed(decimals).replace('.', ',');
}

function firstName_(name) {
  return String(name || 'jugador').trim().split(/\s+/)[0];
}

function parseStringList_(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (error) { return []; }
}

function isValidEmail_(email) {
  const clean = String(email || '').trim();
  return clean.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean);
}

function escapeHtml_(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getConfigValue_(key, fallback) {
  const row = rows_(SHEETS.CONFIG).find(function(item) { return String(item.clave) === String(key); });
  return row && hasValue_(row.valor) ? row.valor : fallback;
}

function weeklyAnalysisThresholds_() {
  return {
    fatigueModerate: Number(getConfigValue_('fatiga_moderada_desde', '4')),
    fatigueAlert: Number(getConfigValue_('fatiga_alerta_desde', '7')),
    sorenessModerate: Number(getConfigValue_('molestias_moderada_desde', '4')),
    sorenessAlert: Number(getConfigValue_('molestias_alerta_desde', '7')),
    relevantWeightChange: Number(getConfigValue_('cambio_peso_relevante_kg', '1.5')),
  };
}

function getMatches_(session) {
  ensureMatchSchema_();
  ensureMatchMinutesSchema_();
  const minutesByMatch = {};
  rows_(SHEETS.MATCH_MINUTES).forEach(function(row) {
    const matchId = String(row.partido_id || '');
    if (!minutesByMatch[matchId]) minutesByMatch[matchId] = [];
    minutesByMatch[matchId].push({
      playerId: String(row.jugador_id),
      playerName: String(row.jugador_nombre),
      calledUp: hasValue_(row.convocado) ? boolean_(row.convocado) : Number(row.minutos || 0) > 0 || Number(row.amarillas || 0) > 0 || Number(row.rojas || 0) > 0,
      starter: boolean_(row.titular),
      minutes: Number(row.minutos || 0),
      goals: Number(row.goles || 0),
      yellowCards: Number(row.amarillas || 0),
      redCards: Number(row.rojas || 0),
    });
  });
  return rows_(SHEETS.MATCHES).map(function(row) {
    return {
      id: String(row.id),
      date: dateKey_(row.fecha),
      type: String(row.tipo) === 'friendly' ? 'friendly' : 'official',
      // Los registros anteriores a esta versión no tenían fase y se conservan
      // como pretemporada para que nunca contaminen los acumulados de liga.
      stage: String(row.fase) === 'league' ? 'league' : 'preseason',
      opponent: String(row.rival || ''),
      durationMinutes: Number(row.duracion_minutos || 90),
      minutes: (minutesByMatch[String(row.id)] || []).filter(function(entry) { return session.role === 'staff' || entry.playerId === String(session.playerId); }),
      createdAt: iso_(row.creado_en),
      updatedAt: iso_(row.actualizado_en),
      createdBy: String(row.creado_por || 'cuerpo-tecnico'),
    };
  }).sort(function(a, b) {
    return (b.date + b.createdAt).localeCompare(a.date + a.createdAt);
  });
}

function validateMatchInput_(input, session) {
  requireStaff_(session);
  if (!input) throw apiError_('Faltan los datos del partido.', 'VALIDATION');
  const date = String(input.date || '').trim();
  const type = String(input.type || '') === 'friendly' ? 'friendly' : String(input.type || '') === 'official' ? 'official' : '';
  const stage = String(input.stage || 'league') === 'preseason' ? 'preseason' : String(input.stage || 'league') === 'league' ? 'league' : '';
  const opponent = String(input.opponent || '').replace(/[<>]/g, '').trim().slice(0, 100);
  const duration = Number(input.durationMinutes);
  const entries = Array.isArray(input.minutes) ? input.minutes : [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw apiError_('La fecha del partido no es válida.', 'VALIDATION');
  if (!type) throw apiError_('El tipo de partido no es válido.', 'VALIDATION');
  if (!stage) throw apiError_('La fase del partido no es válida.', 'VALIDATION');
  if (!opponent) throw apiError_('Introduce el rival.', 'VALIDATION');
  if (!Number.isInteger(duration) || duration < 1 || duration > 180) throw apiError_('La duración del partido no es válida.', 'VALIDATION');
  if (!entries.length) throw apiError_('Marca como convocado al menos a un jugador.', 'VALIDATION');

  const players = getPlayers_({ role: 'staff' });
  const playersById = {};
  players.forEach(function(player) { playersById[player.id] = player; });
  const seen = {};
  const cleanEntries = entries.map(function(entry) {
    const playerId = String(entry.playerId || '');
    const player = playersById[playerId];
    const calledUp = Boolean(entry.calledUp);
    const starter = Boolean(entry.starter);
    const minutes = Number(entry.minutes);
    const goals = Number(entry.goals || 0);
    const yellowCards = Number(entry.yellowCards || 0);
    const redCards = Number(entry.redCards || 0);
    if (!player || player.name !== String(entry.playerName || '') || seen[playerId]) throw apiError_('Hay un jugador no válido o repetido.', 'INVALID_PLAYER');
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > duration) throw apiError_('Los minutos de ' + player.name + ' no son válidos.', 'VALIDATION');
    if (!Number.isInteger(goals) || goals < 0 || goals > 20) throw apiError_('Los goles de ' + player.name + ' no son válidos.', 'VALIDATION');
    if (!Number.isInteger(yellowCards) || yellowCards < 0 || yellowCards > 2) throw apiError_('Las amarillas de ' + player.name + ' no son válidas.', 'VALIDATION');
    if (!Number.isInteger(redCards) || redCards < 0 || redCards > 1) throw apiError_('Las rojas de ' + player.name + ' no son válidas.', 'VALIDATION');
    if (!calledUp && (starter || minutes > 0 || goals > 0 || yellowCards > 0 || redCards > 0)) throw apiError_(player.name + ' debe figurar como convocado.', 'VALIDATION');
    seen[playerId] = true;
    return { playerId: player.id, playerName: player.name, calledUp: calledUp, starter: starter, minutes: minutes, goals: goals, yellowCards: yellowCards, redCards: redCards };
  });
  if (!cleanEntries.some(function(entry) { return entry.calledUp; })) throw apiError_('Marca como convocado al menos a un jugador.', 'VALIDATION');
  if (cleanEntries.filter(function(entry) { return entry.starter; }).length > MAX_STARTERS) throw apiError_('No puedes marcar más de ' + MAX_STARTERS + ' titulares.', 'VALIDATION');

  return { date: date, type: type, stage: stage, opponent: opponent, duration: duration, entries: cleanEntries };
}

function saveMatch_(input, session) {
  const clean = validateMatchInput_(input, session);
  const requestedId = String(input.requestId || '').trim();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw apiError_('Hay muchos guardados a la vez. Inténtalo de nuevo en unos segundos.', 'BUSY');
  try {
    if (requestedId) {
      const existing = getMatches_({ role: 'staff' }).find(function(match) { return match.id === requestedId; });
      if (existing) return existing;
    }
    const id = requestedId || Utilities.getUuid();
    const now = new Date();
    ensureMatchSchema_().appendRow([id, clean.date, clean.type, clean.opponent, clean.duration, now, now, 'cuerpo-tecnico', clean.stage]);
    const minuteRows = clean.entries.map(function(entry) { return [id, entry.playerId, entry.playerName, entry.minutes, entry.yellowCards, entry.redCards, entry.calledUp, entry.goals, entry.starter]; });
    const minutesSheet = ensureMatchMinutesSchema_();
    minutesSheet.getRange(minutesSheet.getLastRow() + 1, 1, minuteRows.length, minuteRows[0].length).setValues(minuteRows);
    return {
      id: id, date: clean.date, type: clean.type, stage: clean.stage, opponent: clean.opponent, durationMinutes: clean.duration,
      minutes: clean.entries, createdAt: now.toISOString(), updatedAt: now.toISOString(), createdBy: 'cuerpo-tecnico',
    };
  } finally {
    lock.releaseLock();
  }
}

function updateMatch_(matchId, input, session) {
  const clean = validateMatchInput_(input, session);
  const id = String(matchId || '');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw apiError_('Hay muchos guardados a la vez. Inténtalo de nuevo.', 'BUSY');
  try {
    const matchesSheet = ensureMatchSchema_();
    const matchValues = matchesSheet.getDataRange().getValues();
    const matchHeaders = matchValues[0].map(String);
    const idColumn = matchHeaders.indexOf('id');
    const rowIndex = matchValues.slice(1).findIndex(function(row) { return String(row[idColumn]) === id; });
    if (rowIndex < 0) throw apiError_('Partido no encontrado.', 'NOT_FOUND');
    const rowNumber = rowIndex + 2;
    const createdAt = matchValues[rowIndex + 1][matchHeaders.indexOf('creado_en')];
    matchesSheet.getRange(rowNumber, 1, 1, matchHeaders.length).setValues([matchHeaders.map(function(header) {
      if (header === 'id') return id;
      if (header === 'fecha') return clean.date;
      if (header === 'tipo') return clean.type;
      if (header === 'fase') return clean.stage;
      if (header === 'rival') return clean.opponent;
      if (header === 'duracion_minutos') return clean.duration;
      if (header === 'creado_en') return createdAt;
      if (header === 'actualizado_en') return new Date();
      if (header === 'creado_por') return 'cuerpo-tecnico';
      return '';
    })]);
    deleteRowsByMatchId_(sheet_(SHEETS.MATCH_MINUTES), id);
    const minuteRows = clean.entries.map(function(entry) { return [id, entry.playerId, entry.playerName, entry.minutes, entry.yellowCards, entry.redCards, entry.calledUp, entry.goals, entry.starter]; });
    const minutesSheet = ensureMatchMinutesSchema_();
    minutesSheet.getRange(minutesSheet.getLastRow() + 1, 1, minuteRows.length, minuteRows[0].length).setValues(minuteRows);
    return getMatches_({ role: 'staff' }).find(function(match) { return match.id === id; });
  } finally { lock.releaseLock(); }
}

function deleteRowsByMatchId_(targetSheet, matchId) {
  const values = targetSheet.getDataRange().getValues();
  const rowNumbers = [];
  for (let index = 1; index < values.length; index += 1) {
    if (String(values[index][0]) === String(matchId)) rowNumbers.push(index + 1);
  }
  if (!rowNumbers.length) return;
  const groups = [];
  let start = rowNumbers[0];
  let count = 1;
  for (let index = 1; index < rowNumbers.length; index += 1) {
    if (rowNumbers[index] === rowNumbers[index - 1] + 1) count += 1;
    else { groups.push({ start: start, count: count }); start = rowNumbers[index]; count = 1; }
  }
  groups.push({ start: start, count: count });
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    targetSheet.deleteRows(groups[index].start, groups[index].count);
  }
}

function ensureMatchMinutesSchema_() {
  const targetSheet = sheet_(SHEETS.MATCH_MINUTES);
  const headers = targetSheet.getRange(1, 1, 1, Math.max(1, targetSheet.getLastColumn())).getValues()[0].map(String);
  if (headers.indexOf('titular') < 0) targetSheet.getRange(1, headers.length + 1).setValue('titular');
  return targetSheet;
}

function ensureMatchSchema_() {
  const targetSheet = sheet_(SHEETS.MATCHES);
  const headers = targetSheet.getRange(1, 1, 1, Math.max(1, targetSheet.getLastColumn())).getValues()[0].map(String);
  if (headers.indexOf('fase') < 0) targetSheet.getRange(1, headers.length + 1).setValue('fase');
  return targetSheet;
}

function deleteMatch_(matchId, session) {
  requireStaff_(session);
  const id = String(matchId || '');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw apiError_('Hay muchos guardados a la vez. Inténtalo de nuevo.', 'BUSY');
  try {
    const matchesSheet = sheet_(SHEETS.MATCHES);
    const values = matchesSheet.getDataRange().getValues();
    const rowIndex = values.slice(1).findIndex(function(row) { return String(row[0]) === id; });
    if (rowIndex < 0) throw apiError_('Partido no encontrado.', 'NOT_FOUND');
    matchesSheet.deleteRow(rowIndex + 2);
    deleteRowsByMatchId_(sheet_(SHEETS.MATCH_MINUTES), id);
    return true;
  } finally { lock.releaseLock(); }
}

function getCurrentSession_() {
  const today = dateKey_(new Date());
  let row = rows_(SHEETS.SESSIONS).find(function(item) { return dateKey_(item.fecha) === today && boolean_(item.activa); });
  if (!row) {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) throw apiError_('Hay muchas conexiones a la vez. Inténtalo de nuevo en unos segundos.', 'BUSY');
    try {
      row = rows_(SHEETS.SESSIONS).find(function(item) { return dateKey_(item.fecha) === today && boolean_(item.activa); });
      if (!row) {
        const now = new Date();
        row = { id: 'session-' + today, fecha: today, tipo_sesion: 'Entrenamiento', rival: '', jornada: '', activa: true, hora_apertura: now, hora_cierre: '' };
        sheet_(SHEETS.SESSIONS).appendRow([row.id, row.fecha, row.tipo_sesion, row.rival, row.jornada, row.activa, row.hora_apertura, row.hora_cierre]);
      }
    } finally { lock.releaseLock(); }
  }
  return { id: String(row.id), date: today, type: String(row.tipo_sesion), opponent: String(row.rival || ''), matchday: String(row.jornada || ''), active: true, openedAt: iso_(row.hora_apertura), closedAt: row.hora_cierre ? iso_(row.hora_cierre) : undefined };
}

function saveMeasurement_(input, session) {
  if (!input) throw apiError_('Faltan los datos de la medición.', 'VALIDATION');
  if (session.role === 'player' && String(session.playerId) !== String(input.playerId)) throw apiError_('No puedes guardar datos de otro jugador.', 'FORBIDDEN');
  const players = getPlayers_({ role: 'staff' });
  const player = players.find(function(item) { return item.id === String(input.playerId); });
  if (!player || player.name !== String(input.playerName)) throw apiError_('Jugador no válido.', 'INVALID_PLAYER');
  const hasWeight = hasValue_(input.weight);
  const hasFatigue = hasValue_(input.fatigue);
  const hasSoreness = hasValue_(input.soreness);
  const weight = hasWeight ? Number(input.weight) : undefined;
  const fatigue = hasFatigue ? Number(input.fatigue) : undefined;
  const soreness = hasSoreness ? Number(input.soreness) : undefined;
  if (hasWeight && !(weight >= 30 && weight <= 250)) throw apiError_('El peso no es válido.', 'VALIDATION');
  if ([fatigue, soreness].filter(hasValue_).some(function(value) { return !Number.isInteger(value) || value < 1 || value > 10; })) throw apiError_('Los valores deben estar entre 1 y 10.', 'VALIDATION');
  if (!hasWeight && !hasFatigue && !hasSoreness && !String(input.comments || '').trim()) throw apiError_('Rellena al menos un dato antes de guardar.', 'VALIDATION');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw apiError_('Hay muchos guardados a la vez. Tus datos siguen en el formulario; inténtalo de nuevo.', 'BUSY');
  try {
    const sheet = sheet_(SHEETS.MEASUREMENTS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const playerColumn = headers.indexOf('jugador_id');
    const dateColumn = headers.indexOf('fecha');
    const today = dateKey_(new Date());
    const requestedDate = session.role === 'staff' && input.date ? String(input.date) : today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || requestedDate > today) throw apiError_('La fecha de la medición no es válida.', 'VALIDATION');
    let rowIndex = -1;
    for (let index = 1; index < values.length; index += 1) {
      if (String(values[index][playerColumn]) === player.id && dateKey_(values[index][dateColumn]) === requestedDate) { rowIndex = index + 1; break; }
    }
    const now = new Date();
    const previous = rowIndex > 0 ? values[rowIndex - 1] : [];
    const previousId = rowIndex > 0 ? String(previous[0]) : '';
    const previousCreated = rowIndex > 0 ? previous[3] : now;
    if (rowIndex > 0 && session.role !== 'staff' && isOlderThan24Hours_(previousCreated, now)) {
      throw apiError_('Han pasado más de 24 horas. Solo el cuerpo técnico puede modificar este registro.', 'EDIT_WINDOW_EXPIRED');
    }
    const id = previousId || Utilities.getUuid();
    const comments = String(input.comments || '').replace(/[<>]/g, '').trim().slice(0, 500);
    const mergedWeight = hasWeight ? weight : numberOrNull_(previous[6]);
    const mergedFatigue = hasFatigue ? fatigue : numberOrNull_(previous[7]);
    const mergedSoreness = hasSoreness ? soreness : numberOrNull_(previous[8]);
    const createdBy = session.role === 'player' ? 'jugador:' + player.id : 'cuerpo-tecnico';
    const row = [id, requestedDate, Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm'), previousCreated, player.id, player.name, blankIfUndefined_(mergedWeight), blankIfUndefined_(mergedFatigue), blankIfUndefined_(mergedSoreness), comments, String(input.sessionId || ''), createdBy, now];
    if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);
    markAttendancePresentFromMeasurement_(requestedDate, player, now, createdBy);
    return { id: id, date: requestedDate, time: row[2], createdAt: iso_(previousCreated), playerId: player.id, playerName: player.name, weight: mergedWeight, fatigue: mergedFatigue, soreness: mergedSoreness, comments: comments, sessionId: String(input.sessionId || ''), createdBy: createdBy, updatedAt: now.toISOString() };
  } finally {
    lock.releaseLock();
  }
}

function isOlderThan24Hours_(createdAt, now) {
  const createdTime = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  if (!isFinite(createdTime)) return true;
  return now.getTime() - createdTime > 24 * 60 * 60 * 1000;
}

function generatePlayerPins_() {
  const playersSheet = sheet_(SHEETS.PLAYERS);
  const values = playersSheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idColumn = headers.indexOf('id');
  const nameColumn = headers.indexOf('nombre');
  const activeColumn = headers.indexOf('activo');
  const pinColumn = headers.indexOf('pin_hash');
  if (pinColumn < 0) throw apiError_('Primero ejecuta "Preparar pestañas y datos demo" para actualizar la estructura.', 'CONFIG');
  const used = {};
  const codes = [];
  const pinHashes = values.slice(1).map(function(row) {
    if (!boolean_(row[activeColumn])) return [row[pinColumn] || ''];
    let pin;
    do { pin = String(Math.floor(Math.random() * 9000) + 1000); } while (used[pin]);
    used[pin] = true;
    codes.push([String(row[idColumn]), String(row[nameColumn]), pin]);
    return [sha256_(pin)];
  });
  if (pinHashes.length) playersSheet.getRange(2, pinColumn + 1, pinHashes.length, 1).setValues(pinHashes);
  const codesSheet = sheet_(SHEETS.CODES);
  codesSheet.clearContents();
  codesSheet.getRange(1, 1, 1, HEADERS[SHEETS.CODES].length).setValues([HEADERS[SHEETS.CODES]]);
  if (codes.length) codesSheet.getRange(2, 1, codes.length, codes[0].length).setValues(codes);
  if (codes.length) codesSheet.getRange(2, 3, codes.length, 1).setNumberFormat('@');
  codesSheet.setFrozenRows(1);
  codesSheet.getRange(1, 1, 1, 3).setBackground('#16365f').setFontColor('#ffffff').setFontWeight('bold');
  codesSheet.autoResizeColumns(1, 3);
  return codes.length;
}

function applyPlayerPins_() {
  const playersSheet = sheet_(SHEETS.PLAYERS);
  const playerValues = playersSheet.getDataRange().getValues();
  const playerHeaders = playerValues[0].map(String);
  const playerIdColumn = playerHeaders.indexOf('id');
  const playerNameColumn = playerHeaders.indexOf('nombre');
  const playerActiveColumn = playerHeaders.indexOf('activo');
  const playerPinColumn = playerHeaders.indexOf('pin_hash');
  if (playerPinColumn < 0) throw new Error('Primero ejecuta "Preparar pestañas y datos demo" para actualizar la estructura.');

  const activePlayers = {};
  playerValues.slice(1).forEach(function(row, index) {
    if (boolean_(row[playerActiveColumn])) activePlayers[String(row[playerIdColumn])] = { rowIndex: index + 2, name: String(row[playerNameColumn]) };
  });

  const codesSheet = sheet_(SHEETS.CODES);
  const codeValues = codesSheet.getDataRange().getValues();
  if (codeValues.length < 2) throw new Error('No hay códigos para aplicar. Genera los PINs primero.');
  const codeHeaders = codeValues[0].map(String);
  const codeIdColumn = codeHeaders.indexOf('jugador_id');
  const codePinColumn = codeHeaders.indexOf('pin');
  const seenPins = {};
  const pinsByPlayer = {};

  codeValues.slice(1).forEach(function(row, index) {
    const playerId = String(row[codeIdColumn] || '').trim();
    const pin = String(row[codePinColumn] || '').trim();
    if (!playerId && !pin) return;
    const rowNumber = index + 2;
    if (!activePlayers[playerId]) throw new Error('La fila ' + rowNumber + ' no corresponde a un jugador activo.');
    if (!/^\d{4,12}$/.test(pin)) throw new Error('El PIN de ' + activePlayers[playerId].name + ' debe tener entre 4 y 12 dígitos.');
    if (seenPins[pin]) throw new Error('El PIN ' + pin + ' está repetido en ' + seenPins[pin] + ' y ' + activePlayers[playerId].name + '.');
    if (pinsByPlayer[playerId]) throw new Error('El jugador ' + activePlayers[playerId].name + ' aparece más de una vez.');
    seenPins[pin] = activePlayers[playerId].name;
    pinsByPlayer[playerId] = pin;
  });

  Object.keys(activePlayers).forEach(function(playerId) {
    if (!pinsByPlayer[playerId]) throw new Error('Falta un PIN para ' + activePlayers[playerId].name + '.');
  });
  Object.keys(activePlayers).forEach(function(playerId) {
    playersSheet.getRange(activePlayers[playerId].rowIndex, playerPinColumn + 1).setValue(sha256_(pinsByPlayer[playerId]));
  });
  codesSheet.getRange(2, 3, Math.max(1, codesSheet.getLastRow() - 1), 1).setNumberFormat('@');
  return Object.keys(activePlayers).length;
}

function ensureSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const existing = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map(String);
    headers.forEach(function(header) {
      if (existing.indexOf(header) < 0) {
        existing.push(header);
        sheet.getRange(1, existing.length).setValue(header);
      }
    });
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setBackground('#16365f').setFontColor('#ffffff').setFontWeight('bold');
  sheet.autoResizeColumns(1, headers.length);
}

function ensureAuthSecret_() {
  const properties = PropertiesService.getScriptProperties();
  let secret = properties.getProperty('AUTH_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    properties.setProperty('AUTH_SECRET', secret);
  }
  return secret;
}

function signSession_(payload) {
  const encoded = Utilities.base64EncodeWebSafe(Utilities.newBlob(JSON.stringify(payload)).getBytes());
  return encoded + '.' + signature_(encoded);
}

function signature_(encoded) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(encoded, ensureAuthSecret_(), Utilities.Charset.UTF_8));
}

function ensureConfig_(key, value) {
  const sheet = sheet_(SHEETS.CONFIG);
  const values = sheet.getDataRange().getValues();
  for (let index = 1; index < values.length; index += 1) {
    if (String(values[index][0]) === key) return;
  }
  sheet.appendRow([key, value]);
}

function setConfig_(key, value) {
  const sheet = sheet_(SHEETS.CONFIG);
  const values = sheet.getDataRange().getValues();
  for (let index = 1; index < values.length; index += 1) {
    if (String(values[index][0]) !== key) continue;
    sheet.getRange(index + 1, 2).setValue(value);
    return;
  }
  sheet.appendRow([key, value]);
}

function sheet_(name) {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw apiError_('La hoja de cálculo no está configurada.', 'CONFIG');
  const sheet = SpreadsheetApp.openById(id).getSheetByName(name);
  if (!sheet) throw apiError_('Falta la pestaña ' + name + '.', 'CONFIG');
  return sheet;
}

function rows_(name) {
  const values = sheet_(name).getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(function(row) { return row.some(function(value) { return value !== ''; }); }).map(function(row) {
    return headers.reduce(function(object, key, index) { object[key] = row[index]; return object; }, {});
  });
}

function sha256_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8).map(function(byte) { const unsigned = byte < 0 ? byte + 256 : byte; return unsigned.toString(16).padStart(2, '0'); }).join('');
}
function dateKey_(value) { return Utilities.formatDate(new Date(value), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function iso_(value) { return new Date(value).toISOString(); }
function boolean_(value) { return value === true || String(value).toLowerCase() === 'true' || value === 1; }
function numberOrNull_(value) { if (value === '' || value === null || value === undefined) return undefined; const number = Number(value); return Number.isFinite(number) ? number : undefined; }
function hasValue_(value) { return value !== '' && value !== null && value !== undefined; }
function blankIfUndefined_(value) { return value === undefined ? '' : value; }
function apiError_(message, code) { const error = new Error(message); error.code = code; return error; }
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
