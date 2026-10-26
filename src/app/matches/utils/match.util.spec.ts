import { HttpErrorResponse } from '@angular/common/http';
import { describeMatchError, matchScore, matchTitle } from './match.util';

const team = (name: string): { id: string; name: string; shortName: null; logoUrl: null } => ({
  id: name,
  name,
  shortName: null,
  logoUrl: null,
});

const badRequest = (message: string, details: Record<string, string[]> = {}): HttpErrorResponse =>
  new HttpErrorResponse({ status: 400, error: { success: false, error: { message, details } } });

describe('matchTitle', () => {
  it('names both teams, home first', () => {
    expect(matchTitle({ homeTeam: team('Fan City'), awayTeam: team('Buzzer United') })).toBe(
      'Fan City vs Buzzer United'
    );
  });
});

describe('matchScore', () => {
  it('shows the score once the match has started', () => {
    expect(matchScore({ startedAt: '2026-08-19T13:37:25.076Z', homeScore: 5, awayScore: 3 })).toBe('5 – 3');
  });

  it('shows a dash before kick-off', () => {
    expect(matchScore({ startedAt: null, homeScore: 0, awayScore: 0 })).toBe('—');
  });
});

describe('describeMatchError', () => {
  it('explains the bare validation error the backend gives for the same team twice', () => {
    expect(describeMatchError(badRequest('Validation failed'), 'Fallback')).toBe(
      'The backend rejected this match. Check that home and away are two different teams of the sport.'
    );
  });

  it('explains a missing sport or team', () => {
    expect(describeMatchError(badRequest('Related record does not exist'), 'Fallback')).toBe(
      'The sport or one of the teams no longer exists. Choose them again.'
    );
  });

  it('shows the first field error when the backend names one', () => {
    expect(describeMatchError(badRequest('Validation failed', { scheduledAt: ['Invalid date'] }), 'Fallback')).toBe(
      'Invalid date'
    );
  });

  it('explains a match that was deleted meanwhile', () => {
    expect(describeMatchError(new HttpErrorResponse({ status: 404 }), 'Fallback')).toBe(
      'This match no longer exists. Someone may have deleted it.'
    );
  });

  it('falls back for anything else', () => {
    expect(describeMatchError(new HttpErrorResponse({ status: 500 }), 'Fallback')).toBe('Fallback');
  });
});
