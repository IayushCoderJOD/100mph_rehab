import { DayOfWeek, ISODate } from './types';

/** Training plans are written Monday → Sunday, so every week view starts on Monday. */
export const WEEK_DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const DAY_LABEL: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export const DAY_SHORT: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

/** Date.getDay() order, for mapping a JS date back onto a DayOfWeek. */
const JS_DAY_ORDER: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Local-calendar ISO date. Deliberately not `toISOString()` — that converts to
 * UTC first and lands on the wrong day for anyone east or west of Greenwich.
 */
export function toISODate(date: Date): ISODate {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseISODate(iso: ISODate): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number): Date {
  const next = startOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function dayOfWeekOf(date: Date): DayOfWeek {
  return JS_DAY_ORDER[date.getDay()];
}

/** The Monday of the week `date` falls in. */
export function startOfWeek(date: Date): Date {
  const backToMonday = (date.getDay() + 6) % 7; // Sunday closes the week, it does not open it
  return addDays(date, -backToMonday);
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

/** '2026-08-14' → '14 August 2026', in the device's locale. */
export function formatLongDate(iso: ISODate): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** '2026-08-14' → '14 Aug', for axis ticks and dense lists. */
export function formatShortDate(iso: ISODate): string {
  return parseISODate(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
