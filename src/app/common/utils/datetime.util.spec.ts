import { formatDateTime } from './datetime.util';

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
