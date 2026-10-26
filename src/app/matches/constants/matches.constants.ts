import { StatusTone } from '../../common/components/status-tag/status-tag.component';
import { TabItem } from '../../common/components/tabs/tabs.component';
import { MatchEventType } from '../models/match-event.model';
import { MatchQuery, MatchStatus } from '../models/match.model';

export const MATCHES_PAGE_SIZE = 10;

// Newest first: a match that was just scheduled shows at the top.
export const DEFAULT_MATCH_QUERY: MatchQuery = {
  status: 'ALL',
  search: '',
  page: 1,
  limit: MATCHES_PAGE_SIZE,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  SCHEDULED: 'Scheduled',
  LIVE: 'Live',
  FINISHED: 'Finished',
  CANCELLED: 'Cancelled',
};

export const MATCH_STATUS_TONES: Record<MatchStatus, StatusTone> = {
  SCHEDULED: 'yellow',
  LIVE: 'red',
  FINISHED: 'green',
  CANCELLED: 'neutral',
};

export const MATCH_STATUS_TABS: readonly TabItem[] = [
  { id: 'ALL', label: 'All' },
  { id: 'SCHEDULED', label: MATCH_STATUS_LABELS.SCHEDULED },
  { id: 'LIVE', label: MATCH_STATUS_LABELS.LIVE },
  { id: 'FINISHED', label: MATCH_STATUS_LABELS.FINISHED },
  { id: 'CANCELLED', label: MATCH_STATUS_LABELS.CANCELLED },
];

// Roles the backend lets schedule, edit, delete and run matches. VIEWER and ORG get 403.
export const MATCH_EDITOR_ROLES = ['ADMIN', 'OPERATOR'] as const;

// The API's largest page; the catalogue has far fewer sports, and a sport far fewer teams.
export const MATCH_OPTIONS_LIMIT = 100;

// A status a match can move to; nothing moves back to SCHEDULED.
export type MatchStatusTarget = Exclude<MatchStatus, 'SCHEDULED'>;

// The backend's rules: SCHEDULED can go LIVE or be cancelled, LIVE can finish or be cancelled,
// FINISHED and CANCELLED are final. Any other move answers 400.
export const MATCH_STATUS_TRANSITIONS: Record<MatchStatus, readonly MatchStatusTarget[]> = {
  SCHEDULED: ['LIVE', 'CANCELLED'],
  LIVE: ['FINISHED', 'CANCELLED'],
  FINISHED: [],
  CANCELLED: [],
};

// The button for each move. Finishing and cancelling can't be undone, so they ask first.
export const MATCH_STATUS_ACTIONS: Record<MatchStatusTarget, { label: string; confirm: boolean }> = {
  LIVE: { label: 'Start Match', confirm: false },
  FINISHED: { label: 'Finish Match', confirm: true },
  CANCELLED: { label: 'Cancel Match', confirm: true },
};

export const MATCH_EVENT_LABELS: Record<MatchEventType, string> = {
  GOAL: 'Goal',
  FOUL: 'Foul',
  SUBSTITUTION: 'Substitution',
  YELLOW_CARD: 'Yellow card',
  RED_CARD: 'Red card',
  TIMEOUT: 'Timeout',
  PENALTY: 'Penalty',
  INJURY: 'Injury',
  OTHER: 'Other',
};

// In the order the backend lists them.
export const MATCH_EVENT_TYPES = Object.keys(MATCH_EVENT_LABELS) as MatchEventType[];

export const MATCH_EVENT_TONES: Record<MatchEventType, StatusTone> = {
  GOAL: 'green',
  FOUL: 'neutral',
  SUBSTITUTION: 'neutral',
  YELLOW_CARD: 'yellow',
  RED_CARD: 'red',
  TIMEOUT: 'neutral',
  PENALTY: 'orange',
  INJURY: 'neutral',
  OTHER: 'neutral',
};
