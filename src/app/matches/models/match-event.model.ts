import { MatchStatus, MatchTeam } from './match.model';

export type MatchEventType =
  'GOAL' | 'FOUL' | 'SUBSTITUTION' | 'YELLOW_CARD' | 'RED_CARD' | 'TIMEOUT' | 'PENALTY' | 'INJURY' | 'OTHER';

export interface MatchPlayer {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
  teamId: string;
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

// Body for POST /matches/:id/events. A goal only changes the score when it names the team.
export interface NewMatchEvent {
  type: MatchEventType;
  minute: number;
  teamId?: string;
  playerId?: string;
  detail?: string;
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

// The match:status message: the match id and its new status.
export interface MatchStatusUpdate {
  id: string;
  status: MatchStatus;
}

// What the live connection reports for a watched match.
export type MatchLiveUpdate =
  | { kind: 'event'; event: MatchEvent }
  | { kind: 'scoreboard'; scoreboard: MatchScoreboard }
  | { kind: 'status'; status: MatchStatus };
