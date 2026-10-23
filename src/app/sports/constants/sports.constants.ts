import { ChildListQuery } from '../models/hierarchy.model';
import { SportQuery } from '../models/sport.model';

export const SPORTS_PAGE_SIZE = 10;

// Governing bodies, organisations and participants on the drill-down pages.
export const DEFAULT_CHILD_QUERY: ChildListQuery = { search: '', page: 1, limit: SPORTS_PAGE_SIZE };

export const DEFAULT_SPORT_QUERY: SportQuery = {
  search: '',
  page: 1,
  limit: SPORTS_PAGE_SIZE,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

// Roles the backend lets add, edit and delete sports, governing bodies, organisations, teams and players.
// VIEWER and ORG get 403.
export const CATALOGUE_EDITOR_ROLES = ['ADMIN', 'OPERATOR'] as const;

// The API allows 300 requests a minute per IP. An import that runs into 429 waits and tries the same row again.
export const IMPORT_RATE_LIMIT_WAIT_MS = 15_000;
export const IMPORT_RATE_LIMIT_RETRIES = 4;
