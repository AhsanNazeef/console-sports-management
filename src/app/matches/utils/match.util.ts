import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody } from '../../common/models/api.model';
import { describeHttpError } from '../../common/utils/http-error.util';
import { MatchEvent } from '../models/match-event.model';
import { Match } from '../models/match.model';

// "Fan City vs Buzzer United"
export function matchTitle(match: Pick<Match, 'homeTeam' | 'awayTeam'>): string {
  return `${match.homeTeam.name} vs ${match.awayTeam.name}`;
}

// "5 – 3" once the match has started; a match that never started has no score yet.
export function matchScore(match: Pick<Match, 'startedAt' | 'homeScore' | 'awayScore'>): string {
  return match.startedAt ? `${match.homeScore} – ${match.awayScore}` : '—';
}

// The timeline with newly arrived events added: each event once (by id), in match order (minute, then time added).
// An event can arrive twice, from the socket and from the POST that created it. With nothing new, the same list
// comes back.
export function mergeEvents(timeline: readonly MatchEvent[], arrived: readonly MatchEvent[]): readonly MatchEvent[] {
  const known = new Set(timeline.map((event) => event.id));
  const added: MatchEvent[] = [];
  for (const event of arrived) {
    if (!known.has(event.id)) {
      known.add(event.id);
      added.push(event);
    }
  }
  if (added.length === 0) {
    return timeline;
  }
  return [...timeline, ...added].sort((a, b) => a.minute - b.minute || a.createdAt.localeCompare(b.createdAt));
}

// Readable messages for the backend's match errors. Its "same team twice" answer is a bare "Validation failed"
// with no details, and a missing sport or team is "Related record does not exist".
export function describeMatchError(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse && error.status === 400) {
    const body = (error.error as ApiErrorBody | null)?.error;
    const hasDetails = Object.values(body?.details ?? {}).flat().length > 0;
    if (body?.message === 'Related record does not exist') {
      return 'The sport or one of the teams no longer exists. Choose them again.';
    }
    if (body?.message === 'Validation failed' && !hasDetails) {
      return 'The backend rejected this match. Check that home and away are two different teams of the sport.';
    }
  }
  if (error instanceof HttpErrorResponse && error.status === 404) {
    return 'This match no longer exists. Someone may have deleted it.';
  }
  return describeHttpError(error, fallback);
}
