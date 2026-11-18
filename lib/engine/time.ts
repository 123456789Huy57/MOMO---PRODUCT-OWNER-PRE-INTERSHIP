// All day boundaries use Asia/Ho_Chi_Minh (NFR05). Vietnam has no daylight
// saving time, so local time is always UTC+7.
export const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Calendar date in Vietnam for an instant, as YYYY-MM-DD. */
export function vnDate(at: Date | string | number): string {
  const t = new Date(at).getTime() + VN_OFFSET_MS;
  return new Date(t).toISOString().slice(0, 10);
}

/** Instant of 00:00 Vietnam time on a YYYY-MM-DD date. */
export function vnMidnight(date: string): Date {
  return new Date(Date.parse(date + 'T00:00:00Z') - VN_OFFSET_MS);
}

export function addDays(date: string, n: number): string {
  const t = Date.parse(date + 'T00:00:00Z') + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Days left in the month, including the given day (D in the formula). */
export function daysLeft(date: string): number {
  return daysInMonth(monthOf(date)) - dayOfMonth(date) + 1;
}

/** 0 = Sunday ... 6 = Saturday, for a YYYY-MM-DD date. */
export function weekday(date: string): number {
  return new Date(date + 'T00:00:00Z').getUTCDay();
}
