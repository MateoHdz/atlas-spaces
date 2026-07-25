const env = require('../config/env');

/**
 * Toda fecha se persiste en UTC (comportamiento nativo de Date/Mongo).
 * Este helper es el único lugar donde se interpreta una fecha en hora de Bogotá,
 * para no repetir esa conversión (y el riesgo de olvidarla) en cada service.
 */

/** Devuelve "HH:mm" de un Date, interpretado en la zona horaria de la app. */
function toLocalHHMM(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: env.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

/** Compara "HH:mm" como minutos desde medianoche, para poder hacer >= / <=. */
function hhmmToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** true si el rango [startAt, endAt) cae dentro de [openTime, closeTime) del espacio, en hora local. */
function isWithinOperatingHours(startAt, endAt, openTime, closeTime) {
  const startMinutes = hhmmToMinutes(toLocalHHMM(startAt));
  const endMinutes = hhmmToMinutes(toLocalHHMM(endAt));
  const openMinutes = hhmmToMinutes(openTime);
  const closeMinutes = hhmmToMinutes(closeTime);
  return startMinutes >= openMinutes && endMinutes <= closeMinutes;
}

/** Devuelve fecha y hora legible "YYYY-MM-DD HH:mm" interpretada en la zona horaria de la app. */
function toLocalDateTimeString(date) {
  if (!date) return '';
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: env.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  // en-CA da formato YYYY-MM-DD, hh:mm
  return formatter.format(d).replace(',', '');
}

module.exports = { toLocalHHMM, hhmmToMinutes, isWithinOperatingHours, toLocalDateTimeString };
