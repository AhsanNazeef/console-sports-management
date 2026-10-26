const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
// Calendar dates (such as an agreement end) are stored as midnight UTC, so they are read in UTC.
const CALENDAR_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

// "Apr 13, 2025 at 23:15", the format of the Figma detail cards, in the viewer's time zone.
export function formatDateTime(value: string | null | undefined): string | null {
  const date = parse(value);
  return date ? `${DATE.format(date)} at ${TIME.format(date)}` : null;
}

// "Apr 13, 2025" for a calendar date, the same on every time zone.
export function formatDate(value: string | null | undefined): string | null {
  const date = parse(value);
  return date ? CALENDAR_DATE.format(date) : null;
}

// The YYYY-MM-DD value a date input expects, from a stored calendar date.
export function toDateInputValue(value: string | null | undefined): string {
  return parse(value)?.toISOString().slice(0, 10) ?? '';
}

// The value a datetime-local input expects ("2026-11-01T18:30"), in the viewer's time zone.
export function toDateTimeInputValue(value: string | null | undefined): string {
  const date = parse(value);
  if (!date) {
    return '';
  }
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

// The ISO timestamp for a datetime-local value, which the browser reads in the viewer's time zone.
export function fromDateTimeInputValue(value: string): string | null {
  return parse(value)?.toISOString() ?? null;
}

function parse(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
