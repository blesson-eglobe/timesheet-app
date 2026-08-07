export function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  // Strip any ISO time suffix if present (e.g. "2026-07-09T18:30:00.000Z" -> "2026-07-09")
  const clean = String(dateStr).split('T')[0];
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return clean;
  const [, , month, day] = match;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mName = months[parseInt(month, 10) - 1] || month;
  return `${mName} ${day}`;
}

export function getISOWeekString(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function getDateFromISOWeekString(weekStr: string): string {
  const match = weekStr.match(/^(\d{4})-W(\d{1,2})$/);
  if (!match) return new Date().toISOString().slice(0, 10);
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dayOfWeek = simple.getDay();
  const isoWeekStart = simple;
  if (dayOfWeek <= 4) {
    isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return isoWeekStart.toISOString().slice(0, 10);
}
