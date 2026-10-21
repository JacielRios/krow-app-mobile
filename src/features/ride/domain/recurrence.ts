const zone = 'America/Mexico_City';
const calendar = new Intl.DateTimeFormat('en-CA', {
  timeZone: zone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
function wallClock(date: Date) {
  const parts = Object.fromEntries(
    calendar.formatToParts(date).map(p => [p.type, p.value]),
  );
  return Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
}
function instant(wall: number) {
  let result = wall;
  for (let i = 0; i < 3; i++) result += wall - wallClock(new Date(result));
  if (wallClock(new Date(result)) !== wall)
    throw new Error('La hora seleccionada no está disponible.');
  return new Date(result).toISOString();
}
export const recurrenceWeekday = (date: Date) =>
  new Date(wallClock(date)).getUTCDay();

export function recurrenceDates(
  first: Date,
  weekdays: number[],
  weeks: number,
) {
  if (
    !Number.isFinite(first.getTime()) ||
    !Number.isInteger(weeks) ||
    weeks < 1 ||
    weeks > 4 ||
    !weekdays.length ||
    weekdays.some(d => !Number.isInteger(d) || d < 0 || d > 6)
  )
    throw new Error('Elige los días y un periodo de una a cuatro semanas.');
  const wall = wallClock(first);
  const result: string[] = [];
  for (let day = 0; day < weeks * 7; day++) {
    const current = new Date(wall);
    current.setUTCDate(current.getUTCDate() + day);
    if (weekdays.includes(current.getUTCDay()))
      result.push(instant(current.getTime()));
  }
  return result;
}
