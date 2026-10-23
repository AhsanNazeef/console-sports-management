import { formatDate, formatDateTime, toDateInputValue } from './datetime.util';

describe('formatDateTime', () => {
  it('formats a timestamp like the Figma cards', () => {
    const local = new Date(2025, 3, 13, 23, 15).toISOString();
    expect(formatDateTime(local)).toBe('Apr 13, 2025 at 23:15');
  });

  it('returns null for missing or invalid values', () => {
    expect(formatDateTime(null)).toBeNull();
    expect(formatDateTime('not a date')).toBeNull();
  });
});

describe('formatDate', () => {
  it('shows a stored calendar date without moving it to another day', () => {
    expect(formatDate('2028-12-31T00:00:00.000Z')).toBe('Dec 31, 2028');
    expect(formatDate(null)).toBeNull();
  });
});

describe('toDateInputValue', () => {
  it('gives the YYYY-MM-DD value of a date input', () => {
    expect(toDateInputValue('2027-07-01T00:00:00.000Z')).toBe('2027-07-01');
    expect(toDateInputValue(null)).toBe('');
  });
});
