import { MatchStatus, MatchTeam } from './match.model';

export type MatchEventType =
  'GOAL' | 'FOUL' | 'SUBSTITUTION' | 'YELLOW_CARD' | 'RED_CARD' | 'TIMEOUT' | 'PENALTY' | 'INJURY' | 'OTHER';

export interface MatchPlayer {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
}

// An event from GET /matches/:id/timeline, which embeds its team and player. Events pushed live over the socket
// carry only teamId and playerId, so their names come from the teams and players already loaded.
export interface MatchEvent {
  id: string;
  matchId: string;
  type: MatchEventType;
  minute: number;
  teamId: string | null;
  playerId: string | null;
  detail: string | null;
  createdAt: string;
  team?: MatchTeam | null;
  player?: MatchPlayer | null;
}

export interface TeamEventCounts {
  team: string;
  events: Partial<Record<MatchEventType, number>>;
}

// GET /matches/:id/stats: event counts per team.
export interface MatchStats {
  matchId: string;
  score: { home: number; away: number };
  totalEvents: number;
  home: TeamEventCounts;
  away: TeamEventCounts;
}

export interface ScoreboardSide {
  team: string;
  score: number;
}

// GET /matches/:id/scoreboard: the current score.
export interface MatchScoreboard {
  matchId: string;
  status: MatchStatus;
  home: ScoreboardSide;
  away: ScoreboardSide;
  startedAt: string | null;
}
