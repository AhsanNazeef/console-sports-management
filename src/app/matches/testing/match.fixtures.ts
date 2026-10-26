import { MatchEvent, MatchStats } from '../models/match-event.model';
import { Match, MatchStatus, MatchTeam } from '../models/match.model';

// Test data shared by the matches specs.
export const team = (id: string, name: string): MatchTeam => ({ id, name, shortName: null, logoUrl: null });

export const HOME = team('t1', 'Fan City');
export const AWAY = team('t2', 'Buzzer United');

export function match(id: string, status: MatchStatus, changes: Partial<Match> = {}): Match {
  const started = status !== 'SCHEDULED' && status !== 'CANCELLED';
  return {
    id,
    sportId: 's1',
    homeTeamId: HOME.id,
    awayTeamId: AWAY.id,
    status,
    scheduledAt: '2026-11-02T13:30:00.000Z',
    startedAt: started ? '2026-11-02T13:31:00.000Z' : null,
    finishedAt: status === 'FINISHED' ? '2026-11-02T15:00:00.000Z' : null,
    homeScore: 2,
    awayScore: 1,
    venue: 'Arena',
    createdAt: '2026-10-26T00:00:00Z',
    updatedAt: '2026-10-26T00:00:00Z',
    createdBy: 'u1',
    homeTeam: HOME,
    awayTeam: AWAY,
    sport: { id: 's1', name: 'Hockey', iconUrl: null },
    ...changes,
  };
}

export function matchEvent(id: string, minute: number, changes: Partial<MatchEvent> = {}): MatchEvent {
  return {
    id,
    matchId: 'm1',
    type: 'GOAL',
    minute,
    teamId: HOME.id,
    playerId: null,
    detail: null,
    createdAt: '2026-11-02T13:40:00.000Z',
    ...changes,
  };
}

export const STATS: MatchStats = {
  matchId: 'm1',
  score: { home: 2, away: 1 },
  totalEvents: 4,
  home: { team: HOME.name, events: { GOAL: 2, FOUL: 1 } },
  away: { team: AWAY.name, events: { GOAL: 1 } },
};
