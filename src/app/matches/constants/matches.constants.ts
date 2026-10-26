import { StatusTone } from '../../common/components/status-tag/status-tag.component';
import { TabItem } from '../../common/components/tabs/tabs.component';
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
