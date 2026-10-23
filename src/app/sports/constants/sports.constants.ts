import { SportQuery } from '../models/sport.model';

export const SPORTS_PAGE_SIZE = 10;

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
