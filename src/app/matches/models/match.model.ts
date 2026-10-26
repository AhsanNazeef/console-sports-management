import { SortOrder } from '../../common/models/api.model';

export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';

// A team as the API embeds it in a match, and as the Schedule Match popup offers it.
export interface MatchTeam {
  id: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
}

export interface MatchSport {
  id: string;
  name: string;
  iconUrl: string | null;
}

export interface Match {
  id: string;
  sportId: string;
  homeTeamId: string;
  awayTeamId: string;
  status: MatchStatus;
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  homeScore: number;
  awayScore: number;
  venue: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  sport: MatchSport;
}

// The All tab sends no status.
export type MatchStatusFilter = MatchStatus | 'ALL';

export type MatchSortField = 'createdAt' | 'scheduledAt';

export interface MatchQuery {
  status: MatchStatusFilter;
  search: string;
  page: number;
  limit: number;
  sortBy: MatchSortField;
  sortOrder: SortOrder;
}

// Body for POST /matches. The venue is optional and left out when blank.
export interface NewMatch {
  sportId: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string;
  venue?: string;
}

// The fields the Edit popup changes (PATCH /matches/:id).
export interface MatchChanges {
  scheduledAt: string;
  venue: string;
}

// What the Schedule / Edit popup emits. Sport and teams are only read when scheduling.
export interface MatchFormValue {
  sportId: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string;
  venue: string;
}
